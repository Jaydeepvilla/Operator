# Operator Developer Handbook

A comprehensive technical guide for developers building and extending the Operator platform.

---

## Technical Stack

- **Framework:** Next.js 16 (App Router, React Server Components, Server Actions).
- **Language:** TypeScript 5.
- **Database:** PostgreSQL with `pgvector` extension for semantic knowledge search.
- **ORM:** Drizzle ORM (`drizzle-orm`, `drizzle-kit`).
- **Styling:** Design System CSS tokens mapped to Tailwind CSS utilities.
- **Telephony & Speech:** Twilio Voice Webhooks and WebSocket media streaming.
- **Authentication:** Local cookie sessions with Argon2 password hashing.

---

## Repository Structure

```text
├── docs/                   # Engineering architecture and system documentation
├── src/
│   ├── app/                # Next.js App Router routes and pages
│   │   ├── (auth)/         # Sign-in, sign-up, password reset routes
│   │   ├── (dashboard)/    # Authenticated SaaS dashboard modules
│   │   ├── (onboarding)/   # Initial setup wizard
│   │   ├── api/            # REST API endpoints & webhook handlers
│   │   └── docs/           # Web documentation viewer (/docs)
│   ├── components/         # Design system & modular UI components
│   │   ├── docs/           # Documentation components (Sidebar, Search, TOC)
│   │   ├── shared/         # Base design tokens (Button, Card, Input, etc.)
│   │   └── ui/             # Radix UI primitives
│   ├── design-system/      # CSS token foundations (colors, spacing, typography)
│   ├── lib/                # Shared utilities, validators, plan configurations
│   └── server/             # Backend server architecture
│       ├── actions/        # Next.js Server Actions ("use server")
│       ├── db/             # Drizzle PostgreSQL schema and migrations
│       ├── repositories/   # Database query repositories
│       └── services/       # Domain services (orchestrator, booking, rag, etc.)
```

---

## Development Workflow

### Prerequisites
- Node.js 18+ (Node 20 recommended)
- PostgreSQL with `pgvector` extension
- npm or pnpm

### Environment Configuration
Copy `.env.example` to `.env.local` and configure:
```bash
DATABASE_URL="postgres://user:password@localhost:5432/operator"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
SESSION_SECRET="your-32-character-random-secret"
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
META_APP_SECRET="..."
```

### Essential npm Scripts
- `npm run dev`: Starts the Next.js development server on port 3000.
- `npm run typecheck`: Runs `tsc --noEmit` to validate TypeScript types.
- `npm run lint`: Runs ESLint across the codebase.
- `npm run build`: Compiles the production application bundle.

---

## Security Invariants for Developers

1. **Multi-Tenant Scoping:** Never query or mutate business records without scoping to `organizationId`.
2. **IDOR Assertion:** All server actions that update or delete resources must call:
   ```typescript
   await assertResourceOwnership(table, resourceId, organizationId, "Resource Name");
   ```
3. **Session Authentication:** Use `requireOrganizationAccess()` in server actions to guarantee caller is authenticated and belongs to an active workspace.
4. **SSRF Mitigation:** Always use `validateSafeUrl()` before issuing HTTP requests to external customer URLs.
