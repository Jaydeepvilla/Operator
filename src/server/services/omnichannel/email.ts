import { 
  MessagingProvider, 
  WebhookProvider, 
  SendMessageResult, 
  WebhookMessagePayload, 
  WebhookStatusPayload,
  ProviderRegistry
} from "./types";
import nodemailer from "nodemailer";

export class EmailProvider implements MessagingProvider, WebhookProvider {
  id = "email-smtp";
  name = "SMTP / Google / Microsoft Email Core";
  channelType = "email" as const;

  // 1. Send Email
  async sendMessage(
    organizationId: string,
    connectionConfig: Record<string, any>,
    recipientId: string,
    content: string,
    attachments?: any[]
  ): Promise<SendMessageResult> {
    try {
      const host = connectionConfig.host;
      const port = parseInt(connectionConfig.port || "465");
      const user = connectionConfig.user;
      const pass = connectionConfig.pass;
      const from = connectionConfig.from || `"Operator AI" <${user}>`;

      if (!host || !user || !pass) {
        throw new Error("Missing required SMTP host, user, or pass in channel connection config.");
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      const mailOptions = {
        from,
        to: recipientId,
        subject: connectionConfig.subject || "Message from Operator AI Receptionist",
        text: content,
        html: content.replace(/\n/g, "<br>"),
        attachments: attachments?.map((a) => ({
          filename: a.name || "attachment",
          path: a.url || a.path,
        })),
      };

      const info = await transporter.sendMail(mailOptions);
      const messageId = info.messageId;

      return {
        success: true,
        externalId: messageId
      };
    } catch (e: any) {
      console.error("[Email Provider] SMTP send failed:", e);
      return {
        success: false,
        errorCode: "EMAIL_SEND_FAILED",
        errorMessage: e?.message || "Email SMTP request failed"
      };
    }
  }

  // 2. Send Email template
  async sendTemplateMessage(
    organizationId: string,
    connectionConfig: Record<string, any>,
    recipientId: string,
    templateName: string,
    variables: Record<string, string>
  ): Promise<SendMessageResult> {
    return this.sendMessage(organizationId, connectionConfig, recipientId, `[Email template ${templateName} sent]`);
  }

  // 3. Process webhooks from inbound email relays (e.g. SendGrid Inbound Parse, Postmark)
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

      // SMTP parsed relays post webhook details:
      // - body.from, body.to, body.text, body.html, body.headers (In-Reply-To, References)
      
      const emailFrom = body.from || body.From;
      const emailTo = body.to || body.To;
      const emailBody = body.text || body.Text || body.html || body.Html || "";
      const emailSubject = body.subject || body.Subject || "";
      const messageIdHeader = body.headers?.["Message-ID"] || body.headers?.["message-id"] || "";
      const inReplyToHeader = body.headers?.["In-Reply-To"] || body.headers?.["in-reply-to"] || "";

      if (emailFrom && emailTo) {
        messages.push({
          organizationId: orgId,
          channelId: channelId,
          channelType: "email",
          externalMessageId: messageIdHeader || "mail-id-" + Math.random().toString(36).substring(2, 10),
          senderUserId: emailFrom, // e.g. "client@patient.com"
          recipientUserId: emailTo, // business inbox e.g. "receptionist@myclinic.com"
          content: emailBody,
          metadata: {
            subject: emailSubject,
            inReplyTo: inReplyToHeader,
            references: body.headers?.["References"] || ""
          }
        });
      }
    } catch (e) {
      console.error("[Email Provider] Error parsing inbound email webhook:", e);
    }

    return { messages, statuses };
  }
}

// Auto-register provider
const providerInstance = new EmailProvider();
ProviderRegistry.registerMessagingProvider(providerInstance);
ProviderRegistry.registerWebhookProvider(providerInstance);
