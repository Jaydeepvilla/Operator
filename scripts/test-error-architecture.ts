/**
 * Error Architecture Automated Verification Script
 * Validates:
 * 1. Safe mapping and classification of raw DB / Drizzle errors (no leaks)
 * 2. Provider error sanitization (Stripe, Twilio, OpenAI, Gemini)
 * 3. Auth categorization (UNAUTHENTICATED vs FORBIDDEN)
 * 4. toSafeErrorResponse output contracts
 * 5. AppError structured creation
 */

import {
  AppError,
  AppErrorCategory,
  classifyErrorCategory,
  createAppError,
  formatUserErrorMessage,
  toSafeErrorResponse,
} from "../src/lib/errors";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log("=== Testing Error Classification & Sanitization ===");

// 1. DB Unique Constraint Masking
const dbEmailUniqueError = new Error('duplicate key value violates unique constraint "users_email_unique"');
const userMsg1 = formatUserErrorMessage(dbEmailUniqueError);
assert(
  userMsg1 === "An account with this email address already exists.",
  `DB email unique constraint properly mapped to human-friendly message (Got: "${userMsg1}")`
);
assert(!userMsg1.includes("users_email_unique"), "No table or constraint name leaked in unique error");

const dbSlugUniqueError = new Error('duplicate key value violates unique constraint "slug_unique"');
const userMsg1b = formatUserErrorMessage(dbSlugUniqueError);
assert(
  userMsg1b === "This identifier is already in use. Please choose another.",
  `DB slug unique constraint properly mapped (Got: "${userMsg1b}")`
);
assert(!userMsg1b.includes("slug_unique"), "No table or constraint name leaked in slug unique error");

const dbGenericUniqueError = new Error('duplicate key value violates unique constraint "items_idx_unique"');
const userMsg1c = formatUserErrorMessage(dbGenericUniqueError);
assert(
  userMsg1c === "A record with these details already exists.",
  `DB generic unique constraint properly mapped (Got: "${userMsg1c}")`
);
assert(!userMsg1c.includes("items_idx_unique"), "No table or constraint name leaked in generic unique error");

// 2. DB Foreign Key Masking
const dbFkError = new Error('insert or update on table "orders" violates foreign key constraint "fk_customer"');
const userMsg2 = formatUserErrorMessage(dbFkError);
assert(
  userMsg2 === "This item is linked to other active records and cannot be modified or removed.",
  `DB FK constraint properly mapped (Got: "${userMsg2}")`
);
assert(!userMsg2.includes("fk_customer"), "No FK constraint leaked");

// 3. DB Connection Error Masking
const dbConnError = new Error('connect ECONNREFUSED 127.0.0.1:5432 at postgres.js:142');
const userMsg3 = formatUserErrorMessage(dbConnError);
assert(
  userMsg3 === "Our database service is temporarily unavailable. Please try again in a few moments.",
  `DB connection error masked (Got: "${userMsg3}")`
);
assert(!userMsg3.includes("5432") && !userMsg3.includes("127.0.0.1"), "No connection details or IP addresses leaked");

// 4. Stripe Error Mapping
const stripeError = new Error("Your card was declined. code: card_declined");
const userMsg4 = formatUserErrorMessage(stripeError);
assert(
  userMsg4 === "Your payment card was declined. Please check your card details or try another card.",
  `Stripe declined message mapped correctly (Got: "${userMsg4}")`
);

// 5. Rate Limit Mapping
const rateLimitError = new Error("429 Too Many Requests: Rate limit exceeded");
const userMsg5 = formatUserErrorMessage(rateLimitError);
assert(
  userMsg5 === "Too many requests. Please wait a moment before trying again.",
  `Rate limit error mapped correctly (Got: "${userMsg5}")`
);
assert(classifyErrorCategory(rateLimitError) === AppErrorCategory.RATE_LIMIT, "Category is RATE_LIMIT");

// 6. Auth Errors (Session Expired vs Forbidden)
const unauthError = new Error("Authentication required to access this resource");
assert(
  classifyErrorCategory(unauthError) === AppErrorCategory.AUTHENTICATION,
  "Authentication classified correctly"
);
const forbiddenError = new Error("Forbidden: You do not have permission to perform this action");
assert(
  classifyErrorCategory(forbiddenError) === AppErrorCategory.AUTHORIZATION,
  "Authorization (forbidden) classified correctly"
);

// 7. toSafeErrorResponse Helper
const safeResponse = toSafeErrorResponse(
  new Error("QueryFailedError: select * from secret_keys where org_id = 99"),
  "Operation failed"
);
assert(safeResponse.success === false, "safeResponse returns success: false");
assert(typeof safeResponse.error === "string", "safeResponse returns error string");
assert(!safeResponse.error.includes("secret_keys"), "Safe response does not leak internal SQL");

// 8. Custom AppError Class
const customErr = createAppError({
  code: "ERR_VALIDATION_PHONE",
  message: "Please provide a valid E.164 formatted phone number.",
  category: AppErrorCategory.VALIDATION,
  retryable: false,
  field: "phoneNumber",
  actionLabel: "Fix Phone Number",
});
assert(customErr instanceof AppError, "customErr is instance of AppError");
assert(customErr.category === AppErrorCategory.VALIDATION, "customErr has category VALIDATION");
assert(customErr.code === "ERR_VALIDATION_PHONE", "customErr has code ERR_VALIDATION_PHONE");
assert(customErr.message === "Please provide a valid E.164 formatted phone number.", "customErr has clean message");
assert(customErr.field === "phoneNumber", "customErr tracks field correctly");

console.log("\n🎉 ALL ERROR ARCHITECTURE TESTS PASSED SUCCESSFULLY!");
