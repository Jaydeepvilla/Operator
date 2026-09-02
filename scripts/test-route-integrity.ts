/**
 * Comprehensive Route Integrity & Dashboard Quick Actions Test Suite
 * 
 * Verifies:
 * 1. All APP_ROUTES canonical paths map to physical page files in the Next.js App Router.
 * 2. isValidAppRoute correctly classifies valid and invalid paths.
 * 3. All SETUP_TASKS have valid canonical destinations.
 * 4. All Recommendation, Gap Analysis, Quality, and Health Engines produce valid canonical routes.
 * 5. No deprecated, removed, or stale routes exist in any generated dashboard actions or links.
 */

import fs from "fs";
import path from "path";
import { APP_ROUTES, isValidAppRoute, VALID_INTERNAL_ROUTES } from "../src/lib/constants/routes";
import { SETUP_TASKS } from "../src/lib/setup-engine/tasks";
import { getKnowledgeRecommendations } from "../src/lib/recommendation-engine/calculators/knowledge-rules";
import { getBookingRecommendations } from "../src/lib/recommendation-engine/calculators/booking-rules";
import { getAutomationRecommendations } from "../src/lib/recommendation-engine/calculators/automation-rules";
import { getWeakContentRecommendations } from "../src/lib/knowledge-engine/weak-content";
import { getMissingPolicies } from "../src/lib/knowledge-engine/missing-policies";
import { getMissingGuides } from "../src/lib/knowledge-engine/missing-guides";
import { getMissingFaqs } from "../src/lib/knowledge-engine/missing-faqs";
import { getDuplicateRecommendations } from "../src/lib/knowledge-engine/duplicate-detection";
import { getWebsiteImportSuggestions } from "../src/lib/knowledge-engine/website-imports";
import { checkWorkingHours } from "../src/lib/staff-engine/working-hours";
import { checkProfileCompletion } from "../src/lib/staff-engine/profile-completion";
import { checkCoverage } from "../src/lib/staff-engine/coverage";
import { getDuplicateCustomers } from "../src/lib/crm-engine/duplicate-customers";
import { getMissingDataRecommendations } from "../src/lib/crm-engine/missing-data";
import { getSegmentationRecommendations } from "../src/lib/crm-engine/segmentation";
import { getImportDetection } from "../src/lib/crm-engine/import-detection";
import { getVipRecommendations } from "../src/lib/crm-engine/vip-identification";
import { checkPricing } from "../src/lib/billing-engine/pricing-engine";
import { checkRefundPolicy } from "../src/lib/billing-engine/refund-engine";
import { compareDocumentsAndPolicies } from "../src/lib/industry-benchmark-engine/calculators/recommended-documents";
import { compareAutomationsAndIntegrations } from "../src/lib/industry-benchmark-engine/calculators/recommended-automations";
import { compareServicesFeatures } from "../src/lib/industry-benchmark-engine/calculators/compare-features";
import { calculateDocumentGaps } from "../src/lib/gap-analysis-engine/calculators/documents";
import { calculateIntegrationGaps } from "../src/lib/gap-analysis-engine/calculators/integrations";
import { calculateBusinessInfoGaps } from "../src/lib/gap-analysis-engine/calculators/business-info";
import { calculateStaffGaps } from "../src/lib/gap-analysis-engine/calculators/staff";
import { calculateServiceGaps } from "../src/lib/gap-analysis-engine/calculators/services";
import { detectCriticalIssues } from "../src/lib/health-engine/critical-issues";
import { runBusinessAudit } from "../src/lib/business-intelligence/business-audit";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, failureDetails?: any) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (failureDetails) {
      console.error(`    Details:`, failureDetails);
    }
    failed++;
  }
}

const DEPRECATED_PATTERNS = [
  /^\/crm\//,
  /^\/knowledge\/?/,
  /^\/settings\/staff/,
  /^\/settings\/services/,
  /^\/settings\/website/,
  /^\/settings\/business$/,
  /^\/settings\/notifications/,
  /^\/settings\/appointments/,
  /^\/services\/new$/,
  /^\/customers$/,
];

