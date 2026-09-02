/**
 * Canonical Application Error Classification & User-Facing Error Contract
 */

export const AppErrorCategory = {
  VALIDATION: "VALIDATION",
  AUTHENTICATION: "AUTHENTICATION",
  AUTHORIZATION: "AUTHORIZATION",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMIT: "RATE_LIMIT",
  NETWORK: "NETWORK",
  PROVIDER: "PROVIDER",
  CONFIGURATION: "CONFIGURATION",
  DATABASE: "DATABASE",
  TIMEOUT: "TIMEOUT",
  INTEGRATION: "INTEGRATION",
  UNKNOWN: "UNKNOWN",
} as const;

export type AppErrorCategory = (typeof AppErrorCategory)[keyof typeof AppErrorCategory];

export interface AppErrorPayload {
  code: string;
  category: AppErrorCategory;
  message: string;
  retryable: boolean;
  field?: string;
  fieldErrors?: Record<string, string>;
  actionLabel?: string;
  actionHref?: string;
  requestId?: string;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly category: AppErrorCategory;
  public readonly retryable: boolean;
  public readonly field?: string;
  public readonly fieldErrors?: Record<string, string>;
  public readonly actionLabel?: string;
  public readonly actionHref?: string;
  public readonly requestId?: string;

  constructor(payload: AppErrorPayload) {
    super(payload.message);
    this.name = "AppError";
    this.code = payload.code;
    this.category = payload.category;
    this.retryable = payload.retryable;
    this.field = payload.field;
    this.fieldErrors = payload.fieldErrors;
    this.actionLabel = payload.actionLabel;
    this.actionHref = payload.actionHref;
    this.requestId = payload.requestId;
  }

  toJSON(): AppErrorPayload {
    return {
      code: this.code,
      category: this.category,
      message: this.message,
      retryable: this.retryable,
      field: this.field,
      fieldErrors: this.fieldErrors,
      actionLabel: this.actionLabel,
      actionHref: this.actionHref,
      requestId: this.requestId,
    };
  }
}

/**
 * Helper to construct an AppError instance
 */
export function createAppError(payload: AppErrorPayload): AppError {
  return new AppError(payload);
}

/**
 * Classifies an unknown error into one of the canonical AppErrorCategory types.
 */
export function classifyErrorCategory(error: unknown): AppErrorCategory {
  if (error instanceof AppError) {
    return error.category;
  }

  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const lower = raw.toLowerCase();

  if (lower.includes("not found") || lower.includes("404") || lower.includes("does not exist") || lower.includes("cannot find")) {
    return "NOT_FOUND";
  }
  if (lower.includes("unauthorized") || lower.includes("not authenticated") || lower.includes("unauthenticated") || lower.includes("authentication required") || lower.includes("session expired") || lower.includes("401") || lower.includes("invalid token")) {
    return "AUTHENTICATION";
  }
  if (lower.includes("forbidden") || lower.includes("permission denied") || lower.includes("403") || lower.includes("insufficient role") || lower.includes("idor")) {
    return "AUTHORIZATION";
  }
  if (lower.includes("unique constraint") || lower.includes("duplicate") || lower.includes("conflict") || lower.includes("already exists") || lower.includes("409")) {
    return "CONFLICT";
  }
  if (lower.includes("rate limit") || lower.includes("429") || lower.includes("too many requests")) {
    return "RATE_LIMIT";
  }
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("504")) {
    return "TIMEOUT";
  }
  if (lower.includes("econnrefused") || lower.includes("fetch failed") || lower.includes("network") || lower.includes("failed to fetch")) {
    return "NETWORK";
  }
  if (lower.includes("stripe") || lower.includes("vapi") || lower.includes("elevenlabs") || lower.includes("deepgram") || lower.includes("twilio") || lower.includes("vonage") || lower.includes("sinch") || lower.includes("resend") || lower.includes("openai") || lower.includes("gemini")) {
    return "PROVIDER";
  }
  if (lower.includes("postgres") || lower.includes("drizzle") || lower.includes("pg_") || lower.includes("database") || lower.includes("sql") || lower.includes("violates foreign key")) {
    return "DATABASE";
  }
  if (lower.includes("config") || lower.includes("missing api key") || lower.includes("unconfigured") || lower.includes("not configured")) {
    return "CONFIGURATION";
  }
  if (lower.includes("required") || lower.includes("invalid") || lower.includes("validation") || lower.includes("must be") || lower.includes("422")) {
    return "VALIDATION";
  }

  return "UNKNOWN";
}

/**
 * Strips raw internal database errors, stack traces, and technical details,
 * mapping them into clear, safe, actionable messages for end users.
 */
