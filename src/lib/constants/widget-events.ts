/**
 * Canonical Operator Widget PostMessage Event Contract
 * Single source of truth for parent ↔ widget-frame iframe communication.
 */

export const OPERATOR_WIDGET_EVENTS = {
  SESSION_STARTED: "operator:widget:session_started",
  BOOKING_COMPLETED: "operator:widget:booking_completed",
  LEAD_CAPTURED: "operator:widget:lead_captured",
  ESCALATED: "operator:widget:escalated",
  TOGGLE: "operator:widget:toggle",
  OPEN: "operator:widget:open",
  CLOSE: "operator:widget:close",
  READY: "operator:widget:ready",
  RESIZE: "operator:widget:resize",
} as const;

export type OperatorWidgetEventType =
  (typeof OPERATOR_WIDGET_EVENTS)[keyof typeof OPERATOR_WIDGET_EVENTS];

/**
 * Isolated Legacy compatibility mapping for previously deployed host scripts.
 * DO NOT use these constants for new outgoing runtime messages.
 */
export const LEGACY_WIDGET_EVENTS = {
  NEXX_SESSION_STARTED: "NEXX_SESSION_STARTED",
  NEXX_BOOKING_COMPLETED: "NEXX_BOOKING_COMPLETED",
  NEXX_LEAD_CAPTURED: "NEXX_LEAD_CAPTURED",
  NEXX_ESCALATED: "NEXX_ESCALATED",
  NEXX_TOGGLE: "NEXX_TOGGLE",
} as const;

export interface OperatorWidgetSessionStartedPayload {
  type: typeof OPERATOR_WIDGET_EVENTS.SESSION_STARTED;
  conversationId: string;
}

export interface OperatorWidgetBookingCompletedPayload {
  type: typeof OPERATOR_WIDGET_EVENTS.BOOKING_COMPLETED;
  details: {
    appointmentId?: string;
    serviceName?: string;
    startTime?: string;
    [key: string]: unknown;
  };
}

export interface OperatorWidgetLeadCapturedPayload {
  type: typeof OPERATOR_WIDGET_EVENTS.LEAD_CAPTURED;
  details?: Record<string, unknown>;
}

export interface OperatorWidgetEscalatedPayload {
  type: typeof OPERATOR_WIDGET_EVENTS.ESCALATED;
}

export interface OperatorWidgetTogglePayload {
  type: typeof OPERATOR_WIDGET_EVENTS.TOGGLE;
}

export type OperatorWidgetMessagePayload =
  | OperatorWidgetSessionStartedPayload
  | OperatorWidgetBookingCompletedPayload
  | OperatorWidgetLeadCapturedPayload
  | OperatorWidgetEscalatedPayload
  | OperatorWidgetTogglePayload;

/**
 * Validates whether an incoming postMessage data object is a valid Operator Widget event payload.
 */
export function isValidWidgetMessage(data: unknown): data is { type: string; [key: string]: unknown } {
  if (!data || typeof data !== "object") return false;
  const msg = data as Record<string, unknown>;
  if (typeof msg.type !== "string") return false;

  const validTypes = Object.values(OPERATOR_WIDGET_EVENTS) as string[];
  const legacyTypes = Object.values(LEGACY_WIDGET_EVENTS) as string[];

  return validTypes.includes(msg.type) || legacyTypes.includes(msg.type);
}

/**
 * Normalizes legacy event types into canonical Operator event types.
 */
export function normalizeWidgetEventType(type: string): OperatorWidgetEventType | null {
  switch (type) {
    case OPERATOR_WIDGET_EVENTS.SESSION_STARTED:
    case LEGACY_WIDGET_EVENTS.NEXX_SESSION_STARTED:
      return OPERATOR_WIDGET_EVENTS.SESSION_STARTED;

    case OPERATOR_WIDGET_EVENTS.BOOKING_COMPLETED:
    case LEGACY_WIDGET_EVENTS.NEXX_BOOKING_COMPLETED:
      return OPERATOR_WIDGET_EVENTS.BOOKING_COMPLETED;

    case OPERATOR_WIDGET_EVENTS.LEAD_CAPTURED:
    case LEGACY_WIDGET_EVENTS.NEXX_LEAD_CAPTURED:
      return OPERATOR_WIDGET_EVENTS.LEAD_CAPTURED;

    case OPERATOR_WIDGET_EVENTS.ESCALATED:
    case LEGACY_WIDGET_EVENTS.NEXX_ESCALATED:
      return OPERATOR_WIDGET_EVENTS.ESCALATED;

    case OPERATOR_WIDGET_EVENTS.TOGGLE:
    case LEGACY_WIDGET_EVENTS.NEXX_TOGGLE:
      return OPERATOR_WIDGET_EVENTS.TOGGLE;

    default:
      if ((Object.values(OPERATOR_WIDGET_EVENTS) as string[]).includes(type)) {
        return type as OperatorWidgetEventType;
      }
      return null;
  }
}
