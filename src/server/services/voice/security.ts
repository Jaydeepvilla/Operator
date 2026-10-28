/**
 * Voice and Telephony Security Guardrails
 * Enforces authentication, tenant isolation, fraud prevention, consent disclosure,
 * rate limiting, and PII protection across voice calls, webhooks, and TTS.
 */

export type CallerVerificationLevel = "UNVERIFIED_CLAIM" | "VERIFIED_OTP" | "STAFF_AUTHENTICATED";

/**
 * REQ 2 & REQ 3: Caller-ID spoofing defense and identity verification policy.
 * Incoming caller-ID is an untrusted claim and must never be treated as verified identity
 * for sensitive operations.
 */
export function evaluateCallerVerification(params: {
  callerNumber: string;
  verificationLevel: CallerVerificationLevel;
  actionRequested: "public_inquiry" | "book_appointment" | "view_account_history" | "cancel_all" | "modify_billing" | "admin_command";
}): {
  allowed: boolean;
  requiredLevel: CallerVerificationLevel;
  reason?: string;
} {
  // Public inquiries and standard customer bookings are permitted for unverified callers
  if (params.actionRequested === "public_inquiry" || params.actionRequested === "book_appointment") {
    return { allowed: true, requiredLevel: "UNVERIFIED_CLAIM" };
  }

  // Account modification, appointment mass cancellation, or personal history requires secondary verification
  if (params.actionRequested === "view_account_history" || params.actionRequested === "cancel_all") {
    if (params.verificationLevel === "VERIFIED_OTP" || params.verificationLevel === "STAFF_AUTHENTICATED") {
      return { allowed: true, requiredLevel: "VERIFIED_OTP" };
    }
    return {
      allowed: false,
      requiredLevel: "VERIFIED_OTP",
      reason: "Secondary verification required. Phone number alone (caller-ID) is not sufficient for sensitive account access.",
    };
  }

  // Admin and billing changes are NEVER allowed over voice
  return {
    allowed: false,
    requiredLevel: "STAFF_AUTHENTICATED",
    reason: "Administrative and billing operations cannot be performed over the telephone.",
  };
}

/**
 * REQ 6: Prevent recording without applicable consent and policy requirements.
 */
export function generateRecordingConsentNotice(isRecordingEnabled: boolean): string {
  if (!isRecordingEnabled) {
    return "";
  }
  return "<Say>This call may be recorded for quality assurance and training purposes.</Say>";
}

/**
 * REQ 7: Prevent sensitive information from being spoken to an unverified caller.
 */
export function sanitizeSpokenVoiceOutput(text: string): {
  sanitizedText: string;
  redactedPiiCount: number;
} {
  if (!text || typeof text !== "string") {
    return { sanitizedText: "", redactedPiiCount: 0 };
  }

  let sanitized = text;
  let count = 0;

  const SENSITIVE_PATTERNS = [
    // Credit card numbers (13 to 19 digits)
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    // CVV / CVC
    /\b(?:cvv|cvc|security\s+code)[:\s]+[0-9]{3,4}\b/gi,
    // US SSN
    /\b\d{3}-\d{2}-\d{4}\b/g,
    // Passwords / secrets
    /\b(?:password|passwd|secret)[:=\s]+[^\s,;]+/gi,
    // API keys / tokens
    /\b(?:sk|pk|bearer|token|api_key)_[a-zA-Z0-9_\-]{16,}\b/gi,
  ];

  for (const pattern of SENSITIVE_PATTERNS) {
    const matches = sanitized.match(pattern);
    if (matches) {
      count += matches.length;
      sanitized = sanitized.replace(pattern, "[information redacted for telephone security]");
    }
  }

  return { sanitizedText: sanitized, redactedPiiCount: count };
}

/**
 * REQ 8: Prevent voice commands from bypassing account authorization.
 */
export const ALLOWED_VOICE_COMMANDS = [
  "BOOK_APPOINTMENT",
  "CHECK_AVAILABILITY",
  "VIEW_SERVICES",
  "VIEW_PRICING",
  "VIEW_HOURS",
  "SPEAK_WITH_HUMAN",
  "LEAVE_VOICEMAIL",
] as const;

export function isVoiceCommandAuthorized(commandName: string): {
  authorized: boolean;
  userFacingExplanation?: string;
} {
  const isAllowed = ALLOWED_VOICE_COMMANDS.includes(commandName.toUpperCase() as any);
  if (!isAllowed) {
    return {
      authorized: false,
      userFacingExplanation: "That action cannot be performed over the phone. Please sign in to the secure dashboard to manage account settings.",
    };
  }
  return { authorized: true };
}

/**
 * REQ 9: Prevent replayed or duplicated voice events from repeating actions.
 */
