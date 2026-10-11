# Operator — Mock & Static Data Register

**Document Version:** 1.0.0  
**Enforcement Tool:** Operator Doctor `verify-no-fake-data` (`scripts/doctor/rules/verify-no-fake-data.ts`)  
**Scope:** Repository-wide inspection covering frontend, backend, server actions, API routes, database services, and analytics.

---

## 1. Classification Categories

- **Category A (Production fake data — REMOVE):** Fabricated records, mock identifiers, and fake success responses in operational code.
- **Category B (Production hardcoded business logic — FIX):** Hardcoded plan limits, arbitrary formulas, or static metrics replacing real calculations.
- **Category C (Legitimate constants — PRESERVE):** Design tokens, navigation paths, schema enums, and system boundaries.
- **Category D (Test fixtures — ISOLATE):** Deterministic mock data used exclusively in isolated test runners (`scripts/`, `tests/`).
- **Category E (Demo and preview data — EXPLICITLY ISOLATE):** Intentional sandbox/playground components with explicit non-production indicators.
- **Category F (Unavailable real data — SHOW AN HONEST STATE):** Honest zero, empty, or unconfigured states when third-party services are missing.

---

## 2. Complete Inventory & Resolution Register

| # | File & Lines | Category | Production Impact | Remediated Action | Verification Evidence |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **1** | `src/server/services/billing/financial-metrics.ts`<br>Lines 143–154 | **A** | Fabricated 6-month historical MRR and revenue using `Math.sin(i) * 0.05` and arbitrary factor decay. | **REMOVED**: Replaced with exact database calendar month aggregation across `payments`, `refunds`, and `subscriptions`. | `scripts/test-no-fake-data-rule.ts` (Test #2 & Live scan pass) |
| **2** | `src/components/forms/phone-numbers-client.tsx`<br>Lines 50–55, 163–180 | **A** | Hardcoded array of 5 fake `+1 (555) 819-2090` phone numbers presented as live claimable numbers. | **REMOVED**: Replaced with direct E.164 phone registration input with international regex validation. | Manual input test; `scripts/test-no-fake-data-rule.ts` |
| **3** | `src/components/forms/voice-cockpit-client.tsx`<br>Lines 177–183, 194, 208, 222, 236 | **A** | Displayed hardcoded `148` calls, `78.4%` conversion, `2m 14s` duration, `4.8/5` CSAT; simulated test dialing via `setTimeout`. | **REMOVED & FIXED**: Computed KPI cards dynamically from `sessions` and `initialAnalytics`; wired dialing to real `initiateOutboundCallAction`. | `scripts/test-no-fake-data-rule.ts`; TypeScript verification passed |
| **4** | `src/components/dashboard/widgets/NextBestActionWidget.tsx`<br>Lines 29–31, 66–83 | **A** | Displayed fabricated `+12%` projected uplift and static `94%` confidence hardcoded from string `"High"`. | **REMOVED**: Replaced with real engine confidence score (`action.confidence`) and estimated duration (`action.estimatedTimeMinutes`). | `scripts/test-no-fake-data-rule.ts`; zero static uplift values remain |
| **5** | `src/server/actions/agency.ts`<br>Lines 99–102 | **A** | `verifyDomainSslAction` unconditionally marked domain SSL status as `"active"` with comment `"Here we simulate success"`. | **REMOVED & FIXED**: Integrated real DNS resolution (`dns.promises.resolveCname` / `dns.promises.lookup`); fails to `"failed"` if record is missing. | DNS resolution test in `agency.ts`; fails closed if unconfigured |
| **6** | `src/server/services/notification.ts`<br>Lines 65–68, 119–122 | **A** | Returned `true` when SMTP, Resend, Vonage, or Sinch credentials were missing, claiming message was delivered. | **FIXED**: Log warning and return `false`, allowing callers to know delivery did not occur. | Code inspection; `scripts/test-no-fake-data-rule.ts` |
| **7** | `src/server/services/omnichannel/resend.ts`<br>Lines 94–99 | **A** | Returned `{ success: true, externalId: "email-sim-" + ... }` when email API keys were missing. | **FIXED**: Return `{ success: false, errorCode: "EMAIL_PROVIDER_NOT_CONFIGURED" }`. | `scripts/test-no-fake-data-rule.ts` (Test #3 & Live scan pass) |
| **8** | `src/server/services/omnichannel/sinch.ts`<br>Lines 30–37 | **A** | Returned `{ success: true, externalId: "sinch-sim-" + ... }` when Sinch plan credentials were missing. | **FIXED**: Return `{ success: false, errorCode: "SINCH_PROVIDER_NOT_CONFIGURED" }`. | `scripts/test-no-fake-data-rule.ts` pass |
| **9** | `src/server/services/omnichannel/vonage.ts`<br>Lines 30–37 | **A** | Returned `{ success: true, externalId: "vonage-sim-" + ... }` when Vonage API credentials were missing. | **FIXED**: Return `{ success: false, errorCode: "VONAGE_PROVIDER_NOT_CONFIGURED" }`. | `scripts/test-no-fake-data-rule.ts` pass |
| **10** | `src/components/forms/settings-form.tsx`<br>Lines 58–63 | **A** | `onSubmit` performed `await new Promise(r => setTimeout(r, 1000))` instead of persisting changes to the database. | **FIXED**: Wired directly to real `updateOrganizationSettingsAction` in `src/server/actions/settings.ts` persisting to Drizzle `organizations`. | Typecheck passed; settings persist in DB |
| **11** | `src/app/(dashboard)/conversations/page.tsx`<br>Lines 403, 413 | **A** | Form input labeled with placeholder `Type a message to simulate customer response...` and button `Simulate`. | **FIXED**: Relabeled to `Type a message reply...` and `Send Reply` reflecting real `sendMessageAction` dispatch. | File inspection & typecheck passed |
| **12** | `src/app/(dashboard)/kb/kb-client.tsx`<br>Lines 290, 561–571 | **A** | `[SIMULATED EXTRACTION: ...]` in file preview and dead simulated `handleSaveSettings` with `setTimeout(800)`. | **FIXED**: Replaced file preview with honest `[QUEUED FOR EXTRACTION: ...]` notice; wired `handleSaveSettings` to persist storage provider preferences. | Typecheck passed; 0 errors across file |
| **13** | `src/lib/razorpay.ts`<br>Line 41 | **B** | Non-timing-safe signature validation using direct string comparison `===`. | **FIXED**: Implemented constant-time `crypto.timingSafeEqual` comparison over byte buffers. | Code verification & unit test |
| **14** | `src/server/services/billing/providers/razorpay.ts`<br>Lines 75–80, 348–353 | **B** | Stubbed `capturePayment` returning hardcoded amount `100`; `verifyWebhookSignature` returning `true` when secret missing. | **FIXED**: Implemented authenticated `POST /v1/payments/:id/capture`; enforce non-empty secret with timing-safe HMAC validation. | Code verification & unit test |
| **15** | `src/server/services/billing/config.ts`<br>Lines 172, 262–325 | **B** | Missing Razorpay environment handler in `getPaymentProviderConfig`; default provider set to `stripe`. | **FIXED**: Added `pid === "razorpay"` handler; set default provider to `"razorpay"` and currency to `"INR"`. | `getPaymentProviderConfig("razorpay")` verification |
| **16** | `src/server/actions/billing.ts`<br>Lines 41, 78, 134, 414 | **B** | Hardcoded `getPaymentProviderStatus("stripe")` and default provider `stripe`. | **FIXED**: Changed default provider to `"razorpay"`, default currency to `"INR"`. | `scripts/test-dynamic-subscription-engine.ts` pass |
| **17** | `src/lib/constants/routes.ts` | **C** | App route identifiers and canonical paths (`APP_ROUTES`). | **PRESERVED**: Legitimate routing constants and path maps. | Allowlisted in `verify-no-fake-data.ts` |
| **18** | `src/lib/constants/templates.ts` | **C** | Default business hours structure and industry prompt templates. | **PRESERVED**: Legitimate configuration defaults for new tenant initialization. | Allowlisted in `verify-no-fake-data.ts` |
| **19** | `scripts/seed/` & `scripts/fixtures/` | **D** | Test seed fixtures used for automated security testing and QA verification. | **ISOLATED**: Strictly confined to `scripts/` directory; production code cannot import them. | Enforced by `verify-no-fake-data` rule |
| **20** | `src/components/marketing/visualizations/product-simulation.tsx` | **E** | Interactive front-page marketing visual demonstrating AI receptionist capabilities. | **ISOLATED**: Confined to public landing page; explicitly allowlisted with documentation. | Documented in `ZERO_FAKE_DATA_ALLOWLIST` |
| **21** | `src/components/confidence-bridge/` | **E** | Admin prompt testing playground with `scenario.simulatedUserInput`. | **ISOLATED**: Confined to admin playground; explicitly separated from production receptionist channels. | Documented in `ZERO_FAKE_DATA_ALLOWLIST` |
| **22** | `src/server/services/orchestrator.ts`<br>`evaluateSimulation()` | **E** | In-memory evaluation pipeline (`isSimulated: true`) for admin prompt testing without creating database records. | **ISOLATED**: Restricted to interactive playground calls; never executes on production webhook or telephony paths. | Documented in `ZERO_FAKE_DATA_ALLOWLIST` |

---

## 3. Enforcement Guarantee

The Doctor rule `verifyNoFakeData` in `scripts/doctor/rules/verify-no-fake-data.ts` runs automatically during `npm run operator:doctor` and CI validation. Any addition of `Math.sin/cos` metric simulations, `SIMULATED_AVAILABLE_NUMBERS`, `email-sim-` fake IDs, or imports from `__mocks__` into `src/` triggers an immediate exit failure.
