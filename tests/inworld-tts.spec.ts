import { test, expect } from "@playwright/test";
import { VoiceProviderRegistry } from "../src/server/services/voice/types";
import {
  InworldTtsProvider,
  resolveInworldVoiceId,
  chunkTextForInworld,
  checkInworldStatus,
  INWORLD_VOICES,
  INWORLD_VOICE_IDS,
} from "../src/server/services/voice/inworld";

test.describe("Inworld TTS Provider Suite", () => {
  test("1. Voice Registry registers Inworld as a valid TTS provider", async () => {
    const inworldTts = VoiceProviderRegistry.getTTS("tts-inworld");
    expect(inworldTts).toBeDefined();
    expect(inworldTts?.id).toBe("tts-inworld");
    expect(inworldTts?.name).toContain("Inworld");
  });

  test("2. Voice resolution accurately maps voices with fallback", () => {
    expect(resolveInworldVoiceId("Ashley")).toBe("Ashley");
    expect(resolveInworldVoiceId("ashley")).toBe("Ashley");
    expect(resolveInworldVoiceId("Dennis")).toBe("Dennis");
    expect(resolveInworldVoiceId("sarah")).toBe("Sarah");
    expect(resolveInworldVoiceId("Luna")).toBe("Luna");
    expect(resolveInworldVoiceId("non_existent_voice")).toBe("Ashley");
    expect(resolveInworldVoiceId(undefined)).toBe("Ashley");
  });

  test("3. Text validation rejects invalid inputs", async () => {
    const provider = new InworldTtsProvider();

    await expect(provider.synthesizeText("")).rejects.toThrow("Text is required");
    await expect(provider.synthesizeText("   \n\t  ")).rejects.toThrow("Text is required");

    const hugeText = "A".repeat(5001);
    await expect(provider.synthesizeText(hugeText)).rejects.toThrow(
      "Text exceeds maximum synthesis length"
    );
  });

  test("4. Text chunking preserves sentence order and natural boundaries", () => {
    const longText =
      "Good morning, thank you for calling Operator. We provide next-generation AI receptionist services. How can I assist you with your booking or inquiry today?";

    const chunks = chunkTextForInworld(longText, 60);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join(" ")).toContain("Good morning, thank you for calling Operator.");
    expect(chunks.join(" ")).toContain("How can I assist you with your booking or inquiry today?");
  });

  test("5. Voice Catalog contains expected studio voices", () => {
    expect(INWORLD_VOICE_IDS).toContain("Ashley");
    expect(INWORLD_VOICE_IDS).toContain("Dennis");
    expect(INWORLD_VOICE_IDS).toContain("Sarah");
    expect(INWORLD_VOICE_IDS).toContain("Luna");
    expect(INWORLD_VOICES.length).toBeGreaterThanOrEqual(10);
  });

  test("6. Health check reports configuration status", async () => {
    const status = await checkInworldStatus();
    expect(status.model).toBe("inworld-tts-2");
    if (process.env.INWORLD_API_KEY) {
      expect(status.configured).toBe(true);
    }
  });
});
