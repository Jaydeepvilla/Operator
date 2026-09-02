import { BRAND_CONFIG, PRODUCT_NAME, PRODUCT_AI_NAME, COMPANY_NAME, SUPPORT_EMAIL } from "../src/lib/constants/brand";
import { APP_ROUTES, isValidAppRoute } from "../src/lib/constants/routes";
import { OPERATOR_WIDGET_EVENTS } from "../src/lib/constants/widget-events";
import { agencyImpersonation } from "../src/server/services/agency/impersonation";
import { readFileSync } from "fs";
import { join } from "path";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    failedCount++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("   OPERATOR CONFIGURATION & LEGACY REFERENCE AUDIT   ");
  console.log("=======================================================\n");

  // 1. Canonical Brand Configuration
  console.log("1. Checking Canonical Brand Configuration...");
  assert(PRODUCT_NAME === "Operator", "PRODUCT_NAME is 'Operator'");
  assert(PRODUCT_AI_NAME === "Operator AI", "PRODUCT_AI_NAME is 'Operator AI'");
  assert(COMPANY_NAME === "Operator Technologies", "COMPANY_NAME is 'Operator Technologies'");
  assert(BRAND_CONFIG.name === "Operator", "BRAND_CONFIG.name is 'Operator'");
  assert(SUPPORT_EMAIL === "support@operator.ai", "SUPPORT_EMAIL is 'support@operator.ai'");

  // 2. Canonical Route Registry
  console.log("\n2. Checking Canonical Route Registry...");
  assert(isValidAppRoute(APP_ROUTES.dashboard), "APP_ROUTES.dashboard is registered");
  assert(isValidAppRoute(APP_ROUTES.kb), "APP_ROUTES.kb is registered");
  assert(isValidAppRoute(APP_ROUTES.settings), "APP_ROUTES.settings is registered");
  assert(isValidAppRoute(APP_ROUTES.billing), "APP_ROUTES.billing is registered");
  assert(isValidAppRoute(APP_ROUTES.widget), "APP_ROUTES.widget is registered");

  // 3. Impersonation Secret Security
  console.log("\n3. Testing Impersonation Secret Security...");
  const oldNodeEnv = process.env.NODE_ENV;
  const oldSecret = process.env.IMPERSONATION_SECRET;

  try {
    // In production without secret, token generation MUST fail
    (process.env as any).NODE_ENV = "production";
    delete process.env.IMPERSONATION_SECRET;

    let prodFailedClosed = false;
    try {
      await agencyImpersonation.generateImpersonationToken({
        agencyId: "test-agency",
        actorUserId: "test-user",
        targetOrganizationId: "test-org"
      });
    } catch {
      prodFailedClosed = true;
    }
    assert(prodFailedClosed === true, "Impersonation fails closed in production when IMPERSONATION_SECRET is missing");
  } finally {
    (process.env as any).NODE_ENV = oldNodeEnv;
    if (oldSecret) process.env.IMPERSONATION_SECRET = oldSecret;
  }

  // 4. Client-Exposed Environment Variables Audit
  console.log("\n4. Auditing NEXT_PUBLIC_ Environment Variables...");
  const allowedPublicEnv = new Set([
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
  ]);

  // Read files in src/ to ensure no sensitive NEXT_PUBLIC_ keys exist
  const scanFiles = [
    "src/server/services/voice/campaign.ts",
    "src/server/services/storage.ts",
    "src/server/services/billing/config.ts",
    "src/server/actions/auth.ts",
    "src/server/actions/admin.ts",
    "src/lib/auth/google-config.ts"
  ];

  let illegalPublicEnvFound = false;
  for (const relPath of scanFiles) {
    const content = readFileSync(join(__dirname, "../", relPath), "utf-8");
    const matches = content.match(/NEXT_PUBLIC_[A-Z0-9_]+/g) || [];
    for (const envVar of matches) {
      if (!allowedPublicEnv.has(envVar)) {
        console.error(`Illegal NEXT_PUBLIC_ variable found: ${envVar} in ${relPath}`);
        illegalPublicEnvFound = true;
      }
    }
  }
  assert(!illegalPublicEnvFound, "No unauthorized or secret NEXT_PUBLIC_ environment variables found");

  // 5. Database Default Connection String
  console.log("\n5. Auditing Default Database Connection String...");
  const dbIndexContent = readFileSync(join(__dirname, "../src/server/db/index.ts"), "utf-8");
  assert(
    dbIndexContent.includes("postgres://postgres:postgres@127.0.0.1:5432/operator"),
    "Default database URL points to operator database"
  );

  // 6. Notification & SMS Sender Defaults
  console.log("\n6. Auditing Notification Sender Defaults...");
  const notifContent = readFileSync(join(__dirname, "../src/server/services/notification.ts"), "utf-8");
  assert(notifContent.includes('"Operator"'), "Notification service default SMS sender is Operator");
  assert(notifContent.includes('"Operator <notifications@operator.so>"'), "Notification service default email sender is Operator");

  const vonageContent = readFileSync(join(__dirname, "../src/server/services/omnichannel/vonage.ts"), "utf-8");
  assert(vonageContent.includes('"Operator"'), "Vonage omnichannel default SMS sender is Operator");

  // 7. Widget Verification Token Defaults
  console.log("\n7. Auditing Widget Verification Token Defaults...");
  const widgetActionContent = readFileSync(join(__dirname, "../src/server/actions/widget.ts"), "utf-8");
  assert(
    widgetActionContent.includes('"operator-verify-"'),
    "Widget domain verification token uses operator-verify- prefix"
  );

  const widgetServiceContent = readFileSync(join(__dirname, "../src/server/services/widget-service.ts"), "utf-8");
  assert(
    widgetServiceContent.includes("operator-verify="),
    "Widget DNS verification checks for operator-verify= TXT record"
  );

  console.log("\n=======================================================");
  console.log(`TOTAL PASSED: ${passedCount}`);
  console.log(`TOTAL FAILED: ${failedCount}`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
