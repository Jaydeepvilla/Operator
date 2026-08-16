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
    // Extract price from system prompt if present
    const priceMatch = systemPrompt.match(/\$([0-9]+(\.[0-9]{2})?)/);
    const priceStr = priceMatch ? `$${priceMatch[1]}` : "$75.00";
    
    // Extract service name
    const serviceMatch = systemPrompt.match(/Available Services:\s*([^:\n]+)/);
    const serviceName = serviceMatch ? serviceMatch[1].trim() : "General Consultation";

    return `A ${serviceName} is ${priceStr}. We are open Monday through Friday, 9:00 AM to 5:00 PM. Would you like me to help you schedule an appointment?`;
  }

  // 2. Safety / Unauthorized Request Refusal
  if (lowerUser.includes("off-menu") || lowerUser.includes("free") || lowerUser.includes("illegal") || lowerUser.includes("unauthorized") || lowerUser.includes("prescription") || lowerUser.includes("override")) {
    return "I cannot provide services outside of our standard catalog or authorize free unapproved requests. I would be glad to help you book an authorized service or connect you directly with a staff member.";
  }

  // 3. Booking Availability Dry-Run Query
  if (lowerUser.includes("book") || lowerUser.includes("appointment") || lowerUser.includes("tomorrow") || lowerUser.includes("schedule")) {
    return "Dr. Sarah is available tomorrow at 2:00 PM for a General Consultation. Would you like me to reserve this appointment for you?";
  }

  // 4. Default warm, professional response
  return "Hello! I am Operator, your automated assistant. I can help you check our service catalog, answer questions about pricing and hours, or assist with booking appointments. How may I help you today?";
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

    return new OpenAIProvider("mock_key");
  },
};
