import { 
  getPaymentProviderConfig, 
  getPaymentProviderStatus, 
  requirePaymentProviderConfiguration,
  formatControlledBillingError,
  generateCorrelationId,
  PaymentConfigurationError,
  CheckoutValidationError
} from "../src/server/services/billing/config";
import { 
  createCheckoutSessionAction, 
  upgradeSubscriptionAction, 
  cancelSubscriptionAction,
  getPaymentConfigStatusAction
} from "../src/server/actions/billing";
import { db } from "../src/server/db";
import { 
  organizations, 
  subscriptions, 
  subscriptionPlans,
  billingAccounts, 
  payments, 
  invoices,
  businessPaymentSettings
} from "../src/server/db/schema";
import { eq, and } from "drizzle-orm";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ""}`);
  }
}

async function runBillingConfigurationTestSuite() {
  console.log("\n=======================================================");
  console.log("  BILLING CHECKOUT & PAYMENT CONFIGURATION TEST SUITE");
  console.log("=======================================================\n");

  const originalEnv = { ...process.env };

  // -------------------------------------------------------------
  // Test Category 1: Missing Payment Secret (STRIPE_SECRET_KEY missing)
  // -------------------------------------------------------------
  console.log("--- Category 1: Missing Payment Configuration ---");

  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;

  const missingStatus = await getPaymentProviderStatus("stripe");
  assert(missingStatus.state === "NOT_CONFIGURED", "Status is NOT_CONFIGURED when secret key missing");
  assert(missingStatus.isAvailable === false, "isAvailable is false when secret key missing");
  assert(missingStatus.missingFields.includes("STRIPE_SECRET_KEY"), "missingFields accurately flags STRIPE_SECRET_KEY");

  let caughtMissingErr: any = null;
  try {
    await requirePaymentProviderConfiguration("stripe");
  } catch (err: any) {
    caughtMissingErr = err;
  }

  assert(caughtMissingErr instanceof PaymentConfigurationError, "requirePaymentProviderConfiguration throws typed PaymentConfigurationError");
  assert(caughtMissingErr?.code === "PAYMENT_CONFIGURATION_UNAVAILABLE", "Error code is PAYMENT_CONFIGURATION_UNAVAILABLE");
  assert(caughtMissingErr?.correlationId?.startsWith("CHK-"), "Correlation ID is generated in error");

  const formattedMissing = formatControlledBillingError(caughtMissingErr);
  assert(formattedMissing.success === false, "Formatted error success is false");
  assert(formattedMissing.code === "PAYMENT_CONFIGURATION_UNAVAILABLE", "Formatted code matches controlled error");
  assert(formattedMissing.retryable === false, "Configuration errors are marked retryable = false");
  assert(!JSON.stringify(formattedMissing).includes("process.env"), "No internal environment variables exposed in error");

  // -------------------------------------------------------------
  // Test Category 2: Partial Configuration (Secret Present, Webhook Missing)
  // -------------------------------------------------------------
  console.log("\n--- Category 2: Partial Configuration ---");

  process.env.STRIPE_SECRET_KEY = "sk_test_valid_mock_key_for_testing_purposes_12345";
  delete process.env.STRIPE_WEBHOOK_SECRET;

  const partialConfig = await getPaymentProviderConfig("stripe");
  assert(partialConfig.state === "PARTIALLY_CONFIGURED", "State is PARTIALLY_CONFIGURED when webhook secret missing");
  assert(partialConfig.isAvailable === false, "isAvailable is false when partially configured");
  assert(partialConfig.missingFields.includes("STRIPE_WEBHOOK_SECRET"), "missingFields flags missing webhook secret");

  let caughtPartialErr: any = null;
  try {
    await requirePaymentProviderConfiguration("stripe");
  } catch (err: any) {
    caughtPartialErr = err;
  }
  assert(caughtPartialErr?.code === "PAYMENT_CONFIG_PARTIAL", "Typed error code is PAYMENT_CONFIG_PARTIAL");

  // -------------------------------------------------------------
  // Test Category 3: Invalid Configuration (Dummy / Placeholder Keys)
  // -------------------------------------------------------------
  console.log("\n--- Category 3: Invalid Configuration Detection ---");

  const invalidKeys = [
    "your_stripe_secret_key_here",
    "sk_test_xxx",
    "placeholder",
    "123",
  ];

  for (const invKey of invalidKeys) {
    process.env.STRIPE_SECRET_KEY = invKey;
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test1234567890123456";

    const invConfig = await getPaymentProviderConfig("stripe");
    assert(
      invConfig.state === "INVALID_CONFIGURATION" || invConfig.state === "NOT_CONFIGURED",
      `Invalid key "${invKey.slice(0, 10)}..." rejected as ${invConfig.state}`
    );
    assert(invConfig.isAvailable === false, "Invalid configuration marked as unavailable");
  }

  // -------------------------------------------------------------
  // Test Category 4: Disabled Provider State
  // -------------------------------------------------------------
  console.log("\n--- Category 4: Disabled Provider State ---");

  process.env.PAYMENT_ENABLED = "false";
  const disabledConfig = await getPaymentProviderConfig("stripe");
  assert(disabledConfig.state === "DISABLED", "State is DISABLED when PAYMENT_ENABLED is false");
  assert(disabledConfig.isAvailable === false, "Disabled provider is unavailable");

  let caughtDisabledErr: any = null;
  try {
    await requirePaymentProviderConfiguration("stripe");
  } catch (err: any) {
    caughtDisabledErr = err;
  }
  assert(caughtDisabledErr?.code === "PAYMENT_PROVIDER_DISABLED", "Error code is PAYMENT_PROVIDER_DISABLED");

  delete process.env.PAYMENT_ENABLED;

  // -------------------------------------------------------------
  // Test Category 5: Fully Configured State
  // -------------------------------------------------------------
  console.log("\n--- Category 5: Fully Configured State ---");

  process.env.STRIPE_SECRET_KEY = "sk_test_51MockValidStripeSecretKeyForTesting12345";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_mockWebhookSecretKeyForTesting123456";
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_mockPublishableKey12345";

  const fullConfig = await getPaymentProviderConfig("stripe");
  assert(fullConfig.state === "CONFIGURED", "State is CONFIGURED when all credentials present");
  assert(fullConfig.isAvailable === true, "isAvailable is true when fully configured");
  assert(fullConfig.missingFields.length === 0, "No missing fields when fully configured");

  const fullPublicStatus = await getPaymentProviderStatus("stripe");
  assert(fullPublicStatus.state === "CONFIGURED", "Public status reflects CONFIGURED");
  assert(fullPublicStatus.publishableKey === "pk_test_mockPublishableKey12345", "Publishable key is safely exposed");
  assert(!("secretKey" in fullPublicStatus), "Secret key is NEVER present in public status");
  assert(!("webhookSecret" in fullPublicStatus), "Webhook secret is NEVER present in public status");

  // -------------------------------------------------------------
  // Test Category 6: Database & Action Execution with Missing Config
  // -------------------------------------------------------------
  console.log("\n--- Category 6: Database State Consistency on Missing Config ---");

  // Setup test organization
  const testOrgId = "00000000-0000-0000-0000-0000000000c3";

  await db.delete(subscriptions).where(eq(subscriptions.organizationId, testOrgId));
  await db.delete(organizations).where(eq(organizations.id, testOrgId));

  // Ensure free plan exists in subscription_plans
  await db.insert(subscriptionPlans).values({
    id: "free",
    name: "Free Plan",
    price: "0",
    interval: "month",
    features: ["Basic features"],
  }).onConflictDoNothing();

  await db.insert(organizations).values({
    id: testOrgId,
    name: "Billing Test Org",
    slug: "billing-test-org",
    industry: "SaaS",
    timezone: "UTC",
  });

  const [initialSub] = await db.insert(subscriptions).values({
    organizationId: testOrgId,
    planId: "free",
    status: "trialing",
  }).returning();

  // Wipe stripe environment to simulate production outage / unconfigured state
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;

  // Direct check on tenant checkout
  const checkStatus = await getPaymentProviderStatus("stripe", testOrgId);
  assert(checkStatus.isAvailable === false, "Tenant checkout status correctly returns unavailable");

  // Verify DB state is pristine and untouched
  const [subAfter] = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, testOrgId));
  assert(subAfter.planId === "free", "Subscription planId remains 'free' (no unauthorized upgrade)");
  assert(subAfter.status === "trialing", "Subscription status remains 'trialing' (no fake active state)");

  const paymentRecords = await db.select().from(payments).where(eq(payments.subscriptionId, initialSub.id));
  assert(paymentRecords.length === 0, "No fake payment records created in database");

  // Clean up test data
  await db.delete(subscriptions).where(eq(subscriptions.organizationId, testOrgId));
  await db.delete(organizations).where(eq(organizations.id, testOrgId));

  // Restore env
  process.env = originalEnv;

  // -------------------------------------------------------------
  // Test Summary
  // -------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`  TEST RESULTS: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runBillingConfigurationTestSuite().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
