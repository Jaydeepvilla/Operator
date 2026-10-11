# Operator — Security & Reliability Architecture Audit

## 1. Security Architecture & Threat Modeling

Operator is structured with defense-in-depth security across authentication, authorization, session persistence, input validation, and external webhook verification:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        OPERATOR SECURITY BOUNDARIES                    │
├────────────────────────────────────────────────────────────────────────┤
│  Browser / Client (HTTPS Only)                                        │
│    │                                                                   │
│    ▼  [Strict Cookie: httpOnly, SameSite=Lax, Secure]                  │
│  Session Middleware & Token Verification                               │
│    │                                                                   │
│    ▼  [SHA-256 Token Hash Match + Status Check ('active')]             │
│  Organization Access Assertion (requireOrganizationAccess)             │
│    │                                                                   │
│    ▼  [WHERE organization_id = $callerOrgId Invariant]                 │
│  Drizzle ORM Parameterized SQL Queries (PostgreSQL)                    │
│    │                                                                   │
│    ▼  [Zero Secret Leaks in Outbound Error Payloads]                   │
│  Encrypted Data Store & Redacted Audit Logs                            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication & Session Security Invariants

### 2.1 Cryptographic Session Tokens
- **Session Tokens**: Generated via `crypto.randomBytes(32).toString('hex')`.
- **Database Storage**: The raw token is hashed using SHA-256 before storage in the `sessions` table. The plain token exists exclusively in the client's `httpOnly` secure cookie.
- **Refresh Token Rotation**: Upon refresh, the old token is invalidated immediately. Attempting to replay a previously rotated refresh token invalidates the entire family of sessions for that user (`SESSION-05`).

### 2.2 Account Status Propagation
- Every authenticated request verifies that the linked `user.status` remains `"active"`.
- If an administrator marks a user as `"suspended"`, all active sessions for that user fail immediately without waiting for token expiration (`SESSION-02`).

### 2.3 Open Redirect Elimination
- All redirect parameters (`redirectTo`) are validated through `sanitizeRedirectUrl`:
  - Rejects protocol-relative URLs starting with `//`, `/\`, or `\/`.
  - Rejects absolute URLs containing `http://`, `https://`, or javascript schemes.
  - Allows only relative internal paths starting with a single `/`.

---

## 3. Multi-Tenant Authorization & IDOR Defense

### 3.1 Tenant Scoping Invariant
Every database read, update, and delete operation on tenant resources (appointments, services, staff, knowledge documents, customer contacts) must be scoped by the authenticated caller's `organizationId`:
```ts
// Enforced pattern across all server actions:
const membership = await requireOrganizationAccess(session.userId, orgId);
const records = await db.select().from(table).where(
  and(eq(table.id, resourceId), eq(table.organizationId, membership.orgId))
);
```

### 3.2 Role Hierarchy & Owner Protection
- Roles are strictly ordered: `owner` > `admin` > `member`.
- **Owner Immunity**: An administrator (`admin`) cannot suspend or delete the organization `owner` (`PRIV-03`, `PRIV-04`).

---

## 4. Webhook Security & Idempotency

### 4.1 Cryptographic HMAC Signatures
- **Stripe**: Incoming payment webhooks require valid `stripe-signature` headers verified using `stripe.webhooks.constructEvent()` with timing-safe HMAC SHA-256 comparison.
- **Twilio**: Telephony webhooks validate Twilio HMAC signatures using the configured authentication token.
- Invalid or forged signatures are immediately rejected with HTTP 400 (`GATE-12`, `GATE-13`).

### 4.2 Webhook Idempotency
- All processed webhook event IDs (`evt_*`) are recorded in an idempotency table with a timestamp.
- Duplicate event transmissions (e.g., Stripe retries) are recognized and ignored idempotently without repeating billing or appointment state transitions (`SUB-23`, `SUB-24`).

---

## 5. Reliability, Concurrency & Telephony Invariants

### 5.1 Telephony State Machine Transitions
Operator enforces strict finite-state transitions for synthetic voice telephony calls:
- `created` ➔ `ringing` ➔ `in-progress` ➔ `completed` (Valid)
- `in-progress` ➔ `failed` (Valid)
- `completed` ➔ `ringing` (Blocked — terminal state)
- `failed` ➔ `in-progress` (Blocked — terminal state)

### 5.2 Error Sanitization & Secret Redaction
- In production, unhandled exceptions caught by server actions or API handlers are sanitized through `formatUserErrorMessage()` before reaching the client:
  - Database connection strings, passwords, Stripe secret keys, and file paths are stripped.
  - Safe user-friendly messages are returned (`GATE-14`, `GATE-15`).

### 5.3 Subscription Grace Periods & Reversibility
- If an automatic recurring billing charge fails:
  1. Subscription transitions to `past_due`.
  2. A 5-day grace period is initiated (`SUB-21`).
  3. Tenant retains read/write access while reminder notifications are dispatched.
  4. Upon successful payment recovery, the subscription is restored to `active` (`SUB-22`).
- If a tenant requests cancellation:
  1. Status updates to `canceling` with `cancelAtPeriodEnd: true` (`SUB-17`).
  2. Service remains operational through the end of the billing period.
  3. The tenant can revoke cancellation at any time before the period ends, restoring `active` status seamlessly (`SUB-19`).
