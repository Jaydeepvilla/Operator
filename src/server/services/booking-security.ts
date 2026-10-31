import crypto from "crypto";
import { isDisposableEmail } from "@/lib/auth/security-checks";
import { persistentGuard } from "./security/persistent-guard";

/**
 * Appointment and Booking Security Guardrails
 * Enforces concurrency isolation, rate limiting against public spam,
 * input sanitization, scoped booking tokens, and data exposure prevention.
 */

// In-memory public booking rate limiter to prevent spam abuse
const publicBookingLimiter = new Map<string, { count: number; windowStart: number }>();
const SPAM_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PUBLIC_BOOKINGS_PER_WINDOW = 5;

// In-memory booking idempotency cache to prevent duplicate bookings on client retries
const bookingIdempotencyCache = new Map<string, { timestamp: number; appointmentId: string }>();
const IDEMPOTENCY_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * REQ 19: Prevent unauthorized public booking endpoints from being abused for spam.
 */
export function checkPublicBookingSpamLimit(identifier: string, email?: string): {
  isLimited: boolean;
  reason?: string;
} {
  const now = Date.now();
  const keys = [identifier.trim().toLowerCase()];
  if (email && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    keys.push(cleanEmail);

    if (isDisposableEmail(cleanEmail)) {
      return { isLimited: true, reason: "Disposable or temporary email addresses are not accepted for bookings." };
    }
  }

  for (const key of keys) {
    const entry = publicBookingLimiter.get(key);
    if (!entry || now - entry.windowStart > SPAM_WINDOW_MS) {
      publicBookingLimiter.set(key, { count: 1, windowStart: now });
    } else {
      if (entry.count >= MAX_PUBLIC_BOOKINGS_PER_WINDOW) {
        return { isLimited: true, reason: "Too many booking requests. Please wait before attempting another booking." };
      }
      entry.count++;
    }
  }

  return { isLimited: false };
}

/**
 * REQ 12: Prevent duplicate bookings caused by retries (Idempotency).
 */
export function checkBookingIdempotency(key: string): {
  isDuplicate: boolean;
  appointmentId?: string;
} {
  if (!key || typeof key !== "string") {
    return { isDuplicate: false };
  }

  const now = Date.now();
  const cached = bookingIdempotencyCache.get(key);

  if (cached && now - cached.timestamp < IDEMPOTENCY_TTL_MS) {
    return { isDuplicate: true, appointmentId: cached.appointmentId };
  }

  return { isDuplicate: false };
}

export function recordBookingIdempotency(key: string, appointmentId: string) {
  if (!key) return;
  bookingIdempotencyCache.set(key, { timestamp: Date.now(), appointmentId });
}

/**
 * Multi-instance serverless-safe public booking rate limiter.
 * Backed by PostgreSQL transactions and rate_limit_keys table.
 */
export async function checkPublicBookingSpamLimitAsync(identifier: string, email?: string): Promise<{
  isLimited: boolean;
  reason?: string;
}> {
  // L1 in-memory check
  const l1 = checkPublicBookingSpamLimit(identifier, email);
  if (l1.isLimited) {
    return l1;
  }

  // L2 persistent DB check
  const key = identifier.trim().toLowerCase();
  const res = await persistentGuard.checkRateLimit("booking:public_spam", key, MAX_PUBLIC_BOOKINGS_PER_WINDOW, SPAM_WINDOW_MS);
  if (res.isRateLimited) {
    return { isLimited: true, reason: "Too many booking requests. Please wait before attempting another booking." };
  }

  if (email && email.trim()) {
    const emailKey = email.trim().toLowerCase();
    const emailRes = await persistentGuard.checkRateLimit("booking:public_spam", emailKey, MAX_PUBLIC_BOOKINGS_PER_WINDOW, SPAM_WINDOW_MS);
    if (emailRes.isRateLimited) {
      return { isLimited: true, reason: "Too many booking requests for this email. Please wait before attempting another booking." };
    }
  }

  return { isLimited: false };
}

/**
 * Multi-instance serverless-safe booking idempotency check.
 * Guarantees that concurrent booking requests from duplicate client submissions reject duplicates.
 */
export async function checkBookingIdempotencyAsync(key: string): Promise<{
  isDuplicate: boolean;
  appointmentId?: string;
}> {
  if (!key || typeof key !== "string") {
    return { isDuplicate: false };
  }

  // L1 in-memory check
  const l1 = checkBookingIdempotency(key);
  if (l1.isDuplicate) {
    return l1;
  }

  // L2 persistent DB check
  const res = await persistentGuard.checkDeduplication("booking:idempotency", key, IDEMPOTENCY_TTL_MS);
  return {
    isDuplicate: res.isDuplicate,
    appointmentId: res.cachedResponse?.appointmentId,
  };
}

