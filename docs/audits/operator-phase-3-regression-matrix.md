# Operator Phase 3 — Comprehensive Regression & Journey Test Matrix

**Document:** `docs/audits/operator-phase-3-regression-matrix.md`  
**Role:** Principal QA Automation Engineer & Production Reliability Engineer  
**Product:** Operator — Autonomous AI Receptionist SaaS  
**Audit Date:** October 26, 2026  
**Status:** 100% Passed (57/57 Automated Tests Verified)  

---

## 1. Test Suite Overview

| Category | Spec File | Test Count | Status | Description |
| :--- | :--- | :---: | :---: | :--- |
| **Accessibility & Responsiveness** | `tests/accessibility-responsive.spec.ts` | 4 | **PASS** | Mobile/Tablet/Desktop viewports, accessible names, console hygiene, Escape key handling |
| **Background Jobs** | `tests/background-jobs.spec.ts` | 3 | **PASS** | `FOR UPDATE SKIP LOCKED` worker concurrency, 5-minute lease recovery, terminal retry limits |
| **Billing & Webhooks** | `tests/billing-webhooks.spec.ts` | 4 | **PASS** | Signature verification, idempotency deduplication, concurrent webhook races, plan persistence |
| **Booking Engine** | `tests/booking-engine.spec.ts` | 4 | **PASS** | Advisory lock double-booking rejection, cancellation lifecycle, timezone boundary accuracy |
| **E2E Core Journeys** | `tests/e2e-journeys.spec.ts` | 9 | **PASS** | Auth, Services, CRM, Knowledge Base, Appointments, Widget, Billing, Voice AI, Security |
| **Inworld TTS** | `tests/inworld-tts.spec.ts` | 6 | **PASS** | Voice catalog, fallback resolution, chunking, invalid text rejection, health check |
| **Kokoro Local TTS** | `tests/kokoro-tts.spec.ts` | 6 | **PASS** | ONNX local synthesis, real WAV generation, voice ID mapping, sentence boundaries |
| **Onboarding Intelligence** | `tests/onboarding-intelligence.spec.ts` | 9 | **PASS** | HTML extraction, JSON-LD, SSRF defense, prompt injection safety, DB persistence, idempotency |
| **Page Verification** | `tests/verify_pages.spec.ts` | 7 | **PASS** | Homepage, Pricing, Features, Dashboard, Settings, Agency, Appointments DOM validation |
| **Voice Gateway** | `tests/voice-gateway.spec.ts` | 5 | **PASS** | TwiML entry, speech turn handler, missing session hangup, silence threshold, carrier gate |
| **Total** | **10 Spec Files** | **57** | **100% PASS** | **All 57 Automated Tests Succeeded** |

---

## 2. Detailed Journey Matrix

### A. Authentication & Tenant Security

| ID | Test Name | Target File | Verification Criteria | Edge Cases Tested | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **AUTH-01** | Journey A: Login & Session | `tests/e2e-journeys.spec.ts` | Unauthenticated access redirected; valid credentials establish session; cookies persist across reloads; logout clears cookies | Stale session tokens, direct navigation to `/login-success`, redirect loop prevention | **PASS** |
| **AUTH-02** | Journey J: Cross-Tenant Isolation | `tests/e2e-journeys.spec.ts` | User in Org A cannot query, edit, or delete appointments, CRM leads, or documents belonging to Org B | Direct API queries with spoofed `organization_id`, mismatched session tenant headers | **PASS** |
| **AUTH-03** | Console Error Hygiene | `tests/accessibility-responsive.spec.ts` | Public routes (`/`, `/pricing`, `/features`) load without throwing uncaught exceptions or hydration mismatches | Unauthenticated user visiting protected links, missing assets | **PASS** |

### B. Onboarding & Web Scraping Intelligence

