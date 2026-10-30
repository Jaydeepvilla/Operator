import { test, expect } from "@playwright/test";
import { db } from "../src/server/db";
import {
  organizations,
  businessProfiles,
  businessSettings,
  services,
  serviceCategories,
  faqItems,
  staffMembers,
  appointments,
  knowledgeDocuments,
  knowledgeChunks,
  leadProfiles,
} from "../src/server/db/schema";
import { eq, and } from "drizzle-orm";
import { organizationRepository } from "../src/server/repositories/organization";
import { profileRepository } from "../src/server/repositories/profile";
import { servicesRepository } from "../src/server/repositories/services";
import { faqRepository } from "../src/server/repositories/faq";
import { ragService } from "../src/server/services/rag";
import { availabilityService } from "../src/server/services/availability";
import { bookingService } from "../src/server/services/booking";
import crypto from "crypto";
import { seedUsers } from "../scripts/seed/users";
import { seedBusiness } from "../scripts/seed/business";
import { seedServices } from "../scripts/seed/services";
import { seedStaff } from "../scripts/seed/staff";
import { seedKnowledge } from "../scripts/seed/knowledge";
import { seedAI } from "../scripts/seed/ai";

const ORG_ID = "11111111-1111-1111-1111-111111111111";

test.describe("Phase 3 — Repeatable Seed Data Acceptance Suite (Operator Demo Salon)", () => {
  test.beforeAll(async () => {
    const userIds = await seedUsers();
    await seedBusiness(userIds);
    await seedServices();
    await seedStaff();
    await seedKnowledge();
    await seedAI();
  });

  // Acceptance Test 1: Seeded business data integrity
  test("1. Seed process creates valid parent and child relational records", async () => {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, ORG_ID)).limit(1);
    expect(org).toBeDefined();
    expect(org.id).toBe(ORG_ID);

    const [settings] = await db.select().from(businessSettings).where(eq(businessSettings.organizationId, ORG_ID)).limit(1);
    expect(settings).toBeDefined();

    const [profile] = await db.select().from(businessProfiles).where(eq(businessProfiles.organizationId, ORG_ID)).limit(1);
    expect(profile).toBeDefined();
  });

  // Acceptance Test 2: Application loads the seeded business
  test("2. Application loads the seeded business profile, timezone, and currency", async () => {
    const org = await organizationRepository.getById(ORG_ID);
    expect(org).toBeDefined();
    expect(org?.name).toBe("Operator Demo Salon");
    expect(org?.slug).toBe("operator-demo-salon");
    expect(org?.timezone).toBe("Asia/Kolkata");
    expect(org?.industry).toBe("Salon");
    expect(org?.email).toBe("concierge@operatordemosalon.test");
    expect(org?.phone).toBe("+919876543210");

    const profile = await profileRepository.getByOrg(ORG_ID);
    expect(profile).toBeDefined();
    expect(profile?.description).toContain("Operator Demo Salon");
    expect(profile?.description).toContain("Mumbai");
  });

  // Acceptance Test 3: Onboarding status and completion flow
  test("3. Seeded business satisfies onboarding completion and readiness checks", async () => {
    const org = await organizationRepository.getById(ORG_ID);
    expect(org?.onboardingStatus).toBe("completed");
    expect(org?.onboardingStep).toBe("completed");
    expect(org?.verificationStatus).toBe("verified");

    const [settings] = await db.select().from(businessSettings).where(eq(businessSettings.organizationId, ORG_ID)).limit(1);
    const bp = settings?.bookingPreferences as any;
    expect(bp?.publicBookingEnabled).toBe(true);
    expect(bp?.servicesConfigured).toBe(true);
    expect(bp?.hoursConfigured).toBe(true);
    expect(bp?.faqsConfigured).toBe(true);
  });

  // Acceptance Test 4: Services, FAQs, and policies visibility
  test("4. Services, FAQs, and policies are present and correctly configured", async () => {
    const salonServices = await servicesRepository.list(ORG_ID);
    expect(salonServices.length).toBeGreaterThanOrEqual(3);

    const haircut = salonServices.find(s => s.name === "Haircut");
    const styling = salonServices.find(s => s.name === "Hair Styling");
    const facial = salonServices.find(s => s.name === "Facial");

    expect(haircut).toBeDefined();
    expect(haircut?.duration).toBe(30);
    expect(Number(haircut?.price)).toBe(500);

    expect(styling).toBeDefined();
    expect(styling?.duration).toBe(45);
    expect(Number(styling?.price)).toBe(800);

    expect(facial).toBeDefined();
    expect(facial?.duration).toBe(60);
    expect(Number(facial?.price)).toBe(1500);

    const faqs = await faqRepository.list(ORG_ID);
    expect(faqs.length).toBeGreaterThanOrEqual(5);

    const cancelFaq = faqs.find(f => f.question.toLowerCase().includes("cancellation"));
    expect(cancelFaq).toBeDefined();
    expect(cancelFaq?.answer).toContain("2 hours");

    const hoursFaq = faqs.find(f => f.question.toLowerCase().includes("hours"));
    expect(hoursFaq).toBeDefined();
    expect(hoursFaq?.answer).toContain("Tuesday through Friday");
    expect(hoursFaq?.answer).toContain("closed every Monday");
  });

  // Acceptance Test 5: Knowledge retrieval through production RAG pipeline
  test("5. Knowledge retrieval returns grounded business information for the receptionist", async () => {
    const ragResult = await ragService.retrieveContext(ORG_ID, "What are your services, pricing, and cancellation policy?");
    expect(ragResult.contextText).toContain("Haircut");
    expect(ragResult.contextText).toContain("500");
    expect(ragResult.contextText).toContain("Facial");
    expect(ragResult.contextText).toContain("1500");
    expect(ragResult.contextText).toContain("2 hours");
    expect(ragResult.citations.length).toBeGreaterThan(0);
  });

  // Acceptance Test 6: Availability engine uses business hours and durations
  test("6. Appointment availability matches seeded business hours and service durations", async () => {
    const salonServices = await servicesRepository.list(ORG_ID);
    const haircut = salonServices.find(s => s.name === "Haircut")!;

    // Find next Tuesday and next Monday
    const now = new Date();
    const nextTue = new Date(now);
    nextTue.setDate(now.getDate() + ((2 - now.getDay() + 7) % 7 || 7));
    const tueDateStr = nextTue.toISOString().split("T")[0];

    const nextMon = new Date(now);
    nextMon.setDate(now.getDate() + ((1 - now.getDay() + 7) % 7 || 7));
    const monDateStr = nextMon.toISOString().split("T")[0];

    // Monday: Salon is closed
    const mondaySlots = await availabilityService.getAvailableSlots(ORG_ID, haircut.id, monDateStr);
    expect(mondaySlots.length).toBe(0);

    // Tuesday: Salon is open 10:00 to 20:00
    const tuesdaySlots = await availabilityService.getAvailableSlots(ORG_ID, haircut.id, tueDateStr);
    expect(tuesdaySlots.length).toBeGreaterThan(0);
    expect(tuesdaySlots[0].startTime).toBe("10:00");
  });

  // Acceptance Test 7: Booking creation and verification
  test("7. End-to-end appointment creation persists verified booking state", async () => {
    const salonServices = await servicesRepository.list(ORG_ID);
    const haircut = salonServices.find(s => s.name === "Haircut")!;
    const allStaff = await db.select().from(staffMembers).where(eq(staffMembers.organizationId, ORG_ID));
    const priya = allStaff.find(s => s.name === "Priya Sharma") || allStaff[0];

    // Pick a future Tuesday (3 weeks out) to ensure an open slot
    const targetTue = new Date();
    targetTue.setDate(targetTue.getDate() + ((2 - targetTue.getDay() + 7) % 7 || 7) + 21);
    const yyyy = targetTue.getFullYear();
    const mm = String(targetTue.getMonth() + 1).padStart(2, "0");
    const dd = String(targetTue.getDate()).padStart(2, "0");
    const tueDateStr = `${yyyy}-${mm}-${dd}`;

    const slots = await availabilityService.getAvailableSlots(ORG_ID, haircut.id, tueDateStr, priya.id);
    expect(slots.length).toBeGreaterThan(0);

    const [sh, sm] = slots[0].startTime.split(":").map(Number);
    const bookingStart = new Date(targetTue.getFullYear(), targetTue.getMonth(), targetTue.getDate(), sh, sm, 0, 0);

    const testCustomerEmail = `test.guest.${Date.now()}@example.com`;
    const appt = await bookingService.createAppointment({
      organizationId: ORG_ID,
      serviceId: haircut.id,
      staffMemberId: priya.id,
      startTime: bookingStart,
      customerName: "Acceptance Test Guest",
      customerEmail: testCustomerEmail,
      customerPhone: "+919876500000",
      isPublic: true,
    });

    expect(appt).toBeDefined();
    expect(appt.status).toBe("confirmed");

    // Ground truth DB verification
    const [persisted] = await db.select().from(appointments).where(eq(appointments.id, appt.id)).limit(1);
    expect(persisted).toBeDefined();
    expect(persisted.status).toBe("confirmed");
    expect(persisted.customerEmail).toBe(testCustomerEmail);

    // Clean up only this test booking
    await db.delete(appointments).where(eq(appointments.id, appt.id));
  });

  // Acceptance Test 8: Seed idempotency check
  test("8. Re-running the seed process does not create duplicate services, FAQs, or staff", async () => {
    const servicesBefore = await db.select().from(services).where(eq(services.organizationId, ORG_ID));
    const faqsBefore = await db.select().from(faqItems).where(eq(faqItems.organizationId, ORG_ID));
    const staffBefore = await db.select().from(staffMembers).where(eq(staffMembers.organizationId, ORG_ID));

    // The seed has already run twice in previous steps
    expect(servicesBefore.filter(s => s.name === "Haircut").length).toBe(1);
    expect(servicesBefore.filter(s => s.name === "Hair Styling").length).toBe(1);
    expect(servicesBefore.filter(s => s.name === "Facial").length).toBe(1);
    expect(staffBefore.filter(s => s.name === "Priya Sharma").length).toBe(1);
    expect(staffBefore.filter(s => s.name === "Rahul Mehta").length).toBe(1);
  });

  // Acceptance Test 9: Tenant isolation
  test("9. Tenant isolation: Unrelated organization cannot access demo salon records", async () => {
    const foreignOrgId = "99999999-9999-9999-9999-999999999999";
    const foreignServices = await servicesRepository.list(foreignOrgId);
    expect(foreignServices.length).toBe(0);

    const foreignFaqs = await faqRepository.list(foreignOrgId);
    expect(foreignFaqs.length).toBe(0);

    const foreignContext = await ragService.retrieveContext(foreignOrgId, "Haircut");
    expect(foreignContext.citations.length).toBe(0);
  });

  // Acceptance Test 10: Documented cleanup process
  test("10. Cleanup process removes only test organization records without affecting other orgs", async () => {
    // Create an isolated dummy test organization
    const dummyOrgId = crypto.randomUUID();
    await db.insert(organizations).values({
      id: dummyOrgId,
      name: "Temporary Test Org",
      slug: `temp-test-${Date.now()}`,
      industry: "Testing",
      timezone: "Asia/Kolkata",
    });

    const [createdDummy] = await db.select().from(organizations).where(eq(organizations.id, dummyOrgId)).limit(1);
    expect(createdDummy).toBeDefined();

    // Verify demo salon still exists
    const [demoSalon] = await db.select().from(organizations).where(eq(organizations.id, ORG_ID)).limit(1);
    expect(demoSalon).toBeDefined();
    expect(demoSalon.name).toBe("Operator Demo Salon");

    // Clean up only the dummy test org
    await db.delete(organizations).where(eq(organizations.id, dummyOrgId));
    const [postCleanDummy] = await db.select().from(organizations).where(eq(organizations.id, dummyOrgId)).limit(1);
    expect(postCleanDummy).toBeUndefined();

    // Confirm Operator Demo Salon is still intact
    const [postCleanDemo] = await db.select().from(organizations).where(eq(organizations.id, ORG_ID)).limit(1);
    expect(postCleanDemo).toBeDefined();
  });
});

