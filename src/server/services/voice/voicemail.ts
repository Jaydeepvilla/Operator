import { db } from "../../db";
import { voicemailMessages, callSessions, leadProfiles, callEvents } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { VoiceProviderRegistry } from "./types";
import { llmRegistry } from "../llm";
import { identityResolverService } from "../identity";

export const voicemailProcessor = {
  /**
   * Registers a new voicemail recording, schedules transcription, and links callback leads.
   */
  async processVoicemail(options: {
    organizationId: string;
    sessionId: string;
    recordingUrl: string;
  }) {
    const { organizationId, sessionId, recordingUrl } = options;

    try {
      // 1. Create voicemail record
      const [voicemail] = await db
        .insert(voicemailMessages)
        .values({
          organizationId,
          sessionId,
          recordingUrl,
          callbackStatus: "pending",
        })
        .returning();

      // Audit log event
      await db.insert(callEvents).values({
        organizationId,
        sessionId,
        eventType: "voicemail-recorded",
        payload: { voicemailId: voicemail.id, recordingUrl },
      });

      // 2. Fetch Call Session to get Caller Number
      const session = await db.query.callSessions.findFirst({
        where: eq(callSessions.id, sessionId),
      });

      const callerNumber = session?.callerNumber || "unknown";

      // 3. Process Speech-To-Text (STT) for Voicemail
      const stt = VoiceProviderRegistry.getSTT("stt-deepgram");
      let transcriptText = "";

      if (stt) {
        try {
          const res = await fetch(recordingUrl);
          if (!res.ok) {
            throw new Error(`Failed to fetch audio from URL: ${recordingUrl} (HTTP ${res.status})`);
          }
          const audioBuffer = Buffer.from(await res.arrayBuffer());
          const sttResult = await stt.processAudioStream(audioBuffer);
          transcriptText = sttResult.text || "Voicemail audio was silent.";
        } catch (sttErr) {
          console.error("[Voicemail Processor] STT translation failed:", sttErr);
          transcriptText = "Voicemail audio translation failed.";
        }
      } else {
        transcriptText = "STT provider not configured.";
      }

      // 4. Generate Voicemail Summary using LLM
      let summaryText = `Caller left a voicemail callback request. Caller number: ${callerNumber}`;
      if (transcriptText.trim() && transcriptText !== "Voicemail audio translation failed." && transcriptText !== "STT provider not configured.") {
        try {
          const llm = llmRegistry.getProvider();
          const response = await llm.generateCompletion([
            {
              role: "system",
              content: "You are a voicemail summary assistant. Briefly summarize this voicemail transcript in 1 short sentence."
            },
            {
              role: "user",
              content: `Voicemail Transcript:\n${transcriptText}`
            }
          ]);
          if (response.content.trim()) {
            summaryText = response.content.trim();
          }
        } catch (llmErr) {
          console.error("[Voicemail Processor] Failed to generate summary via LLM:", llmErr);
        }
      }

      // Update Voicemail Message with results
      await db
        .update(voicemailMessages)
        .set({
          transcriptText,
          summaryText,
        })
        .where(eq(voicemailMessages.id, voicemail.id));

      // 5. Update or Create Lead Profile via Canonical Identity Resolver
      if (callerNumber && callerNumber !== "unknown") {
        const { leadProfileId, profile } = await identityResolverService.resolveCustomerIdentity({
          organizationId,
          channel: "voice",
          channelUserId: callerNumber,
          phone: callerNumber,
          name: `Voicemail Caller (${callerNumber.slice(-4)})`,
        });

        await db
          .update(leadProfiles)
          .set({
            notes: `${profile.notes || ""}\n\n[Voicemail Callback Request]: ${summaryText}\nTranscript: ${transcriptText}`.trim(),
            status: "New",
            updatedAt: new Date(),
          })
          .where(eq(leadProfiles.id, leadProfileId));
      }

      return {
        voicemailId: voicemail.id,
        transcriptText,
        summaryText,
      };
    } catch (e) {
      console.error("[Voicemail Processor] Failed to process voicemail:", e);
      throw e;
    }
  },
};
