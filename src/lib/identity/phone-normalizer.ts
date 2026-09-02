import { parsePhoneNumberFromString as parseCore, CountryCode } from "libphonenumber-js/core";
import metadata from "libphonenumber-js/metadata.min.json";

export interface NormalizedPhoneSuccess {
  success: true;
  rawPhone: string;
  e164: string; // E.164 canonical format: +<country_code><national_number>
  country?: string; // ISO 2-letter country code (e.g. 'US', 'IN', 'GB')
  countryCallingCode?: string; // e.g. '1', '91', '44'
  nationalNumber: string; // e.g. '9876543210'
  internationalFormatted: string; // e.g. '+91 98765 43210'
  isValid: boolean;
}

export type PhoneFailureReason =
  | "EMPTY_PHONE"
  | "INVALID_PHONE"
  | "TOO_SHORT"
  | "TOO_LONG"
  | "UNPARSEABLE";

export interface NormalizedPhoneFailure {
  success: false;
  rawPhone?: string;
  reason: PhoneFailureReason;
  isValid: false;
}

export type NormalizedPhoneResult = NormalizedPhoneSuccess | NormalizedPhoneFailure;

export interface PhoneNormalizationOptions {
  defaultCountry?: string | null; // e.g. 'US', 'IN', 'GB'
  organizationCountry?: string | null;
  allowedCountries?: string[];
}

/**
 * Robust, international phone number normalizer that produces canonical E.164 identifiers.
 */
export function normalizePhoneNumber(
  rawPhone?: string | null,
  options: PhoneNormalizationOptions = {}
): NormalizedPhoneResult {
  if (!rawPhone || typeof rawPhone !== "string") {
    return { success: false, reason: "EMPTY_PHONE", isValid: false };
  }

  const trimmed = rawPhone.trim();
  if (!trimmed) {
    return { success: false, reason: "EMPTY_PHONE", isValid: false };
  }

  // Resolve default country code preference (default to US if not provided)
  const candidateCountry = (
    options.organizationCountry ||
    options.defaultCountry ||
    "US"
  ).toUpperCase() as CountryCode;

  try {
    // 1. Try standard parsing with default country context
    let parsed = parseCore(trimmed, candidateCountry, metadata);

    // 2. If not valid and starts without '+', try prepending '+' with pure digits
    if ((!parsed || !parsed.isValid()) && !trimmed.startsWith("+")) {
      const digitsOnly = trimmed.replace(/\D/g, "");
      const parsedWithPlus = parseCore(`+${digitsOnly}`, candidateCountry, metadata);
      if (parsedWithPlus && (parsedWithPlus.isValid() || parsedWithPlus.isPossible())) {
        parsed = parsedWithPlus;
      }
    }

    // 3. Try removing leading zeroes (e.g. "09876543210" or "(98765) 43210")
    if (!parsed || !parsed.isValid()) {
      const stripped = trimmed.replace(/^0+/, "").replace(/[\s\-\(\)\.]/g, "");
      const parsedStripped = parseCore(stripped, candidateCountry, metadata);
      if (parsedStripped && (parsedStripped.isValid() || parsedStripped.isPossible())) {
        parsed = parsedStripped;
      }
    }

    // 4. Validate parsed result
    if (parsed && (parsed.isValid() || parsed.isPossible())) {
      const e164 = parsed.number; // E.164 format: e.g. "+919876543210"
      const country = parsed.country;
      const countryCallingCode = parsed.countryCallingCode;
      const nationalNumber = parsed.nationalNumber;
      const internationalFormatted = parsed.formatInternational ? parsed.formatInternational() : e164;

      return {
        success: true,
        rawPhone: trimmed,
        e164,
        country: country || undefined,
        countryCallingCode: countryCallingCode || undefined,
        nationalNumber,
        internationalFormatted,
        isValid: parsed.isValid(),
      };
    }

    // Fallback: If digits length is between 7 and 15, provide best-effort E.164 fallback
    const digitsOnly = trimmed.replace(/\D/g, "");
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      const fallbackE164 = trimmed.startsWith("+")
        ? `+${digitsOnly}`
        : candidateCountry === "IN"
        ? `+91${digitsOnly.replace(/^0+/, "")}`
        : `+1${digitsOnly}`;
      return {
        success: true,
        rawPhone: trimmed,
        e164: fallbackE164,
        country: candidateCountry,
        nationalNumber: digitsOnly,
        internationalFormatted: fallbackE164,
        isValid: false, // flagged as possible/fallback
      };
    }

    return {
      success: false,
      rawPhone: trimmed,
      reason: digitsOnly.length < 7 ? "TOO_SHORT" : "INVALID_PHONE",
      isValid: false,
    };
  } catch (err) {
    return {
      success: false,
      rawPhone: trimmed,
      reason: "UNPARSEABLE",
      isValid: false,
    };
  }
}