const processedWebhookCache = new Map<string, { timestamp: number; responseXml?: string }>();
const WEBHOOK_DEDUP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function checkTelephonyWebhookIdempotency(options: {
  callSid: string;
  sequenceNumber?: string | number;
  eventType?: string;
}): { isDuplicate: boolean; cachedResponse?: string } {
  const key = `${options.callSid}:${options.sequenceNumber ?? options.eventType ?? "event"}`;
  const now = Date.now();

  // Garbage collect expired entries if cache grows
  if (processedWebhookCache.size > 2000) {
    for (const [k, v] of processedWebhookCache.entries()) {
      if (now - v.timestamp > WEBHOOK_DEDUP_TTL_MS) {
        processedWebhookCache.delete(k);
      }
    }
  }

  const existing = processedWebhookCache.get(key);
  if (existing && now - existing.timestamp < WEBHOOK_DEDUP_TTL_MS) {
    return { isDuplicate: true, cachedResponse: existing.responseXml };
  }

  processedWebhookCache.set(key, { timestamp: now });
  return { isDuplicate: false };
}

export function recordTelephonyWebhookResponse(options: {
  callSid: string;
  sequenceNumber?: string | number;
  eventType?: string;
  responseXml: string;
}) {
  const key = `${options.callSid}:${options.sequenceNumber ?? options.eventType ?? "event"}`;
  processedWebhookCache.set(key, { timestamp: Date.now(), responseXml: options.responseXml });
}

/**
 * REQ 12: Prevent dropped calls from being reported as completed tasks.
 */
export function resolveCallOutcomeOnHangup(endedReason: string): {
  status: "completed" | "dropped" | "abandoned";
  taskOutcome: "completed" | "abandoned";
} {
  const droppedReasons = [
    "caller_silence_timeout",
    "caller_hangup_early",
    "stream_stopped",
    "socket_closed",
    "carrier_drop",
    "network_disconnect",
    "error",
  ];

  const isDropped = droppedReasons.some((r) => endedReason.toLowerCase().includes(r));
  if (isDropped) {
    return { status: "dropped", taskOutcome: "abandoned" };
  }

  return { status: "completed", taskOutcome: "completed" };
}

/**
 * REQ 13: Prevent speech-recognition failures from being treated as confirmed instructions.
 */
export function validateSttConfidence(
  confidence: number | string,
  transcript: string
): {
  isConfirmed: boolean;
  requiresClarification: boolean;
  clarificationPrompt?: string;
} {
  const numConfidence = typeof confidence === "string" ? parseFloat(confidence) : confidence;
  const cleanText = (transcript || "").trim().toLowerCase();

  // If transcript is empty or inaudible indicator
  if (!cleanText || /^(in-audible|inaudible|unintelligible|\[inaudible\]|\[unintelligible\]|\.\.\.)$/i.test(cleanText)) {
    return {
      isConfirmed: false,
      requiresClarification: true,
      clarificationPrompt: "I didn't quite catch that. Could you please repeat that?",
    };
  }

  // Low confidence speech should NOT be accepted as confirmed action
  if (!isNaN(numConfidence) && numConfidence < 0.65) {
    return {
      isConfirmed: false,
      requiresClarification: true,
      clarificationPrompt: "I want to be sure I heard you correctly. Could you please confirm what you said?",
    };
  }

  return {
    isConfirmed: true,
    requiresClarification: false,
  };
}

/**
 * REQ 14: Prevent audio uploads from exploiting unsafe processing paths.
 */
const ALLOWED_AUDIO_MIMES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
];

const MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export function validateAudioUpload(params: {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}): { isValid: boolean; error?: string } {
  if (!params.buffer || params.buffer.length === 0) {
    return { isValid: false, error: "Audio file is empty." };
  }
  if (params.buffer.length > MAX_AUDIO_SIZE_BYTES) {
    return { isValid: false, error: `Audio file exceeds maximum size limit of ${MAX_AUDIO_SIZE_BYTES / (1024 * 1024)}MB.` };
  }

  const normalizedMime = params.mimeType.toLowerCase();
  if (!ALLOWED_AUDIO_MIMES.includes(normalizedMime)) {
    return { isValid: false, error: `Invalid audio format '${params.mimeType}'. Allowed formats: MP3, WAV, OGG, WebM.` };
  }

  if (params.filename.includes("..") || params.filename.includes("/") || params.filename.includes("\\")) {
    return { isValid: false, error: "Invalid filename path." };
  }

  const buf = params.buffer;
  let matchesMagic = false;

  // WAV: "RIFF" ... "WAVE"
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WAVE") {
    matchesMagic = true;
  }
  // MP3: ID3 or frame sync
  else if (buf.length >= 3 && buf.toString("ascii", 0, 3) === "ID3") {
    matchesMagic = true;
  } else if (buf.length >= 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) {
    matchesMagic = true;
  }
  // OGG: "OggS"
  else if (buf.length >= 4 && buf.toString("ascii", 0, 4) === "OggS") {
    matchesMagic = true;
  }
  // WebM: 0x1A 0x45 0xDF 0xA3 (EBML header)
  else if (buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    matchesMagic = true;
  }

  if (!matchesMagic) {
    return { isValid: false, error: "File contents do not match a valid audio format header." };
  }

  return { isValid: true };
}

