import { test, expect } from '@playwright/test';
import crypto from 'crypto';
import { agencyImpersonation } from '../src/server/services/agency/impersonation';
import { verifyTwilioSignature } from '../src/server/utils/twilio-signature';
import { validateSafeUrl } from '../src/server/services/crawler/ssrf';

test.describe('Operator Phase 4 — Security Audit & Vulnerability Remediation Suite', () => {

  test('SEC-001: Cron Endpoints Enforce Strict Fail-Closed Authentication', async ({ playwright }) => {
    // Unauthenticated context
    const anonContext = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      storageState: { cookies: [], origins: [] },
    });

    // 1. Learning Engine Cron
    const resEngineNoAuth = await anonContext.post('/api/cron/learning-engine');
    expect([401, 500]).toContain(resEngineNoAuth.status());

    const resEngineBadAuth = await anonContext.post('/api/cron/learning-engine', {
      headers: { Authorization: 'Bearer forged-attacker-token-12345' },
    });
    expect([401, 500]).toContain(resEngineBadAuth.status());

    // 2. Notification Queue Processor Cron
    const resQueueNoAuth = await anonContext.get('/api/cron/process-queue');
    expect([401, 500]).toContain(resQueueNoAuth.status());

    const resQueueBadAuth = await anonContext.get('/api/cron/process-queue', {
      headers: { Authorization: 'Bearer forged-attacker-token-12345' },
    });
    expect([401, 500]).toContain(resQueueBadAuth.status());

    // 3. Worker Jobs Cron
    const resJobsNoAuth = await anonContext.get('/api/cron/jobs');
    expect([401, 500]).toContain(resJobsNoAuth.status());

    const resJobsBadAuth = await anonContext.get('/api/cron/jobs', {
      headers: { Authorization: 'Bearer forged-attacker-token-12345' },
    });
    expect([401, 500]).toContain(resJobsBadAuth.status());

    await anonContext.dispose();
  });

  test('SEC-002: Protected API Routes Return HTTP 401 JSON (Not 307 HTML Redirect)', async ({ playwright }) => {
    // Unauthenticated request context (no session cookies)
    const anonContext = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      storageState: { cookies: [], origins: [] },
    });

    const resOrder = await anonContext.post('/api/create-order', {
      maxRedirects: 0,
      headers: { 'Content-Type': 'application/json' },
      data: { plan: 'growth' },
    });
    expect(resOrder.status()).toBe(401);
    const orderJson = await resOrder.json().catch(() => null);
    expect(orderJson).toHaveProperty('error', 'Unauthorized');

    const resDashboard = await anonContext.get('/api/dashboard/summary', {
      maxRedirects: 0,
    });
    expect(resDashboard.status()).toBe(401);
    const dashJson = await resDashboard.json().catch(() => null);
    expect(dashJson).toHaveProperty('error', 'Unauthorized');

    await anonContext.dispose();
  });

  test('SEC-004: /api/auth/me Preserves Strict 401 Semantics When Unauthenticated', async ({ playwright }) => {
    // Unauthenticated request context
    const anonContext = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      storageState: { cookies: [], origins: [] },
    });

    const response = await anonContext.get('/api/auth/me');
    expect(response.status()).toBe(401);
    const json = await response.json();
    expect(json).toHaveProperty('error', 'Unauthorized');

    await anonContext.dispose();
  });

  test('SEC-005: Agency Impersonation Uses Authenticated AES-256-GCM and Rejects Tampering', async () => {
    const testAgencyId = crypto.randomUUID();
    const testActorUserId = crypto.randomUUID();
    const testOrgId = crypto.randomUUID();

    // 1. Generate valid token
    const token = await agencyImpersonation.generateImpersonationToken({
      agencyId: testAgencyId,
      actorUserId: testActorUserId,
      targetOrganizationId: testOrgId,
    });

    // Verify 3-part GCM structure: iv:authTag:ciphertext
    const parts = token.split(':');
    expect(parts.length).toBe(3);
    const [ivHex, authTagHex, cipherHex] = parts;
    expect(ivHex.length).toBe(24); // 12 bytes = 24 hex chars
    expect(authTagHex.length).toBe(32); // 16 bytes = 32 hex chars
    expect(cipherHex.length).toBeGreaterThan(0);

    // 2. Successful verification of untampered token
    const payload = agencyImpersonation.verifyImpersonationToken(token);
    expect(payload.agencyId).toBe(testAgencyId);
    expect(payload.actorUserId).toBe(testActorUserId);
    expect(payload.targetOrganizationId).toBe(testOrgId);
    expect(payload.expiresAt).toBeGreaterThan(Date.now());

    // 3. Cryptographic tamper rejection: Flipping a bit in ciphertext throws verification failure
    const tamperedCipher = cipherHex.slice(0, -2) + (cipherHex.slice(-2) === 'aa' ? 'bb' : 'aa');
    const tamperedToken = `${ivHex}:${authTagHex}:${tamperedCipher}`;
    expect(() => agencyImpersonation.verifyImpersonationToken(tamperedToken)).toThrow();

    // 4. Cryptographic tamper rejection: Tampering with auth tag throws verification failure
    const tamperedAuthTag = authTagHex.slice(0, -2) + (authTagHex.slice(-2) === '11' ? '22' : '11');
    const tamperedTagToken = `${ivHex}:${tamperedAuthTag}:${cipherHex}`;
    expect(() => agencyImpersonation.verifyImpersonationToken(tamperedTagToken)).toThrow();
  });

  test('SEC-006: Constant-Time Twilio Signature Verification & Rejection', async () => {
    const fakeAuthToken = 'mock_twilio_auth_token_9876543210';
    const fakeUrl = 'https://app.operator.ai/api/voice/twiml';
    const fakeParams = { CallSid: 'CA1234567890abcdef', From: '+15551234567' };

    // 1. Calculate genuine signature
    const sortedKeys = Object.keys(fakeParams).sort();
    let paramString = '';
    for (const key of sortedKeys) {
      paramString += key + (fakeParams as any)[key];
    }
    const genuineSignature = crypto
      .createHmac('sha1', fakeAuthToken)
      .update(Buffer.from(fakeUrl + paramString, 'utf-8'))
      .digest('base64');

    // Genuine signature must pass
    const isValid = verifyTwilioSignature({
      authToken: fakeAuthToken,
      signature: genuineSignature,
      url: fakeUrl,
      params: fakeParams,
    });
    expect(isValid).toBe(true);

    // Forged signature must fail
    const isForgedValid = verifyTwilioSignature({
      authToken: fakeAuthToken,
      signature: 'invalid_forged_signature_value==',
      url: fakeUrl,
      params: fakeParams,
    });
    expect(isForgedValid).toBe(false);

    // Empty signature must fail
    expect(
      verifyTwilioSignature({
        authToken: fakeAuthToken,
        signature: '',
        url: fakeUrl,
        params: fakeParams,
      })
    ).toBe(false);
  });

  test('SEC-007: Defense-in-Depth SSRF Validator Rejects Private and Cloud Metadata Destinations', async () => {
    // 1. Cloud metadata endpoints
    const cloudMeta = await validateSafeUrl('http://169.254.169.254/latest/meta-data/');
    expect(cloudMeta.valid).toBe(false);
    expect(cloudMeta.error).toContain('forbidden');

    // 2. Dangerous protocols
    const fileProto = await validateSafeUrl('file:///etc/passwd');
    expect(fileProto.valid).toBe(false);
    expect(fileProto.error).toContain('Only HTTP and HTTPS');

    const gopherProto = await validateSafeUrl('gopher://evil.com/');
    expect(gopherProto.valid).toBe(false);
    expect(gopherProto.error).toContain('Only HTTP and HTTPS');

    // 3. Current network wildcard
    const zeroIp = await validateSafeUrl('http://0.0.0.0:8000');
    expect(zeroIp.valid).toBe(false);
    expect(zeroIp.error).toContain('forbidden');
  });

});
