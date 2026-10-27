# Operator — Confirmed Visual Defects Audit Report

**Audit Date:** October 2026  
**Methodology:** Actual browser rendering inspection (Port 3033 via Playwright), computed style inspection, route inventory analysis, and DOM state verification.  
**Reference Baseline:** Visual screenshots captured in `docs/audits/screenshots/before/` (`appointments.png`, `voice.png`, `kb.png`, `inbox.png`, `pricing.png`, `checkout-demo.png`).

---

## Executive Summary

The previous UI pass attempted to solve visual consistency primarily by tokenizing arbitrary CSS strings. However, tokenization without visual verification created acute visual regressions:
1. **Primary Button Color Collision:** `--btn-primary-bg` was set to `#ffffff` (white) in dark mode and `#0A0E17` (black) in light mode, overriding the established Operator brand identity (Purple `#664de6` / `hsl(var(--primary))`). Developers working around this began hardcoding disparate color classes (`bg-primary`, `bg-indigo-600`, `bg-blue-500`, `bg-rose-600`), resulting in primary actions randomly appearing white, black, blue, or purple across screens.
2. **Broken Tailwind Arbitrary Value Truncation:** A prior automated regex substitution stripped `shadow-[` from multiple components, leaving naked syntax fragments (`0_0_8px_rgba(...)`, `inset_0_1px_0_rgba(...)`) directly in rendered class names.
3. **Severe Canvas Void & Layout Imbalance:** In routes such as `/voice`, `/appointments`, and `/inbox`, small card clusters left 75%–85% of the viewport as an empty, unformatted dark void.
4. **Dark-Mode Color Inversion in Triage Actions:** On `/appointments`, action buttons used light-mode pastel classes (`bg-emerald-50/30 text-emerald-500`, `border-slate-200/40 bg-slate-50/30`), rendering washed-out, illegible gray/green rectangles on dark backgrounds.
5. **Component Boundary Misuse:** In `phone-numbers-client.tsx`, interactive toggles and footers were wrapped inside `<Badge variant="soft">`, destroying container layout hierarchy.

---

## Detailed Prioritized Defect Inventory

### Defect 1: Primary Action Button Color & Role Inconsistency (Severity: Critical)
- **Observed Behavior:**
  - On `/voice`: "Connect Phone Line" renders as a stark white pill button with dark text.
  - On `/checkout-demo`: "Pay ₹... with Razorpay" renders as a stark white pill button.
  - On `/dashboard`: "Test AI Call/Chat" renders as a rounded-xl purple button with custom `bg-primary text-primary-foreground`.
  - On `/appointments`: Dialog confirm button renders as purple with custom `bg-primary hover:bg-primary-light`; cancel button renders as hardcoded `bg-rose-600`.
  - On `/pricing`: Billing cycle toggle buttons alternate between white and translucent pill buttons.
- **Root Cause:**
  - `src/app/globals.css` (lines 94–108) defined `--btn-primary-bg: #ffffff; --btn-primary-fg: #0A0E17;` for dark mode.
  - `src/components/shared/button.tsx` (lines 58–69) bound `default` variant to `bg-[var(--btn-primary-bg)]`, expecting it to be purple ("PRIMARY — Brand identity. Purple. White text. Never black.").
  - Result: The shared `Button` was white, while custom buttons were purple, blue, or indigo.
- **Impact:** High cognitive friction. Users cannot identify the single authoritative primary action on any given page.

### Defect 2: Broken CSS Shadow Syntax in Rendered Markup (Severity: High)
- **Observed Behavior:**
  - In `src/app/(dashboard)/kb/kb-client.tsx` (lines 631, 636), `src/components/forms/qualification-builder.tsx` (line 225), and `src/components/marketing/visualizations/dashboard-preview.tsx` (lines 498, 864, 887, 993, 1003, 1034, 1113, 1126, 1240, 1293), class strings contain unparsed tokens like `0_0_8px_rgba(var(--primary-rgb),0.5)]` and `inset_0_1px_0_rgba(255,255,255,0.05)]`.
- **Root Cause:**
  - Automated find-and-replace stripped `shadow-[` prefix without validating rendered CSS output.
- **Impact:** Active tab indicators and glow accents fail to render; invalid CSS classes pollute DOM.