| ID | Test Name | Target File | Verification Criteria | Edge Cases Tested | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **ONBD-01** | Raw HTML & Schema.org | `tests/onboarding-intelligence.spec.ts` | Extracts JSON-LD `Dentist`/`LocalBusiness` data, address, operating hours, and contact numbers | Multiple schema blocks, malformed script tags, missing fields | **PASS** |
| **ONBD-02** | Structured Intelligence Profile | `tests/onboarding-intelligence.spec.ts` | Populates structured business profile with services, pricing, and description | Missing pricing fields, unstructured text | **PASS** |
| **ONBD-03** | Multi-Page Crawling | `tests/onboarding-intelligence.spec.ts` | Discovers and crawls `/services` and `/contact` links from root page | Relative vs absolute URLs, external outbound links | **PASS** |
| **ONBD-04** | Prompt Injection Defense | `tests/onboarding-intelligence.spec.ts` | Malicious instructions in website content ("Ignore previous instructions...") are parsed as literal text | System prompt override attempts, fake system directives | **PASS** |
| **ONBD-05** | SSRF & Private Network Block | `tests/onboarding-intelligence.spec.ts` | Crawling requests to `127.0.0.1`, `10.0.0.0/8`, `169.254.169.254` are blocked before TCP handshake | Cloud metadata endpoints, localhost ports, intranet addresses | **PASS** |
| **ONBD-06** | Empty HTML Graceful Degradation | `tests/onboarding-intelligence.spec.ts` | Empty or non-HTML responses return safe error/empty profile instead of throwing 500 | Zero-byte HTTP 200 responses, binary data | **PASS** |
| **ONBD-07** | E2E Database Persistence | `tests/onboarding-intelligence.spec.ts` | Creates organization, memberships, services, and profile in database and verifies via SQL query | Large service lists, special characters in business names | **PASS** |
| **ONBD-08** | Onboarding Idempotency | `tests/onboarding-intelligence.spec.ts` | Re-submitting the same onboarding payload updates existing record without duplicate services | Rapid double-clicks, partial network drop and re-try | **PASS** |
| **ONBD-09** | Controlled Fixture Release Gate | `tests/onboarding-intelligence.spec.ts` | End-to-end extraction from static controlled spine through DB persistence and browser reload | Dynamic DOM hydration, state rehydration from PostgreSQL | **PASS** |

### C. Booking Engine & Concurrency Control

| ID | Test Name | Target File | Verification Criteria | Edge Cases Tested | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **BOOK-01** | Booking A: Slot Booking | `tests/booking-engine.spec.ts` | Confirms available slot, inserts record into `appointments`, returns confirmation | Booking outside business hours, missing staff assignment | **PASS** |
| **BOOK-02** | Booking B: Advisory Lock Concurrency | `tests/booking-engine.spec.ts` | Two concurrent booking requests for identical slot serialize; exactly 1 succeeds, 1 rejected | Identical timestamp race condition (`Promise.all`), PostgreSQL transaction advisory lock | **PASS** |
| **BOOK-03** | Booking C: Cancellation & Rescheduling | `tests/booking-engine.spec.ts` | Cancelling an appointment updates database status to `cancelled` and re-opens slot for booking | Re-booking the newly freed slot, cancelling already cancelled appointment | **PASS** |
| **BOOK-04** | Booking D: Timezone Accuracy | `tests/booking-engine.spec.ts` | Appointment instants in `America/New_York` preserve exact UTC timestamp across conversions | Daylight saving time transition, cross-midnight UTC slots | **PASS** |
| **BOOK-05** | Journey F: Conflict Rejection | `tests/e2e-journeys.spec.ts` | Second booking attempt during overlapping window is rejected with status conflict | Overlapping intervals (e.g. 14:15 - 14:45 overlapping 14:00 - 14:30) | **PASS** |

### D. Billing & Webhooks

| ID | Test Name | Target File | Verification Criteria | Edge Cases Tested | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **BILL-01** | Billing A: Signature Enforcement | `tests/billing-webhooks.spec.ts` | Rejects webhooks with forged or missing HMAC signatures with HTTP 400 | Invalid hex, empty header, tampered payload bytes | **PASS** |
| **BILL-02** | Billing B: Idempotency Deduplication | `tests/billing-webhooks.spec.ts` | Replaying the same webhook event ID returns HTTP 200 without duplicate processing | Duplicate webhook delivery after 5s delay, retry after failure | **PASS** |
| **BILL-03** | Billing C: Concurrent Webhook Race | `tests/billing-webhooks.spec.ts` | Simultaneous delivery of same webhook across parallel workers handled safely via DB unique constraint | Identical event ID arriving simultaneously on 2 serverless instances | **PASS** |
| **BILL-04** | Billing D: Subscription Persistence | `tests/billing-webhooks.spec.ts` | Database `subscriptions` row updates with active plan, period start/end, and correct status | Upgrading from trial to paid plan, renewal period calculations | **PASS** |
| **BILL-05** | Journey H: Billing Portal | `tests/e2e-journeys.spec.ts` | Billing management UI displays current plan, usage minutes, and entitlement status | Active vs trialing status, card renewal indicators | **PASS** |

### E. AI Voice Receptionist & Telephony

