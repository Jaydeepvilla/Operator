# Installation

This guide takes you from zero to a running local Operator instance.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | ≥ 20 | Check with `node --version` |
| npm | ≥ 10 | Check with `npm --version` |
| PostgreSQL | ≥ 14 | Local or hosted (Supabase, Neon, Railway) |

---

## 1. Clone the repository

```bash
git clone <repo-url>
cd dynamicos
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Create your environment file

```bash
cp .env.example .env
```

Open `.env` and set the required variables:

```env
# Required: PostgreSQL connection string
DATABASE_URL="postgres://postgres:postgres@localhost:5432/operator_dev"

# Required: Public base URL (used for OAuth redirects)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Required for real AI: set at least one
OPENAI_API_KEY="sk-proj-..."
# GEMINI_API_KEY="AIzaSy..."
```

If neither `OPENAI_API_KEY` nor `GEMINI_API_KEY` is set, the system runs with a `MockLLMProvider` — the app works but AI responses are fake. Acceptable for UI development.

For the complete variable reference (voice, calendar, billing, SMTP, etc.) see [`environment-variables.md`](environment-variables.md).

> **Do not configure Clerk.** The `.env.example` contains legacy Clerk keys. They are not used. The auth system is custom (`src/lib/auth/`).

---

## 4. Create the database

If running PostgreSQL locally:

```bash
createdb operator_dev
# or in psql:
# CREATE DATABASE operator_dev;
```

If using a hosted provider (Supabase, Neon, Railway), create the database through the provider's UI and copy the connection string.

---

## 5. Push the schema

Operator uses Drizzle ORM. Push the schema to your database:

```bash
npx drizzle-kit push
```

This creates all tables from `src/server/db/schema.ts`. No migration files are generated — it applies the schema directly.

---

## 6. Seed the database

```bash
npm run db:seed
```

This runs `scripts/seed/index.ts` and creates:
- A demo organization
- A default admin user
- Sample services and FAQ items
- A default business settings record

The seed script prints the login credentials to the console.

---

## 7. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

The dev server starts with `--max-old-space-size=4096` to handle large builds.

---

## 8. Sign in

Navigate to `http://localhost:3000/sign-in` and use the credentials printed by `npm run db:seed`.

---

## Common issues

### Database connection failed

Verify that PostgreSQL is running and the `DATABASE_URL` in `.env` matches your database user, password, host, port, and database name.

```bash
# Test the connection
psql "postgres://postgres:postgres@localhost:5432/operator_dev" -c "SELECT 1;"
```

### Schema push fails: table already exists

The database already has tables from a previous push. Either drop and recreate the database, or use:

```bash
npm run db:clean   # clears all data
npx drizzle-kit push  # re-applies schema (idempotent for unchanged tables)
```

### `tsx: command not found`

`tsx` is a dev dependency. Ensure `npm install` completed successfully. If the issue persists:

```bash
npx tsx scripts/seed/index.ts
```

### The app loads but AI responses are fake

You have not set `OPENAI_API_KEY` or `GEMINI_API_KEY`. The `MockLLMProvider` is active. Add one of these keys to `.env` and restart the server.

### Port 3000 is already in use

```bash
# Find and kill the process
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## Resetting the environment

```bash
# Clear all data and re-seed
npm run db:reset
```

Or to start completely fresh:

```bash
dropdb operator_dev
createdb operator_dev
npx drizzle-kit push
npm run db:seed
```

---

## Next steps

- [Environment Variables Reference](environment-variables.md) — full variable list
- [Project Structure](../getting-started/project-structure.md) — directory map
- [Authentication Architecture](../architecture/authentication.md) — how the custom auth system works
- [AI Pipeline](../ai/overview.md) — how the AI receptionist processes conversations
