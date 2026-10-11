# Operator — Master Bug Register & Defect Resolution Log

## 1. Defect Classification & Severity Standards

- **Critical**: Remote code execution, exploitable account takeover, cross-tenant data leakage, unauthenticated revenue manipulation.
- **High**: Broken authentication/authorization, data integrity compromise, major workflow crash.
- **Medium**: Important feature failure, accessibility violation, navigation or routing defect.
- **Low**: Non-breaking visual glitch, minor UX friction, non-critical logging omission.

---

## 2. Register of Confirmed & Remediated Defects

### BUG-SEC-001: Account Takeover via Unauthenticated Organization Creation
- **Category**: Security / Authentication
- **Severity**: Critical
- **Priority**: P0
- **Affected Route / Service**: `src/server/actions/onboarding.ts` (`createOrganizationAction`)
- **User Impact**: An attacker could hijack an existing user's identity and newly provisioned business by simply supplying the victim's email address in the onboarding flow.
- **Business Impact**: Complete compromise of tenant privacy and unauthorized access to customer contacts and appointment data.
- **Reproduction Procedure**: Send a POST request to `createOrganizationAction` with unauthenticated session and payload `{ email: "victim@example.com", name: "Hijacked Corp" }`.
- **Expected Behavior**: The server must reject the request with `Authentication required. Please sign in to set up your business.`
- **Actual Behavior (Before Fix)**: The action accepted the email, found the existing user, and created an organization linked to that user without verifying session credentials.
- **Root Cause**: Missing session identity assertion; trusting unverified client input email over verified session user ID.
- **Implemented Fix**: Enforced `requireUser()` in `createOrganizationAction`, binding tenant creation exclusively to `session.userId`.
- **Regression Test**: `scripts/test-audit-full-matrix.ts:L311` (`ONBOARD-01`).
- **Verification Result**: **VERIFIED FIXED (PASS)**.

---

### BUG-SEC-002: Open Redirect via Protocol-Relative URLs
- **Category**: Security / Network
- **Severity**: High
- **Priority**: P1
- **Affected Route / Service**: `src/lib/auth/redirect.ts` (`sanitizeRedirectUrl`)
- **User Impact**: Users clicking legitimate login links with manipulated `redirectTo` parameters could be invisibly redirected to phishing sites.
- **Business Impact**: Phishing attacks exploiting the Operator domain, damaging brand trust.
- **Reproduction Procedure**: Request `/login?redirectTo=//attacker.com` or `/login?redirectTo=\/attacker.com`.
- **Expected Behavior**: Sanitizer returns `null` or fallback `/dashboard`.
- **Actual Behavior (Before Fix)**: Sanitizer checked `url.startsWith("/")` which was satisfied by `//attacker.com` and `\/attacker.com`, allowing browser redirect to external hosts.
- **Root Cause**: Incomplete protocol-relative URL validation.
- **Implemented Fix**: Added strict checks: reject if URL starts with `//` or `/\` or `\/`, or contains a scheme (`://`).
- **Regression Test**: `scripts/test-audit-full-matrix.ts:L460` (`REDIR-01..04`).
- **Verification Result**: **VERIFIED FIXED (PASS)**.

---

### BUG-SEC-003: OAuth Authentication Bypass for Suspended Users & Unverified Emails
- **Category**: Security / Identity Provider
- **Severity**: High
- **Priority**: P1
- **Affected Route / Service**: `src/app/api/auth/callback/google/route.ts`
- **User Impact**: An administratively suspended user could regain platform access by logging in via Google OAuth; users with unverified third-party emails could register.
- **Business Impact**: Inability to enforce security suspensions or ban malicious actors.
- **Reproduction Procedure**: Complete Google OAuth dance for a user record flagged with `status: "suspended"`.
- **Expected Behavior**: OAuth callback rejects authentication with error `Your account has been suspended`.
- **Actual Behavior (Before Fix)**: Callback fetched Google profile and issued an active session cookie regardless of user status.
- **Root Cause**: Missing user status check and email verification flag validation in the OAuth callback handler.
- **Implemented Fix**: Added `user.status === 'suspended'` guard and `profile.email_verified` assertion before session issuance.
- **Regression Test**: `scripts/test-audit-full-matrix.ts:L500` (`OAUTH-01..02`).
- **Verification Result**: **VERIFIED FIXED (PASS)**.

