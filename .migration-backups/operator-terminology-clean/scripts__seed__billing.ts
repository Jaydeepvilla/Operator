import { db } from "../../src/server/db";
import {
  subscriptionPlans,
  plans,
  subscriptions,
  billingAccounts,
  paymentMethods,
  invoices,
  invoiceItems,
  payments,
  coupons,
  discounts
} from "../../src/server/db/schema";
import { ORG_ID } from "./business";

export async function seedBilling(): Promise<void> {
  console.log("💵 Seeding SaaS plans, subscriptions, and customer billing accounts...");

  // 1. Seed subscription plans
  await db.insert(subscriptionPlans).values([
    { id: "free", name: "Free Tier", description: "Standard basic receptionist setup", price: "0.00", interval: "month", features: ["1 chatbot", "50 messages/mo"] },
    { id: "pro", name: "Professional Plan", description: "Complete AI receptionist platform", price: "49.00", interval: "month", features: ["Unlimited chatbot", "5000 messages/mo", "SMS/WhatsApp Integrations"] },
    { id: "enterprise", name: "Enterprise Suite", description: "Custom models, voice receptionist, high limits", price: "199.00", interval: "month", features: ["Custom AI voice", "Private API", "Dedicated Support"] }
  ]).onConflictDoNothing();

  // 2. Seed plans
  await db.insert(plans).values([
    {
      id: "free",
      name: "Free Plan",
      description: "Basic receptionist tools",
      monthlyPrice: "0.00",
      yearlyPrice: "0.00",
      trialDays: 0,
      features: ["basic_chat"],
      usageLimits: {},
      overageRules: {},
      visibility: "public",
      status: "active"
    },
    {
      id: "pro",
      name: "Professional Plan",
      description: "The complete AI frontdesk platform",
      monthlyPrice: "49.00",
      yearlyPrice: "470.00",
      trialDays: 14,
      features: ["basic_chat", "voice_assistant", "whatsapp_channel", "sms_channel"],
      usageLimits: { calls: 1000, messages: 5000 },
      overageRules: { calls_per_unit: 0.15 },
      visibility: "public",
      status: "active"
    },
    {
      id: "enterprise",
      name: "Enterprise Plan",
      description: "Full customization and dedicated lines",
      monthlyPrice: "199.00",
      yearlyPrice: "1900.00",
      trialDays: 30,
      features: ["basic_chat", "voice_assistant", "whatsapp_channel", "sms_channel", "custom_avatars", "premium_voices"],
      usageLimits: { calls: 10000, messages: 50000 },
      overageRules: { calls_per_unit: 0.10 },
      visibility: "public",
      status: "active"
    }
  ]).onConflictDoNothing();

  // 3. Link organization to subscription
  const trialStart = new Date();
  trialStart.setDate(trialStart.getDate() - 10); // started 10 days ago
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 4); // trial ends in 4 days

  await db.insert(subscriptions).values({
    organizationId: ORG_ID,
    planId: "pro",
    status: "trialing",
    trialStart: trialStart,
    trialEnd: trialEnd,
    currentPeriodStart: trialStart,
    currentPeriodEnd: trialEnd,
    stripeSubscriptionId: "sub_1StripeMockSetup",
  }).onConflictDoNothing();

  // 4. Create Billing Account for client billing page
  const billingAccountId = "bbbbbbbb-4444-4444-4444-444444444444";
  await db.insert(billingAccounts).values({
    id: billingAccountId,
    organizationId: ORG_ID,
    stripeCustomerId: "cus_GlowGraceCust123",
    email: "concierge@glowandgraceesthetics.com",
    currency: "USD",
  }).onConflictDoNothing();

  // 5. Seed Payment Method
  await db.insert(paymentMethods).values({
    billingAccountId: billingAccountId,
    provider: "stripe",
    providerPaymentMethodId: "pm_1StripeMockCardVisa4242",
    brand: "visa",
    last4: "4242",
    expMonth: 12,
    expYear: 2029,
    isDefault: true,
  }).onConflictDoNothing();

  // 6. Seed Invoices (Paid and Draft)
  const invoice1Id = "d1111111-1111-1111-1111-111111111111";
  const invoice2Id = "d2222222-2222-2222-2222-222222222222";

  await db.insert(invoices).values([
    {
      id: invoice1Id,
      billingAccountId: billingAccountId,
      number: "INV-2026-001",
      status: "paid",
      subtotal: "49.00",
      tax: "0.00",
      total: "49.00",
      dueDate: new Date(trialStart.getTime() + 2 * 24 * 60 * 60 * 1000),
      pdfUrl: "https://stripe.com/receipt/inv_mock1"
    },
    {
      id: invoice2Id,
      billingAccountId: billingAccountId,
      number: "INV-2026-002",
      status: "open",
      subtotal: "75.50",
      tax: "0.00",
      total: "75.50",
      dueDate: trialEnd,
      pdfUrl: "https://stripe.com/receipt/inv_mock2"
    }
  ]).onConflictDoNothing();

  // 7. Seed Invoice Items
  await db.insert(invoiceItems).values([
    { invoiceId: invoice1Id, description: "Professional Plan Monthly Subscription", amount: "49.00", quantity: 1 },
    { invoiceId: invoice2Id, description: "Professional Plan Monthly Subscription", amount: "49.00", quantity: 1 },
    { invoiceId: invoice2Id, description: "AI Voice Overage Minutes (177 mins)", amount: "26.50", quantity: 177 }
  ]).onConflictDoNothing();

  // 8. Seed Payments
  await db.insert(payments).values({
    billingAccountId: billingAccountId,
    invoiceId: invoice1Id,
    amount: "49.00",
    status: "succeeded",
    providerPaymentId: "ch_StripeMockCharge123",
    createdAt: trialStart,
  }).onConflictDoNothing();

  // 9. Seed Coupons
  const couponId = "cccccccc-9999-1111-1111-111111111111";
  await db.insert(coupons).values({
    id: couponId,
    code: "SUMMERGLOW20",
    type: "percentage",
    value: "20.00",
    isActive: true,
  }).onConflictDoNothing();

  // 10. Seed Discount
  await db.insert(discounts).values({
    billingAccountId: billingAccountId,
    couponId: couponId,
  }).onConflictDoNothing();

  console.log("✅ Seeded customer Billing, Invoices, Subscriptions, and Payments data");
}
