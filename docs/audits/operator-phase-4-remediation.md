# Operator Phase 4 — Security Vulnerability Remediation Guide

**Date:** 2026-10-26  
**Auditor:** Principal Application Security Engineer, Product Security Auditor, and Secure Code Reviewer  
**Status:** Completed & Verified via Automated Regression Suite  

---

## 1. Overview of Remediated Vulnerabilities

| Finding ID | Vulnerability Class | Severity | Root Cause | Remediated Files | Regression Test |
|---|---|---|---|---|---|
| **SEC-001** | Missing / Fail-Open Access Control | High | Cron handlers checked `if (cronSecret && authHeader !== ...)` allowing open execution if `CRON_SECRET` was unconfigured | `src/app/api/cron/learning-engine/route.ts`, `src/app/api/cron/process-queue/route.ts` | `SEC-001` in `tests/security-audit.spec.ts` |
| **SEC-002** | Incorrect HTTP Status & Content Type Semantics | Medium | `src/proxy.ts` redirected unauthenticated API calls to HTML `/sign-in` via HTTP 307 instead of returning HTTP 401 JSON | `src/proxy.ts` | `SEC-002` in `tests/security-audit.spec.ts` |
| **SEC-003** | Insecure Transport Configuration Fallback | Medium | `isSecureCookie()` in `src/lib/auth/session.ts` returned `false` in production if `APP_URL` lacked `https://` | `src/lib/auth/session.ts` | Code inspection & production configuration test |
| **SEC-004** | Weakened Authentication Semantics | Medium | Phase 2B suppressed unauthenticated 401 on `/api/auth/me` to 200 `{user:null}` to silence console warnings on SSR guest pages | `src/app/api/auth/me/route.ts`, `src/lib/auth/client.tsx` | `SEC-004` in `tests/security-audit.spec.ts` |
| **SEC-005** | Cryptographic Malleability (Unauthenticated CBC) | Low | Impersonation tokens used `aes-256-cbc` without an HMAC auth tag, vulnerable to bit-flipping | `src/server/services/agency/impersonation.ts` | `SEC-005` in `tests/security-audit.spec.ts` |
| **SEC-006** | Timing Attack / Non-Constant-Time Signature Check | Low | Twilio webhook signature verification compared digests using `===` instead of `crypto.timingSafeEqual` | `src/server/utils/twilio-signature.ts` | `SEC-006` in `tests/security-audit.spec.ts` |

---

## 2. Detailed Remediation Diffs & Fix Rationale

### Fix SEC-001: Enforce Fail-Closed Cron Authentication
- **Files:** `src/app/api/cron/learning-engine/route.ts`, `src/app/api/cron/process-queue/route.ts`
- **Rationale:** If `CRON_SECRET` is not set on the server, the endpoint must fail closed by returning HTTP 500 (`Cron authorization not configured on server`), never execute the underlying batch tasks, and require a valid Bearer token matching `CRON_SECRET` returning HTTP 401 on mismatch.

```diff
-    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
+    if (!cronSecret) {
+      console.error("[LearningEngine Cron] CRON_SECRET is not configured");
+      return NextResponse.json(
+        { error: "Cron authorization not configured on server" },
+        { status: 500 }
+      );
+    }
+    if (authHeader !== `Bearer ${cronSecret}`) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
     }
```

### Fix SEC-002: Return HTTP 401 JSON for Protected API Calls
- **File:** `src/proxy.ts`
- **Rationale:** API clients (such as mobile apps, external integrations, or AJAX calls) expect JSON error responses with standard status codes. Redirecting API requests with HTTP 307 to an HTML web page causes unexpected payload parsing errors and masks authentication failures.

```diff
   // ── Protected routes ─────────────────────────────────────────────────
   if (!sessionToken) {
+    if (pathname.startsWith("/api/")) {
+      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
+    }
     const signInUrl = new URL("/sign-in", request.url);
```

### Fix SEC-003: Default to Secure Cookies Across Production
- **File:** `src/lib/auth/session.ts`
- **Rationale:** In production environments, session tokens must always be transmitted over HTTPS with `Secure; HttpOnly; SameSite=Lax`.

