/**
 * OPERATOR AI RECEPTIONIST — COMPREHENSIVE AUTOMATED EVALUATION SUITE
 * 105+ Representative Golden Test Queries across all conversational intents,
 * multi-turn follow-ups, business grounding, action validity, and duplicate suppression.
 */

import { intentService, IntentType } from "../src/server/services/intent";
import { actionEngine, DynamicAction } from "../src/server/services/action-engine";
import { BusinessContext } from "../src/server/services/business-context";
import { synthesizeDeterministicResponse } from "../src/server/services/llm";
import { idempotencyManager } from "../src/server/services/idempotency";

interface TestCase {
  id: number;
  category: string;
  query: string;
  expectedIntent: IntentType | IntentType[];
  context?: {
    activeEntity?: any;
    lastIntent?: string;
  };
  validateResponse?: (response: string) => boolean;
  validateActions?: (actions: DynamicAction[]) => boolean;
}

// Mock real business data to test against (e.g., Apex Dental Clinic)
const mockBusiness: BusinessContext = {
  organizationId: "org-eval-123",
  name: "Apex Dental Studio",
  industry: "Dental Healthcare",
  timezone: "America/New_York",
  website: "https://apexdental.com",
  phone: "+1 (555) 234-5678",
  email: "frontdesk@apexdental.com",
  address: "100 Broadway, Suite 400, New York, NY 10005",
  description: "Apex Dental Studio is a modern family and cosmetic dental practice offering gentle, state-of-the-art dental care.",
  businessHours: {
    monday: { open: "08:00", close: "17:00" },
    tuesday: { open: "08:00", close: "17:00" },
    wednesday: { open: "08:00", close: "17:00" },
    thursday: { open: "08:00", close: "17:00" },
    friday: { open: "08:00", close: "16:00" },
    saturday: { isClosed: true },
    sunday: { isClosed: true },
  },
  businessHoursFormatted: "Monday to Thursday: 8:00 AM – 5:00 PM, Friday: 8:00 AM – 4:00 PM, Saturday & Sunday: Closed",
  holidays: ["2026-12-25", "2026-01-01"],
  bookingPreferences: {},
  services: [
    { id: "s-1", name: "Comprehensive Dental Exam & Cleaning", description: "Full digital exam, x-rays, and ultrasonic cleaning", duration: 60, price: "150.00" },
    { id: "s-2", name: "Teeth Whitening", description: "In-office professional LED laser whitening", duration: 45, price: "299.00" },
    { id: "s-3", name: "Emergency Dental Consultation", description: "Immediate assessment for toothache, chipped tooth, or trauma", duration: 30, price: "95.00" },
    { id: "s-4", name: "Invisalign Clear Aligners Consultation", description: "3D digital smile scan and orthodontic treatment plan", duration: 45, price: "50.00" },
  ],
  faqs: [
    { question: "Do you accept dental insurance?", answer: "Yes, we accept most major PPO dental insurance plans.", category: "Billing" },
    { question: "Is parking available?", answer: "Yes, validated parking is available in the building garage.", category: "General" },
  ],
  staff: [
    { id: "st-1", name: "Dr. Rachel Green", role: "Lead Dentist" },
    { id: "st-2", name: "Dr. Marcus Vance", role: "Cosmetic Dentist" },
  ],
  capabilities: {
    hasServices: true,
    hasPricing: true,
    hasBooking: true,
    hasBusinessHours: true,
    hasLocation: true,
    hasPhone: true,
    hasFaqs: true,
  },
};

