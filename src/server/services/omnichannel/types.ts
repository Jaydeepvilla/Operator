export interface AttachmentInput {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface SendMessageResult {
  success: boolean;
  externalId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface WebhookMessagePayload {
  organizationId: string;
  channelId: string;
  channelType: "whatsapp" | "sms" | "email" | "instagram" | "facebook";
  externalMessageId: string;
  senderUserId: string; // The customer's handle (e.g. phone, email, username)
  senderName?: string;
  recipientUserId: string; // The business's handle
  content: string;
  attachments?: AttachmentInput[];
  metadata?: Record<string, any>;
}

export interface WebhookStatusPayload {
  organizationId: string;
  channelId: string;
  externalMessageId: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  errorCode?: string;
  errorMessage?: string;
  updatedAt: Date;
}

export interface InteractiveMessagePayload {
  type: "button" | "list";
  header?: string;
  footer?: string;
  buttons?: Array<{ id: string; title: string }>;
  listButton?: string;
  sections?: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

export interface CommunicationProvider {
  id: string; // e.g. 'whatsapp-meta', 'sms-twilio', 'email-smtp'
  name: string;
  channelType: "whatsapp" | "sms" | "email" | "instagram" | "facebook";
}

export interface MessagingProvider extends CommunicationProvider {
  sendMessage(
    organizationId: string,
    connectionConfig: Record<string, any>,
    recipientId: string,
    content: string,
    attachments?: AttachmentInput[],
    interactive?: InteractiveMessagePayload
  ): Promise<SendMessageResult>;
  
  sendTemplateMessage(
    organizationId: string,
    connectionConfig: Record<string, any>,
    recipientId: string,
    templateName: string,
    variables: Record<string, string>
  ): Promise<SendMessageResult>;
}

export interface WebhookProvider extends CommunicationProvider {
  processIncomingWebhook(
    headers: Record<string, string>,
    body: any
  ): Promise<{
    messages: WebhookMessagePayload[];
    statuses: WebhookStatusPayload[];
  }>;
  
  verifyWebhookChallenge?(
    queryParams: Record<string, string>
  ): string | null;
}

export class ProviderRegistry {
  private static messagingProviders = new Map<string, MessagingProvider>();
  private static webhookProviders = new Map<string, WebhookProvider>();

  static registerMessagingProvider(provider: MessagingProvider) {
    this.messagingProviders.set(provider.channelType, provider);
  }

  static registerWebhookProvider(provider: WebhookProvider) {
    this.webhookProviders.set(provider.id, provider);
  }

  static getMessagingProvider(channelType: string): MessagingProvider | undefined {
    return this.messagingProviders.get(channelType);
  }

  static getWebhookProvider(providerId: string): WebhookProvider | undefined {
    return this.webhookProviders.get(providerId);
  }
}
