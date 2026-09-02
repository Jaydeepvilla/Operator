/**
 * Canonical Brand & Platform Constants
 * Single source of truth for Operator product identity.
 */

export const PRODUCT_NAME = "Operator";
export const PRODUCT_AI_NAME = "Operator AI";
export const COMPANY_NAME = "Operator Technologies";

export const BRAND_CONFIG = {
  name: PRODUCT_NAME,
  aiName: PRODUCT_AI_NAME,
  companyName: COMPANY_NAME,
  defaultDomain: "operator.ai",
  defaultAppUrl: "https://app.operator.ai",
  defaultSupportEmail: "support@operator.ai",
  defaultPrivacyEmail: "privacy@operator.ai",
  defaultLegalEmail: "legal@operator.ai",
  defaultSecurityEmail: "security@operator.ai",
  defaultHelloEmail: "hello@operator.ai",
  defaultAssistantEmail: "assistant@operator.ai",
  defaultVoiceAssistantName: "Operator AI",
} as const;

export const SUPPORT_EMAIL = BRAND_CONFIG.defaultSupportEmail;
