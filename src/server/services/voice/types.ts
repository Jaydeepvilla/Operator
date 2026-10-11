export interface CallTransferOptions {
  transferType: "warm" | "cold";
  targetNumber?: string;
  targetStaffId?: string;
}

export interface TelephonyProvider {
  id: string; // e.g., 'telephony-twilio', 'telephony-vonage', 'telephony-telnyx'
  name: string;
  
  initiateOutboundCall(
    organizationId: string,
    connectionConfig: Record<string, any>,
    to: string,
    from: string,
    streamUrl: string
  ): Promise<{ success: boolean; externalCallId?: string; error?: string }>;

  transferCall(
    externalCallId: string,
    options: CallTransferOptions
  ): Promise<{ success: boolean; error?: string }>;

  hangUpCall(externalCallId: string): Promise<boolean>;
}

export interface SpeechToTextProvider {
  id: string; // e.g., 'stt-deepgram', 'stt-assemblyai'
  name: string;
  
  processAudioStream(
    audioChunk: Buffer
  ): Promise<{ text: string; isFinal: boolean; confidence: number }>;
}

export interface TextToSpeechProvider {
  id: string; // e.g., 'tts-elevenlabs', 'tts-cartesia'
  name: string;
  
  synthesizeText(
    text: string,
    voiceName?: string,
    speed?: string
  ): Promise<{ audioBuffer: Buffer; mimeType: string }>;
}

export class VoiceProviderRegistry {
  private static telephonyProviders = new Map<string, TelephonyProvider>();
  private static sttProviders = new Map<string, SpeechToTextProvider>();
  private static ttsProviders = new Map<string, TextToSpeechProvider>();

  static registerTelephony(provider: TelephonyProvider) {
    this.telephonyProviders.set(provider.id, provider);
  }

  static registerSTT(provider: SpeechToTextProvider) {
    this.sttProviders.set(provider.id, provider);
  }

  static registerTTS(provider: TextToSpeechProvider) {
    this.ttsProviders.set(provider.id, provider);
  }

  static getTelephony(id: string): TelephonyProvider | undefined {
    return this.telephonyProviders.get(id);
  }

  static getSTT(id: string): SpeechToTextProvider | undefined {
    return this.sttProviders.get(id);
  }

  static getTTS(id: string): TextToSpeechProvider | undefined {
    return this.ttsProviders.get(id);
  }
}
