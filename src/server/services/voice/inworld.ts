/**
 * Inworld Text-to-Speech (TTS) Provider
 *
 * Implements synchronous request/response TTS using Inworld AI's Speech API.
 * Documentation: https://docs.inworld.ai/quickstart-tts
 * Endpoint: POST https://api.inworld.ai/tts/v1/voice
 */

import { TextToSpeechProvider, VoiceProviderRegistry } from "./types";

export interface InworldVoiceInfo {
  id: string;
  name: string;
  gender: "female" | "male" | "neutral";
  accent: string;
  description: string;
}

export const INWORLD_VOICES: InworldVoiceInfo[] = [
  // Female Voices
  { id: "Ashley", name: "Ashley", gender: "female", accent: "American", description: "Warm, professional, balanced conversational voice" },
  { id: "Sarah", name: "Sarah", gender: "female", accent: "American", description: "Friendly, expressive, engaging and articulate" },
  { id: "Hana", name: "Hana", gender: "female", accent: "American", description: "Gentle, calm, empathetic tone" },
  { id: "Luna", name: "Luna", gender: "female", accent: "American", description: "Energetic, youthful, bright" },
  { id: "Victoria", name: "Victoria", gender: "female", accent: "British", description: "Sophisticated, authoritative British accent" },
  { id: "Chloe", name: "Chloe", gender: "female", accent: "American", description: "Natural, casual, conversational" },
  { id: "Amy", name: "Amy", gender: "female", accent: "British", description: "Warm, polite British voice" },
  // Male Voices
  { id: "Dennis", name: "Dennis", gender: "male", accent: "American", description: "Deep, clear, confident executive voice" },
  { id: "Blake", name: "Blake", gender: "male", accent: "American", description: "Natural, approachable, contemporary" },
  { id: "Edward", name: "Edward", gender: "male", accent: "British", description: "Distinguished, formal British accent" },
  { id: "Oliver", name: "Oliver", gender: "male", accent: "British", description: "Polite, refined British male" },
  { id: "Michael", name: "Michael", gender: "male", accent: "American", description: "Professional, steady, customer service tone" },
  { id: "Harry", name: "Harry", gender: "male", accent: "British", description: "Crisp, dynamic British male" },
];

export const INWORLD_VOICE_IDS = INWORLD_VOICES.map((v) => v.id);

/**
 * Resolve an input voice ID or name to a valid Inworld voice ID
 */
export function resolveInworldVoiceId(inputVoice?: string): string {
  if (!inputVoice) return "Ashley";

  const exact = INWORLD_VOICES.find(
    (v) => v.id.toLowerCase() === inputVoice.toLowerCase() || v.name.toLowerCase() === inputVoice.toLowerCase()
  );
  if (exact) return exact.id;

  // Fallback to default
  return "Ashley";
}

/**
 * Split long text at sentence or phrase boundaries
 */
