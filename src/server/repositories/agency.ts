import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import {
  agencies,
  agencyBranding,
  agencyDomains,
  agencyMembers,
  agencyClients,
  clientWorkspaces,
  resellerPlans,
  resellerUsage,
  agencyInvitations,
  agencyAuditLogs,
  agencyPermissions,
  agencyBilling,
  agencySubscriptions,
  users
} from "../db/schema";

export const agencyRepository = {
  // --- Resolve Agency Membership ---
  async getAgencyByMember(userId: string) {
    const memberRecord = await db.query.agencyMembers.findFirst({
      where: eq(agencyMembers.userId, userId),
      with: {
        agency: {
          with: {
            branding: true,
            billing: true,
          }
        }
      }
    });

    if (memberRecord?.agency) {
      return memberRecord.agency;
    }

    // Onboarding fallback: Create a default agency if none exists
    // in order to avoid locking out developers/owners
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    const email = user?.email || "owner@example.com";
    const baseSlug = email.split("@")[0].replace(/[^a-z0-9]+/g, "-");
    const uniqueSlug = `${baseSlug}-agency-${Math.random().toString(36).substring(2, 6)}`;

    return await db.transaction(async (tx) => {
      const [newAgency] = await tx
        .insert(agencies)
        .values({
          name: `${user?.name || baseSlug}'s Agency`,
          slug: uniqueSlug,
          ownerId: userId,
          status: "active"
        })
        .returning();

      // Seed Default Branding
      const [branding] = await tx
        .insert(agencyBranding)
        .values({
          agencyId: newAgency.id,
          platformName: "Operator WhiteLabel Portal",
          primaryColor: "#3b82f6",
          secondaryColor: "#1e293b",
          typography: "Inter"
        })
        .returning();

      // Seed Owner Membership
      await tx
        .insert(agencyMembers)
        .values({
          agencyId: newAgency.id,
          userId,
          role: "owner"
        });

      return {
        ...newAgency,
        branding,
        billing: null
      };
    });
  },

  // --- Branding Studio ---
  async getBranding(agencyId: string) {
    const [branding] = await db
      .select()
      .from(agencyBranding)
      .where(eq(agencyBranding.agencyId, agencyId));
    return branding || null;
  },

  async upsertBranding(agencyId: string, data: Partial<typeof agencyBranding.$inferInsert>) {
    const existing = await this.getBranding(agencyId);
    if (existing) {
      const [updated] = await db
        .update(agencyBranding)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(agencyBranding.agencyId, agencyId))
        .returning();
      return updated;
    } else {
      const [inserted] = await db
        .insert(agencyBranding)
        .values({
          ...data,
          agencyId,
          platformName: data.platformName || "Operator WhiteLabel",
        } as typeof agencyBranding.$inferInsert)
        .returning();
      return inserted;
    }
  },

  // --- Domains Manager ---
  async getDomains(agencyId: string) {
    return db
      .select()
      .from(agencyDomains)
      .where(eq(agencyDomains.agencyId, agencyId))
      .orderBy(desc(agencyDomains.createdAt));
  },

  async addDomain(agencyId: string, domainName: string, type: string) {
    const [inserted] = await db
      .insert(agencyDomains)
      .values({
        agencyId,
        domainName,
        type,
        sslStatus: "pending"
      })
      .returning();
    return inserted;
  },

  async deleteDomain(domainId: string) {
    await db.delete(agencyDomains).where(eq(agencyDomains.id, domainId));
    return true;
  },

  async verifyDomainSsl(domainId: string, status: "active" | "failed" | "pending") {
    const [updated] = await db
      .update(agencyDomains)
      .set({
        sslStatus: status,
        updatedAt: new Date()
      })
      .where(eq(agencyDomains.id, domainId))
      .returning();
    return updated;
  },

  // --- Client Management ---
  async getClients(agencyId: string) {
    // Queries clients and fetches linked workspaces and organizations
    const clientList = await db.query.agencyClients.findMany({
      where: eq(agencyClients.agencyId, agencyId),
      orderBy: [desc(agencyClients.createdAt)],
      with: {
        workspaces: {
          with: {
            organization: true
          }
        }
      }
    });

    return clientList;
  },

  async getClientDetails(clientId: string) {
    return db.query.agencyClients.findFirst({
      where: eq(agencyClients.id, clientId),
      with: {
        workspaces: {
          with: {
            organization: true
          }
        }
      }
    });
  },

  // --- Team Management & Invites ---
  async getTeamMembers(agencyId: string) {
    const members = await db.query.agencyMembers.findMany({
      where: eq(agencyMembers.agencyId, agencyId),
      orderBy: [desc(agencyMembers.createdAt)],
      with: {
        user: true
      }
    });
    return members;
  },

  async getInvitations(agencyId: string) {
    return db
      .select()
      .from(agencyInvitations)
      .where(eq(agencyInvitations.agencyId, agencyId))
      .orderBy(desc(agencyInvitations.createdAt));
  },

  async createInvitation(agencyId: string, email: string, role: string, token: string) {
    const [invite] = await db
      .insert(agencyInvitations)
      .values({
        agencyId,
        email,
        role,
        token,
        status: "pending"
      })
      .returning();
    return invite;
  },

  async removeMember(memberId: string) {
    await db.delete(agencyMembers).where(eq(agencyMembers.id, memberId));
    return true;
  },

  // --- Audit Trails ---
  async getAuditLogs(agencyId: string, limit = 100) {
    return db.query.agencyAuditLogs.findMany({
      where: eq(agencyAuditLogs.agencyId, agencyId),
      orderBy: [desc(agencyAuditLogs.createdAt)],
      limit,
      with: {
        user: true
      }
    });
  },

  // --- Reseller Plans ---
  async getResellerPlans(agencyId: string) {
    return db
      .select()
      .from(resellerPlans)
      .where(eq(resellerPlans.agencyId, agencyId))
      .orderBy(desc(resellerPlans.createdAt));
  },

  async createResellerPlan(agencyId: string, data: { name: string; price: string; limits: any }) {
    const [plan] = await db
      .insert(resellerPlans)
      .values({
        agencyId,
        name: data.name,
        price: data.price,
        limits: data.limits || {}
      })
      .returning();
    return plan;
  },

  async deleteResellerPlan(planId: string) {
    await db.delete(resellerPlans).where(eq(resellerPlans.id, planId));
    return true;
  }
};
