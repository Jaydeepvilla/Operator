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
 * Native Built-in Calendar Provider (Operator Local Database)
 * ───────────────────────────────────────────────────────── */
export class NativeCalendarProvider implements CalendarProvider {
  async getBusyPeriods(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    start: Date,
    end: Date
  ): Promise<CalendarBusyPeriod[]> {
    return [];
  }

  async createEvent(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    event: ExternalEventInput
  ): Promise<{ externalId: string }> {
    const eventId = `evt_native_${Date.now()}`;
    return { externalId: eventId };
  }

  async updateEvent(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    externalId: string,
    event: ExternalEventInput
  ): Promise<void> {}

  async deleteEvent(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    externalCalendarId: string | null,
    externalId: string
  ): Promise<void> {}
}

/* ─────────────────────────────────────────────────────────
 * Calendly Provider (Direct HTTP API Integration)
 * ───────────────────────────────────────────────────────── */
export class CalendlyProvider implements CalendarProvider {
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
    throw new Error(
      "Outbound event creation is not supported by Calendly. Use native scheduling or integrate Calendly via incoming webhooks."
    );
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
      case "native":
      case "local":
      case "operator":
        return new NativeCalendarProvider();
      case "calendly":
        return new CalendlyProvider();
      default:
        return new NativeCalendarProvider();
    }
  },
};
