import { db } from "../../src/server/db";
import {
  organizations,
  memberships,
  businessProfiles,
  businessSettings
} from "../../src/server/db/schema";

export const ORG_ID = "11111111-1111-1111-1111-111111111111";

export async function seedBusiness(userIds: string[]): Promise<string> {
  console.log("🏢 Seeding organization and business details for Operator Demo Salon...");

  // 1. Create / Update Organization
  await db.insert(organizations).values({
    id: ORG_ID,
    name: "Operator Demo Salon",
    slug: "operator-demo-salon",
    industry: "Salon",
    logo: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&h=200&fit=crop",
    website: "https://www.operatordemosalon.test",
    email: "concierge@operatordemosalon.test",
    phone: "+919876543210",
    address: "Plot 42, Bandra Kurla Complex, Mumbai, Maharashtra 400051, India",
    timezone: "Asia/Kolkata",
    verificationStatus: "verified",
    onboardingStatus: "completed",
    onboardingStep: "completed",
  }).onConflictDoUpdate({
    target: organizations.id,
    set: {
      name: "Operator Demo Salon",
      slug: "operator-demo-salon",
      industry: "Salon",
      website: "https://www.operatordemosalon.test",
      email: "concierge@operatordemosalon.test",
      phone: "+919876543210",
      address: "Plot 42, Bandra Kurla Complex, Mumbai, Maharashtra 400051, India",
      timezone: "Asia/Kolkata",
      verificationStatus: "verified",
      onboardingStatus: "completed",
      onboardingStep: "completed",
      updatedAt: new Date(),
    }
  });

  // 2. Link all test users to organization as owners/managers
  for (const userId of userIds) {
    await db.insert(memberships).values({
      organizationId: ORG_ID,
      userId: userId,
      role: "owner",
    }).onConflictDoNothing();
  }

  // 3. Create / Update Business Profile
  await db.insert(businessProfiles).values({
    organizationId: ORG_ID,
    description: "Operator Demo Salon is an upscale beauty studio providing precision haircuts, bespoke hair styling, and organic herbal facials in Mumbai.",
    logo: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&h=400&fit=crop",
    socialLinks: {
      facebook: "https://facebook.com/operatordemosalon",
      instagram: "https://instagram.com/operatordemosalon",
      yelp: "https://yelp.com/biz/operator-demo-salon"
    },
    googleBusinessUrl: "https://maps.google.com/?cid=987654",
    reviewUrl: "https://g.page/r/operator-demo-salon/review"
  }).onConflictDoUpdate({
    target: businessProfiles.organizationId,
    set: {
      description: "Operator Demo Salon is an upscale beauty studio providing precision haircuts, bespoke hair styling, and organic herbal facials in Mumbai.",
      updatedAt: new Date(),
    }
  });

  // 4. Create / Update Business Settings
  await db.insert(businessSettings).values({
    organizationId: ORG_ID,
    businessHours: {
      monday: { open: "closed", close: "closed" },
      tuesday: { open: "10:00", close: "20:00" },
      wednesday: { open: "10:00", close: "20:00" },
      thursday: { open: "10:00", close: "20:00" },
      friday: { open: "10:00", close: "20:00" },
      saturday: { open: "09:00", close: "21:00" },
      sunday: { open: "10:00", close: "18:00" }
    },
    holidays: ["2026-11-26", "2026-12-25", "2026-01-01"],
    languages: ["en", "hi"],
    bookingPreferences: {
      publicBookingEnabled: true,
      minNoticeHours: 2,
      maxAdvanceDays: 14,
      cancellationNoticeHours: 2,
      currency: "INR",
      currencySymbol: "₹",
      servicesConfigured: true,
      hoursConfigured: true,
      faqsConfigured: true,
      confirmedTasks: ["profile", "hours", "faqs", "services", "widget", "voice"]
    },
    notificationPreferences: {
      appointmentReminders: ["sms", "email"],
      reminderHoursBefore: 24,
      marketingConsentRequired: true
    },
    leadAssignmentRules: {
      routingMode: "round_robin",
      assignToActiveOnly: true
    },
    recommendationPreferences: {
      enableUpselling: true,
      autoSuggestAddons: true
    },
    qualityScoresHistory: [
      { date: "2026-06-01", score: 94 },
      { date: "2026-06-15", score: 96 },
      { date: "2026-07-01", score: 98 }
    ],
    crmSegments: [
      { name: "Loyal Clients", criteria: "visits > 5" },
      { name: "New Guests", criteria: "visits == 1" },
      { name: "Inactive", criteria: "months_since_last_visit >= 2" }
    ],
    websiteImportUrl: "https://www.operatordemosalon.test",
    websiteImportStatus: "imported"
  }).onConflictDoUpdate({
    target: businessSettings.organizationId,
    set: {
      businessHours: {
        monday: { open: "closed", close: "closed" },
        tuesday: { open: "10:00", close: "20:00" },
        wednesday: { open: "10:00", close: "20:00" },
        thursday: { open: "10:00", close: "20:00" },
        friday: { open: "10:00", close: "20:00" },
        saturday: { open: "09:00", close: "21:00" },
        sunday: { open: "10:00", close: "18:00" }
      },
      bookingPreferences: {
        publicBookingEnabled: true,
        minNoticeHours: 2,
        maxAdvanceDays: 14,
        cancellationNoticeHours: 2,
        currency: "INR",
        currencySymbol: "₹",
        servicesConfigured: true,
        hoursConfigured: true,
        faqsConfigured: true,
        confirmedTasks: ["profile", "hours", "faqs", "services", "widget", "voice"]
      },
      updatedAt: new Date(),
    }
  });

  console.log(`✅ Seeded Operator Demo Salon Profile & Settings for Org: ${ORG_ID}`);
  return ORG_ID;
}
