export interface CalendarBusyPeriod {
  start: Date;
  end: Date;
}

export interface ExternalEventInput {
  title: string;
  start: Date;
  end: Date;
  description?: string;
}

export interface CalendarProvider {
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

  updateEvent(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    externalId: string,
    event: ExternalEventInput
  ): Promise<void>;

  deleteEvent(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    externalId: string
  ): Promise<void>;
}

/* ─────────────────────────────────────────────────────────
 * Google Calendar Provider (Direct HTTP API Integration)
 * ───────────────────────────────────────────────────────── */
export class GoogleCalendarProvider implements CalendarProvider {
  async getBusyPeriods(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    start: Date,
    end: Date
  ): Promise<CalendarBusyPeriod[]> {
    try {
      const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          items: [{ id: externalCalendarId || "primary" }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Calendar FreeBusy API returned ${response.status}`);
      }

      const data = await response.json();
      const calendarKey = externalCalendarId || "primary";
      const busyList = data.calendars?.[calendarKey]?.busy || [];

      return busyList.map((item: any) => ({
        start: new Date(item.start),
        end: new Date(item.end),
      }));
    } catch (err) {
      console.error("[GoogleCalendarProvider] Failed to fetch busy periods:", err);
      return [];
    }
  }

  async createEvent(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    event: ExternalEventInput
  ): Promise<{ externalId: string }> {
    const calendarId = externalCalendarId || "primary";
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.title,
        description: event.description,
        start: { dateTime: event.start.toISOString() },
        end: { dateTime: event.end.toISOString() },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Calendar CreateEvent failed: ${errText}`);
    }

    const data = await response.json();
    return { externalId: data.id };
  }

  async updateEvent(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    externalId: string,
    event: ExternalEventInput
  ): Promise<void> {
    const calendarId = externalCalendarId || "primary";
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: event.title,
          description: event.description,
          start: { dateTime: event.start.toISOString() },
          end: { dateTime: event.end.toISOString() },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Calendar UpdateEvent failed: ${errText}`);
    }
  }

  async deleteEvent(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    externalId: string
  ): Promise<void> {
    const calendarId = externalCalendarId || "primary";
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      const errText = await response.text();
      throw new Error(`Google Calendar DeleteEvent failed: ${errText}`);
    }
  }
}

/* ─────────────────────────────────────────────────────────
 * Outlook Calendar Provider (Direct HTTP API Integration)
 * ───────────────────────────────────────────────────────── */
export class OutlookCalendarProvider implements CalendarProvider {
  async getBusyPeriods(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    start: Date,
    end: Date
  ): Promise<CalendarBusyPeriod[]> {
    try {
      const response = await fetch("https://graph.microsoft.com/v1.0/me/calendar/getSchedule", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Prefer: 'outlook.timezone="UTC"',
        },
        body: JSON.stringify({
          schedules: [externalCalendarId || "me"],
          startTime: { dateTime: start.toISOString(), timeZone: "UTC" },
          endTime: { dateTime: end.toISOString(), timeZone: "UTC" },
          availabilityViewInterval: 15,
        }),
      });

      if (!response.ok) {
        throw new Error(`Outlook getSchedule API returned ${response.status}`);
      }

      const data = await response.json();
      const scheduleItems = data.value?.[0]?.scheduleItems || [];

      return scheduleItems
        .filter((item: any) => item.status === "busy" || item.status === "oof")
        .map((item: any) => ({
          start: new Date(item.start.dateTime + "Z"),
          end: new Date(item.end.dateTime + "Z"),
        }));
    } catch (err) {
      console.error("[OutlookCalendarProvider] Failed to fetch busy periods:", err);
      return [];
    }
  }

  async createEvent(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    event: ExternalEventInput
  ): Promise<{ externalId: string }> {
    const url = externalCalendarId
      ? `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(externalCalendarId)}/events`
      : "https://graph.microsoft.com/v1.0/me/events";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: event.title,
        body: { contentType: "HTML", content: event.description || "" },
        start: { dateTime: event.start.toISOString(), timeZone: "UTC" },
        end: { dateTime: event.end.toISOString(), timeZone: "UTC" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Outlook CreateEvent failed: ${errText}`);
    }

    const data = await response.json();
    return { externalId: data.id };
  }

  async updateEvent(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    externalId: string,
    event: ExternalEventInput
  ): Promise<void> {
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(externalId)}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: event.title,
        body: { contentType: "HTML", content: event.description || "" },
        start: { dateTime: event.start.toISOString(), timeZone: "UTC" },
        end: { dateTime: event.end.toISOString(), timeZone: "UTC" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Outlook UpdateEvent failed: ${errText}`);
    }
  }

  async deleteEvent(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    externalId: string
  ): Promise<void> {
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(externalId)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errText = await response.text();
      throw new Error(`Outlook DeleteEvent failed: ${errText}`);
    }
  }
}

/* ─────────────────────────────────────────────────────────
 * Calendly Provider (Direct HTTP API Integration)
 * ───────────────────────────────────────────────────────── */
export class CalendlyProvider implements CalendarProvider {
  // Calendly handles scheduling on their platform, so busy periods are fetched via event endpoints
  async getBusyPeriods(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    start: Date,
    end: Date
  ): Promise<CalendarBusyPeriod[]> {
    try {
      const response = await fetch(
        `https://api.calendly.com/scheduled_events?min_start_time=${start.toISOString()}&max_start_time=${end.toISOString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Calendly API returned ${response.status}`);
      }

      const data = await response.json();
      const events = data.collection || [];

      return events.map((item: any) => ({
        start: new Date(item.start_time),
        end: new Date(item.end_time),
      }));
    } catch (err) {
      console.error("[CalendlyProvider] Failed to fetch busy periods:", err);
      return [];
    }
  }

  async createEvent(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    event: ExternalEventInput
  ): Promise<{ externalId: string }> {
    throw new Error("Outbound event creation is not supported by Calendly. Use Google Calendar or Outlook for direct scheduling, or integrate Calendly via incoming webhooks.");
  }

  async updateEvent(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    externalId: string,
    event: ExternalEventInput
  ): Promise<void> {
    throw new Error("Outbound event update is not supported by Calendly.");
  }

  async deleteEvent(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    externalId: string
  ): Promise<void> {
    throw new Error("Outbound event cancellation is not supported by Calendly.");
  }
}

export const providerRegistry = {
  getProvider(provider: string): CalendarProvider {
    switch (provider.toLowerCase()) {
      case "google":
        return new GoogleCalendarProvider();
      case "outlook":
      case "microsoft":
        return new OutlookCalendarProvider();
      case "calendly":
        return new CalendlyProvider();
      default:
        throw new Error(`Unsupported calendar provider: ${provider}`);
    }
  },
};
