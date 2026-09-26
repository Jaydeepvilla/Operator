# ═══════════════════════════════════════════════════════════════════
# Operator — SECURITY & ENVIRONMENT GUIDE
# ═══════════════════════════════════════════════════════════════════

## 🔐 Authentication Architecture

Operator uses an enterprise-grade, stateful session-based authentication system:
- **Sessions**: Cryptographically secure random tokens (`crypto.randomBytes(32)`) stored in PostgreSQL.
- **Passwords**: Hashed with Argon2 (`@node-rs/argon2`).
- **OAuth**: Native Google OAuth 2.0 (`/api/auth/login/google` and `/api/auth/callback/google`).
- **No Third-Party Auth Lock-In**: Complete control over user data and authentication workflows.

---

## ⚠️ CRITICAL: Do Not Commit .env to Git

Your `.env` file contains live secrets (database credentials, API keys).
These MUST NOT be committed to any public or private repository.

### Fix immediately:

Verify `.gitignore` contains:
  .env
  .env.local
  .env.production
  .env.development

To check: `git status` — `.env*` files should not appear.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | Yes | Live application URL (e.g., `https://apps.nexxtechnologies.com`) |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth 2.0 Client Secret |
| `OPENAI_API_KEY` | Optional | For AI response generation |
| `GEMINI_API_KEY` | Optional | For Gemini multimodal processing |
| `RAZORPAY_KEY_ID` | Optional | Payment gateway public key |
| `RAZORPAY_KEY_SECRET` | Optional | Payment gateway secret key |
| `VONAGE_API_KEY` | Optional | Voice & SMS telephony |
| `RESEND_API_KEY` | Optional | Transactional emails |
| `CRON_SECRET` | Optional | Internal cron job authorization |
| `IMPERSONATION_SECRET` | Optional | Admin impersonation key |
