/**
 * Automated Verification Suite for Voice Response Branding Migration
 * 
 * Verifies:
 * 1. Brand single-source-of-truth constants (PRODUCT_NAME, PRODUCT_AI_NAME, COMPANY_NAME, BRAND_CONFIG)
 * 2. System prompt generator enforces business identity and bans legacy "Nexx" branding (Rule 7)
 * 3. Voice Response Sanitizer defensively eliminates any legacy branding across all voice output paths
 * 4. Edge cases, fallbacks, and multi-utterance voice safety
 * 5. Zero unintended "Nexx" branding across any spoken voice output
 */

import { BRAND_CONFIG, PRODUCT_NAME, PRODUCT_AI_NAME, COMPANY_NAME, SUPPORT_EMAIL } from "../src/lib/constants/brand";
import { sanitizeVoiceResponse } from "../src/lib/voice/sanitizer";
import { promptService } from "../src/server/services/prompt";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, description: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${description}`);
  } else {
    console.error(`  ✗ FAIL: ${description}`);
  }
}

async function runVoiceBrandingVerification() {
  console.log("================================================================================");
  console.log("           OPERATOR VOICE RESPONSE BRANDING MIGRATION TEST SUITE               ");
  console.log("================================================================================\n");

  // ==========================================================================
  // Section 1: Canonical Brand Constants
  // ==========================================================================
  console.log("--- 1. Canonical Brand Constants Verification ---");
  assert(PRODUCT_NAME === "Operator", `PRODUCT_NAME is "Operator" (got "${PRODUCT_NAME}")`);
  assert(PRODUCT_AI_NAME === "Operator AI", `PRODUCT_AI_NAME is "Operator AI" (got "${PRODUCT_AI_NAME}")`);
  assert(COMPANY_NAME === "Operator Technologies", `COMPANY_NAME is "Operator Technologies" (got "${COMPANY_NAME}")`);
  assert(BRAND_CONFIG.name === "Operator", `BRAND_CONFIG.name is "Operator" (got "${BRAND_CONFIG.name}")`);
  assert(BRAND_CONFIG.aiName === "Operator AI", `BRAND_CONFIG.aiName is "Operator AI" (got "${BRAND_CONFIG.aiName}")`);
  assert(SUPPORT_EMAIL === "support@operator.ai", `SUPPORT_EMAIL is "support@operator.ai" (got "${SUPPORT_EMAIL}")`);
  assert(!JSON.stringify(BRAND_CONFIG).toLowerCase().includes("nexx"), "BRAND_CONFIG contains zero legacy 'nexx' references");

  // ==========================================================================
  // Section 2: System Prompt & Business Identity Calibration
  // ==========================================================================
  console.log("\n--- 2. System Prompt Generation & Identity Rules ---");
  
  // Prompt with non-existent org ID (triggers default fallback metadata)
  const defaultPrompt = await promptService.buildSystemPrompt({
    organizationId: "00000000-0000-0000-0000-000000000000",
    ragContext: "Retrieved FAQ: We are open Mon-Fri 9am to 5pm.",
    nextQuestionText: "Would you like to book a morning or afternoon slot?",
    isEscalated: false,
  });

  assert(typeof defaultPrompt === "string" && defaultPrompt.length > 50,
    "buildSystemPrompt returns a valid string prompt");
  assert(defaultPrompt.includes('You are the official AI receptionist and assistant for "My Business" (powered by Operator AI).'),
    "Default fallback prompt sets conversational identity to customer's business powered by Operator AI");
  assert(defaultPrompt.includes("underlying platform capabilities, refer to them as \"Operator AI\""),
    "System prompt specifies underlying platform as 'Operator AI'");
  assert(defaultPrompt.includes('Never mention outdated legacy brand names (such as "Nexx")'),
    "System prompt includes explicit Rule 7 banning legacy brand names like 'Nexx'");
  assert(!defaultPrompt.includes("Nexx Services"), "System prompt has zero 'Nexx Services' branding");
  assert(!defaultPrompt.includes("Nexx AI Receptionist"), "System prompt has zero 'Nexx AI Receptionist' branding");

  // Escalated conversation prompt
  const escalatedPrompt = await promptService.buildSystemPrompt({
    organizationId: "00000000-0000-0000-0000-000000000000",
    isEscalated: true,
  });
  assert(escalatedPrompt.includes("IMPORTANT STATUS: This conversation has been escalated"),
    "Escalated prompt correctly includes human handoff notice");

  // ==========================================================================
  // Section 3: Voice Response Sanitizer Comprehensive Validation
  // ==========================================================================
  console.log("\n--- 3. Voice Response Sanitizer Guard ---");

  const businessName = "Apex Legal Partners";

  // Test 3.1: Legacy greeting with business name context
  const inputGreeting1 = "Thank you for calling Nexx AI Receptionist. How may I direct your call?";
  const resGreeting1 = sanitizeVoiceResponse(inputGreeting1, { businessName });
  assert(resGreeting1.sanitizedText === "Thank you for calling Apex Legal Partners. How may I direct your call?",
    `Sanitizes legacy greeting with business context: "${resGreeting1.sanitizedText}"`);
  assert(resGreeting1.hadLegacyBranding === true, "Flags hadLegacyBranding as true");
  assert(!resGreeting1.sanitizedText.toLowerCase().includes("nexx"), "Sanitized greeting contains zero 'nexx'");

  // Test 3.2: Legacy greeting without business name context (fallback to Operator AI)
  const inputGreeting2 = "Thanks for calling Nexx. How can I help you today?";
  const resGreeting2 = sanitizeVoiceResponse(inputGreeting2);
  assert(resGreeting2.sanitizedText === "Thanks for calling Operator AI. How can I help you today?",
    `Sanitizes legacy greeting with fallback Operator AI: "${resGreeting2.sanitizedText}"`);
  assert(!resGreeting2.sanitizedText.toLowerCase().includes("nexx"), "Sanitized greeting contains zero 'nexx'");

  // Test 3.3: "Welcome to Nexx"
  const inputWelcome1 = "Welcome to Nexx AI! Please state the purpose of your appointment.";
  const resWelcome1 = sanitizeVoiceResponse(inputWelcome1, { businessName: "City Health Clinic" });
  assert(resWelcome1.sanitizedText === "Welcome to City Health Clinic! Please state the purpose of your appointment.",
    `Sanitizes 'Welcome to Nexx AI': "${resWelcome1.sanitizedText}"`);

  // Test 3.4: "Nexx AI Receptionist" in conversational body
  const inputBody1 = "I am the Nexx AI Receptionist for Dr. Smith's practice.";
  const resBody1 = sanitizeVoiceResponse(inputBody1, { businessName: "Dr. Smith's Clinic" });
  assert(resBody1.sanitizedText === "I am Dr. Smith's Clinic's assistant for Dr. Smith's practice.",
    `Sanitizes 'Nexx AI Receptionist' descriptor: "${resBody1.sanitizedText}"`);

  // Test 3.5: "Nexx Technologies"
  const inputTech = "This system is operated by Nexx Technologies with secure encryption.";
  const resTech = sanitizeVoiceResponse(inputTech);
  assert(resTech.sanitizedText === "This system is operated by Operator Technologies with secure encryption.",
    `Sanitizes 'Nexx Technologies' -> 'Operator Technologies': "${resTech.sanitizedText}"`);

  // Test 3.6: "Powered by Nexx"
  const inputPowered = "Thank you for calling. This assistant is powered by Nexx AI.";
  const resPowered = sanitizeVoiceResponse(inputPowered);
  assert(resPowered.sanitizedText === "Thank you for calling. This assistant is powered by Operator AI.",
    `Sanitizes 'Powered by Nexx AI' -> 'Powered by Operator AI': "${resPowered.sanitizedText}"`);

  // Test 3.7: General queries, appointments, availability, KB answers (clean inputs unaffected)
  const cleanAppointment = "Your appointment with Dr. Mitchell has been scheduled for tomorrow at 2:00 PM.";
  const resAppointment = sanitizeVoiceResponse(cleanAppointment, { businessName: "Smile Dental" });
  assert(resAppointment.sanitizedText === cleanAppointment, "Clean appointment confirmation is preserved perfectly");
  assert(resAppointment.hadLegacyBranding === false, "Clean appointment reports hadLegacyBranding: false");

  const cleanTransfer = "Please hold while I transfer you to our front desk staff.";
  const resTransfer = sanitizeVoiceResponse(cleanTransfer);
  assert(resTransfer.sanitizedText === cleanTransfer, "Clean transfer prompt is preserved perfectly");

  const cleanFallback = "I'm sorry, I didn't quite catch that. Could you please repeat your request?";
  const resFallback = sanitizeVoiceResponse(cleanFallback);
  assert(resFallback.sanitizedText === cleanFallback, "Clean fallback prompt is preserved perfectly");

  // ==========================================================================
  // Section 4: Edge Cases and Safety
  // ==========================================================================
  console.log("\n--- 4. Edge Cases & Boundary Conditions ---");

  // Null, undefined, empty strings
  assert(sanitizeVoiceResponse("").sanitizedText === "", "Handles empty string safely");
  assert(sanitizeVoiceResponse(null as any).sanitizedText === "", "Handles null input safely");
  assert(sanitizeVoiceResponse(undefined as any).sanitizedText === "", "Handles undefined input safely");

  // Multiple legacy terms in one long utterance
  const multiLegacy = "Welcome to Nexx! I am your Nexx AI Receptionist powered by Nexx Technologies and Nexx Services.";
  const resMulti = sanitizeVoiceResponse(multiLegacy, { businessName: "Radiant Spa" });
  assert(!resMulti.sanitizedText.toLowerCase().includes("nexx"),
    `Multi-term utterance sanitized completely with zero 'nexx': "${resMulti.sanitizedText}"`);
  assert(resMulti.sanitizedText.includes("Radiant Spa") || resMulti.sanitizedText.includes("Operator"),
    "Multi-term utterance correctly replaces with business/Operator names");
  assert(resMulti.replacementsCount >= 3, `Counted ${resMulti.replacementsCount} legacy replacements`);

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log("\n================================================================================");
  console.log(`VOICE BRANDING VERIFICATION RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("================================================================================");

  if (passedTests === totalTests) {
    console.log("\n🎉 ALL VOICE BRANDING MIGRATION TESTS PASSED PERFECTLY!");
    process.exit(0);
  } else {
    console.error(`\n❌ ${totalTests - passedTests} TESTS FAILED.`);
    process.exit(1);
  }
}

runVoiceBrandingVerification().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
