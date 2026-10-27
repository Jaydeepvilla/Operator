# Operator — Premium Frontend Transformation: Findings & Defect Inventory

## Executive Summary

As part of the **OPERATOR — PREMIUM FRONTEND TRANSFORMATION**, a comprehensive audit was executed across the entire product surface. This covered the public landing page, authentication workflows, onboarding flow, core dashboard suite (analytics, appointments, contacts, automations, escalations, templates, widget builder, voice cockpit), and the agency portal.

The audit uncovered several categories of visual, architectural, and design-token defects that previously degraded the user experience and prevented full WCAG 2.2 AA compliance:
1. **Borders & Visual Outlines**: 21 non-standard border declarations violating the unified 1px border rule.
2. **Component Reuse & HTML Tag Leaks**: 176 instances where raw native HTML elements (`<button>`, `<input>`, `<select>`) were used in dashboard pages instead of shared, tokenized design system primitives (`<Button>`, `<Input>`, `<NativeSelect>`).
3. **Typography Scale Violations (< 12px)**: 572 occurrences of sub-12px text sizes (`text-[9px]`, `text-[10px]`, `text-[11px]`) across 69 files, causing micro-text legibility and accessibility failures.
4. **Excessive Font Weights**: 5 instances of `font-extrabold` violating the design system constraint capping font weight at 600 (`font-semibold`).
5. **Arbitrary Design Values**: Arbitrary z-indices (`z-[100]`), arbitrary modal offsets (`left-[50%]`), arbitrary box shadows, and inline styles in client forms.
6. **SEO & Metadata**: Sentry example page lacking standard Next.js App Router metadata and containing Pages Router `<Head>` tags.

---

## 1. Route & Component Surface Inventory

Every route was audited for layout consistency, semantic tokens, typography, and interactive behavior:

| Route | View Category | Primary Purpose | Initial Defects Observed |
|---|---|---|---|
| `/` | Marketing | High-converting landing & hero | Arbitrary line-height (`leading-[1.05]`), raw button elements |
| `/pricing` | Marketing | Tier matrix & billing comparisons | Arbitrary container min-width (`min-w-[640px]`), raw buttons |
| `/features` | Marketing | AI Receptionist feature breakdown | Raw `<button>` elements, sub-12px badges |
| `/integrations` | Marketing | Ecosystem & CRM connectors | Sub-12px category badges, raw buttons |
| `/login`, `/register` | Auth | Authentication & session entry | Arbitrary negative spacing (`-space-x-1.5`), raw inputs |
| `/two-factor` | Auth | 2FA verification flow | Raw inputs and submit buttons |
| `/onboarding` | Core Flow | Business & voice persona wizard | Raw button triggers, inline styles |
| `/dashboard` | Dashboard | Daily operations, KPIs & quick actions | Sub-12px tags in widgets, raw inputs, raw selects |
| `/inbox` | Dashboard | Multi-channel conversation stream | 50 sub-12px timestamp/status classes, raw buttons |
| `/appointments` | Dashboard | Calendar, schedule & reminders | Sub-12px status labels, raw action buttons |
| `/contacts` | Dashboard | Omnichannel lead CRM | Raw buttons, sub-12px tags, raw table element |
| `/templates` | Dashboard | Omnichannel message template builder | Raw `<select>` dropdowns, raw buttons, sub-12px text |
| `/widget` | Dashboard | Embeddable live reception widget | Sub-12px preview badges, raw button triggers |
| `/admin` | Administration | User management, security & roles | Raw `<select>` status filter, 35 sub-12px badges |
| `/agency/dashboard` | Agency Portal | Multi-tenant client fleet oversight | Dynamic inline styles, sub-12px status indicators |
| `/sentry-example-page` | Diagnostics | Telemetry & error monitoring | Missing App Router metadata export; legacy `<Head>` tag |

---

## 2. Confirmed Defect Categories & Root Causes

### A. Border Width & Style Inconsistencies (21 Violations)
- **Root Cause**: Ad-hoc introduction of `border-2`, `border-l-4`, and `border-dashed` in custom widgets and marketing blocks instead of utilizing the single source of truth 1px border design system rule.
- **Affected Files**: 14 files including `product-simulation.tsx`, `auth-showcase-panel.tsx`, `DailyBriefWidget.tsx`, `kpi-card.tsx`.

### B. Raw HTML Primitive Usage (176 Violations)
- **Root Cause**: Fast feature authoring bypassed `@/components/shared/button` and `@/components/shared/input`. This caused buttons to lack standardized focus rings, accessible active states, and consistent height/padding tokens.
- **Affected Files**: 44 files across dashboard routes, widget components, and auth modals.

### C. Typography Scale Violations (572 Sub-12px Occurrences)
- **Root Cause**: Designers and engineers applied arbitrary Tailwind arbitrary values (`text-[9px]`, `text-[10px]`, `text-[11px]`) for badges, card footers, and timestamp tags.
- **WCAG 2.2 AA Impact**: Text below 12px fails minimum legibility guidelines on standard mobile and desktop displays without excessive zooming.
- **Affected Files**: 69 files (led by `inbox/page.tsx` [50], `admin-user-panel.tsx` [35], `features/page.tsx` [34]).

### D. Excessive Font Weights (5 Violations)
- **Root Cause**: Use of `font-extrabold` (800) in headings and badges, conflicting with the established Geist font hierarchy which enforces a maximum weight of 600 (`font-semibold`).
- **Affected Files**: `voice-ai-flow.tsx`, `billing-portal-client.tsx`, `DailyBriefWidget.tsx`, `QuickActionsWidget.tsx`.

### E. Dialog & Modal Centering Irregularities
- **Root Cause**: `src/components/shared/dialog.tsx` used non-standard arbitrary percentage utilities (`left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]`) and custom slide offsets instead of standard Tailwind utilities (`left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`).

### F. Dropdown & Navigation Z-Index Inflation
- **Root Cause**: `notifications-dropdown.tsx`, `user-avatar-menu.tsx`, and `org-switcher.tsx` specified `z-[100]`, conflicting with the standardized header/shell z-index scale (`z-50`).

### G. Unhandled Native Select Controls
- **Root Cause**: Native `<select>` elements in `localization-settings-client.tsx`, `templates/page.tsx`, `admin-user-panel.tsx`, and `QuickActionsWidget.tsx` lacked the standardized design token styling and accessible wrapper primitives provided by `@/components/shared/native`.
