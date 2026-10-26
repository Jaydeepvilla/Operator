/**
 * Structured Logger — production-grade logging utility for Operator.
 * Outputs structured JSON in production and formatted text in development.
 * Automatically sanitizes sensitive data and bridges errors to Sentry.
 */

import { redactSensitiveData, sanitizeErrorMessage } from "@/lib/observability/redaction";
import { sentry } from "@/lib/observability/sentry";

type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  correlationId?: string;
  organizationId?: string;
  userId?: string;
  durationMs?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  data?: Record<string, unknown>;
}

function formatLog(entry: LogEntry): string {
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(entry);
  }
  const levelColors: Record<LogLevel, string> = {
    debug: "\x1b[37m",  // white
    info: "\x1b[36m",   // cyan
    warn: "\x1b[33m",   // yellow
    error: "\x1b[31m",  // red
  };
  const reset = "\x1b[0m";
  const color = levelColors[entry.level];
  const contextStr = entry.context ? ` [${entry.context}]` : "";
  const corrStr = entry.correlationId ? ` {${entry.correlationId.slice(0, 8)}}` : "";
  return `${color}[${entry.level.toUpperCase()}]${reset}${contextStr}${corrStr} ${entry.message}${entry.data ? ` ${JSON.stringify(entry.data)}` : ""}`;
}

function buildEntry(
  level: LogLevel,
  message: string,
  options?: {
    context?: string;
    correlationId?: string;
    organizationId?: string;
    userId?: string;
    durationMs?: number;
    error?: Error | unknown;
    data?: Record<string, unknown>;
  }
): LogEntry {
  const sanitizedMessage = sanitizeErrorMessage(message);
  const sanitizedData = options?.data ? redactSensitiveData(options.data) : undefined;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: sanitizedMessage,
    context: options?.context,
    correlationId: options?.correlationId,
    organizationId: options?.organizationId,
    userId: options?.userId,
    durationMs: options?.durationMs,
    data: sanitizedData,
  };

  if (options?.error) {
    const err = options.error instanceof Error ? options.error : new Error(String(options.error));
    entry.error = {
      name: err.name,
      message: sanitizeErrorMessage(err.message),
      stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
    };
  }

  return entry;
}

export const logger = {
  debug(message: string, options?: Parameters<typeof buildEntry>[2]) {
    if (process.env.NODE_ENV === "production") return; // skip debug in prod
    const entry = buildEntry("debug", message, options);
    console.debug(formatLog(entry));
  },

  info(message: string, options?: Parameters<typeof buildEntry>[2]) {
    const entry = buildEntry("info", message, options);
    console.info(formatLog(entry));

    sentry.addBreadcrumb({
      category: options?.context || "log.info",
      message: entry.message,
      level: "info",
      data: entry.data,
    });
  },

  warn(message: string, options?: Parameters<typeof buildEntry>[2]) {
    const entry = buildEntry("warn", message, options);
    console.warn(formatLog(entry));

    sentry.addBreadcrumb({
      category: options?.context || "log.warn",
      message: entry.message,
      level: "warning",
      data: entry.data,
    });
  },

  error(message: string, options?: Parameters<typeof buildEntry>[2]) {
    const entry = buildEntry("error", message, options);
    console.error(formatLog(entry));

    // Forward to Sentry bridge with sanitized context
    const errObj = options?.error instanceof Error
      ? options.error
      : new Error(entry.message);

    sentry.captureException(errObj, {
      tags: {
        context: options?.context || "unspecified",
        correlationId: options?.correlationId || "none",
        organizationId: options?.organizationId || "none",
      },
      extra: {
        durationMs: options?.durationMs,
        data: entry.data,
      },
      user: options?.userId ? { id: options.userId } : undefined,
    });
  },

  /**
   * Wraps an async function with timing and automatic error logging.
   * Returns the result or re-throws the error after logging.
   */
  async timed<T>(
    label: string,
    fn: () => Promise<T>,
    context?: string
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const durationMs = Date.now() - start;
      if (durationMs > 1000) {
        logger.warn(`Slow operation: ${label}`, { context, durationMs });
      } else {
        logger.debug(`${label} completed`, { context, durationMs });
      }
      return result;
    } catch (err) {
      const durationMs = Date.now() - start;
      logger.error(`${label} failed`, { context, durationMs, error: err });
      throw err;
    }
  },
};
