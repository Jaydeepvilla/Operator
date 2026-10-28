/**
 * Frontend and Browser Security Authority
 * 
 * Enforces Section 15 Hardening Guarantees:
 * - FE-01: Cross-Site Scripting (XSS) prevention across user inputs and content
 * - FE-02: Safe HTML rendering & sanitization of AI model outputs
 * - FE-03: Prevention of sensitive credential exposure in client bundles
 * - FE-04: Authoritative server authorization enforcement (client routes != auth)
 * - FE-05: Cross-Site Request Forgery (CSRF) protection on state-changing requests
 * - FE-06: Open redirect & unsafe navigation target validation
 * - FE-07: Sensitive token stripping from URLs and browser history
 * - FE-08: Insecure cross-origin request (CORS) prevention
 * - FE-09: Clickjacking prevention via strict framing headers (X-Frame-Options/CSP)
 * - FE-10: Rejection of client UI state as authoritative booking/payment truth
 * - FE-11: Action idempotency enforcement for browser retries and double submits
 * - FE-12: Optimistic concurrency / stale client state conflict prevention (409)
 * - FE-13: Production debug interface isolation & exposure prevention
 */

export class FrontendSecurityError extends Error {
  constructor(message: string, public readonly code: string = "FRONTEND_SECURITY_VIOLATION") {
    super(message);
    this.name = "FrontendSecurityError";
  }
}

// Dangerous HTML tag pattern
const DANGEROUS_HTML_TAGS = /<\s*(?:script|iframe|object|embed|form|button|style|svg|math|link|meta|base)\b[^>]*>[\s\S]*?<\s*\/\s*(?:script|iframe|object|embed|form|button|style|svg|math|link|meta|base)\s*>|<\s*(?:script|iframe|object|embed|form|button|style|svg|math|link|meta|base)\b[^>]*\/?>/gi;

// Inline event handler pattern (e.g., onerror=, onload=, onclick=)
const INLINE_EVENT_HANDLERS = /\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;

