# Purpose: Business Onboarding

## Business Objective
To convert a prospective lead into an active, paying tenant with a properly configured environment as quickly and seamlessly as possible. A frictionless onboarding process directly increases the trial-to-paid conversion rate.

## Why Module Exists
When a user signs up, the system must establish absolute data isolation (a Tenant/Organization), assign the highest level of permissions (Owner) to the creator, and gather the minimum required data (Timezone, Industry) to configure the AI Receptionist's baseline behavior. Without this module, the platform cannot function securely for multiple businesses.

## Problem Solved
- Manual tenant creation by internal staff is unscalable.
- Users abandoning the platform because they don't know what to configure first.
- AI failures caused by missing foundational data (e.g., booking an appointment without knowing the business's timezone).

## Success Criteria
- A user can transition from the marketing landing page to a fully provisioned dashboard in under 3 minutes.
- The system correctly creates the `Organization`, links the `User` as an `Owner`, and sets the default `businessSettings`.
- Zero orphaned users (users without an associated organization).

## KPIs
- **Onboarding Completion Rate**: Percentage of users who start the signup flow and successfully reach the dashboard. Target: >85%.
- **Time to First Value**: Average time from signup to the first AI conversation. Target: < 15 minutes.
- **Drop-off Rate per Step**: Identifies exactly which screen in the onboarding wizard causes users to abandon the process.
