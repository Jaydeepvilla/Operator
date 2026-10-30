/**
 * seed-billing.ts
 * Seeds payment providers and capabilities info into CockroachDB.
 * Run with: npx tsx --env-file=.env scripts/seed-billing.ts
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set.");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  prepare: false,
  max: 1,
});

async function main() {
  console.log("🌱 Seeding Billing Infrastructure...");

  try {
    // 1. Clean existing records (cascade is handled by FK)
    await sql`DELETE FROM "payment_provider_capabilities"`;
    await sql`DELETE FROM "payment_provider_currencies"`;
    await sql`DELETE FROM "payment_provider_languages"`;
    await sql`DELETE FROM "payment_provider_regions"`;
    await sql`DELETE FROM "payment_providers"`;

    console.log("🧹 Cleared existing billing setup metadata.");

    // 2. Insert payment_providers
    const providers = [
      { id: "stripe", name: "Stripe", description: "Global leader in online payments, cards, and subscription scaling.", is_enabled: true },
      { id: "razorpay", name: "Razorpay", description: "Best payment platform for India, cards, UPI, netbanking, and local wallets.", is_enabled: true },
      { id: "paypal", name: "PayPal", description: "Trusted worldwide brand for express checkouts and wallet-based billing.", is_enabled: true },
      { id: "paddle", name: "Paddle", description: "Merchant of Record handling global tax compliance and local card checkouts.", is_enabled: true },
      { id: "mollie", name: "Mollie", description: "Ideal local payment broker for European merchants (iDEAL, Sofort, cards).", is_enabled: true },
    ];

    for (const p of providers) {
      await sql`
        INSERT INTO "payment_providers" (id, name, description, is_enabled)
        VALUES (${p.id}, ${p.name}, ${p.description}, ${p.is_enabled})
      `;
    }
    console.log("✅ Seeded 5 primary payment providers.");

    // 3. Insert payment_provider_regions
    const regions = [
      // Stripe
      { provider_id: "stripe", country_code: "US", is_recommended: true, recommendation_reason: "Gold standard for US cards, ACH bank transfers, and Apple Pay." },
      { provider_id: "stripe", country_code: "GB", is_recommended: true, recommendation_reason: "Excellent GBR card processing and local BACS debit support." },
      { provider_id: "stripe", country_code: "DE", is_recommended: true, recommendation_reason: "Supports SEPA direct debit and credit card subscriptions in EUR." },
      { provider_id: "stripe", country_code: "FR", is_recommended: true, recommendation_reason: "High approval rates for European cards and Apple Pay." },
      // Razorpay
      { provider_id: "razorpay", country_code: "IN", is_recommended: true, recommendation_reason: "Industry-best support for India's local UPI, Netbanking, and INR subscriptions." },
      // PayPal
      { provider_id: "paypal", country_code: "US", is_recommended: false, recommendation_reason: "Secondary wallet payment support." },
      { provider_id: "paypal", country_code: "GB", is_recommended: false, recommendation_reason: "Popular digital wallet alternative." },
      { provider_id: "paypal", country_code: "DE", is_recommended: false, recommendation_reason: "High wallet usage across Germany." },
      // Paddle
      { provider_id: "paddle", country_code: "US", is_recommended: false, recommendation_reason: "Merchant of Record wrapper." },
      { provider_id: "paddle", country_code: "DE", is_recommended: false, recommendation_reason: "Handles VAT tax collection automatically." },
      // Mollie
      { provider_id: "mollie", country_code: "DE", is_recommended: false, recommendation_reason: "Strong Sofort and Giropay coverage." },
      { provider_id: "mollie", country_code: "FR", is_recommended: false, recommendation_reason: "Excellent local European checkout broker." },
    ];

    for (const r of regions) {
      await sql`
        INSERT INTO "payment_provider_regions" (provider_id, country_code, is_recommended, recommendation_reason)
        VALUES (${r.provider_id}, ${r.country_code}, ${r.is_recommended}, ${r.recommendation_reason})
      `;
    }
    console.log("✅ Seeded supported countries and recommendation matrices.");

    // 4. Insert currencies
    const currencies = [
      // Stripe
      { provider_id: "stripe", currency_code: "USD" },
      { provider_id: "stripe", currency_code: "EUR" },
      { provider_id: "stripe", currency_code: "GBP" },
      { provider_id: "stripe", currency_code: "CAD" },
      // Razorpay
      { provider_id: "razorpay", currency_code: "INR" },
      // PayPal
      { provider_id: "paypal", currency_code: "USD" },
      { provider_id: "paypal", currency_code: "EUR" },
      { provider_id: "paypal", currency_code: "GBP" },
      // Paddle
      { provider_id: "paddle", currency_code: "USD" },
      { provider_id: "paddle", currency_code: "EUR" },
      // Mollie
      { provider_id: "mollie", currency_code: "EUR" },
    ];

    for (const c of currencies) {
      await sql`
        INSERT INTO "payment_provider_currencies" (provider_id, currency_code)
        VALUES (${c.provider_id}, ${c.currency_code})
      `;
    }
    console.log("✅ Seeded currency compliance codes.");

    // 5. Insert languages
    const languages = [
      // Stripe
      { provider_id: "stripe", language_code: "en" },
      { provider_id: "stripe", language_code: "de" },
      { provider_id: "stripe", language_code: "fr" },
      { provider_id: "stripe", language_code: "es" },
      // Razorpay
      { provider_id: "razorpay", language_code: "en" },
      { provider_id: "razorpay", language_code: "hi" },
      { provider_id: "razorpay", language_code: "gu" },
      // PayPal
      { provider_id: "paypal", language_code: "en" },
      { provider_id: "paypal", language_code: "fr" },
      // Paddle
      { provider_id: "paddle", language_code: "en" },
      // Mollie
      { provider_id: "mollie", language_code: "en" },
      { provider_id: "mollie", language_code: "de" },
    ];

    for (const l of languages) {
      await sql`
        INSERT INTO "payment_provider_languages" (provider_id, language_code)
        VALUES (${l.provider_id}, ${l.language_code})
      `;
    }
    console.log("✅ Seeded language locales compliance registry.");

    // 6. Insert capabilities
    const capabilities = [
      {
        provider_id: "stripe",
        one_time: true,
        subscriptions: true,
        refunds: true,
        apple_pay: true,
        google_pay: true,
        upi: false,
        netbanking: false,
        bnpl: true,
      },
      {
        provider_id: "razorpay",
        one_time: true,
        subscriptions: true,
        refunds: true,
        apple_pay: false,
        google_pay: true,
        upi: true,
        netbanking: true,
        bnpl: true,
      },
      {
        provider_id: "paypal",
        one_time: true,
        subscriptions: true,
        refunds: true,
        apple_pay: false,
        google_pay: false,
        upi: false,
        netbanking: false,
        bnpl: true,
      },
      {
        provider_id: "paddle",
        one_time: true,
        subscriptions: true,
        refunds: true,
        apple_pay: true,
        google_pay: true,
        upi: false,
        netbanking: false,
        bnpl: false,
      },
      {
        provider_id: "mollie",
        one_time: true,
        subscriptions: true,
        refunds: true,
        apple_pay: true,
        google_pay: true,
        upi: false,
        netbanking: true,
        bnpl: true,
      },
    ];

    for (const cap of capabilities) {
      await sql`
        INSERT INTO "payment_provider_capabilities" (provider_id, one_time, subscriptions, refunds, apple_pay, google_pay, upi, netbanking, bnpl)
        VALUES (
          ${cap.provider_id}, ${cap.one_time}, ${cap.subscriptions}, ${cap.refunds},
          ${cap.apple_pay}, ${cap.google_pay}, ${cap.upi}, ${cap.netbanking}, ${cap.bnpl}
        )
      `;
    }
    console.log("✅ Seeded capability matrices.");

    console.log("🌱 Billing seed complete!");
  } catch (err: any) {
    console.error("❌ Billing seed failed:", err.message);
  } finally {
    await sql.end();
  }
}

main();
