import { sessionsRepository } from "../../repositories/sessions";
import { TimeSlot } from "../availability";

export type WhatsAppFlowStage =
  | "IDLE"
  | "SELECTING_SERVICE"
  | "SELECTING_DATE"
  | "SELECTING_TIME"
  | "CONFIRMING_BOOKING"
  | "MANAGING_BOOKING"
  | "CONFIRMING_CANCEL"
  | "SELECTING_RESCHEDULE_DATE"
  | "SELECTING_RESCHEDULE_TIME"
  | "HUMAN_HANDOFF";

export interface DraftBooking {
  serviceId?: string;
  serviceName?: string;
  servicePrice?: string;
  serviceDuration?: number;
  targetDate?: string; // YYYY-MM-DD
  dateLabel?: string;  // e.g. "Tomorrow (Nov 4)"
  slotTime?: string;   // "10:00"
  slotLabel?: string;  // "10:00 AM"
  staffId?: string;
  staffName?: string;
  suggestedSlots?: TimeSlot[];
}

export interface WhatsAppConversationState {
  stage: WhatsAppFlowStage;
  draftBooking?: DraftBooking | null;
  activeAppointmentId?: string | null;
  interruptedState?: {
    stage: WhatsAppFlowStage;
    draftBooking: DraftBooking;
  } | null;
  language?: "en" | "hi" | "gu" | "hinglish";
  lastInteractionAt: number;
}

// Hot in-memory state cache to eliminate 300-600ms DB latency per message
const stateCache = new Map<string, { state: WhatsAppConversationState; expiresAt: number }>();
const STATE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export const whatsAppStateMachine = {
  /**
   * Clear state cache
   */
  invalidateCache(organizationId?: string, conversationId?: string) {
    if (organizationId && conversationId) {
      stateCache.delete(`${organizationId}:${conversationId}`);
    } else {
      stateCache.clear();
    }
  },

  /**
   * Load current state from memory cache or fallback to PostgreSQL session
   */
  async getState(organizationId: string, conversationId: string): Promise<WhatsAppConversationState> {
    const key = `${organizationId}:${conversationId}`;
    const cached = stateCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.state;
    }

    try {
      const session = await sessionsRepository.findByConversation(conversationId);
      const raw = (session?.state as any)?.whatsappFlow;
      if (raw && typeof raw === "object" && raw.stage) {
        stateCache.set(key, { state: raw as WhatsAppConversationState, expiresAt: Date.now() + STATE_CACHE_TTL_MS });
        return raw as WhatsAppConversationState;
      }
    } catch (err) {
      console.warn("[WhatsApp State Machine] Failed to load session state, falling back to IDLE:", err);
    }

    const defaultState: WhatsAppConversationState = {
      stage: "IDLE",
      draftBooking: null,
      activeAppointmentId: null,
      interruptedState: null,
      language: "en",
      lastInteractionAt: Date.now(),
    };
    stateCache.set(key, { state: defaultState, expiresAt: Date.now() + STATE_CACHE_TTL_MS });
    return defaultState;
  },

  /**
   * Persist updated state to memory immediately and write-through to PostgreSQL asynchronously
   */
  async setState(
    organizationId: string,
    conversationId: string,
    state: Partial<WhatsAppConversationState>
  ): Promise<WhatsAppConversationState> {
    const key = `${organizationId}:${conversationId}`;
    const current = await this.getState(organizationId, conversationId);
    const updated: WhatsAppConversationState = {
      ...current,
      ...state,
      lastInteractionAt: Date.now(),
    };

    // Update hot memory cache immediately
    stateCache.set(key, { state: updated, expiresAt: Date.now() + STATE_CACHE_TTL_MS });

    // Non-blocking write-through to PostgreSQL session in background
    sessionsRepository.findByConversation(conversationId).then((session) => {
      const baseState = session?.state || {};
      return sessionsRepository.upsert({
        organizationId,
        conversationId,
        state: {
          ...baseState,
          whatsappFlow: updated,
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour conversational window
      });
    }).catch((err) => {
      console.warn("[WhatsApp State Machine] Background state persist error:", err);
    });

    return updated;
  },

  /**
   * Reset conversation state to IDLE
   */
  async resetState(organizationId: string, conversationId: string): Promise<WhatsAppConversationState> {
    return await this.setState(organizationId, conversationId, {
      stage: "IDLE",
      draftBooking: null,
      activeAppointmentId: null,
      interruptedState: null,
    });
  },

  /**
   * Save an interruption (e.g. user asks a knowledge question in the middle of booking)
   */
  async recordInterruption(
    organizationId: string,
    conversationId: string,
    currentState: WhatsAppConversationState
  ): Promise<void> {
    if (currentState.stage !== "IDLE" && currentState.draftBooking) {
      await this.setState(organizationId, conversationId, {
        interruptedState: {
          stage: currentState.stage,
          draftBooking: currentState.draftBooking,
        },
      });
    }
  },

  /**
   * Resume an interrupted flow
   */
  async resumeInterruption(
    organizationId: string,
    conversationId: string
  ): Promise<WhatsAppConversationState | null> {
    const current = await this.getState(organizationId, conversationId);
    if (current.interruptedState) {
      const resumed: WhatsAppConversationState = {
        stage: current.interruptedState.stage,
        draftBooking: current.interruptedState.draftBooking,
        interruptedState: null,
        activeAppointmentId: current.activeAppointmentId,
        language: current.language,
        lastInteractionAt: Date.now(),
      };
      await this.setState(organizationId, conversationId, resumed);
      return resumed;
    }
    return null;
  },
};