const goldenTestSet: TestCase[] = [
  // 1. GREETING (1-8)
  { id: 1, category: "GREETING", query: "Hi", expectedIntent: "greeting" },
  { id: 2, category: "GREETING", query: "Hello", expectedIntent: "greeting" },
  { id: 3, category: "GREETING", query: "Hey there", expectedIntent: "greeting" },
  { id: 4, category: "GREETING", query: "Good morning", expectedIntent: "greeting" },
  { id: 5, category: "GREETING", query: "Good afternoon", expectedIntent: "greeting" },
  { id: 6, category: "GREETING", query: "Greetings", expectedIntent: "greeting" },
  { id: 7, category: "GREETING", query: "Hello assistant", expectedIntent: "greeting" },
  { id: 8, category: "GREETING", query: "Hi there!", expectedIntent: "greeting" },

  // 2. BUSINESS INFORMATION (9-20)
  { id: 9, category: "BUSINESS_INFO", query: "I want to learn more about your business", expectedIntent: "business_info" },
  { id: 10, category: "BUSINESS_INFO", query: "Tell me about your business", expectedIntent: "business_info" },
  { id: 11, category: "BUSINESS_INFO", query: "What do you guys do?", expectedIntent: "business_info" },
  { id: 12, category: "BUSINESS_INFO", query: "What do you do?", expectedIntent: "business_info" },
  { id: 13, category: "BUSINESS_INFO", query: "Who are you?", expectedIntent: "business_info" },
  { id: 14, category: "BUSINESS_INFO", query: "What is this place?", expectedIntent: "business_info" },
  { id: 15, category: "BUSINESS_INFO", query: "Tell me about yourself", expectedIntent: "business_info" },
  { id: 16, category: "BUSINESS_INFO", query: "What company is this?", expectedIntent: "business_info" },
  { id: 17, category: "BUSINESS_INFO", query: "Give me an overview of your business", expectedIntent: "business_info" },
  { id: 18, category: "BUSINESS_INFO", query: "Tell me more about what you do", expectedIntent: "business_info" },
  { id: 19, category: "BUSINESS_INFO", query: "Can you describe your business?", expectedIntent: "business_info" },
  { id: 20, category: "BUSINESS_INFO", query: "Learn more about the business", expectedIntent: "business_info" },

  // 3. SERVICES (21-30)
  { id: 21, category: "SERVICES", query: "What services do you offer?", expectedIntent: "services" },
  { id: 22, category: "SERVICES", query: "What do you offer?", expectedIntent: "services" },
  { id: 23, category: "SERVICES", query: "Show me your services", expectedIntent: "services" },
  { id: 24, category: "SERVICES", query: "What can you do for me?", expectedIntent: "services" },
  { id: 25, category: "SERVICES", query: "What can I get here?", expectedIntent: "services" },
  { id: 26, category: "SERVICES", query: "What can I book?", expectedIntent: "services" },
  { id: 27, category: "SERVICES", query: "List of services please", expectedIntent: "services" },
  { id: 28, category: "SERVICES", query: "Menu of services", expectedIntent: "services" },
  { id: 29, category: "SERVICES", query: "What treatments do you have?", expectedIntent: "services" },
  { id: 30, category: "SERVICES", query: "Service catalog", expectedIntent: "services" },

  // 4. SERVICE DETAILS (31-38)
  { id: 31, category: "SERVICE_DETAILS", query: "Tell me about Comprehensive Dental Exam & Cleaning", expectedIntent: "service_details" },
  { id: 32, category: "SERVICE_DETAILS", query: "Tell me about Teeth Whitening", expectedIntent: "service_details" },
  { id: 33, category: "SERVICE_DETAILS", query: "What is included in Teeth Whitening?", expectedIntent: "service_details" },
  { id: 34, category: "SERVICE_DETAILS", query: "Details on Invisalign Clear Aligners Consultation", expectedIntent: "service_details" },
  { id: 35, category: "SERVICE_DETAILS", query: "Explain your Emergency Dental Consultation", expectedIntent: "service_details" },
  { id: 36, category: "SERVICE_DETAILS", query: "What is Teeth Whitening like?", expectedIntent: "service_details" },
  { id: 37, category: "SERVICE_DETAILS", query: "Tell me about the cleaning session", expectedIntent: ["service_details", "services", "booking"] },
  { id: 38, category: "SERVICE_DETAILS", query: "Details about Emergency Dental Consultation", expectedIntent: "service_details" },

  // 5. PRICING & RATES (39-50)
  { id: 39, category: "PRICING", query: "How much is a dental cleaning?", expectedIntent: "pricing" },
  { id: 40, category: "PRICING", query: "How much does teeth whitening cost?", expectedIntent: "pricing" },
  { id: 41, category: "PRICING", query: "What are your prices?", expectedIntent: "pricing" },
  { id: 42, category: "PRICING", query: "What are your rates?", expectedIntent: "pricing" },
  { id: 43, category: "PRICING", query: "How much is it?", context: { activeEntity: { type: "service", name: "Teeth Whitening", price: "299.00" } }, expectedIntent: "pricing" },
  { id: 44, category: "PRICING", query: "What are your fees?", expectedIntent: "pricing" },
  { id: 45, category: "PRICING", query: "How expensive are you?", expectedIntent: "pricing" },
  { id: 46, category: "PRICING", query: "Pricing sheet please", expectedIntent: "pricing" },
  { id: 47, category: "PRICING", query: "How much for Invisalign Clear Aligners Consultation?", expectedIntent: "pricing" },
  { id: 48, category: "PRICING", query: "What does emergency consultation cost?", expectedIntent: "pricing" },
  { id: 49, category: "PRICING", query: "Is it expensive?", expectedIntent: "pricing" },
  { id: 50, category: "PRICING", query: "Rate details", expectedIntent: "pricing" },

  // 6. OPERATING HOURS (51-60)
  { id: 51, category: "HOURS", query: "Are you open Sunday?", expectedIntent: "hours" },
  { id: 52, category: "HOURS", query: "What are your hours?", expectedIntent: "hours" },
  { id: 53, category: "HOURS", query: "What time do you close?", expectedIntent: "hours" },
  { id: 54, category: "HOURS", query: "When do you open?", expectedIntent: "hours" },
  { id: 55, category: "HOURS", query: "Are you open on weekends?", expectedIntent: "hours" },
  { id: 56, category: "HOURS", query: "Business hours please", expectedIntent: "hours" },
  { id: 57, category: "HOURS", query: "Are you open tomorrow?", expectedIntent: ["hours", "booking"] },
  { id: 58, category: "HOURS", query: "Closing time on Friday", expectedIntent: "hours" },
  { id: 59, category: "HOURS", query: "Opening hours", expectedIntent: "hours" },
  { id: 60, category: "HOURS", query: "Are you open Saturday?", expectedIntent: "hours" },

  // 7. LOCATION & DIRECTIONS (61-70)
  { id: 61, category: "LOCATION", query: "Where are you located?", expectedIntent: "location" },
  { id: 62, category: "LOCATION", query: "What is your address?", expectedIntent: "location" },
  { id: 63, category: "LOCATION", query: "Where is your clinic?", expectedIntent: "location" },
  { id: 64, category: "LOCATION", query: "How do I get there?", expectedIntent: "location" },
  { id: 65, category: "LOCATION", query: "Directions please", expectedIntent: "location" },
  { id: 66, category: "LOCATION", query: "Which street are you on?", expectedIntent: "location" },
  { id: 67, category: "LOCATION", query: "Where is the office?", expectedIntent: "location" },
  { id: 68, category: "LOCATION", query: "Show me your location", expectedIntent: "location" },
  { id: 69, category: "LOCATION", query: "Map to your clinic", expectedIntent: "location" },
  { id: 70, category: "LOCATION", query: "Are you in New York?", expectedIntent: "location" },

  // 8. CONTACT (71-78)
  { id: 71, category: "CONTACT", query: "What is your phone number?", expectedIntent: "contact" },
  { id: 72, category: "CONTACT", query: "How can I call you?", expectedIntent: "contact" },
  { id: 73, category: "CONTACT", query: "What is your email address?", expectedIntent: "contact" },
  { id: 74, category: "CONTACT", query: "How do I contact you?", expectedIntent: "contact" },
  { id: 75, category: "CONTACT", query: "Telephone number please", expectedIntent: "contact" },
  { id: 76, category: "CONTACT", query: "Can I call your office?", expectedIntent: "contact" },
  { id: 77, category: "CONTACT", query: "How to reach the front desk", expectedIntent: ["contact", "human_request"] },
  { id: 78, category: "CONTACT", query: "Office contact details", expectedIntent: "contact" },

  // 9. BOOKING & SCHEDULING (79-88)
  { id: 79, category: "BOOKING", query: "I want to book an appointment", expectedIntent: "booking" },
  { id: 80, category: "BOOKING", query: "Can I schedule a visit?", expectedIntent: "booking" },
  { id: 81, category: "BOOKING", query: "I need an appointment tomorrow", expectedIntent: "booking" },
  { id: 82, category: "BOOKING", query: "Make an appointment", expectedIntent: "booking" },
  { id: 83, category: "BOOKING", query: "Book a slot for teeth whitening", expectedIntent: "booking" },
  { id: 84, category: "BOOKING", query: "Reserve a consultation", expectedIntent: "booking" },
  { id: 85, category: "BOOKING", query: "I want to clean my teeth", expectedIntent: "booking" },
  { id: 86, category: "BOOKING", query: "Book online", expectedIntent: "booking" },
  { id: 87, category: "BOOKING", query: "Schedule a session", expectedIntent: "booking" },
  { id: 88, category: "BOOKING", query: "Can I book a call?", expectedIntent: "booking" },

  // 10. RESCHEDULING & CANCELLATION (89-94)
  { id: 89, category: "RESCHEDULE", query: "I need to reschedule my appointment", expectedIntent: "reschedule" },
  { id: 90, category: "RESCHEDULE", query: "Can I change my appointment time?", expectedIntent: "reschedule" },
  { id: 91, category: "RESCHEDULE", query: "Can I change it?", expectedIntent: "reschedule" },
  { id: 92, category: "CANCEL", query: "Cancel my appointment", expectedIntent: "cancel" },
  { id: 93, category: "CANCEL", query: "I want to cancel booking", expectedIntent: "cancel" },
  { id: 94, category: "CANCEL", query: "Delete my appointment", expectedIntent: "cancel" },

  // 11. EMERGENCY & HUMAN HANDOFF (95-100)
  { id: 95, category: "EMERGENCY", query: "I am having severe pain and bleeding heavily", expectedIntent: "emergency" },
  { id: 96, category: "EMERGENCY", query: "This is a medical emergency", expectedIntent: "emergency" },
  { id: 97, category: "HUMAN_HANDOFF", query: "I want to speak to a real person", expectedIntent: "human_request" },
  { id: 98, category: "HUMAN_HANDOFF", query: "Connect me with a human representative", expectedIntent: "human_request" },
  { id: 99, category: "HUMAN_HANDOFF", query: "Speak with staff", expectedIntent: "human_request" },
  { id: 100, category: "HUMAN_HANDOFF", query: "Talk to the front desk staff", expectedIntent: "human_request" },

  // 12. MULTI-TURN CONTEXT RESOLUTION & NATURAL VARIATIONS (101-106)
  { id: 101, category: "CONTEXT_FOLLOW_UP", query: "How much?", context: { activeEntity: { type: "service", name: "Comprehensive Dental Exam & Cleaning", price: "150.00" } }, expectedIntent: "pricing" },
  { id: 102, category: "CONTEXT_FOLLOW_UP", query: "Can I book it tomorrow?", context: { activeEntity: { type: "service", name: "Teeth Whitening" } }, expectedIntent: "booking" },
  { id: 103, category: "UNAUTHORIZED_SAFETY", query: "Can you provide off-menu prescription drugs?", expectedIntent: "general" },
  { id: 104, category: "KNOWLEDGE_GAP", query: "Do you sell supersonic rockets to Jupiter?", expectedIntent: "general" },
  { id: 105, category: "CLOSING", query: "Thank you so much, bye!", expectedIntent: "general" },
  { id: 106, category: "IDEMPOTENCY", query: "I want to learn more about your business", expectedIntent: "business_info" },
];

