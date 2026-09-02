import { parseNaturalDateTime, isValidCalendarDate, getDaysInMonth } from "../src/lib/date";

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`[PASS] ${description}`);
    passed++;
  } else {
    console.error(`[FAIL] ${description}`);
    failed++;
  }
}

console.log("=================================================");
console.log("TEST SUITE: Natural-Language Date Parsing & Guard");
console.log("=================================================");

// Fixed reference date: Wednesday, August 12, 2026 10:00:00 UTC
const refDate = new Date(Date.UTC(2026, 7, 12, 10, 0, 0)); // Month index 7 = August

// -------------------------------------------------------------
// 1. Relative Dates
// -------------------------------------------------------------
console.log("\n--- 1. Relative Dates ---");

const resToday = parseNaturalDateTime("today", { referenceDate: refDate, timezone: "UTC" });
assert(resToday.success === true && resToday.isoDate === "2026-08-12", "Parse 'today'");

const resTomorrow = parseNaturalDateTime("tomorrow", { referenceDate: refDate, timezone: "UTC" });
assert(resTomorrow.success === true && resTomorrow.isoDate === "2026-08-13", "Parse 'tomorrow'");

const resDayAfterTomorrow = parseNaturalDateTime("day after tomorrow", { referenceDate: refDate, timezone: "UTC" });
assert(resDayAfterTomorrow.success === true && resDayAfterTomorrow.isoDate === "2026-08-14", "Parse 'day after tomorrow'");

const resYesterday = parseNaturalDateTime("yesterday", { referenceDate: refDate, timezone: "UTC" });
assert(resYesterday.success === true && resYesterday.isoDate === "2026-08-11", "Parse 'yesterday'");

const resIn3Days = parseNaturalDateTime("in 3 days", { referenceDate: refDate, timezone: "UTC" });
assert(resIn3Days.success === true && resIn3Days.isoDate === "2026-08-15", "Parse 'in 3 days'");

const resIn2Weeks = parseNaturalDateTime("in 2 weeks", { referenceDate: refDate, timezone: "UTC" });
assert(resIn2Weeks.success === true && resIn2Weeks.isoDate === "2026-08-26", "Parse 'in 2 weeks'");

// -------------------------------------------------------------
// 2. Weekdays
// -------------------------------------------------------------
console.log("\n--- 2. Weekday Semantics (Ref: Wed Aug 12, 2026) ---");

// Friday of this week is Aug 14
const resThisFriday = parseNaturalDateTime("this Friday", { referenceDate: refDate, timezone: "UTC" });
assert(resThisFriday.success === true && resThisFriday.isoDate === "2026-08-14", "Parse 'this Friday' -> 2026-08-14");

// Upcoming Friday
const resFriday = parseNaturalDateTime("Friday", { referenceDate: refDate, timezone: "UTC" });
assert(resFriday.success === true && resFriday.isoDate === "2026-08-14", "Parse 'Friday' -> 2026-08-14");

// Next Monday (next week Monday: Aug 17)
const resNextMonday = parseNaturalDateTime("next Monday", { referenceDate: refDate, timezone: "UTC" });
assert(resNextMonday.success === true && resNextMonday.isoDate === "2026-08-17", "Parse 'next Monday' -> 2026-08-17");

// Last Tuesday (Aug 11)
const resLastTuesday = parseNaturalDateTime("last Tuesday", { referenceDate: refDate, timezone: "UTC" });
assert(resLastTuesday.success === true && resLastTuesday.isoDate === "2026-08-11", "Parse 'last Tuesday' -> 2026-08-11");

// -------------------------------------------------------------
// 3. Explicit Calendar Dates
// -------------------------------------------------------------
console.log("\n--- 3. Explicit Calendar Dates ---");

const resAug20 = parseNaturalDateTime("August 20, 2026", { referenceDate: refDate, timezone: "UTC" });
assert(resAug20.success === true && resAug20.isoDate === "2026-08-20", "Parse 'August 20, 2026'");

const res20thAug = parseNaturalDateTime("20th of August 2026", { referenceDate: refDate, timezone: "UTC" });
assert(res20thAug.success === true && res20thAug.isoDate === "2026-08-20", "Parse '20th of August 2026'");

