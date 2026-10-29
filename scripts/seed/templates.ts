import { db } from "../../src/server/db";
import { messageTemplates } from "../../src/server/db/schema";
import { ORG_ID } from "./business";

export async function seedTemplates(): Promise<void> {
  console.log("📝 Seeding message templates for Operator Demo Salon...");

  await db.insert(messageTemplates).values([
    {
      organizationId: ORG_ID,
      channelType: "whatsapp",
      name: "Salon Booking Confirmation",
      category: "appointment_confirmation",
      variables: ["customer_name", "service_name", "date_time", "staff_name"],
      body: "Hi {{customer_name}}, your booking for {{service_name}} at Operator Demo Salon is confirmed on {{date_time}} with {{staff_name}}. We look forward to seeing you at Bandra Kurla Complex!",
      status: "approved",
      approvedAt: new Date()
    },
    {
      organizationId: ORG_ID,
      channelType: "sms",
      name: "Salon Appointment Reminder",
      category: "appointment_reminder",
      variables: ["customer_name", "time"],
      body: "Friendly reminder: {{customer_name}}, you have an appointment tomorrow at {{time}} at Operator Demo Salon. To cancel or reschedule free of charge, please notify us at least 2 hours prior.",
      status: "approved",
      approvedAt: new Date()
    },
    {
      organizationId: ORG_ID,
      channelType: "email",
      name: "Post-Treatment Feedback and Review",
      category: "review_request",
      variables: ["customer_name", "review_url"],
      subject: "Thank you for visiting Operator Demo Salon — we value your feedback!",
      body: "Hi {{customer_name}}, thank you for choosing Operator Demo Salon! We hope you loved your styling or facial treatment. Please take 1 minute to leave us feedback here: {{review_url}}",
      status: "approved",
      approvedAt: new Date()
    }
  ]).onConflictDoNothing();

  console.log("✅ Seeded message templates for Operator Demo Salon");
}
