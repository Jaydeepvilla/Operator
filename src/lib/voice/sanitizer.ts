/**
 * Voice Response Sanitization & Legacy Branding Guard
 * Ensures spoken voice responses and synthesized TTS never contain outdated
 * legacy "Nexx" branding while preserving customer-owned content.
 */

import { PRODUCT_NAME, PRODUCT_AI_NAME } from "../constants/brand";

export interface SanitizeResult {
  sanitizedText: string;
  hadLegacyBranding: boolean;
  replacementsCount: number;
}

interface LegacyRule {
  pattern: RegExp;
  getReplacement: (businessName?: string) => string;
  description: string;
}

const LEGACY_VOICE_RULES: LegacyRule[] = [
  {
    pattern: /\b(thank\s+you\s+for\s+calling|thanks\s+for\s+calling)\s+nexx(?:\s+ai)?(?:\s+receptionist)?\b/gi,
    getReplacement: (biz) => biz ? `Thank you for calling ${biz}` : `Thanks for calling ${PRODUCT_AI_NAME}`,
    description: "Legacy 'Thank you for calling Nexx' greeting",
  },
  {
    pattern: /\bwelcome\s+to\s+nexx(?:\s+ai)?(?:\s+receptionist)?\b/gi,
    getReplacement: (biz) => biz ? `Welcome to ${biz}` : `Welcome to ${PRODUCT_NAME}`,
    description: "Legacy 'Welcome to Nexx' greeting",
  },
  {
    pattern: /\b(?:the\s+)?nexx(?:'s)?\s+(?:ai\s+)?receptionist\b/gi,
    getReplacement: (biz) => biz ? `${biz}'s assistant` : `${PRODUCT_AI_NAME}`,
    description: "Legacy 'Nexx AI Receptionist' descriptor",
  },
  {
    pattern: /\bnexx\s+ai\b/gi,
    getReplacement: () => PRODUCT_AI_NAME,
    description: "Legacy 'Nexx AI' product name",
  },
  {
    pattern: /\bnexx\s+receptionist\b/gi,
    getReplacement: () => PRODUCT_AI_NAME,
    description: "Legacy 'Nexx Receptionist' product name",
  },
  {
    pattern: /\bnexx\s+services\b/gi,
    getReplacement: () => `${PRODUCT_NAME} Services`,
    description: "Legacy 'Nexx Services' descriptor",
  },
  {
    pattern: /\bnexx\s+technologies\b/gi,
    getReplacement: () => `${PRODUCT_NAME} Technologies`,
    description: "Legacy 'Nexx Technologies' descriptor",
  },
  {
    pattern: /\bpowered\s+by\s+nexx(?:\s+ai)?\b/gi,
    getReplacement: () => `powered by ${PRODUCT_AI_NAME}`,
    description: "Legacy 'Powered by Nexx' tagline",
  },
];

/**
 * Sanitizes voice response text defensively before sending to TTS or caller.
 */
export function sanitizeVoiceResponse(
  text: string,
  options?: {
    businessName?: string;
    logWarning?: boolean;
  }
): SanitizeResult {
  if (!text || typeof text !== "string") {
    return { sanitizedText: text || "", hadLegacyBranding: false, replacementsCount: 0 };
  }

  let sanitized = text;
  let totalReplacements = 0;
  const shouldLog = options?.logWarning !== false;

  for (const rule of LEGACY_VOICE_RULES) {
    if (rule.pattern.test(sanitized)) {
      const original = sanitized;
      const replacement = rule.getReplacement(options?.businessName);
      sanitized = sanitized.replace(rule.pattern, replacement);
      
      if (original !== sanitized) {
        totalReplacements++;
        if (shouldLog) {
          console.warn(
            `[VoiceSanitizer] Intercepted legacy branding: "${rule.description}". Sanitized output for voice TTS.`
          );
        }
      }
    }
    // Reset regex index state for global RegExp
    rule.pattern.lastIndex = 0;
  }

  return {
    sanitizedText: sanitized,
    hadLegacyBranding: totalReplacements > 0,
    replacementsCount: totalReplacements,
  };
}