const resIso = parseNaturalDateTime("2026-08-25", { referenceDate: refDate, timezone: "UTC" });
assert(resIso.success === true && resIso.isoDate === "2026-08-25", "Parse ISO '2026-08-25'");

// -------------------------------------------------------------
// 4. Date + Time & Dayparts
// -------------------------------------------------------------
console.log("\n--- 4. Date + Time and Dayparts ---");

const resTomorrowMorning = parseNaturalDateTime("tomorrow morning", { referenceDate: refDate, timezone: "UTC" });
assert(
  resTomorrowMorning.success === true &&
  resTomorrowMorning.isoDate === "2026-08-13" &&
  resTomorrowMorning.precision === "daypart" &&
  resTomorrowMorning.daypart === "morning",
  "Parse 'tomorrow morning' with daypart"
);

const resFriday330PM = parseNaturalDateTime("next Friday at 3:30 PM", { referenceDate: refDate, timezone: "UTC" });
assert(
  resFriday330PM.success === true &&
  resFriday330PM.isoDate === "2026-08-21" &&
  resFriday330PM.isoTime === "15:30" &&
  resFriday330PM.precision === "datetime",
  "Parse 'next Friday at 3:30 PM' with precise time"
);

const res4pm = parseNaturalDateTime("tomorrow at 4pm", { referenceDate: refDate, timezone: "UTC" });
assert(
  res4pm.success === true &&
  res4pm.isoTime === "16:00" &&
  res4pm.precision === "datetime",
  "Parse 'tomorrow at 4pm'"
);

// -------------------------------------------------------------
// 5. Invalid Calendar Dates (Strict Rejection)
// -------------------------------------------------------------
console.log("\n--- 5. Invalid Calendar Dates Rejection (No Silent Guessing) ---");

const resFeb30 = parseNaturalDateTime("February 30, 2026", { referenceDate: refDate });
assert(!resFeb30.success && resFeb30.code === "INVALID_DATE", "Reject 'February 30' as INVALID_DATE");

const resFeb31 = parseNaturalDateTime("February 31, 2026", { referenceDate: refDate });
assert(!resFeb31.success && resFeb31.code === "INVALID_DATE", "Reject 'February 31' as INVALID_DATE");

const resApr31 = parseNaturalDateTime("April 31, 2026", { referenceDate: refDate });
assert(!resApr31.success && resApr31.code === "INVALID_DATE", "Reject 'April 31' as INVALID_DATE");

const resJun31 = parseNaturalDateTime("June 31, 2026", { referenceDate: refDate });
assert(!resJun31.success && resJun31.code === "INVALID_DATE", "Reject 'June 31' as INVALID_DATE");

const resSep31 = parseNaturalDateTime("September 31, 2026", { referenceDate: refDate });
assert(!resSep31.success && resSep31.code === "INVALID_DATE", "Reject 'September 31' as INVALID_DATE");

const resNov31 = parseNaturalDateTime("November 31, 2026", { referenceDate: refDate });
assert(!resNov31.success && resNov31.code === "INVALID_DATE", "Reject 'November 31' as INVALID_DATE");

const resFeb29NonLeap = parseNaturalDateTime("February 29, 2025", { referenceDate: refDate });
assert(!resFeb29NonLeap.success && resFeb29NonLeap.code === "INVALID_DATE", "Reject 'February 29, 2025' (non-leap year)");

const resFeb29Leap = parseNaturalDateTime("February 29, 2028", { referenceDate: refDate });
assert(resFeb29Leap.success === true && resFeb29Leap.isoDate === "2028-02-29", "Accept 'February 29, 2028' (leap year)");

const res32Aug = parseNaturalDateTime("32 August 2026", { referenceDate: refDate });
assert(!res32Aug.success && res32Aug.code === "INVALID_DATE", "Reject '32 August 2026'");

// -------------------------------------------------------------
// 6. Invalid Time Formats
// -------------------------------------------------------------
console.log("\n--- 6. Invalid Time Rejection ---");

