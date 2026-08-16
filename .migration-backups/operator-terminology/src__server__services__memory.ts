import { messagesRepository } from "../repositories/messages";
import { summariesRepository } from "../repositories/summaries";
import { llmRegistry } from "./llm";

export const memoryService = {
  async getShortTermHistory(conversationId: string, limit = 10) {
    const messages = await messagesRepository.listByConversation(conversationId);
    // Return last N messages formatted
    return messages.slice(-limit).map((m) => ({
      role: m.sender as "user" | "assistant" | "system",
      content: m.content,
    }));
  },

  async generateAndSaveSummary(organizationId: string, conversationId: string): Promise<any> {
    const messages = await messagesRepository.listByConversation(conversationId);
    if (messages.length === 0) return null;

    const dialogueText = messages
      .map((m) => `${m.sender.toUpperCase()}: ${m.content}`)
      .join("\n");

    const provider = llmRegistry.getProvider();
    const systemPrompt = `You are a conversation summarizer assistant. Analyze the dialogue history of our receptionist chat.
Generate a summary of what the customer wanted, list of clear action items for our staff, and array of intents detected (e.g. booking, pricing, general, emergency, support).
Return a JSON object only, in exactly this format:
{
  "summaryText": "Brief 1-2 sentence summary of conversation",
  "actionItems": ["Action item 1", "Action item 2"],
  "intentsList": ["booking", "pricing"]
}`;

    try {
      const completion = await provider.generateCompletion([
        { role: "system", content: systemPrompt },
        { role: "user", content: `Dialogue:\n${dialogueText}` },
      ], { temperature: 0.1, jsonMode: true });

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