### Defect 3: Massive Canvas Void & Empty Telephony Layout in Voice AI (Severity: High)
- **Observed Behavior:**
  - Visual verification screenshot `docs/audits/screenshots/before/voice.png` shows a single phone line card positioned at the top left of an otherwise vacant black viewport (approx. 85% width by 70% height empty).
  - Telephony operational metadata (carrier status, STIR/SHAKEN verification, speech latency, inbound routing rules, call simulation) is absent.
- **Root Cause:**
  - `src/components/forms/phone-numbers-client.tsx` simply renders a 3-column grid without side panels, telemetry summaries, or call simulation tools.
- **Impact:** Voice management feels incomplete, prototype-grade, and unbalanced on modern desktop displays.

### Defect 4: Inverted Light-Mode Classes on Appointments Triage Controls (Severity: High)
- **Observed Behavior:**
  - Visual verification screenshot `docs/audits/screenshots/before/appointments.png` reveals triage buttons ("Confirm", "Complete", "No Show", "Reschedule", "Cancel Booking") with `bg-*-50/30` pastel backgrounds and `border-slate-200/40` light-mode borders.
  - When rendered in Operator's dark theme, these actions appear chalky, low-contrast, and visually disconnected from the design system.
- **Root Cause:**
  - Inline Tailwind classes in `src/app/(dashboard)/appointments/page.tsx` (lines 587–635) bypassed semantic button variants (`success`, `info`, `warning`, `destructive`, `outline`).
- **Impact:** Degraded readability and accessibility failure for triage workflows.

### Defect 5: Plan Selector Button Clashing & White CTA on Checkout Demo (Severity: Medium)
- **Observed Behavior:**
  - Visual verification screenshot `docs/audits/screenshots/before/checkout-demo.png` shows plan cards rendered using `<Button>` elements that inherit default button padding, pill shape, and white primary CTA treatment.
  - Left column plan selector cards have inconsistent border states with the right-column order summary.
- **Root Cause:**
  - `src/app/checkout-demo/page.tsx` instantiated shared `<Button>` with conflicting inline classes instead of structured interactive card surfaces.
- **Impact:** Misleading click targets and lack of clear hierarchy between selectable options and checkout execution.

### Defect 6: Knowledge Base Navigation & Container Proportions (Severity: Medium)
- **Observed Behavior:**
  - Visual verification screenshot `docs/audits/screenshots/before/kb.png` shows the left category sidebar with flat divider lines, unaligned active tab markers, and cramped metric cards with weak visual depth.
- **Root Cause:**
  - In `src/app/(dashboard)/kb/kb-client.tsx`, the tab container used an improperly constrained ScrollArea, and active indicator pills lacked proper shadow and contrast tokens.
- **Impact:** Disjointed hierarchy between document navigation and document management viewport.

---

## Action Plan Mapping

| Defect # | Target File(s) | Fix Strategy |
| :--- | :--- | :--- |
| **Defect 1** | `src/app/globals.css`<br>`src/components/shared/button.tsx` | Restore Operator Brand Purple (`#664de6`) as `--btn-primary-bg` across light & dark modes with white text; add explicit `contrast` variant for monochrome needs; standardize `radius-lg` as default button shape. |
| **Defect 2** | `src/app/(dashboard)/kb/kb-client.tsx`<br>`src/components/marketing/visualizations/dashboard-preview.tsx`<br>`src/components/forms/qualification-builder.tsx` | Restore `shadow-[...]` prefix to all truncated arbitrary shadow classes. |
| **Defect 3** | `src/components/forms/phone-numbers-client.tsx`<br>`src/app/(dashboard)/voice/page.tsx` | Redesign Voice management into a 2-column Telephony Operations Center with carrier telemetry stats bar, enhanced phone line cards, and a live AI Inbound Simulator & Routing rules panel. |
| **Defect 4** | `src/app/(dashboard)/appointments/page.tsx` | Replace hardcoded `bg-*-50/30` classes with shared semantic `Button` variants (`variant="success"`, `"info"`, `"warning"`, `"destructive"`, `"outline"`); polish modal footers and triage layout. |
| **Defect 5** | `src/app/checkout-demo/page.tsx`<br>`src/components/billing/razorpay-checkout-button.tsx` | Refactor plan selectors into dedicated selectable surface cards; ensure Razorpay checkout CTA displays authoritative branded primary action styling. |
| **Defect 6** | `src/app/(dashboard)/kb/kb-client.tsx` | Fix sidebar layout, card depth tokens, active tab glow, and metric card typography. |
