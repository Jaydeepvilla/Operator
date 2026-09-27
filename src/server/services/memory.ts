import { messagesRepository } from "../repositories/messages";
import { summariesRepository } from "../repositories/summaries";
import { llmRegistry } from "./llm";

export interface ConversationHistoryState {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  turnCount: number;
  lastUserMessage: string | null;
  lastAssistantMessage: string | null;
  isInitialTurn: boolean;
}

export const memoryService = {
  async getShortTermHistory(conversationId: string, limit = 10) {
    const messages = await messagesRepository.listByConversation(conversationId);
    return messages.slice(-limit).map((m) => ({
      role: m.sender as "user" | "assistant" | "system",
      content: m.content,
    }));
  },

  async getConversationState(conversationId: string): Promise<ConversationHistoryState> {
    const messages = await messagesRepository.listByConversation(conversationId);
    const formatted = messages.map((m) => ({
      role: m.sender as "user" | "assistant" | "system",
      content: m.content,
    }));

    const userMsgs = formatted.filter((m) => m.role === "user");
    const assistantMsgs = formatted.filter((m) => m.role === "assistant");

    return {
      messages: formatted,
      turnCount: formatted.length,
      lastUserMessage: userMsgs[userMsgs.length - 1]?.content || null,
      lastAssistantMessage: assistantMsgs[assistantMsgs.length - 1]?.content || null,
      isInitialTurn: formatted.length <= 1,
    };
  },

  sanitizeAssistantRepetition(
    candidate: string,
    historyState: ConversationHistoryState,
    businessName: string
  ): string {
    let clean = candidate.trim();

    // If conversation is already in progress, strip repeated introductory greeting
    if (!historyState.isInitialTurn && historyState.lastAssistantMessage) {
      // Remove repetitive canned intros
      clean = clean.replace(
        /^(hello!|hi!|welcome!)\s+i am your automated front desk assistant[.,]?\s*(how may i assist you today\??)?/i,
        ""
      ).trim();

      clean = clean.replace(
        /^hello!\s+welcome to [^.!?]+[.,!?]\s*(how may i (help|assist) you today\??)?/i,
        ""
      ).trim();

      // If that emptied the message, replace with a direct, contextual prompt
      if (!clean) {
        clean = `I'm here! What specific information or service can I help you with regarding ${businessName}?`;
      }
    }

    return clean;
  },

  async generateAndSaveSummary(organizationId: string, conversationId: string): Promise<any> {
    const messages = await messagesRepository.listByConversation(conversationId);
    if (messages.length === 0) return null;

    const dialogueText = messages
      .map((m) => `${m.sender.toUpperCase()}: ${m.content}`)
      .join("\n");

    const provider = llmRegistry.getProvider();
    const systemPrompt = `You are a conversation summarizer assistant. Analyze the dialogue history of our Operator AI chat.
Generate a summary of what the customer wanted, list of clear action items for our staff, and array of intents detected (e.g. booking, pricing, general, emergency, support).
Return a JSON object only, in exactly this format:
{
  "summaryText": "Brief 1-2 sentence summary of conversation",
  "actionItems": ["Action item 1", "Action item 2"],
  "intentsList": ["booking", "pricing"]
}`;

    try {
      const completion = await provider.generateCompletion(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Dialogue:\n${dialogueText}` },
        ],
        { temperature: 0.1, jsonMode: true }
      );

      const parsed = JSON.parse(completion.content.trim());

      const savedSummary = await summariesRepository.upsert({
        organizationId,
        conversationId,
        summaryText: parsed.summaryText || "Customer session summaries details",
        actionItems: parsed.actionItems || [],
        intentsList: parsed.intentsList || [],
      });

      return savedSummary;
    } catch (err) {
      console.error("[MemoryService] Failed to generate summary, using fallback:", err);

      // Fallback summary
      const lastUserMsg = messages.filter((m) => m.sender === "user").pop();
      const fallbackSummary = await summariesRepository.upsert({
        organizationId,
        conversationId,
        summaryText: `Chat session ending with last request: "${lastUserMsg?.content || "No queries"}"`,
        actionItems: ["Review conversation history to assess lead interest"],
        intentsList: ["general"],
      });
      return fallbackSummary;
    }
  },
};
