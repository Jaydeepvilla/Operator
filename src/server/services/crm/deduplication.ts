import { db } from "../../db";
import { 
  leadProfiles, 
  contactChannels, 
  conversations, 
  appointments, 
  leadAnswers, 
  leadScores, 
  auditLogs 
} from "../../db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { normalizePhoneNumber, normalizeEmail } from "@/lib/identity";
import { identityResolverService } from "../identity";

export interface DuplicateCandidateGroup {
  matchType: "phone" | "email" | "name";
  matchValue: string;
  profiles: Array<{
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    normalizedPhone?: string | null;
    normalizedEmail?: string | null;
    status: string | null;
    leadScore: number | null;
    createdAt: Date;
    channelsCount?: number;
  }>;
}

export function normalizePhone(rawPhone?: string | null, defaultCountry?: string | null): string | null {
  if (!rawPhone) return null;
  const res = normalizePhoneNumber(rawPhone, { defaultCountry });
  return res.success ? res.e164 : null;
}

export function normalizeEmailStr(rawEmail?: string | null): string | null {
  if (!rawEmail) return null;
  const res = normalizeEmail(rawEmail);
  return res.success ? res.normalizedEmail : null;
}

export { normalizeEmailStr as normalizeEmail };

export const crmDeduplicationService = {
  /**
   * Discovers potential duplicate lead profiles within an organization based on canonical phone or email.
   */
  async findDuplicateCandidates(organizationId: string): Promise<DuplicateCandidateGroup[]> {
    const orgCountry = await identityResolverService.getOrganizationCountry(organizationId);

    const allProfiles = await db
      .select()
      .from(leadProfiles)
      .where(eq(leadProfiles.organizationId, organizationId));

    const phoneGroups = new Map<string, typeof allProfiles>();
    const emailGroups = new Map<string, typeof allProfiles>();
    const nameGroups = new Map<string, typeof allProfiles>();

    for (const profile of allProfiles) {
      // 1. Group by normalized E.164 phone
      const cleanPhone = profile.normalizedPhone || normalizePhone(profile.phone, orgCountry);
      if (cleanPhone) {
        const existing = phoneGroups.get(cleanPhone) || [];
        existing.push(profile);
        phoneGroups.set(cleanPhone, existing);
      }

      // 2. Group by normalized email
      const cleanEmail = profile.normalizedEmail || normalizeEmailStr(profile.email);
      if (cleanEmail) {
        const existing = emailGroups.get(cleanEmail) || [];
        existing.push(profile);
        emailGroups.set(cleanEmail, existing);
      }

      // 3. Exact name match (only for specific non-generic full names)
      const cleanName = profile.name?.trim().toLowerCase();
      if (cleanName && cleanName.length > 3 && !cleanName.includes("contact") && cleanName !== "unknown" && cleanName !== "customer") {
        const existing = nameGroups.get(cleanName) || [];
        existing.push(profile);
        nameGroups.set(cleanName, existing);
      }
    }

    const candidateGroups: DuplicateCandidateGroup[] = [];

    // Aggregate phone matches
    for (const [phone, group] of phoneGroups.entries()) {
      if (group.length > 1) {
        candidateGroups.push({
          matchType: "phone",
          matchValue: phone,
          profiles: group.map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            normalizedPhone: p.normalizedPhone,
            normalizedEmail: p.normalizedEmail,
            status: p.status,
            leadScore: p.leadScore,
            createdAt: p.createdAt,
          })),
        });
      }
    }

    // Aggregate email matches
    for (const [email, group] of emailGroups.entries()) {
      if (group.length > 1) {
        candidateGroups.push({
          matchType: "email",
          matchValue: email,
          profiles: group.map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            normalizedPhone: p.normalizedPhone,
            normalizedEmail: p.normalizedEmail,
            status: p.status,
            leadScore: p.leadScore,
            createdAt: p.createdAt,
          })),
        });
      }
    }

    return candidateGroups;
  },

  /**
   * Resolves or creates a lead profile with proactive omnichannel deduplication lookup.
   */
  async resolveUnifiedProfile(params: {
    organizationId: string;
    channelType: string;
    senderUserId: string;
    senderName?: string | null;
  }): Promise<{ leadProfileId: string; isNew: boolean }> {
    const res = await identityResolverService.resolveCustomerIdentity({
      organizationId: params.organizationId,
      channel: params.channelType,
      channelUserId: params.senderUserId,
      name: params.senderName,
    });

    return { leadProfileId: res.leadProfileId, isNew: res.isNew };
  },

  /**
   * Transactionally merges multiple duplicate source profiles into a single target master profile.
   */
  async mergeProfiles(
    organizationId: string,
    targetProfileId: string,
    sourceProfileIds: string[],
    userId?: string
  ): Promise<{ success: boolean; mergedCount: number }> {
    const validSourceIds = sourceProfileIds.filter((id) => id && id !== targetProfileId);
    if (validSourceIds.length === 0) {
      return { success: true, mergedCount: 0 };
    }

    const orgCountry = await identityResolverService.getOrganizationCountry(organizationId);

    return await db.transaction(async (tx) => {
      // 1. Fetch target profile
      const [target] = await tx
        .select()
        .from(leadProfiles)
        .where(
          and(
            eq(leadProfiles.organizationId, organizationId),
            eq(leadProfiles.id, targetProfileId)
          )
        )
        .limit(1);

      if (!target) throw new Error("Target master profile not found.");

      // 2. Fetch source profiles
      const sources = await tx
        .select()
        .from(leadProfiles)
        .where(
          and(
            eq(leadProfiles.organizationId, organizationId),
            inArray(leadProfiles.id, validSourceIds)
          )
        );

      if (sources.length === 0) return { success: true, mergedCount: 0 };

      // 3. Merge profile attributes (fill missing phone, email, notes, score)
      let updatedPhone = target.phone;
      let updatedNormalizedPhone = target.normalizedPhone;
      let updatedEmail = target.email;
      let updatedNormalizedEmail = target.normalizedEmail;
      let updatedName = target.name;
      let highestScore = target.leadScore || 0;
      let combinedConversations = target.conversationCount || 0;

      for (const src of sources) {
        if (!updatedPhone && src.phone) {
          updatedPhone = src.phone;
          const pRes = normalizePhoneNumber(src.phone, { organizationCountry: orgCountry });
          if (pRes.success) updatedNormalizedPhone = pRes.e164;
        }
        if (!updatedEmail && src.email) {
          updatedEmail = src.email;
          const eRes = normalizeEmail(src.email);
          if (eRes.success) updatedNormalizedEmail = eRes.normalizedEmail;
        }
        if ((!updatedName || updatedName.toLowerCase().includes("contact") || updatedName.toLowerCase().includes("user")) && src.name) {
          updatedName = src.name;
        }
        if ((src.leadScore || 0) > highestScore) highestScore = src.leadScore || 0;
        combinedConversations += src.conversationCount || 0;
      }

      await tx
        .update(leadProfiles)
        .set({
          name: updatedName,
          phone: updatedPhone,
          normalizedPhone: updatedNormalizedPhone || null,
          email: updatedEmail,
          normalizedEmail: updatedNormalizedEmail || null,
          leadScore: highestScore,
          conversationCount: combinedConversations,
          updatedAt: new Date(),
        })
        .where(eq(leadProfiles.id, targetProfileId));

      // 4. Re-parent child relationships to target profile
      for (const srcId of validSourceIds) {
        // Conversations
        await tx
          .update(conversations)
          .set({ leadProfileId: targetProfileId })
          .where(
            and(
              eq(conversations.organizationId, organizationId),
              eq(conversations.leadProfileId, srcId)
            )
          );

        // Appointments
        await tx
          .update(appointments)
          .set({ leadProfileId: targetProfileId })
          .where(
            and(
              eq(appointments.organizationId, organizationId),
              eq(appointments.leadProfileId, srcId)
            )
          );

        // Contact Channels (Re-parent unique channels)
        const srcChannels = await tx
          .select()
          .from(contactChannels)
          .where(
            and(
              eq(contactChannels.organizationId, organizationId),
              eq(contactChannels.contactId, srcId)
            )
          );

        for (const chan of srcChannels) {
          const [exists] = await tx
            .select()
            .from(contactChannels)
            .where(
              and(
                eq(contactChannels.organizationId, organizationId),
                eq(contactChannels.contactId, targetProfileId),
                eq(contactChannels.channelType, chan.channelType),
                eq(contactChannels.channelUserId, chan.channelUserId)
              )
            );

          if (!exists) {
            await tx
              .update(contactChannels)
              .set({ contactId: targetProfileId })
              .where(eq(contactChannels.id, chan.id));
          } else {
            await tx.delete(contactChannels).where(eq(contactChannels.id, chan.id));
          }
        }

        // Lead Answers
        await tx
          .update(leadAnswers)
          .set({ leadProfileId: targetProfileId })
          .where(
            and(
              eq(leadAnswers.organizationId, organizationId),
              eq(leadAnswers.leadProfileId, srcId)
            )
          );

        // Lead Scores
        await tx
          .update(leadScores)
          .set({ leadProfileId: targetProfileId })
          .where(
            and(
              eq(leadScores.organizationId, organizationId),
              eq(leadScores.leadProfileId, srcId)
            )
          );

        // Delete merged source profiles
        await tx
          .delete(leadProfiles)
          .where(
            and(
              eq(leadProfiles.organizationId, organizationId),
              eq(leadProfiles.id, srcId)
            )
          );
      }

      // 5. Log audit trail
      await tx.insert(auditLogs).values({
        organizationId,
        userId: userId || null,
        action: "crm_profiles_merged",
        resource: "lead_profiles",
        resourceId: targetProfileId,
        metadata: {
          targetProfileId,
          mergedSourceIds: validSourceIds,
          sourceCount: validSourceIds.length,
        },
      });

      return { success: true, mergedCount: validSourceIds.length };
    });
  },
};
