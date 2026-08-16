/**
 * Canonical Types for Operator AI's Unified AI Receptionist Platform.
 * All channels (Voice, WhatsApp, Web Widget, SMS, Email, Social) normalize to these contracts.
 */

export type ChannelType = "voice" | "whatsapp" | "widget" | "sms" | "email" | "instagram" | "facebook";

export type MessageContentType = "text" | "audio" | "image" | "attachment";

export interface InboundMessageCustomer {
  externalId?: string;
  name?: string;
  phone?: string;
  email?: string;
  timezone?: string;
}

export interface InboundMessageContent {
  type: MessageContentType;
  text?: string;
  mediaUrl?: string;
  audioDurationSeconds?: number;
  mimeType?: string;
}

export interface InboundMessageMetadata {
  timestamp: Date;
  locale?: string;
  timezone?: string;
  rawHeaders?: Record<string, string>;
  callSid?: string;
  isDraftAssistant?: boolean;
  [key: string]: any;
}

/**
 * Normalized Canonical Inbound Message Contract
 */
export interface InboundMessage {
  organizationId: string;
  channel: ChannelType;
  channelAccountId: string; // e.g. Phone Number ID, Twilio SID, or Widget Org Slug
  conversationId?: string; // Internal UUID if existing
  externalConversationId?: string; // External provider thread ID
  externalMessageId: string;
  customer: InboundMessageCustomer;
  content: InboundMessageContent;
  metadata: InboundMessageMetadata;
}

/**
 * Normalized Canonical Outbound Message Contract
 */
export interface OutboundMessage {
  organizationId: string;
  conversationId: string;
  channel: ChannelType;
  recipientId: string; // Phone, Email, or Widget Session ID
  content: {
    text: string;
    audioBuffer?: Buffer;
    mediaUrl?: string;
    buttons?: Array<{ title: string; payload: string }>;
  };
  metadata: {
    citations?: string[];
    intent?: string;
    isEscalated?: boolean;
    confidenceScore?: number;
    latencyMs?: number;
    actionTaken?: ReceptionistActionSummary;
  };
}

export interface OperatorActionSummary {
  type: "none" | "booking_created" | "booking_rescheduled" | "booking_cancelled" | "lead_qualified" | "escalated_to_staff";
  details?: Record<string, any>;
}

/**
 * The Comprehensive Receptionist Response Output
 */
export interface OperatorResponse {
  conversationId: string;
  leadProfileId: string;
  assistantReplyText: string;
  audioBuffer?: Buffer;
  intent: string;
  citations: string[];
  isEscalated: boolean;
  actionTaken: ReceptionistActionSummary;
  latencyMs: number;
}

// Canonical Aliases for Backward Compatibility
export type ReceptionistResponse = OperatorResponse;
export type ReceptionistActionSummary = OperatorActionSummary;