/**
 * REQ 15: Prevent callers from triggering unlimited calls or excessive provider charges.
 */
const callCountTracker = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_CALLS_PER_WINDOW = 20;

export function checkCallRateLimit(callerNumber: string): {
  isRateLimited: boolean;
  remainingCalls: number;
} {
  const now = Date.now();
  const cleanNumber = (callerNumber || "unknown").trim();
  if (cleanNumber === "unknown") return { isRateLimited: false, remainingCalls: MAX_CALLS_PER_WINDOW };

  const entry = callCountTracker.get(cleanNumber);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    callCountTracker.set(cleanNumber, { count: 1, windowStart: now });
    return { isRateLimited: false, remainingCalls: MAX_CALLS_PER_WINDOW - 1 };
  }

  if (entry.count >= MAX_CALLS_PER_WINDOW) {
    return { isRateLimited: true, remainingCalls: 0 };
  }

  entry.count++;
  return { isRateLimited: false, remainingCalls: MAX_CALLS_PER_WINDOW - entry.count };
}

/**
 * REQ 16: Prevent voice-provider outages from producing false confirmations.
 */
export function handleVoiceProviderError(err: unknown): {
  success: false;
  userFacingMessage: string;
  shouldRetry: boolean;
} {
  return {
    success: false,
    userFacingMessage: "Our phone service is currently experiencing a connection issue. Please try calling back in a few minutes.",
    shouldRetry: true,
  };
}

/**
 * REQ 17: Prevent unauthorized transfers to external phone numbers (anti-toll fraud).
 */
const DISALLOWED_AREA_CODES = ["900", "976", "809", "876", "284"];
const HIGH_COST_COUNTRY_PREFIXES = ["+881", "+882", "+883", "+870"];

export function validateTransferDestination(
  targetNumber: string,
  approvedOrganizationNumbers: string[]
): {
  isValid: boolean;
  sanitizedNumber?: string;
  error?: string;
} {
  const clean = (targetNumber || "").trim().replace(/[()\s-]/g, "");
  if (!clean) {
    return { isValid: false, error: "Transfer destination cannot be empty." };
  }

  if (!/^\+?[1-9]\d{6,14}$/.test(clean)) {
    return { isValid: false, error: "Invalid phone number format. Must be a valid E.164 telephone number." };
  }

  for (const prefix of HIGH_COST_COUNTRY_PREFIXES) {
    if (clean.startsWith(prefix)) {
      return { isValid: false, error: `Transfer destination uses high-cost satellite/international prefix ${prefix}. Disallowed for fraud prevention.` };
    }
  }

  const digitsOnly = clean.replace(/^\+1/, "");
  if (digitsOnly.length === 10) {
    const areaCode = digitsOnly.slice(0, 3);
    if (DISALLOWED_AREA_CODES.includes(areaCode)) {
      return { isValid: false, error: `Transfer destination uses premium-rate area code ${areaCode}. Disallowed for toll fraud prevention.` };
    }
  }

  if (approvedOrganizationNumbers.length > 0) {
    const isApproved = approvedOrganizationNumbers.some(
      (approved) => approved.trim().replace(/[()\s-]/g, "") === clean
    );
    if (!isApproved) {
      return { isValid: false, error: "Transfer destination is not in the organization's verified staff numbers or transfer allowlist." };
    }
  }

  return { isValid: true, sanitizedNumber: clean };
}

/**
 * REQ 18: Prevent sensitive data from appearing in call-debug logs.
 */
export function maskCallDebugData(data: Record<string, any>): Record<string, any> {
  const masked: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      let val = value;
      val = val.replace(/\b4[0-9]{12}(?:[0-9]{3})?\b/g, "[MASKED_CARD]");
      val = val.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[MASKED_SSN]");
      val = val.replace(/\b(?:sk|pk|token|key)_[a-zA-Z0-9_\-]{16,}\b/gi, "[MASKED_KEY]");
      val = val.replace(/(password|passwd|pin)\s*[:=]\s*\S+/gi, "$1: [MASKED]");
      masked[key] = val;
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      masked[key] = maskCallDebugData(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

