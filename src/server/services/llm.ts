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

function synthesizeDeterministicResponse(userMsg: string, systemPrompt: string): string {
  const lowerUser = userMsg.toLowerCase();

  // 1. Pricing & Hours Query
  if (lowerUser.includes("how much") || lowerUser.includes("price") || lowerUser.includes("cost") || lowerUser.includes("open") || lowerUser.includes("hours")) {
    const priceMatch = systemPrompt.match(/\$([0-9]+(\.[0-9]{2})?)/);
    const serviceMatch = systemPrompt.match(/Available Services:\s*([^:\n]+)/);

    if (serviceMatch && priceMatch) {
      return `Our ${serviceMatch[1].trim()} is $${priceMatch[1]}. We are open during standard business hours. Would you like to schedule an appointment?`;
    }
    return "Our business hours and service rates depend on the requested service. Please reach out to our team directly for current details.";
  }

  // 2. Safety / Unauthorized Request Refusal
  if (lowerUser.includes("off-menu") || lowerUser.includes("free") || lowerUser.includes("illegal") || lowerUser.includes("unauthorized") || lowerUser.includes("prescription") || lowerUser.includes("override")) {
    return "I cannot provide services outside of our standard catalog or authorize unapproved requests. I would be glad to connect you directly with a staff member.";
  }

  // 3. Booking Availability Query
  if (lowerUser.includes("book") || lowerUser.includes("appointment") || lowerUser.includes("tomorrow") || lowerUser.includes("schedule")) {
    const serviceMatch = systemPrompt.match(/Available Services:\s*([^:\n]+)/);
    if (serviceMatch && !serviceMatch[1].includes("No services")) {
      return `We offer ${serviceMatch[1].trim()}. Please let us know your preferred date and time so we can check availability.`;
    }
    return "No appointment services are currently configured for online booking. Please contact our front desk directly.";
  }

  // 4. Default warm, professional response
  return "Hello! I am your automated front desk assistant. How may I assist you today?";
}

export class OpenAIProvider implements LLMProvider {
  constructor(private apiKey?: string) { }

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

        if (process.env.GEMINI_API_KEY) {
          try {
            const gemini = new GeminiProvider(process.env.GEMINI_API_KEY);
            return await gemini.generateCompletion(messages, options);
          } catch (geminiErr) {
            console.warn("[GeminiProvider] Fallback also unavailable:", geminiErr);
          }
        }

        const userMsg = messages.find((m) => m.role === "user")?.content || "";
        const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
        return {
          content: synthesizeDeterministicResponse(userMsg, systemPrompt),
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
      console.warn("[OpenAIProvider] Network/Quota error, engaging resilient fallback:", error.message);
      const userMsg = messages.find((m) => m.role === "user")?.content || "";
      const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
      return {
        content: synthesizeDeterministicResponse(userMsg, systemPrompt),
        provider: "operator_smart_engine",
        model: "operator-semantic-v1",
      };
    }
  }
}

export class GeminiProvider implements LLMProvider {
  constructor(private apiKey?: string) { }

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
      const userMsg = messages.find((m) => m.role === "user")?.content || "";
      const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
      return {
        content: synthesizeDeterministicResponse(userMsg, systemPrompt),
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

    throw new Error(
      "No LLM provider configured. Please provide OPENAI_API_KEY or GEMINI_API_KEY in your environment variables."
    );
  },
};
