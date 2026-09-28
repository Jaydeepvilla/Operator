import { db } from "../db";
import { organizations, businessProfiles, businessSettings, voicePrompts } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { BusinessContext, businessContextService } from "./business-context";

export interface PromptInput {
  organizationId: string;
  ragContext?: string;
  nextQuestionText?: string | null;
  isEscalated?: boolean;
  businessContext?: BusinessContext;
  conversationState?: {
    activeEntity?: any;
    currentIntent?: string;
    lastAssistantMessage?: string;
    turnCount?: number;
  };
}

export const promptService = {
  async buildSystemPrompt(input: PromptInput): Promise<string> {
    const { organizationId, ragContext, nextQuestionText, isEscalated, conversationState } = input;

    // Use provided business context or fetch
    const business = input.businessContext || (await businessContextService.getContext(organizationId));

    let customPrompt: any = null;
    try {
      const customPrompts = await db
        .select()
        .from(voicePrompts)
        .where(and(eq(voicePrompts.organizationId, organizationId), eq(voicePrompts.isActive, true)));
      customPrompt = customPrompts[0];
    } catch (e: any) {
      console.warn("[PromptService] DB fallback for custom prompt:", e.message);
    }

    const promptParts: string[] = [];

    promptParts.push(`You are the official AI receptionist and front desk assistant for "${business.name}" (powered by Operator AI).
Your identity in conversation is "${business.name}". Always represent "${business.name}".
Industry: ${business.industry}
Timezone: ${business.timezone}
Website: ${business.website ?? "Not provided"}
Phone: ${business.phone ?? "Not provided"}
Address: ${business.address ?? "Not provided"}`);

    if (business.description) {
      promptParts.push(`Business Description:
${business.description}`);
    } else {
      promptParts.push(`Business Description:
${business.name} is a dedicated local service provider.`);
    }

    if (business.services && business.services.length > 0) {
      const servicesList = business.services
        .map((s) => `- ${s.name}: ${s.description ? s.description + ". " : ""}Duration: ${s.duration} mins. Price: $${s.price}`)
        .join("\n");
      promptParts.push(`Available Services:\n${servicesList}`);
    } else {
      promptParts.push(`Available Services: NONE CONFIGURED. The business has not set up any services, treatments, packages, or pricing.`);
    }

    promptParts.push(`Business Operating Hours:
${business.businessHoursFormatted}`);

    if (ragContext && ragContext.trim().length > 0) {
      promptParts.push(`Retrieved Reference Knowledge (RAG):
Use ONLY the facts below to answer customer queries. If the answer is not contained in this knowledge, politely inform the customer you don't have that information and offer to escalate to a human agent. Do not fabricate facts or pricing.
---
${ragContext}
---`);
    }

    if (conversationState?.activeEntity?.name) {
      promptParts.push(`ACTIVE TOPIC / ENTITY UNDER DISCUSSION:
The user is currently inquiring about: ${conversationState.activeEntity.name}.
If the user asks follow-up questions such as "How much?", "Can I book that?", or "When?", resolve them specifically for ${conversationState.activeEntity.name}.`);
    }

    if (isEscalated) {
      promptParts.push(`IMPORTANT STATUS: This conversation has been escalated to a human agent.
Politely inform the customer that a human agent has been notified and will be with them shortly. Do not initiate any further booking flows or request further qualification answers.`);
    } else if (nextQuestionText) {
      promptParts.push(`ACTIVE LEAD QUALIFICATION QUESTION:
Your current goal in the conversation is to collect information from the customer.
At the end of your message, you MUST ask this exact question to proceed with qualification:
"${nextQuestionText}"
Do not ask multiple questions at once. Ask only this question.`);
    }

    // High intelligence conversation rules
    promptParts.push(`CRITICAL CONVERSATIONAL INTELLIGENCE RULES:
1. Warm, premium, and concise tone (under 3-4 sentences max). Zero emojis.
2. NEVER repeat introductory greetings (like "Hello! I am your automated front desk assistant. How may I assist you today?") if the conversation has already started. Answer the user's question directly.
3. If the user asks "Tell me about your business" or "I want to learn more about your business", explain what "${business.name}" does, mention your services, and offer to help them book or view pricing. Do NOT reply with a generic "How can I help you today?".
4. If the user asks about services or what you offer, summarize the actual services listed above.
5. If the user asks "How much?", quote the actual price from the catalog for the service discussed.
6. If the user asks about hours or opening times, refer to the Operating Hours section above.
7. NEVER invent services, prices, or policies that are not listed in this prompt. If the business has no services configured, NEVER make up, guess, or list any services or pricing. Instead say: "We do not have any services or pricing configured for online booking yet. Please contact our front desk directly."
8. Speak as "${business.name}". Never mention outdated legacy brand names.`);

    if (customPrompt?.promptText) {
      promptParts.push(`CUSTOM BEHAVIOR GUIDELINES:
${customPrompt.promptText}`);
    }

    return promptParts.join("\n\n");
  },
};
