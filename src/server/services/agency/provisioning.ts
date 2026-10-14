import { db } from "../../db";
import { 
  organizations, 
  businessSettings, 
  voiceSettings, 
  agencyClients, 
  clientWorkspaces,
  agencyAuditLogs
} from "../../db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/constants/templates";

export const agencyProvisioning = {
  /**
   * Provisions a brand new client business and hooks up its tenant workspace
   */
  async provisionClientWorkspace(options: {
    agencyId: string;
    actorUserId: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    industry?: string;
    timezone?: string;
  }) {
    const { 
      agencyId, 
      actorUserId, 
      clientName, 
      clientEmail, 
      clientPhone, 
      industry = "Dental Clinic", 
      timezone = "America/New_York" 
    } = options;

    return await db.transaction(async (tx) => {
      // 1. Create client profile entry linked to agency
      const [client] = await tx
        .insert(agencyClients)
        .values({
          agencyId,
          name: clientName,
          email: clientEmail || null,
          phone: clientPhone || null,
          status: "active",
        })
        .returning();

      // Generate a clean organization slug
      const baseSlug = clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const uniqueSuffix = Math.random().toString(36).substring(2, 7);
      const slug = `${baseSlug}-${uniqueSuffix}`;

      // 2. Create the core isolated multi-tenant organization
      const [org] = await tx
        .insert(organizations)
        .values({
          name: clientName,
          slug,
          industry,
          email: clientEmail || null,
          phone: clientPhone || null,
          timezone,
        })
        .returning();

      // 3. Connect client profile to the core organization
      const [workspace] = await tx
        .insert(clientWorkspaces)
        .values({
          agencyClientId: client.id,
          organizationId: org.id,
        })
        .returning();

      // 4. Seed Business Settings (Business Hours, languages, preferences)
      await tx
        .insert(businessSettings)
        .values({
          organizationId: org.id,
          businessHours: DEFAULT_BUSINESS_HOURS,
          holidays: [],
          languages: ["en"],
          bookingPreferences: { slotIntervalMinutes: 30, bufferMinutes: 15, autoApprove: true },
          notificationPreferences: { channels: ["email"], emailAddresses: clientEmail ? [clientEmail] : [] },
          leadAssignmentRules: { type: "round_robin" },
        });

      // 5. Seed Voice Settings
      await tx
        .insert(voiceSettings)
        .values({
          organizationId: org.id,
          voiceName: "af_heart",
          speakingSpeed: "1.0",
          greetingMessage: `Hello, thanks for calling ${clientName}. How can I assist you today?`,
          businessHoursMode: "ai-only",
          voicemailActive: true,
        });

      // 6. Write Audit Log
      await tx
        .insert(agencyAuditLogs)
        .values({
          agencyId,
          userId: actorUserId,
          action: "client-provision",
          targetId: client.id,
          details: { 
            clientName, 
            organizationId: org.id, 
            slug 
          },
        });
      return {
        clientId: client.id,
        organizationId: org.id,
        slug,
      };
    });
  },

  /**
   * Suspends a client business workspace
   */
  async suspendClient(agencyId: string, actorUserId: string, clientId: string) {
    await db.transaction(async (tx) => {
      await tx
        .update(agencyClients)
        .set({ status: "suspended", updatedAt: new Date() })
        .where(eq(agencyClients.id, clientId));

      // Record Audit Log
      await tx
        .insert(agencyAuditLogs)
        .values({
          agencyId,
          userId: actorUserId,
          action: "client-suspend",
          targetId: clientId,
          details: { timestamp: new Date().toISOString() },
        });
    });

    return true;
  },

  /**
   * Restores a suspended client business workspace
   */
  async activateClient(agencyId: string, actorUserId: string, clientId: string) {
    await db.transaction(async (tx) => {
      await tx
        .update(agencyClients)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(agencyClients.id, clientId));

      // Record Audit Log
      await tx
        .insert(agencyAuditLogs)
        .values({
          agencyId,
          userId: actorUserId,
          action: "client-activate",
          targetId: clientId,
          details: { timestamp: new Date().toISOString() },
        });
    });

    return true;
  },

  /**
   * Archives a client business workspace
   */
  async archiveClient(agencyId: string, actorUserId: string, clientId: string) {
    await db.transaction(async (tx) => {
      await tx
        .update(agencyClients)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(agencyClients.id, clientId));

      // Record Audit Log
      await tx
        .insert(agencyAuditLogs)
        .values({
          agencyId,
          userId: actorUserId,
          action: "client-archive",
          targetId: clientId,
          details: { timestamp: new Date().toISOString() },
        });
    });

    return true;
  }
};
