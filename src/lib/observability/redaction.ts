/**
 * Sensitive Data Redaction & Sanitization Engine
 * Protects customer privacy and prevents credential leakage in logs, traces, and Sentry events.
 */

// Keys whose values must be completely redacted
const SENSITIVE_KEY_PATTERNS = [
  /pass(word)?/i,
  /secret/i,
  /token/i,
  /auth(orization)?/i,
  /bearer/i,
  /cookie/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /cvv/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /ssn/i,
  /webhook[_-]?secret/i,
  /session/i,
  /salt/i,
  /hash/i,
  /signature/i,
];

// Content keys containing raw conversation or prompt content that should not be broadly dumped into telemetry
const CONTENT_KEY_PATTERNS = [
  /raw[_-]?prompt/i,
  /system[_-]?prompt/i,
  /transcript/i,
  /recording[_-]?url/i,
];

/**
 * Partially masks a phone number (e.g. "+1 (555) 123-4567" -> "+1 ***-***-4567")
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || typeof phone !== "string") return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "[REDACTED_PHONE]";
  const last4 = digits.slice(-4);
  return `***-***-${last4}`;
}

/**
 * Partially masks an email address (e.g. "john.doe@example.com" -> "j***e@example.com")
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== "string" || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `*@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Recursively redacts sensitive values from objects, arrays, and primitives.
 * Safe against circular references and deep nesting.
 */
export function redactSensitiveData<T>(
  data: T,
  maxDepth = 6,
  seen = new WeakSet<object>()
): T {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitives
  if (typeof data !== "object") {
    return data;
  }

  // Prevent recursion past maxDepth or circular references
  if (maxDepth <= 0 || seen.has(data as object)) {
    return "[MAX_DEPTH_OR_CIRCULAR]" as unknown as T;
  }

  seen.add(data as object);

  // Handle Arrays
  if (Array.isArray(data)) {
    return data.map((item) =>
      redactSensitiveData(item, maxDepth - 1, seen)
    ) as unknown as T;
  }

  // Handle Error objects specially
  if (data instanceof Error) {
    const sanitizedError: Record<string, unknown> = {
      name: data.name,
      message: sanitizeErrorMessage(data.message),
      stack: process.env.NODE_ENV !== "production" ? data.stack : undefined,
    };
    return sanitizedError as unknown as T;
  }

  // Handle plain objects
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((p) => p.test(key));
    if (isSensitiveKey) {
      result[key] = "[REDACTED]";
      continue;
    }

    const isContentKey = CONTENT_KEY_PATTERNS.some((p) => p.test(key));
    if (isContentKey) {
      result[key] = typeof value === "string" ? `[TRUNCATED_CONTENT (${value.length} chars)]` : "[REDACTED_CONTENT]";
      continue;
    }

    // Phone masking
    if (/phone/i.test(key) && typeof value === "string") {
      result[key] = maskPhoneNumber(value);
      continue;
    }

    // Email masking
    if (/email/i.test(key) && typeof value === "string") {
      result[key] = maskEmail(value);
      continue;
    }

    result[key] = redactSensitiveData(value, maxDepth - 1, seen);
  }

  return result as T;
}

/**
 * Strips out connection strings, bearer tokens, or database credentials embedded inside raw error messages.
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message || typeof message !== "string") return message;

  return message
    // Redact postgres/mysql connection URLs: postgres://user:pass@host:port/db
    .replace(/(postgres|postgresql|mysql):\/\/[^:\s]+:[^@\s]+@[^\s/]+/gi, "$1://[REDACTED_USER]:[REDACTED_PASSWORD]@[REDACTED_HOST]")
    // Redact Bearer tokens: Bearer eyJ... or Bearer xyz
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED_TOKEN]")
    // Redact Stripe secret keys: sk_live_... / sk_test_...
    .replace(/sk_(live|test)_[a-zA-Z0-9]+/g, "sk_$1_[REDACTED]")
    // Redact Razorpay key secret
    .replace(/rzp_(live|test)_[a-zA-Z0-9]+/g, "rzp_$1_[REDACTED]");
}
