import { db } from "../db";
import {
  organizations,
  businessProfiles,
  businessSettings,
  services,
  faqItems,
  staffMembers,
} from "../db/schema";
import { eq, and } from "drizzle-orm";

export interface BusinessCapabilities {
  hasServices: boolean;
  hasPricing: boolean;
  hasBooking: boolean;
  hasBusinessHours: boolean;
  hasLocation: boolean;
  hasPhone: boolean;
  hasFaqs: boolean;
}

export interface BusinessContext {
  organizationId: string;
  name: string;
  industry: string;
  timezone: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  description: string | null;
  businessHours: any | null;
  businessHoursFormatted: string;
  holidays: string[];
  bookingPreferences: any;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    duration: number;
    price: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
    category: string;
  }>;
  staff: Array<{
    id: string;
    name: string;
    role: string | null;
  }>;
  capabilities: BusinessCapabilities;
}

function formatWeeklyHours(hoursObj: any): string {
  if (!hoursObj || typeof hoursObj !== "object") {
    return "Monday to Friday: 9:00 AM – 5:00 PM";
  }

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const lines: string[] = [];

  for (const day of days) {
    const dayConfig = hoursObj[day];
    const dayCap = day.charAt(0).toUpperCase() + day.slice(1);
    if (!dayConfig || dayConfig.isClosed) {
      lines.push(`${dayCap}: Closed`);
    } else if (dayConfig.open && dayConfig.close) {
      lines.push(`${dayCap}: ${dayConfig.open} – ${dayConfig.close}`);
    }
  }

  return lines.length > 0 ? lines.join(", ") : "Standard business hours apply.";
}

export const businessContextService = {
  async getContext(organizationId: string): Promise<BusinessContext> {
    let org: any = null;
    let profile: any = null;
    let settings: any = null;
    let activeServices: any[] = [];
    let activeFaqs: any[] = [];
    let activeStaff: any[] = [];

    try {
      const orgs = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId));
      org = orgs[0] || null;

      if (org) {
        const [profiles, settingsList, servicesList, faqsList, staffList] = await Promise.all([
          db
            .select()
            .from(businessProfiles)
            .where(eq(businessProfiles.organizationId, organizationId)),
          db
            .select()
            .from(businessSettings)
            .where(eq(businessSettings.organizationId, organizationId)),
          db
            .select()
            .from(services)
            .where(
              and(
                eq(services.organizationId, organizationId),
                eq(services.isActive, true),
                eq(services.isArchived, false)
              )
            ),
          db
            .select()
            .from(faqItems)
            .where(
              and(
                eq(faqItems.organizationId, organizationId),
                eq(faqItems.isActive, true)
              )
            ),
          db
            .select()
            .from(staffMembers)
            .where(
              and(
                eq(staffMembers.organizationId, organizationId),
                eq(staffMembers.isActive, true)
              )
            ),
        ]);

        profile = profiles[0] || null;
        settings = settingsList[0] || null;
        activeServices = servicesList || [];
        activeFaqs = faqsList || [];
        activeStaff = staffList || [];
      }
    } catch (error) {
      console.warn("[BusinessContextService] Error fetching business context:", error);
    }

    const orgName = org?.name || "Our Business";
    const orgIndustry = org?.industry || "Professional Services";
    const orgTimezone = org?.timezone || "UTC";
    const orgWebsite = org?.website || null;
    const orgPhone = org?.phone || null;
    const orgEmail = org?.email || null;
    const orgAddress = org?.address || null;
    const orgDescription = profile?.description || null;
    const rawHours = settings?.businessHours || null;
    const formattedHours = formatWeeklyHours(rawHours);
    const holidays = settings?.holidays || [];
    const bookingPrefs = settings?.bookingPreferences || {};

    const cleanServices = activeServices.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      duration: s.duration,
      price: s.price,
    }));

    const cleanFaqs = activeFaqs.map((f) => ({
      question: f.question,
      answer: f.answer,
      category: f.category || "General",
    }));

    const cleanStaff = activeStaff.map((st) => ({
      id: st.id,
      name: st.name,
      role: st.role || null,
    }));

    const capabilities: BusinessCapabilities = {
      hasServices: cleanServices.length > 0,
      hasPricing: cleanServices.some((s) => s.price && s.price !== "0" && s.price !== "0.00"),
      hasBooking: cleanServices.length > 0 && cleanStaff.length > 0,
      hasBusinessHours: rawHours !== null && Object.keys(rawHours || {}).length > 0,
      hasLocation: Boolean(orgAddress && orgAddress.trim().length > 0),
      hasPhone: Boolean(orgPhone && orgPhone.trim().length > 0),
      hasFaqs: cleanFaqs.length > 0,
    };

    return {
      organizationId,
      name: orgName,
      industry: orgIndustry,
      timezone: orgTimezone,
      website: orgWebsite,
      phone: orgPhone,
      email: orgEmail,
      address: orgAddress,
      description: orgDescription,
      businessHours: rawHours,
      businessHoursFormatted: formattedHours,
      holidays,
      bookingPreferences: bookingPrefs,
      services: cleanServices,
      faqs: cleanFaqs,
      staff: cleanStaff,
      capabilities,
    };
  },
};