---

### BUG-SEC-004: Insecure Direct Object Reference (IDOR) on Staff, Services & Agency Domains
- **Category**: Security / Multi-Tenancy
- **Severity**: High
- **Priority**: P1
- **Affected Route / Service**: `src/server/actions/staff.ts`, `src/server/actions/services.ts`, `src/server/actions/agency.ts`
- **User Impact**: Tenant A could query or delete services and staff belonging to Tenant B by guessing UUIDs.
- **Business Impact**: Cross-tenant data breach violating tenant isolation SLA.
- **Reproduction Procedure**: Call `getStaffAction({ orgId: foreignOrgId })` without membership in `foreignOrgId`.
- **Expected Behavior**: Server throws `AuthorizationError: Access denied`.
- **Actual Behavior (Before Fix)**: Server accepted `orgId` without validating that the authenticated caller belonged to `orgId`.
- **Root Cause**: Absence of `requireOrganizationAccess()` check before querying database.
- **Implemented Fix**: Integrated `requireOrganizationAccess(session.userId, orgId)` on all mutation and query actions.
- **Regression Test**: `scripts/test-audit-full-matrix.ts:L330` (`IDOR-01..04`).
- **Verification Result**: **VERIFIED FIXED (PASS)**.

---

### BUG-SEC-005: Privilege Escalation — Administrator Suspending or Deleting Organization Owner
- **Category**: Security / Authorization
- **Severity**: High
- **Priority**: P1
- **Affected Route / Service**: `src/server/actions/admin.ts` (`suspendUserAction`, `deleteUserAction`)
- **User Impact**: A lower-level administrator could take over an organization by suspending or deleting the legitimate business Owner.
- **Business Impact**: Hostile takeover of business accounts.
- **Reproduction Procedure**: Call `suspendUserAction` targeting the organization Owner's user ID while authenticated as an `admin` role.
- **Expected Behavior**: Action rejected: Owner cannot be suspended or deleted by administrators.
- **Actual Behavior (Before Fix)**: The action permitted user suspension based purely on caller having the `admin` flag.
- **Root Cause**: Missing role-hierarchy invariant check (`targetUser.role !== 'owner'`).
- **Implemented Fix**: Added explicit guard preventing any non-owner or co-admin from modifying the primary Organization Owner.
- **Regression Test**: `scripts/test-audit-full-matrix.ts:L420` (`PRIV-03..04`).
- **Verification Result**: **VERIFIED FIXED (PASS)**.

---

### BUG-ROUTE-001: Broken Route Link to Deprecated Voice Settings
- **Category**: Navigation / Routing
- **Severity**: Medium
- **Priority**: P2
- **Affected Route / Service**: `src/components/dashboard/widgets/DailyBriefWidget.tsx`
- **User Impact**: Clicking "Voice Setup" on the dashboard Daily Brief resulted in a 404 page.
- **Business Impact**: Friction during initial customer activation.
- **Reproduction Procedure**: Navigate to `/dashboard`, click voice setup link in `DailyBriefWidget`.
- **Expected Behavior**: Redirects to canonical `/voice/settings`.
- **Actual Behavior (Before Fix)**: Directed to non-existent `/settings/voice`.
- **Root Cause**: Hardcoded stale route string prior to route consolidation.
- **Implemented Fix**: Updated `href` attribute to `/voice/settings`.
- **Regression Test**: `scripts/test-route-integrity.ts`.
- **Verification Result**: **VERIFIED FIXED (1,780/1,780 ROUTES PASS)**.

