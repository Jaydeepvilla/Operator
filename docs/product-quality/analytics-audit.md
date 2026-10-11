# Operator — Product Analytics & Business Intelligence Audit

## 1. Executive Summary

This audit evaluates the analytics pipeline, business metric calculations, event instrumentation, and tenant isolation within Operator.

A central principle of Operator's SaaS philosophy is **Metric Grounding**: analytics displayed to business owners must derive directly from authoritative operational database records (e.g., `appointments`, `subscriptions`, `voice_calls`) rather than synthetic mock numbers or client-side estimates.

---

## 2. SaaS Business Metrics & Calculation Formulas

| Metric Name | Business Definition | Formula | Authoritative Source |
| :--- | :--- | :--- | :--- |
| **Monthly Recurring Revenue (MRR)** | Predictable monthly subscription revenue from active paying tenants. | $\sum (\text{Plan Price for status = 'active'})$ | `subscriptions` table (synced via Stripe Webhooks) |
| **Annual Recurring Revenue (ARR)** | Annualized run-rate of active subscriptions. | $\text{MRR} \times 12$ | Derived from MRR |
| **Trial-to-Paid Conversion Rate** | Percentage of trialing workspaces that convert to paying subscribers. | $\frac{\text{Subscriptions converted to 'active'}}{\text{Total trial subscriptions}} \times 100$ | `subscriptions` history events |
| **Conversations Handled** | Total inbound calls, SMS, WhatsApp, and Web widget interactions processed. | $\text{Count of unique conversation sessions}$ | `voice_calls` + message thread logs |
| **Booking Conversion Rate** | Percentage of handled conversations that successfully secured an appointment. | $\frac{\text{Appointments created with source = 'ai_receptionist'}}{\text{Total AI conversation sessions}} \times 100$ | `appointments` inner joined to `voice_calls` |
| **Human Escalation Rate** | Percentage of conversations handed off to human staff. | $\frac{\text{Sessions with escalationTriggered = true}}{\text{Total sessions}} \times 100$ | `voice_calls.escalated` flag |
| **Unresolved Inquiry Rate** | Conversations where the caller asked questions not present in knowledge base. | $\frac{\text{Sessions flagged with knowledge_gap = true}}{\text{Total sessions}} \times 100$ | `ai_audit_logs.knowledge_gap` |

---

## 3. Event Tracking Architecture & Tenant Isolation

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EVENT INGESTION PIPELINE                        │
├────────────────────────────────────────────────────────────────────────┤
│  Client / Telephony Event                                              │
│    │                                                                   │
│    ▼                                                                   │
│  [Event Validator (Zod Schema Validation)]                             │
│    │                                                                   │
│    ▼                                                                   │
│  [Tenant Scoping Guard (Enforces organizationId matching caller)]       │
│    │                                                                   │
│    ▼                                                                   │
│  [Deduplication Cache (UUID eventId / idempotency key)]                │
│    │                                                                   │
│    ▼                                                                   │
│  [Operational Database Persistence (PostgreSQL)]                       │
│    │                                                                   │
│    ▼                                                                   │
│  [Aggregate Query Engine with Timezone Normalization]                  │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Technical Invariants:
1. **Tenant Isolation**: Every analytics query must include `WHERE organization_id = $authOrgId`. Cross-tenant queries are blocked at the ORM layer.
2. **Timezone Normalization**: Appointments and call events are stored in UTC timestamps and projected into the tenant's configured timezone (`organization.timezone`) for daily brief and reporting aggregations.
3. **Event Deduplication**: Telephony webhooks and chat events carry deterministic event IDs (`eventId`), preventing duplicate metric counts on network retries.

---

## 4. Verification of Current Dashboards & Seed Data

| Dashboard / Widget | Current Data Source | Status & Truthfulness |
| :--- | :--- | :--- |
| **Daily Brief Widget** | Real queries to `appointments` and `voice_calls` for today's date window | **Real Data** |
| **Live Call Feed** | Real queries to `voice_calls` ordered by `created_at DESC` | **Real Data** |
| **Billing Usage Bars** | Computed dynamically from `subscriptions` plan limits vs. monthly call counts | **Real Data** |
| **Intelligence Charts** | Aggregated from conversation intent logs | **Real Data** (falls back gracefully to zero-state when empty) |
| **Admin Platform Metrics** | Aggregated across all active `organizations` and `subscriptions` | **Real Data** (restricted to platform admins) |

---

## 5. Missing Instrumentation & Roadmap

1. **Granular Voice Latency Tracking**:
   - *Current State*: Call duration is recorded, but Time-to-First-Token (TTFT) and Voice Synthesizer roundtrip latency are logged only in raw debug output.
   - *Recommendation*: Add explicit `time_to_first_byte_ms` and `transcription_latency_ms` columns to `voice_calls`.
2. **Funnel Drop-Off Analytics**:
   - *Current State*: Successful bookings and dropped calls are logged.
   - *Recommendation*: Track intermediate slot selection steps within the widget to measure where users abandon scheduling.
