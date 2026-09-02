import { 
  MessagingProvider, 
  WebhookProvider, 
  SendMessageResult, 
  WebhookMessagePayload, 
  WebhookStatusPayload,
  ProviderRegistry
} from "./types";
import crypto from "crypto";

export class SinchProvider implements MessagingProvider, WebhookProvider {
  id = "sms-sinch";
  name = "Sinch Communication Service";
  channelType = "sms" as const;

  // 1. Send SMS via Sinch Conversation/SMS REST API
  async sendMessage(
    organizationId: string,
    connectionConfig: Record<string, any>,
    recipientId: string,
    content: string,
    attachments?: any[]
  ): Promise<SendMessageResult> {
    try {
      const servicePlanId = connectionConfig.servicePlanId || process.env.SINCH_SERVICE_PLAN_ID;
      const apiToken = connectionConfig.apiToken || process.env.SINCH_API_TOKEN;
      const fromNumber = connectionConfig.fromNumber || process.env.SINCH_FROM_NUMBER || "Operator";

      if (!servicePlanId || !apiToken) {
        // Fallback for zero-cost sandbox / test mode
        if (process.env.NODE_ENV !== "production" || !process.env.SINCH_SERVICE_PLAN_ID) {
          console.log(`[SinchProvider Sandbox] SMS simulated to ${recipientId}: "${content.substring(0, 50)}..."`);
          return {
            success: true,
            externalId: "sinch-sim-" + crypto.randomUUID()
          };
        }
        throw new Error("Missing Sinch API credentials.");
      }

      const cleanPhone = recipientId.replace(/\D/g, "");

      const response = await fetch(`https://us.sms.api.sinch.com/xms/v1/${servicePlanId}/batches`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromNumber,
          to: [cleanPhone],
          body: content,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return {
          success: false,
          errorCode: "SINCH_SEND_FAILED",
          errorMessage: err || "Sinch request failed"
        };
      }

      const data = await response.json();
      return {
        success: true,
        externalId: data.id || "sinch-" + crypto.randomUUID()
      };
    } catch (e: any) {
      return {
        success: false,
        errorCode: "SINCH_SEND_ERROR",
        errorMessage: e?.message || "Sinch request exception"
      };
    }
  }

  async sendTemplateMessage(
    organizationId: string,
    connectionConfig: Record<string, any>,
    recipientId: string,
    templateName: string,
    variables: Record<string, string>
  ): Promise<SendMessageResult> {
    return this.sendMessage(organizationId, connectionConfig, recipientId, `[Template ${templateName} sent]`);
  }

  async processIncomingWebhook(
    headers: Record<string, string>,
    body: any
  ): Promise<{ messages: WebhookMessagePayload[]; statuses: WebhookStatusPayload[] }> {
    const messages: WebhookMessagePayload[] = [];
    const statuses: WebhookStatusPayload[] = [];

    try {
      const orgId = headers["x-organization-id"] || body.organizationId;
      const channelId = headers["x-channel-id"] || body.channelId;

      if (body.id && body.status && orgId && channelId) {
        let statusMapped: "queued" | "sent" | "delivered" | "read" | "failed" = "sent";
        if (body.status === "Delivered" || body.status === "Successful") statusMapped = "delivered";
        else if (body.status === "Failed" || body.status === "Aborted") statusMapped = "failed";

        statuses.push({
          organizationId: orgId,
          channelId: channelId,
          externalMessageId: body.id,
          status: statusMapped,
          errorCode: body.code,
          errorMessage: body.status,
          updatedAt: new Date()
        });
      }

      if (body.body && body.from && orgId && channelId) {
        messages.push({
          organizationId: orgId,
          channelId: channelId,
          channelType: "sms",
          externalMessageId: body.id || "sinch-in-" + crypto.randomUUID(),
          senderUserId: body.from,
          senderName: `SMS User (${body.from})`,
          recipientUserId: body.to || "Operator",
          content: body.body,
          metadata: { timestamp: body.received_at ? new Date(body.received_at) : new Date() }
        });
      }
    } catch (e) {
      console.error("[Sinch Provider] Error parsing webhook:", e);
    }

    return { messages, statuses };
  }
}

// Auto-register provider
const providerInstance = new SinchProvider();
ProviderRegistry.registerMessagingProvider(providerInstance);
ProviderRegistry.registerWebhookProvider(providerInstance);
