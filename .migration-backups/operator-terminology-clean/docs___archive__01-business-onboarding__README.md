# Business Onboarding

## Purpose
This module handles the critical first steps of a new business signing up for the AI Receptionist SaaS Platform. It covers registration, initial tenant provisioning, organizational setup, and the foundational configuration required before the AI can be activated.

## Scope
- Business Owner Registration (Email/Password & SSO).
- Email Verification.
- Tenant/Organization Creation (Database Provisioning).
- Initial Business Profile Setup (Name, Timezone, Industry).
- Selection of a Subscription Plan.
- Guided Tour / Onboarding Wizard.

## Dependencies
- Authentication Provider (Clerk/Auth0)
- Database (PostgreSQL/Drizzle) for tenant provisioning.
- Billing Provider (Stripe) for subscription selection.

## Related Modules
- [02-organization](../02-organization/README.md): Onboarding seeds the organization data.
- [16-payments](../16-payments/README.md): Subscription selection during onboarding.
- [20-security](../20-security/README.md): Authentication and RBAC initialization.

## Navigation
- Previous: None (Entry point)
- Next: [02-organization](../02-organization/README.md)

## Implementation Order
1. Database Schema (`organizations`, `users`, `subscriptions`).
2. Authentication Integration (Sign Up, Verify).
3. Onboarding Wizard UI (Industry, Timezone, Business Name).
4. Tenant Provisioning Service (Creating default roles and settings).
5. Stripe Checkout Integration (Plan selection).
