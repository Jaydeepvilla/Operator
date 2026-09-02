import { db } from "../../db";
import { businessPaymentSettings, organizations } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export type PaymentConfigState =
  | "CONFIGURED"
  | "PARTIALLY_CONFIGURED"
  | "NOT_CONFIGURED"
  | "INVALID_CONFIGURATION"
  | "DISABLED";

export interface PaymentProviderConfig {
  providerId: string;
  state: PaymentConfigState;
  isAvailable: boolean;
  isSandbox: boolean;
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
  missingFields: string[];
  environment: "production" | "sandbox" | "test";
  currency: string;
}

export interface PublicPaymentProviderStatus {
  providerId: string;
  state: PaymentConfigState;
  isAvailable: boolean;
  isSandbox: boolean;
  publishableKey?: string;
  missingFields: string[];
  environment: "production" | "sandbox" | "test";
  currency: string;
}

export interface ControlledBillingError {
  success: false;
  code:
    | "PAYMENT_CONFIGURATION_UNAVAILABLE"
    | "PAYMENT_CONFIG_PARTIAL"
    | "PAYMENT_CONFIG_INVALID"
    | "PAYMENT_PROVIDER_DISABLED"
    | "INVALID_CHECKOUT_REQUEST"
    | "PLAN_NOT_FOUND"
    | "UNAUTHORIZED"
    | "PAYMENT_PROVIDER_FAILURE";
  message: string;
  retryable: boolean;
  correlationId: string;
  missingRequirements?: string[];
}

export class PaymentConfigurationError extends Error {
  readonly code: string;
  readonly missingFields: string[];
  readonly retryable: boolean;
  readonly correlationId: string;

  constructor(
    message: string,
    options: {
      code?: string;
      missingFields?: string[];
      retryable?: boolean;
      correlationId?: string;
    } = {}
  ) {
    super(message);
    this.name = "PaymentConfigurationError";
    this.code = options.code || "PAYMENT_CONFIGURATION_UNAVAILABLE";
    this.missingFields = options.missingFields || [];
    this.retryable = options.retryable ?? false;
    this.correlationId = options.correlationId || generateCorrelationId();
  }
}

export class PaymentProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly correlationId: string;

  constructor(
    message: string,
    options: {
      code?: string;
      retryable?: boolean;
      correlationId?: string;
    } = {}
  ) {
    super(message);
    this.name = "PaymentProviderError";
    this.code = options.code || "PAYMENT_PROVIDER_FAILURE";
    this.retryable = options.retryable ?? true;
    this.correlationId = options.correlationId || generateCorrelationId();
  }
}

export class CheckoutValidationError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly correlationId: string;

  constructor(
    message: string,
    options: {
      code?: string;
      retryable?: boolean;
      correlationId?: string;
    } = {}
  ) {
    super(message);
    this.name = "CheckoutValidationError";
    this.code = options.code || "INVALID_CHECKOUT_REQUEST";
    this.retryable = options.retryable ?? false;
    this.correlationId = options.correlationId || generateCorrelationId();
  }
}

export class PaymentUnavailableError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly correlationId: string;

  constructor(
    message: string,
    options: {
      code?: string;
      retryable?: boolean;
      correlationId?: string;
    } = {}
  ) {
    super(message);
    this.name = "PaymentUnavailableError";
    this.code = options.code || "PAYMENT_CONFIGURATION_UNAVAILABLE";
    this.retryable = options.retryable ?? false;
    this.correlationId = options.correlationId || generateCorrelationId();
  }
}

/**
 * Generates an opaque, user-safe correlation ID for tracking billing requests.
 */
