import { Page } from "@playwright/test";
import { injectCursor, smoothMove, smoothClick, humanType, smoothScroll } from "./cursor-helper";

export interface DemoSceneDefinition {
  id: number;
  title: string;
  route: string;
  narration: string;
  run: (page: Page, targetDurationMs: number) => Promise<void>;
}

export const DEMO_SCENES: DemoSceneDefinition[] = [
  // Scene 1: Introduction & Executive Dashboard
  {
    id: 1,
    title: "Executive Dashboard & Operations",
    route: "/dashboard",
    narration:
      "Welcome to Operator — the autonomous AI receptionist and front desk platform for appointment-based businesses. Today, we'll demonstrate how Operator Demo Salon in Mumbai automates customer inquiries, manages staff schedules, and books clients twenty-four-seven.",
    run: async (page: Page, targetDurationMs: number) => {
      const startTime = Date.now();
      await injectCursor(page);
      await page.waitForTimeout(1000);

      // Glide cursor across navigation links
      await smoothMove(page, 'a[href="/services"]', 600);
      await smoothMove(page, 'a[href="/staff"]', 600);
      await smoothMove(page, 'a[href="/appointments"]', 600);
      await smoothMove(page, 'a[href="/widget"]', 600);

      // Hover over KPI metrics
      await smoothMove(page, "text=Calls Handled, text=Total Bookings, text=Lifetime", 800);
      await smoothMove(page, "text=Conversion Rate, text=CSAT", 800);

      // Move to Quick Actions
      await smoothMove(page, 'button:has-text("New Appointment")', 800);

      // Scroll down to charts & activity
      await smoothScroll(page, 300, 1500);

      // Pad remaining time
      const elapsed = Date.now() - startTime;
      if (elapsed < targetDurationMs) {
        await page.waitForTimeout(targetDurationMs - elapsed);
      }
    },
  },

  // Scene 2: Business Profile & Operating Hours
  {
    id: 2,
    title: "Business Setup & Operating Hours",
    route: "/onboarding",
    narration:
      "Setting up your business begins with your profile and schedule. For Operator Demo Salon, we've configured our hours from Tuesday to Sunday, ten AM to eight PM. Operator automatically respects these hours so appointments are never booked outside working times.",
    run: async (page: Page, targetDurationMs: number) => {
      const startTime = Date.now();
      await injectCursor(page);
      await page.waitForTimeout(1000);

      // Hover over business name & location fields
      await smoothMove(page, 'input[value*="Operator"], text=Operator Demo Salon', 800);
      await smoothMove(page, 'input[value*="Mumbai"], text=Mumbai', 800);

      // Scroll down to Operating Hours
      await smoothScroll(page, 280, 1200);

      // Glide over operating hours days
      await smoothMove(page, "text=Tuesday, text=Tue", 700);
      await smoothMove(page, "text=Friday, text=Fri", 700);
      await smoothMove(page, "text=Sunday, text=Sun", 700);

      // Hover over save button
      await smoothMove(page, 'button:has-text("Save"), button:has-text("Continue"), button:has-text("Next")', 1000);

      // Pad remaining time
      const elapsed = Date.now() - startTime;
      if (elapsed < targetDurationMs) {
        await page.waitForTimeout(targetDurationMs - elapsed);
      }
    },
  },

  // Scene 3: Salon Services Catalog & Pricing in INR
  {
    id: 3,
    title: "Services Catalog & Pricing in Rupees",
    route: "/services",
    narration:
      "Next is your service catalog. You can define exact treatments, appointment durations, and transparent pricing in rupees — including precision haircuts at 500 rupees, bridal hair styling at 1,200 rupees, and facials at 1,800 rupees. Operator uses this catalog to answer questions and schedule appointments.",
    run: async (page: Page, targetDurationMs: number) => {
      const startTime = Date.now();
      await injectCursor(page);
      await page.waitForTimeout(1000);

      // Glide across services
      await smoothMove(page, "text=Precision Haircut, text=Haircut", 900);
      await smoothMove(page, "text=Bridal, text=Styling", 900);
      await smoothMove(page, "text=Facial, text=Organic", 900);

      // Hover over Add Service button
      await smoothMove(page, 'button:has-text("Add Service"), button:has-text("New Service")', 1000);

      // Smooth scroll to view full list
      await smoothScroll(page, 220, 1500);

      // Pad remaining time
      const elapsed = Date.now() - startTime;
      if (elapsed < targetDurationMs) {
        await page.waitForTimeout(targetDurationMs - elapsed);
      }
    },
  },

  // Scene 4: Stylists, Shifts & Specialist Assignments
  {
    id: 4,
    title: "Staff Specialists & Shifts",
    route: "/staff",
    narration:
      "Under Staff Management, add your specialists and specify their working shifts and eligible treatments. For example, Priya Sharma is our senior stylist handling bridal styling. When clients request Priya, Operator checks her specific shift and availability before offering open slots.",
    run: async (page: Page, targetDurationMs: number) => {
      const startTime = Date.now();
      await injectCursor(page);
      await page.waitForTimeout(1000);

      // Hover over Priya Sharma
      await smoothMove(page, "text=Priya Sharma", 1000);
      await smoothMove(page, "text=Senior Stylist, text=Stylist", 800);

      // Hover over Rahul Mehta
      await smoothMove(page, "text=Rahul Mehta", 1000);

      // Hover over Add Staff button
      await smoothMove(page, 'button:has-text("Add Staff"), button:has-text("New Staff")', 1000);

      // Smooth scroll
      await smoothScroll(page, 180, 1200);

      // Pad remaining time
      const elapsed = Date.now() - startTime;
      if (elapsed < targetDurationMs) {
        await page.waitForTimeout(targetDurationMs - elapsed);
      }
    },
  },

  // Scene 5: AI Receptionist Persona & Salon Policies
  {
    id: 5,
    title: "AI Receptionist Persona & Policies",
    route: "/receptionist",
    narration:
      "Customize your AI receptionist's persona, speaking tone, and custom greeting. In the Knowledge Base, Operator learns your rules — such as our mandatory two-hour cancellation notice and location directions — ensuring accurate, policy-compliant responses every time.",
    run: async (page: Page, targetDurationMs: number) => {
      const startTime = Date.now();
      await injectCursor(page);
      await page.waitForTimeout(1000);

      // Hover over voice persona
      await smoothMove(page, "text=Persona, text=Tone, select, [role='combobox']", 900);

      // Hover over greeting text area
      await smoothMove(page, "textarea, input[placeholder*='greeting'], text=Greeting", 1000);

      // Scroll down to Knowledge Base policies
      await smoothScroll(page, 320, 1200);
      await smoothMove(page, "text=Cancellation, text=Policy, text=Knowledge", 1000);

      // Pad remaining time
      const elapsed = Date.now() - startTime;
      if (elapsed < targetDurationMs) {
        await page.waitForTimeout(targetDurationMs - elapsed);
      }
    },
  },

  // Scene 6: Website Concierge Studio & Live Chat Preview
  {
    id: 6,
    title: "Website Concierge & Live Preview",
    route: "/widget",
    narration:
      "Deploying Operator to your website is seamless. Customize your brand colors and greetings in the Widget Studio, copy the one-line embed code, and preview the live concierge. Visitors on your website can immediately check pricing and schedule appointments.",
    run: async (page: Page, targetDurationMs: number) => {
      const startTime = Date.now();
      await injectCursor(page);
      await page.waitForTimeout(1200);

      // Hover over copy embed script
      await smoothClick(page, 'button:has-text("Copy Embed Script")', 800);

      // Click "Chat View" button to show live interactive chat
      const chatBtn = page.locator('button:has-text("Chat View")');
      if (await chatBtn.isVisible().catch(() => false)) {
        await smoothClick(page, 'button:has-text("Chat View")', 1000);
      }

      // Hover over live chat elements
      await smoothMove(page, "text=Operator Demo Salon, text=Online", 800);
      await smoothMove(page, "text=Hello! How can I help, text=Can I book", 1000);

      // Pad remaining time
      const elapsed = Date.now() - startTime;
      if (elapsed < targetDurationMs) {
        await page.waitForTimeout(targetDurationMs - elapsed);
      }
    },
  },

  // Scene 7: Live Appointment Booking Demonstration
  {
    id: 7,
    title: "Live Booking Demonstration",
    route: "/dashboard",
    narration:
      "Booking a new appointment takes seconds. When a client books, Operator captures their name, phone number, and requested treatment. Let's record a booking for Aanya Kapoor for bridal styling with Priya Sharma. Confirmed instantly with one click.",
    run: async (page: Page, targetDurationMs: number) => {
      const startTime = Date.now();
      await injectCursor(page);
      await page.waitForTimeout(1200);

      // Click "New Appointment" button in Quick Actions
      await smoothClick(page, 'button:has-text("New Appointment")', 1200);

      // Modal is now open! Type customer info
      const nameInput = 'input[placeholder="e.g. Sarah Connor"]';
      await humanType(page, nameInput, "Aanya Kapoor");

      const phoneInput = 'input[placeholder="+1 (555) 000-0000"]';
      await humanType(page, phoneInput, "+91 98201 23456");

      const emailInput = 'input[placeholder="client@example.com"]';
      await humanType(page, emailInput, "aanya.kapoor@example.com");

      // Click Confirm Booking
      await smoothClick(page, 'button:has-text("Confirm Booking")', 1500);

      // Hover over success confirmation
      await smoothMove(page, "text=Appointment Confirmed!, text=Confirmed", 1200);

      // Pad remaining time
      const elapsed = Date.now() - startTime;
      if (elapsed < targetDurationMs) {
        await page.waitForTimeout(targetDurationMs - elapsed);
      }
    },
  },

  // Scene 8: Appointments Management & Calendar Sync
  {
    id: 8,
    title: "Appointments Hub & Calendar View",
    route: "/appointments",
    narration:
      "All bookings appear instantly in the Appointments Hub. Your front desk team has complete visibility over customer contact details, assigned stylists, and appointment statuses, fully synchronized with your team's Google Calendars.",
    run: async (page: Page, targetDurationMs: number) => {
      const startTime = Date.now();
      await injectCursor(page);
      await page.waitForTimeout(1200);

      // Glide over the newly scheduled appointment
      await smoothMove(page, "text=Aanya Kapoor, tr:has-text('Aanya')", 1200);
      await smoothMove(page, "text=Priya Sharma, text=Confirmed", 1000);

      // Move to Staff Filter
      await smoothMove(page, "text=All Staff, button:has-text('Staff')", 800);

      // Smooth scroll
      await smoothScroll(page, 200, 1200);

      // Pad remaining time
      const elapsed = Date.now() - startTime;
      if (elapsed < targetDurationMs) {
        await page.waitForTimeout(targetDurationMs - elapsed);
      }
    },
  },

  // Scene 9: Daily Operations & Call Analytics
  {
    id: 9,
    title: "Operations & Analytics Dashboard",
    route: "/dashboard",
    narration:
      "Back on the Executive Dashboard, business owners gain real-time operational clarity. Monitor appointment volume, live inquiries, conversion rates, and call logs to ensure zero leads are lost during peak rush hours or after doors close.",
    run: async (page: Page, targetDurationMs: number) => {
      const startTime = Date.now();
      await injectCursor(page);
      await page.waitForTimeout(1200);

      // Move across updated metrics
      await smoothMove(page, "text=Calls Handled, text=Conversion Rate", 1000);
      await smoothMove(page, "text=CSAT, text=Avg Duration", 1000);

      // Scroll down to activity feed
      await smoothScroll(page, 320, 1500);
      await smoothMove(page, "text=Activity, text=Recent, text=Confirmed", 1000);

      // Pad remaining time
      const elapsed = Date.now() - startTime;
      if (elapsed < targetDurationMs) {
        await page.waitForTimeout(targetDurationMs - elapsed);
      }
    },
  },

  // Scene 10: Closing & NexxTechnologies Call to Action
  {
    id: 10,
    title: "Closing & NexxTechnologies",
    route: "/",
    narration:
      "With Operator running your front desk, you eliminate missed inquiries, fill your appointment schedule, and free your team to focus on client care. Contact NexxTechnologies today to transform your front desk with Operator AI.",
    run: async (page: Page, targetDurationMs: number) => {
      const startTime = Date.now();
      await injectCursor(page);
      await page.waitForTimeout(1200);

      // Glide over hero title
      await smoothMove(page, "h1, text=Operator", 1000);

      // Hover over CTA buttons
      await smoothMove(page, 'a:has-text("Start Free Trial"), button:has-text("Start Free Trial"), a:has-text("Get Started")', 1000);
      await smoothMove(page, 'a:has-text("Book a Demo"), button:has-text("Book a Demo"), a:has-text("Contact")', 1000);

      // Smooth scroll to showcase product strengths
      await smoothScroll(page, 380, 1800);

      // Pad remaining time
      const elapsed = Date.now() - startTime;
      if (elapsed < targetDurationMs) {
        await page.waitForTimeout(targetDurationMs - elapsed);
      }
    },
  },
];

