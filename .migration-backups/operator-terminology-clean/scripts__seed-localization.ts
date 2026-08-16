/**
 * seed-localization.ts
 * Seeds countries, currencies, languages, translations, and holiday registers into CockroachDB.
 * Run with: npx tsx --env-file=.env scripts/seed-localization.ts
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
  console.log("🌱 Seeding Localization Infrastructure...");

  try {
    // 1. Clean existing records (cascade handles child rows)
    await sql`DELETE FROM "translations"`;
    await sql`DELETE FROM "holidays"`;
    await sql`DELETE FROM "business_localization"`;
    await sql`DELETE FROM "countries"`;
    await sql`DELETE FROM "languages"`;
    await sql`DELETE FROM "currencies"`;

    console.log("🧹 Cleared existing localization registries.");

    // 2. Insert Currencies
    const curList = [
      { code: "USD", symbol: "$", position: "prefix", decimal_separator: ".", thousand_separator: ",", exchange_rate_to_usd: "1.0" },
      { code: "INR", symbol: "₹", position: "prefix", decimal_separator: ".", thousand_separator: ",", exchange_rate_to_usd: "0.012" },
      { code: "EUR", symbol: "€", position: "suffix", decimal_separator: ",", thousand_separator: ".", exchange_rate_to_usd: "1.09" },
      { code: "GBP", symbol: "£", position: "prefix", decimal_separator: ".", thousand_separator: ",", exchange_rate_to_usd: "1.27" },
    ];

    for (const c of curList) {
      await sql`
        INSERT INTO "currencies" (code, symbol, position, decimal_separator, thousand_separator, exchange_rate_to_usd)
        VALUES (${c.code}, ${c.symbol}, ${c.position}, ${c.decimal_separator}, ${c.thousand_separator}, ${c.exchange_rate_to_usd})
      `;
    }
    console.log("✅ Seeded 4 global settlement currencies.");

    // 3. Insert Languages
    const langList = [
      { code: "en", name: "English", native_name: "English", is_rtl: false, plural_rules: "one_other", fallback_code: null, is_enabled: true },
      { code: "hi", name: "Hindi", native_name: "हिन्दी", is_rtl: false, plural_rules: "one_other", fallback_code: "en", is_enabled: true },
      { code: "de", name: "German", native_name: "Deutsch", is_rtl: false, plural_rules: "one_other", fallback_code: "en", is_enabled: true },
      { code: "es", name: "Spanish", native_name: "Español", is_rtl: false, plural_rules: "one_other", fallback_code: "en", is_enabled: true },
      { code: "ar", name: "Arabic", native_name: "العربية", is_rtl: true, plural_rules: "zero_one_two_few_many_other", fallback_code: "en", is_enabled: true },
    ];

    for (const l of langList) {
      await sql`
        INSERT INTO "languages" (code, name, native_name, is_rtl, plural_rules, fallback_code, is_enabled)
        VALUES (${l.code}, ${l.name}, ${l.native_name}, ${l.is_rtl}, ${l.plural_rules}, ${l.fallback_code}, ${l.is_enabled})
      `;
    }
    console.log("✅ Seeded 5 primary languages (including RTL Arabic).");

    // 4. Insert Countries
    const countList = [
      { code: "US", name: "United States", primary_currency: "USD", primary_language: "en", phone_code: "+1", tax_type: "SalesTax", date_format: "MM/DD/YYYY", time_format: "12h", week_start: 0, measurement_unit: "imperial" },
      { code: "IN", name: "India", primary_currency: "INR", primary_language: "hi", phone_code: "+91", tax_type: "GST", date_format: "DD/MM/YYYY", time_format: "12h", week_start: 1, measurement_unit: "metric" },
      { code: "DE", name: "Germany", primary_currency: "EUR", primary_language: "de", phone_code: "+49", tax_type: "VAT", date_format: "DD/MM/YYYY", time_format: "24h", week_start: 1, measurement_unit: "metric" },
      { code: "GB", name: "United Kingdom", primary_currency: "GBP", primary_language: "en", phone_code: "+44", tax_type: "VAT", date_format: "DD/MM/YYYY", time_format: "12h", week_start: 1, measurement_unit: "metric" },
    ];

    for (const cn of countList) {
      await sql`
        INSERT INTO "countries" (code, name, primary_currency, primary_language, phone_code, tax_type, date_format, time_format, week_start, measurement_unit)
        VALUES (${cn.code}, ${cn.name}, ${cn.primary_currency}, ${cn.primary_language}, ${cn.phone_code}, ${cn.tax_type}, ${cn.date_format}, ${cn.time_format}, ${cn.week_start}, ${cn.measurement_unit})
      `;
    }
    console.log("✅ Seeded 4 global country rules config registries.");

    // 5. Seed Holidays
    const holidayList = [
      { country_code: "US", name: "New Year's Day", date: "01-01", is_national: true },
      { country_code: "US", name: "Independence Day", date: "07-04", is_national: true },
      { country_code: "IN", name: "Republic Day", date: "01-26", is_national: true },
      { country_code: "IN", name: "Independence Day", date: "08-15", is_national: true },
      { country_code: "DE", name: "Unity Day", date: "10-03", is_national: true },
    ];

    for (const h of holidayList) {
      await sql`
        INSERT INTO "holidays" (country_code, name, date, is_national)
        VALUES (${h.country_code}, ${h.name}, ${h.date}, ${h.is_national})
      `;
    }
    console.log("✅ Seeded basic national holidays.");

    // 6. Seed translations
    const translationList = [
      // English
      { language_code: "en", namespace: "common", key: "welcome", value: "Welcome to the AI Receptionist Desk!" },
      { language_code: "en", namespace: "common", key: "save", value: "Save Settings" },
      { language_code: "en", namespace: "common", key: "cancel", value: "Cancel" },
      // Hindi
      { language_code: "hi", namespace: "common", key: "welcome", value: "एआई रिसेप्शनिस्ट डेस्क पर आपका स्वागत है!" },
      { language_code: "hi", namespace: "common", key: "save", value: "सेटिंग्स सुरक्षित करें" },
      { language_code: "hi", namespace: "common", key: "cancel", value: "रद्द करें" },
      // German
      { language_code: "de", namespace: "common", key: "welcome", value: "Willkommen am KI-Empfangsschalter!" },
      { language_code: "de", namespace: "common", key: "save", value: "Einstellungen speichern" },
      { language_code: "de", namespace: "common", key: "cancel", value: "Abbrechen" },
      // Arabic
      { language_code: "ar", namespace: "common", key: "welcome", value: "مرحباً بك في مكتب الاستقبال بالذكاء الاصطناعي!" },
      { language_code: "ar", namespace: "common", key: "save", value: "حفظ الإعدادات" },
      { language_code: "ar", namespace: "common", key: "cancel", value: "إلغاء" },
    ];

    for (const t of translationList) {
      await sql`
        INSERT INTO "translations" (language_code, namespace, key, value)
        VALUES (${t.language_code}, ${t.namespace}, ${t.key}, ${t.value})
      `;
    }
    console.log("✅ Seeded dynamic visual UI translations.");

    console.log("🌱 Localization seeding complete!");
  } catch (err: any) {
    console.error("❌ Seeding failed:", err.message);
  } finally {
    await sql.end();
  }
}

main();
