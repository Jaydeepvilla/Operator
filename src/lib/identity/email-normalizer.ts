export interface NormalizedEmailSuccess {
  success: true;
  rawEmail: string;
  normalizedEmail: string; // trimmed and lowercased
  domain: string;
  localPart: string;
  isValid: boolean;
}

export interface NormalizedEmailFailure {
  success: false;
  rawEmail?: string;
  reason: "EMPTY_EMAIL" | "INVALID_EMAIL" | "MISSING_DOMAIN";
  isValid: false;
}

export type NormalizedEmailResult = NormalizedEmailSuccess | NormalizedEmailFailure;

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Normalizes email strings deterministically.
 */
export function normalizeEmail(rawEmail?: string | null): NormalizedEmailResult {
  if (!rawEmail || typeof rawEmail !== "string") {
    return { success: false, reason: "EMPTY_EMAIL", isValid: false };
  }

  const trimmed = rawEmail.trim();
  if (!trimmed) {
    return { success: false, reason: "EMPTY_EMAIL", isValid: false };
  }

  const lower = trimmed.toLowerCase();
  const parts = lower.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1] || !parts[1].includes(".")) {
    return { success: false, rawEmail: trimmed, reason: "INVALID_EMAIL", isValid: false };
  }

  const isValid = EMAIL_REGEX.test(lower);

  return {
    success: true,
    rawEmail: trimmed,
    normalizedEmail: lower,
    localPart: parts[0],
    domain: parts[1],
    isValid,
  };
}
