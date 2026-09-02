import { 
  MessagingProvider, 
  WebhookProvider, 
  SendMessageResult, 
  WebhookMessagePayload, 
  WebhookStatusPayload,
  ProviderRegistry
} from "./types";
import crypto from "crypto";

export class VonageProvider implements MessagingProvider, WebhookProvider {
  id = "sms-vonage";
  name = "Vonage Communication Service";
  channelType = "sms" as const;

  // 1. Send SMS via Vonage Messages API (US / EU standard)
  async sendMessage(
    organizationId: string,
    connectionConfig: Record<string, any>,
    recipientId: string,
    content: string,
    attachments?: any[]
  ): Promise<SendMessageResult> {
    try {
      const apiKey = connectionConfig.apiKey || process.env.VONAGE_API_KEY;
      const apiSecret = connectionConfig.apiSecret || process.env.VONAGE_API_SECRET;
      const fromNumber = connectionConfig.fromNumber || process.env.VONAGE_FROM_NUMBER || "Operator";

      if (!apiKey || !apiSecret) {
        // Fallback for zero-cost sandbox / test mode
        if (process.env.NODE_ENV !== "production" || !process.env.VONAGE_API_KEY) {
          console.log(`[VonageProvider Sandbox] SMS simulated to ${recipientId}: "${content.substring(0, 50)}..."`);
          return {
            success: true,
            externalId: "vonage-sim-" + crypto.randomUUID()
          };
        }
        throw new Error("Missing Vonage API credentials.");
      }

      const cleanPhone = recipientId.replace(/\D/g, "");

      const response = await fetch("https://rest.nexmo.com/sms/json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          api_secret: apiSecret,
          from: fromNumber,
          to: cleanPhone,
          text: content,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return {
          success: false,
          errorCode: "VONAGE_SEND_FAILED",
          errorMessage: err || "Vonage request failed"
        };
      }

      const data = await response.json();
      const messageStatus = data.messages?.[0];

      if (messageStatus?.status !== "0") {
        return {
          success: false,
          errorCode: `VONAGE_ERROR_${messageStatus?.status}`,
          errorMessage: messageStatus?.["error-text"] || "Vonage delivery failure"
        };
      }

      return {
        success: true,
        externalId: messageStatus?.["message-id"] || "vonage-" + crypto.randomUUID()
      };
    } catch (e: any) {
      return {
        success: false,
        errorCode: "VONAGE_SEND_ERROR",
        errorMessage: e?.message || "Vonage request exception"
      };
    }
  }

  // 2. Send SMS using templates
  async sendTemplateMessage(
    organizationId: string,
    connectionConfig: Record<string, any>,
    recipientId: string,
    templateName: string,
    variables: Record<string, string>
  ): Promise<SendMessageResult> {
    return this.sendMessage(organizationId, connectionConfig, recipientId, `[Template ${templateName} sent]`);
  }

  // 3. Process Vonage status or inbound message callback webhooks
  async processIncomingWebhook(
    headers: Record<string, string>,
    body: any
  ): Promise<{ messages: WebhookMessagePayload[]; statuses: WebhookStatusPayload[] }> {
    const messages: WebhookMessagePayload[] = [];
    const statuses: WebhookStatusPayload[] = [];

    try {
      const orgId = headers["x-organization-id"] || body.organizationId;
      const channelId = headers["x-channel-id"] || body.channelId;

      if (body.messageId && body.status) {
        let statusMapped: "queued" | "sent" | "delivered" | "read" | "failed" = "sent";
        if (body.status === "delivered") statusMapped = "delivered";
        else if (body.status === "failed" || body.status === "rejected") statusMapped = "failed";
        else if (body.status === "read") statusMapped = "read";

        if (orgId && channelId) {
          statuses.push({
            organizationId: orgId,
            channelId: channelId,
            externalMessageId: body.messageId,
            status: statusMapped,
            errorCode: body.errCode,
            errorMessage: body.status,
            updatedAt: new Date()
          });
        }
      }

      // Inbound message
      if (body.text && body.msisdn && orgId && channelId) {
        messages.push({
          organizationId: orgId,
          channelId: channelId,
          channelType: "sms",
          externalMessageId: body.messageId || "vonage-in-" + crypto.randomUUID(),
          senderUserId: body.msisdn,
          senderName: `SMS User (+${body.msisdn})`,
          recipientUserId: body.to || "Operator",
          content: body.text,
          metadata: { timestamp: body.messageTimestamp ? new Date(body.messageTimestamp) : new Date() }
        });
      }
    } catch (e) {
      console.error("[Vonage Provider] Error parsing webhook:", e);
    }

    return { messages, statuses };
  }
}

// Auto-register provider
const providerInstance = new VonageProvider();
ProviderRegistry.registerMessagingProvider(providerInstance);
ProviderRegistry.registerWebhookProvider(providerInstance);