export function formatUserErrorMessage(error: unknown, fallbackMessage = "Unable to complete request. Please try again."): string {
  if (!error) return fallbackMessage;

  if (error instanceof AppError) {
    return error.message;
  }

  const rawMessage = error instanceof Error ? error.message : typeof error === "string" ? error : "";

  if (!rawMessage) return fallbackMessage;

  const lower = rawMessage.toLowerCase();

  // 1. Database & SQL constraints (Security: Never leak Postgres errors or DB schemas)
  if (lower.includes("unique constraint") || lower.includes("duplicate key")) {
    if (lower.includes("email")) return "An account with this email address already exists.";
    if (lower.includes("slug") || lower.includes("handle")) return "This identifier is already in use. Please choose another.";
    if (lower.includes("domain")) return "This domain is already registered.";
    if (lower.includes("phone")) return "This phone number is already registered.";
    return "A record with these details already exists.";
  }
  if (lower.includes("foreign key") || lower.includes("violates foreign key") || lower.includes("referenced by")) {
    return "This item is linked to other active records and cannot be modified or removed.";
  }
  if (lower.includes("postgres") || lower.includes("drizzle") || lower.includes("queryfailed") || lower.includes("select ") || lower.includes("insert into") || lower.includes("update ") || lower.includes("delete from") || lower.includes("connection refused") || lower.includes("pg_") || lower.includes("relation \"") || lower.includes("syntax error at or near") || lower.includes("sqlstate")) {
    return "Our database service is temporarily unavailable. Please try again in a few moments.";
  }

  // 2. Authentication & Authorization
  if (lower.includes("unauthorized") || lower.includes("not authenticated") || lower.includes("invalid session") || lower.includes("session expired")) {
    return "Your session has expired. Please sign in again to continue.";
  }
  if (lower.includes("forbidden") || lower.includes("permission denied") || lower.includes("insufficient role") || lower.includes("access denied")) {
    return "You don't have permission to perform this action. Contact your workspace administrator.";
  }

  // 3. Not Found
  if (lower.includes("not found") || lower.includes("does not exist")) {
    if (lower.includes("user")) return "Requested user could not be found.";
    if (lower.includes("service")) return "Requested service could not be found.";
    if (lower.includes("appointment")) return "Requested appointment could not be found.";
    if (lower.includes("document")) return "Requested document could not be found.";
    return "The requested record was not found.";
  }

  // 4. Rate limiting
  if (lower.includes("rate limit") || lower.includes("too many requests") || lower.includes("429")) {
    return "Too many requests. Please wait a moment before trying again.";
  }

  // 5. Integrations & External Providers
  if (lower.includes("stripe") || lower.includes("card_declined") || lower.includes("card was declined") || lower.includes("expired_card") || lower.includes("insufficient_funds")) {
    if (lower.includes("card_declined") || lower.includes("declined")) return "Your payment card was declined. Please check your card details or try another card.";
    if (lower.includes("expired_card")) return "Your card has expired. Please use a valid card.";
    if (lower.includes("insufficient_funds")) return "Your card has insufficient funds.";
    return "Payment processing is temporarily unavailable. Please try again.";
  }
  if (lower.includes("vapi") || lower.includes("elevenlabs") || lower.includes("deepgram")) {
    return "The voice service is temporarily unavailable. Please try again shortly.";
  }
  if (lower.includes("vonage") || lower.includes("sinch") || lower.includes("twilio")) {
    return "Unable to send SMS notification. Please verify the phone number format.";
  }
  if (lower.includes("openai") || lower.includes("gemini")) {
    return "AI generation is temporarily busy. Please retry your request in a moment.";
  }

  // 6. Configuration
  if (lower.includes("not configured") || lower.includes("missing api key") || lower.includes("unconfigured")) {
    return "This integration isn't configured yet. Contact your administrator.";
  }

  // 7. Network & Timeout
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("econnrefused") || lower.includes("fetch failed") || lower.includes("failed to fetch")) {
    return "Network connection timed out. Please check your internet connection and try again.";
  }

  // 8. Validation (keep clean input validation messages)
  if (lower.includes("required") || lower.includes("invalid") || lower.includes("missing") || lower.includes("must be")) {
    // Only return if it does not contain code/file stack info
    if (!rawMessage.includes(" at ") && !rawMessage.includes(".ts:") && !rawMessage.includes(".js:") && !rawMessage.includes("SELECT ") && !rawMessage.includes("INSERT ")) {
      return rawMessage;
    }
  }

  // Return clean raw message if it's already user-friendly and not a technical leak
  if (
    rawMessage.length < 150 &&
    !rawMessage.includes(" at ") &&
    !rawMessage.includes(".ts:") &&
    !rawMessage.includes(".js:") &&
    !rawMessage.includes("SELECT ") &&
    !rawMessage.includes("INSERT ") &&
    !rawMessage.includes("UPDATE ") &&
    !rawMessage.includes("DELETE ") &&
    !rawMessage.includes("error:")
  ) {
    return rawMessage;
  }

  return fallbackMessage;
}

/**
 * Standardizes server action / API error response.
 */
export function toSafeErrorResponse(error: unknown, fallbackMessage = "Unable to complete request. Please try again.") {
  const category = classifyErrorCategory(error);
  const message = formatUserErrorMessage(error, fallbackMessage);
  const retryable = ["NETWORK", "TIMEOUT", "PROVIDER", "RATE_LIMIT"].includes(category);
  const code = error instanceof AppError ? error.code : `ERR_${category}`;

  return {
    success: false as const,
    error: message,
    code,
    category,
    retryable,
    ...(error instanceof AppError && error.requestId ? { requestId: error.requestId } : {}),
    ...(error instanceof AppError && error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
  };
}
