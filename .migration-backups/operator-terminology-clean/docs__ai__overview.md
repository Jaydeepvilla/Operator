# AI Pipeline

End-to-end walkthrough of how Operator processes an inbound message and produces a response.

---

## Pipeline overview

```
Inbound message (any channel)
       │
       ▼
Omnichannel Router          src/server/services/omnichannel/router.ts
  Identifies: organizationId, channelType, senderId
  Creates/updates: conversation record
       │
       ▼
Conversation Orchestrator   src/server/services/orchestrator.ts
  Checks: escalation status, qualification state
       │
       ├─► RAG Context Retrieval   src/server/services/rag.ts
       │     Business Profile
       │     Active Services (keyword-filtered)
       │     FAQ Items (keyword-filtered)
       │     Knowledge Chunks (SQL LIKE on first 2 query words)
       │
       ├─► Prompt Builder   src/server/services/prompt.ts
       │     Organization metadata
       │     Business hours + booking preferences
       │     RAG context (injected with hallucination prevention rules)
       │     Qualification state (next question or completion)
       │     Escalation status
       │     Custom voice prompt (if configured)
       │
       ├─► LLM Completion   src/server/services/llm.ts
       │     Primary: OpenAI gpt-4o-mini
       │     Secondary: Google Gemini 2.5 Flash
       │     Fallback: MockLLMProvider
       │
       ├─► Intent Classification   src/server/services/intent.ts
       │
       ├─► Lead Qualification   src/server/services/qualification.ts
       │     Records answers to qualification questions
       │
       ├─► Lead Scoring   src/server/services/scoring.ts
       │
       └─► Action dispatch
             Book appointment → bookingService
             Escalate → escalationService
             Continue → send AI response back via channel
```

---

## RAG context retrieval

**File:** `src/server/services/rag.ts`

The RAG system retrieves context from four sources on every turn. The retrieval is **not** vector-based. It uses SQL keyword matching.

### Source 1: Business Profile

```sql
SELECT description FROM business_profiles
WHERE organization_id = ?
```

Always included if a description exists. No filtering.

### Source 2: Active Services

```sql
SELECT * FROM services
WHERE organization_id = ? AND is_active = true AND is_archived = false
```

Post-query filtering: services whose `name` or `description` contains any word from the user's message are included. If none match, the first 3 services are included as a fallback.

### Source 3: FAQ Items

```sql
SELECT * FROM faq_items
WHERE organization_id = ? AND is_active = true
```

Post-query filtering: FAQs whose `question` or `answer` is contained in the user message are included. If none match, the first 3 FAQs are used.

### Source 4: Knowledge Chunks

```sql
-- Documents query
SELECT * FROM knowledge_documents
WHERE organization_id = ?
  AND status = 'completed'
  AND is_archived = false

-- Chunk query (one query per query word, up to 2 words)
SELECT id, content, document_id, metadata
FROM knowledge_chunks
WHERE content LIKE '%{word}%'
LIMIT 2
```

The user's message is split into words longer than 3 characters. The first 2 words generate separate `LIKE` queries. Results are deduplicated and up to 4 chunks are included.

### Why keyword search, not vectors

The current implementation uses `like()` from Drizzle ORM — a direct SQL `LIKE` operator. There is a `vector.ts` service file in `src/server/services/`, but it is not called by `rag.ts`. The system is designed to be upgraded to semantic vector search in a future iteration.

**Implication:** Retrieval quality depends on lexical overlap between the user's message and stored content. Synonyms, paraphrasing, and semantic similarity are not handled.

---

## Prompt construction

**File:** `src/server/services/prompt.ts`

The system prompt is assembled from multiple ordered parts:

```
1. Organization identity block
   "You are the official AI Receptionist for {org.name}.
   Industry: {industry}. Timezone: {timezone}. ..."

2. Business description (from business_profiles)

3. Business operating hours (from business_settings.businessHours as JSON)

4. Booking preferences (from business_settings.bookingPreferences as JSON)

5. RAG knowledge block (if context retrieved)
   "Retrieved Reference Knowledge (RAG):
   Use ONLY the facts below...
   Do not fabricate facts or pricing."

6. Status block — one of three:
   a. Escalation active:
      "IMPORTANT STATUS: This conversation has been escalated..."
   b. Qualification in progress:
      "ACTIVE LEAD QUALIFICATION QUESTION: ... You MUST ask: {question}"
   c. Qualification complete:
      "All required qualification questions have been answered."

7. General behavior rules (6 rules):
   - Warm, premium, professional tone
   - Concise responses (≤ 3-4 sentences)
   - Zero emojis
   - NEVER fabricate pricing, services, hours, policies, or staff names
   - Do NOT promise specific appointment slots unless system confirmed
   - Escalate if user indicates pain, emergency, or requests human

8. Custom behavior guidelines (from voice_prompts if one is active)
```

