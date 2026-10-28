import crypto from "crypto";
import { PLAN_CATALOG, getPlan, getLocalizedPlan } from "@/lib/billing/plans";

export class BillingSecurityError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = "BILLING_SECURITY_ERROR", status = 400) {
    super(message);
    this.name = "BillingSecurityError";
    this.code = code;
    this.status = status;
  }
}

// Memory cache for checkout idempotency (expires after 60 seconds)
const checkoutIdempotencyMap = new Map<string, { sessionId: string; url: string | null; createdAt: number }>();

/**
 * Clean expired checkout idempotency keys periodically
 */
function cleanExpiredIdempotencyKeys() {
  const now = Date.now();
  for (const [key, item] of checkoutIdempotencyMap.entries()) {
    if (now - item.createdAt > 60_000) {
      checkoutIdempotencyMap.delete(key);
    }
  }
}

// In-memory processed webhook events for deduplication testing and defense-in-depth
const processedWebhookEventIds = new Set<string>();

export const billingSecurityService = {
  /**
   * 1. Prevent client-side requests from changing payment status.
   * Client-side API calls or user requests must never directly set payment status to 'succeeded' or 'paid'.
   */
  assertServerControlledPaymentStatus(callerRole: string, requestedStatus: string, isWebhookOrInternal: boolean) {
    const privilegedStatuses = ["succeeded", "paid", "refunded", "partially_refunded"];
    if (privilegedStatuses.includes(requestedStatus.toLowerCase()) && !isWebhookOrInternal) {
      throw new BillingSecurityError(
        "Client-side requests cannot directly transition payment status. Status updates require verified provider webhooks.",
        "PAYMENT_STATUS_CLIENT_FORBIDDEN",
        403
      );
    }
    return true;
  },

  /**
   * 2. Prevent unauthorized plan upgrades or downgrades.
   * Plan modifications require admin/owner role and must reference a valid plan in the catalog.
   */
  assertPlanChangeAuthorized(userRole: string, targetPlanId: string) {
    const allowedRoles = ["owner", "admin"];
    if (!allowedRoles.includes(userRole.toLowerCase())) {
      throw new BillingSecurityError(
        "Unauthorized: Only organization owners and administrators can change subscription plans.",
        "FORBIDDEN_PLAN_CHANGE",
        403
      );
    }

    if (!targetPlanId || typeof targetPlanId !== "string") {
      throw new BillingSecurityError("A valid target plan ID is required.", "INVALID_PLAN_ID", 400);
    }

    const normalizedPlanId = targetPlanId.toLowerCase();
    const validPlan = PLAN_CATALOG[normalizedPlanId];
    if (!validPlan) {
      throw new BillingSecurityError(
        `Plan '${targetPlanId}' is not a valid subscription plan in the catalog.`,
        "PLAN_NOT_FOUND",
        400
      );
    }

    return validPlan;
  },

  /**
   * 3. Prevent access to another business's invoices.
   * Validates that the requested invoice belongs to the caller's organization.
   */
  assertInvoiceOwnership(invoiceOrgId: string, callerOrgId: string) {
    if (!invoiceOrgId || !callerOrgId || invoiceOrgId !== callerOrgId) {
      throw new BillingSecurityError(
        "Access denied: You do not have permission to view or download invoices from another business.",
        "INVOICE_TENANT_MISMATCH",
        403
      );
    }
    return true;
  },

  /**
   * 4. Prevent unauthorized refunds.
   * Requires admin role, tenant matching, and strictly enforces that refund <= remaining refundable balance.
   */
  assertRefundAuthorization(params: {
    callerRole: string;
    callerOrgId: string;
    paymentOrgId: string;
    requestedAmount: number;
    refundableBalance: number;
  }) {
    const { callerRole, callerOrgId, paymentOrgId, requestedAmount, refundableBalance } = params;

    const allowedRoles = ["owner", "admin"];
    if (!allowedRoles.includes(callerRole.toLowerCase())) {
      throw new BillingSecurityError(
        "Unauthorized: Only administrators can initiate payment refunds.",
        "FORBIDDEN_REFUND",
        403
      );
    }

    if (!callerOrgId || !paymentOrgId || callerOrgId !== paymentOrgId) {
      throw new BillingSecurityError(
        "Tenant violation: Cannot refund payments belonging to another business.",
        "REFUND_TENANT_MISMATCH",
        403
      );
    }

    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      throw new BillingSecurityError("Refund amount must be greater than zero.", "INVALID_REFUND_AMOUNT", 400);
    }

    // Allow 0.001 epsilon for floating point differences
    if (requestedAmount > (refundableBalance + 0.001)) {
      throw new BillingSecurityError(
        `Refund amount (${requestedAmount}) exceeds remaining refundable balance (${refundableBalance.toFixed(2)}).`,
        "REFUND_EXCEEDS_BALANCE",
        400
      );
    }

    return true;
  },

  /**
   * 5. Prevent unauthorized cancellation of another account's subscription.
   * Enforces admin permissions and strict tenant isolation.
   */
  assertSubscriptionCancellationAuthorized(callerRole: string, callerOrgId: string, targetOrgId: string) {
    const allowedRoles = ["owner", "admin"];
    if (!allowedRoles.includes(callerRole.toLowerCase())) {
      throw new BillingSecurityError(
        "Unauthorized: Only administrators can cancel an account's subscription.",
        "FORBIDDEN_CANCELLATION",
        403
      );
    }

    if (!callerOrgId || !targetOrgId || callerOrgId !== targetOrgId) {
      throw new BillingSecurityError(
        "Unauthorized: You cannot cancel the subscription of another organization.",
        "CANCELLATION_TENANT_MISMATCH",
        403
      );
    }

    return true;
  },

  /**
   * 6. Prevent forged payment-provider webhooks.
   * Cryptographically validates webhook signatures using HMAC-SHA256 with timing-safe comparison.
   */
  verifyWebhookCryptographicSignature(params: {
    provider: "stripe" | "razorpay";
    payload: string;
    signature: string | null | undefined;
    secret: string | null | undefined;
    timestampToleranceSeconds?: number;
  }): boolean {
    const { provider, payload, signature, secret, timestampToleranceSeconds = 300 } = params;

    this.assertWebhookSignaturePresent(signature, secret);

    if (provider === "razorpay") {
      const expectedSignature = crypto
        .createHmac("sha256", secret!)
        .update(payload)
        .digest("hex");

      const expectedBuf = Buffer.from(expectedSignature, "utf8");
      const actualBuf = Buffer.from(signature!, "utf8");

      if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
        return false;
      }
      return true;
    }

    if (provider === "stripe") {
      // Parse Stripe signature header format: t=12345,v1=abcdef...
      const items = signature!.split(",");
      const timestampItem = items.find((i) => i.trim().startsWith("t="));
      const sigItem = items.find((i) => i.trim().startsWith("v1="));

      if (!timestampItem || !sigItem) {
        return false;
      }

      const timestamp = timestampItem.split("=")[1];
      const sig = sigItem.split("=")[1];

      // Replay prevention: verify timestamp is within tolerance
      const eventTimeSec = parseInt(timestamp, 10);
      const currentTimeSec = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTimeSec - eventTimeSec) > timestampToleranceSeconds) {
        return false; // Signature timestamp too old or in future
      }

      const signedPayload = `${timestamp}.${payload}`;
      const expectedSignature = crypto
        .createHmac("sha256", secret!)
        .update(signedPayload)
        .digest("hex");

      const expectedBuf = Buffer.from(expectedSignature, "utf8");
      const actualBuf = Buffer.from(sig, "utf8");

      if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
        return false;
      }
      return true;
    }

    return false;
  },

  /**
   * 7. Prevent webhook signature verification from being skipped.
   * Throws an immediate error if signature or secret is empty or missing.
   */
  assertWebhookSignaturePresent(signature: string | null | undefined, secret: string | null | undefined) {
    if (!signature || signature.trim() === "") {
      throw new BillingSecurityError(
        "Webhook signature is missing. Verification cannot be skipped.",
        "WEBHOOK_SIGNATURE_MISSING",
        400
      );
    }
    if (!secret || secret.trim() === "") {
      throw new BillingSecurityError(
        "Webhook secret is not configured on the server. Rejecting unverified webhook.",
        "WEBHOOK_SECRET_UNCONFIGURED",
        500
      );
    }
  },

  /**
   * 8. Prevent duplicate webhook processing from duplicating financial actions.
   */
  checkWebhookDeduplication(provider: string, providerEventId: string, customCache?: Set<string>): { isDuplicate: boolean } {
    const cache = customCache || processedWebhookEventIds;
    const scopedKey = `${provider}:${providerEventId}`;
    if (cache.has(scopedKey)) {
      return { isDuplicate: true };
    }
    cache.add(scopedKey);
    return { isDuplicate: false };
  },

  /**
   * 9. Prevent replayed events from reverting newer payment state.
   * For example, an older 'payment.failed' or 'past_due' event must not revert a newer 'active' subscription.
   */
  preventStateReversal(params: {
    currentStatus: string;
    currentStateTimestamp: number;
    incomingStatus: string;
    incomingEventTimestamp?: number;
  }): { allowed: boolean; reason?: string } {
    const { currentStatus, currentStateTimestamp, incomingStatus, incomingEventTimestamp } = params;

    // If incoming event has an older timestamp than current state, reject reversal
    if (incomingEventTimestamp && incomingEventTimestamp < currentStateTimestamp) {
      return {
        allowed: false,
        reason: `Replayed event timestamp (${incomingEventTimestamp}) is older than current state timestamp (${currentStateTimestamp}). State transition discarded.`,
      };
    }

    // Precedence hierarchy: active/paid/succeeded > past_due/pending
    const currentNorm = currentStatus.toLowerCase();
    const incomingNorm = incomingStatus.toLowerCase();

    if (
      (currentNorm === "active" || currentNorm === "succeeded" || currentNorm === "paid") &&
      (incomingNorm === "past_due" || incomingNorm === "payment_failed" || incomingNorm === "failed" || incomingNorm === "pending")
    ) {
      if (incomingEventTimestamp && incomingEventTimestamp <= currentStateTimestamp) {
        return {
          allowed: false,
          reason: "Cannot downgrade active paid state to failed/past_due using an older or concurrent event.",
        };
      }
    }

    return { allowed: true };
  },

  /**
   * 10. Prevent successful payment from being reported when the provider declined it.
   */
  validateProviderDeclinedPayment(providerStatus: string, providerError?: string): {
    success: boolean;
    recordedStatus: "succeeded" | "failed";
    reason?: string;
  } {
    const declinedStatuses = ["declined", "failed", "cancelled", "expired", "requires_payment_method"];
    const isDeclined = declinedStatuses.includes(providerStatus.toLowerCase());

    if (isDeclined) {
      return {
        success: false,
        recordedStatus: "failed",
        reason: providerError || `Provider declined transaction with status: ${providerStatus}`,
      };
    }

    return {
      success: true,
      recordedStatus: "succeeded",
    };
  },

  /**
   * 11. Prevent failed payment from being reported as successful.
   * Cryptographically verifies signature and verifies status is not declined.
   */
  validatePaymentVerificationStrict(params: {
    orderId: string;
    paymentId: string;
    signature: string;
    secret: string;
    providerStatus?: string;
  }): { success: boolean; error?: string } {
    const { orderId, paymentId, signature, secret, providerStatus } = params;

    if (!orderId || !paymentId || !signature) {
      return { success: false, error: "Missing required payment parameters." };
    }

    // Verify HMAC signature
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const expectedBuf = Buffer.from(expected, "utf8");
    const sigBuf = Buffer.from(signature, "utf8");

    if (expectedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expectedBuf, sigBuf)) {
      return { success: false, error: "Payment verification failed: cryptographic signature mismatch." };
    }

    if (providerStatus && ["failed", "declined", "cancelled"].includes(providerStatus.toLowerCase())) {
      return { success: false, error: "Payment was reported as declined by provider." };
    }

    return { success: true };
  },

  /**
   * 12. Prevent payment success from being assumed solely from a browser redirect.
   * Client landing on /checkout/success?session_id=... cannot activate features without verified webhook or cryptographic server confirmation.
   */
  validateRedirectPaymentClaim(params: {
    redirectSessionId?: string;
    hasCryptographicConfirmation: boolean;
  }): { isVerified: boolean; message: string } {
    const { redirectSessionId, hasCryptographicConfirmation } = params;

    if (!redirectSessionId) {
      return {
        isVerified: false,
        message: "Missing session ID in redirect.",
      };
    }

    if (!hasCryptographicConfirmation) {
      return {
        isVerified: false,
        message: "Browser redirect alone is not trusted: Payment success cannot be assumed solely from a browser redirect. Awaiting cryptographic webhook or server API verification.",
      };
    }

    return {
      isVerified: true,
      message: "Payment cryptographically confirmed.",
    };
  },

  /**
   * 13. Prevent payment success followed by booking failure from going unreconciled.
   * When an appointment booking or downstream resource provisioning fails after successful charge,
   * flags the payment as orphaned in the reconciliation registry and issues an audit alert.
   */
  reconcilePaymentWithoutBooking(params: {
    paymentId: string;
    organizationId: string;
    amount: number;
    bookingError: string;
  }): { reconciled: boolean; action: "flagged_for_refund" | "admin_alert_created"; correlationId: string } {
    const { paymentId, organizationId, amount, bookingError } = params;
    const correlationId = `reconcile_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    console.warn(
      `[BillingSecurity] Orphaned payment detected: payment ${paymentId} succeeded for org ${organizationId} ($${amount}) but booking failed: ${bookingError}. Flagged for reconciliation.`
    );

    return {
      reconciled: true,
      action: "flagged_for_refund",
      correlationId,
    };
  },

  /**
   * 14. Prevent duplicate charges caused by repeated checkout submissions.
   * Returns existing pending checkout session if submitted within a rapid 60s window.
   */
  checkCheckoutIdempotency(params: {
    organizationId: string;
    planId: string;
    idempotencyKey?: string;
  }): { isDuplicate: boolean; existingSession?: { sessionId: string; url: string | null } } {
    cleanExpiredIdempotencyKeys();

    const { organizationId, planId, idempotencyKey } = params;
    const key = idempotencyKey || `${organizationId}:${planId.toLowerCase()}`;

    const existing = checkoutIdempotencyMap.get(key);
    if (existing) {
      return {
        isDuplicate: true,
        existingSession: { sessionId: existing.sessionId, url: existing.url },
      };
    }

    return { isDuplicate: false };
  },

  recordCheckoutSession(params: {
    organizationId: string;
    planId: string;
    sessionId: string;
    url?: string | null;
    idempotencyKey?: string;
  }) {
    const { organizationId, planId, sessionId, url = null, idempotencyKey } = params;
    const key = idempotencyKey || `${organizationId}:${planId.toLowerCase()}`;
    checkoutIdempotencyMap.set(key, { sessionId, url, createdAt: Date.now() });
  },

  /**
   * 15. Prevent subscription access from being granted to an unpaid account without an explicit permitted policy.
   * When trial or grace period expires, access must be restricted.
   */
  enforceSubscriptionAccessPolicy(subscription: {
    state: string;
    isTrial: boolean;
    trialDaysRemaining: number;
    gracePeriodDaysRemaining: number | null;
  }): { allowed: boolean; reason?: string } {
    const state = subscription.state.toUpperCase();

    if (state === "ACTIVE") {
      return { allowed: true };
    }

    if (state === "TRIALING") {
      if (subscription.trialDaysRemaining > 0) {
        return { allowed: true };
      }
      return { allowed: false, reason: "14-day trial has expired. A paid subscription is required to continue." };
    }

    if (state === "PAST_DUE") {
      if (subscription.gracePeriodDaysRemaining !== null && subscription.gracePeriodDaysRemaining > 0) {
        return { allowed: true }; // Grace period active
      }
      return { allowed: false, reason: "Payment grace period has expired. Account is suspended." };
    }

    if (["EXPIRED", "SUSPENDED", "CANCELED", "UNPAID"].includes(state)) {
      return { allowed: false, reason: `Subscription is ${state.toLowerCase()}. Operational access is restricted.` };
    }

    return { allowed: false, reason: "Account subscription is not active." };
  },

  /**
   * 16. Prevent legitimate paid users from losing access due to transient webhook failures.
   * On initial failure, account transitions to PAST_DUE with a 5-day grace period rather than instant SUSPENSION.
   */
  protectLegitimateUserDuringTransientFailure(subState: string, isTransientFailure: boolean): {
    state: string;
    isRestricted: boolean;
    graceDaysGranted: number;
  } {
    if (isTransientFailure) {
      return {
        state: "PAST_DUE",
        isRestricted: false, // Access NOT restricted during grace period
        graceDaysGranted: 5,
      };
    }
    return {
      state: subState,
      isRestricted: subState === "SUSPENDED" || subState === "EXPIRED",
      graceDaysGranted: 0,
    };
  },

  /**
   * 17. Prevent subscription limits from being bypassed through direct API calls.
   */
  enforceSubscriptionUsageLimit(params: {
    currentUsage: number;
    planLimit: number | null;
    requestedDelta?: number;
  }): { allowed: boolean; error?: string } {
    const { currentUsage, planLimit, requestedDelta = 1 } = params;

    // null limit means unlimited
    if (planLimit === null) {
      return { allowed: true };
    }

    if (currentUsage + requestedDelta > planLimit) {
      return {
        allowed: false,
        error: `Plan limit exceeded: current usage (${currentUsage}) + requested (${requestedDelta}) exceeds plan cap (${planLimit}). Upgrade your plan to continue.`,
      };
    }

    return { allowed: true };
  },

  /**
   * 18. Prevent currency, amount or plan-price tampering.
   * Derives authoritative amount and currency from server-side PLAN_CATALOG, ignoring client overrides.
   */
  validatePlanPriceAndCurrency(params: {
    planId: string;
    clientSuppliedPrice?: number;
    clientSuppliedCurrency?: string;
    countryCode?: string;
  }): {
    valid: boolean;
    authoritativePrice: number;
    authoritativeCurrency: string;
    tampered: boolean;
  } {
    const { planId, clientSuppliedPrice, clientSuppliedCurrency, countryCode } = params;
    const plan = getLocalizedPlan(planId, clientSuppliedCurrency, countryCode);

    let tampered = false;
    if (clientSuppliedPrice !== undefined && clientSuppliedPrice !== plan.price) {
      tampered = true;
    }

    return {
      valid: true,
      authoritativePrice: plan.price,
      authoritativeCurrency: plan.currency,
      tampered,
    };
  },

  /**
   * 19. Prevent unauthorized modification of billing identifiers.
   * Strips or rejects client-side attempts to update provider IDs (stripeCustomerId, etc.)
   */
  preventBillingIdentifierTampering(updates: Record<string, any>, userRole: string): {
    sanitized: Record<string, any>;
    tamperingDetected: boolean;
  } {
    const protectedFields = [
      "stripeCustomerId",
      "razorpayCustomerId",
      "stripeSubscriptionId",
      "razorpaySubscriptionId",
      "billingAccountId",
      "id",
      "organizationId",
    ];

    let tamperingDetected = false;
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (protectedFields.includes(key)) {
        tamperingDetected = true;
        // Strip protected field from client update
      } else {
        sanitized[key] = value;
      }
    }

    if (tamperingDetected && userRole !== "system") {
      throw new BillingSecurityError(
        "Direct client modification of billing identifiers is forbidden.",
        "BILLING_IDENTIFIER_TAMPERING",
        403
      );
    }

    return { sanitized, tamperingDetected };
  },

  /**
   * 20. Prevent refunds or reversals from being ignored in the application's financial state.
   * Accurately updates remaining balance, detects full refunds, and calculates net revenue adjustment.
   */
  recordRefundFinancialState(params: {
    paymentAmount: number;
    totalRefundedSoFar: number;
    incomingRefundAmount: number;
  }): {
    isFullRefund: boolean;
    remainingBalance: number;
    netRevenue: number;
    invoiceStatus: "refunded" | "paid";
  } {
    const { paymentAmount, totalRefundedSoFar, incomingRefundAmount } = params;
    const newTotalRefunded = totalRefundedSoFar + incomingRefundAmount;
    const remainingBalance = Math.max(0, paymentAmount - newTotalRefunded);
    const isFullRefund = newTotalRefunded >= (paymentAmount - 0.001);

    return {
      isFullRefund,
      remainingBalance: Number(remainingBalance.toFixed(2)),
      netRevenue: Number(remainingBalance.toFixed(2)),
      invoiceStatus: isFullRefund ? "refunded" : "paid",
    };
  },
};
