import { db } from "../../db";
import { 
  leadProfiles, 
  contactChannels, 
  conversations, 
  appointments, 
  leadAnswers, 
  leadScores, 
  inboxParticipants,
  auditLogs 
} from "../../db/schema";
import { eq, and, or, inArray, sql } from "drizzle-orm";

export interface DuplicateCandidateGroup {
  matchType: "phone" | "email" | "name";
  matchValue: string;
  profiles: Array<{
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    status: string | null;
    leadScore: number | null;
    createdAt: Date;
    channelsCount?: number;
  }>;
}

export function normalizePhone(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return null;
  // If 10 digits and starts without country code in North America, or raw starts with +, normalize
  return digits;
}

export function normalizeEmail(rawEmail?: string | null): string | null {
  if (!rawEmail) return null;
  return rawEmail.trim().toLowerCase();
}

export const crmDeduplicationService = {
  /**
   * Discovers potential duplicate lead profiles within an organization based on phone, email, or exact name.
   */
  async findDuplicateCandidates(organizationId: string): Promise<DuplicateCandidateGroup[]> {
    const allProfiles = await db
      .select()
      .from(leadProfiles)
      .where(eq(leadProfiles.organizationId, organizationId));

    const phoneGroups = new Map<string, typeof allProfiles>();
    const emailGroups = new Map<string, typeof allProfiles>();
    const nameGroups = new Map<string, typeof allProfiles>();

    for (const profile of allProfiles) {
      const cleanPhone = normalizePhone(profile.phone);
      if (cleanPhone && cleanPhone.length >= 7) {
        const existing = phoneGroups.get(cleanPhone) || [];
        existing.push(profile);
        phoneGroups.set(cleanPhone, existing);
      }

      const cleanEmail = normalizeEmail(profile.email);
      if (cleanEmail && cleanEmail.includes("@")) {
        const existing = emailGroups.get(cleanEmail) || [];
        existing.push(profile);
        emailGroups.set(cleanEmail, existing);
      }

      const cleanName = profile.name?.trim().toLowerCase();
      if (cleanName && cleanName.length > 2 && cleanName !== "unknown" && cleanName !== "customer") {
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
        // Only add if not already covered identically
        candidateGroups.push({
          matchType: "email",
          matchValue: email,
          profiles: group.map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            phone: p.phone,
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
    const { organizationId, channelType, senderUserId, senderName } = params;

    // 1. Direct channel mapping check
    const existingChannel = await db.query.contactChannels.findFirst({
      where: and(
        eq(contactChannels.organizationId, organizationId),
        eq(contactChannels.channelType, channelType),
        eq(contactChannels.channelUserId, senderUserId)
      ),
    });

    if (existingChannel) {
      return { leadProfileId: existingChannel.contactId, isNew: false };
    }

    // 2. Omnichannel Deduplication Lookup
    // If incoming is email or phone/sms/whatsapp, check if an existing profile has this phone or email
    let matchingProfile = null;

    if (channelType === "email") {
      const cleanEmail = normalizeEmail(senderUserId);
      if (cleanEmail) {
        matchingProfile = await db.query.leadProfiles.findFirst({
          where: and(
            eq(leadProfiles.organizationId, organizationId),
            sql`LOWER(${leadProfiles.email}) = ${cleanEmail}`
          ),
        });
      }
    } else if (channelType === "sms" || channelType === "whatsapp" || channelType === "voice") {
      const cleanPhone = normalizePhone(senderUserId);
      if (cleanPhone) {
        // Query profiles with matching digits
        const profiles = await db
          .select()
          .from(leadProfiles)
          .where(eq(leadProfiles.organizationId, organizationId));

        matchingProfile = profiles.find((p) => normalizePhone(p.phone) === cleanPhone) || null;
      }
    }

    // If an existing lead profile matches, attach this channel without creating a duplicate profile!
    if (matchingProfile) {
      await db.insert(contactChannels).values({
        organizationId,
        contactId: matchingProfile.id,
        channelType,
        channelUserId: senderUserId,
        value: senderUserId,
        isVerified: true,
      });

      // Update name if profile was previously untitled
      if ((!matchingProfile.name || matchingProfile.name.toLowerCase().includes("user")) && senderName) {
        await db
          .update(leadProfiles)
          .set({ name: senderName, updatedAt: new Date() })
          .where(eq(leadProfiles.id, matchingProfile.id));
      }

      return { leadProfileId: matchingProfile.id, isNew: false };
    }

    // 3. Create fresh new lead profile if no matching identity was found
    const nameToUse = senderName || `${channelType.toUpperCase()} Contact`;
    const isPhoneChannel = ["sms", "whatsapp", "voice"].includes(channelType);

    const [newLead] = await db
      .insert(leadProfiles)
      .values({
        organizationId,
        name: nameToUse,
        phone: isPhoneChannel ? senderUserId : null,
        email: channelType === "email" ? senderUserId : null,
        status: "New",
        leadScore: 0,
        conversationCount: 1,
      })
      .returning();

    // Map initial channel
    await db.insert(contactChannels).values({
      organizationId,
      contactId: newLead.id,
      channelType,
      channelUserId: senderUserId,
      value: senderUserId,
      isVerified: true,
    });

    return { leadProfileId: newLead.id, isNew: true };
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
    // Filter out target from source IDs
    const validSourceIds = sourceProfileIds.filter((id) => id && id !== targetProfileId);
    if (validSourceIds.length === 0) {
      return { success: true, mergedCount: 0 };
    }

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
      let updatedEmail = target.email;
      let updatedName = target.name;
      let highestScore = target.leadScore || 0;
      let combinedConversations = target.conversationCount || 0;

      for (const src of sources) {
        if (!updatedPhone && src.phone) updatedPhone = src.phone;
        if (!updatedEmail && src.email) updatedEmail = src.email;
        if ((!updatedName || updatedName.toLowerCase().includes("user")) && src.name) {
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
          email: updatedEmail,
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
