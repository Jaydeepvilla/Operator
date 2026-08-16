import { db } from "../db";
import { organizations, businessProfiles, businessSettings, voicePrompts } from "../db/schema";
import { eq, and } from "drizzle-orm";

export interface PromptInput {
  organizationId: string;
  ragContext?: string;
  nextQuestionText?: string | null;
  isEscalated?: boolean;
}

export const promptService = {
  async buildSystemPrompt(input: PromptInput): Promise<string> {
    const { organizationId, ragContext, nextQuestionText, isEscalated } = input;

    // 1. Fetch Organization metadata
    let org: any = null;
    let profile: any = null;
    let settings: any = null;
    let customPrompt: any = null;

    try {
      const orgs = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId));
      org = orgs[0];

      if (org) {
        const profiles = await db
          .select()
          .from(businessProfiles)
          .where(eq(businessProfiles.organizationId, organizationId));
        profile = profiles[0];

        const settingsList = await db
          .select()
          .from(businessSettings)
          .where(eq(businessSettings.organizationId, organizationId));
        settings = settingsList[0];

        const customPrompts = await db
          .select()
          .from(voicePrompts)
          .where(and(eq(voicePrompts.organizationId, organizationId), eq(voicePrompts.isActive, true)));
        customPrompt = customPrompts[0];
      }
    } catch (e: any) {
      console.warn("[PromptService] DB fallback for metadata:", e.message);
    }

    if (!org) {
      org = {
        name: "My Business",
        industry: "General Business",
        timezone: "UTC",
        website: null,
        phone: null,
        address: null,
      };
    }

    const businessHoursStr = settings?.businessHours
      ? JSON.stringify(settings.businessHours, null, 2)
      : "Standard Business Hours apply.";

    const bookingPrefsStr = settings?.bookingPreferences
      ? JSON.stringify(settings.bookingPreferences, null, 2)
      : "Standard booking preferences.";

    // Assemble dynamic system prompt parts
    const promptParts: string[] = [];

    promptParts.push(`You are Operator, the official AI assistant for "${org.name}".
Industry: ${org.industry}
Timezone: ${org.timezone}
Website: ${org.website ?? "Not provided"}
Phone: ${org.phone ?? "Not provided"}
Address: ${org.address ?? "Not provided"}`);

    if (profile?.description) {
      promptParts.push(`Business Description:
${profile.description}`);
    }

    promptParts.push(`Business Operating Hours:
${businessHoursStr}`);

    promptParts.push(`Booking Preferences:
${bookingPrefsStr}`);

    if (ragContext) {
      promptParts.push(`Retrieved Reference Knowledge (RAG):
Use ONLY the facts below to answer customer queries. If the answer is not contained in this knowledge, politely inform the customer you don't have that information and offer to escalate to a human agent. Do not fabricate facts or pricing.
---
${ragContext}
---`);
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
    } else {
      promptParts.push(`LEAD QUALIFICATION STATUS: All required qualification questions have been answered.
You can now help the user check out our services, answer any remaining questions, or guide them through finalizing their booking request.`);
    }

    // Standard receptionist rules & guidelines
    promptParts.push(`GENERAL BEHAVIOR RULES:
1. Maintain a warm, premium, and extremely professional tone.
2. Be concise. Never send long paragraphs. Keep responses under 3-4 sentences.
3. Zero emojis. Remain professional and sleek.
4. NEVER fabricate, invent, or guess any pricing, services, hours, policies, staff names, or facts. If information is not explicitly stated in the Retrieved Reference Knowledge above, say: "I don't have that detail available right now, but our team can help. Would you like me to arrange a callback?"
5. Do NOT promise specific appointment slots or times unless the system has confirmed availability. Use phrases like "I can check availability for you."
6. If the user indicates pain, emergency, or explicitly requests a human agent, immediately acknowledge this and state that a human teammate has been flagged to help. Do not use the word "help" appearing in a normal question as an escalation signal.`);

    if (customPrompt?.promptText) {
      promptParts.push(`CUSTOM BEHAVIOR GUIDELINES:
${customPrompt.promptText}`);
    }

    return promptParts.join("\n\n");
  },
};
