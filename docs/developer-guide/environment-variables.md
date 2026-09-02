# Environment Variables Reference

Every environment variable consumed by Operator, with the source file where it is read, whether it is required, and what happens when it is absent.

---

## Core

### `DATABASE_URL`

**Required.** PostgreSQL connection string.

```
DATABASE_URL="postgres://user:password@localhost:5432/nexx_receptionist"
```

Read by: `src/server/db/index.ts`  
What happens if missing: The application will fail to start. Drizzle cannot initialize.

---

### `NEXT_PUBLIC_APP_URL`

**Required for integrations.** The public base URL of the application. Used to construct webhook callback URLs for Google OAuth and voice stream endpoints.

```
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
# or for local development:
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Read by: `src/app/api/auth/login/google/route.ts`, `src/app/api/auth/callback/google/route.ts`, `src/server/services/voice/campaign.ts`  
What happens if missing: Falls back to `http://localhost:3000`. Google OAuth callbacks will break in production if this is not set to the correct domain.

---

### `NODE_ENV`

**Set automatically by Next.js.** Values: `development`, `production`, `test`.

Affects:
- Cookie `secure` flag (only `true` in production)
- Logger verbosity (debug logs suppressed in production)
- Next.js fetch logging (`fullUrl` only in development)

---

## AI / LLM

### `OPENAI_API_KEY`

**Required for real AI responses (primary).** OpenAI secret key for gpt-4o-mini completions.

```
OPENAI_API_KEY="sk-proj-..."
```

Read by: `src/server/services/llm.ts` — `llmRegistry.getProvider()`  
What happens if missing: Falls back to `GEMINI_API_KEY`. If that is also missing, `MockLLMProvider` is used, which returns deterministic fake responses. The app runs but no real AI completions occur.

---

### `GEMINI_API_KEY`

**Required for real AI responses (secondary).** Google Gemini API key for Gemini 2.5 Flash completions.

```
GEMINI_API_KEY="AIzaSy..."
```

Read by: `src/server/services/llm.ts` — `llmRegistry.getProvider()`  
What happens if missing: Falls back to `MockLLMProvider` if `OPENAI_API_KEY` is also absent.

**LLM priority order:** `OPENAI_API_KEY` → `GEMINI_API_KEY` → `MockLLMProvider`

---

## Voice

### `VAPI_API_KEY`

