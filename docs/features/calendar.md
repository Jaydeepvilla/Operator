# Calendar & Scheduling Architecture

Operator provides a hybrid scheduling architecture combining a native, high-performance PostgreSQL booking engine with external calendar availability verification.

**File reference:** `src/server/services/calendar-provider.ts`

---

## Supported Calendar Providers

| Provider | Type | Read Availability | Event Booking | Event Cancellation | Description |
|---|---|---|---|---|---|
| **Native Operator Engine** | Local Database | Yes | Yes | Yes | High-performance, self-contained scheduling engine storing all events directly in the `appointments` table. |
| **Calendly** | REST API Sync | Yes | Managed by Calendly | Managed by Calendly | Queries remote scheduled events from `api.calendly.com` to prevent double-booking. |

> **Note on Third-Party Direct Integrations:** Direct Google Calendar and Microsoft 365 Graph API sync are not currently implemented. All appointment state is held natively in Operator's database or reconciled against Calendly busy periods.

---

## How It Works

When a customer or caller requests an appointment:

1. **Staff Resolution:** The booking service identifies the requested service and looks up eligible certified staff members in `service_assignments`.
2. **Working Hours & Schedules:** Checks the staff member's working hours for the requested day of week in `staff_schedules`.
3. **Availability Overrides:** Checks for vacation or sick day blackout windows in `staff_availability`.
4. **Existing Bookings:** Queries existing confirmed and pending appointments in `appointments` for overlapping windows, adding configured pre- and post-appointment buffer times.
5. **External Calendar Sync (Calendly):** If the staff member has a connected Calendly account, queries `CalendlyProvider.getBusyPeriods()`:
   ```http
   GET https://api.calendly.com/scheduled_events?min_start_time={start}&max_start_time={end}
   Authorization: Bearer {accessToken}
   ```
6. **Slot Proposal:** Open, non-overlapping candidate slots are formatted and presented to the customer.
7. **Confirmation:** Once selected, `bookingService.createAppointment()` inserts the appointment record with status `confirmed` or `pending`.

---

## Connecting Calendly

1. In your Calendly account, generate a **Personal Access Token** under **Integrations**.
2. In Operator, go to **Settings > Calendar Connections** (`/settings`).
3. Select **Calendly**, paste your Personal Access Token, and set your target calendar identifier (`primary`).
4. Click **Connect**. The connection record is saved in `calendar_connections`.
