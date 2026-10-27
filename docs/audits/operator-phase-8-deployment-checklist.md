# OPERATOR PHASE 8 — DEPLOYMENT & OPERATIONAL CHECKLIST

**Project:** Operator — Autonomous AI Receptionist SaaS  
**Phase:** 8 of the Production-Readiness Programme  
**Target Environment:** Vercel Production + Neon Serverless PostgreSQL  
**Date:** October 26, 2026  

---

## 1. Overview & Verification Status

| Step | Description | Repository Status | Production Environment Status |
| :--- | :--- | :---: | :---: |
| **1.1** | Vercel Cron Configuration (`vercel.json`) | **VERIFIED** | Ready to Deploy |
| **1.2** | Scheduled Reminders Endpoint (`/api/cron/send-reminders`) | **VERIFIED** | Ready to Deploy |
| **1.3** | Durable Website Crawling Background Jobs | **VERIFIED** | Ready to Deploy |
| **1.4** | Secret & Env Var Validation (`CRON_SECRET`) | **VERIFIED** | Manual Verification Required in Vercel Dashboard |
| **1.5** | Database Migrations & Constraints | **VERIFIED** | Non-destructive (no schema migrations required) |

> [!IMPORTANT]
> A deployment configuration file (`vercel.json`) existing in the repository is not identical to active deployment verification. The checklist below distinguishes code-level repository verifications from live Vercel environment verification steps.

---

## 2. Pre-Deployment Configuration

### 2.1 Environment Variables
Ensure the following environment variables are configured in the Vercel project settings:

```bash
# 1. Scheduled Invocations (MANDATORY)
CRON_SECRET="<generate-64-character-random-hex-secret>"

# 2. Database Connection (Pooled & Non-Pooled)
DATABASE_URL="postgres://...@...neon.tech/operator?sslmode=require"

# 3. Notification Providers
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1..."
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="Operator <notifications@yourdomain.com>"

# 4. Observability & Privacy
SENTRY_DSN="https://...@sentry.io/..."
NEXT_PUBLIC_SENTRY_DSN="https://...@sentry.io/..."
```

### 2.2 Vercel Cron Schedules (`vercel.json`)
The repository contains the authoritative `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/jobs",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/process-queue",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/send-reminders",
      "schedule": "* * * * *"
    }
  ]
}
```
*Note: Vercel Pro/Enterprise accounts support 1-minute cron intervals (`* * * * *`). On Hobby plans, cron jobs run once per day or can be triggered via external runners (such as GitHub Actions or Cloudflare Workers) sending `Authorization: Bearer $CRON_SECRET`.*

---

## 3. Deployment Steps

1. **Commit and Push:**
   Verify Git working directory is clean:
   ```bash
   git status
   ```
2. **Review Diff:**
   Ensure no test credentials or hardcoded keys exist in diff.
3. **Trigger Vercel Build:**
   Deploy to preview or production branch:
   ```bash
   vercel --prod
   ```
4. **Inspect Build Logs:**
   Verify TypeScript compilation, Next.js route collection, and edge/serverless bundling complete with zero errors.

---

## 4. Post-Deployment Smoke Verification Runbook

### 4.1 Verify Cron Authentication
Send a test request without credentials (must return 401 or 500):
```bash
curl -i https://<your-production-domain>/api/cron/send-reminders
# Expect HTTP 401 Unauthorized
```

Send a test request with invalid bearer token (must return 401):
```bash
curl -i -H "Authorization: Bearer invalid_token" https://<your-production-domain>/api/cron/send-reminders
# Expect HTTP 401 Unauthorized
```

Send an authorized invocation (must return 200 with JSON payload):
```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" https://<your-production-domain>/api/cron/send-reminders
# Expect HTTP 200 OK: {"success":true,"claimed":0,"enqueued":0,"reminderIds":[]}
```

### 4.2 Verify Website Ingestion Asynchronous Processing
1. Log in to the Operator dashboard.
2. Navigate to **Knowledge Base** -> **Add Source** -> **Website Crawl**.
3. Input a public documentation URL containing multiple pages (e.g., 6–10 pages).
4. Select all pages and click **Start Ingestion**.
5. **Expected Behavior:**
   - The UI immediately confirms enqueueing without waiting for all pages to download (`< 500ms`).
   - The import status shows `Queued` -> `Processing` with dynamic progress bars.
   - Upon background worker completion, status transitions to `Completed` (or `Partial` if a page timed out).
   - Verify serverless action response in Vercel runtime logs returned within `< 300ms`.

---

## 5. Rollback Procedures

If anomalous behavior is detected post-deployment:

1. **Immediate Circuit Breaker:**
   To temporarily pause automated reminder dispatch without code rollback:
   - Rotate or clear `CRON_SECRET` in Vercel environment variables. All incoming cron requests will immediately fail closed with 401/500, preventing any automated reminder queries.
2. **Git Rollback:**
   ```bash
   git revert HEAD
   git push origin main
   ```
3. **Database State Invariants:**
   - Any reminders left in `'processing'` status will automatically time out after 5 minutes and become eligible for reclamation.
   - Any website import jobs in `'queued'` or `'processing'` can be marked `'failed'` by updating the `website_imports` table directly.
