# Business Profile Guide

The Business Profile establishes your company's identity, physical presence, operational timezone, and weekly operating hours for the AI receptionist.

**Dashboard route:** `/profile`  
**Database tables:** `business_profiles`, `organizations`, `business_settings`  
**Server action:** `src/server/actions/profile.ts`

---

## Overview

The AI receptionist relies on your Business Profile as the fundamental ground truth when callers ask:
- *"Where is your clinic located?"*
- *"Are you open right now?"*
- *"Can I come in this Saturday?"*
- *"What is your support email?"*

---

## Profile Attributes

| Field | Description | Database Column |
|---|---|---|
| **Business Name** | The official name spoken by the AI during greetings and displayed on widgets. | `organizations.name`, `business_profiles.businessName` |
| **Industry** | The operating vertical (e.g., Dental Clinic, Salon, Law Firm). | `organizations.industry` |
| **Website URL** | Canonical website URL. | `organizations.website` |
| **Contact Phone** | Primary inbound or forwarding phone number. | `business_profiles.contactPhone` |
| **Contact Email** | Primary escalation and notification email. | `business_profiles.contactEmail` |
| **Physical Address** | Street, suite, city, state, and postal code. | `business_profiles.address` |
| **Timezone** | Standard IANA timezone (e.g., `America/New_York`). | `organizations.timezone` |

---

## Operating Hours

Configure your weekly hours under **Profile > Operating Hours**:

1. For each day of the week (Monday through Sunday), specify:
   - **Open Time:** In 24-hour format (e.g., `09:00`).
   - **Close Time:** In 24-hour format (e.g., `17:00`).
   - **Closed Toggle:** Checked if the business is not open on that day.
2. The AI automatically checks this schedule in real time:
   - When a call arrives after closing hours, the receptionist informs the caller that the office is currently closed and offers to book an appointment for the next open business day.

---

## Best Practices

- **Set Exact Timezone:** Ensure your timezone matches your physical location so that appointment slots are never misaligned.
- **Accurate Address:** Include suite or building numbers to ensure patients or clients receive correct directions.
- **Update Holiday Hours:** If your business is closed for a national holiday, toggle that day to closed or create an availability override under **Staff > Rostering**.
