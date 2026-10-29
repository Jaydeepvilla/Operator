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
  console.log("🤖 Seeding AI FAQs, qualification flows, and voice settings for Operator Demo Salon...");

  // 1. Seed FAQs
  const salonFaqs = [
    {
      id: "fa000000-1001-1111-1111-111111111111",
      organizationId: ORG_ID,
      question: "What is your cancellation and no-show policy?",
      answer: "Appointments may be cancelled or rescheduled up to 2 hours prior to the scheduled start time free of charge. Cancellations under 2 hours or no-shows may incur a 20% demonstration fee.",
      category: "Policies",
      isActive: true,
      order: 1
    },
    {
      id: "fa000000-1002-1111-1111-111111111111",
      organizationId: ORG_ID,
      question: "What are your business hours?",
      answer: "Operator Demo Salon is open Tuesday through Friday from 10:00 AM to 8:00 PM, Saturday from 9:00 AM to 9:00 PM, and Sunday from 10:00 AM to 6:00 PM. We are closed every Monday.",
      category: "General",
      isActive: true,
      order: 2
    },
    {
      id: "fa000000-1003-1111-1111-111111111111",
      organizationId: ORG_ID,
      question: "What services do you offer and what are their prices?",
      answer: "We offer three core services: Haircut (30 minutes, INR 500), Hair Styling (45 minutes, INR 800), and our signature Rejuvenating Herbal Facial (60 minutes, INR 1500).",
      category: "Services",
      isActive: true,
      order: 3
    },
    {
      id: "fa000000-1004-1111-1111-111111111111",
      organizationId: ORG_ID,
      question: "Where are you located?",
      answer: "We are located at Plot 42, Bandra Kurla Complex, Mumbai, Maharashtra 400051, India. Valet parking is available for all guests.",
      category: "General",
      isActive: true,
      order: 4
    },
    {
      id: "fa000000-1005-1111-1111-111111111111",
      organizationId: ORG_ID,
      question: "Do you accept walk-ins or are appointments required?",
      answer: "We strongly recommend booking in advance through our AI receptionist or website. Walk-ins are accommodated strictly based on daily stylist availability.",
      category: "General",
      isActive: true,
      order: 5
    },
    {
      id: "fa000000-1006-1111-1111-111111111111",
      organizationId: ORG_ID,
      question: "How far in advance can I book an appointment?",
      answer: "Appointments can be scheduled up to 14 days in advance with at least 2 hours advance notice required for same-day bookings.",
      category: "Policies",
      isActive: true,
      order: 6
    }
  ];

  for (const faq of salonFaqs) {
    await db.insert(faqItems).values(faq).onConflictDoUpdate({
      target: faqItems.id,
      set: {
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        isActive: faq.isActive,
        order: faq.order,
        updatedAt: new Date(),
      }
    });
  }

  // 2. Seed Qualification Flows
  await db.insert(qualificationFlows).values([
    {
      id: "99999999-5555-1111-1111-111111111111",
      organizationId: ORG_ID,
      question: "What service are you looking to book today?",
      answerType: "single_select",
      options: ["Haircut", "Hair Styling", "Facial", "Multiple Services"],
      isRequired: true,
      order: 1
    },
    {
      id: "99999999-5555-2222-2222-222222222222",
      organizationId: ORG_ID,
      question: "Do you have any skin or scalp sensitivities we should be aware of?",
      answerType: "text",
      options: [],
      isRequired: false,
      order: 2
    }
  ]).onConflictDoNothing();

  // 3. Seed Voice Settings
  await db.insert(voiceSettings).values({
    id: "99999999-7777-1111-1111-111111111111",
    organizationId: ORG_ID,
    voiceName: "Priya",
    speakingSpeed: "1.0",
    greetingMessage: "Hello! Welcome to Operator Demo Salon in Mumbai. I am your AI receptionist. How can I help you with your haircut, hair styling, or herbal facial booking today?",
    fallbackNumber: "+919876543210",
    businessHoursMode: "hybrid",
    voicemailActive: true
  }).onConflictDoUpdate({
    target: voiceSettings.id,
    set: {
      voiceName: "Priya",
      greetingMessage: "Hello! Welcome to Operator Demo Salon in Mumbai. I am your AI receptionist. How can I help you with your haircut, hair styling, or herbal facial booking today?",
      fallbackNumber: "+919876543210",
      updatedAt: new Date(),
    }
  });

  // 4. Seed Voice Prompt
  await db.insert(voicePrompts).values({
    id: "99999999-8888-1111-1111-111111111111",
    organizationId: ORG_ID,
    name: "Operator Demo Salon AI Receptionist",
    promptText: "You are Priya, the AI receptionist for Operator Demo Salon, an upscale salon and beauty studio located in Bandra Kurla Complex, Mumbai. You speak with a warm, professional, courteous tone. You assist guests with booking Haircut (INR 500, 30 min), Hair Styling (INR 800, 45 min), and Rejuvenating Herbal Facial (INR 1500, 60 min). We are open Tuesday through Sunday (closed Mondays). Answer questions about our policies (2 hours cancellation notice, up to 14 days advance booking) and help clients select convenient open slots.",
    isActive: true
  }).onConflictDoUpdate({
    target: voicePrompts.id,
    set: {
      promptText: "You are Priya, the AI receptionist for Operator Demo Salon, an upscale salon and beauty studio located in Bandra Kurla Complex, Mumbai. You speak with a warm, professional, courteous tone. You assist guests with booking Haircut (INR 500, 30 min), Hair Styling (INR 800, 45 min), and Rejuvenating Herbal Facial (INR 1500, 60 min). We are open Tuesday through Sunday (closed Mondays). Answer questions about our policies (2 hours cancellation notice, up to 14 days advance booking) and help clients select convenient open slots.",
      isActive: true,
    }
  });

  // 5. Seed Voice Analytics for the past 30 days
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const logDate = new Date(now);
    logDate.setDate(now.getDate() - i);
    const dateStr = logDate.toISOString().split("T")[0];

    const dayOfWeek = logDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isMonday = dayOfWeek === 1;

    const totalCalls = isMonday ? 4 : isWeekend ? 15 : 28;
    const missedCalls = isMonday ? 1 : 2;
    const answeredCalls = totalCalls - missedCalls;

    await db.insert(voiceAnalytics).values({
      organizationId: ORG_ID,
      dateStr: dateStr,
      callsAnswered: answeredCalls,
      callsMissed: missedCalls,
      bookingsCount: Math.floor(answeredCalls * 0.4),
      transfersCount: 1,
      averageDurationSeconds: 125,
      csatAverage: "4.8",
    }).onConflictDoNothing();
  }

  console.log("✅ Seeded AI components & 30 days of Voice analytics data for Operator Demo Salon");
}