All parts are joined with `\n\n`.

---

## LLM provider registry

**File:** `src/server/services/llm.ts`

The registry selects the active provider at request time based on environment variables:

```typescript
if (OPENAI_API_KEY)  → OpenAIProvider  (gpt-4o-mini)
if (GEMINI_API_KEY)  → GeminiProvider  (gemini-2.5-flash-preview-04-17)
else                 → MockLLMProvider (deterministic fake responses)
```

All providers implement the `LLMProvider` interface:

```typescript
interface LLMProvider {
  generateCompletion(
    systemPrompt: string,
    userMessage: string,
    history?: ConversationMessage[]
  ): Promise<LLMResponse>;
}

interface LLMResponse {
  content: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}
```

Switching providers requires only changing which environment variable is set. The orchestrator calls `llmRegistry.getProvider()` and does not know which provider is active.

---

## Intent classification

**File:** `src/server/services/intent.ts`

Intent is extracted from the AI's response and/or the user's message. The orchestrator uses intent to decide the next action:

| Intent | Action |
|---|---|
| Booking | Initiate appointment booking flow |
| Escalation | Call `escalationService.triggerEscalation()` |
| FAQ | Pass to RAG, respond |
| General | Continue conversation |

---

## Lead qualification

**File:** `src/server/services/qualification.ts`

Qualification flows are configured per organization in the `qualification_flows` table. Each question has:

- `question`: The text to ask the customer
- `answerType`: `text`, `single_select`, `multi_select`, or `number`
- `options`: Array of choices (for select types)
- `isRequired`: Whether the question must be answered before booking
- `order`: Display/ask order

The orchestrator tracks which questions have been answered for the current conversation. The prompt builder injects the next unanswered required question into the system prompt, enforcing that the AI must ask it.

Answers are stored in the `leadAnswers` table linked to the lead profile.

---

## Lead scoring

**File:** `src/server/services/scoring.ts`

After qualification answers are collected, a score is computed for the lead. The score influences the lead's priority in the pipeline view.

---

## Escalation

**File:** `src/server/services/escalation.ts`

Five trigger reasons:

| Reason | When triggered |
|---|---|
| `user_request` | Customer explicitly asks for a human |
| `complaint` | Customer expresses dissatisfaction |
| `emergency` | Customer indicates pain or urgent situation |
| `unknown_info` | AI lacks the required information |
| `repeated_failure` | Multiple failed conversation turns |

Escalation flow:

1. `escalationService.triggerEscalation()` called
2. Duplicate check: if a pending escalation already exists for the conversation, return it (idempotent)
3. Escalation record created in `escalations` table with status `pending`
4. Conversation status updated to `escalated`
5. Lead profile status updated to `Escalated`
6. `conversationEvents` record inserted with `eventType: "escalated"`

Resolution:

1. `escalationService.resolveEscalation()` called (by a human agent in the dashboard)
2. Escalation status updated to `resolved`
3. Conversation status returns to `active`
4. Lead profile status returns to `Qualified`

---

## Conversation memory

**File:** `src/server/services/memory.ts` (if present)

The orchestrator passes recent conversation history to the LLM as `ConversationMessage[]`. This provides short-term in-context memory. There is no long-term external memory store in the current implementation.

---

## Voice pipeline

For voice channels (inbound calls via Vapi or Twilio):

1. Vapi/Twilio webhook fires to `/api/webhooks/voice/*`
2. Audio is transcribed by Deepgram → text
3. Text enters the same orchestrator pipeline above
4. AI text response is synthesized by ElevenLabs → audio
5. Audio is played back to the caller via Vapi/Twilio

This means the AI receptionist uses the identical RAG → Prompt → LLM pipeline for both text and voice channels.

---

## Omnichannel routing

**File:** `src/server/services/omnichannel/router.ts`

The router receives a normalized inbound message and dispatches it to the orchestrator. It:

1. Resolves the `organizationId` from the channel configuration (`channelConnections` table)
2. Finds or creates the `conversation` record for this `(organizationId, channelType, senderId)` tuple
3. Appends the inbound message to `conversationMessages`
4. Passes the conversation context to `orchestratorService.processMessage()`
5. Receives the AI response and dispatches it back via the appropriate channel provider

Channel providers implement `MessagingProvider.sendMessage()`. The router calls the right provider based on `channelType`.