async function runEvaluation() {
  console.log("\n============================================================");
  console.log("   OPERATOR AI RECEPTIONIST — COMPREHENSIVE EVALUATION");
  console.log(`   Running Golden Test Set (${goldenTestSet.length} queries)`);
  console.log("============================================================\n");

  let intentMatches = 0;
  let nonRepetitiveCount = 0;
  let actionValidCount = 0;
  let groundedCount = 0;

  for (const tc of goldenTestSet) {
    // 1. Evaluate Intent Classification
    const intentRes = await intentService.detectIntent(tc.query, {
      activeEntity: tc.context?.activeEntity,
      lastIntent: tc.context?.lastIntent,
      availableServices: mockBusiness.services,
    });

    const isMatch = Array.isArray(tc.expectedIntent)
      ? tc.expectedIntent.includes(intentRes.intent)
      : intentRes.intent === tc.expectedIntent;

    if (isMatch) {
      intentMatches++;
    } else {
      console.warn(`[TC #${tc.id} Intent Mismatch] Query: "${tc.query}" -> Got: ${intentRes.intent}, Expected: ${JSON.stringify(tc.expectedIntent)}`);
    }

    // 2. Evaluate Dynamic Actions (No fake buttons, max 3, fully supported)
    const actions = actionEngine.determineNextBestActions(mockBusiness, {
      intent: intentRes.intent,
      activeEntity: tc.context?.activeEntity || intentRes.entity,
      lastUserMessage: tc.query,
    });

    const actionsValid = actions.length <= 3 && actions.every((a) => {
      if (a.id === "BOOK_APPOINTMENT" || a.id === "BOOK_SERVICE") return mockBusiness.capabilities.hasBooking;
      if (a.id === "VIEW_SERVICES") return mockBusiness.capabilities.hasServices;
      if (a.id === "VIEW_PRICING") return mockBusiness.capabilities.hasPricing;
      if (a.id === "VIEW_BUSINESS_HOURS") return mockBusiness.capabilities.hasBusinessHours;
      if (a.id === "VIEW_LOCATION") return mockBusiness.capabilities.hasLocation;
      return true;
    });

    if (actionsValid) actionValidCount++;

    // 3. Evaluate Grounded Semantic Synthesis (Simulating fallback / offline LLM output)
    const mockSystemPrompt = `You are the official AI receptionist and front desk assistant for "${mockBusiness.name}".
Business Description: ${mockBusiness.description}
Available Services:
${mockBusiness.services.map((s) => `- ${s.name}: $${s.price}`).join("\n")}
Business Operating Hours:
${mockBusiness.businessHoursFormatted}
Address: ${mockBusiness.address}
Phone: ${mockBusiness.phone}`;

    // Simulate conversational turn
    const mockMessages: any[] = [
      { role: "system", content: mockSystemPrompt },
      { role: "user", content: tc.query },
    ];

    const response = synthesizeDeterministicResponse(mockMessages);

    // Verify non-repetition of canned intro:
    // It should NEVER say "Hello! I am your automated front desk assistant" when asked about business, services, pricing, hours, or location!
    const isCannedBotIntro = response.includes("Hello! I am your automated front desk assistant. How may I assist you today?");
    const isQueryBusinessInfo = tc.category === "BUSINESS_INFO" || tc.category === "SERVICES" || tc.category === "PRICING";

    if (!isCannedBotIntro || !isQueryBusinessInfo) {
      nonRepetitiveCount++;
    } else {
      console.warn(`[TC #${tc.id} Repetition Violation] Canned intro generated for query: "${tc.query}"`);
    }

    // Verify business grounding (should mention business name or services)
    if (response.includes(mockBusiness.name) || response.includes("$") || response.includes("dental") || response.includes("schedule")) {
      groundedCount++;
    }
  }

  // 4. Test Idempotency & Duplicate Suppression (Phase 15)
  console.log("\nTesting Idempotency & Duplicate Request Suppression...");
  const orgId = "org-test";
  const convId = "conv-test";
  const testMsg = "I want to learn more about your business";
  let executionCount = 0;

  const key1 = idempotencyManager.generateKey(orgId, convId, testMsg);
  const p1 = idempotencyManager.execute(key1, async () => {
    executionCount++;
    return { success: true, text: "Business info response" };
  });

  const p2 = idempotencyManager.execute(key1, async () => {
    executionCount++;
    return { success: true, text: "Business info response" };
  });

  const [r1, r2] = await Promise.all([p1, p2]);
  const idempotencyPassed = executionCount === 1 && r1.text === r2.text;

  // 5. Test Two-Turn "Tell me about your business" Non-Repetition (User's exact problem)
  console.log("Testing Specific Scenario: User sends 'I want to learn more about your business' then 'Tell me about your business'...");
  const promptText = `You are the official AI receptionist and front desk assistant for "Apex Dental Studio".
Business Description: Apex Dental Studio provides premier dental health services.
Available Services: - Comprehensive Dental Exam & Cleaning: $150.00`;

  const turn1Messages: any[] = [
    { role: "system", content: promptText },
    { role: "user", content: "I want to learn more about your business" },
  ];
  const turn1Response = synthesizeDeterministicResponse(turn1Messages);

  const turn2Messages: any[] = [
    { role: "system", content: promptText },
    { role: "user", content: "I want to learn more about your business" },
    { role: "assistant", content: turn1Response },
    { role: "user", content: "Tell me about your business" },
  ];
  const turn2Response = synthesizeDeterministicResponse(turn2Messages);

  const scenario1Passed = !turn1Response.includes("Hello! I am your automated front desk assistant") &&
    turn1Response.includes("Apex Dental Studio");

  const scenario2Passed = !turn2Response.includes("Hello! I am your automated front desk assistant") &&
    turn2Response !== turn1Response &&
    turn2Response.includes("Apex Dental Studio");

  // Summary Metrics
  const total = goldenTestSet.length;
  const intentAccuracy = ((intentMatches / total) * 100).toFixed(1);
  const actionValidity = ((actionValidCount / total) * 100).toFixed(1);
  const nonRepetitionRate = ((nonRepetitiveCount / total) * 100).toFixed(1);
  const groundedRate = ((groundedCount / total) * 100).toFixed(1);

  console.log("\n============================================================");
  console.log("   EVALUATION RESULTS SUMMARY");
  console.log("============================================================");
  console.log(`Total Test Queries:        ${total}`);
  console.log(`Intent Classification:     ${intentMatches}/${total} (${intentAccuracy}%)`);
  console.log(`Action Validity:           ${actionValidCount}/${total} (${actionValidity}%)`);
  console.log(`Non-Repetition Rate:       ${nonRepetitiveCount}/${total} (${nonRepetitionRate}%)`);
  console.log(`Business Grounding Rate:   ${groundedCount}/${total} (${groundedRate}%)`);
  console.log(`Idempotency Deduping:      ${idempotencyPassed ? "PASS (1 execution for 2 concurrent calls)" : "FAIL"}`);
  console.log(`Turn 1 Response:           "${turn1Response}"`);
  console.log(`Turn 2 Rephrase Response:  "${turn2Response}"`);
  console.log(`Repeated Greeting Prevented: ${scenario1Passed && scenario2Passed ? "YES (PASSED)" : "NO (FAILED)"}`);
  console.log("============================================================\n");

  if (Number(intentAccuracy) >= 95 && Number(actionValidity) === 100 && scenario1Passed && scenario2Passed && idempotencyPassed) {
    console.log("SUCCESS: All Production Quality Gates Satisfied!");
    process.exit(0);
  } else {
    console.error("FAILURE: Quality gates not satisfied.");
    process.exit(1);
  }
}

runEvaluation().catch((err) => {
  console.error("Evaluation runtime error:", err);
  process.exit(1);
});
