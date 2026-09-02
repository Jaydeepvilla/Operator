import { db } from "../../db";
import { leadProfiles, contactChannels, businessLocalization, organizations } from "../../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { normalizePhoneNumber, normalizeEmail } from "@/lib/identity";

export interface ResolveIdentityInput {
  organizationId: string;
  channel?: string; // 'whatsapp' | 'sms' | 'voice' | 'email' | 'widget' | 'crm' | 'appointment' | 'import'
  channelUserId?: string; // external identifier (e.g. sender phone, WA ID, email)
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  defaultCountry?: string | null;
  metadata?: Record<string, any>;
}

export type IdentityMatchType = "channel_mapping" | "phone_match" | "email_match" | "created";

export interface ResolveIdentityResult {
  leadProfileId: string;
  isNew: boolean;
  profile: any;
  matchType: IdentityMatchType;
  normalizedPhone?: string | null;
  normalizedEmail?: string | null;
}

export const identityResolverService = {
  /**
   * Resolves or retrieves organization country context.
   */
  async getOrganizationCountry(organizationId: string): Promise<string> {
    try {
      const [loc] = await db
        .select({ countryCode: businessLocalization.countryCode })
        .from(businessLocalization)
        .where(eq(businessLocalization.organizationId, organizationId));
      if (loc?.countryCode) return loc.countryCode;

      const [org] = await db
        .select({ phone: organizations.phone, timezone: organizations.timezone })
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      if (org?.phone) {
        const p = normalizePhoneNumber(org.phone);
        if (p.success && p.country) return p.country;
      }

      if (org?.timezone?.includes("Kolkata") || org?.timezone?.includes("Calcutta") || org?.timezone?.includes("India")) {
        return "IN";
      }
      if (org?.timezone?.includes("London")) {
        return "GB";
      }
    } catch {
      // ignore
    }
    return "US";
  },

  /**
   * Canonical CRM Identity Resolver:
   * Maps any inbound channel payload, booking request, or manual entry
   * to a single canonical CRM customer profile.
   */
  async resolveCustomerIdentity(input: ResolveIdentityInput): Promise<ResolveIdentityResult> {
    const { organizationId, channel = "widget", channelUserId, name, metadata = {} } = input;

    // 1. Resolve Country Context
    const orgCountry = input.defaultCountry || (await this.getOrganizationCountry(organizationId));

    // 2. Extract and Normalize Phone
    let rawPhone = input.phone || null;
    const isPhoneChannel = ["whatsapp", "sms", "voice"].includes(channel);
    if (!rawPhone && isPhoneChannel && channelUserId) {
      rawPhone = channelUserId;
    }

    const phoneRes = normalizePhoneNumber(rawPhone, { organizationCountry: orgCountry });
    const normalizedPhone = phoneRes.success ? phoneRes.e164 : null;

    // 3. Extract and Normalize Email
    let rawEmail = input.email || null;
    if (!rawEmail && channel === "email" && channelUserId) {
      rawEmail = channelUserId;
    }
    const emailRes = normalizeEmail(rawEmail);
    const normalizedEmail = emailRes.success ? emailRes.normalizedEmail : null;

    const channelIdentifier = channelUserId || normalizedPhone || normalizedEmail || "unknown";

    // -------------------------------------------------------------
    // Step A: Check Existing Channel Mapping (e.g. WhatsApp user ID)
    // -------------------------------------------------------------
    if (channelUserId) {
      const [existingChannel] = await db
        .select()
        .from(contactChannels)
        .where(
          and(
            eq(contactChannels.organizationId, organizationId),
            eq(contactChannels.channelType, channel),
            eq(contactChannels.channelUserId, channelUserId)
          )
        );

      if (existingChannel) {
        const [existingProfile] = await db
          .select()
          .from(leadProfiles)
          .where(
            and(
              eq(leadProfiles.organizationId, organizationId),
              eq(leadProfiles.id, existingChannel.contactId)
            )
          );

        if (existingProfile) {
          // Non-destructively backfill missing info
          const updates: any = {};
          if (!existingProfile.phone && normalizedPhone) {
            updates.phone = rawPhone;
            updates.normalizedPhone = normalizedPhone;
          }
          if (!existingProfile.email && normalizedEmail) {
            updates.email = rawEmail;
            updates.normalizedEmail = normalizedEmail;
          }
          if ((!existingProfile.name || existingProfile.name.toLowerCase().includes("contact")) && name) {
            updates.name = name;
          }

          if (Object.keys(updates).length > 0) {
            await db
              .update(leadProfiles)
              .set({ ...updates, updatedAt: new Date() })
              .where(eq(leadProfiles.id, existingProfile.id));
          }

          return {
            leadProfileId: existingProfile.id,
            isNew: false,
            profile: { ...existingProfile, ...updates },
            matchType: "channel_mapping",
            normalizedPhone: existingProfile.normalizedPhone || normalizedPhone,
            normalizedEmail: existingProfile.normalizedEmail || normalizedEmail,
          };
        }
      }
    }

    // -------------------------------------------------------------
    // Step B: Match by Canonical Normalized Phone
    // -------------------------------------------------------------
    if (normalizedPhone) {
      const [matchingProfile] = await db
        .select()
        .from(leadProfiles)
        .where(
          and(
            eq(leadProfiles.organizationId, organizationId),
            eq(leadProfiles.normalizedPhone, normalizedPhone)
          )
        );

      if (matchingProfile) {
        // Link channel mapping if absent
        if (channelUserId) {
          const [chanExists] = await db
            .select()
            .from(contactChannels)
            .where(
              and(
                eq(contactChannels.organizationId, organizationId),
                eq(contactChannels.contactId, matchingProfile.id),
                eq(contactChannels.channelType, channel),
                eq(contactChannels.channelUserId, channelUserId)
              )
            );

          if (!chanExists) {
            await db.insert(contactChannels).values({
              organizationId,
              contactId: matchingProfile.id,
              channelType: channel,
              channelUserId,
              normalizedIdentifier: normalizedPhone,
              value: rawPhone || channelUserId,
              isVerified: true,
            });
          }
        }

        // Non-destructively update missing attributes
        const updates: any = {};
        if (!matchingProfile.email && normalizedEmail) {
          updates.email = rawEmail;
          updates.normalizedEmail = normalizedEmail;
        }
        if ((!matchingProfile.name || matchingProfile.name.toLowerCase().includes("contact")) && name) {
          updates.name = name;
        }

        if (Object.keys(updates).length > 0) {
          await db
            .update(leadProfiles)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(leadProfiles.id, matchingProfile.id));
        }

        return {
          leadProfileId: matchingProfile.id,
          isNew: false,
          profile: { ...matchingProfile, ...updates },
          matchType: "phone_match",
          normalizedPhone,
          normalizedEmail: matchingProfile.normalizedEmail || normalizedEmail,
        };
      }
    }

    // -------------------------------------------------------------
    // Step C: Match by Canonical Normalized Email
    // -------------------------------------------------------------
    if (normalizedEmail) {
      const [matchingProfile] = await db
        .select()
        .from(leadProfiles)
        .where(
          and(
            eq(leadProfiles.organizationId, organizationId),
            eq(leadProfiles.normalizedEmail, normalizedEmail)
          )
        );

      if (matchingProfile) {
        // Link channel mapping if absent
        if (channelUserId) {
          const [chanExists] = await db
            .select()
            .from(contactChannels)
            .where(
              and(
                eq(contactChannels.organizationId, organizationId),
                eq(contactChannels.contactId, matchingProfile.id),
                eq(contactChannels.channelType, channel),
                eq(contactChannels.channelUserId, channelUserId)
              )
            );

          if (!chanExists) {
            await db.insert(contactChannels).values({
              organizationId,
              contactId: matchingProfile.id,
              channelType: channel,
              channelUserId,
              normalizedIdentifier: normalizedEmail,
              value: rawEmail || channelUserId,
              isVerified: true,
            });
          }
        }

        const updates: any = {};
        if (!matchingProfile.phone && normalizedPhone) {
          updates.phone = rawPhone;
          updates.normalizedPhone = normalizedPhone;
        }
        if ((!matchingProfile.name || matchingProfile.name.toLowerCase().includes("contact")) && name) {
          updates.name = name;
        }

        if (Object.keys(updates).length > 0) {
          await db
            .update(leadProfiles)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(leadProfiles.id, matchingProfile.id));
        }

        return {
          leadProfileId: matchingProfile.id,
          isNew: false,
          profile: { ...matchingProfile, ...updates },
          matchType: "email_match",
          normalizedPhone: matchingProfile.normalizedPhone || normalizedPhone,
          normalizedEmail,
        };
      }
    }

    // -------------------------------------------------------------
    // Step D: Atomic Creation & Concurrency Race Protection
    // -------------------------------------------------------------
    const displayName = name || (phoneRes.success ? phoneRes.internationalFormatted : emailRes.success ? emailRes.normalizedEmail : `${channel.toUpperCase()} Contact`);

    try {
      const [newProfile] = await db
        .insert(leadProfiles)
        .values({
          organizationId,
          name: displayName,
          phone: rawPhone,
          normalizedPhone: normalizedPhone || null,
          email: rawEmail,
          normalizedEmail: normalizedEmail || null,
          status: "New",
          leadScore: 0,
          conversationCount: 1,
        })
        .returning();

      // Create channel mapping
      if (channelUserId || normalizedPhone || normalizedEmail) {
        await db.insert(contactChannels).values({
          organizationId,
          contactId: newProfile.id,
          channelType: channel,
          channelUserId: channelIdentifier,
          normalizedIdentifier: normalizedPhone || normalizedEmail || null,
          value: rawPhone || rawEmail || channelIdentifier,
          isVerified: true,
        });
      }

      return {
        leadProfileId: newProfile.id,
        isNew: true,
        profile: newProfile,
        matchType: "created",
        normalizedPhone,
        normalizedEmail,
      };
    } catch (err: any) {
      // If concurrent insert race condition occurred on (organizationId, normalizedPhone):
      if (normalizedPhone && (err?.code === "23505" || err?.message?.includes("unique") || err?.message?.includes("duplicate"))) {
        const [existing] = await db
          .select()
          .from(leadProfiles)
          .where(
            and(
              eq(leadProfiles.organizationId, organizationId),
              eq(leadProfiles.normalizedPhone, normalizedPhone)
            )
          );

        if (existing) {
          return {
            leadProfileId: existing.id,
            isNew: false,
            profile: existing,
            matchType: "phone_match",
            normalizedPhone,
            normalizedEmail: existing.normalizedEmail || normalizedEmail,
          };
        }
      }

      throw err;
    }
  },
};