export function generateCorrelationId(prefix = "CHK"): string {
  const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${randomHex}`;
}

/**
 * Sanitizes and inspects a candidate API key for common invalid patterns.
 */
function isValidSecretKey(key?: string | null): boolean {
  if (!key || typeof key !== "string") return false;
  const trimmed = key.trim();
  if (trimmed.length < 16) return false;
  // Check for common placeholders
  if (
    trimmed.includes("your_") ||
    trimmed.includes("placeholder") ||
    trimmed.includes("sk_test_xxx") ||
    trimmed.includes("sk_live_xxx") ||
    trimmed === "sk_test_..."
  ) {
    return false;
  }
  return true;
}

/**
 * Retrieves the unified payment provider configuration for the server and/or organization.
 */
export async function getPaymentProviderConfig(
  providerId = "stripe",
  organizationId?: string
): Promise<PaymentProviderConfig> {
  const pid = providerId.toLowerCase();
  const missingFields: string[] = [];

  // 1. Check if disabled explicitly in environment
  if (process.env.PAYMENT_ENABLED === "false" || process.env.BILLING_ENABLED === "false") {
    return {
      providerId: pid,
      state: "DISABLED",
      isAvailable: false,
      isSandbox: true,
      missingFields: ["PAYMENT_ENABLED is set to false"],
      environment: "test",
      currency: "USD",
    };
  }

  // 2. Check tenant-specific database settings if organizationId is provided
  if (organizationId) {
    try {
      const [settings] = await db
        .select()
        .from(businessPaymentSettings)
        .where(
          and(
            eq(businessPaymentSettings.organizationId, organizationId),
            eq(businessPaymentSettings.providerId, pid)
          )
        )
        .limit(1);

      if (settings) {
        if (settings.connectionStatus === "disconnected") {
          return {
            providerId: pid,
            state: "DISABLED",
            isAvailable: false,
            isSandbox: settings.isSandbox,
            missingFields: ["Provider disconnected in tenant settings"],
            environment: settings.isSandbox ? "sandbox" : "production",
            currency: "USD",
          };
        }

        const creds = (settings.credentials as Record<string, string>) || {};
        const tenantSecret = creds.secretKey || creds.apiKey;
        const tenantPublishable = creds.publishableKey || creds.publicKey;
        const tenantWebhook = creds.webhookSecret;

        if (tenantSecret) {
          if (!isValidSecretKey(tenantSecret)) {
            return {
              providerId: pid,
              state: "INVALID_CONFIGURATION",
              isAvailable: false,
              isSandbox: settings.isSandbox,
              missingFields: ["secretKey (invalid format)"],
              environment: settings.isSandbox ? "sandbox" : "production",
              currency: "USD",
            };
          }

          if (!tenantWebhook) {
            missingFields.push("webhookSecret");
          }

          const state: PaymentConfigState = missingFields.length > 0 ? "PARTIALLY_CONFIGURED" : "CONFIGURED";
          return {
            providerId: pid,
            state,
            isAvailable: state === "CONFIGURED",
            isSandbox: settings.isSandbox,
            secretKey: tenantSecret,
            publishableKey: tenantPublishable,
            webhookSecret: tenantWebhook,
            missingFields,
            environment: settings.isSandbox ? "sandbox" : "production",
            currency: "USD",
          };
        }
      }
    } catch (dbErr) {
      console.warn("[PaymentConfig] Could not load tenant settings, falling back to server environment:", dbErr);
    }
  }

  // 3. Environment Variable Fallback (Platform Master Configuration)
  if (pid === "stripe") {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const isSandbox = secretKey?.startsWith("sk_test_") ?? true;
    const environment = isSandbox ? "sandbox" : "production";

    if (!secretKey) {
      missingFields.push("STRIPE_SECRET_KEY");
      if (!webhookSecret) missingFields.push("STRIPE_WEBHOOK_SECRET");
      return {
        providerId: pid,
        state: "NOT_CONFIGURED",
        isAvailable: false,
        isSandbox,
        missingFields,
        environment,
        currency: "USD",
      };
    }

    if (!isValidSecretKey(secretKey)) {
      return {
        providerId: pid,
        state: "INVALID_CONFIGURATION",
        isAvailable: false,
        isSandbox,
        missingFields: ["STRIPE_SECRET_KEY (invalid or placeholder format)"],
        environment,
        currency: "USD",
      };
    }

    if (!webhookSecret) {
      missingFields.push("STRIPE_WEBHOOK_SECRET");
    }

    const state: PaymentConfigState = missingFields.length > 0 ? "PARTIALLY_CONFIGURED" : "CONFIGURED";

    return {
      providerId: pid,
      state,
      isAvailable: state === "CONFIGURED",
      isSandbox,
      secretKey,
      publishableKey,
      webhookSecret,
      missingFields,
      environment,
      currency: "USD",
    };
  }

  // Unsupported or unconfigured provider
  return {
    providerId: pid,
    state: "NOT_CONFIGURED",
    isAvailable: false,
    isSandbox: true,
    missingFields: [`Unsupported provider: ${pid}`],
    environment: "test",
    currency: "USD",
  };
}

/**
 * Returns public-safe payment provider status (no secret keys or tokens).
 */
export async function getPaymentProviderStatus(
  providerId = "stripe",
  organizationId?: string
): Promise<PublicPaymentProviderStatus> {
  const config = await getPaymentProviderConfig(providerId, organizationId);
  return {
    providerId: config.providerId,
    state: config.state,
    isAvailable: config.isAvailable,
    isSandbox: config.isSandbox,
    publishableKey: config.publishableKey,
    missingFields: config.missingFields,
    environment: config.environment,
    currency: config.currency,
  };
}

/**
 * Asserts that the payment provider is fully configured and ready for live checkout.
 * Throws a typed PaymentConfigurationError if missing or invalid.
 */
export async function requirePaymentProviderConfiguration(
  providerId = "stripe",
  organizationId?: string
): Promise<PaymentProviderConfig> {
  const config = await getPaymentProviderConfig(providerId, organizationId);

  if (!config.isAvailable || config.state !== "CONFIGURED" || !config.secretKey) {
    const correlationId = generateCorrelationId();
    console.warn(`[Billing Security Audit] Payment configuration unavailable (${config.state}) for provider ${providerId}. Missing: ${config.missingFields.join(", ")}. Correlation: ${correlationId}`);

    let userMessage = "Online checkout is temporarily unavailable. Please try again later.";
    let code: ControlledBillingError["code"] = "PAYMENT_CONFIGURATION_UNAVAILABLE";

    if (config.state === "DISABLED") {
      userMessage = "Online payments are currently disabled for this organization. Please contact support.";
      code = "PAYMENT_PROVIDER_DISABLED";
    } else if (config.state === "PARTIALLY_CONFIGURED") {
      code = "PAYMENT_CONFIG_PARTIAL";
    } else if (config.state === "INVALID_CONFIGURATION") {
      code = "PAYMENT_CONFIG_INVALID";
    }

    throw new PaymentConfigurationError(userMessage, {
      code,
      missingFields: config.missingFields,
      retryable: false,
      correlationId,
    });
  }

  return config;
}

/**
 * Transforms any caught error into a safe, controlled billing response.
 * Never leaks stack traces, secrets, or raw internal errors.
 */
export function formatControlledBillingError(
  err: unknown,
  fallbackCorrelationId?: string
): ControlledBillingError {
  const correlationId =
    (err as any)?.correlationId || fallbackCorrelationId || generateCorrelationId();

  if (err instanceof PaymentConfigurationError) {
    return {
      success: false,
      code: (err.code as any) || "PAYMENT_CONFIGURATION_UNAVAILABLE",
      message: err.message || "Online checkout is temporarily unavailable. Please try again later.",
      retryable: err.retryable,
      correlationId: err.correlationId,
      missingRequirements: err.missingFields,
    };
  }

  if (err instanceof CheckoutValidationError) {
    return {
      success: false,
      code: "INVALID_CHECKOUT_REQUEST",
      message: err.message || "Invalid checkout parameters. Please check your selection and try again.",
      retryable: false,
      correlationId: err.correlationId,
    };
  }

  if (err instanceof PaymentUnavailableError) {
    return {
      success: false,
      code: "PAYMENT_CONFIGURATION_UNAVAILABLE",
      message: err.message || "Online checkout is temporarily unavailable. Please try again later.",
      retryable: err.retryable,
      correlationId: err.correlationId,
    };
  }

  if (err instanceof PaymentProviderError) {
    return {
      success: false,
      code: "PAYMENT_PROVIDER_FAILURE",
      message: "Unable to connect to the payment processor. Please try again in a few moments.",
      retryable: true,
      correlationId: err.correlationId,
    };
  }

  // Safe fallback for unhandled / unknown exceptions
  console.error(`[Billing Security Exception] [${correlationId}]:`, err);

  return {
    success: false,
    code: "PAYMENT_CONFIGURATION_UNAVAILABLE",
    message: "Online checkout is temporarily unavailable. Please try again later.",
    retryable: false,
    correlationId,
  };
}
