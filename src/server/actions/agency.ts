"use server";

import { auth } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { agencyRepository } from "../repositories/agency";
import { agencyProvisioning } from "../services/agency/provisioning";
import { agencyImpersonation } from "../services/agency/impersonation";

async function getVerifiedUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

async function getVerifiedAgencyContext() {
  const userId = await getVerifiedUser();
  const agency = await agencyRepository.getAgencyByMember(userId);
  if (!agency) throw new Error("No agency association found");
  return { agency, userId };
}

// --- Agency Profile & Branding ---
export async function getAgencyContextAction() {
  try {
    const { agency } = await getVerifiedAgencyContext();
    return { success: true, agency };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load agency context" };
  }
}

export async function getAgencyBrandingAction() {
  try {
    const { agency } = await getVerifiedAgencyContext();
    const branding = await agencyRepository.getBranding(agency.id);
    return { success: true, branding };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load branding configurations" };
  }
}

export async function saveAgencyBrandingAction(data: {
  platformName: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  typography?: string;
  emailSenderName?: string | null;
  emailSenderDomain?: string | null;
  customCss?: string | null;
}) {
  try {
    const { agency } = await getVerifiedAgencyContext();
    await agencyRepository.upsertBranding(agency.id, data);
    revalidatePath("/agency/branding");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save white-label branding" };
  }
}

// --- Domains Management ---
export async function getAgencyDomainsAction() {
  try {
    const { agency } = await getVerifiedAgencyContext();
    const domains = await agencyRepository.getDomains(agency.id);
    return { success: true, domains };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load custom domains" };
  }
}

export async function addAgencyDomainAction(domainName: string, type: "portal" | "client" | "widget" | "api") {
  try {
    const { agency } = await getVerifiedAgencyContext();
    const domain = await agencyRepository.addDomain(agency.id, domainName, type);
    revalidatePath("/agency/domains");
    return { success: true, domain };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to link custom domain" };
  }
}

export async function deleteAgencyDomainAction(domainId: string) {
  try {
    const { agency } = await getVerifiedAgencyContext();
    await agencyRepository.deleteDomain(agency.id, domainId);
    revalidatePath("/agency/domains");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete custom domain" };
  }
}

export async function verifyDomainSslAction(domainId: string) {
  try {
    const { agency } = await getVerifiedAgencyContext();
    const domains = await agencyRepository.getDomains(agency.id);
    const domainRecord = domains.find((d) => d.id === domainId);
    if (!domainRecord) {
      return { success: false, error: "Custom domain record not found" };
    }

    // 1. Perform real DNS CNAME or A-record resolution
    let dnsValid = false;
    try {
      const dns = await import("dns/promises");
      const cnames = await dns.resolveCname(domainRecord.domainName);
      dnsValid = cnames.length > 0;
    } catch {
      try {
        const dns = await import("dns/promises");
        const lookup = await dns.lookup(domainRecord.domainName);
        dnsValid = Boolean(lookup.address);
      } catch {
        dnsValid = false;
      }
    }

    if (!dnsValid) {
      await agencyRepository.verifyDomainSsl(agency.id, domainId, "failed");
      revalidatePath("/agency/domains");
      return {
        success: false,
        status: "failed",
        error: `DNS record could not be resolved for ${domainRecord.domainName}. Please ensure CNAME or A records point to your Operator gateway before requesting SSL verification.`,
      };
    }

    // 2. Perform real TLS/HTTPS certificate handshake verification
    let tlsValid = false;
    let tlsErrorMessage = "";
    try {
      const tls = await import("tls");
      tlsValid = await new Promise<boolean>((resolve) => {
        const socket = tls.connect(
          {
            host: domainRecord.domainName,
            port: 443,
            servername: domainRecord.domainName,
            timeout: 5000,
            rejectUnauthorized: true,
          },
          () => {
            const authorized = socket.authorized;
            socket.end();
            resolve(Boolean(authorized));
          }
        );
        socket.on("error", (err) => {
          tlsErrorMessage = err.message;
          socket.destroy();
          resolve(false);
        });
        socket.on("timeout", () => {
          tlsErrorMessage = "TLS connection timed out";
          socket.destroy();
          resolve(false);
        });
      });
    } catch (e: any) {
      tlsValid = false;
      tlsErrorMessage = e?.message || "TLS verification error";
    }

    if (!tlsValid) {
      // DNS points to host, but TLS certificate is not yet issued or authorized
      await agencyRepository.verifyDomainSsl(agency.id, domainId, "pending");
      revalidatePath("/agency/domains");
      return {
        success: false,
        status: "pending",
        error: `DNS verified, but SSL certificate is pending or invalid (${tlsErrorMessage || "handshake incomplete"}). Domain cannot be marked active until a valid TLS certificate is verified.`,
      };
    }

    // Both DNS and TLS certificate verified successfully
    await agencyRepository.verifyDomainSsl(agency.id, domainId, "active");
    revalidatePath("/agency/domains");
    return { success: true, status: "active" };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to verify domain DNS/SSL record" };
  }
}

