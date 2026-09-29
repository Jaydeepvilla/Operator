/**
 * OPERATOR AI — INTERACTION & TELEMETRY EVALUATOR
 * Continuous runtime evaluation of conversation turns, user feedback signals,
 * explicit corrections, implicit satisfaction, groundedness, and prompt injection defense.
 */

export interface InteractionEvaluation {
  isCorrection: boolean;
  correctionType?: "denial" | "factual_correction" | "misunderstanding" | "preference_update";
  implicitSignal: "positive" | "negative" | "neutral";
  implicitSignalReason?: string;
  isRepetition: boolean;
  isPromptInjectionAttempt: boolean;
  groundednessScore: number;
  unsupportedClaims: string[];
  suggestedAction?: "record_correction" | "flag_injection" | "track_gap" | "none";
}

// Regex patterns for explicit user corrections
const CORRECTION_PATTERNS = [
  { regex: /\b(no|nope),?\s+(that('s| is) (not right|wrong|incorrect|false|untrue))\b/i, type: "denial" as const },
  { regex: /\b(actually,? (it('s| is)|we|you|that is|i)|in fact)\b/i, type: "factual_correction" as const },
  { regex: /\b(that('s| is) not what i (asked|meant|said)|you misunderstood)\b/i, type: "misunderstanding" as const },
  { regex: /\b(i (already )?said|as i said before|like i said)\b/i, type: "repetition" as const },
  { regex: /\b(that('s| is) wrong|you're wrong|you got that wrong)\b/i, type: "denial" as const },
  { regex: /\b(cancellation fee is|hours are|price is actually|not \$\d+)\b/i, type: "factual_correction" as const },
];

// Patterns for skepticism or implicit negative feedback
const SKEPTICISM_PATTERNS = [
  /\b(are you sure\??|is that (right|correct|accurate)\??|really\??)\b/i,
  /\b(doesn't sound right|that makes no sense|that can't be right)\b/i,
  /\b(why did you say that|who told you that)\b/i,
];

// Patterns for implicit positive feedback
const POSITIVE_PATTERNS = [
  /\b(thank you|thanks|great|perfect|awesome|sounds good|that works|excellent|got it|cool)\b/i,
  /\b(yes please|that's right|exactly|correct|confirmed)\b/i,
];

// Security guard: prompt injection & rule tampering attempts
const INJECTION_PATTERNS = [
  /\b(ignore (all )?(previous|prior) (instructions|rules|prompts))\b/i,
  /\b(system prompt|you are now in developer mode|DAN mode|jailbreak)\b/i,
  /\b(disregard (all )?(safety|business) (policies|rules))\b/i,
  /\b(remember that (refunds?|discounts?|free) (are|is) always (allowed|given))\b/i,
  /\b(new system instruction|override system prompt)\b/i,
];

export const interactionEvaluator = {
  /**
   * Evaluate a live user turn against past context
   */
  evaluateTurn(params: {
    userMessage: string;
    lastAssistantMessage?: string;
    recentHistory?: Array<{ role: string; content: string }>;
    retrievedContextText?: string;
    businessProfileText?: string;
  }): InteractionEvaluation {
    const { userMessage, lastAssistantMessage, recentHistory = [], retrievedContextText = "", businessProfileText = "" } = params;
    const cleanUser = userMessage.trim();

    // 1. Prompt Injection Defense
    let isPromptInjectionAttempt = false;
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(cleanUser)) {
        isPromptInjectionAttempt = true;
        break;
      }
    }

    if (isPromptInjectionAttempt) {
      return {
        isCorrection: false,
        implicitSignal: "negative",
        implicitSignalReason: "prompt_injection_attempt_detected",
        isRepetition: false,
        isPromptInjectionAttempt: true,
        groundednessScore: 1.0,
        unsupportedClaims: [],
        suggestedAction: "flag_injection",
      };
    }

    // 2. Explicit Correction Detection
    let isCorrection = false;
    let correctionType: InteractionEvaluation["correctionType"];

    for (const item of CORRECTION_PATTERNS) {
      if (item.regex.test(cleanUser)) {
        isCorrection = true;
        if (item.type !== "repetition") {
          correctionType = item.type;
        }
        break;
      }
    }

    // 3. User Repetition Detection (did user ask the exact same or 85% similar query in last 3 turns?)
    let isRepetition = false;
    const pastUserTurns = recentHistory
      .filter((m) => m.role === "user")
      .slice(-3)
      .map((m) => m.content.toLowerCase().trim());

    const lowerCurrent = cleanUser.toLowerCase();
    for (const past of pastUserTurns) {
      if (past === lowerCurrent || (past.length > 10 && lowerCurrent.includes(past))) {
        isRepetition = true;
        break;
      }
    }

    // 4. Implicit Satisfaction Signals
    let implicitSignal: InteractionEvaluation["implicitSignal"] = "neutral";
    let implicitSignalReason: string | undefined;

    if (isCorrection) {
      implicitSignal = "negative";
      implicitSignalReason = `user_explicitly_corrected_assistant (${correctionType})`;
    } else if (isRepetition) {
      implicitSignal = "negative";
      implicitSignalReason = "user_repeated_previous_query";
    } else {
      // Check skepticism
      for (const pattern of SKEPTICISM_PATTERNS) {
        if (pattern.test(cleanUser)) {
          implicitSignal = "negative";
          implicitSignalReason = "user_expressed_skepticism_or_doubt";
          break;
        }
      }

      // Check positive confirmation
      if (implicitSignal === "neutral") {
        for (const pattern of POSITIVE_PATTERNS) {
          if (pattern.test(cleanUser)) {
            implicitSignal = "positive";
            implicitSignalReason = "user_acknowledged_or_confirmed";
            break;
          }
        }
      }
    }

    // 5. Response Groundedness Evaluation
    let groundednessScore = 1.0;
    const unsupportedClaims: string[] = [];

    if (lastAssistantMessage && (retrievedContextText || businessProfileText)) {
      const combinedCorpus = `${businessProfileText}\n${retrievedContextText}`.toLowerCase();
      
      // Look for specific price claims in assistant message: e.g. "$150", "$50.00"
      const priceMatches = lastAssistantMessage.match(/\$\d+(\.\d{2})?/g);
      if (priceMatches) {
        for (const price of priceMatches) {
          if (!combinedCorpus.includes(price.toLowerCase())) {
            unsupportedClaims.push(`Price claim "${price}" not found in verified knowledge`);
            groundednessScore -= 0.3;
          }
        }
      }
    }

    groundednessScore = Math.max(0, Math.min(1.0, groundednessScore));

    return {
      isCorrection,
      correctionType,
      implicitSignal,
      implicitSignalReason,
      isRepetition,
      isPromptInjectionAttempt: false,
      groundednessScore,
      unsupportedClaims,
      suggestedAction: isCorrection ? "record_correction" : undefined,
    };
  },
};
