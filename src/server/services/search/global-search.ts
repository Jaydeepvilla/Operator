import { db } from "@/server/db";
import {
  leadProfiles,
  appointments,
  knowledgeDocuments,
  faqItems,
  services,
  callSessions,
} from "@/server/db/schema";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import {
  SearchResultItem,
  SearchResultsGrouped,
  SearchOptions,
  GlobalSearchResponse,
} from "@/lib/search/types";
import { searchNavigation } from "@/lib/search/navigation-registry";

/**
 * Normalizes and sanitizes user search query to prevent wildcard denial-of-service,
 * null byte poisoning, and excessive computational workload.
 */
export function sanitizeSearchQuery(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/\0/g, "")
    .trim()
    .slice(0, 100);
}

/**
 * Escapes PostgreSQL LIKE/ILIKE special pattern characters.
 */
export function escapeLikePattern(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/**
 * Core Global Search Service.
 * STRICT SECURITY BOUNDARY:
 * - Scoped authoritatively by organizationId.
 * - Cross-tenant isolation is guaranteed by `eq(table.organizationId, organizationId)` on every query.
 * - Does not trust client-supplied business or user IDs.
 */
export async function executeGlobalSearch(
  organizationId: string,
  rawQuery: string,
  options?: SearchOptions
): Promise<GlobalSearchResponse> {
  const query = sanitizeSearchQuery(rawQuery);
  const limitPerCategory = Math.min(Math.max(options?.limitPerCategory || 5, 1), 25);

  const emptyResults: SearchResultsGrouped = {
    contacts: [],
    appointments: [],
    knowledge: [],
    faqs: [],
    services: [],
    calls: [],
    navigation: [],
  };

  if (!organizationId) {
    return {
      success: false,
      query,
      totalResults: 0,
      results: emptyResults,
      error: "Organization ID is required for search authorization",
    };
  }

  // Minimum 2 characters required for database-backed search
  if (query.length < 2) {
    const navResults = query.length === 1 ? searchNavigation(query, limitPerCategory) : [];
    return {
      success: true,
      query,
      totalResults: navResults.length,
      results: {
        ...emptyResults,
        navigation: navResults,
      },
    };
  }

  const escaped = escapeLikePattern(query);
  const pattern = `%${escaped}%`;

  try {
    const [
      contactsRes,
      appointmentsRes,
      knowledgeRes,
      faqsRes,
      servicesRes,
      callsRes,
    ] = await Promise.allSettled([
      // 1. Contacts / Leads (leadProfiles)
      db
        .select({
          id: leadProfiles.id,
          name: leadProfiles.name,
          email: leadProfiles.email,
          phone: leadProfiles.phone,
          status: leadProfiles.status,
          summary: leadProfiles.summary,
          createdAt: leadProfiles.createdAt,
          updatedAt: leadProfiles.updatedAt,
        })
        .from(leadProfiles)
        .where(
          and(
            eq(leadProfiles.organizationId, organizationId),
            or(
              ilike(leadProfiles.name, pattern),
              ilike(leadProfiles.email, pattern),
              ilike(leadProfiles.phone, pattern),
              ilike(leadProfiles.summary, pattern)
            )
          )
        )
        .orderBy(desc(leadProfiles.updatedAt))
        .limit(limitPerCategory),

      // 2. Appointments (appointments)
      db
        .select({
          id: appointments.id,
          customerName: appointments.customerName,
          customerEmail: appointments.customerEmail,
          customerPhone: appointments.customerPhone,
          status: appointments.status,
          startTime: appointments.startTime,
          endTime: appointments.endTime,
          pricePaid: appointments.pricePaid,
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.organizationId, organizationId),
            or(
              ilike(appointments.customerName, pattern),
              ilike(appointments.customerEmail, pattern),
              ilike(appointments.customerPhone, pattern)
            )
          )
        )
        .orderBy(desc(appointments.startTime))
        .limit(limitPerCategory),

      // 3. Knowledge Base Documents (knowledgeDocuments)
      db
        .select({
          id: knowledgeDocuments.id,
          name: knowledgeDocuments.name,
          fileType: knowledgeDocuments.fileType,
          status: knowledgeDocuments.status,
          fileSize: knowledgeDocuments.fileSize,
          updatedAt: knowledgeDocuments.updatedAt,
        })
        .from(knowledgeDocuments)
        .where(
          and(
            eq(knowledgeDocuments.organizationId, organizationId),
            eq(knowledgeDocuments.isArchived, false),
            ilike(knowledgeDocuments.name, pattern)
          )
        )
        .orderBy(desc(knowledgeDocuments.updatedAt))
        .limit(limitPerCategory),

      // 4. FAQs (faqItems)
      db
        .select({
          id: faqItems.id,
          question: faqItems.question,
          answer: faqItems.answer,
          category: faqItems.category,
          isActive: faqItems.isActive,
          updatedAt: faqItems.updatedAt,
        })
        .from(faqItems)
        .where(
          and(
            eq(faqItems.organizationId, organizationId),
            or(
              ilike(faqItems.question, pattern),
              ilike(faqItems.answer, pattern),
              ilike(faqItems.category, pattern)
            )
          )
        )
        .orderBy(desc(faqItems.updatedAt))
        .limit(limitPerCategory),

      // 5. Services (services)
      db
        .select({
          id: services.id,
          name: services.name,
          description: services.description,
          duration: services.duration,
          price: services.price,
          isActive: services.isActive,
          updatedAt: services.updatedAt,
        })
        .from(services)
        .where(
          and(
            eq(services.organizationId, organizationId),
            eq(services.isArchived, false),
            or(
              ilike(services.name, pattern),
              ilike(services.description, pattern)
            )
          )
        )
        .orderBy(desc(services.updatedAt))
        .limit(limitPerCategory),

      // 6. Voice Call Sessions (callSessions)
      db
        .select({
          id: callSessions.id,
          callerNumber: callSessions.callerNumber,
          recipientNumber: callSessions.recipientNumber,
          externalSessionId: callSessions.externalSessionId,
          direction: callSessions.direction,
          status: callSessions.status,
          durationSeconds: callSessions.durationSeconds,
          createdAt: callSessions.createdAt,
        })
        .from(callSessions)
        .where(
          and(
            eq(callSessions.organizationId, organizationId),
            or(
              ilike(callSessions.callerNumber, pattern),
              ilike(callSessions.recipientNumber, pattern),
              ilike(callSessions.externalSessionId, pattern)
            )
          )
        )
        .orderBy(desc(callSessions.createdAt))
        .limit(limitPerCategory),
    ]);

    // ── Normalized Result Mapping ──

    // Contacts
    const contacts: SearchResultItem[] =
      contactsRes.status === "fulfilled"
        ? contactsRes.value.map((c) => ({
            id: `contact_${c.id}`,
            type: "contact" as const,
            title: c.name || c.phone || c.email || "Unnamed Contact",
            description:
              [c.email, c.phone].filter(Boolean).join(" • ") || c.summary || null,
            metadata: `Status: ${c.status || "New"}`,
            badge: c.status || "Contact",
            href: `/contacts?q=${encodeURIComponent(c.name || c.email || c.phone || "")}`,
            timestamp: c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : null,
          }))
        : [];

    // Appointments
    const appointmentsMapped: SearchResultItem[] =
      appointmentsRes.status === "fulfilled"
        ? appointmentsRes.value.map((a) => {
            const dateStr = a.startTime
              ? new Date(a.startTime).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })
              : "Date unconfirmed";
            return {
              id: `apt_${a.id}`,
              type: "appointment" as const,
              title: a.customerName || "Customer Appointment",
              description: `${dateStr} • Status: ${a.status}`,
              metadata: a.pricePaid ? `$${a.pricePaid}` : "Booking",
              badge: a.status || "Scheduled",
              href: `/appointments?id=${a.id}`,
              timestamp: a.startTime ? new Date(a.startTime).toISOString() : null,
            };
          })
        : [];

    // Knowledge Documents
    const knowledge: SearchResultItem[] =
      knowledgeRes.status === "fulfilled"
        ? knowledgeRes.value.map((k) => ({
            id: `kb_${k.id}`,
            type: "knowledge" as const,
            title: k.name,
            description: `Format: ${k.fileType ? k.fileType.toUpperCase() : "DOC"} • Status: ${k.status}`,
            metadata: "Knowledge Base",
            badge: k.fileType ? k.fileType.toUpperCase() : "Document",
            href: "/kb",
            timestamp: k.updatedAt ? new Date(k.updatedAt).toLocaleDateString() : null,
          }))
        : [];

    // FAQs
    const faqs: SearchResultItem[] =
      faqsRes.status === "fulfilled"
        ? faqsRes.value.map((f) => ({
            id: `faq_${f.id}`,
            type: "faq" as const,
            title: f.question,
            description:
              f.answer && f.answer.length > 100
                ? f.answer.slice(0, 97) + "..."
                : f.answer,
            metadata: `Category: ${f.category || "General"}`,
            badge: f.category || "FAQ",
            href: "/faqs",
            timestamp: f.updatedAt ? new Date(f.updatedAt).toLocaleDateString() : null,
          }))
        : [];

    // Services
    const servicesMapped: SearchResultItem[] =
      servicesRes.status === "fulfilled"
        ? servicesRes.value.map((s) => ({
            id: `svc_${s.id}`,
            type: "service" as const,
            title: s.name,
            description:
              s.description ||
              (s.duration ? `${s.duration} mins • $${s.price}` : null),
            metadata: `$${s.price}`,
            badge: s.duration ? `${s.duration}m` : "Service",
            href: "/services",
            timestamp: s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : null,
          }))
        : [];

    // Calls
    const calls: SearchResultItem[] =
      callsRes.status === "fulfilled"
        ? callsRes.value.map((c) => ({
            id: `call_${c.id}`,
            type: "call" as const,
            title: `${c.direction === "inbound" ? "Incoming" : "Outgoing"}: ${c.callerNumber} → ${c.recipientNumber}`,
            description: `Duration: ${c.durationSeconds || 0}s • Status: ${c.status}`,
            metadata: "Voice Call",
            badge: c.direction === "inbound" ? "Inbound" : "Outbound",
            href: "/voice/history",
            timestamp: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : null,
          }))
        : [];

    // Navigation
    const navigation = searchNavigation(query, limitPerCategory);

    const totalResults =
      contacts.length +
      appointmentsMapped.length +
      knowledge.length +
      faqs.length +
      servicesMapped.length +
      calls.length +
      navigation.length;

    return {
      success: true,
      query,
      totalResults,
      results: {
        contacts,
        appointments: appointmentsMapped,
        knowledge,
        faqs,
        services: servicesMapped,
        calls,
        navigation,
      },
    };
  } catch (error: any) {
    console.error("Global search service error:", error);
    return {
      success: false,
      query,
      totalResults: 0,
      results: emptyResults,
      error: "Unable to complete search query at this time. Please try again.",
    };
  }
}