// --- Client Resellers & Workspaces ---
export async function getAgencyClientsAction() {
  try {
    const { agency } = await getVerifiedAgencyContext();
    const clients = await agencyRepository.getClients(agency.id);
    return { success: true, clients };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load agency clients" };
  }
}

export async function createClientWorkspaceAction(data: {
  name: string;
  email?: string;
  phone?: string;
  industry?: string;
  timezone?: string;
}) {
  try {
    const { agency, userId } = await getVerifiedAgencyContext();
    const result = await agencyProvisioning.provisionClientWorkspace({
      agencyId: agency.id,
      actorUserId: userId,
      clientName: data.name,
      clientEmail: data.email,
      clientPhone: data.phone,
      industry: data.industry,
      timezone: data.timezone
    });
    revalidatePath("/agency/clients");
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to provision client workspace" };
  }
}

export async function updateClientStatusAction(clientId: string, status: "active" | "suspended" | "archived") {
  try {
    const { agency, userId } = await getVerifiedAgencyContext();
    if (status === "suspended") {
      await agencyProvisioning.suspendClient(agency.id, userId, clientId);
    } else if (status === "archived") {
      await agencyProvisioning.archiveClient(agency.id, userId, clientId);
    } else if (status === "active") {
      await agencyProvisioning.activateClient(agency.id, userId, clientId);
    }
    revalidatePath("/agency/clients");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to transition client workspace status" };
  }
}

// --- Impersonation Gateway ---
export async function triggerImpersonateAction(clientId: string) {
  try {
    const { agency, userId } = await getVerifiedAgencyContext();
    const clientDetails = await agencyRepository.getClientDetails(agency.id, clientId);
    
    if (!clientDetails || clientDetails.workspaces.length === 0) {
      throw new Error("Client organization workspace is not provisioned or active");
    }

    const orgId = clientDetails.workspaces[0].organizationId;
    const token = await agencyImpersonation.generateImpersonationToken({
      agencyId: agency.id,
      actorUserId: userId,
      targetOrganizationId: orgId
    });

    return { 
      success: true, 
      token, 
      redirectUrl: `/api/agency/impersonate?token=${encodeURIComponent(token)}`
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Impersonation activation failed" };
  }
}

// --- Team Management ---
export async function getAgencyTeamAction() {
  try {
    const { agency } = await getVerifiedAgencyContext();
    const members = await agencyRepository.getTeamMembers(agency.id);
    const invitations = await agencyRepository.getInvitations(agency.id);
    return { success: true, members, invitations };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load team logs" };
  }
}

export async function inviteTeamMemberAction(email: string, role: string) {
  try {
    const { agency } = await getVerifiedAgencyContext();
    const token = "INV-" + crypto.randomUUID();
    const invitation = await agencyRepository.createInvitation(agency.id, email, role, token);
    revalidatePath("/agency/team");
    return { success: true, invitation };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to submit invitation" };
  }
}

export async function removeTeamMemberAction(memberId: string) {
  try {
    const { agency } = await getVerifiedAgencyContext();
    await agencyRepository.removeMember(agency.id, memberId);
    revalidatePath("/agency/team");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to remove staff member" };
  }
}

// --- Pricing Plans ---
export async function getAgencyResellerPlansAction() {
  try {
    const { agency } = await getVerifiedAgencyContext();
    const plans = await agencyRepository.getResellerPlans(agency.id);
    return { success: true, plans };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load custom pricing plans" };
  }
}

export async function createResellerPlanAction(data: { name: string; price: string; limits: any }) {
  try {
    const { agency } = await getVerifiedAgencyContext();
    const plan = await agencyRepository.createResellerPlan(agency.id, data);
    revalidatePath("/agency/billing");
    return { success: true, plan };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save reseller plan" };
  }
}

export async function deleteResellerPlanAction(planId: string) {
  try {
    const { agency } = await getVerifiedAgencyContext();
    await agencyRepository.deleteResellerPlan(agency.id, planId);
    revalidatePath("/agency/billing");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete reseller plan" };
  }
}

// --- Audit Trails ---
export async function getAgencyAuditLogsAction() {
  try {
    const { agency } = await getVerifiedAgencyContext();
    const logs = await agencyRepository.getAuditLogs(agency.id, 50);
    return { success: true, logs };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load security audit logs" };
  }
}
