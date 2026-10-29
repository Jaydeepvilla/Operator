import "dotenv/config";
import { db } from "../../src/server/db";
import { businessSnapshots } from "../../src/server/db/schema";
import { seedUsers } from "./users";
import { seedBusiness, ORG_ID } from "./business";
import { seedStaff } from "./staff";
import { seedServices } from "./services";
import { seedContacts } from "./contacts";
import { seedAppointments } from "./appointments";
import { seedKnowledge } from "./knowledge";
import { seedAI } from "./ai";
import { seedConversations } from "./conversations";
import { seedBilling } from "./billing";
import { seedNotifications } from "./notifications";
import { seedActivity } from "./activity";
import { seedTemplates } from "./templates";
import { DatabaseIntegrityService } from "../../src/server/services/database-integrity";

async function main() {
  console.log("🌱 Starting complete production-grade seeding process for Operator Demo Salon...");
  
  try {
    // DB-07: Guard against executing demo seeds in production or against live production databases
    DatabaseIntegrityService.assertSeedExecutionPermitted(
      process.env.NODE_ENV || "development",
      process.env.DATABASE_URL,
      process.env.FORCE_SEED === "true"
    );

    // 1. Seed Users
    const userIds = await seedUsers();

    // 2. Seed Organization, Memberships, Profile and Settings (Operator Demo Salon)
    await seedBusiness(userIds);

    // 3. Seed Categories and Services (Haircut, Hair Styling, Facial)
    const servicesList = await seedServices();

    // 4. Seed Staff Members, Schedules, and Service Assignments (Priya Sharma, Rahul Mehta)
    const staff = await seedStaff();

    // 5. Seed Contacts (leadProfiles - Fictional demo customers)
    const contacts = await seedContacts();

    // 6. Seed Appointments & Status History (confirmed, completed, pending)
    await seedAppointments(contacts, servicesList, staff);

    // 7. Seed Knowledge Base Sources, Categories, Documents, Chunks, and Processing Jobs
    await seedKnowledge();

    // 8. Seed AI component FAQs, qualification flows, voice prompts/settings, and daily voice analytics
    await seedAI();

    // 9. Seed Omnichannel Inbox dialogue interactions and conversation threads
    await seedConversations(contacts);

    // 10. Seed Billing account profiles, credit cards, coupons, invoice receipts, and payments
    await seedBilling();

    // 11. Seed smartNotifications inside Action Center
    await seedNotifications();

    // 12. Seed Recent Activity feed logs
    await seedActivity();

    // 13. Seed WhatsApp, SMS, and Email message templates
    await seedTemplates();

    // 14. Seed Business Snapshots daily records for the past 30 days
    console.log("📈 Seeding historical businessSnapshots analytics for Operator Demo Salon...");
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
      const snapDate = new Date(now);
      snapDate.setDate(now.getDate() - i);
      
      const baseScore = 80 + Math.floor((30 - i) / 2);
      
      await db.insert(businessSnapshots).values({
        organizationId: ORG_ID,
        healthScore: Math.min(100, baseScore),
        knowledgeScore: Math.min(100, baseScore + 2),
        crmScore: Math.min(100, baseScore - 4),
        websiteScore: 92,
        aiScore: Math.min(100, baseScore + 3),
        automationScore: Math.min(100, baseScore - 5),
        bookingScore: Math.min(100, baseScore + 4),
        progressPercentage: 100,
        readinessScore: Math.min(100, baseScore),
        createdAt: snapDate,
      }).onConflictDoNothing();
    }

    console.log("✨ Seeding process finished successfully! Operator Demo Salon is fully populated across all modules.");
  } catch (error) {
    console.error("❌ Seeding execution failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
