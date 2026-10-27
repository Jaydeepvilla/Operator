# OPERATOR PHASE 6 — TRIGGER.DEV VS. POSTGRESQL WORKER ARCHITECTURAL EVALUATION

**Project:** Operator — Autonomous AI Receptionist SaaS  
**Phase:** 6 of 8 (Production Readiness Programme)  
**Role:** Principal Backend Architect & Distributed Systems Engineer  
**Date:** October 26, 2026  
**Status:** Evaluation Complete — Decision Rendered  

---

## 1. Context & Objectives

A core mandate of Phase 6 is to evaluate whether Operator should retain and harden its existing native PostgreSQL background worker or migrate background execution to **Trigger.dev** (v3). 

To avoid premature architectural complexity, vendor lock-in, and unnecessary cloud expenditure, this evaluation was conducted strictly against verified requirements, observed code paths, operational constraints, and documented vendor capabilities.

---

## 2. In-Depth Architectural Comparison

| Evaluation Criterion | Existing PostgreSQL Worker (Hardened) | Trigger.dev v3 Candidate | Architectural Assessment |
|---|---|---|---|
| **Atomic Claiming & Concurrency** | Native PostgreSQL CTE using `FOR UPDATE SKIP LOCKED`. Zero double execution verified under concurrent load. | Cloud-orchestrated task queues with concurrency keys and worker pool management. | **TIE.** Both guarantee atomic isolation. PostgreSQL worker requires 0 external infrastructure. |
| **Retries & Backoff** | Configurable bounded exponential backoff ($15s, 30s, 60s \dots 3600s$) with attempt tracking and terminal failure transitions. | Native retry schemas (`maxAttempts`, `factor`, `minTimeoutInMs`, `maxTimeoutInMs`). | **TIE.** Both provide robust backoff policies. |
| **Execution Duration Limits** | Bound to hosting execution budget: ~60s on standard Vercel serverless functions (with 25s per-job safety timeout). | Decoupled long-running microVMs supporting executions up to hours. | **TRIGGER.DEV ADVANTAGE** for long-running batch operations (>60s). |
| **Scheduling & Recurring Jobs** | Handled via Vercel Cron routes (`/api/cron/process-queue`) with secret validation. | Native `schedules.task` cron triggers with timezone support. | **TIE.** Vercel Crons are already integrated and working. |
| **Transactional Idempotency** | Native ACID transactions. Webhooks, notifications, and subscriptions are atomically committed with application data. | Two-phase commit required. Task triggers are external to database transactions; partial failure risk if DB commit fails after task trigger. | **POSTGRESQL ADVANTAGE.** Immediate transactional consistency with zero external drift. |
| **Observability & Privacy** | Fully integrated with Phase 5 structured logger and Sentry. Automatic PII/token redaction across error logs. | Dedicated Trigger.dev web dashboard with trace graphs, runs, and payload inspection. | **CONDITIONAL.** Trigger.dev UI is rich, but externalizing customer payloads (call transcripts, emails) poses privacy compliance risks unless heavily scrubbed. |
| **Local Development & Testing** | Zero setup required. Runs against standard Docker or local PostgreSQL. 100% deterministic Playwright tests pass offline. | Requires Trigger.dev CLI daemon (`npx trigger.dev@latest dev`), cloud project link, and synced developer API keys. | **POSTGRESQL ADVANTAGE.** Drastically simpler developer experience and faster CI/CD pipelines. |
| **Operational Costs** | **$0 extra cost.** Leverages existing Neon Serverless PostgreSQL database connection pool. | Free tier: 10,000 runs/mo. Growth tier: $50/mo base + compute usage ($0.00005/s) + extra runs ($2 per 10k). | **POSTGRESQL ADVANTAGE.** Unpredictable cloud bill vs. zero incremental infrastructure cost. |
| **Migration Risk** | **Zero.** The worker is already written, hardened, and verified with 8/8 automated integration tests. | **HIGH.** Requires installing `@trigger.dev/sdk`, refactoring all notification calls, deploying worker infrastructure, managing cutover, and handling split-brain jobs. | **POSTGRESQL ADVANTAGE.** Retaining the existing worker avoids significant code disruption. |

---

## 3. Workload Requirement Analysis for Operator

We analyzed Operator's real-world background workload profile:

1. **Notification Delivery (Email & SMS):**
   - *Frequency:* 1–5 calls per booking / cancellation.
   - *Duration:* 200ms – 1,500ms (HTTP call to Resend, Postmark, Vonage, or Sinch).
   - *Execution Model:* Short-lived, high-frequency.
   - *Verdict:* Perfectly suited for PostgreSQL worker + Vercel Cron.

2. **Billing Webhook Processing (Razorpay / Stripe):**
   - *Frequency:* Event-driven upon checkout, invoice payment, or subscription cancellation.
   - *Duration:* 100ms – 500ms (database row update + audit log).
   - *Execution Model:* Low latency, mission-critical idempotency.
   - *Verdict:* Best handled synchronously or via transactional outbox directly in the DB webhook handler.

3. **Appointment Reminders:**
   - *Frequency:* Scheduled 24h and 1h prior to appointment start time.
   - *Duration:* <500ms per reminder batch.
   - *Execution Model:* Polled periodically via cron.
   - *Verdict:* Perfectly suited for PostgreSQL worker.

4. **Self-Learning AI Engine:**
   - *Frequency:* Nightly cron (`/api/cron/learning-engine`).
   - *Duration:* 5s – 30s across unanalyzed conversation transcripts.
   - *Execution Model:* Batched Gemini API summary calls.
   - *Verdict:* Fits comfortably within the 60s Vercel serverless budget.

5. **Website Scraping & Vector Embeddings:**
   - *Frequency:* Infrequent (triggered only when a business updates its knowledge base URL).
   - *Duration:* 10s – 120s depending on crawl depth.
   - *Execution Model:* Potentially long-running if scraping >10 pages.
   - *Verdict:* The **only** workload in Operator that could benefit from Trigger.dev's decoupled compute model. However, Operator currently bounds web scraping to a max depth of 2 and max 5 pages, which completes in under 20s.

---

## 4. Final Recommendation: Retain and Harden PostgreSQL Worker

### Primary Decision:
**Retain the native PostgreSQL background worker and do not migrate to Trigger.dev at this time.**

### Justification:
1. **Sufficient Guarantees:** The hardened PostgreSQL worker provides atomic row locking (`FOR UPDATE SKIP LOCKED`), 5-minute lease recovery, bounded exponential backoff, per-job 25s execution timeouts, and idempotency key deduplication.
2. **Transactional Integrity:** Enqueueing jobs alongside database mutations within the same transaction eliminates phantom enqueues and dual-write anomalies.
3. **Operational Simplicity:** Zero additional SaaS accounts, zero extra API keys or credentials, zero external network hops for queue polling, and zero developer onboarding friction.
4. **Privacy Protection:** Customer payloads and notification transcripts remain strictly within the tenant's PostgreSQL database rather than being replicated to Trigger.dev's cloud platform.

### Future Re-evaluation Trigger:
Re-evaluate Trigger.dev **only if**:
- Ingestion pipelines expand to heavy, multi-minute document processing (e.g., parsing 500-page PDF manuals or large video transcriptions) that consistently breach Vercel's execution budget.
- Operator scales to thousands of concurrent background tasks per minute, creating database connection contention that warrants offloading queue state to dedicated worker machines.