const res25Hour = parseNaturalDateTime("tomorrow at 25:00", { referenceDate: refDate });
assert(!res25Hour.success && res25Hour.code === "INVALID_TIME", "Reject '25:00' as INVALID_TIME");

const res75Min = parseNaturalDateTime("tomorrow at 14:75", { referenceDate: refDate });
assert(!res75Min.success && res75Min.code === "INVALID_TIME", "Reject '14:75' as INVALID_TIME");

const res13Pm = parseNaturalDateTime("tomorrow at 13:00 PM", { referenceDate: refDate });
assert(!res13Pm.success && res13Pm.code === "INVALID_TIME", "Reject '13:00 PM' as INVALID_TIME");

// -------------------------------------------------------------
// 7. Unsupported / Vague Phrases (Strict Rejection)
// -------------------------------------------------------------
console.log("\n--- 7. Unsupported / Vague Phrases Rejection ---");

const resSometime = parseNaturalDateTime("sometime next week", { referenceDate: refDate });
assert(!resSometime.success && resSometime.code === "UNSUPPORTED", "Reject 'sometime next week' as UNSUPPORTED");

const resOneOfTheseDays = parseNaturalDateTime("one of these days", { referenceDate: refDate });
assert(!resOneOfTheseDays.success && resOneOfTheseDays.code === "UNSUPPORTED", "Reject 'one of these days' as UNSUPPORTED");

const resWhenever = parseNaturalDateTime("whenever you're free", { referenceDate: refDate });
assert(!resWhenever.success && resWhenever.code === "UNSUPPORTED", "Reject 'whenever you're free' as UNSUPPORTED");

const resMaybe = parseNaturalDateTime("maybe tomorrow", { referenceDate: refDate });
assert(!resMaybe.success && resMaybe.code === "UNSUPPORTED", "Reject 'maybe tomorrow' as UNSUPPORTED");

// -------------------------------------------------------------
// 8. Numeric Date Ambiguity & Locale Handling
// -------------------------------------------------------------
console.log("\n--- 8. Numeric Date Ambiguity and Locales ---");

const resAmbiguous = parseNaturalDateTime("03/04/2026", { referenceDate: refDate });
assert(!resAmbiguous.success && resAmbiguous.code === "AMBIGUOUS", "Reject '03/04/2026' without locale as AMBIGUOUS");

const resUSLocale = parseNaturalDateTime("03/04/2026", { referenceDate: refDate, locale: "en-US" });
assert(resUSLocale.success === true && resUSLocale.isoDate === "2026-03-04", "Resolve '03/04/2026' with en-US as March 4");

const resGBLocale = parseNaturalDateTime("03/04/2026", { referenceDate: refDate, locale: "en-GB" });
assert(resGBLocale.success === true && resGBLocale.isoDate === "2026-04-03", "Resolve '03/04/2026' with en-GB as April 3");

// -------------------------------------------------------------
// 9. Timezones
// -------------------------------------------------------------
console.log("\n--- 9. Timezone Adjustments ---");

const resNY = parseNaturalDateTime("2026-08-20 at 14:00", { referenceDate: refDate, timezone: "America/New_York" });
assert(resNY.success === true && resNY.isoDate === "2026-08-20" && resNY.timezone === "America/New_York", "Timezone America/New_York");

const resIST = parseNaturalDateTime("2026-08-20 at 14:00", { referenceDate: refDate, timezone: "Asia/Kolkata" });
assert(resIST.success === true && resIST.isoDate === "2026-08-20" && resIST.timezone === "Asia/Kolkata", "Timezone Asia/Kolkata");

// Ensure difference in UTC timestamps matches the timezones (EDT UTC-4 vs IST UTC+5:30 -> 9.5h diff)
if (resNY.success && resIST.success) {
  const diffHours = (resNY.date.getTime() - resIST.date.getTime()) / (1000 * 60 * 60);
  assert(diffHours === 9.5, `Timezone offset difference is 9.5 hours (actual: ${diffHours})`);
}

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log("\n=================================================");
console.log(`RESULTS: ${passed} Passed, ${failed} Failed`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
