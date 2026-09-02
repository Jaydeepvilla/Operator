import { eq, desc, and, or, ilike, sql } from "drizzle-orm";
import { db } from "../db";
import { leadProfiles, leadAnswers, leadScores } from "../db/schema";
import { normalizePhoneNumber, normalizeEmail } from "@/lib/identity";

export interface NewLeadProfile {
  organizationId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  normalizedPhone?: string | null;
  normalizedEmail?: string | null;
  status?: string;
  leadScore?: number;
  summary?: string | null;
  lifetimeValue?: number;
  tags?: any;
  notes?: string | null;
  conversationCount?: number;
}

export interface NewLeadAnswer {
  organizationId: string;
  leadProfileId: string;
  questionId?: string | null;
  questionText: string;
  answerValue: string;
}

export interface NewLeadScore {
  organizationId: string;
  leadProfileId: string;
  score: number;
  breakdown: Record<string, any>;
}

export const leadsRepository = {
  async findProfileById(id: string) {
    const [profile] = await db
      .select()
      .from(leadProfiles)
      .where(eq(leadProfiles.id, id));
    return profile || null;
  },

  async findByNormalizedPhone(organizationId: string, normalizedPhone: string) {
    if (!normalizedPhone) return null;
    const [profile] = await db
      .select()
      .from(leadProfiles)
      .where(
        and(
          eq(leadProfiles.organizationId, organizationId),
          eq(leadProfiles.normalizedPhone, normalizedPhone)
        )
      );
    return profile || null;
  },

  async findByNormalizedEmail(organizationId: string, normalizedEmail: string) {
    if (!normalizedEmail) return null;
    const [profile] = await db
      .select()
      .from(leadProfiles)
      .where(
        and(
          eq(leadProfiles.organizationId, organizationId),
          eq(leadProfiles.normalizedEmail, normalizedEmail)
        )
      );
    return profile || null;
  },

  async listProfiles(organizationId: string) {
    return db
      .select()
      .from(leadProfiles)
      .where(eq(leadProfiles.organizationId, organizationId))
      .orderBy(desc(leadProfiles.createdAt));
  },

  async searchProfiles(organizationId: string, rawQuery: string) {
    if (!rawQuery || !rawQuery.trim()) {
      return this.listProfiles(organizationId);
    }

    const trimmed = rawQuery.trim();
    const phoneNorm = normalizePhoneNumber(trimmed);
    const emailNorm = normalizeEmail(trimmed);

    const conditions = [
      ilike(leadProfiles.name, `%${trimmed}%`),
      ilike(leadProfiles.phone, `%${trimmed}%`),
      ilike(leadProfiles.email, `%${trimmed}%`),
    ];

    if (phoneNorm.success) {
      conditions.push(eq(leadProfiles.normalizedPhone, phoneNorm.e164));
      conditions.push(ilike(leadProfiles.normalizedPhone, `%${phoneNorm.nationalNumber}%`));
    }

    if (emailNorm.success) {
      conditions.push(eq(leadProfiles.normalizedEmail, emailNorm.normalizedEmail));
    }

    return db
      .select()
      .from(leadProfiles)
      .where(
        and(
          eq(leadProfiles.organizationId, organizationId),
          or(...conditions)
        )
      )
      .orderBy(desc(leadProfiles.createdAt));
  },

  async createProfile(profile: NewLeadProfile) {
    let normPhone = profile.normalizedPhone;
    if (!normPhone && profile.phone) {
      const pRes = normalizePhoneNumber(profile.phone);
      if (pRes.success) normPhone = pRes.e164;
    }

    let normEmail = profile.normalizedEmail;
    if (!normEmail && profile.email) {
      const eRes = normalizeEmail(profile.email);
      if (eRes.success) normEmail = eRes.normalizedEmail;
    }

    const [newProfile] = await db
      .insert(leadProfiles)
      .values({
        ...profile,
        normalizedPhone: normPhone || null,
        normalizedEmail: normEmail || null,
      })
      .returning();
    return newProfile;
  },

  async updateProfile(id: string, updates: Partial<NewLeadProfile>) {
    const payload: any = { ...updates, updatedAt: new Date() };

    if (updates.phone !== undefined) {
      if (updates.phone) {
        const pRes = normalizePhoneNumber(updates.phone);
        payload.normalizedPhone = pRes.success ? pRes.e164 : null;
      } else {
        payload.normalizedPhone = null;
      }
    }

    if (updates.email !== undefined) {
      if (updates.email) {
        const eRes = normalizeEmail(updates.email);
        payload.normalizedEmail = eRes.success ? eRes.normalizedEmail : null;
      } else {
        payload.normalizedEmail = null;
      }
    }

    const [updated] = await db
      .update(leadProfiles)
      .set(payload)
      .where(eq(leadProfiles.id, id))
      .returning();
    return updated;
  },

  async deleteProfile(id: string) {
    await db.delete(leadProfiles).where(eq(leadProfiles.id, id));
  },

  // Answers CRUD
  async listAnswers(leadProfileId: string) {
    return db
      .select()
      .from(leadAnswers)
      .where(eq(leadAnswers.leadProfileId, leadProfileId))
      .orderBy(leadAnswers.createdAt);
  },

  async createAnswer(answer: NewLeadAnswer) {
    const [newAnswer] = await db.insert(leadAnswers).values(answer).returning();
    return newAnswer;
  },

  async upsertAnswer(answer: NewLeadAnswer) {
    const [existing] = await db
      .select()
      .from(leadAnswers)
      .where(
        and(
          eq(leadAnswers.leadProfileId, answer.leadProfileId),
          eq(leadAnswers.questionText, answer.questionText)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(leadAnswers)
        .set({
          answerValue: answer.answerValue,
          updatedAt: new Date(),
        })
        .where(eq(leadAnswers.id, existing.id))
        .returning();
      return updated;
    } else {
      return this.createAnswer(answer);
    }
  },

  // Scores CRUD
  async listScores(leadProfileId: string) {
    return db
      .select()
      .from(leadScores)
      .where(eq(leadScores.leadProfileId, leadProfileId))
      .orderBy(desc(leadScores.createdAt));
  },

  async createScore(score: NewLeadScore) {
    const [newScore] = await db.insert(leadScores).values(score).returning();
    await this.updateProfile(score.leadProfileId, { leadScore: score.score });
    return newScore;
  },
};
