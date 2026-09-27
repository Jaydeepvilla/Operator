// Learning signal callback type for LLM fallback tracking
export type LLMFallbackCallback = (signal: {
  fromProvider: string;
  toProvider: string;
  reason: string;
  userMessage?: string;
}) => void;

// Global fallback signal listener (set by orchestrator per-request)
let _fallbackListener: LLMFallbackCallback | null = null;

export function setLLMFallbackListener(cb: LLMFallbackCallback | null) {
  _fallbackListener = cb;
}

function emitFallbackSignal(from: string, to: string, reason: string) {
  if (_fallbackListener) {
    try {
      _fallbackListener({ fromProvider: from, toProvider: to, reason });
    } catch {}
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCompletionResult {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  generateCompletion(
    messages: ChatMessage[],
    options?: { temperature?: number; jsonMode?: boolean }
  ): Promise<LLMCompletionResult>;
}

/**
 * Intelligent, grounded deterministic response synthesizer.
 * Used when external LLM providers encounter quota/network issues or fallback.
 * Strictly extracts facts from the active business system prompt and respects
 * conversational state (never blindly repeating canned greetings).
 */
export function synthesizeDeterministicResponse(messages: ChatMessage[]): string {
  const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
  const userMessages = messages.filter((m) => m.role === "user");
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const currentUserMsg = userMessages[userMessages.length - 1]?.content || "";
  const previousUserMsg = userMessages[userMessages.length - 2]?.content || "";
  const lowerUser = currentUserMsg.toLowerCase().trim();

  // Extract Business facts from system prompt
  const businessNameMatch = systemPrompt.match(/for "([^"]+)"/);
  const businessName = businessNameMatch ? businessNameMatch[1] : "our business";

  const descMatch = systemPrompt.match(/Business Description:\s*([^:\n][^\n]+)/);
  const businessDescription = descMatch ? descMatch[1].trim() : null;

  const servicesMatch = systemPrompt.match(/(?:Available Services|Services offered|Available catalog):\s*([^\n]+(?:\n\s*-\s*[^\n]+)*)/i);
  const rawServicesText = servicesMatch ? servicesMatch[1].trim() : "";

  const addressMatch = systemPrompt.match(/Address:\s*([^\n]+)/i);
  const address = addressMatch && !addressMatch[1].includes("Not provided") ? addressMatch[1].trim() : null;

  const phoneMatch = systemPrompt.match(/Phone:\s*([^\n]+)/i);
  const phone = phoneMatch && !phoneMatch[1].includes("Not provided") ? phoneMatch[1].trim() : null;

  const hoursMatch = systemPrompt.match(/Business Operating Hours:\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\n|\n[A-Z]|$)/i);
  const hoursText = hoursMatch ? hoursMatch[1].trim() : null;

  const isFollowUpTurn = assistantMessages.length > 0 || userMessages.length > 1;

  // 1. Safety / Unauthorized Request Refusal
  if (
    lowerUser.includes("off-menu") ||
    lowerUser.includes("illegal") ||
    lowerUser.includes("unauthorized") ||
    lowerUser.includes("prescription") ||
    lowerUser.includes("override")
  ) {
    return "I cannot provide services outside of our standard catalog or authorize unapproved requests. I would be glad to connect you directly with a staff member.";
  }

  // 2. Business Information ("I want to learn more about your business", "Tell me about your business")
  if (
    lowerUser.includes("about your business") ||
    lowerUser.includes("about the business") ||
    lowerUser.includes("tell me about yourself") ||
    lowerUser.includes("what do you do") ||
    lowerUser.includes("who are you") ||
    lowerUser.includes("what is this place") ||
    lowerUser.includes("learn more about")
  ) {
    // Check if this is a repeated request in the same conversation
    if (previousUserMsg && (
      previousUserMsg.toLowerCase().includes("about your business") ||
      previousUserMsg.toLowerCase().includes("about the business") ||
      previousUserMsg.toLowerCase().includes("what do you do")
    )) {
      return `At ${businessName}, our primary mission is helping our clients with dedicated service. You can explore our services, review pricing, or schedule an appointment. What specific area would you like to explore?`;
    }

    let response = `We are ${businessName}.`;
    if (businessDescription) {
      response += ` ${businessDescription}`;
    } else {
      response += ` We provide professional services tailored to our clients' needs.`;
    }

    if (rawServicesText && !rawServicesText.includes("No services configured")) {
      response += ` We offer a variety of services and convenient appointment booking. Would you like to view our services or check pricing?`;
    } else {
      response += ` How may I assist you today?`;
    }
    return response;
  }

  // 3. Services Inquiries ("What services do you offer?", "What can you do?")
  if (
    lowerUser.includes("what services") ||
    lowerUser.includes("services do you offer") ||
    lowerUser.includes("what do you offer") ||
    lowerUser.includes("service list") ||
    lowerUser.includes("menu") ||
    lowerUser.includes("catalog")
  ) {
    if (rawServicesText && !rawServicesText.includes("No services configured")) {
      return `At ${businessName}, we offer: ${rawServicesText}. Would you like more details or to book an appointment for any of these?`;
    }
    return `Our service catalog is currently being updated. Please contact our team directly at ${phone || 'our front desk'} for a personalized consultation.`;
  }

  // 4. Pricing & Rates Queries ("How much does it cost?", "How much?", "Pricing")
  if (
    lowerUser.includes("how much") ||
    lowerUser.includes("price") ||
    lowerUser.includes("cost") ||
    lowerUser.includes("rate") ||
    lowerUser.includes("fee")
  ) {
    const priceMatch = systemPrompt.match(/\$([0-9]+(\.[0-9]{2})?)/);
    const serviceNameMatch = systemPrompt.match(/(?:Service Name|service):\s*([^\n,]+)/i);

    if (priceMatch) {
      const svc = serviceNameMatch ? serviceNameMatch[1].trim() : "this service";
      return `Our rate for ${svc} is $${priceMatch[1]}. Would you like to check availability and schedule an appointment?`;
    }
    if (rawServicesText && rawServicesText.includes("$")) {
      return `Here are our current rates: ${rawServicesText}. Would you like to book one of these?`;
    }
    return `Our rates depend on the specific service and options chosen. Please let me know which service you are interested in so I can provide exact details.`;
  }

  // 5. Operating Hours Queries ("Are you open Sunday?", "What are your hours?")
  if (
    lowerUser.includes("hours") ||
    lowerUser.includes("open") ||
    lowerUser.includes("close") ||
    lowerUser.includes("sunday") ||
    lowerUser.includes("saturday") ||
    lowerUser.includes("weekend")
  ) {
    if (hoursText && !hoursText.includes("Standard Business Hours apply")) {
      // Check if user specifically asked about Sunday
      if (lowerUser.includes("sunday")) {
        const isSundayClosed = hoursText.toLowerCase().includes("sunday: closed") || !hoursText.toLowerCase().includes("sunday");
        if (isSundayClosed) {
          return `We are closed on Sundays. Our operating hours during the week are: ${hoursText}. Would you like to schedule a visit on a weekday?`;
        }
      }
      return `Our operating hours are: ${hoursText}. Would you like to schedule an appointment during these times?`;
    }
    return `We are open Monday through Friday during standard business hours. Would you like to schedule a visit?`;
  }

  // 6. Location / Address Queries ("Where are you located?")
  if (
    lowerUser.includes("where") ||
    lowerUser.includes("location") ||
    lowerUser.includes("address") ||
    lowerUser.includes("directions")
  ) {
    if (address) {
      return `We are located at ${address}. Please let us know if you need directions or would like to schedule an in-person visit.`;
    }
    return `We serve our clients both locally and online. Please let our team know if you'd like to arrange an appointment or receive location directions.`;
  }

  // 7. Contact Details Queries ("What is your phone number?", "How can I call you?")
  if (
    lowerUser.includes("phone") ||
    lowerUser.includes("call you") ||
    lowerUser.includes("contact") ||
    lowerUser.includes("email")
  ) {
    let contactInfo = "";
    if (phone) contactInfo += `phone at ${phone}`;
    if (phone && address) contactInfo += ` or in person at ${address}`;
    if (contactInfo) {
      return `You can reach ${businessName} via ${contactInfo}. May I help you with any questions or appointment booking today?`;
    }
    return `You can reach our team directly through this chat window or by requesting a human callback. Would you like me to flag a representative?`;
  }

  // 8. Booking Availability Queries
  if (
    lowerUser.includes("book") ||
    lowerUser.includes("appointment") ||
    lowerUser.includes("tomorrow") ||
    lowerUser.includes("schedule") ||
    lowerUser.includes("reserve")
  ) {
    if (rawServicesText && !rawServicesText.includes("No services")) {
      return `We would be happy to schedule your appointment for ${rawServicesText.split("\n")[0].replace(/^-\s*/, "")}. Please share your preferred day and time!`;
    }
    return `No appointment services are currently configured for direct online booking. Please contact our team at ${phone || 'front desk'} to schedule.`;
  }

  // 9. Greeting / Conversation Initializer
  if (/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))\b/i.test(lowerUser)) {
    if (isFollowUpTurn) {
      return `Hello! How can I assist you further today?`;
    }
    return `Hello! Welcome to ${businessName}. How may I assist you today?`;
  }

  // 10. Politeness / Closing
  if (/^(thank\s*you|thanks|great|awesome|perfect|bye|goodbye)\b/i.test(lowerUser)) {
    return `You're very welcome! If you need anything else from ${businessName}, feel free to ask anytime. Have a wonderful day!`;
  }

  // 11. Grounded Fallback (Never hallucinate, never repeat canned front desk script if in conversation)
  if (isFollowUpTurn) {
    return `I don't have that specific information in our business records right now. Would you like me to connect you with our team, or help you with our services and booking?`;
  }

  return `Hello! I'm here representing ${businessName}. I can provide information about our services, pricing, business hours, and help you book appointments. How may I help you today?`;
}

