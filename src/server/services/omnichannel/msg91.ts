import { 
  MessagingProvider, 
  WebhookProvider, 
  SendMessageResult, 
  WebhookMessagePayload, 
  WebhookStatusPayload,
  ProviderRegistry
} from "./types";

export class Msg91Provider implements MessagingProvider, WebhookProvider {
  id = "sms-msg91";
  name = "MSG91 SMS Service";
  channelType = "sms" as const;

  // 1. Send SMS via MSG91
  async sendMessage(
    organizationId: string,
    connectionConfig: Record<string, any>,
    recipientId: string,
    content: string,
    attachments?: any[]
  ): Promise<SendMessageResult> {
    try {
      const authKey = connectionConfig.authKey || process.env.MSG91_AUTH_KEY;
      const senderId = connectionConfig.senderId || process.env.MSG91_SENDER_ID || "NXRECP";
      const flowId = connectionConfig.flowId || process.env.MSG91_FLOW_ID;

      if (!authKey) {
        throw new Error("Missing MSG91 authKey configuration.");
      }

      const cleanPhone = recipientId.replace(/\D/g, "");

      if (flowId) {
        // Use flow API
        const response = await fetch("https://control.msg91.com/api/v5/flow/", {
          method: "POST",
          headers: {
            authkey: authKey,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            flow_id: flowId,
            sender: senderId,
            recipients: [
              {
                mobiles: cleanPhone,
                message: content,
              },
            ],
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          return {
            success: false,
            errorCode: "MSG91_FLOW_FAILED",
            errorMessage: err || "MSG91 flow request failed"
          };
        }
        return {
          success: true,
          externalId: "flow-" + Math.random().toString(36).substring(2, 10)
        };
      }

      // Fallback: Simple transactional API
      const response = await fetch("https://api.msg91.com/api/v2/sendsms", {
        method: "POST",
        headers: {
          authkey: authKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: senderId,
          route: "4",
          country: "91",
          sms: [
            {
              message: content,
              to: [cleanPhone],
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return {
          success: false,
          errorCode: "MSG91_SEND_FAILED",
          errorMessage: err || "MSG91 request failed"
        };
      }

      return {
        success: true,
        externalId: "msg91-" + Math.random().toString(36).substring(2, 16)
      };
    } catch (e: any) {
      return {
        success: false,
        errorCode: "MSG91_SEND_ERROR",
        errorMessage: e?.message || "MSG91 request exception"
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

  // 3. Process MSG91 status or message callback webhooks
  async processIncomingWebhook(
    headers: Record<string, string>,
    body: any
  ): Promise<{ messages: WebhookMessagePayload[]; statuses: WebhookStatusPayload[] }> {
    const messages: WebhookMessagePayload[] = [];
    const statuses: WebhookStatusPayload[] = [];

    try {
      const orgId = headers["x-organization-id"];
      const channelId = headers["x-channel-id"];
      if (!orgId || !channelId) {
        throw new Error("Missing required x-organization-id or x-channel-id in webhook headers");
      }

      // Process incoming msg91 webhook structure if any
      if (body.requestId && body.status) {
        let statusMapped: "queued" | "sent" | "delivered" | "read" | "failed" = "sent";
        if (body.status === "delivered" || body.status === "Success") statusMapped = "delivered";
        else if (body.status === "failed" || body.status === "Failure") statusMapped = "failed";

        statuses.push({
          organizationId: orgId,
          channelId: channelId,
          externalMessageId: body.requestId,
          status: statusMapped,
          errorCode: body.errorCode,
          errorMessage: body.desc,
          updatedAt: new Date()
        });
      }
    } catch (e) {
      console.error("[MSG91 Provider] Error parsing webhook:", e);
    }

    return { messages, statuses };
  }

  // MSG91 signature/security verification helper
  verifyWebhookRequest(
    authToken: string,
    url: string,
    params: Record<string, any>,
    signature: string
  ): boolean {
    if (!authToken || !signature) return false;
    return signature === authToken;
  }
}

// Auto-register provider
const providerInstance = new Msg91Provider();
ProviderRegistry.registerMessagingProvider(providerInstance);
ProviderRegistry.registerWebhookProvider(providerInstance);
