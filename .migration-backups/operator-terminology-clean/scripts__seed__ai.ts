import { db } from "../../src/server/db";
import {
  faqItems,
  qualificationFlows,
  voiceSettings,
  voicePrompts,
  voiceAnalytics
} from "../../src/server/db/schema";
import { ORG_ID } from "./business";

export async function seedAI(): Promise<void> {
  console.log("🤖 Seeding AI FAQs, qualification flows, voice prompts, and voice analytics...");

  // 1. Seed FAQs
  await db.insert(faqItems).values([
    {
      organizationId: ORG_ID,
      question: "What is your cancellation policy?",
      answer: "Appointments must be cancelled or rescheduled at least 24 hours in advance to avoid a fee. Cancellations under 24 hours incur a fee of 50% of the service price. No-shows will be charged 100% of the service price.",
      category: "Policies",
      isActive: true,
      order: 1
    },
    {
      organizationId: ORG_ID,
      question: "Are pets allowed in the treatment rooms?",
      answer: "Under state health board regulations, pets and non-service dogs are strictly prohibited from entering treatment rooms. Certified service animals with proper harnesses are allowed.",
      category: "Policies",
      isActive: true,
      order: 2
    },
    {
      organizationId: ORG_ID,
      question: "Do you offer parking validations?",
      answer: "Yes, we offer complimentary 2-hour parking validations for the garage located directly beneath the building at the Madison St entrance.",
      category: "General",
      isActive: true,
      order: 3
    },
    {
      organizationId: ORG_ID,
      question: "Which skin products do you use in your facials?",
      answer: "We use dermatologist-tested, hypoallergenic clean beauty products, primarily SkinCeuticals and Dermalogica, customized to your specific skin tolerance.",
      category: "Services",
      isActive: true,
      order: 4
    },
    {
      organizationId: ORG_ID,
      question: "Can I book a massage if I am pregnant?",
      answer: "Yes, our Maternity Harmony Massage is specifically designed for expecting mothers. We recommend consulting with your doctor before booking.",
      category: "Services",
      isActive: true,
      order: 5
    },
    {
      organizationId: ORG_ID,
      question: "Do you support walk-ins?",
      answer: "Glow & Grace operates strictly by appointment only to ensure dedicated care. You can easily check real-time availability and book on our website or by texting us.",
      category: "General",
      isActive: true,
      order: 6
    }
  ]).onConflictDoNothing();

  // 2. Seed Qualification Flows
  await db.insert(qualificationFlows).values([
    {
      id: "99999999-5555-1111-1111-111111111111",
      organizationId: ORG_ID,
      question: "What is your primary skincare concern?",
      answerType: "single_select",
      options: ["Acne & Breakouts", "Dryness & Flaking", "Aging & Fine Lines", "Redness & Rosacea", "General Maintenance"],
      isRequired: true,
      order: 1
    },
    {
      id: "99999999-5555-2222-2222-222222222222",
      organizationId: ORG_ID,
      question: "Have you ever had a chemical peel or microdermabrasion before?",
      answerType: "single_select",
      options: ["Yes, regularly", "Yes, but a long time ago", "No, never"],
      isRequired: true,
      order: 2
    },
    {
      id: "99999999-5555-3333-3333-333333333333",
      organizationId: ORG_ID,
      question: "Are you currently using any prescription skincare products (e.g., Retin-A, Accutane)?",
      answerType: "text",
      isRequired: false,
      order: 3
    },
    {
      id: "99999999-5555-4444-4444-444444444444",
      organizationId: ORG_ID,
      question: "Please rate your skin sensitivity on a scale from 1 (very resilient) to 5 (extremely reactive).",
      answerType: "number",
      isRequired: true,
      order: 4
    }
  ]).onConflictDoNothing();

  // 3. Seed Voice Settings
  await db.insert(voiceSettings).values({
    organizationId: ORG_ID,
    voiceName: "Jessica",
    speakingSpeed: "1.05",
    greetingMessage: "Hello! Thank you for calling Glow & Grace Esthetics. I'm Jessica, your AI assistant. How can I help you manage your booking or explore services today?",
    fallbackNumber: "+15559876543",
    businessHoursMode: "hybrid",
    voicemailActive: true
  }).onConflictDoNothing();

  // 4. Seed Voice Prompt
  await db.insert(voicePrompts).values({
    organizationId: ORG_ID,
    name: "Standard Spa Guide Receptionist",
    promptText: "You are Jessica, a friendly and polished AI receptionist for Glow & Grace Esthetics, a luxury wellness and skin studio. Your tone must remain warm, professional, and helpful. You have access to FAQs, schedules, and pricing. Help the client find open slots, answer cancellation rules (24 hrs notice, 50% fee), or route to human staff for emergency exceptions.",
    isActive: true
  }).onConflictDoNothing();

  // 5. Seed Voice Analytics for the past 30 days
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const logDate = new Date(now);
    logDate.setDate(now.getDate() - i);
    const dateStr = logDate.toISOString().split("T")[0];

    // Seed weekly patterns (weekends have fewer calls, mid-week has more)
    const isWeekend = logDate.getDay() === 0 || logDate.getDay() === 6;
    const isMonday = logDate.getDay() === 1;

    let callsAnswered = Math.floor(Math.random() * 20) + 15; // 15 to 35
    let callsMissed = Math.floor(Math.random() * 4) + 1; // 1 to 5
    let bookingsCount = Math.floor(callsAnswered * 0.4); // 40% conversion
    let transfersCount = Math.floor(callsAnswered * 0.1); // 10% transfer rate

    if (isMonday) {
      callsAnswered = Math.floor(Math.random() * 8) + 4; // salon closed
      callsMissed = Math.floor(Math.random() * 5) + 3;
      bookingsCount = Math.floor(callsAnswered * 0.2);
      transfersCount = 0;
    } else if (isWeekend) {
      callsAnswered = Math.floor(Math.random() * 15) + 10;
      callsMissed = Math.floor(Math.random() * 3) + 1;
      bookingsCount = Math.floor(callsAnswered * 0.5); // higher weekend intent
      transfersCount = Math.floor(callsAnswered * 0.05);
    }

    await db.insert(voiceAnalytics).values({
      organizationId: ORG_ID,
      dateStr: dateStr,
      callsAnswered: callsAnswered,
      callsMissed: callsMissed,
      bookingsCount: bookingsCount,
      transfersCount: transfersCount,
      averageDurationSeconds: Math.floor(Math.random() * 60) + 90, // 90 to 150 seconds
      csatAverage: (4.5 + Math.random() * 0.45).toFixed(2), // 4.5 to 4.95
    }).onConflictDoNothing();
  }

  console.log("✅ Seeded AI components & 30 days of Voice analytics data");
}
