"use server";

import { auth } from "@/lib/auth/server";
import { checkUserOrganization } from "./onboarding";
import { db } from "../db";
import {
  organizations,
  businessProfiles,
  businessSettings,
  services,
  serviceCategories,
  staffMembers,
  staffSchedules,
  faqItems,
  appointments,
  leadProfiles,
  operationalExceptions,
} from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { INDUSTRY_TEMPLATES, DEFAULT_BUSINESS_HOURS } from "@/lib/constants/templates";
import { revalidatePath } from "next/cache";
import { DEMO_SCRIPTS, type DemoIndustryScript } from "@/lib/constants/demo-scripts";

export { DEMO_SCRIPTS, type DemoIndustryScript };

export async function getDemoStatusAction() {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const { hasOrg, org } = await checkUserOrganization();
    if (!hasOrg || !org) return { success: false, error: "No organization found" };

    const [profile] = await db
      .select()
      .from(businessProfiles)
      .where(eq(businessProfiles.organizationId, org.id));

    const serviceList = await db
      .select()
      .from(services)
      .where(eq(services.organizationId, org.id));

    const staffList = await db
      .select()
      .from(staffMembers)
      .where(eq(staffMembers.organizationId, org.id));

    const appointmentList = await db
      .select()
      .from(appointments)
      .where(eq(appointments.organizationId, org.id));

    return {
      success: true,
      data: {
        organizationId: org.id,
        name: org.name,
        slug: org.slug,
        industry: org.industry,
        servicesCount: serviceList.length,
        staffCount: staffList.length,
        appointmentsCount: appointmentList.length,
        bookingUrl: `/book/${org.slug}`,
        isSampleData: true,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load demo status" };
  }
}

export async function switchDemoIndustryAction(industryKey: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const { hasOrg, org } = await checkUserOrganization();
    if (!hasOrg || !org) return { success: false, error: "No organization found" };

    const script = DEMO_SCRIPTS.find((s) => s.id === industryKey || s.industry === industryKey);
    if (!script) {
      return { success: false, error: `Invalid demo industry: ${industryKey}` };
    }

    // Map script to template
    let templateName = "Salon";
    if (script.industry.includes("Dental")) templateName = "Dental Clinic";
    else if (script.industry.includes("Medical")) templateName = "Medical Clinic";
    else if (script.industry.includes("Spa")) templateName = "Spa";
    else if (script.industry.includes("Law")) templateName = "Law Firm";

    const template = INDUSTRY_TEMPLATES[templateName] || INDUSTRY_TEMPLATES["Salon"];

    // 1. Update organization name and industry
    await db
      .update(organizations)
      .set({
        name: script.businessName,
        industry: script.industry,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, org.id));

    // 2. Update business profile & business settings
    await db
      .update(businessProfiles)
      .set({
        description: script.tagline,
        updatedAt: new Date(),
      })
      .where(eq(businessProfiles.organizationId, org.id));

    await db
      .update(businessSettings)
      .set({
        businessHours: template.businessHours,
      })
      .where(eq(businessSettings.organizationId, org.id));

    // 3. Clear existing services for this demo org and insert template services
    await db.delete(services).where(eq(services.organizationId, org.id));
    for (const s of template.services) {
      await db.insert(services).values({
        organizationId: org.id,
        name: s.name,
        description: s.description,
        duration: s.duration,
        price: s.price,
        isActive: true,
      });
    }

    // 4. Update or insert demo FAQs
    await db.delete(faqItems).where(eq(faqItems.organizationId, org.id));
    for (const f of template.faqs) {
      await db.insert(faqItems).values({
        organizationId: org.id,
        question: f.question,
        answer: f.answer,
        category: f.category,
        isActive: true,
      });
    }

    revalidatePath("/demo-center");
    revalidatePath("/dashboard");
    revalidatePath(`/book/${org.slug}`);

    return {
      success: true,
      message: `Demo business successfully updated to ${script.businessName} (${script.industry})`,
      data: {
        businessName: script.businessName,
        industry: script.industry,
        servicesCount: template.services.length,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to switch demo industry" };
  }
}

export async function resetDemoDataAction() {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const { hasOrg, org } = await checkUserOrganization();
    if (!hasOrg || !org) return { success: false, error: "No organization found" };

    const isDemoOrg = DEMO_SCRIPTS.some(
      (s) => s.businessName.toLowerCase() === org.name.toLowerCase()
    ) || Boolean(org.slug?.includes("demo"));

    if (isDemoOrg) {
      // In an isolated demo organization, clear demo-generated operational queues and appointments
      await db
        .delete(operationalExceptions)
        .where(eq(operationalExceptions.organizationId, org.id));
      await db
        .delete(appointments)
        .where(eq(appointments.organizationId, org.id));
    } else {
      // In a real production organization, protect real customer records!
      // Only delete explicitly tagged sample/demo test records. Never touch real customer bookings or paid appointments.
      await db
        .delete(operationalExceptions)
        .where(
          and(
            eq(operationalExceptions.organizationId, org.id),
            sql`(${operationalExceptions.title} LIKE '%[DEMO]%' OR ${operationalExceptions.title} LIKE '%Twilio returned error 30008%' OR ${operationalExceptions.title} LIKE '%WhatsApp Business Token Expired%')`
          )
        );

      await db
        .delete(appointments)
        .where(
          and(
            eq(appointments.organizationId, org.id),
            sql`(${appointments.customerName} LIKE '%[DEMO]%' OR ${appointments.customerEmail} LIKE '%demo%' OR ${appointments.customerName} = 'Alex Mercer' OR ${appointments.customerName} LIKE '%Test%')`
          )
        );
    }

    revalidatePath("/demo-center");
    revalidatePath("/escalations");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: isDemoOrg
        ? `Demo environment reset successfully. Demo appointments and exception queues cleared.`
        : `Safe demo cleanup completed: Isolated demo test records cleared. Real customer records and financial history preserved.`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to reset demo environment" };
  }
}
