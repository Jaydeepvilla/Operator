import { InboundMessage } from "../types";
import { aiReceptionistCore } from "../core";

export const voiceAdapter = {
  /**
   * Transforms an inbound Twilio/Vapi speech transcript turn into a canonical InboundMessage
   */
  fromVoiceSpeechTurn(payload: {
    organizationId: string;
    phoneNumberId: string;
    callSid: string;
    callerNumber: string;
    speechTranscript: string;
    conversationId?: string;
  }): InboundMessage {
    return {
      organizationId: payload.organizationId,
      channel: "voice",
      channelAccountId: payload.phoneNumberId,
      conversationId: payload.conversationId,
      externalConversationId: payload.callSid,
      externalMessageId: `voice-${payload.callSid}-${Date.now()}`,
      customer: {
        phone: payload.callerNumber,
        name: `Caller (${payload.callerNumber})`,
      },
      content: {
        type: "text",
        text: payload.speechTranscript,
      },
      metadata: {
        timestamp: new Date(),
        callSid: payload.callSid,
      },
    };
  },

  /**
   * Processes a voice turn through the unified AI Receptionist core
   */
  async handleVoiceSpeechTurn(payload: {
    organizationId: string;
    phoneNumberId: string;
    callSid: string;
    callerNumber: string;
    speechTranscript: string;
    conversationId?: string;
  }) {
    const inbound = this.fromVoiceSpeechTurn(payload);
    return await aiReceptionistCore.processInboundMessage(inbound);
  }
};
