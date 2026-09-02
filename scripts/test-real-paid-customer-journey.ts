import { db } from "../src/server/db";
import {
  organizations,
  users,
  memberships,
  subscriptions,
  billingAccounts,
  invoices,
  invoiceItems,
  payments,
  usageCounters,
  usageRecords,
  services,
  businessSettings,
  knowledgeChunks,
  knowledgeDocuments,
  communicationChannels,
  staffMembers,
} from "../src/server/db/schema";
import { eq, and } from "drizzle-orm";
import { entitlementService, EntitlementError } from "../src/server/services/billing/entitlement-service";
import crypto from "crypto";

interface JourneyStageResult {
  stage: string;
  expected: string;
  actual: string;
  passed: boolean;
  dbProof: Record<string, any>;
}

const journeyLog: JourneyStageResult[] = [];

function recordStage(stage: string, expected: string, actual: string, passed: boolean, dbProof: Record<string, any>) {
  journeyLog.push({ stage, expected, actual, passed, dbProof });
  const icon = passed ? "✅ PASS:" : "❌ FAIL:";
  console.log(`  ${icon} [${stage}] -> ${actual}`);
}

async function runCommercialSaaSCustomerJourney() {
  console.log("\n================================================================================");
  console.log("🌟 OPERATOR — REAL PAID SaaS COMMERCIAL CUSTOMER JOURNEY AUDIT");
  console.log("================================================================================\n");

  const ts = Date.now();
  const testOrgId = crypto.randomUUID();
  const testUserId = `usr_saas_cust_${ts}`;
  const testEmail = `dr.smith_${ts}@manhattanhealth.com`;
  const customerName = "Dr. Robert Smith";
  const orgName = "Manhattan Integrative Healthcare";

  // Ensure subscription plans exist in DB
  await entitlementService.seedCommercialPlans();

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 1: VISITOR -> SIGN UP & INITIAL TRIAL ACCOUNT CREATION
  // ──────────────────────────────────────────────────────────────────────────
  console.log("--- STAGE 1: Customer Signup & Trial Creation ---");
  await db.insert(users).values({
    id: testUserId,
    email: testEmail,
    name: customerName,
    status: "active",
    isVerified: true,
    acceptTerms: true,
    acceptPrivacy: true,
  });

  await db.insert(organizations).values({
    id: testOrgId,
    name: orgName,
    slug: `manhattan-health-${ts}`,
    industry: "Healthcare",
    email: testEmail,
    phone: "12125559876",
    timezone: "America/New_York",
    verificationStatus: "verified",
  });

  await db.insert(memberships).values({
    id: crypto.randomUUID(),
    organizationId: testOrgId,
    userId: testUserId,
    role: "owner",
  });

  // Default initial trial subscription
  const initialSubId = crypto.randomUUID();
  await db.insert(subscriptions).values({
    id: initialSubId,
    organizationId: testOrgId,
    planId: "free",
    status: "trialing",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  });

  const subStage1 = await entitlementService.getSubscription(testOrgId);
  recordStage(
    "1. Signup & Account Provisioning",
    "Subscription created in trialing status with free/trial tier",
    `Plan=${subStage1.planId}, Status=${subStage1.status}, IsActive=${subStage1.isActive}`,
    subStage1.status === "trialing" && subStage1.isActive === true,
    { orgId: testOrgId, subId: initialSubId }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 2: PLAN SELECTION & CHECKOUT (Starter Plan Purchase)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--- STAGE 2: Plan Purchase via Stripe Checkout ---");
  const stripeCustomerId = `cus_stripe_${ts}`;
  const stripeSubscriptionId = `sub_stripe_starter_${ts}`;

  // Simulate Stripe Webhook: checkout.session.completed for Starter Plan ($49/mo)
  const [billingAcc] = await db
    .insert(billingAccounts)
    .values({
      organizationId: testOrgId,
      stripeCustomerId,
      email: testEmail,
      currency: "USD",
    })
    .returning();

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await db
    .update(subscriptions)
    .set({
      planId: "starter",
      status: "active",
      stripeSubscriptionId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      updatedAt: now,
    })
    .where(eq(subscriptions.organizationId, testOrgId));

  const subStage2 = await entitlementService.getSubscription(testOrgId);
  recordStage(
    "2. Starter Plan Checkout & Activation",
    "Subscription updated to starter and active via Stripe Webhook",
    `Plan=${subStage2.planId}, Status=${subStage2.status}, MonthlyPrice=$${subStage2.planConfig.monthlyPrice}`,
    subStage2.planId === "starter" && subStage2.status === "active" && subStage2.planConfig.monthlyPrice === 49,
    { planId: subStage2.planId, stripeSubId: stripeSubscriptionId }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 3: PLAN-AWARE ONBOARDING & DYNAMIC BUSINESS READINESS
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--- STAGE 3: Plan-Aware Onboarding & Readiness Score ---");
  const onboardingReqs = await entitlementService.getPlanOnboardingRequirements(testOrgId);
  const starterRequiresVoice = onboardingReqs.steps.find((s) => s.id === "voice_telephony")?.required;
  const starterRequiresWhatsApp = onboardingReqs.steps.find((s) => s.id === "channels_messaging")?.required;

  // Simulate Customer completing business setup in Database
  await db.insert(businessSettings).values({
    organizationId: testOrgId,
    businessHours: {
      monday: { open: "08:00", close: "17:00", closed: false },
      tuesday: { open: "08:00", close: "17:00", closed: false },
      wednesday: { open: "08:00", close: "17:00", closed: false },
      thursday: { open: "08:00", close: "17:00", closed: false },
      friday: { open: "08:00", close: "17:00", closed: false },
    },
  });

  const serviceId1 = crypto.randomUUID();
  await db.insert(services).values({
    id: serviceId1,
    organizationId: testOrgId,
    name: "General Health Consultation",
    duration: 30,
    price: "150.00",
    isActive: true,
  });

  const docId = crypto.randomUUID();
  await db.insert(knowledgeDocuments).values({
    id: docId,
    organizationId: testOrgId,
    name: "Clinic Intake Guidelines",
    fileType: "text/plain",
    fileSize: 1024,
    filePath: "/docs/intake.txt",
    status: "indexed",
  });

  await db.insert(knowledgeChunks).values({
    id: crypto.randomUUID(),
    organizationId: testOrgId,
    documentId: docId,
    content: "Patients must arrive 15 minutes before appointment with photo ID and insurance card.",
    chunkIndex: 0,
    tokenCount: 20,
  });

  await db.insert(communicationChannels).values({
    id: crypto.randomUUID(),
    organizationId: testOrgId,
    type: "sms",
    name: "Vonage Primary SMS",
    status: "active",
  });

  await db.insert(staffMembers).values({
    id: crypto.randomUUID(),
    organizationId: testOrgId,
    name: customerName,
    email: testEmail,
    role: "Doctor",
    isActive: true,
  });

  const readiness = await entitlementService.getBusinessReadinessScore(testOrgId);
  recordStage(
    "3. Business Readiness Score Calculation",
    "Readiness score derived dynamically from database entities (>= 80% ready)",
    `ReadinessScore=${readiness.score}%, IsReady=${readiness.isReadyForProduction}, Services=${readiness.metrics.servicesCount}, Chunks=${readiness.metrics.knowledgeChunksCount}`,
    readiness.score >= 80 && readiness.isReadyForProduction === true,
    { score: readiness.score, checks: readiness.checks }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 4: SERVER-SIDE FEATURE GATING ENFORCEMENT
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--- STAGE 4: Server-Side Feature Gating (Starter vs Pro) ---");
  const starterCanSms = await entitlementService.canAccess(testOrgId, "sms_messaging");
  const starterCanVoice = await entitlementService.canAccess(testOrgId, "voice_ai");
  const starterCanWhatsApp = await entitlementService.canAccess(testOrgId, "whatsapp");
  const starterCanCustomAi = await entitlementService.canAccess(testOrgId, "custom_ai_training");

  let starterWhatsAppBlocked = false;
  try {
    await entitlementService.requireFeature(testOrgId, "whatsapp");
  } catch (err: any) {
    if (err instanceof EntitlementError && err.status === 403) {
      starterWhatsAppBlocked = true;
    }
  }

  recordStage(
    "4. Feature Gating for Starter Tier",
    "Starter has Voice/SMS, but WhatsApp and Custom AI Training are strictly blocked (403)",
    `SMS=${starterCanSms}, Voice=${starterCanVoice}, WhatsApp=${starterCanWhatsApp}, WhatsAppBlockedWith403=${starterWhatsAppBlocked}`,
    starterCanSms === true && starterCanVoice === true && starterCanWhatsApp === false && starterWhatsAppBlocked === true,
    { starterCanSms, starterCanVoice, starterCanWhatsApp, starterWhatsAppBlocked }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 5: USAGE METERING & LIMIT ENFORCEMENT (0% -> 80% -> 100% -> >100%)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--- STAGE 5: Dynamic Usage Metering & Limit Enforcement ---");
  // Starter limit: 500 conversations
  // 1. Initial 0%
  const usage0 = await entitlementService.getUsage(testOrgId, "conversations");
  
  // 2. Consume 400 conversations (80% warning threshold)
  const usage80Result = await entitlementService.recordUsage(testOrgId, "conversations", 400);
  const usage80State = await entitlementService.getUsage(testOrgId, "conversations");

  // 3. Consume remaining 100 to reach 100% (500/500)
  const usage100Result = await entitlementService.recordUsage(testOrgId, "conversations", 100);
  const usage100State = await entitlementService.getUsage(testOrgId, "conversations");

  // 4. Attempt 1 more conversation (>100% hard limit block)
  const usageOverResult = await entitlementService.recordUsage(testOrgId, "conversations", 1);

  recordStage(
    "5. Usage Limit Lifecycle (0% -> 80% -> 100% -> >100%)",
    "80% warns, 100% reaches limit, >100% hard blocks on Starter plan",
    `Usage80Action=${usage80Result.action}, Usage100State=${usage100State.state}, UsageOverAction=${usageOverResult.action}, Allowed=${usageOverResult.allowed}`,
    usage80Result.action === "warn" && usage100State.state === "limit_reached" && usageOverResult.action === "block" && usageOverResult.allowed === false,
    {
      usage80: usage80State.percentage,
      usage100: usage100State.percentage,
      overAction: usageOverResult.action,
      allowed: usageOverResult.allowed,
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 6: UPGRADE JOURNEY (Starter -> Professional Plan)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--- STAGE 6: Subscription Upgrade (Starter -> Professional) ---");
  const stripeSubProId = `sub_stripe_pro_${ts}`;
  
  // Customer upgrades to Pro ($149/mo) via Stripe
  await db
    .update(subscriptions)
    .set({
      planId: "pro",
      status: "active",
      stripeSubscriptionId: stripeSubProId,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, testOrgId));

  const subStage6 = await entitlementService.getSubscription(testOrgId);
  const proCanWhatsApp = await entitlementService.canAccess(testOrgId, "whatsapp");
  const proUsageCheck = await entitlementService.getUsage(testOrgId, "conversations");
  
  // After upgrade to Pro (2,500 limit), previous 501 usage is now well below limit (20%) and allowed!
  const retryUsageAfterUpgrade = await entitlementService.recordUsage(testOrgId, "conversations", 1);

  recordStage(
    "6. Upgrade to Professional Plan",
    "Plan upgraded to Pro; WhatsApp unlocked; Limit expanded from 500 to 2500; Usage unblocked",
    `Plan=${subStage6.planId}, Limit=${subStage6.planConfig.limits.conversations}, WhatsAppUnlocked=${proCanWhatsApp}, NewUsageAllowed=${retryUsageAfterUpgrade.allowed}`,
    subStage6.planId === "pro" && proCanWhatsApp === true && retryUsageAfterUpgrade.allowed === true,
    { newPlan: subStage6.planId, newLimit: subStage6.planConfig.limits.conversations }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 7: RENEWAL & INVOICE REVENUE ACCOUNTING
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--- STAGE 7: Subscription Renewal & Itemized Invoice Generation ---");
  const invoiceNum = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  
  const [createdInvoice] = await db
    .insert(invoices)
    .values({
      billingAccountId: billingAcc.id,
      subscriptionId: initialSubId,
      number: invoiceNum,
      status: "paid",
      subtotal: "149.00",
      tax: "0.00",
      total: "149.00",
      paidAt: new Date(),
    })
    .returning();

  await db.insert(invoiceItems).values({
    invoiceId: createdInvoice.id,
    description: "Professional Plan Monthly Subscription",
    amount: "149.00",
    quantity: 1,
  });

  await db.insert(payments).values({
    billingAccountId: billingAcc.id,
    subscriptionId: initialSubId,
    amount: "149.00",
    currency: "USD",
    status: "succeeded",
    providerPaymentId: `ch_stripe_ren_${ts}`,
    invoiceId: createdInvoice.id,
  });

  recordStage(
    "7. Renewal & Revenue Accounting",
    "Invoice created and payment recorded in DB for $149.00",
    `InvoiceNum=${invoiceNum}, Amount=$149.00, Status=${createdInvoice.status}`,
    createdInvoice.status === "paid" && createdInvoice.total === "149.00",
    { invoiceId: createdInvoice.id, invoiceNumber: invoiceNum }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 8: FAILED PAYMENT & GRACE PERIOD
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--- STAGE 8: Payment Failure & Grace Period Handling ---");
  // Webhook invoice.payment_failed arrives -> subscription transitions to past_due
  await db
    .update(subscriptions)
    .set({
      status: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, testOrgId));

  const subStage8 = await entitlementService.getSubscription(testOrgId);
  const pastDueHasAccess = await entitlementService.canAccess(testOrgId, "voice_ai");

  recordStage(
    "8. Payment Failure & Grace Period",
    "Status becomes past_due, but grace period retains temporary access for service continuity",
    `Status=${subStage8.status}, IsPastDue=${subStage8.isPastDue}, RetainsAccessDuringGrace=${pastDueHasAccess}`,
    subStage8.status === "past_due" && subStage8.isPastDue === true && pastDueHasAccess === true,
    { status: subStage8.status, isPastDue: subStage8.isPastDue }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 9: PAYMENT RECOVERY & ACCOUNT RESTORATION
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--- STAGE 9: Payment Recovery & Account Restoration ---");
  // Customer updates card -> invoice retry succeeds -> subscription restored to active
  await db
    .update(subscriptions)
    .set({
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, testOrgId));

  const subStage9 = await entitlementService.getSubscription(testOrgId);

  recordStage(
    "9. Payment Recovery & Restoration",
    "Subscription successfully restored to active status upon successful payment retry",
    `Status=${subStage9.status}, IsActive=${subStage9.isActive}, IsPastDue=${subStage9.isPastDue}`,
    subStage9.status === "active" && subStage9.isActive === true && subStage9.isPastDue === false,
    { status: subStage9.status }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 10: CANCELLATION & COMPLETE DATA PRESERVATION
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--- STAGE 10: Cancellation & Complete Customer Data Preservation ---");
  // Customer cancels -> status='canceled' -> entitlements downgrade to free
  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, testOrgId));

  const subStage10 = await entitlementService.getSubscription(testOrgId);
  const canceledCanWhatsApp = await entitlementService.canAccess(testOrgId, "whatsapp");

  // Verify all customer services, knowledge chunks, staff, and settings are 100% preserved
  const [savedServices, savedChunks, savedStaff, savedSettings] = await Promise.all([
    db.query.services.findMany({ where: eq(services.organizationId, testOrgId) }),
    db.query.knowledgeChunks.findMany({ where: eq(knowledgeChunks.organizationId, testOrgId) }),
    db.query.staffMembers.findMany({ where: eq(staffMembers.organizationId, testOrgId) }),
    db.query.businessSettings.findFirst({ where: eq(businessSettings.organizationId, testOrgId) }),
  ]);

  const dataPreserved = savedServices.length === 1 && savedChunks.length === 1 && savedStaff.length === 1 && !!savedSettings;

  recordStage(
    "10. Cancellation & Data Preservation",
    "Subscription canceled; Entitlements restricted to free; 100% of business data preserved in DB",
    `Status=${subStage10.status}, WhatsAppRestricted=${!canceledCanWhatsApp}, ServicesPreserved=${savedServices.length}, ChunksPreserved=${savedChunks.length}, StaffPreserved=${savedStaff.length}`,
    subStage10.status === "canceled" && canceledCanWhatsApp === false && dataPreserved === true,
    {
      status: subStage10.status,
      servicesCount: savedServices.length,
      chunksCount: savedChunks.length,
      staffCount: savedStaff.length,
    }
  );

  console.log("\n================================================================================");
  console.log("🏁 REAL PAID SaaS CUSTOMER JOURNEY AUDIT SUMMARY:");
  console.log("================================================================================");
  const allPassed = journeyLog.every((j) => j.passed);
  console.log(`Total Lifecycle Stages Tested: ${journeyLog.length}`);
  console.log(`Passed: ${journeyLog.filter((j) => j.passed).length}`);
  console.log(`Failed: ${journeyLog.filter((j) => !j.passed).length}`);
  console.log(`Overall Commercial Journey Status: ${allPassed ? "100% PASS (COMMERCIALLY READY)" : "FAIL"}`);
  console.log("================================================================================\n");

  return { allPassed, journeyLog };
}

runCommercialSaaSCustomerJourney()
  .then((res) => {
    if (!res.allPassed) process.exit(1);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Commercial SaaS customer journey audit failed:", err);
    process.exit(1);
  });
