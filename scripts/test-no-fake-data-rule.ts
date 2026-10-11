import { verifyNoFakeData, scanSourceForFakeData, isAllowlisted } from "./doctor/rules/verify-no-fake-data";
import path from "path";

async function runTest() {
  console.log("================================================================================");
  console.log("       OPERATOR DOCTOR — ZERO FAKE DATA RULE VERIFICATION SUITE                 ");
  console.log("================================================================================\n");

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      testPassed++;
    } else {
      console.error(`  ✗ [FAIL] ${testName}`);
      if (details) console.error(`    Details: ${details}`);
      testFailed++;
    }
  }

  // TEST 1: Synthetic test snippet with mock import
  const snippetMockImport = `
import { mockCustomerData } from "@/tests/__mocks__/customer";
export function getCustomer() { return mockCustomerData; }
`;
  const v1 = scanSourceForFakeData(snippetMockImport, "src/server/services/customer.ts");
  assert(v1.length === 1 && v1[0].message.includes("mock-import"), "Detects mock directory imports in production code");

  // TEST 2: Synthetic test snippet with Math.sin fabricated metric
  const snippetMathSin = `
const simulatedMRR = Math.max(0, Math.round(mrr * factor * (1 + (Math.sin(i) * 0.05))));
`;
  const v2 = scanSourceForFakeData(snippetMathSin, "src/server/services/billing/metrics.ts");
  assert(v2.length === 1 && v2[0].message.includes("fabricated-metrics"), "Detects Math.sin metric fabrication");

  // TEST 3: Synthetic test snippet with fake provider externalId
  const snippetFakeId = `
return {
  success: true,
  externalId: "email-sim-" + crypto.randomUUID()
};
`;
  const v3 = scanSourceForFakeData(snippetFakeId, "src/server/services/notification.ts");
  assert(v3.length === 1 && v3[0].message.includes("fake-success"), "Detects fake provider externalId simulation");

  // TEST 4: Synthetic test snippet with SIMULATED_AVAILABLE_NUMBERS
  const snippetFakeNumbers = `
const SIMULATED_AVAILABLE_NUMBERS = ["+1 (555) 819-2090"];
`;
  const v4 = scanSourceForFakeData(snippetFakeNumbers, "src/components/forms/phone.tsx");
  assert(v4.length === 1 && v4[0].message.includes("simulated-operational-data"), "Detects hardcoded simulated phone numbers array");

  // TEST 4b: Synthetic session ID detection
  const snippetSyntheticSession = `
const fakeSession = { externalSessionId: "out_1728000000000", status: "completed" };
`;
  const v4b = scanSourceForFakeData(snippetSyntheticSession, "src/server/actions/voice.ts");
  assert(v4b.length === 1 && v4b[0].message.includes("fake-success"), "Detects synthetic outbound call session ID");

  // TEST 4c: Unpersisted form timeout detection
  const snippetFormTimeout = `
setTimeout(() => { setIsSaving(false); }, 1000);
`;
  const v4c = scanSourceForFakeData(snippetFormTimeout, "src/components/forms/profile.tsx");
  assert(v4c.length === 1 && v4c[0].message.includes("fake-success"), "Detects unpersisted form setTimeout simulation");

  // TEST 5: Legitimate constants must NOT be flagged
  const snippetLegitimateConstants = `
export const APP_ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
  BILLING: "/billing",
  SETTINGS: "/settings",
};
export const MAX_RETRY_ATTEMPTS = 3;
export const DEFAULT_PAGE_SIZE = 50;
`;
  const v5 = scanSourceForFakeData(snippetLegitimateConstants, "src/lib/constants/routes.ts");
  assert(v5.length === 0, "Legitimate system constants and routes are NOT flagged");

  // TEST 6: Allowlist verification
  assert(isAllowlisted("src/lib/constants/routes.ts"), "Allowlist correctly recognizes design tokens and system constants");
  assert(isAllowlisted("src/components/marketing/visualizations/product-simulation.tsx"), "Allowlist correctly recognizes marketing product visualization");
  assert(isAllowlisted("src/components/confidence-bridge/scenario-card.tsx"), "Allowlist correctly recognizes admin AI testing playground");
  assert(!isAllowlisted("src/server/services/billing/financial-metrics.ts"), "Production financial metrics is NOT allowlisted (strictly checked)");
  assert(!isAllowlisted("src/components/forms/phone-numbers-client.tsx"), "Production phone numbers client is NOT allowlisted (strictly checked)");

  // TEST 7: Run Doctor Rule on ACTUAL repository src/
  console.log("\nExecuting Doctor Rule on live repository codebase (src/)...");
  const doctorResult = await verifyNoFakeData.execute({
    cwd: process.cwd(),
    projectAst: null as any,
    cssTokens: {} as any,
    config: {},
  });

  console.log(`Scan completed in ${doctorResult.executionTimeMs}ms with score: ${doctorResult.score}/100.`);
  if (doctorResult.violations.length > 0) {
    console.error(`Found ${doctorResult.violations.length} violations in src/:`);
    doctorResult.violations.forEach((v) => {
      console.error(`  - ${v.file}:${v.line} -> ${v.message}`);
    });
  }

  assert(
    doctorResult.passed && doctorResult.violations.length === 0,
    "Live repository src/ passes Zero Fake Data check with 0 violations",
    `Violations: ${doctorResult.violations.length}`
  );

  console.log("\n================================================================================");
  console.log(`TOTAL SUITE RESULTS: ${testPassed} PASSED, ${testFailed} FAILED`);
  console.log("================================================================================\n");

  if (testFailed > 0) {
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