```diff
 export function isSecureCookie(): boolean {
   if (process.env.NODE_ENV !== "production") return false;
   const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").toLowerCase();
-  if (appUrl.startsWith("https://")) {
-    return true;
-  }
-  return false;
+  if (appUrl.startsWith("http://localhost") || appUrl.startsWith("http://127.0.0.1")) {
+    return false;
+  }
+  return true;
 }
```

### Fix SEC-004: Clean SSR Guest Auth Initialization & Standard 401 Status
- **Files:** `src/lib/auth/client.tsx`, `src/app/api/auth/me/route.ts`
- **Rationale:** In `RootLayout` (`src/app/layout.tsx`), the server already resolves `currentUser()` during SSR and passes `initialUser` (which is `null` for unauthenticated visitors). `AuthProvider` previously checked `if (!initialUser)` on mount and fired a redundant client-side `fetch("/api/auth/me")`. By checking `if (initialUser === undefined)` and initializing `isLoading = (initialUser === undefined)`, unauthenticated guest visits do not make redundant client-side calls. Consequently, `/api/auth/me` safely returns standard `HTTP 401 Unauthorized` without generating unwanted console warnings.

```diff
-  initialUser = null,
+  initialUser,
 }: {
   children: React.ReactNode;
   initialUser?: UserType | null;
 }) {
-  const [user, setUser] = React.useState<UserType | null>(initialUser);
-  const [isLoading, setIsLoading] = React.useState(initialUser === null);
+  const [user, setUser] = React.useState<UserType | null>(initialUser ?? null);
+  const [isLoading, setIsLoading] = React.useState(initialUser === undefined);
...
   React.useEffect(() => {
-    if (!initialUser) {
+    if (initialUser === undefined) {
       refresh();
     } else {
       setIsLoading(false);
     }
   }, [initialUser, refresh]);
```

### Fix SEC-005: Authenticated AES-256-GCM for Impersonation Tokens
- **File:** `src/server/services/agency/impersonation.ts`
- **Rationale:** Standard CBC mode is vulnerable to padding oracle and bit-flipping attacks because it lacks ciphertext integrity authentication. Migrated to `aes-256-gcm` using a 12-byte random IV and a 16-byte authentication tag in format `iv:authTag:ciphertext`. Decryption verifies the tag before parsing, immediately rejecting any tampered ciphertext.

```diff
-      const iv = crypto.randomBytes(IV_LENGTH);
-      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
+      const iv = crypto.randomBytes(GCM_IV_LENGTH);
+      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
       let encrypted = cipher.update(JSON.stringify(payload), "utf8", "hex");
       encrypted += cipher.final("hex");
-      const token = `${iv.toString("hex")}:${encrypted}`;
+      const authTag = cipher.getAuthTag();
+      const token = `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
```

### Fix SEC-006: Constant-Time Comparison for Twilio Webhook Signatures
- **File:** `src/server/utils/twilio-signature.ts`
- **Rationale:** Standard string comparison (`===`) terminates at the first differing byte, creating microsecond-level timing differences that can allow attackers to incrementally brute-force HMAC digests. Upgraded to `crypto.timingSafeEqual`.

```diff
-  return hash === options.signature;
+  try {
+    const a = Buffer.from(hash, "utf-8");
+    const b = Buffer.from(options.signature, "utf-8");
+    if (a.length !== b.length) return false;
+    return crypto.timingSafeEqual(a, b);
+  } catch {
+    return false;
+  }
```

---

## 3. Regression Verification & Audit Commands

The entire test suite was executed against the running Next.js application:

```bash
# 1. Type safety check across the codebase
npx tsc --noEmit
# Result: 0 errors

# 2. Production build verification
npm run build
# Result: Next.js 16.2.9 compiled successfully in 15.6s (103 routes)

# 3. Dedicated Security Audit & Regression Suite
npx playwright test tests/security-audit.spec.ts
# Result: 6 passed (100% Pass in 8.9s)

# 4. Operator Doctor Enterprise Verification
npm run operator:doctor -- --summary
# Result: Security: PASS, Routing: PASS, Overall Health Score: 79%
```

---

## 4. Blocked / External Verification Items

- **Physical Carrier PSTN Line Validation:** Marked **BLOCKED**. Physical phone calls over international PSTN trunks require carrier accounts and physical handsets. Outbound TwiML generation and HMAC signature validation have been cryptographically verified in code.