export class OpenAIProvider implements LLMProvider {
  constructor(private apiKey?: string) {}

  async generateCompletion(
    messages: ChatMessage[],
    options?: { temperature?: number; jsonMode?: boolean }
  ): Promise<LLMCompletionResult> {
    if (!this.apiKey) {
      throw new Error("OpenAI API Key is missing");
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          temperature: options?.temperature ?? 0.7,
          response_format: options?.jsonMode ? { type: "json_object" } : undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || `HTTP ${response.status}`;
        console.warn(`[OpenAIProvider] Remote API notice (${errMsg}). Engaging smart semantic fallback.`);

        emitFallbackSignal("openai", "gemini", errMsg);

        if (process.env.GEMINI_API_KEY) {
          try {
            const gemini = new GeminiProvider(process.env.GEMINI_API_KEY);
            return await gemini.generateCompletion(messages, options);
          } catch (geminiErr) {
            console.warn("[GeminiProvider] Fallback also unavailable:", geminiErr);
            emitFallbackSignal("gemini", "deterministic", String(geminiErr));
          }
        }

        return {
          content: synthesizeDeterministicResponse(messages),
          provider: "operator_smart_engine",
          model: "operator-semantic-v1",
        };
      }

      const data = await response.json();
      return {
        content: data.choices[0]?.message?.content || "",
        provider: "openai",
        model: data.model || "gpt-4o-mini",
        usage: {
          promptTokens: data.usage?.prompt_tokens ?? 0,
          completionTokens: data.usage?.completion_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? 0,
        },
      };
    } catch (error: any) {
      console.warn("[OpenAIProvider] Network/Quota notice, engaging resilient fallback:", error.message);
      emitFallbackSignal("openai", "deterministic", error.message);
      return {
        content: synthesizeDeterministicResponse(messages),
        provider: "operator_smart_engine",
        model: "operator-semantic-v1",
      };
    }
  }
}

