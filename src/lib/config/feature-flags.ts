/**
 * Feature Flags Configuration
 *
 * Centralized feature toggles to control client-facing and enterprise features.
 * When a feature is disabled, it is hidden from all navigation, menus, and marketing.
 */

export const FEATURE_FLAGS = {
  /**
   * White-label & Agency Reseller Platform.
   * Disabled by default until direct service business market fit is proven (e.g. 10+ direct clients).
   * Can be toggled on via NEXT_PUBLIC_ENABLE_WHITE_LABEL=true or ENABLE_WHITE_LABEL=true in .env
   */
  ENABLE_WHITE_LABEL:
    process.env.NEXT_PUBLIC_ENABLE_WHITE_LABEL === "true" ||
    process.env.ENABLE_WHITE_LABEL === "true",
} as const;

export function isWhiteLabelEnabled(): boolean {
  return FEATURE_FLAGS.ENABLE_WHITE_LABEL;
}