// Dangerous protocols (javascript:, vbscript:, data:text/html)
const DANGEROUS_PROTOCOLS = /(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/gi;

// Approved public environment variable keys
const ALLOWED_PUBLIC_ENV_KEYS = new Set([
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "NEXT_PUBLIC_SENTRY_DSN",
  "NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY",
  "NEXT_PUBLIC_GA_MEASUREMENT_ID",
  "NEXT_PUBLIC_ENVIRONMENT",
]);

// Secret markers that must NEVER appear in public env vars
const SECRET_MARKERS = [
  "SECRET",
  "PRIVATE_KEY",
  "AUTH_TOKEN",
  "DATABASE_URL",
  "PASSWORD",
  "SERVICE_ROLE",
  "API_SECRET",
  "SIGNING_KEY",
  "JWT_SECRET",
  "WEBHOOK_SECRET",
];

// Sensitive URL query parameter keys to redact from history (lowercase)
const SENSITIVE_URL_PARAMS = new Set([
  "token",
  "session_token",
  "secret",
  "apikey",
  "api_key",
  "password",
  "code",
  "access_token",
  "refresh_token",
  "jwt",
  "authorization",
  "signature",
]);

export class FrontendSecurityService {
  /**
   * FE-01: Prevent XSS through business names, FAQs, transcripts, messages and uploaded content.
   */
  static sanitizePlainText(input: unknown): string {
    if (input === null || input === undefined) return "";
    const str = String(input);
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }

  static sanitizeHtmlForRender(input: string): string {
    if (!input || typeof input !== "string") return "";

    let sanitized = input;
    // Strip dangerous tags
    sanitized = sanitized.replace(DANGEROUS_HTML_TAGS, "");
    // Strip inline event handlers
    sanitized = sanitized.replace(INLINE_EVENT_HANDLERS, "");
    // Block dangerous protocols
    sanitized = sanitized.replace(DANGEROUS_PROTOCOLS, "#blocked-protocol:");

    return sanitized;
  }

  /**
   * FE-02: Prevent unsafe HTML rendering of AI output.
   */
  static sanitizeAiGeneratedOutput(aiOutput: string): string {
    if (!aiOutput || typeof aiOutput !== "string") return "";

    let safeOutput = aiOutput;

    // Disallow raw HTML executable injection in AI markdown/text
    safeOutput = safeOutput.replace(DANGEROUS_HTML_TAGS, "");
    safeOutput = safeOutput.replace(INLINE_EVENT_HANDLERS, "");

    // Sanitize markdown link targets: disallow javascript: and data:
    safeOutput = safeOutput.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (match, label, href) => {
        const cleanHref = href.trim();
        if (/^(?:javascript|vbscript|data):/i.test(cleanHref)) {
          return `[${label}](#blocked-script-link)`;
        }
        return match;
      }
    );

    // Sanitize raw URLs
    safeOutput = safeOutput.replace(DANGEROUS_PROTOCOLS, "#blocked-protocol:");

    return safeOutput;
  }

  /**
   * FE-03: Prevent sensitive credentials from being embedded in frontend bundles.
   */
  static assertNoExposedSecretsInClientBundle(envConfig: Record<string, string | undefined>): void {
    for (const [key, val] of Object.entries(envConfig)) {
      if (key.startsWith("NEXT_PUBLIC_")) {
        const upperKey = key.toUpperCase();

        // 1. Check if the public variable name contains secret markers
        for (const marker of SECRET_MARKERS) {
          if (upperKey.includes(marker)) {
            throw new FrontendSecurityError(
              `Critical build security violation: Private secret key '${key}' cannot be exposed via NEXT_PUBLIC_ prefix in client bundles`
            );
          }
        }

        // 2. Check if the value matches known secret signatures
        if (val) {
          const valTrimmed = val.trim();
          if (
            valTrimmed.startsWith("sk_live_") ||
            valTrimmed.startsWith("sk_test_") ||
            valTrimmed.startsWith("postgres://") ||
            valTrimmed.startsWith("postgresql://") ||
            valTrimmed.startsWith("mongodb://") ||
            valTrimmed.startsWith("ghp_") ||
            (valTrimmed.startsWith("ey") && valTrimmed.split(".").length === 3) // JWT signature
          ) {
            throw new FrontendSecurityError(
              `Critical build security violation: Secret payload detected inside public client bundle key '${key}'`
            );
          }
        }
      }
    }
  }

  /**
   * FE-04: Prevent client-side route protection from being treated as server authorization.
   */
  static assertServerSideAuthorizationRequired(
    clientAuthState: { isClientAuthenticated: boolean; clientRole?: string },
    serverAuthSession: { isValid: boolean; role?: string; userId?: string } | null
  ): boolean {
    if (!serverAuthSession || !serverAuthSession.isValid) {
      throw new FrontendSecurityError(
        "Access denied: Client-side route state is non-authoritative; valid server session required"
      );
    }

    if (clientAuthState.clientRole && serverAuthSession.role) {
      if (clientAuthState.clientRole !== serverAuthSession.role) {
        throw new FrontendSecurityError(
          `Privilege elevation blocked: Client claimed role '${clientAuthState.clientRole}' but server authoritative role is '${serverAuthSession.role}'`
        );
      }
    }

    return true;
  }

  /**
   * FE-05: Prevent CSRF on sensitive state-changing operations where applicable.
   */
  static verifyCsrfTokenOrOrigin(requestHeaders: {
    origin?: string;
    host?: string;
    secFetchSite?: string;
    csrfToken?: string;
    expectedCsrfToken?: string;
    method?: string;
    isPublicWebhook?: boolean;
  }): boolean {
    const { origin, host, secFetchSite, csrfToken, expectedCsrfToken, method = "POST", isPublicWebhook } = requestHeaders;

    // Read-only methods don't trigger state mutations
    if (["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
      return true;
    }

    // Public webhooks rely on signature verification
    if (isPublicWebhook) {
      return true;
    }

    // Reject cross-site fetch without explicit authorization
    if (secFetchSite === "cross-site") {
      throw new FrontendSecurityError("CSRF protection: Untrusted cross-site request rejected");
    }

    // Verify Origin matches Host
    if (origin && host) {
      let originUrl: URL;
      try {
        originUrl = new URL(origin);
      } catch {
        throw new FrontendSecurityError("CSRF protection: Malformed Origin header");
      }

      if (originUrl.host !== host) {
        // If origins differ, an anti-CSRF token is mandatory
        if (!csrfToken || !expectedCsrfToken || csrfToken !== expectedCsrfToken) {
          throw new FrontendSecurityError(
            `CSRF protection: Origin '${originUrl.host}' does not match Host '${host}' and missing valid anti-CSRF token`
          );
        }
      }
    }

    return true;
  }

  /**
   * FE-06: Prevent unsafe redirects and untrusted navigation targets.
   */
  static validateSafeRedirectUrl(targetUrl: string | undefined | null, allowedHost?: string): string {
    if (!targetUrl || typeof targetUrl !== "string") {
      return "/dashboard";
    }

    const clean = targetUrl.trim();

    // Reject scheme-relative or protocol-relative URLs (//evil.com)
    if (clean.startsWith("//") || clean.startsWith("/\\") || clean.startsWith("\\\\")) {
      return "/dashboard";
    }

    // Reject dangerous protocols
    if (/^(?:javascript|data|vbscript|file):/i.test(clean)) {
      return "/dashboard";
    }

    // Safe relative paths starting with single '/'
    if (clean.startsWith("/")) {
      return clean;
    }

    // If absolute URL, ensure it strictly matches the allowedHost
    try {
      const parsed = new URL(clean);
      if (allowedHost && parsed.host === allowedHost && (parsed.protocol === "https:" || parsed.protocol === "http:")) {
        return parsed.pathname + parsed.search;
      }
    } catch {
      // Fallback
    }

    return "/dashboard";
  }

  /**
   * FE-07: Prevent sensitive tokens from being exposed through URLs or browser history.
   */
  static sanitizeUrlForBrowserHistory(url: string): string {
    if (!url || typeof url !== "string") return "";

    try {
      // Support relative or absolute URLs
      const isRelative = url.startsWith("/");
      const dummyBase = "https://internal.local";
      const parsed = new URL(url, dummyBase);

      let modified = false;
      for (const [key] of parsed.searchParams.entries()) {
        if (SENSITIVE_URL_PARAMS.has(key.toLowerCase())) {
          parsed.searchParams.set(key, "[REDACTED]");
          modified = true;
        }
      }

      if (isRelative) {
        return parsed.pathname + (parsed.search ? parsed.search : "") + (parsed.hash ? parsed.hash : "");
      }
      return parsed.toString();
    } catch {
      return url;
    }
  }

  /**
   * FE-08: Prevent insecure cross-origin requests.
   */
  static validateCorsOrigin(
    requestOrigin: string | undefined,
    path: string,
    allowedOrigins: string[] = []
  ): { allowed: boolean; allowOriginHeader?: string; allowCredentials?: boolean } {
    // 1. Public embeddable endpoints allow wildcard without credentials
    if (path.startsWith("/api/widget") || path.startsWith("/widget-frame") || path.startsWith("/widget.js")) {
      return {
        allowed: true,
        allowOriginHeader: "*",
        allowCredentials: false,
      };
    }

    // 2. Private APIs never allow wildcard '*'
    if (!requestOrigin) {
      // Same-origin request without Origin header is allowed
      return { allowed: true };
    }

    const cleanOrigin = requestOrigin.trim().toLowerCase();

    // Check allowlist
    const isAllowed = allowedOrigins.some((ao) => ao.toLowerCase() === cleanOrigin);
    if (!isAllowed) {
      return { allowed: false };
    }

    return {
      allowed: true,
      allowOriginHeader: requestOrigin,
      allowCredentials: true,
    };
  }

  /**
   * FE-09: Prevent clickjacking where relevant security headers can mitigate it.
   */
  static getSecurityHeadersForRoute(pathname: string): Record<string, string> {
    // Public embeddable widget frame
    if (pathname.startsWith("/widget-frame")) {
      return {
        "Content-Security-Policy": "frame-ancestors *",
        "X-Content-Type-Options": "nosniff",
      };
    }

    // Internal application dashboard, settings, and auth pages enforce strict anti-clickjacking
    return {
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    };
  }

  /**
   * FE-10: Prevent local UI state from being treated as authoritative payment or booking state.
   */
  static assertAuthoritativeServerState(
    clientClaimedState: { status?: string; isPaid?: boolean; amount?: number },
    serverVerifiedState: { status?: string; isPaid?: boolean; amount?: number }
  ): void {
    if (clientClaimedState.isPaid === true && serverVerifiedState.isPaid !== true) {
      throw new FrontendSecurityError(
        "Payment verification failure: Client claimed payment success without server-side settlement confirmation"
      );
    }

    if (
      clientClaimedState.status === "confirmed" &&
      serverVerifiedState.status !== "confirmed" &&
      serverVerifiedState.status !== "scheduled"
    ) {
      throw new FrontendSecurityError(
        `Booking verification failure: Client claimed status 'confirmed' but server state is '${serverVerifiedState.status || "unknown"}'`
      );
    }

    if (
      clientClaimedState.amount !== undefined &&
      serverVerifiedState.amount !== undefined &&
      clientClaimedState.amount !== serverVerifiedState.amount
    ) {
      throw new FrontendSecurityError(
        `Financial state mismatch: Client claimed amount '${clientClaimedState.amount}' differs from server verified amount '${serverVerifiedState.amount}'`
      );
    }
  }

  /**
   * FE-11: Prevent browser retries from duplicating sensitive actions.
   */
  static assertActionIdempotency(
    actionKey: string,
    idempotencyKey: string | undefined,
    store: Map<string, { status: "in_flight" | "completed"; result?: any; createdAt: number }>
  ): void {
    if (!idempotencyKey || typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
      throw new FrontendSecurityError("Idempotency key required for state-changing browser submissions");
    }

    const cleanKey = idempotencyKey.trim();
    const existing = store.get(cleanKey);

    if (existing) {
      if (existing.status === "in_flight") {
        throw new FrontendSecurityError(
          "Duplicate submission rejected: An identical request is currently processing"
        );
      }
      if (existing.status === "completed") {
        throw new FrontendSecurityError(
          "Duplicate submission rejected: This action has already been successfully executed"
        );
      }
    }

    // Register in-flight execution
    store.set(cleanKey, {
      status: "in_flight",
      createdAt: Date.now(),
    });
  }

  /**
   * FE-12: Prevent stale client state from overriding newer server state.
   */
  static assertClientVersionFreshness(
    clientVersion: number | string,
    serverVersion: number | string
  ): void {
    const parsedClient = Number(clientVersion);
    const parsedServer = Number(serverVersion);

    if (isNaN(parsedClient) || isNaN(parsedServer)) {
      if (String(clientVersion) !== String(serverVersion)) {
        throw new FrontendSecurityError(
          `Concurrency conflict: Client version token '${clientVersion}' does not match current server version '${serverVersion}' (409 Conflict)`
        );
      }
      return;
    }

    if (parsedClient < parsedServer) {
      throw new FrontendSecurityError(
        `Concurrency conflict: Client version (${parsedClient}) is older than current server version (${parsedServer}). Reload required to prevent overwriting newer state (409 Conflict)`
      );
    }
  }

  /**
   * FE-13: Prevent production debug interfaces from exposing internal data.
   */
  static assertDebugRouteAccessAllowed(pathname: string, env: string = "production"): boolean {
    if (env === "production") {
      const debugPatterns = [
        /^\/api\/debug/i,
        /^\/debug/i,
        /^\/api\/sentry-example-api/i,
        /^\/_debug/i,
        /^\/internal\/metrics/i,
      ];

      for (const pattern of debugPatterns) {
        if (pattern.test(pathname)) {
          throw new FrontendSecurityError(
            `Access denied: Debug interface '${pathname}' is prohibited in production environment`
          );
        }
      }
    }

    return true;
  }
}
