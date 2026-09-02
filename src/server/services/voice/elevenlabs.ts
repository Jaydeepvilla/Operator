import { TextToSpeechProvider, VoiceProviderRegistry } from "./types";

export class ElevenLabsTtsProvider implements TextToSpeechProvider {
  id = "tts-elevenlabs";
  name = "ElevenLabs Voice Synthesis";

  async synthesizeText(
    text: string,
    voiceName?: string,
    speed?: string
  ): Promise<{ audioBuffer: Buffer; mimeType: string }> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY is not configured on the server.");
    }

    try {
      // Mapping voice names to standard ElevenLabs voice IDs
      const voiceMap: Record<string, string> = {
        "Rachel": "21m00Tcm4TlvDq8ikWAM",
        "Adam": "pNInz6obpgqjVWtJ45IP",
        "Josh": "TxGEqn7nU37j8fWofm27",
        "Antoni": "ErXwobaYiN019PkySvjV"
      };

      const voiceId = (voiceName && voiceMap[voiceName]) || "21m00Tcm4TlvDq8ikWAM";

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.warn(`[ElevenLabs TTS] HTTP ${response.status} (${errText}). Falling back to OpenAI Voice TTS...`);
        return await this.synthesizeWithOpenAI(text);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      return {
        audioBuffer,
        mimeType: "audio/mpeg",
      };
    } catch (e: any) {
      console.warn("[ElevenLabs TTS] Falling back to OpenAI Voice TTS due to error:", e.message);
      return await this.synthesizeWithOpenAI(text);
    }
  }

  private async synthesizeWithOpenAI(text: string): Promise<{ audioBuffer: Buffer; mimeType: string }> {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error("Neither ElevenLabs nor OpenAI TTS key is available.");
    }

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: "alloy",
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI TTS fallback returned HTTP ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return {
      audioBuffer: Buffer.from(arrayBuffer),
      mimeType: "audio/mpeg",
    };
  }
}

// Auto-register provider
VoiceProviderRegistry.registerTTS(new ElevenLabsTtsProvider());
