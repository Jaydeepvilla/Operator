# User Stories: Business Onboarding

## US-BO-01: User Registration
**As a** prospective Business Owner,
**I want** to create an account using my email and a secure password or Google SSO,
**So that** I can access the platform securely.

**Acceptance Criteria**:
- Given the user is on the signup page, when they submit valid credentials, a verification email is sent.
- Given the user clicks Google SSO, they are authenticated without a separate password.
- Passwords must meet security complexity requirements (8+ chars, 1 number, 1 special).
**Priority**: Critical

## US-BO-02: Email Verification
**As a** registering User,
**I want** to verify my email address via a magic link or OTP code,
**So that** my account is secured and spam accounts are prevented.

**Acceptance Criteria**:
- Given an unverified user logs in, they are blocked by a "Verify Email" screen.
- Given the user enters the correct 6-digit OTP from their email, they proceed to the Organization Setup.
**Priority**: Critical

## US-BO-03: Organization Provisioning
**As a** verified User,
**I want** to enter my Business Name, Industry, and Timezone,
**So that** the system can tailor the AI Receptionist to my specific needs.

**Acceptance Criteria**:
- Given the user is on the setup step, when they submit the form, an `Organization` record is created.
- The user is automatically assigned the `Owner` role for this new organization.
- Default business settings (hours, AI tone) are generated based on the selected Industry.
**Priority**: Critical

## US-BO-04: Plan Selection
**As an** Owner,
**I want** to view available subscription tiers and select one,
**So that** I can unlock the platform's features for my business.

**Acceptance Criteria**:
- User sees clearly defined tiers (e.g., Starter, Professional, Enterprise).
- Selecting a plan redirects to a Stripe Checkout session.
- Upon successful checkout, the organization's subscription status updates to `active`.
**Priority**: High

## US-BO-05: Onboarding Completion
**As a** new Owner,
**I want** to be directed to a tailored welcome dashboard upon completing setup,
**So that** I know exactly what steps to take next (e.g., adding services, testing the AI).

**Acceptance Criteria**:
- The user is redirected to `/dashboard`.
- A visual progress indicator shows "Setup 20% Complete" guiding them to the next modules.
**Priority**: Medium
