# Operator — Data Source Map

**Document Version:** 1.0.0  
**Architectural Standard:** Authoritative Single Source of Truth (SSOT)  
**Security Scope:** Strict Tenant Isolation Derived Exclusively from Server Authentication Context

---

## 1. Overview & Architectural Rules

Every screen, metric, widget, and form in Operator must derive its state exclusively from trusted server-side sources. Client-side local state may be used only for transient UI interactions (accordion expansion, modal visibility, optimistic local typing).

### Key Data Invariants:
1. **Tenant Isolation:** The active tenant identifier (`organizationId`) is ALWAYS derived from the verified session in `requireOrganizationAccess()`. It is never accepted from unverified client parameters.
2. **Zero Fake Fallbacks:** If a database query yields zero records, the UI renders an honest empty state with clear calls to action. It must never populate placeholder arrays or synthetic metrics.
3. **Honest Failure States:** If an external integration or payment provider is unconfigured, the UI presents an unconfigured setup card rather than simulated active badges.

---

## 2. Feature-to-Source Mapping

### 2.1 Dashboard & Operational KPIs

| UI Feature / Metric | Authoritative Database Tables & Fields | Server Action / Query | Empty State Behavior | Error State Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Appointments Today** | `appointments` table (`status != 'cancelled'`, `startTime` within tenant calendar day) | `getAppointmentsAction()` in `src/server/actions/appointments.ts` | Displays `0` with "No appointments booked today. Share your booking link to accept bookings." | Displays error banner with retry button |
| **Conversations Handled** | `conversations` table (`organizationId = currentOrgId`) | `getConversationsAction()` in `src/server/actions/conversations.ts` | Displays `0` with "No conversations logged yet." | Error toast + retry |
| **Call Volume** | `call_sessions` table (`organizationId = currentOrgId`) | `voiceRepository.getCallSessions()` in `src/server/actions/voice.ts` | Displays `0` with "No calls recorded. Link a phone number to start receiving calls." | Error banner |
| **Next Best Action Widget** | `RecommendationEngine` evaluated dynamically over tenant's `businessSettings`, `appointments`, and `knowledge_documents` | `getRecommendedActionsAction()` in `src/server/actions/dashboard.ts` | "You're all caught up. No pending actions right now." with `CheckCircle2` icon. | Silent graceful fallback to empty widget |
| **Daily Brief Widget** | Aggregated count of unhandled voicemails (`voicemail_messages`), upcoming appointments (`appointments`), and escalated conversations (`conversations`) | `getDashboardMetricsAction()` | "Your schedule is clear for today. All systems operational." | Error banner |

---

### 2.2 Billing, Plans & Financial Metrics

| UI Feature / Metric | Authoritative Source Tables & Fields | Server Action / Provider Service | Empty State Behavior | Error State Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Current Subscription State** | `subscriptions` table (`organizationId`, `planId`, `status`, `currentPeriodEnd`, `trialEndsAt`, `cancelAtPeriodEnd`) | `subscriptionEngine.getSubscriptionStatus()` in `src/server/services/billing/subscription-engine.ts` | Defaults to Starter plan in `TRIALING` state with dynamic 14-day countdown | Displays payment configuration warning |
| **Available Usage Counters** | `usageCounters` in `billing_accounts` (`conversationsCount`, `callMinutesCount`, `calendarCount`) | `billingRepository.getUsageCounters()` in `src/server/actions/billing.ts` | Displays `0 / <planLimit>` with honest progress bar | Error alert |
| **Invoices History** | `invoices` table (`organizationId`, `amount`, `status`, `pdfUrl`, `createdAt`) | `billingRepository.getInvoices()` | "No past invoices available. Invoices will appear here once billing cycles complete." | Error banner |
| **Payment Provider Status** | `business_payment_settings` table (`providerId = 'razorpay'`, `credentials`, `connectionStatus`) | `getPaymentProviderStatus("razorpay", orgId)` in `src/server/services/billing/config.ts` | Displays "Not Configured. Add Razorpay Key ID and Secret to enable live checkouts." | Displays "Invalid Configuration" with missing field list |
| **MRR / ARR Analytics** | Calculated from active `subscriptions` (`planId` mapped to `PLAN_MONTHLY_VALUES`) and actual `payments` | `financialMetricsService.calculateRealtimeMetrics()` in `src/server/services/billing/financial-metrics.ts` | Displays `$0.00` with flat chart. Zero synthetic waves. | Displays error card |

