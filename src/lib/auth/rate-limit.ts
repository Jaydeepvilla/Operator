import { db } from "@/server/db";
import { loginAttempts } from "@/server/db/schema";
import { eq, and, gte, desc, count } from "drizzle-orm";

// In-memory sliding window rate-limiter caches to provide ultra-fast edge defense
// against credential stuffing, brute-forcing, and distributed attacks.
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const memoryRateLimitStore = new Map<string, RateLimitBucket>();

function checkMemoryRateLimit(
  key: string,
  maxAllowed: number,
  windowMs: number
): { isLocked: boolean; remainingTime?: number } {
  const now = Date.now();
  const entry = memoryRateLimitStore.get(key);

  // Periodic cleanup if store grows large
  if (memoryRateLimitStore.size > 10000) {
    for (const [k, v] of memoryRateLimitStore.entries()) {
      if (v.resetAt <= now) {
        memoryRateLimitStore.delete(k);
      }
    }
  }

  if (!entry || entry.resetAt <= now) {
    memoryRateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { isLocked: false };
  }

  if (entry.count >= maxAllowed) {
    const remainingTime = Math.ceil((entry.resetAt - now) / 1000);
    return { isLocked: true, remainingTime };
  }

  entry.count += 1;
  return { isLocked: false };
}

/**
 * Checks if a login attempt for a given email or IP is currently locked out.
 * 
 * DEFENSE-IN-DEPTH:
 * 1. Per-Account Limit: Max 5 failed attempts in 15 minutes = 15 minutes lockout for that account.
 *    Stops targeted brute-force attacks.
 * 2. Per-IP Limit: Max 20 failed attempts in 15 minutes across accounts = 15 minutes lockout for that IP.
 *    Stops credential stuffing and password spraying attacks without locking out shared office IPs.
 */
export async function checkLoginRateLimit(
  email: string,
  ipAddress?: string
): Promise<{ isLocked: boolean; remainingTime?: number }> {
  const lockoutDurationMinutes = 15;
  const windowStart = new Date(Date.now() - lockoutDurationMinutes * 60 * 1000);
  const emailClean = email.toLowerCase().trim();

  // Fast-path memory shield check (catches rapid bursts)
  const memIpKey = ipAddress ? `login_ip_${ipAddress}` : null;
  if (memIpKey) {
    const ipShield = checkMemoryRateLimit(memIpKey, 30, lockoutDurationMinutes * 60 * 1000);
    if (ipShield.isLocked) {
      return ipShield;
    }
  }

  // 1. Check account-specific failed attempts (brute-force defense)
  const [accountFailures] = await db
    .select({ value: count(loginAttempts.id) })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, emailClean),
        eq(loginAttempts.success, false),
        gte(loginAttempts.attemptedAt, windowStart)
      )
    );

  const totalAccountFailures = accountFailures?.value || 0;
  if (totalAccountFailures >= 5) {
    const [latest] = await db
      .select({ attemptedAt: loginAttempts.attemptedAt })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.email, emailClean),
          eq(loginAttempts.success, false),
          gte(loginAttempts.attemptedAt, windowStart)
        )
      )
      .orderBy(desc(loginAttempts.attemptedAt))
      .limit(1);

    if (latest) {
      const expiresAt = latest.attemptedAt.getTime() + lockoutDurationMinutes * 60 * 1000;
      const remainingTime = Math.ceil((expiresAt - Date.now()) / 1000);
      if (remainingTime > 0) {
        return { isLocked: true, remainingTime };
      }
    }
  }

  // 2. Check IP-specific failed attempts (credential stuffing defense)
  if (ipAddress) {
    const [ipFailures] = await db
      .select({ value: count(loginAttempts.id) })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.ipAddress, ipAddress),
          eq(loginAttempts.success, false),
          gte(loginAttempts.attemptedAt, windowStart)
        )
      );

    const totalIpFailures = ipFailures?.value || 0;
    if (totalIpFailures >= 20) {
      const [latest] = await db
        .select({ attemptedAt: loginAttempts.attemptedAt })
        .from(loginAttempts)
        .where(
          and(
            eq(loginAttempts.ipAddress, ipAddress),
            eq(loginAttempts.success, false),
            gte(loginAttempts.attemptedAt, windowStart)
          )
        )
        .orderBy(desc(loginAttempts.attemptedAt))
        .limit(1);

      if (latest) {
        const expiresAt = latest.attemptedAt.getTime() + lockoutDurationMinutes * 60 * 1000;
        const remainingTime = Math.ceil((expiresAt - Date.now()) / 1000);
        if (remainingTime > 0) {
          return { isLocked: true, remainingTime };
        }
      }
    }
  }

  return { isLocked: false };
}

