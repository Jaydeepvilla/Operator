export interface ClientDemoChapter {
  chapterNumber: number;
  title: string;
  subtitle: string;
  route: string;
  narration: string;
  setupActions?: (page: any) => Promise<void>;
}

export const CLIENT_DEMO_CHAPTERS: ClientDemoChapter[] = [
  {
    chapterNumber: 1,
    title: "The Business Problem",
    subtitle: "Missed Calls & Slow Replies Cost Appointments",
    route: "/",
    narration:
      "For appointment-based businesses like salons, clinics, and studios, every missed call or delayed reply is a lost customer. When your team is busy serving clients or your doors are closed after hours, high-intent inquiries slip away to competitors.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.scrollTo({ top: 400, behavior: "smooth" }));
      await page.waitForTimeout(1500);
    },
  },
  {
    chapterNumber: 2,
    title: "Introducing Operator",
    subtitle: "Autonomous 24/7 AI Receptionist & Front Desk Operations",
    route: "/dashboard",
    narration:
      "Introducing Operator, the autonomous AI receptionist that runs your front desk around the clock. Operator answers customer questions, checks live staff availability, and books confirmed appointments directly into your business calendar.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.scrollTo({ top: 250, behavior: "smooth" }));
      await page.waitForTimeout(1500);
    },
  },
  {
    chapterNumber: 3,
    title: "Fast Business Setup",
    subtitle: "Hours, Staff & Services Configured in Minutes",
    route: "/onboarding",
    narration:
      "Setting up your business takes just minutes. Here for Operator Demo Salon in Mumbai, we have configured weekly operating hours, staff schedules, and a curated service menu including precision haircuts, hair styling, and organic facials with clear pricing in rupees.",
    setupActions: async (page) => {
      await page.waitForTimeout(2500);
    },
  },
  {
    chapterNumber: 4,
    title: "Tailored AI Persona & Policies",
    subtitle: "Custom Tone, Salon Policies & Service FAQs",
    route: "/receptionist",
    narration:
      "You have complete control over how Operator represents your brand. Customize the greeting, speaking tone, and booking rules. Operator strictly follows your approved salon policies, including your mandatory cancellation notice, ensuring professional customer service.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.scrollTo({ top: 280, behavior: "smooth" }));
      await page.waitForTimeout(1500);
    },
  },
  {
    chapterNumber: 5,
    title: "A Customer Asks a Question",
    subtitle: "Live Web Concierge Answering Service Inquiries",
    route: "/widget-studio",
    narration:
      "When a customer visits your website or messages your business asking about treatment pricing or services, Operator responds instantly. Grounded directly in your knowledge base, it provides accurate, friendly answers without human delay.",
    setupActions: async (page) => {
      await page.waitForTimeout(1500);
      const chatBtn = page.locator('button:has-text("Chat View")');
      if (await chatBtn.isVisible()) {
        await chatBtn.click();
      }
      await page.waitForTimeout(1800);
    },
  },
  {
    chapterNumber: 6,
    title: "Checking Live Availability",
    subtitle: "Synchronized with Working Hours & Stylist Shifts",
    route: "/appointments",
    narration:
      "When a customer asks for an appointment, Operator instantly verifies actual availability against your business hours and active stylist shifts. Clients only see genuine open slots, completely eliminating accidental double-bookings.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
    },
  },
  {
    chapterNumber: 7,
    title: "Seamless Appointment Booking",
    subtitle: "Confirmed Bookings Saved Directly to Calendar",
    route: "/appointments",
    narration:
      "The client selects their time, and Operator immediately secures the reservation. The booking is instantly confirmed and saved directly into the calendar, sending automated confirmations that keep clients informed and reduce no-shows.",
    setupActions: async (page) => {
      await page.waitForTimeout(1500);
      const newBtn = page.locator('button:has-text("Book New Appointment"), button:has-text("New Booking")');
      if (await newBtn.first().isVisible()) {
        await newBtn.first().click();
        await page.waitForTimeout(1500);
      }
    },
  },
  {
    chapterNumber: 8,
    title: "Managing Appointments",
    subtitle: "Complete Visibility Over Bookings & Customer Profiles",
    route: "/appointments",
    narration:
      "Inside the Appointments hub, your team has complete visibility. View upcoming bookings, customer contact details, and assigned stylists. Rescheduling or updating appointment status is fast and intuitive.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.scrollTo({ top: 300, behavior: "smooth" }));
      await page.waitForTimeout(1500);
    },
  },
  {
    chapterNumber: 9,
    title: "Business Owner Dashboard",
    subtitle: "Daily Operations, Call Logs & Inquiries at a Glance",
    route: "/dashboard",
    narration:
      "The Executive Dashboard gives business owners real-time clarity. Monitor daily appointment volume, live inquiries, conversion rates, and revenue performance across all communication channels in one central view.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.scrollTo({ top: 320, behavior: "smooth" }));
      await page.waitForTimeout(1500);
    },
  },
  {
    chapterNumber: 10,
    title: "Connected to Your Tools",
    subtitle: "Calendar Sync, Telephony Lines & Web Widgets",
    route: "/integrations",
    narration:
      "Operator fits right into your existing business setup. Connect with Google Calendar for live two-way synchronization, integrate dedicated business phone lines, and embed the responsive web concierge on any website in seconds.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.scrollTo({ top: 200, behavior: "smooth" }));
      await page.waitForTimeout(1500);
    },
  },
  {
    chapterNumber: 11,
    title: "Transforming Your Front Desk",
    subtitle: "Zero Missed Leads, Higher Bookings & Delighted Clients",
    route: "/dashboard",
    narration:
      "With Operator handling incoming inquiries and calendar bookings, your business captures every opportunity around the clock, while your team stays focused on delivering exceptional, hands-on client care.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
    },
  },
  {
    chapterNumber: 12,
    title: "Ready to Transform Your Business?",
    subtitle: "Contact NexxTechnologies to Get Started with Operator",
    route: "/settings",
    narration:
      "Ready to eliminate missed inquiries and automate your appointment scheduling? Experience how Operator AI Receptionist can be tailored to your business. Contact NexxTechnologies today to schedule your personalized consultation.",
    setupActions: async (page) => {
      await page.waitForTimeout(2500);
    },
  },
];

