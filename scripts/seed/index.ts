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

async function main() {
  console.log("🌱 Starting complete production-grade seeding process...");
  
  try {
    // 1. Seed Users
    const userIds = await seedUsers();

    // 2. Seed Organization, Memberships, Profile and Settings
    await seedBusiness(userIds);

    // 3. Seed Staff Members & Schedules
    const staff = await seedStaff();

    // 4. Seed Categories and Services List
    const servicesList = await seedServices();

    // 5. Seed Contacts (leadProfiles)
    const contacts = await seedContacts();

    // 6. Seed Appointments & Status History
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
    console.log("📈 Seeding historical businessSnapshots analytics...");
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
      const snapDate = new Date(now);
      snapDate.setDate(now.getDate() - i);
      
      // Gradually improve scores over the month to represent growth
      const baseScore = 75 + Math.floor((30 - i) / 2); // 75 to 90
      
      await db.insert(businessSnapshots).values({
        organizationId: ORG_ID,
        healthScore: Math.min(100, baseScore),
        knowledgeScore: Math.min(100, baseScore + 2),
        crmScore: Math.min(100, baseScore - 5),
        websiteScore: 88,
        aiScore: Math.min(100, baseScore + 1),
        automationScore: Math.min(100, baseScore - 8),
        bookingScore: Math.min(100, baseScore + 4),
        progressPercentage: 80,
        readinessScore: Math.min(100, baseScore - 3),
        createdAt: snapDate,
      }).onConflictDoNothing();
    }

    console.log("✨ Seeding process finished successfully! The dashboard and all pages are fully populated.");
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
