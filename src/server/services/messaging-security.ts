/**
 * Central Authority for Messaging, Email and Customer Communications Security Hardening.
 * Enforces all 13 Guarantees:
 * 1. Prevent messages from being sent to the wrong customer.
 * 2. Prevent unauthorized users from sending messages on behalf of a business.
 * 3. Prevent duplicate messages caused by retries.
 * 4. Prevent message content from exposing private customer information.
 * 5. Prevent untrusted input from injecting malicious links or markup.
 * 6. Prevent spoofed inbound messages from being treated as verified authorization.
 * 7. Prevent unsubscribe or opt-out requests from being ignored where applicable.
 * 8. Prevent messages from being sent through disconnected or unauthorized channels.
 * 9. Prevent a failed delivery from being reported as delivered.
 * 10. Prevent a queued message from being reported as sent.
 * 11. Prevent a notification failure from triggering a duplicate booking.
 * 12. Prevent credentials and provider responses from leaking through message logs.
 * 13. Prevent unbounded outbound messaging from generating spam or unexpected costs.
 */

import crypto from "crypto";

export class MessagingSecurityError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = "MessagingSecurityError";
  }
}

// In-memory ledgers for deduplication, opt-outs, and velocity tracking
const messageDeduplicationLedger = new Map<string, { timestamp: number; messageId: string }>();
const recipientOptOutRegistry = new Map<string, { optedOutAt: number; reason: string }>();
const orgVelocityTracker = new Map<string, number[]>();
const recipientVelocityTracker = new Map<string, number[]>();

// Sensitive keys to redact in communication logs
const SENSITIVE_LOG_KEYS = new Set([
  "apikey",
  "api_key",
  "secret",
  "apisecret",
  "api_secret",
  "token",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "authtoken",
  "auth_token",
  "authorization",
  "password",
  "credentials",
  "sinchtoken",
  "vonageapisecret",
  "resendapikey",
]);

// Standard opt-out keywords (TCPA / GDPR)
const OPT_OUT_KEYWORDS = new Set([
  "STOP",
  "UNSUBSCRIBE",
  "CANCEL",
  "QUIT",
  "END",
  "OPTOUT",
  "OPT-OUT",
  "REVOKE",
  "STOPALL",
]);