---

### 2.3 Voice Cockpit & Telephony

| UI Feature / Metric | Authoritative Source Tables & Fields | Server Action / Service | Empty State Behavior | Error State Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Virtual Phone Lines** | `phone_numbers` table (`organizationId`, `phoneNumber`, `name`, `status`, `isRecordingEnabled`) | `getPhoneNumbersAction()` in `src/server/actions/voice.ts` | "No Active Phone Lines. Link an E.164 phone line to deploy your voice assistant." | Error banner |
| **Call Sessions Log** | `call_sessions` table (`callerNumber`, `recipientNumber`, `durationSeconds`, `status`, `direction`, `createdAt`) | `getCallSessionsAction()` in `src/server/actions/voice.ts` | "No call records found. Inbound and outbound calls will appear here in real time." | Error toast |
| **Voicemails & Transcripts** | `voicemail_messages` table (`sessionId`, `recordingUrl`, `transcriptText`, `summaryText`, `callbackStatus`) | `voiceRepository.getVoicemails()` in `src/server/actions/voice.ts` | "No pending voicemails. All customer calls handled." | Error toast |
| **Voice Analytics KPIs** | `voice_analytics` table (`callsAnswered`, `callsMissed`, `averageDurationSeconds`, `csatAverage`) | Dynamically computed from `sessions` and `initialAnalytics` in `VoiceCockpitClient` | Displays `0` calls, `0.0%` conversion, `0s` duration, `N/A` CSAT when no calls recorded. | Fallback to safe defaults |

---

### 2.4 Knowledge Base & Ingestion

| UI Feature / Metric | Authoritative Source Tables & Fields | Server Action / Service | Empty State Behavior | Error State Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Knowledge Categories** | `knowledge_categories` table (`organizationId`, `name`, `description`, `icon`) | `getKnowledgeCategoriesAction()` in `src/server/actions/kb.ts` | "No categories created. Create categories to organize your business documents." | Error toast |
| **Knowledge Documents** | `knowledge_documents` table (`categoryId`, `title`, `content`, `tokenCount`, `status`) | `getKnowledgeDocumentsAction()` in `src/server/actions/kb.ts` | "No documents uploaded. Add FAQs, pricing sheets, or upload PDF/DOCX manuals." | Error toast |
| **Document Search Results** | Vector embeddings / semantic search over `knowledge_documents` scoped to `organizationId` | `searchKnowledgeBaseAction()` in `src/server/actions/kb.ts` | "No knowledge articles match your search term. Try another query." | Error notification |
| **File Upload Preview** | Client FileReader for raw text; server-side queue for binary documents | Direct upload form in `src/app/(dashboard)/kb/kb-client.tsx` | N/A (file upload prompt) | "File type not supported. Allowed formats: PDF, DOCX, TXT, MD, CSV." |

---

### 2.5 Agency White-Label & Resellers

| UI Feature / Metric | Authoritative Source Tables & Fields | Server Action / Service | Empty State Behavior | Error State Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Custom Domains** | `agency_domains` table (`agencyId`, `domainName`, `sslStatus`, `type`) | `agencyRepository.getDomains()` in `src/server/actions/agency.ts` | "No custom domains connected. Add a domain to white-label your portal." | Error toast |
| **Domain SSL Status** | Real DNS resolution via Node.js `dns/promises` (`resolveCname` / `lookup`) | `verifyDomainSslAction()` in `src/server/actions/agency.ts` | Displays `pending` until verified | Transitions to `failed` with actionable message if DNS record is missing |
| **Agency Clients** | `agency_clients` and linked `workspaces` tables | `getAgencyClientsAction()` in `src/server/actions/agency.ts` | "No client workspaces provisioned yet. Create a workspace to onboard a new client." | Error alert |
