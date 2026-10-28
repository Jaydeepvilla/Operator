"use server";

import { requireOrganizationAccess } from "@/lib/auth/server";
import { assertPermission } from "@/lib/auth/permissions";
import { db } from "../db";
import { leadProfiles, appointments } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { PrivacySecurityService } from "../services/privacy-security";

/**
 * Sanitizes CSV cell content to prevent CSV formula injection (DDE attacks)
 * when opened in Microsoft Excel, Google Sheets, or LibreOffice.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = String(value).trim();

  // If starts with dangerous spreadsheet formula triggers, prepend a single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape internal double quotes
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Exports organization leads to CSV format.
 * STRICT SECURITY BOUNDARY:
 * 1. Derives organizationId strictly from verified session context (never user input).
 * 2. Enforces 'leads:export' role permission.
 * 3. Applies CSV formula injection defense.
 */
export async function exportLeadsAction(): Promise<{
  success: boolean;
  csvData?: string;
  filename?: string;
  error?: string;
}> {
  try {
    const authContext = await requireOrganizationAccess();
    assertPermission(authContext, "leads:export");

    const leads = await db
      .select({
        id: leadProfiles.id,
        name: leadProfiles.name,
        email: leadProfiles.email,
        phone: leadProfiles.phone,
        status: leadProfiles.status,
        leadScore: leadProfiles.leadScore,
        createdAt: leadProfiles.createdAt,
      })
      .from(leadProfiles)
      .where(eq(leadProfiles.organizationId, authContext.organizationId))
      .orderBy(desc(leadProfiles.createdAt));

    // Privacy Hardening: enforce bulk download authorization limits and verify 100% tenant scope
    PrivacySecurityService.assertBulkDownloadAuthorized({
      userId: authContext.userId,
      organizationId: authContext.organizationId,
      role: authContext.role,
      rowCount: leads.length,
    });

    PrivacySecurityService.assertExportTenantScope(
      leads.map((l) => ({ ...l, organizationId: authContext.organizationId })),
      authContext.organizationId
    );

    const headers = ["ID", "Name", "Email", "Phone", "Status", "Lead Score", "Created At"];
    const rows = leads.map((l) => [
      sanitizeCsvCell(l.id),
      sanitizeCsvCell(l.name),
      sanitizeCsvCell(l.email),
      sanitizeCsvCell(l.phone),
      sanitizeCsvCell(l.status),
      sanitizeCsvCell(l.leadScore),
      sanitizeCsvCell(l.createdAt ? new Date(l.createdAt).toISOString() : ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const dateStr = new Date().toISOString().split("T")[0];

    return {
      success: true,
      csvData: csvContent,
      filename: `leads-export-${dateStr}.csv`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to export leads",
    };
  }
}

/**
 * Exports organization appointments to CSV format.
 * STRICT SECURITY BOUNDARY:
 * 1. Derives organizationId strictly from verified session context.
 * 2. Scoped only to tenant's own appointment records.
 */
export async function exportAppointmentsAction(): Promise<{
  success: boolean;
  csvData?: string;
  filename?: string;
  error?: string;
}> {
  try {
    const authContext = await requireOrganizationAccess();

    const apts = await db
      .select({
        id: appointments.id,
        customerName: appointments.customerName,
        customerEmail: appointments.customerEmail,
        customerPhone: appointments.customerPhone,
        status: appointments.status,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        createdAt: appointments.createdAt,
      })
      .from(appointments)
      .where(eq(appointments.organizationId, authContext.organizationId))
      .orderBy(desc(appointments.startTime));

    // Privacy Hardening: enforce bulk download authorization limits and verify 100% tenant scope
    PrivacySecurityService.assertBulkDownloadAuthorized({
      userId: authContext.userId,
      organizationId: authContext.organizationId,
      role: authContext.role,
      rowCount: apts.length,
    });

    PrivacySecurityService.assertExportTenantScope(
      apts.map((a) => ({ ...a, organizationId: authContext.organizationId })),
      authContext.organizationId
    );

    const headers = ["ID", "Customer Name", "Customer Email", "Customer Phone", "Status", "Start Time", "End Time", "Booked At"];
    const rows = apts.map((a) => [
      sanitizeCsvCell(a.id),
      sanitizeCsvCell(a.customerName),
      sanitizeCsvCell(a.customerEmail),
      sanitizeCsvCell(a.customerPhone),
      sanitizeCsvCell(a.status),
      sanitizeCsvCell(a.startTime ? new Date(a.startTime).toISOString() : ""),
      sanitizeCsvCell(a.endTime ? new Date(a.endTime).toISOString() : ""),
      sanitizeCsvCell(a.createdAt ? new Date(a.createdAt).toISOString() : ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const dateStr = new Date().toISOString().split("T")[0];

    return {
      success: true,
      csvData: csvContent,
      filename: `appointments-export-${dateStr}.csv`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to export appointments",
    };
  }
}

