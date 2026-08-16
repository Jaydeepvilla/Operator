import { SpeechToTextProvider, VoiceProviderRegistry } from "./types";

export class DeepgramSttProvider implements SpeechToTextProvider {
  id = "stt-deepgram";
  name = "Deepgram Streaming STT";

  async processAudioStream(
    audioChunk: Buffer
  ): Promise<{ text: string; isFinal: boolean; confidence: number }> {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPGRAM_API_KEY is not configured on the server.");
    }

    try {
      const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true", {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/octet-stream",
        },
        body: audioChunk as any,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Deepgram API returned HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
      const confidence = data.results?.channels?.[0]?.alternatives?.[0]?.confidence || 1.0;

      return {
        text: transcript,
        isFinal: true, // For HTTP REST requests, it's immediately complete
        confidence,
      };
    } catch (e: any) {
      console.error("[Deepgram STT] API request failed:", e);
      return { text: "", isFinal: false, confidence: 0.0 };
    }
  }
}

// Auto-register provider
VoiceProviderRegistry.registerSTT(new DeepgramSttProvider());
