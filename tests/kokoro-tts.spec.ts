import { test, expect } from "@playwright/test";
import { kokoroTts, resolveKokoroVoiceId, chunkTextForTTS, KOKORO_VOICES, checkKokoroStatus } from "@/server/services/voice/kokoro";
import { VoiceProviderRegistry } from "@/server/services/voice/types";

test.describe("Kokoro TTS Production Engine", () => {
  test("1. Voice Registry has Kokoro registered as sole TTS provider", async () => {
    const tts = VoiceProviderRegistry.getTTS("tts-kokoro");
    expect(tts).toBeDefined();
    expect(tts?.id).toBe("tts-kokoro");
    expect(tts?.name).toContain("Kokoro");

    // ElevenLabs provider must NOT exist in the registry
    const elevenlabs = VoiceProviderRegistry.getTTS("tts-elevenlabs");
    expect(elevenlabs).toBeUndefined();
  });

  test("2. Voice Resolution maps legacy IDs and resolves Kokoro IDs", async () => {
    // Direct matches
    expect(resolveKokoroVoiceId("af_heart")).toBe("af_heart");
    expect(resolveKokoroVoiceId("am_adam")).toBe("am_adam");
    expect(resolveKokoroVoiceId("bf_emma")).toBe("bf_emma");
    expect(resolveKokoroVoiceId("bm_george")).toBe("bm_george");

    // Legacy voice mapping
    expect(resolveKokoroVoiceId("Rachel")).toBe("af_heart");
    expect(resolveKokoroVoiceId("Drew")).toBe("am_adam");
    expect(resolveKokoroVoiceId("Bella")).toBe("af_bella");
    expect(resolveKokoroVoiceId("Clyde")).toBe("bm_george");
    expect(resolveKokoroVoiceId("Dom")).toBe("am_onyx");
    expect(resolveKokoroVoiceId("Jessica")).toBe("af_jessica");
    expect(resolveKokoroVoiceId("Ava")).toBe("af_heart");

    // Graceful fallback for non-existent / empty voices
    expect(resolveKokoroVoiceId("NonExistentVoice")).toBe("af_heart");
    expect(resolveKokoroVoiceId("")).toBe("af_heart");
    expect(resolveKokoroVoiceId(null)).toBe("af_heart");
  });

  test("3. Text validation rejects empty, whitespace, and overlength inputs", async () => {
    // Empty string
    await expect(kokoroTts.synthesizeText("")).rejects.toThrow(/empty or whitespace/i);
    // Whitespace string
    await expect(kokoroTts.synthesizeText("   \t\n  ")).rejects.toThrow(/empty or whitespace/i);
    // Overlength string (>5000 characters)
    const longString = "A".repeat(5001);
    await expect(kokoroTts.synthesizeText(longString)).rejects.toThrow(/maximum permitted length/i);
  });

  test("4. Text chunking preserves word boundaries and sentence order", async () => {
    const text = "First sentence here. Second sentence follows. Third sentence concludes the test.";
    const chunks = chunkTextForTTS(text, 35);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toContain("First sentence");
    expect(chunks[chunks.length - 1]).toContain("Third sentence");
  });

  test("5. Real Kokoro TTS generates valid WAV audio end-to-end", async () => {
    const text = "Hello! Operator AI voice synthesis is now powered by Kokoro.";
    const result = await kokoroTts.synthesizeText(text, "af_heart", "1.0");

    expect(result.mimeType).toBe("audio/wav");
    expect(result.audioBuffer).toBeDefined();
    expect(result.audioBuffer.length).toBeGreaterThan(1000);

    // Verify RIFF and WAVE magic headers
    const riff = result.audioBuffer.subarray(0, 4).toString("ascii");
    const wave = result.audioBuffer.subarray(8, 12).toString("ascii");
    expect(riff).toBe("RIFF");
    expect(wave).toBe("WAVE");
  });

  test("6. Health check reports Kokoro TTS readiness", async () => {
    const status = await checkKokoroStatus();
    expect(status.ready).toBe(true);
    expect(status.provider).toBeDefined();
    expect(status.model).toBeDefined();
  });
});