---

### BUG-A11Y-001 to BUG-A11Y-006: Non-Interactive `<div>` Clickables & Missing Keyboard Listeners (WCAG 2.2 AA)
- **Category**: Accessibility / WCAG 2.2
- **Severity**: Medium
- **Priority**: P2
- **Affected Files**:
  - `src/app/integrations/page.tsx`
  - `src/components/forms/payment-providers-client.tsx`
  - `src/components/intelligence/IntelligenceDashboardClient.tsx`
  - `src/app/(dashboard)/appointments/page.tsx`
  - `src/app/(dashboard)/inbox/page.tsx`
  - `src/components/dashboard/widgets/SmartNotificationsWidget.tsx`
- **User Impact**: Keyboard and screen-reader users could not activate integration nodes, dismiss modals, select inbox conversations, or close notification popovers.
- **Business Impact**: Non-compliance with WCAG 2.2 AA and accessibility requirements.
- **Reproduction Procedure**: Run `npx tsx scripts/doctor/index.ts --rule accessibility`.
- **Expected Behavior**: All interactive click listeners are attached to semantic `<button>` elements with keyboard focus and ARIA attributes.
- **Actual Behavior (Before Fix)**: 8 violations where `<div onClick={...}>` was used without `role="button"` or `tabIndex`.
- **Root Cause**: Legacy layout scaffolding using clickable container divs.
- **Implemented Fix**: Replaced divs with `<button type="button">`, added accessible modal backdrops with `aria-label="Close dialog"`, and added `Escape` key handlers.
- **Regression Test**: `npx tsx scripts/doctor/index.ts --rule accessibility`.
- **Verification Result**: **VERIFIED FIXED (0 VIOLATIONS, 100% PASS)**.

---

### BUG-ARCH-001: Rogue Server Actions File in Next.js App Router Directory
- **Category**: Architecture / Routing
- **Severity**: Low
- **Priority**: P3
- **Affected Route / Service**: `src/app/actions/progress.ts`
- **User Impact**: Potential route pollution or bundling overhead in Next.js App Router.
- **Business Impact**: Violation of codebase architectural conventions.
- **Reproduction Procedure**: Run `npx tsx scripts/doctor/index.ts --rule routing`.
- **Expected Behavior**: All server actions live in `src/server/actions/`.
- **Actual Behavior (Before Fix)**: `progress.ts` was placed inside `src/app/actions/`, which contains no Next.js route files.
- **Root Cause**: Developer placed server action in `src/app/actions` instead of `src/server/actions`.
- **Implemented Fix**: Migrated file to `src/server/actions/progress.ts`, updated imports in `use-smart-notifications.ts` and `use-notification-engine.ts`, deleted legacy folder.
- **Regression Test**: `npx tsx scripts/doctor/index.ts --rule routing`.
- **Verification Result**: **VERIFIED FIXED (100% ROUTING PASS)**.

---

### BUG-ARCH-002: Public Route Collision Risk for Widget-Frame Components
- **Category**: Architecture / Routing
- **Severity**: Low
- **Priority**: P3
- **Affected Route / Service**: `src/app/widget-frame/components/`
- **User Impact**: Subfolder in app router was not opted out of routing, creating risk of unexpected route exposure.
- **Business Impact**: Unintended route exposure in production builds.
- **Reproduction Procedure**: Inspect folders inside `src/app/widget-frame/`.
- **Expected Behavior**: Internal components use Next.js private folder conventions (`_components`).
- **Actual Behavior (Before Fix)**: Folder was named `components` without underscore prefix.
- **Implemented Fix**: Renamed to `src/app/widget-frame/_components` and updated imports in `src/app/widget-frame/page.tsx`.
- **Regression Test**: `npx tsx scripts/doctor/index.ts --rule routing`.
- **Verification Result**: **VERIFIED FIXED (PASS)**.
