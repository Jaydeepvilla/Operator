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
  defaultDomain: "operator.nexxtechnologies.com",
  defaultAppUrl: "https://operator.nexxtechnologies.com",
  defaultSupportEmail: "support@nexxtechnologies.com",
  defaultPrivacyEmail: "privacy@nexxtechnologies.com",
  defaultLegalEmail: "legal@nexxtechnologies.com",
  defaultSecurityEmail: "security@nexxtechnologies.com",
  defaultHelloEmail: "hello@nexxtechnologies.com",
  defaultAssistantEmail: "assistant@operator.nexxtechnologies.com",
  defaultVoiceAssistantName: "Operator AI",
} as const;

export const SUPPORT_EMAIL = BRAND_CONFIG.defaultSupportEmail;