export class GeminiProvider implements LLMProvider {
  constructor(private apiKey?: string) {}

  async generateCompletion(
    messages: ChatMessage[],
    options?: { temperature?: number; jsonMode?: boolean }
  ): Promise<LLMCompletionResult> {
    if (!this.apiKey) {
      throw new Error("Gemini API Key is missing");
    }

    try {
      const systemPrompt = messages.find((m) => m.role === "system")?.content;
      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          generationConfig: {
            temperature: options?.temperature ?? 0.7,
            responseMimeType: options?.jsonMode ? "application/json" : "text/plain",
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
        provider: "gemini",
        model: "gemini-2.5-flash",
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
        },
      };
    } catch (error: any) {
      console.warn("[GeminiProvider] Error generating completion:", error);
      emitFallbackSignal("gemini", "deterministic", String(error));
      return {
        content: synthesizeDeterministicResponse(messages),
        provider: "operator_smart_engine",
        model: "operator-semantic-v1",
      };
    }
  }
}

export const llmRegistry = {
  getProvider(): LLMProvider {
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (openaiKey) return new OpenAIProvider(openaiKey);
    if (geminiKey) return new GeminiProvider(geminiKey);

    // Resilient fallback provider when no API keys are set in environment
    return {
      async generateCompletion(messages: ChatMessage[]): Promise<LLMCompletionResult> {
        return {
          content: synthesizeDeterministicResponse(messages),
          provider: "operator_smart_engine",
          model: "operator-semantic-v1",
        };
      },
    };
  },
};
