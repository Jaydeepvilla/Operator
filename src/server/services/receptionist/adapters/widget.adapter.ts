import { InboundMessage } from "../types";
import { aiReceptionistCore } from "../core";

export const widgetAdapter = {
  /**
   * Transforms an in-browser Website Chat Widget event into a canonical InboundMessage
   */
  fromWidgetEvent(payload: {
    organizationId: string;
    sessionId: string;
    userText: string;
    visitorName?: string;
    visitorEmail?: string;
    visitorPhone?: string;
    conversationId?: string;
  }): InboundMessage {
    return {
      organizationId: payload.organizationId,
      channel: "widget",
      channelAccountId: "web-widget",
      conversationId: payload.conversationId,
      externalConversationId: payload.sessionId,
      externalMessageId: `widget-${payload.sessionId}-${Date.now()}`,
      customer: {
        externalId: payload.sessionId,
        name: payload.visitorName || "Website Visitor",
        email: payload.visitorEmail,
        phone: payload.visitorPhone,
      },
      content: {
        type: "text",
        text: payload.userText,
      },
      metadata: {
        timestamp: new Date(),
      },
    };
  },

  /**
   * Processes a web chat turn through the unified AI Receptionist core
   */
  async handleWidgetTurn(payload: {
    organizationId: string;
    sessionId: string;
    userText: string;
    visitorName?: string;
    visitorEmail?: string;
    visitorPhone?: string;
    conversationId?: string;
  }) {
    const inbound = this.fromWidgetEvent(payload);
    return await aiReceptionistCore.processInboundMessage(inbound);
  }
};