/**
 * Rate limit for password reset and email verification requests.
 * Limits email requests to max 3 per 15 minutes per email, and max 15 per IP.
 */
export async function checkPasswordResetRateLimit(
  email: string,
  ipAddress?: string
): Promise<{ isLocked: boolean; remainingTime?: number }> {
  const windowMs = 15 * 60 * 1000;
  const emailClean = email.toLowerCase().trim();

  const emailResult = checkMemoryRateLimit(`pwd_reset_email_${emailClean}`, 3, windowMs);
  if (emailResult.isLocked) {
    return emailResult;
  }

  if (ipAddress) {
    const ipResult = checkMemoryRateLimit(`pwd_reset_ip_${ipAddress}`, 15, windowMs);
    if (ipResult.isLocked) {
      return ipResult;
    }
  }

  return { isLocked: false };
}

/**
 * Rate limit for token verification/reset submissions (prevent brute-forcing tokens).
 * Limits to 10 attempts per 15 minutes per IP.
 */
export async function checkTokenAttemptRateLimit(
  ipAddress: string | undefined,
  action: "reset_password" | "verify_email"
): Promise<{ isLocked: boolean; remainingTime?: number }> {
  if (!ipAddress) return { isLocked: false };
  const windowMs = 15 * 60 * 1000;
  return checkMemoryRateLimit(`token_attempt_${action}_${ipAddress}`, 10, windowMs);
}

/**
 * Rate limit for password changes by authenticated users (prevent brute-forcing current password).
 * Max 5 attempts per 15 minutes per user.
 */
export async function checkPasswordChangeRateLimit(
  userId: string,
  ipAddress?: string
): Promise<{ isLocked: boolean; remainingTime?: number }> {
  const windowMs = 15 * 60 * 1000;
  const userResult = checkMemoryRateLimit(`pwd_change_user_${userId}`, 5, windowMs);
  if (userResult.isLocked) return userResult;

  if (ipAddress) {
    const ipResult = checkMemoryRateLimit(`pwd_change_ip_${ipAddress}`, 15, windowMs);
    if (ipResult.isLocked) return ipResult;
  }

  return { isLocked: false };
}

/**
 * Rate limit for check-email endpoint to prevent automated enumeration scraping.
 * Max 20 requests per minute per IP.
 */
export async function checkEmailCheckRateLimit(
  ipAddress?: string
): Promise<{ isLocked: boolean; remainingTime?: number }> {
  if (!ipAddress) return { isLocked: false };
  const windowMs = 60 * 1000;
  return checkMemoryRateLimit(`check_email_${ipAddress}`, 20, windowMs);
}

/**
 * Logs a login attempt to database for rate limiting analysis.
 */
export async function recordLoginAttempt(
  email: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    await db.insert(loginAttempts).values({
      email: email.toLowerCase().trim(),
      success,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });
  } catch (error) {
    console.error("Failed to record login attempt:", error);
  }
}

/**
 * Generic sliding window rate limiter for public and sensitive API endpoints.
 */
export function checkGenericRateLimit(
  key: string,
  maxAllowed: number,
  windowMs: number
): { isLocked: boolean; remainingTime?: number } {
  return checkMemoryRateLimit(key, maxAllowed, windowMs);
}