export function chunkTextForInworld(text: string, maxChunkLength = 1000): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChunkLength) return [trimmed];

  const sentences = trimmed.split(/(?<=[.?!;:\n])\s+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + " " + sentence).trim().length <= maxChunkLength) {
      currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      if (sentence.length > maxChunkLength) {
        // Fallback split on words
        const words = sentence.split(/\s+/);
        let wordChunk = "";
        for (const word of words) {
          if ((wordChunk + " " + word).trim().length <= maxChunkLength) {
            wordChunk = wordChunk ? `${wordChunk} ${word}` : word;
          } else {
            if (wordChunk) chunks.push(wordChunk.trim());
            wordChunk = word;
          }
        }
        currentChunk = wordChunk;
      } else {
        currentChunk = sentence;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Combine multiple WAV buffers into a single valid RIFF WAV buffer
 */
function combineWavBuffers(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) return Buffer.alloc(0);
  if (buffers.length === 1) return buffers[0];

  const pcmChunks: Buffer[] = [];
  let sampleRate = 24000;
  let numChannels = 1;
  let bitsPerSample = 16;

  for (const buf of buffers) {
    if (buf.length >= 44 && buf.toString("ascii", 0, 4) === "RIFF") {
      numChannels = buf.readUInt16LE(22);
      sampleRate = buf.readUInt32LE(24);
      bitsPerSample = buf.readUInt16LE(34);
      const dataSubchunkIndex = buf.indexOf("data");
      if (dataSubchunkIndex !== -1 && dataSubchunkIndex + 8 <= buf.length) {
        pcmChunks.push(buf.subarray(dataSubchunkIndex + 8));
      } else {
        pcmChunks.push(buf.subarray(44));
      }
    } else {
      pcmChunks.push(buf);
    }
  }

  const totalPcmLength = pcmChunks.reduce((acc, c) => acc + c.length, 0);
  const outHeader = Buffer.alloc(44);

  // RIFF header
  outHeader.write("RIFF", 0);
  outHeader.writeUInt32LE(36 + totalPcmLength, 4);
  outHeader.write("WAVE", 8);

  // fmt subchunk
  outHeader.write("fmt ", 12);
  outHeader.writeUInt32LE(16, 16);
  outHeader.writeUInt16LE(1, 20); // PCM format
  outHeader.writeUInt16LE(numChannels, 22);
  outHeader.writeUInt32LE(sampleRate, 24);
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  outHeader.writeUInt32LE(byteRate, 28);
  const blockAlign = (numChannels * bitsPerSample) / 8;
  outHeader.writeUInt16LE(blockAlign, 32);
  outHeader.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  outHeader.write("data", 36);
  outHeader.writeUInt32LE(totalPcmLength, 40);

  return Buffer.concat([outHeader, ...pcmChunks]);
}

export class InworldTtsProvider implements TextToSpeechProvider {
  id = "tts-inworld";
  name = "Inworld Voice Synthesis (inworld-tts-2)";

  /**
   * Synthesize text into high quality speech audio using Inworld's Synchronous TTS API
   */
  async synthesizeText(
    text: string,
    voiceName?: string,
    speed?: string
  ): Promise<{ audioBuffer: Buffer; mimeType: string }> {
    if (!text || typeof text !== "string" || !text.trim()) {
      throw new Error("Text is required for Inworld speech synthesis");
    }

    const trimmedText = text.trim();
    if (trimmedText.length > 5000) {
      throw new Error("Text exceeds maximum synthesis length of 5000 characters");
    }

    const apiKey = process.env.INWORLD_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "INWORLD_API_KEY is not configured. Please add your Inworld Basic API key to your environment variables."
      );
    }

    const voiceId = resolveInworldVoiceId(voiceName);
    const chunks = chunkTextForInworld(trimmedText, 1000);

    const audioBuffers: Buffer[] = [];
    for (const chunk of chunks) {
      const buffer = await this.callInworldApi(apiKey, chunk, voiceId);
      audioBuffers.push(buffer);
    }

    const finalBuffer = audioBuffers.length === 1 ? audioBuffers[0] : combineWavBuffers(audioBuffers);

    return {
      audioBuffer: finalBuffer,
      mimeType: "audio/wav",
    };
  }

  /**
   * Performs the synchronous HTTP POST to Inworld TTS
   */
  private async callInworldApi(apiKey: string, text: string, voiceId: string): Promise<Buffer> {
    const endpoint = "https://api.inworld.ai/tts/v1/voice";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${apiKey}`,
          "Content-Type": "application/json",
          Connection: "keep-alive",
        },
        body: JSON.stringify({
          text,
          voice_id: voiceId,
          model_id: "inworld-tts-2",
          audio_config: {
            audio_encoding: "LINEAR16",
            sample_rate_hertz: 24000,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          const raw = await response.text();
          errorData = { message: raw };
        }

        if (response.status === 403 && errorData?.message?.includes("scopes")) {
          throw new Error(
            "Inworld API authorization failed: Your API key does not have the 'Text-to-Speech' scope enabled. Please visit https://platform.inworld.ai/api-keys to generate or update your key with Text-to-Speech permissions."
          );
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error(
            `Inworld authentication failed (${response.status}): ${errorData?.message || "Invalid API key"}`
          );
        }

        throw new Error(
          `Inworld TTS error (${response.status}): ${errorData?.message || "Failed to generate speech"}`
        );
      }

      const json = await response.json();
      if (!json.audioContent) {
        throw new Error("Inworld TTS returned an empty audio response");
      }

      const audioBuffer = Buffer.from(json.audioContent, "base64");
      return audioBuffer;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Inworld TTS synthesis timed out after 30 seconds");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * Check Inworld TTS configuration status
 */
export async function checkInworldStatus(): Promise<{
  configured: boolean;
  model: string;
  error?: string;
}> {
  const apiKey = process.env.INWORLD_API_KEY?.trim();
  if (!apiKey) {
    return {
      configured: false,
      model: "inworld-tts-2",
      error: "INWORLD_API_KEY is not configured",
    };
  }

  return {
    configured: true,
    model: "inworld-tts-2",
  };
}

// Auto-register Inworld TTS provider
export const inworldTts = new InworldTtsProvider();
VoiceProviderRegistry.registerTTS(inworldTts);
