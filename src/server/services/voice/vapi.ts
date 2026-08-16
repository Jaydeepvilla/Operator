import { TelephonyProvider, CallTransferOptions, VoiceProviderRegistry } from "./types";

export class VapiTelephonyProvider implements TelephonyProvider {
  id = "telephony-vapi";
  name = "Vapi AI Telephony Service";

  async initiateOutboundCall(
    organizationId: string,
    connectionConfig: Record<string, any>,
    to: string,
    from: string,
    streamUrl: string
  ): Promise<{ success: boolean; externalCallId?: string; error?: string }> {
    const apiKey = process.env.VAPI_API_KEY || connectionConfig.vapiApiKey;
    const assistantId = connectionConfig.vapiAssistantId || process.env.VAPI_ASSISTANT_ID;
    const phoneNumberId = connectionConfig.vapiPhoneNumberId || process.env.VAPI_PHONE_NUMBER_ID;

    if (!apiKey) {
      console.error("[Vapi Telephony] VAPI_API_KEY is not configured.");
      return {
        success: false,
        error: "Vapi API Key is missing. Outbound call cannot be placed.",
      };
    }

    try {
      const response = await fetch("https://api.vapi.ai/call/phone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumberId,
          assistantId,
          customer: {
            number: to,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Vapi API returned HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      return {
        success: true,
        externalCallId: data.id,
      };
    } catch (e: any) {
      console.error("[Vapi Telephony] Failed to initiate call:", e);
      return {
        success: false,
        error: e?.message || "Vapi call creation failed",
      };
    }
  }

  async transferCall(
    externalCallId: string,
    options: CallTransferOptions
  ): Promise<{ success: boolean; error?: string }> {
    const apiKey = process.env.VAPI_API_KEY;
    if (!apiKey) return { success: false, error: "Vapi API key missing." };

    try {
      // Vapi supports call transfer by sending a control action or transferring to a destination
      const response = await fetch(`https://api.vapi.ai/call/${externalCallId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "transfer",
          destination: {
            type: "number",
            number: options.targetNumber,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Vapi returned HTTP ${response.status}: ${errText}`);
      }

      return { success: true };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || "Vapi call transfer update failed",
      };
    }
  }

  async hangUpCall(externalCallId: string): Promise<boolean> {
    const apiKey = process.env.VAPI_API_KEY;
    if (!apiKey) return false;

    try {
      const response = await fetch(`https://api.vapi.ai/call/${externalCallId}/end`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return response.ok;
    } catch (e) {
      console.error("[Vapi Telephony] Hangup failed:", e);
      return false;
    }
  }
}

// Auto-register provider
VoiceProviderRegistry.registerTelephony(new VapiTelephonyProvider());