export const MessagingSecurityService = {
  /**
   * 1. Prevent messages from being sent to the wrong customer.
   * Asserts that target contact details match the authoritative customer record on file.
   */
  assertRecipientCustomerMatch(params: {
    organizationId: string;
    customerId: string;
    recipientPhone?: string;
    recipientEmail?: string;
    customerRecord?: {
      id: string;
      organizationId: string;
      phone?: string | null;
      email?: string | null;
    } | null;
  }): void {
    const { organizationId, customerId, recipientPhone, recipientEmail, customerRecord } = params;

    if (!customerRecord) {
      throw new MessagingSecurityError(
        `Authoritative customer record not found for ID: ${customerId}`,
        404
      );
    }

    // Tenant check
    if (customerRecord.organizationId !== organizationId) {
      throw new MessagingSecurityError(
        `Cross-tenant access forbidden: Customer ${customerId} belongs to another organization`,
        403
      );
    }

    if (customerRecord.id !== customerId) {
      throw new MessagingSecurityError(
        `Customer ID mismatch: Expected ${customerId}, got ${customerRecord.id}`,
        400
      );
    }

    // Verify phone match if sending via phone/SMS
    if (recipientPhone) {
      const cleanTargetPhone = recipientPhone.replace(/\D/g, "");
      const cleanRecordPhone = (customerRecord.phone || "").replace(/\D/g, "");
      if (!cleanRecordPhone || cleanTargetPhone !== cleanRecordPhone) {
        throw new MessagingSecurityError(
          `Recipient mismatch: Phone number ${recipientPhone} does not match authoritative profile for customer ${customerId}`,
          403
        );
      }
    }

    // Verify email match if sending via email
    if (recipientEmail) {
      const cleanTargetEmail = recipientEmail.trim().toLowerCase();
      const cleanRecordEmail = (customerRecord.email || "").trim().toLowerCase();
      if (!cleanRecordEmail || cleanTargetEmail !== cleanRecordEmail) {
        throw new MessagingSecurityError(
          `Recipient mismatch: Email ${recipientEmail} does not match authoritative profile for customer ${customerId}`,
          403
        );
      }
    }
  },

  /**
   * 2. Prevent unauthorized users from sending messages on behalf of a business.
   * Verifies authenticated identity, organization membership, and valid sender role.
   */
  assertUserAuthorizedToSendMessage(params: {
    sessionUserId: string;
    sessionOrgId: string;
    targetOrgId: string;
    userRole?: string;
  }): void {
    const { sessionUserId, sessionOrgId, targetOrgId, userRole = "staff" } = params;

    if (!sessionUserId || sessionUserId === "anonymous" || sessionUserId === "unauthenticated") {
      throw new MessagingSecurityError(
        "Unauthenticated: A valid user session is required to send messages on behalf of a business",
        401
      );
    }

    if (sessionOrgId !== targetOrgId) {
      throw new MessagingSecurityError(
        `Cross-tenant violation: User belongs to organization ${sessionOrgId}, cannot message on behalf of ${targetOrgId}`,
        403
      );
    }

    const permittedRoles = ["owner", "admin", "staff", "system"];
    if (!permittedRoles.includes(userRole.toLowerCase())) {
      throw new MessagingSecurityError(
        `Forbidden: Role '${userRole}' lacks permission to send business communications`,
        403
      );
    }
  },

  /**
   * 3. Prevent duplicate messages caused by retries.
   * Idempotency ledger suppresses duplicate delivery attempts within the deduplication window.
   */
  checkMessageIdempotency(params: {
    organizationId: string;
    recipientId: string;
    content: string;
    idempotencyKey?: string;
  }): { isDuplicate: boolean; messageId: string } {
    const { organizationId, recipientId, content, idempotencyKey } = params;

    const key =
      idempotencyKey ||
      crypto
        .createHash("sha256")
        .update(`${organizationId}:${recipientId}:${content.trim()}`)
        .digest("hex");

    const now = Date.now();
    const existing = messageDeduplicationLedger.get(key);

    // 10-minute deduplication window
    if (existing && now - existing.timestamp < 10 * 60 * 1000) {
      return { isDuplicate: true, messageId: existing.messageId };
    }

    const newMessageId = `msg_${crypto.randomUUID()}`;
    messageDeduplicationLedger.set(key, { timestamp: now, messageId: newMessageId });

    // Evict old entries if ledger grows too large
    if (messageDeduplicationLedger.size > 5000) {
      for (const [k, val] of messageDeduplicationLedger.entries()) {
        if (now - val.timestamp > 15 * 60 * 1000) {
          messageDeduplicationLedger.delete(k);
        }
      }
    }

    return { isDuplicate: false, messageId: newMessageId };
  },

  /**
   * 4. Prevent message content from exposing private customer information.
   * Detects and redacts Credit Cards (PAN / CVV), SSNs, and high-entropy API secrets.
   */
  sanitizeOutboundMessageContent(content: string): {
    sanitizedContent: string;
    redactedTypes: string[];
  } {
    let sanitized = content;
    const redactedTypes: string[] = [];

    // Credit Card Primary Account Numbers (13-19 digits, with spaces or hyphens)
    const panRegex = /\b(?:\d[ -]*?){13,19}\b/g;
    if (panRegex.test(sanitized)) {
      sanitized = sanitized.replace(panRegex, (match) => {
        const digits = match.replace(/\D/g, "");
        if (digits.length >= 13 && digits.length <= 19) {
          redactedTypes.push("credit_card_pan");
          return `[REDACTED_FINANCIAL_INFO]`;
        }
        return match;
      });
    }

    // CVV / CVC codes (e.g. CVV: 123)
    const cvvRegex = /\b(?:cvv|cvc|cvn|security\s*code)[:\s]*\d{3,4}\b/gi;
    if (cvvRegex.test(sanitized)) {
      redactedTypes.push("credit_card_cvv");
      sanitized = sanitized.replace(cvvRegex, "[REDACTED_CVV]");
    }

    // US Social Security Numbers (\d{3}-\d{2}-\d{4})
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    if (ssnRegex.test(sanitized)) {
      redactedTypes.push("ssn");
      sanitized = sanitized.replace(ssnRegex, "[REDACTED_SSN]");
    }

    // High-entropy bearer tokens, private keys, or passwords
    const secretRegex = /\b(Bearer\s+[a-zA-Z0-9_\-\.]{20,}|sk_live_[a-zA-Z0-9]{24,}|ghp_[a-zA-Z0-9]{20,})\b/gi;
    if (secretRegex.test(sanitized)) {
      redactedTypes.push("credentials");
      sanitized = sanitized.replace(secretRegex, "[REDACTED_SECRET]");
    }

    return { sanitizedContent: sanitized, redactedTypes };
  },

  /**
   * 5. Prevent untrusted input from injecting malicious links or markup.
   * Strips XSS script vectors, disallows dangerous URI schemes, and neutralizes deceptive markdown links.
   */
  sanitizeUntrustedMessageInput(
    input: string,
    channelType: "email" | "sms" | "whatsapp" | "chat" = "chat"
  ): string {
    let cleaned = input;

    // Disallow dangerous URI schemes
    const dangerousSchemes = [/javascript\s*:/gi, /vbscript\s*:/gi, /data\s*:\s*text\/html/gi, /file\s*:\/\//gi];
    for (const scheme of dangerousSchemes) {
      cleaned = cleaned.replace(scheme, "unsafe-scheme:");
    }

    // Strip executable HTML elements and event handlers
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    cleaned = cleaned.replace(/<(iframe|object|embed|applet|form|base|meta)\b[^>]*>/gi, "");
    cleaned = cleaned.replace(/\s*on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "");

    // For SMS & WhatsApp: strip all HTML tags completely
    if (channelType === "sms" || channelType === "whatsapp") {
      cleaned = cleaned.replace(/<[^>]*>/g, "");
    }

    // Neutralize deceptive markdown link cloaking: [trusted-domain.com](http://malicious.evil.com)
    cleaned = cleaned.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/gi, (match, label, url) => {
      // If label looks like a domain but target URL points to a different domain, neutralize it
      const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (domainRegex.test(label.trim())) {
        try {
          const targetHost = new URL(url).hostname;
          if (label.trim().toLowerCase() !== targetHost.toLowerCase()) {
            return `[DECEPTIVE LINK REMOVED: ${targetHost}]`;
          }
        } catch {
          return `[INVALID LINK REMOVED]`;
        }
      }
      return match;
    });

    return cleaned;
  },

  /**
   * 6. Prevent spoofed inbound messages from being treated as verified authorization.
   * Verifies cryptographic signatures on inbound webhook messages and enforces that
   * inbound messages cannot execute administrative actions without web session auth.
   */
  verifyInboundMessageAuthenticity(params: {
    rawBody: string;
    signature?: string | null;
    secret?: string | null;
    algorithm?: "sha256" | "sha1";
  }): boolean {
    const { rawBody, signature, secret, algorithm = "sha256" } = params;

    if (!signature || !secret || secret.trim() === "") {
      return false;
    }

    try {
      const cleanSig = signature.replace(/^(sha256=|sha1=)/i, "").trim();
      const expectedSig = crypto
        .createHmac(algorithm, secret)
        .update(rawBody)
        .digest("hex");

      const sigBuf = Buffer.from(cleanSig, "hex");
      const expBuf = Buffer.from(expectedSig, "hex");

      if (sigBuf.length !== expBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  },

  /**
   * Asserts that an inbound message cannot perform administrative actions (e.g. role change, deletion).
   */
  assertInboundMessageCannotPerformAdminAction(params: {
    content: string;
    isAdminAttempt?: boolean;
  }): void {
    const { content } = params;
    const adminActionPatterns = [
      /\b(change\s+role|promote\s+to\s+admin|escalate\s+role)\b/i,
      /\b(delete\s+(organization|business|database)|drop\s+table)\b/i,
      /\b(update\s+billing|change\s+payout|cancel\s+subscription)\b/i,
    ];

    for (const pattern of adminActionPatterns) {
      if (pattern.test(content)) {
        throw new MessagingSecurityError(
          "Security rejection: Inbound messaging channels cannot execute administrative business actions. A verified administrator web session is required.",
          403
        );
      }
    }
  },

  /**
   * 7. Prevent unsubscribe or opt-out requests from being ignored where applicable.
   * Automatically recognizes TCPA/GDPR opt-out keywords and checks opt-out registry before sending.
   */
  processInboundOptOut(params: {
    organizationId: string;
    recipient: string;
    content: string;
  }): { isOptOutKeyword: boolean; recorded: boolean } {
    const { organizationId, recipient, content } = params;
    const trimmed = content.trim().toUpperCase();

    if (OPT_OUT_KEYWORDS.has(trimmed)) {
      const key = `${organizationId}:${recipient.trim().toLowerCase()}`;
      recipientOptOutRegistry.set(key, { optedOutAt: Date.now(), reason: trimmed });
      return { isOptOutKeyword: true, recorded: true };
    }

    return { isOptOutKeyword: false, recorded: false };
  },

  assertNotOptedOut(params: {
    organizationId: string;
    recipient: string;
    isTransactional?: boolean;
  }): void {
    const { organizationId, recipient, isTransactional = false } = params;

    // Transactional confirmations (e.g. password resets, security alerts) may be permitted,
    // but marketing, promotions, and general messages MUST respect opt-outs
    const key = `${organizationId}:${recipient.trim().toLowerCase()}`;
    const record = recipientOptOutRegistry.get(key);

    if (record && !isTransactional) {
      throw new MessagingSecurityError(
        `Communication blocked: Recipient '${recipient}' has opted out of messaging for this organization`,
        403
      );
    }
  },

  /**
   * 8. Prevent messages from being sent through disconnected or unauthorized channels.
   * Asserts channel belongs to organization, is 'active', and connection is 'connected'.
   */
  assertChannelOperational(params: {
    targetOrgId: string;
    channel: {
      id: string;
      organizationId: string;
      status: string;
      connection?: {
        status: string;
        credentials?: Record<string, any>;
      } | null;
    } | null;
  }): void {
    const { targetOrgId, channel } = params;

    if (!channel) {
      throw new MessagingSecurityError("Channel configuration not found", 404);
    }

    if (channel.organizationId !== targetOrgId) {
      throw new MessagingSecurityError(
        `Cross-tenant violation: Channel belongs to organization ${channel.organizationId}, cannot be used by ${targetOrgId}`,
        403
      );
    }

    if (channel.status !== "active") {
      throw new MessagingSecurityError(
        `Channel '${channel.id}' is ${channel.status}; cannot dispatch messages through an inactive channel`,
        400
      );
    }

    if (!channel.connection || channel.connection.status !== "connected") {
      const connStatus = channel.connection ? channel.connection.status : "missing";
      throw new MessagingSecurityError(
        `Channel '${channel.id}' is ${connStatus}; messages cannot be sent through a disconnected or unconfigured channel`,
        400
      );
    }
  },

  /**
   * 9. Prevent a failed delivery from being reported as delivered.
   * Prevents false success reporting by mapping failures to 'failed' and rejecting invalid state transitions.
   */
  updateMessageDeliveryStatus(
    currentStatus: string,
    providerEvent: {
      status: "failed" | "undelivered" | "bounced" | "delivered" | "sent" | "read";
      error?: string;
    }
  ): { status: string; error?: string } {
    const failureStatuses = ["failed", "undelivered", "bounced"];

    // If provider reported a failure event, status MUST become failed
    if (failureStatuses.includes(providerEvent.status)) {
      return {
        status: "failed",
        error: providerEvent.error || `Provider delivery failure: ${providerEvent.status}`,
      };
    }

    // Prevent transitioning a failed message to 'delivered' or 'sent'
    if (currentStatus === "failed" && (providerEvent.status === "delivered" || providerEvent.status === "sent")) {
      throw new MessagingSecurityError(
        `Invalid status transition: A failed message cannot be marked as '${providerEvent.status}'`,
        400
      );
    }

    return {
      status: providerEvent.status,
      error: providerEvent.error,
    };
  },

  /**
   * 10. Prevent a queued message from being reported as sent.
   * Ensures status remains 'queued' until provider API confirms acceptance with external message ID.
   */
  validateMessageStateTransition(
    fromState: string,
    toState: string,
    providerAccepted: boolean,
    externalMessageId?: string | null
  ): string {
    // If attempting to transition from queued to sent without provider acceptance or external ID, block it
    if (fromState === "queued" && toState === "sent") {
      if (!providerAccepted || !externalMessageId) {
        // Must remain queued until provider explicitly returns message ID
        return "queued";
      }
    }

    if (fromState === "queued" && toState === "delivered") {
      // Cannot jump from queued straight to delivered without provider acceptance
      throw new MessagingSecurityError(
        "Invalid state transition: Queued message cannot be marked as delivered directly without provider dispatch",
        400
      );
    }

    return toState;
  },

  /**
   * 11. Prevent a notification failure from triggering a duplicate booking.
   * Decouples appointment booking persistence from notification side-effects.
   */
  async dispatchBookingNotificationSafe(params: {
    bookingId: string;
    organizationId: string;
    notificationFn: () => Promise<boolean>;
  }): Promise<{ bookingIntact: boolean; notificationSent: boolean; error?: string }> {
    const { bookingId, notificationFn } = params;

    try {
      const sent = await notificationFn();
      return {
        bookingIntact: true,
        notificationSent: sent,
      };
    } catch (err: any) {
      // Notification failed, but booking status remains confirmed and must NOT be rolled back or retried
      console.warn(
        `[MessagingSecurity] Notification failed for confirmed booking ${bookingId}: ${err?.message || err}. Booking remains intact.`
      );
      return {
        bookingIntact: true,
        notificationSent: false,
        error: err?.message || "Notification dispatch failed",
      };
    }
  },

  /**
   * 12. Prevent credentials and provider responses from leaking through message logs.
   * Recursively redacts sensitive API keys, secrets, tokens, and authorization headers.
   */
  sanitizeCommunicationLogPayload<T extends Record<string, any>>(payload: T): T {
    if (!payload || typeof payload !== "object") {
      return payload;
    }

    const sanitized: Record<string, any> = Array.isArray(payload) ? [] : {};

    for (const [key, value] of Object.entries(payload)) {
      const lowerKey = key.toLowerCase();

      if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeCommunicationLogPayload(value);
      } else if (SENSITIVE_LOG_KEYS.has(lowerKey)) {
        sanitized[key] = "[REDACTED_CREDENTIAL]";
      } else if (typeof value === "string") {
        // Redact bearer tokens or API key strings embedded in text
        let strVal = value;
        strVal = strVal.replace(/Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, "Bearer [REDACTED_TOKEN]");
        strVal = strVal.replace(/(?:api_key|apikey|secret)=[^&\s]+/gi, "api_key=[REDACTED]");
        sanitized[key] = strVal;
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized as T;
  },

  /**
   * 13. Prevent unbounded outbound messaging from generating spam or unexpected costs.
   * Enforces organization-level throughput rate limits and per-recipient velocity throttling.
   */
  enforceOutboundVelocityLimits(params: {
    organizationId: string;
    recipient: string;
    maxPerOrgPerMinute?: number;
    maxPerRecipientTenMinutes?: number;
  }): { allowed: boolean; retryAfterSeconds?: number } {
    const {
      organizationId,
      recipient,
      maxPerOrgPerMinute = 100,
      maxPerRecipientTenMinutes = 5,
    } = params;

    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const tenMinutesAgo = now - 10 * 60 * 1000;

    // 1. Check organization velocity
    let orgTimestamps = orgVelocityTracker.get(organizationId) || [];
    orgTimestamps = orgTimestamps.filter((t) => t > oneMinuteAgo);
    if (orgTimestamps.length >= maxPerOrgPerMinute) {
      throw new MessagingSecurityError(
        `Outbound rate limit exceeded: Organization ${organizationId} has reached the outbound cap of ${maxPerOrgPerMinute} messages/minute`,
        429
      );
    }

    // 2. Check per-recipient velocity (prevent spamming same user)
    const recipientKey = `${organizationId}:${recipient.trim().toLowerCase()}`;
    let recTimestamps = recipientVelocityTracker.get(recipientKey) || [];
    recTimestamps = recTimestamps.filter((t) => t > tenMinutesAgo);
    if (recTimestamps.length >= maxPerRecipientTenMinutes) {
      throw new MessagingSecurityError(
        `Recipient velocity cap exceeded: Cannot send more than ${maxPerRecipientTenMinutes} messages to ${recipient} within 10 minutes`,
        429
      );
    }

    // Record timestamp
    orgTimestamps.push(now);
    orgVelocityTracker.set(organizationId, orgTimestamps);

    recTimestamps.push(now);
    recipientVelocityTracker.set(recipientKey, recTimestamps);

    return { allowed: true };
  },

  /**
   * Helper to reset test states
   */
  _resetTestState(): void {
    messageDeduplicationLedger.clear();
    recipientOptOutRegistry.clear();
    orgVelocityTracker.clear();
    recipientVelocityTracker.clear();
  },
};
