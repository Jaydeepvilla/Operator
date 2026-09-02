import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import {
  phoneNumbers,
  callSessions,
  callEvents,
  callTranscripts,
  callSummaries,
  callTransfers,
  callRoutingRules,
  voiceSettings,
  voiceAnalytics,
  voicemailMessages,
} from "../db/schema";

export const voiceRepository = {
  // --- Phone Numbers ---
  async getPhoneNumbers(organizationId: string) {
    return db
      .select()
      .from(phoneNumbers)
      .where(eq(phoneNumbers.organizationId, organizationId))
      .orderBy(desc(phoneNumbers.createdAt));
  },

  async registerPhoneNumber(organizationId: string, data: { phoneNumber: string; type: string; name: string }) {
    const [inserted] = await db
      .insert(phoneNumbers)
      .values({
        organizationId,
        phoneNumber: data.phoneNumber,
        type: data.type,
        name: data.name,
        status: "active",
        isRecordingEnabled: true,
      })
      .returning();
    return inserted;
  },

  async updatePhoneNumberRecording(phoneNumberId: string, organizationId: string, isEnabled: boolean) {
    const [updated] = await db
      .update(phoneNumbers)
      .set({
        isRecordingEnabled: isEnabled,
        updatedAt: new Date(),
      })
      .where(and(eq(phoneNumbers.id, phoneNumberId), eq(phoneNumbers.organizationId, organizationId)))
      .returning();
    return updated;
  },

  // --- Call Sessions ---
  async getCallSessions(organizationId: string, limit = 50, offset = 0) {
    return db
      .select()
      .from(callSessions)
      .where(eq(callSessions.organizationId, organizationId))
      .orderBy(desc(callSessions.createdAt))
      .limit(limit)
      .offset(offset);
  },

  async getCallSessionDetails(sessionId: string, organizationId?: string) {
    const session = await db.query.callSessions.findFirst({
      where: organizationId
        ? and(eq(callSessions.id, sessionId), eq(callSessions.organizationId, organizationId))
        : eq(callSessions.id, sessionId),
      with: {
        transcripts: true,
        events: true,
        recording: true,
        summary: true,
        transfers: true,
      },
    });
    return session || null;
  },

  // --- Voicemail Inbox ---
  async getVoicemails(organizationId: string) {
    return db
      .select()
      .from(voicemailMessages)
      .where(eq(voicemailMessages.organizationId, organizationId))
      .orderBy(desc(voicemailMessages.createdAt));
  },

  async updateVoicemailStatus(voicemailId: string, organizationId: string, status: "pending" | "called" | "no-action") {
    const [updated] = await db
      .update(voicemailMessages)
      .set({
        callbackStatus: status,
        callbackTime: status === "called" ? new Date() : null,
      })
      .where(and(eq(voicemailMessages.id, voicemailId), eq(voicemailMessages.organizationId, organizationId)))
      .returning();
    return updated;
  },

  // --- Voice Settings ---
  async getVoiceSettings(organizationId: string) {
    const [settings] = await db
      .select()
      .from(voiceSettings)
      .where(eq(voiceSettings.organizationId, organizationId));
    return settings || null;
  },

  async upsertVoiceSettings(organizationId: string, data: Partial<typeof voiceSettings.$inferInsert>) {
    const existing = await this.getVoiceSettings(organizationId);
    if (existing) {
      const [updated] = await db
        .update(voiceSettings)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(voiceSettings.organizationId, organizationId))
        .returning();
      return updated;
    } else {
      const [inserted] = await db
        .insert(voiceSettings)
        .values({
          ...data,
          organizationId,
          voiceName: data.voiceName || "Rachel",
          speakingSpeed: data.speakingSpeed || "1.0",
          greetingMessage: data.greetingMessage || "Hello! Thanks for calling. How can I assist you today?",
          businessHoursMode: data.businessHoursMode || "ai-only",
        } as typeof voiceSettings.$inferInsert)
        .returning();
      return inserted;
    }
  },

  // --- Call Routing Rules ---
  async getRoutingRules(organizationId: string) {
    return db
      .select()
      .from(callRoutingRules)
      .where(eq(callRoutingRules.organizationId, organizationId))
      .orderBy(desc(callRoutingRules.priority));
  },

  async createRoutingRule(
    organizationId: string,
    data: Omit<typeof callRoutingRules.$inferInsert, "id" | "organizationId" | "createdAt">
  ) {
    const [inserted] = await db
      .insert(callRoutingRules)
      .values({
        organizationId,
        ruleName: data.ruleName,
        triggerType: data.triggerType,
        routingAction: data.routingAction,
        targetId: data.targetId,
        isActive: data.isActive ?? true,
        priority: data.priority ?? 0,
      })
      .returning();
    return inserted;
  },

  async updateRoutingRule(ruleId: string, organizationId: string, data: Partial<typeof callRoutingRules.$inferInsert>) {
    const [updated] = await db
      .update(callRoutingRules)
      .set(data)
      .where(and(eq(callRoutingRules.id, ruleId), eq(callRoutingRules.organizationId, organizationId)))
      .returning();
    return updated;
  },

  async deleteRoutingRule(ruleId: string, organizationId: string) {
    await db
      .delete(callRoutingRules)
      .where(and(eq(callRoutingRules.id, ruleId), eq(callRoutingRules.organizationId, organizationId)));
    return true;
  },

  // --- Voice Analytics ---
  async getAnalytics(organizationId: string, limit = 30) {
    return db
      .select()
      .from(voiceAnalytics)
      .where(eq(voiceAnalytics.organizationId, organizationId))
      .orderBy(desc(voiceAnalytics.dateStr))
      .limit(limit);
  },

  async updateAnalyticsDaily(
    organizationId: string,
    dateStr: string,
    data: {
      callsAnswered?: number;
      callsMissed?: number;
      bookingsCount?: number;
      transfersCount?: number;
      averageDurationSeconds?: number;
      csatAverage?: string;
    }
  ) {
    const [existing] = await db
      .select()
      .from(voiceAnalytics)
      .where(and(eq(voiceAnalytics.organizationId, organizationId), eq(voiceAnalytics.dateStr, dateStr)));

    if (existing) {
      const [updated] = await db
        .update(voiceAnalytics)
        .set({
          callsAnswered: data.callsAnswered !== undefined ? existing.callsAnswered + data.callsAnswered : undefined,
          callsMissed: data.callsMissed !== undefined ? existing.callsMissed + data.callsMissed : undefined,
          bookingsCount: data.bookingsCount !== undefined ? existing.bookingsCount + data.bookingsCount : undefined,
          transfersCount: data.transfersCount !== undefined ? existing.transfersCount + data.transfersCount : undefined,
          averageDurationSeconds: data.averageDurationSeconds !== undefined ? data.averageDurationSeconds : undefined,
          csatAverage: data.csatAverage !== undefined ? data.csatAverage : undefined,
        })
        .where(eq(voiceAnalytics.id, existing.id))
        .returning();
      return updated;
    } else {
      const [inserted] = await db
        .insert(voiceAnalytics)
        .values({
          organizationId,
          dateStr,
          callsAnswered: data.callsAnswered || 0,
          callsMissed: data.callsMissed || 0,
          bookingsCount: data.bookingsCount || 0,
          transfersCount: data.transfersCount || 0,
          averageDurationSeconds: data.averageDurationSeconds || 0,
          csatAverage: data.csatAverage || "5.0",
        })
        .returning();
      return inserted;
    }
  },
};
