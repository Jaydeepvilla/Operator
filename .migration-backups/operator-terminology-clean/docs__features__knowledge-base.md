# Knowledge Base

The Knowledge Base allows organizations to add business-specific information — pricing, policies, service details, FAQs, team bios, and anything else the AI receptionist should know. This information is retrieved during conversations to ground the AI's responses in facts.

---

## How the AI uses it

When a customer sends a message, the AI receptionist retrieves relevant content from the knowledge base before generating a response. This is the RAG (Retrieval-Augmented Generation) step. The AI is instructed:

> "Use ONLY the facts below to answer customer queries. If the answer is not contained in this knowledge, politely inform the customer you don't have that information and offer to escalate to a human agent. Do not fabricate facts or pricing."

See [AI Pipeline](../ai/overview.md) for the full retrieval mechanics.

---

## What the AI retrieves

On every conversation turn, the system retrieves from four sources:

| Source | Table | Filter |
|---|---|---|
| Business Profile | `business_profiles.description` | Always included |
| Services | `services` | Active, non-archived. Keyword filtered. |
| FAQ Items | `faq_items` | Active. Keyword filtered. |
| Knowledge Chunks | `knowledge_chunks` | From completed documents. SQL `LIKE` on query words. |

The four sources are concatenated into a single context block injected into the system prompt.

---

## Document types

The knowledge base accepts three types of content:

### 1. File upload

Upload a `.txt` or `.md` file (or paste text directly). The content is:

1. Analyzed by the AI (or heuristic fallback) to extract metadata
2. Split into overlapping chunks
3. Stored as `knowledge_chunks` records

### 2. Website import

Provide a URL. The system fetches the page content and processes it as text.

### 3. Manual text entry

Paste content directly into the text editor in the Knowledge Base page.

---

## Document lifecycle

```
Upload / Import
     ↓
status: "processing"
     ↓
KnowledgeAnalysisService.analyze()
  → LLM extracts: title, summary, tags, category, language, priority, visibility
  → Fallback: heuristic analysis if LLM is unavailable
  → DuplicateDetectionService: Jaccard similarity on title words (≥ 0.6 = warning)
  → QualityAnalysisService: checks for word count, headings, dense blocks
     ↓
chunkingService.splitText(content, chunkSize=800, chunkOverlap=150)
  → Sliding window character splitter
  → Natural break detection: looks for \n or ". " within ±100 chars of chunk boundary
  → Token count: Math.ceil(characters / 4)
     ↓
Knowledge chunks inserted into DB
     ↓
status: "completed"
```

If processing fails: `status: "failed"`.

---

## Chunking parameters

**File:** `src/server/services/chunking.ts`

| Parameter | Default | Description |
|---|---|---|
| `chunkSize` | 800 characters | Target size per chunk |
| `chunkOverlap` | 150 characters | Overlap between adjacent chunks |

The chunker uses a sliding window approach. At each chunk boundary, it looks backward up to 100 characters for a newline or period-space boundary to avoid cutting mid-sentence.

Token count is estimated as `Math.ceil(characters / 4)` — a standard approximation.

---

## Document metadata

When a document is ingested, the following metadata is extracted:

| Field | Type | Description |
|---|---|---|
| `title` | string (max 80 chars) | Auto-extracted or user-editable |
| `summary` | string | 2-3 sentence description of the document |
| `tags` | string[] (max 8) | Relevant search terms |
| `category` | FK to knowledge_categories | Suggested by LLM with confidence score |
| `language` | string | Detected language (`en` or `es`) |
| `priority` | `high` \| `medium` \| `low` | High for policies/cancellations |
| `visibility` | `public` \| `internal` \| `ai_only` | Who can see the content |
| `aiWeight` | `normal` \| `high` | High for core revenue documents |
| `aiRetrievalQuality` | `Excellent` \| `Good` \| `Poor` | Quality assessment for retrieval |

---

## Quality assessment

**File:** `src/server/services/ingestion/ingestion-services.ts → QualityAnalysisService`

After ingestion, three checks are run:

1. **Word count** — Documents under 30 words are flagged as too short
2. **Structure** — Documents with no headings (`#`, `##`) or bold text (`**`) are flagged as unstructured
3. **Dense blocks** — Paragraphs over 150 words without breaks are flagged

Quality levels:
- `Excellent` — No issues
- `Good` — One issue
- `Poor` — Two or more issues, or under 20 words

The quality rating is stored on the document and displayed in the Knowledge Base UI.

---

## Duplicate detection

**File:** `src/server/services/ingestion/ingestion-services.ts → DuplicateDetectionService`

On upload, the new document's title is compared against all existing document names using Jaccard word similarity:

```
similarity = |intersection| / |union|
```

If similarity ≥ 0.6 (60%), a duplicate warning is shown to the user with the matching document name. The upload is not blocked — the warning is advisory.

---

## Visibility levels

| Level | Who has access |
|---|---|
| `public` | Available to the AI receptionist and the customer |
| `internal` | Staff-only. Not injected into AI context. |
| `ai_only` | Only available to the AI, never shown to end users |

Documents with `visibility: "internal"` are excluded from RAG retrieval.

---

## Language detection

**File:** `src/server/services/ingestion/ingestion-services.ts → LanguageDetectionService`

Language is detected using a keyword heuristic. If the content contains Spanish words (`hola`, `servicio`, `precio`, `cita`, etc.), language is set to `es`. Otherwise, it defaults to `en`.

This is a simple heuristic — not a full language model. Multilingual documents may not be detected correctly.

---

## Category system

Documents belong to a category from the `knowledge_categories` table. Categories are defined per organization. During ingestion, the LLM (or heuristic fallback) suggests the most relevant category based on content.

Default categories are created when an organization is set up during onboarding.

---

## AI weight

Documents with `aiWeight: "high"` are given priority treatment in the context assembly. Use `high` for:
- Cancellation policies
- Pricing documents
- Core service descriptions
- Any document that, if the AI gets wrong, causes significant harm

---

## Tips for better retrieval

The RAG system uses SQL `LIKE` matching on the user's query words — not semantic/vector search. To improve retrieval:

1. **Use natural language** — Write content in complete sentences, not just bullet points
2. **Include keywords customers would use** — If customers ask "how much does a haircut cost?", make sure the word "haircut" and "cost" or "price" appear in the document
3. **Structure with headings** — The quality analyzer rewards headings (`##`) and the chunker uses newlines as natural break points
4. **Keep chunks self-contained** — Each chunk should make sense without its neighbors, since only 2-4 chunks are retrieved per query
5. **Avoid duplicate content** — The Jaccard similarity check catches obvious duplicates, but semantically similar content can dilute retrieval quality
6. **Split large files** — Upload separate documents for separate topics rather than one monolithic document

---

## Database schema

```
knowledge_documents
  id, name, sourceType, sourceUrl, status (processing | completed | failed)
  visibility, priority, aiWeight, language
  organizationId, sourceId, categoryId

knowledge_chunks
  id, documentId, organizationId
  content, chunkIndex, tokenCount, metadata

knowledge_categories
  id, name, organizationId

knowledge_document_tags
  documentId, chunkId, (tag name)
```

Full schema: `src/server/db/schema.ts` (search for `knowledge_documents`).
