import { test, expect } from '@playwright/test';
import { redactSensitiveData, sanitizeErrorMessage, maskPhoneNumber, maskEmail } from '../src/lib/observability/redaction';
import { sentry } from '../src/lib/observability/sentry';
import { logger } from '../src/lib/logger';

test.describe('Operator Phase 5 — Observability, Error Monitoring & Privacy Suite', () => {

  test('OBS-001: Data Redaction Engine Masks Sensitive Keys, Tokens, and PII', async () => {
    const rawPayload = {
      user: {
        id: "usr_12345",
        name: "Alice Smith",
        password: "SuperSecretPassword123!",
        sessionToken: "sess_abcdef0123456789",
        refreshToken: "ref_9876543210fedcba",
        phoneNumber: "+1 (555) 234-5678",
        customerEmail: "alice.smith@example.com",
      },
      payment: {
        creditCard: "4111111111111234",
        cvv: "789",
        apiKey: "sk_live_abcdef1234567890",
        webhookSecret: "whsec_live_9876543210",
      },
      aiContext: {
        systemPrompt: "You are an assistant. Secret internal instructions here.",
        transcript: "Customer: Here is my secret medical condition...",
      },
      safeMetadata: {
        plan: "growth",
        durationMs: 420,
        status: "success",
      },
    };

    const redacted = redactSensitiveData(rawPayload);

    // 1. Critical secrets must be completely redacted
    expect(redacted.user.password).toBe("[REDACTED]");
    expect(redacted.user.sessionToken).toBe("[REDACTED]");
    expect(redacted.user.refreshToken).toBe("[REDACTED]");
    expect(redacted.payment.creditCard).toBe("[REDACTED]");
    expect(redacted.payment.cvv).toBe("[REDACTED]");
    expect(redacted.payment.apiKey).toBe("[REDACTED]");
    expect(redacted.payment.webhookSecret).toBe("[REDACTED]");

    // 2. Personal contact data must be masked, not stored in plaintext
    expect(redacted.user.phoneNumber).toBe("***-***-5678");
    expect(redacted.user.customerEmail).toBe("a***h@example.com");

    // 3. Raw prompt / transcript content must be truncated/pruned
    expect(redacted.aiContext.systemPrompt).toContain("[TRUNCATED_CONTENT");
    expect(redacted.aiContext.transcript).toContain("[TRUNCATED_CONTENT");

    // 4. Safe business metadata must be preserved
    expect(redacted.safeMetadata.plan).toBe("growth");
    expect(redacted.safeMetadata.durationMs).toBe(420);
    expect(redacted.safeMetadata.status).toBe("success");
  });

  test('OBS-002: Error Message Sanitizer Strips Connection URLs and Auth Tokens', async () => {
    // Database URL leakage
    const dbError = "Connection failed: postgres://operator_user:super_secret_db_pass@aws-0-us-west-1.pooler.supabase.com:6543/postgres";
    const sanitizedDb = sanitizeErrorMessage(dbError);
    expect(sanitizedDb).not.toContain("super_secret_db_pass");
    expect(sanitizedDb).toContain("postgres://[REDACTED_USER]:[REDACTED_PASSWORD]@[REDACTED_HOST]");

    // Bearer token leakage
    const bearerError = "Upstream API rejected header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.signature";
    const sanitizedBearer = sanitizeErrorMessage(bearerError);
    expect(sanitizedBearer).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    expect(sanitizedBearer).toContain("Bearer [REDACTED_TOKEN]");

    // Stripe key leakage
    const stripeError = "Invalid API key: sk_live_51ABCDEF1234567890XYZ provided.";
    const sanitizedStripe = sanitizeErrorMessage(stripeError);
    expect(sanitizedStripe).not.toContain("51ABCDEF1234567890XYZ");
    expect(sanitizedStripe).toContain("sk_live_[REDACTED]");
  });

  test('OBS-003: Structured Logger Automatically Scrubs Data Payloads and Emits Breadcrumbs', async () => {
    sentry.clearBreadcrumbs();

    // Call logger with sensitive data
    logger.info("User checkout attempted", {
      context: "CheckoutWorkflow",
      correlationId: "req_test_12345",
      data: {
        plan: "pro",
        token: "tok_sensitive_session_abc",
        customerPhone: "+15559876543",
      },
    });

    const breadcrumbs = sentry.getRecentBreadcrumbs();
    expect(breadcrumbs.length).toBeGreaterThan(0);
    const lastBc = breadcrumbs[breadcrumbs.length - 1];

    expect(lastBc.category).toBe("CheckoutWorkflow");
    expect(lastBc.level).toBe("info");
    expect(lastBc.data?.token).toBe("[REDACTED]");
    expect(lastBc.data?.customerPhone).toBe("***-***-6543");
    expect(lastBc.data?.plan).toBe("pro");
  });

  test('OBS-004: Sentry Bridge Operates Resiliently in Unconfigured / Local Mode', async () => {
    sentry.clearBreadcrumbs();

    const testError = new Error("Simulated transient network timeout");
    const errorId = sentry.captureException(testError, {
      tags: { workflow: "appointment_sync" },
      extra: { attempt: 2, secretKey: "secret_12345" },
    });

    // Must return a valid error identifier (real Sentry 32-char UUID or fallback sentry_ id)
    expect(errorId).toMatch(/^([a-f0-9]{32}|sentry_)/);

    // Must record an in-memory breadcrumb with sanitized extra data
    const breadcrumbs = sentry.getRecentBreadcrumbs();
    const exceptionBc = breadcrumbs.find((b) => b.category === "exception");
    expect(exceptionBc).toBeDefined();
    expect(exceptionBc?.message).toBe("Simulated transient network timeout");
    expect(exceptionBc?.data?.secretKey).toBe("[REDACTED]");
    expect(exceptionBc?.data?.attempt).toBe(2);
  });

  test('OBS-005: Sentry beforeSend Scrubber Cleans Event Payloads', async () => {
    const rawSentryEvent = {
      event_id: "evt_12345",
      exception: {
        values: [
          {
            type: "DatabaseError",
            value: "FATAL: password authentication failed for user operator: postgres://operator:super_secret@db.internal:5432/operator",
          },
        ],
      },
      request: {
        headers: {
          authorization: "Bearer secret_jwt_token_12345",
          "content-type": "application/json",
          cookie: "session_token=secret_cookie_val; refresh_token=secret_refresh_val",
        },
        cookies: "session_token=secret_cookie_val",
        data: {
          cardNumber: "4111222233334444",
          amount: 4900,
        },
      },
      user: {
        id: "usr_999",
        email: "private.customer@example.com",
        ip_address: "192.168.1.100",
        username: "private_john",
      },
      extra: {
        apiKey: "sk_live_xyz",
        bookingId: "bk_12345",
      },
    };

    const scrubbed = sentry.beforeSendScrubber(rawSentryEvent);

    // 1. Exception value sanitized
    expect(scrubbed.exception.values[0].value).not.toContain("super_secret");
    expect(scrubbed.exception.values[0].value).toContain("[REDACTED_PASSWORD]");

    // 2. Request headers and cookies redacted
    expect(scrubbed.request.headers.authorization).toBe("[REDACTED]");
    expect(scrubbed.request.headers["content-type"]).toBe("application/json");
    expect(scrubbed.request.cookies).toBe("[REDACTED_COOKIES]");
    expect(scrubbed.request.data.cardNumber).toBe("[REDACTED]");
    expect(scrubbed.request.data.amount).toBe(4900);

    // 3. User object stripped of IP, email, username
    expect(scrubbed.user.id).toBe("usr_999");
    expect(scrubbed.user.ip_address).toBeUndefined();
    expect(scrubbed.user.email).toBeUndefined();
    expect(scrubbed.user.username).toBeUndefined();

    // 4. Extra data redacted
    expect(scrubbed.extra.apiKey).toBe("[REDACTED]");
    expect(scrubbed.extra.bookingId).toBe("bk_12345");
  });

  test('OBS-006: Edge Proxy Propagates x-request-id Correlation Header', async ({ playwright }) => {
    const anonContext = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      storageState: { cookies: [], origins: [] },
    });

    // 1. Client without x-request-id receives generated correlation ID
    const resHealth = await anonContext.get('/api/health');
    const genReqId = resHealth.headers()['x-request-id'];
    expect(genReqId).toBeDefined();
    expect(genReqId).toMatch(/^req_/);

    // 2. Client providing custom x-request-id has it preserved and echoed
    const customId = `trace_${Date.now()}_abc`;
    const resEcho = await anonContext.get('/api/health', {
      headers: { 'x-request-id': customId },
    });
    expect(resEcho.headers()['x-request-id']).toBe(customId);

    // 3. Protected API 401 response includes x-request-id
    const resAuth = await anonContext.get('/api/dashboard/summary', {
      maxRedirects: 0,
      headers: { 'x-request-id': customId },
    });
    expect(resAuth.status()).toBe(401);
    expect(resAuth.headers()['x-request-id']).toBe(customId);

    await anonContext.dispose();
  });

  test('OBS-007: Health Endpoint Does Not Expose Database Credentials or Stack Traces', async ({ playwright }) => {
    const anonContext = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      storageState: { cookies: [], origins: [] },
    });

    const res = await anonContext.get('/api/health');
    expect([200, 503]).toContain(res.status());
    const json = await res.json();

    // Must have standard health fields
    expect(json).toHaveProperty('status');
    expect(json).toHaveProperty('checks');
    expect(json.checks).toHaveProperty('database');

    // Must NOT contain sensitive credentials or internal stack traces
    const jsonStr = JSON.stringify(json);
    expect(jsonStr).not.toContain('postgres://');
    expect(jsonStr).not.toContain('password');
    expect(jsonStr).not.toContain('at async');
    expect(jsonStr).not.toContain('node_modules');

    await anonContext.dispose();
  });

});
