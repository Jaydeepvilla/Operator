# Calendar Integration

Operator integrates with external calendar systems to check staff availability before confirming appointment slots and to create calendar events when appointments are booked.

---

## Supported providers

| Provider | Read availability | Create event | Update event | Delete event |
|---|---|---|---|---|
| Google Calendar | Yes | Yes | Yes | Yes |
| Outlook / Microsoft 365 | Yes | Yes | Yes | Yes |
| Calendly | Yes (reads events) | No (bookings managed by Calendly) | No | No |

**File:** `src/server/services/calendar-provider.ts`

The provider is selected at runtime based on the `calendarType` stored in the staff member's calendar connection record.

---

## How it works

When the AI receptionist wants to book an appointment:

1. The booking service looks up the assigned staff member
2. It loads the staff member's calendar credentials from the `staffCalendars` table
3. It calls `providerRegistry.getProvider(calendarType).getBusyPeriods()` with a time window
4. Available slots that don't overlap with busy periods are presented to the customer
5. Once the customer confirms, `createEvent()` is called to put the appointment on the calendar
6. The appointment is also saved to the local `appointments` table

---

## Google Calendar

### API used

Direct HTTP calls to the Google Calendar REST API v3 — no SDK.

| Operation | HTTP method | Endpoint |
|---|---|---|
| Get availability | `POST` | `https://www.googleapis.com/calendar/v3/freeBusy` |
| Create event | `POST` | `https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events` |
| Update event | `PUT` | `https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}` |
| Delete event | `DELETE` | `https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}` |

### Availability check

Uses the [Google FreeBusy API](https://developers.google.com/calendar/api/v3/reference/freebusy/query). Returns a list of busy time blocks. Available slots are computed by inverting busy periods within the requested window.

If no `externalCalendarId` is set, defaults to `"primary"` (the staff member's main Google Calendar).

### Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable **Google Calendar API**
4. Create **OAuth 2.0 credentials** (Web Application type)
5. Set authorized redirect URI: `${NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
6. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env`

After setup, staff members connect their Google Calendar via Settings → Calendar → Connect Google Calendar. This triggers the OAuth flow and stores `accessToken`, `refreshToken`, and `expiresAt` in the `staffCalendars` table.

---

## Outlook / Microsoft 365

### API used

Direct HTTP calls to the Microsoft Graph API.

| Operation | HTTP method | Endpoint |
|---|---|---|
| Get availability | `POST` | `https://graph.microsoft.com/v1.0/me/calendar/getSchedule` |
| Create event | `POST` | `https://graph.microsoft.com/v1.0/me/events` (or `/calendars/{id}/events`) |
| Update event | `PATCH` | `https://graph.microsoft.com/v1.0/me/events/{eventId}` |
| Delete event | `DELETE` | `https://graph.microsoft.com/v1.0/me/events/{eventId}` |

### Availability check

Uses the [Get Schedule API](https://learn.microsoft.com/en-us/graph/api/calendar-getschedule). Returns schedule items filtered to `status: "busy"` and `status: "oof"` (out of office). Availability view interval is 15 minutes.

---

## Calendly

### API used

Reads existing scheduled events from the [Calendly API](https://developer.calendly.com/api-docs).

| Operation | HTTP method | Endpoint |
|---|---|---|
| Get busy periods | `GET` | `https://api.calendly.com/scheduled_events?min_start_time=...&max_start_time=...` |
| Create event | N/A | Calendly manages bookings through their own booking pages |

**Limitation:** Calendly does not support outbound event creation via API in the same way Google Calendar does. `createEvent()` is a stub. Outbound appointment creation should use Google Calendar or Outlook if you need the appointment to appear on a managed calendar.

---

## Provider registry

```typescript
// src/server/services/calendar-provider.ts
const providerRegistry = {
  getProvider(provider: string): CalendarProvider {
    switch (provider.toLowerCase()) {
      case "google":     return new GoogleCalendarProvider();
      case "outlook":
      case "microsoft":  return new OutlookCalendarProvider();
      case "calendly":   return new CalendlyProvider();
      default:           throw new Error(`Unsupported: ${provider}`);
    }
  }
};
```

---

## Database schema

Staff calendar connections are stored in `staffCalendars`:

```
staffCalendars
  id
  staffId          → staff
  provider         "google" | "outlook" | "calendly"
  accessToken      (encrypted or plain — see security considerations)
  refreshToken
  expiresAt
  externalCalendarId   (null = "primary" calendar)
  isConnected
```

---

## Security considerations

The `accessToken` and `refreshToken` are stored in the database. In the current implementation:

- Tokens are stored as plain text (no additional encryption at application layer)
- The database should use encrypted volumes in production
- PostgreSQL row-level security is not currently configured on the `staffCalendars` table
- Token rotation on expiry is handled by each provider's token refresh logic

---

## CalendarProvider interface

```typescript
interface CalendarProvider {
  getBusyPeriods(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    start: Date,
    end: Date
  ): Promise<CalendarBusyPeriod[]>;

  createEvent(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    event: ExternalEventInput
  ): Promise<{ externalId: string }>;

  updateEvent(/* ... */): Promise<void>;
  deleteEvent(/* ... */): Promise<void>;
}
```

To add a new calendar provider, implement this interface and add a case to `providerRegistry.getProvider()`.

---

## Adding a new calendar provider

1. Create a class implementing `CalendarProvider` in `src/server/services/calendar-provider.ts`
2. Add a case in `providerRegistry.getProvider()`
3. Add the `calendarType` value to the `staffCalendars` schema enum
4. Add the OAuth flow route (if OAuth-based) in `src/app/api/auth/callback/{provider}/route.ts`