| ID | Test Name | Target File | Verification Criteria | Edge Cases Tested | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **VOIC-01** | Voice A: Inbound TwiML Entry | `tests/voice-gateway.spec.ts` | Inbound call webhook generates valid Twilio XML with `<Gather>` and speech prompt | Missing query parameters, valid XML MIME type | **PASS** |
| **VOIC-02** | Voice B: Speech Turn Session Missing | `tests/voice-gateway.spec.ts` | Invalid or absent call session ID safely hangs up without crashing server | Forged call SID, expired call session | **PASS** |
| **VOIC-03** | Voice C: Conversational Turn | `tests/voice-gateway.spec.ts` | User utterance fetches business knowledge context and returns intelligent conversational TwiML response | Complex booking query, business hours inquiry | **PASS** |
| **VOIC-04** | Voice D: Silence & Disconnect | `tests/voice-gateway.spec.ts` | Exceeding silence threshold (3 consecutive turns) triggers parting prompt and `<Hangup/>` | Empty speech recognition input, noisy background audio | **PASS** |
| **VOIC-05** | Voice E: Production Carrier Gate | `tests/voice-gateway.spec.ts` | Verifies live PSTN carrier verification is guarded and marked blocked in QA without real telecom devices | Telecom hardware validation assertion | **PASS** |
| **VOIC-06** | Kokoro Local Audio Generation | `tests/kokoro-tts.spec.ts` | Generates valid WAV audio with RIFF header, >1KB size, and proper audio sample rates | Synthesizing sentence with punctuation, number formatting | **PASS** |
| **VOIC-07** | Inworld TTS Fallback | `tests/inworld-tts.spec.ts` | Resolves studio voice IDs, handles provider timeouts, and reports configuration status | Fallback voice mapping when requested voice ID is missing | **PASS** |
| **VOIC-08** | Journey I: Voice Cockpit & Sessions | `tests/e2e-journeys.spec.ts` | Call session record is persisted in `call_sessions` and rendered in dashboard voice cockpit | Zero call records empty state, active call transcript view | **PASS** |

### F. Background Jobs & Worker Reliability

| ID | Test Name | Target File | Verification Criteria | Edge Cases Tested | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **JOBS-01** | Jobs A: Worker Safety & Atomic Claim | `tests/background-jobs.spec.ts` | `FOR UPDATE SKIP LOCKED` query prevents two competing workers from claiming same job | 2 workers racing to claim 10 pending jobs simultaneously | **PASS** |
| **JOBS-02** | Jobs B: Expired Lease Recovery | `tests/background-jobs.spec.ts` | Worker recovers jobs whose lock expired (>5 minutes ago) and re-processes them | Worker process crashing or timing out mid-job | **PASS** |
| **JOBS-03** | Jobs C: Retry Limits & Terminal State | `tests/background-jobs.spec.ts` | Failing jobs retry up to `max_attempts` (3) before transitioning to permanent `failed` status | Unhandled exceptions in job handler, transient DB errors | **PASS** |

### G. Frontend, Accessibility & UI Quality

| ID | Test Name | Target File | Verification Criteria | Edge Cases Tested | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **A11Y-01** | Responsive Viewports | `tests/accessibility-responsive.spec.ts` | Page renders cleanly at 375px (Mobile), 768px (Tablet), 1440px (Desktop) | Horizontal scrollbar prevention, mobile navigation burger menu | **PASS** |
| **A11Y-02** | Accessible Names | `tests/accessibility-responsive.spec.ts` | All buttons, links, and icon-only controls have accessible names | SVG icon buttons, screen-reader text visibility | **PASS** |
| **A11Y-03** | Keyboard Navigation | `tests/accessibility-responsive.spec.ts` | Dialogs and interactive drawers dismiss on `Escape` key press | Focus traps, overlay dismissal | **PASS** |
| **PAGE-01..07** | Page DOM & Layout Verification | `tests/verify_pages.spec.ts` | 7 critical routes (`/`, `/pricing`, `/features`, `/dashboard`, `/settings`, `/agency/dashboard`, `/appointments`) load with HTTP 200 | Slow network conditions, DOMContentLoaded event | **PASS** |

---

## 3. External Integration Verification Status

| Integration | Sandbox / Verification Mode | Actual Status | Live Production Status |
| :--- | :--- | :---: | :--- |
| **Stripe** | Test mode secret & webhook signing key | **VERIFIED** | Ready for production keys |
| **Razorpay** | Test mode key pair & webhook secret | **VERIFIED** | Ready for production keys |
| **Twilio Voice (TwiML / Webhooks)** | Local TwiML gateway & speech turn runner | **VERIFIED** | Webhook routes live & validated |
| **Twilio Media Streams (PSTN)** | Hardware carrier verification gate | **BLOCKED** | Requires physical test call from carrier phone |
| **Gemini AI (2.5 Flash)** | Live API key with deterministic fallback | **VERIFIED** | Graceful fallback on rate limits |
| **Deepgram STT** | Live API key configured | **VERIFIED** | Audio transcription ready |
| **Kokoro Local TTS** | Local ONNX runtime + model weights | **VERIFIED** | 100% self-hosted & operational |
| **Inworld TTS** | Studio voice provider integration | **VERIFIED** | Operational fallback provider |
| **PostgreSQL Database** | Direct PostgreSQL with Drizzle ORM | **VERIFIED** | Advisory locks & schema constraints verified |