function assertRouteIntegrity(url: string, source: string) {
  const isRegistered = isValidAppRoute(url);
  assert(
    isRegistered,
    `[${source}] Destination "${url}" is a valid, registered canonical route`
  );

  for (const dep of DEPRECATED_PATTERNS) {
    const matchesDeprecated = dep.test(url.split("?")[0]);
    assert(
      !matchesDeprecated,
      `[${source}] Destination "${url}" does not use deprecated route pattern ${dep.toString()}`
    );
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("  OPERATOR ROUTE INTEGRITY & QUICK ACTIONS TEST SUITE");
  console.log("=======================================================\n");

  // ── 1. Next.js Physical Page Route Mapping ─────────────────────────────────
  console.log("1. Physical Page Route Verification:");
  const appDir = path.resolve(__dirname, "../src/app");
  
  // Find all page.tsx files recursively
  function findPageFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let pages: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        pages = pages.concat(findPageFiles(fullPath));
      } else if (entry.name === "page.tsx" || entry.name === "page.jsx") {
        pages.push(fullPath);
      }
    }
    return pages;
  }

  const allPageFiles = findPageFiles(appDir);
  const normalizedPageRoutes = new Set<string>();

  for (const file of allPageFiles) {
    let rel = path.relative(appDir, file).replace(/\\/g, "/");
    // Strip route groups like (dashboard)/ or (onboarding)/
    rel = rel.replace(/\([^)]+\)\//g, "");
    // Strip page.tsx
    rel = rel.replace(/\/page\.(tsx|jsx)$/, "");
    // Handle root page
    if (rel === "page.tsx" || rel === "page.jsx") {
      rel = "";
    }
    const route = "/" + rel;
    normalizedPageRoutes.add(route.replace(/\/+$/, "") || "/");
  }

  // Verify every APP_ROUTE maps to a real page or dynamic parameter template
  for (const [key, route] of Object.entries(APP_ROUTES)) {
    const rawPath = route.split("?")[0].replace(/\/+$/, "") || "/";
    const exists = normalizedPageRoutes.has(rawPath);
    assert(exists, `APP_ROUTES.${key} ("${route}") maps to existing Next.js page.tsx`);
  }

  // ── 2. isValidAppRoute Validator Checks ───────────────────────────────────
  console.log("\n2. isValidAppRoute Validator Checks:");
  assert(isValidAppRoute("/dashboard"), "Validates /dashboard");
  assert(isValidAppRoute("/contacts"), "Validates /contacts");
  assert(isValidAppRoute("/contacts?filter=high_score"), "Validates /contacts with query params");
  assert(isValidAppRoute("/kb?action=generate&topic=Refund"), "Validates /kb with deep query params");
  assert(isValidAppRoute("/settings/ai#prompt"), "Validates /settings/ai with hash");
  assert(!isValidAppRoute("/crm/contacts"), "Rejects deprecated /crm/contacts");
  assert(!isValidAppRoute("/knowledge/faq"), "Rejects deprecated /knowledge/faq");
  assert(!isValidAppRoute("/settings/staff"), "Rejects deprecated /settings/staff");
  assert(!isValidAppRoute("/services/new"), "Rejects deprecated /services/new");
  assert(!isValidAppRoute("/nonexistent-page-xyz"), "Rejects bogus page route");

  // ── 3. Setup Tasks Route Integrity ─────────────────────────────────────────
  console.log("\n3. Setup Tasks Route Integrity:");
  for (const task of SETUP_TASKS) {
    assertRouteIntegrity(task.href, `SetupTask:${task.id}`);
  }

  // ── 4. Recommendation Engine Route Integrity ───────────────────────────────
  console.log("\n4. Recommendation Engine Route Integrity:");
  const emptyState: any = {
    settings: { websiteImportStatus: "failed", bookingPreferences: { depositEnabled: true } },
    documents: [{ id: "doc1", title: "Short", content: "Too short" }],
    faqs: [],
    services: [{ id: "svc1", name: "Dental Cleaning", price: "0", duration: 0 }],
    staff: [{ id: "stf1", name: "Dr. Smith", phone: null, email: null, avatarUrl: null }],
    staffSchedules: [{ staffMemberId: "stf2", shifts: [{ start: "08:00", end: "18:00" }] }],
    serviceAssignments: [],
    leads: [{ id: "l1", name: "Alice", phone: null, email: null, summary: null, leadScore: 90 }],
    channels: [],
    organization: { name: "Test Clinic", phone: "123", website: "https://test.com" },
    profile: { description: "General Dentistry" },
  };

  const dummyTemplate: any = {
    name: "Medical Clinic",
    requiredDocuments: [{ name: "Patient Consent Guide", description: "Consent", reason: "Legal", impact: "High", estimatedTimeMinutes: 5 }],
    requiredPolicies: [{ name: "Cancellation Policy", description: "Cancel", reason: "Policy", impact: "High", estimatedTimeMinutes: 5 }],
    recommendedAutomations: [{ name: "Appointment Reminders", description: "SMS", reason: "No-show reduction", impact: "High", estimatedTimeMinutes: 5 }],
    recommendedIntegrations: [{ name: "Stripe Payments", description: "Stripe", reason: "Billing", impact: "High", estimatedTimeMinutes: 5 }],
    recommendedAiSettings: [{ name: "Clinical Triage Prompt", description: "AI prompt", reason: "Triage", impact: "High", estimatedTimeMinutes: 5 }],
    requiredServices: [{ name: "Comprehensive Exam", description: "Exam", reason: "Checkup", impact: "High", estimatedTimeMinutes: 30 }],
  };

  const recCalculators = [
    { name: "knowledge-rules", fn: () => getKnowledgeRecommendations(emptyState) },
    { name: "booking-rules", fn: () => getBookingRecommendations(emptyState) },
    { name: "automation-rules", fn: () => getAutomationRecommendations(emptyState) },
    { name: "weak-content", fn: () => getWeakContentRecommendations(emptyState) },
    { name: "missing-policies", fn: () => getMissingPolicies(emptyState) },
    { name: "missing-guides", fn: () => getMissingGuides(emptyState) },
    { name: "missing-faqs", fn: () => getMissingFaqs(emptyState) },
    { name: "duplicate-detection", fn: () => getDuplicateRecommendations(emptyState) },
    { name: "website-imports", fn: () => getWebsiteImportSuggestions(emptyState) },
    { name: "working-hours", fn: () => checkWorkingHours(emptyState) },
    { name: "profile-completion", fn: () => checkProfileCompletion(emptyState) },
    { name: "coverage", fn: () => checkCoverage(emptyState) },
    { name: "duplicate-customers", fn: () => getDuplicateCustomers(emptyState) },
    { name: "missing-data", fn: () => getMissingDataRecommendations(emptyState) },
    { name: "segmentation", fn: () => getSegmentationRecommendations(emptyState) },
    { name: "import-detection", fn: () => getImportDetection(emptyState) },
    { name: "vip-identification", fn: () => getVipRecommendations(emptyState) },
    { name: "pricing-engine", fn: () => checkPricing(emptyState) },
    { name: "refund-engine", fn: () => checkRefundPolicy(emptyState) },
    { name: "recommended-documents", fn: () => compareDocumentsAndPolicies(emptyState, dummyTemplate).recommendations },
    { name: "recommended-automations", fn: () => compareAutomationsAndIntegrations(emptyState, dummyTemplate).recommendations },
    { name: "compare-features", fn: () => compareServicesFeatures(emptyState, dummyTemplate).recommendations },
  ];

  for (const { name, fn } of recCalculators) {
    const actions = fn();
    for (const action of actions) {
      if (action.primaryCtaHref) {
        assertRouteIntegrity(action.primaryCtaHref, `RecEngine:${name}:${action.id}`);
      }
    }
  }

  // ── 5. Gap Analysis Engine Route Integrity ────────────────────────────────
  console.log("\n5. Gap Analysis Engine Route Integrity:");
  const gapCalculators = [
    { name: "documents", fn: calculateDocumentGaps },
    { name: "integrations", fn: calculateIntegrationGaps },
    { name: "business-info", fn: calculateBusinessInfoGaps },
    { name: "staff", fn: calculateStaffGaps },
    { name: "services", fn: calculateServiceGaps },
  ];

  for (const { name, fn } of gapCalculators) {
    const result = fn(emptyState);
    for (const rec of result.recommendations) {
      if (rec.primaryCtaHref) {
        assertRouteIntegrity(rec.primaryCtaHref, `GapEngine:${name}:${rec.id}`);
      }
    }
  }

  // ── 6. Health & Business Audit Engine Route Integrity ─────────────────────
  console.log("\n6. Health & Business Audit Engine Route Integrity:");
  const criticalIssues = detectCriticalIssues(emptyState);
  for (const issue of criticalIssues) {
    assertRouteIntegrity(issue.href, `CriticalIssue:${issue.id}`);
  }

  const audit = runBusinessAudit(emptyState);
  for (const finding of audit.findings) {
    assertRouteIntegrity(finding.actionHref, `BusinessAudit:${finding.id}`);
  }

  // ── 7. Static Source Code Link Scanner ────────────────────────────────────
  console.log("\n7. Static Component & App Source Link Scanner:");
  function scanDirForLinks(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDirForLinks(fullPath);
      } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        // Match href="..." or href={'...'}
        const hrefMatches = content.matchAll(/href=(?:["']([^"']+)["']|\{["']([^"']+)["']\})/g);
        for (const match of hrefMatches) {
          const url = match[1] || match[2];
          if (!url) continue;
          
          // Only evaluate internal routes (starting with /)
          if (url.startsWith("/") && !url.startsWith("//")) {
            const rel = path.relative(path.resolve(__dirname, "../"), fullPath);
            assertRouteIntegrity(url, `Source:${rel}`);
          }
        }
      }
    }
  }

  scanDirForLinks(path.resolve(__dirname, "../src/components"));
  scanDirForLinks(path.resolve(__dirname, "../src/app"));

  // ── Final Summary ─────────────────────────────────────────────────────────
  console.log("\n=======================================================");
  console.log(`  ROUTE INTEGRITY RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