export async function recordBookingIdempotencyAsync(key: string, appointmentId: string): Promise<void> {
  if (!key) return;
  recordBookingIdempotency(key, appointmentId);
  await persistentGuard.recordResponse("booking:idempotency", key, { appointmentId });
}

/**
 * REQ 8: Prevent appointments with invalid service durations.
 */
export function validateServiceDuration(duration: number): {
  isValid: boolean;
  durationMinutes: number;
  error?: string;
} {
  if (typeof duration !== "number" || isNaN(duration) || duration <= 0) {
    return { isValid: false, durationMinutes: 0, error: "Service duration must be a positive number of minutes." };
  }

  // Cap between 5 minutes and 8 hours (480 minutes)
  if (duration < 5 || duration > 480) {
    return { isValid: false, durationMinutes: 0, error: "Service duration must be between 5 and 480 minutes." };
  }

  return { isValid: true, durationMinutes: Math.round(duration) };
}

/**
 * REQ 9: Prevent appointments that violate staff or resource capacity.
 */
export function verifyStaffCapacity(params: {
  maxCapacity: number;
  currentOverlappingCount: number;
}): { isAllowed: boolean; error?: string } {
  const cap = params.maxCapacity > 0 ? params.maxCapacity : 1;
  if (params.currentOverlappingCount >= cap) {
    return {
      isAllowed: false,
      error: "Staff member or resource capacity has been reached for this time slot.",
    };
  }
  return { isAllowed: true };
}

/**
 * REQ 18: Scoped cryptographic booking tokens (cancel / reschedule).
 * Prevents reuse beyond intended action or expiration.
 */
export function generateBookingToken(params: {
  appointmentId: string;
  action: "cancel" | "reschedule" | "view";
  secret: string;
  expiresInMs?: number;
}): string {
  const expiresAt = Date.now() + (params.expiresInMs || 7 * 24 * 60 * 60 * 1000); // 7 days default
  const payload = `${params.appointmentId}:${params.action}:${expiresAt}`;
  const hmac = crypto
    .createHmac("sha256", params.secret)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}:${hmac}`).toString("base64url");
}

export function verifyBookingToken(params: {
  token: string;
  expectedAppointmentId: string;
  expectedAction: "cancel" | "reschedule" | "view";
  secret: string;
}): { isValid: boolean; error?: string } {
  if (!params.token || typeof params.token !== "string") {
    return { isValid: false, error: "Missing or invalid booking token." };
  }

  try {
    const decoded = Buffer.from(params.token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 4) {
      return { isValid: false, error: "Malformed booking token format." };
    }

    const [tokenAptId, tokenAction, expiresAtStr, tokenHmac] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);

    // 1. Check expiration
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return { isValid: false, error: "Booking token has expired." };
    }

    // 2. Check appointment ID binding
    if (tokenAptId !== params.expectedAppointmentId) {
      return { isValid: false, error: "Token is not valid for this appointment." };
    }

    // 3. Check action scope binding
    if (tokenAction !== params.expectedAction) {
      return { isValid: false, error: `Token scope mismatch: expected '${params.expectedAction}', received '${tokenAction}'.` };
    }

    // 4. Constant-time HMAC check
    const expectedPayload = `${tokenAptId}:${tokenAction}:${expiresAtStr}`;
    const calculatedHmac = crypto
      .createHmac("sha256", params.secret)
      .update(expectedPayload)
      .digest("hex");

    const a = Buffer.from(calculatedHmac, "utf-8");
    const b = Buffer.from(tokenHmac, "utf-8");

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { isValid: false, error: "Invalid booking token signature." };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: "Invalid booking token decoding." };
  }
}

/**
 * REQ 17: Prevent booking IDs or confirmation links from exposing excessive customer data.
 */
export function sanitizePublicAppointmentSummary(data: {
  id: string;
  customerName: string;
  startTime: Date;
  endTime: Date;
  status: string;
  serviceName: string;
  businessName: string;
  // Intentionally omitted: notes, internalStaffNotes, phone, email, crmId, paymentTokens
}): {
  id: string;
  customerName: string;
  startTime: string;
  endTime: string;
  status: string;
  serviceName: string;
  businessName: string;
} {
  return {
    id: data.id,
    customerName: data.customerName,
    startTime: data.startTime.toISOString(),
    endTime: data.endTime.toISOString(),
    status: data.status,
    serviceName: data.serviceName,
    businessName: data.businessName,
  };
}

/**
 * REQ 20: Prevent untrusted input from injecting content into booking confirmations.
 */
export function sanitizeConfirmationContent(text: string): string {
  if (!text || typeof text !== "string") return "";

  return text
    // Neutralize HTML tags
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    // Neutralize spreadsheet formula injection
    .replace(/^[=+\-@\t\r]/, "'")
    // Bound length to prevent buffer bloating
    .slice(0, 500)
    .trim();
}

