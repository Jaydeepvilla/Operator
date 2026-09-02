import { InboundMessage } from "../types";
import { aiReceptionistCore } from "../core";

export const whatsappAdapter = {
  /**
   * Transforms raw Meta Cloud API / Vonage WhatsApp webhook payload into a canonical InboundMessage
   */
  fromMetaWebhook(payload: {
    organizationId: string;
    phoneId: string;
    fromNumber: string;
    profileName?: string;
    messageId: string;
    textBody: string;
    timestamp?: number;
  }): InboundMessage {
    return {
      organizationId: payload.organizationId,
      channel: "whatsapp",
      channelAccountId: payload.phoneId,
      externalMessageId: payload.messageId,
      customer: {
        phone: payload.fromNumber,
        name: payload.profileName || `WhatsApp (${payload.fromNumber})`,
      },
      content: {
        type: "text",
        text: payload.textBody,
      },
      metadata: {
        timestamp: payload.timestamp ? new Date(payload.timestamp * 1000) : new Date(),
      },
    };
  },

  /**
   * Processes a WhatsApp turn through the unified Operator AI core
   */
  async handleIncomingTurn(payload: {
    organizationId: string;
    phoneId: string;
    fromNumber: string;
    profileName?: string;
    messageId: string;
    textBody: string;
    timestamp?: number;
  }) {
    const inbound = this.fromMetaWebhook(payload);
    return await aiReceptionistCore.processInboundMessage(inbound);
  }
};