**Required for Vapi voice calls.** API key from [dashboard.vapi.ai](https://dashboard.vapi.ai).

```
VAPI_API_KEY="vapi_..."
```

Read by: `src/server/services/voice/vapi.ts`  
What happens if missing: Vapi call initiation will fail silently. Voice features are disabled.

---

### `VAPI_ASSISTANT_ID`

**Required for Vapi voice calls.** The ID of the Vapi assistant to use. Can be overridden per-organization via `channelConnections.connectionConfig.vapiAssistantId`.

```
VAPI_ASSISTANT_ID="..."
```

Read by: `src/server/services/voice/vapi.ts`

---

### `VAPI_PHONE_NUMBER_ID`

**Required for Vapi outbound calls.** The Vapi phone number ID to dial from.

```
VAPI_PHONE_NUMBER_ID="..."
```

Read by: `src/server/services/voice/vapi.ts`

---

### `TWILIO_ACCOUNT_SID`

**Required for Twilio SMS/Voice.** Twilio account SID from [console.twilio.com](https://console.twilio.com).

```
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Read by: `src/server/services/voice/campaign.ts`, `src/server/services/notification.ts`  
What happens if missing: SMS via Twilio will fail. Falls back to `ACmock` in development (no real SMS sent).

---

### `TWILIO_AUTH_TOKEN`

**Required for Twilio SMS/Voice.** Twilio auth token.

```
TWILIO_AUTH_TOKEN="..."
```

Read by: `src/server/services/voice/campaign.ts`, `src/server/services/notification.ts`  
What happens if missing: Same as `TWILIO_ACCOUNT_SID`. Falls back to `tokenmock` in development.

---

### `TWILIO_PHONE_NUMBER`

**Required for Twilio outbound SMS/calls.** E.164 format phone number.

```
TWILIO_PHONE_NUMBER="+14155552671"
```

Read by: `src/server/services/notification.ts`

---

### `DEEPGRAM_API_KEY`

**Required for speech-to-text in voice calls.** Deepgram API key from [console.deepgram.com](https://console.deepgram.com).

```
DEEPGRAM_API_KEY="..."
```

Read by: `src/server/services/voice/deepgram.ts`

---

### `ELEVENLABS_API_KEY`

**Required for text-to-speech in voice calls.** ElevenLabs API key from [elevenlabs.io](https://elevenlabs.io).

```
ELEVENLABS_API_KEY="..."
```

Read by: `src/server/services/voice/elevenlabs.ts`

---

## Google / Calendar

### `GOOGLE_CLIENT_ID`

**Required for Google Calendar integration and Google OAuth sign-in.**

```
GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
```

Read by: `src/app/api/auth/login/google/route.ts`, `src/app/api/auth/callback/google/route.ts`

**Setup:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create or select a project
3. Enable the **Google Calendar API** and **Google+ API**
4. Create OAuth 2.0 credentials (Web Application type)
5. Add `${NEXT_PUBLIC_APP_URL}/api/auth/callback/google` as an authorized redirect URI

---

### `GOOGLE_CLIENT_SECRET`

**Required for Google Calendar integration and Google OAuth sign-in.**

```
GOOGLE_CLIENT_SECRET="GOCSPX-..."
```

Read by: `src/app/api/auth/callback/google/route.ts`

---

## Billing

### `STRIPE_SECRET_KEY`

**Required for Stripe billing.** Secret key from [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API Keys.

```
STRIPE_SECRET_KEY="sk_test_..."
# or for production:
STRIPE_SECRET_KEY="sk_live_..."
```

Read by: `src/server/services/billing/providers/stripe.ts`

---

### `STRIPE_WEBHOOK_SECRET`

**Required for Stripe billing webhooks.** The webhook signing secret from Stripe dashboard → Developers → Webhooks.

```
STRIPE_WEBHOOK_SECRET="whsec_..."
```

Used to validate that incoming webhook calls originate from Stripe.

---

## Email / SMTP

### `SMTP_HOST`

**Required for email notifications.** Outbound email relay host.

```
SMTP_HOST="smtp.hostinger.com"
```

Read by: `src/server/services/notification.ts`  
Default: `smtp.hostinger.com`

---

### `SMTP_PORT`

**Required for email notifications.** SMTP port number.

```
SMTP_PORT="465"
```

Read by: `src/server/services/notification.ts`  
Default: `465`

---

### `SMTP_USER`

**Required for email notifications.** SMTP username (typically the sending email address).

```
SMTP_USER="noreply@yourdomain.com"
```

Read by: `src/server/services/notification.ts`

---

### `SMTP_PASS`

**Required for email notifications.** SMTP password.

```
SMTP_PASS="..."
```

Read by: `src/server/services/notification.ts`

---

### `SMTP_FROM`

**Optional.** Display name and address for outbound emails.

```
SMTP_FROM='"Operator AI" <noreply@yourdomain.com>'
```

Read by: `src/server/services/notification.ts`  
Default: Constructed from `SMTP_USER` if not set: `"Operator AI" <${SMTP_USER}>`

---

## SMS & Voice (Vonage — Primary)

### `VONAGE_API_KEY`
**Required for Vonage SMS & Voice.** API Key from developer.vonage.com.

```
VONAGE_API_KEY="..."
```

### `VONAGE_API_SECRET`
**Required for Vonage SMS & Voice.** API Secret from developer.vonage.com.

```
VONAGE_API_SECRET="..."
```

### `VONAGE_FROM_NUMBER`
**Optional.** Dedicated outbound virtual phone number or registered alphanumeric Sender ID. Default: `Operator`.

---

## SMS & Voice (Sinch — Alternative)

### `SINCH_SERVICE_PLAN_ID`
**Required for Sinch SMS.** Service Plan ID from dashboard.sinch.com.

```
SINCH_SERVICE_PLAN_ID="..."
```

### `SINCH_API_TOKEN`
**Required for Sinch SMS.** API Token from dashboard.sinch.com.

```
SINCH_API_TOKEN="..."
```

---

## Transactional Email (Resend & Postmark)

### `RESEND_API_KEY`
**Required for Resend Email.** API key from resend.com.

```
RESEND_API_KEY="re_..."
```

### `POSTMARK_SERVER_TOKEN`
**Alternative for Postmark Email.** Server token from postmarkapp.com.

```
POSTMARK_SERVER_TOKEN="..."
```

---

## Cron / Jobs

### `CRON_SECRET`

**Required for cron job security.** Bearer token that must be included in the `Authorization` header when calling `/api/cron/jobs`. Prevents unauthorized execution of scheduled jobs.

```
CRON_SECRET="a-long-random-secret-string"
```

Read by: `src/app/api/cron/jobs/route.ts`  
What happens if missing: The cron endpoint allows unauthenticated requests (the check is bypassed). Do not leave this unset in production.

---

## Payments & Subscriptions (Razorpay — Primary)

### `RAZORPAY_KEY_ID`
**Required for payments & subscriptions in India & globally.** Key ID from dashboard.razorpay.com.

```
RAZORPAY_KEY_ID="rzp_test_..."
```

### `RAZORPAY_KEY_SECRET`
**Required for payment verification & subscription management.** Key Secret from dashboard.razorpay.com.

```
RAZORPAY_KEY_SECRET="..."
```

### `RAZORPAY_WEBHOOK_SECRET`
**Required for webhook verification.** Webhook secret configured for `/api/webhooks/billing/razorpay`.

```
RAZORPAY_WEBHOOK_SECRET="..."
```

---

## What NOT to configure (Decommissioned Integrations)

The following integrations have been decommissioned and are not required:
- **Google OAuth / Google Calendar** (Auth is direct email/password and session-based; scheduling is native built-in)
- **Microsoft Graph / Office 365 Calendar**
- **Stripe** (Replaced by Razorpay for seamless domestic & international payments)
- **Clerk** (Replaced by custom session engine)

---

## Production checklist

Before deploying:

- [ ] `DATABASE_URL` points to the production PostgreSQL database
- [ ] `NEXT_PUBLIC_APP_URL` is the production domain
- [ ] `OPENAI_API_KEY` or `GEMINI_API_KEY` is set
- [ ] `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` are set (Live or Test mode)
- [ ] `RAZORPAY_WEBHOOK_SECRET` is configured for the `/api/webhooks/billing/razorpay` endpoint
- [ ] `VONAGE_API_KEY` + `VONAGE_API_SECRET` are configured
- [ ] `RESEND_API_KEY` + `EMAIL_FROM` are configured with verified domain
- [ ] `META_PHONE_NUMBER_ID` + `META_ACCESS_TOKEN` are set for WhatsApp
- [ ] `CRON_SECRET` and `IMPERSONATION_SECRET` are set with strong tokens
- [ ] `.env` is excluded from git (`git status` should not show it)

