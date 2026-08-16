# Product Scope

## In Scope (Platform Core)
- Multi-tenant architecture and organization management.
- Role-based access control (RBAC) for Owner, Admin, Manager, and Staff.
- Core entity management: Services, Staff, Customers, and Appointments.
- Complex availability engine (handling schedules, exceptions, holidays, and buffer times).
- Conversational AI Receptionist (Text-based) via Web Widget.
- Knowledge base ingestion (text, URL) for AI training context.
- Appointment lifecycle management (booking, rescheduling, cancellation).
- External Calendar Synchronization (Google Calendar).
- Unified Inbox for viewing and taking over AI conversations.
- Basic reporting and analytics dashboards.

## Out of Scope (Current Focus)
- Internal payroll or staff HR management.
- Complex inventory or supply chain management.
- Deep accounting features (general ledger, tax reporting).
- Multi-location/franchise hierarchy management (single organization context only for MVP).
- Physical hardware integration (e.g., point-of-sale terminals, IoT devices).

## Future Scope (Roadmap)
- Voice AI Receptionist (inbound and outbound telephony integration).
- SMS and WhatsApp channel integrations.
- Native payment processing (Stripe integration for deposits and checkouts).
- Outbound marketing campaigns (AI-driven reactivation and promotions).
- External Calendar Synchronization (Outlook/Microsoft 365, Apple Calendar).
- Custom LLM fine-tuning per organization.
- Multi-location nested organizational architecture.

## MVP (Minimum Viable Product)
The MVP proves the core value hypothesis: an AI can accurately read a business schedule, enforce business rules, and successfully book an appointment without human intervention via a web widget.
- Organization and User onboarding.
- Basic Service and Staff setup (fixed weekly schedules).
- AI Web Chat widget.
- RAG-based Knowledge Base (plain text and single URLs).
- Appointment creation and unified inbox view.

## Version 1 (Commercial Launch)
V1 expands the MVP into a commercially viable SaaS product ready for general availability.
- Advanced availability rules (buffers, minimum lead times, date overrides).
- Google Calendar two-way sync.
- Automated email/SMS reminders for appointments.
- Advanced Knowledge Base (PDF uploads, deep website crawling).
- Full Customer CRM profiles merging conversation history and appointment history.
- Subscription billing integration (Stripe/Razorpay) for tenant monetization.

## Version 2 (Scale & Voice)
V2 introduces enterprise-grade reliability, omnichannel presence, and advanced autonomous actions.
- Inbound Voice AI Receptionist (assigning dedicated phone numbers).
- Omnichannel Inbox (SMS, WhatsApp, Instagram DM, Messenger).
- Qualification Flows (structured Q&A for lead scoring).
- Detailed analytics (conversion rates, intent mapping, AI deflection rates).
- Payment processing for appointment deposits.

## Enterprise Features
Designed specifically for high-volume or complex clients.
- Custom domain mapping and white-labeling.
- Single Sign-On (SAML/SSO).
- Dedicated deployment architecture (data residency requirements).
- Advanced audit logging and compliance reporting (HIPAA/SOC2).
- API access and custom webhook configuration for legacy ERP integration.
