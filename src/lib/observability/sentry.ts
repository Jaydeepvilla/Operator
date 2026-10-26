/**
 * Sentry & Production Observability Bridge
 * Provides error capture, performance tracing hooks, and privacy scrubbing.
 * Operates gracefully in non-blocking mode when SENTRY_DSN is absent.
 */

import { redactSensitiveData, sanitizeErrorMessage } from "./redaction";

export interface SentryBreadcrumb {
  category?: string;
  message: string;
  level?: "debug" | "info" | "warning" | "error" | "fatal";
  timestamp?: number;
  data?: Record<string, unknown>;
}

export interface CaptureContext {
  tags?: Record<string, string | number | boolean>;
  extra?: Record<string, unknown>;
  user?: {
    id?: string;
    organizationId?: string;
  };
  level?: "info" | "warning" | "error" | "fatal";
  fingerprint?: string[];
}

import * as SentrySDK from "@sentry/nextjs";

function getSentrySDK(): any {
  return SentrySDK;
}

class SentryObservabilityBridge {
  private dsn: string | undefined;
  private environment: string;
  private release: string;
  private initialized = false;
  private inMemoryBreadcrumbs: SentryBreadcrumb[] = [];

  constructor() {
    this.dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
    this.environment = process.env.NODE_ENV || "development";
    this.release = process.env.npm_package_version || "0.1.0";
  }

  /**
   * Returns true if a live Sentry DSN is configured.
   */
  public isConfigured(): boolean {
    return Boolean(this.dsn && !this.dsn.includes("your-sentry-dsn"));
  }

  /**
   * Initializes client or server Sentry SDK if DSN is present.
   */
  public init() {
    if (this.initialized) return;
    this.initialized = true;

    if (this.isConfigured()) {
      try {
        const Sentry = getSentrySDK();
        if (Sentry && typeof Sentry.init === "function") {
          Sentry.init({
            dsn: this.dsn,
            environment: this.environment,
            release: this.release,
            tracesSampleRate: this.environment === "production" ? 0.1 : 1.0,
            beforeSend: (event: any) => this.beforeSendScrubber(event),
            beforeSendTransaction: (event: any) => this.beforeSendTransactionScrubber(event),
          });
        }
      } catch {
        // SDK not installed or loaded — bridge operates in resilient local mode
      }
    }
  }

  /**
   * Scrubs sensitive credentials, tokens, and PII from outgoing Sentry error events.
   */
  public beforeSendScrubber(event: any): any {
    if (!event) return event;

    try {
      // 1. Sanitize exception values and messages
      if (event.exception?.values) {
        event.exception.values = event.exception.values.map((val: any) => ({
          ...val,
          value: sanitizeErrorMessage(val.value || ""),
        }));
      }

      // 2. Redact request headers, cookies, query strings
      if (event.request) {
        if (event.request.headers) {
          event.request.headers = redactSensitiveData(event.request.headers);
        }
        if (event.request.cookies) {
          event.request.cookies = "[REDACTED_COOKIES]";
        }
        if (event.request.data) {
          event.request.data = redactSensitiveData(event.request.data);
        }
      }

      // 3. Redact user details (strip IP, email, username)
      if (event.user) {
        event.user = {
          id: event.user.id || undefined,
          // Strip direct personal identifiers from Sentry user object
          ip_address: undefined,
          email: undefined,
          username: undefined,
        };
      }

      // 4. Redact extra data and tags
      if (event.extra) {
        event.extra = redactSensitiveData(event.extra);
      }

      // 5. Redact breadcrumbs
      if (event.breadcrumbs?.values) {
        event.breadcrumbs.values = event.breadcrumbs.values.map((bc: any) => ({
          ...bc,
          data: bc.data ? redactSensitiveData(bc.data) : undefined,
          message: sanitizeErrorMessage(bc.message || ""),
        }));
      }
    } catch {
      // If scrubbing fails, drop extra fields to prevent data leak
      event.extra = { scrub_error: "Sensitive data was pruned due to scrubbing exception" };
    }

    return event;
  }

  /**
   * Scrubs transaction trace events.
   */
  public beforeSendTransactionScrubber(event: any): any {
    if (!event) return event;
    if (event.request?.headers) {
      event.request.headers = redactSensitiveData(event.request.headers);
    }
    return event;
  }

  /**
   * Captures an exception with redacted context metadata.
   * Safe to call anywhere — never throws or blocks.
   */
  public captureException(error: unknown, context?: CaptureContext): string {
    const errorId = `sentry_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const sanitizedContext = context ? redactSensitiveData(context) : undefined;
    const sanitizedError = error instanceof Error 
      ? new Error(sanitizeErrorMessage(error.message))
      : new Error(sanitizeErrorMessage(String(error)));

    if (error instanceof Error && error.stack) {
      sanitizedError.stack = error.stack;
    }

    // Record diagnostic breadcrumb
    this.addBreadcrumb({
      category: "exception",
      message: sanitizedError.message,
      level: "error",
      data: sanitizedContext?.extra as Record<string, unknown>,
    });

    if (this.isConfigured()) {
      try {
        const Sentry = getSentrySDK();
        if (Sentry && typeof Sentry.captureException === "function") {
          return Sentry.captureException(sanitizedError, sanitizedContext);
        }
      } catch {
        // fallback to local logging
      }
    }

    return errorId;
  }

  /**
   * Captures an informational or warning message.
   */
  public captureMessage(
    message: string,
    level: "info" | "warning" | "error" = "info",
    context?: CaptureContext
  ): string {
    const msgId = `msg_${Date.now().toString(36)}`;
    const sanitizedMessage = sanitizeErrorMessage(message);
    const sanitizedContext = context ? redactSensitiveData(context) : undefined;

    if (this.isConfigured()) {
      try {
        const Sentry = getSentrySDK();
        if (Sentry && typeof Sentry.captureMessage === "function") {
          return Sentry.captureMessage(sanitizedMessage, level, sanitizedContext);
        }
      } catch {}
    }

    this.addBreadcrumb({
      category: "message",
      message: sanitizedMessage,
      level,
      data: sanitizedContext?.extra as Record<string, unknown>,
    });

    return msgId;
  }

  /**
   * Adds an operational breadcrumb with automatic data redaction.
   */
  public addBreadcrumb(breadcrumb: SentryBreadcrumb) {
    const sanitized: SentryBreadcrumb = {
      ...breadcrumb,
      message: sanitizeErrorMessage(breadcrumb.message),
      timestamp: breadcrumb.timestamp || Date.now(),
      data: breadcrumb.data ? redactSensitiveData(breadcrumb.data) : undefined,
    };

    if (this.isConfigured()) {
      try {
        const Sentry = getSentrySDK();
        if (Sentry && typeof Sentry.addBreadcrumb === "function") {
          Sentry.addBreadcrumb(sanitized);
        }
      } catch {}
    }

    // Retain bounded in-memory circular buffer of 50 recent breadcrumbs for local diagnostics & inspections
    this.inMemoryBreadcrumbs.push(sanitized);
    if (this.inMemoryBreadcrumbs.length > 50) {
      this.inMemoryBreadcrumbs.shift();
    }
  }

  /**
   * Returns recent breadcrumbs (used in diagnostic tests and local logging).
   */
  public getRecentBreadcrumbs(): SentryBreadcrumb[] {
    return [...this.inMemoryBreadcrumbs];
  }

  /**
   * Clears recent breadcrumbs (used in tests).
   */
  public clearBreadcrumbs() {
    this.inMemoryBreadcrumbs = [];
  }
}

export const sentry = new SentryObservabilityBridge();
