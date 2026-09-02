/**
 * @file button-tokens.ts
 * @description Canonical button design token map. Single source of truth.
 * All button-like elements (button, a, Link) must reference this file.
 *
 * @example
 *   import { getButtonClasses } from '@/design-system/button-tokens';
 * <button className={getButtonClasses('primary', 'filled', 'medium')}>Click</button>
 */

// ─── Token Types ──────────────────────────────────────────────────────────────

export type ButtonType = 'primary' | 'secondary' | 'tertiary';
export type ButtonVariant = 'filled' | 'outline' | 'ghost' | 'link';
export type ButtonSize = 'small' | 'medium' | 'large';

interface StateClasses {
 default: string;
 hover?: string;
 active?: string;
 focus?: string;
}

type VariantMap = Partial<Record<ButtonVariant, StateClasses>>;

interface ButtonTokenSchema {
 base: string;
 sizes: Record<ButtonSize, string>;
 types: Partial<Record<ButtonType, VariantMap>>;
}

// ─── Token Map ────────────────────────────────────────────────────────────────

export const BUTTON_TOKENS = {
 base: [
 'inline-flex', 'items-center', 'justify-center', 'rounded-full',
 'font-semibold', 'transition-all', 'duration-300', 'ease-out',
 'focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2',
 'disabled:opacity-50', 'disabled:pointer-events-none',
 ].join(' '),

 sizes: {
 small: 'px-4 py-2 text-sm h-9',
 medium: 'px-6 py-3 text-base h-12',
 large: 'px-8 py-4 text-lg h-14',
 } satisfies Record<ButtonSize, string>,

 types: {
 primary: {
 filled: {
 default: 'bg-[#0A0E17] text-white shadow-[0_4px_14px_0_rgba(10,14,23,0.15)]',
 hover: 'hover:bg-[#1a2133] hover:shadow-[0_6px_20px_rgba(10,14,23,0.23)] hover:-translate-y-0.5',
 active: 'active:bg-[#05070b] active:translate-y-0 active:shadow-none',
 focus: 'focus:ring-[#0A0E17]/50',
 },
 outline: {
 default: 'bg-transparent text-[#0A0E17] border-[#0A0E17]',
 hover: 'hover:bg-[#0A0E17] hover:text-white',
 active: 'active:bg-[#1a2133]',
 focus: 'focus:ring-[#0A0E17]/50',
 },
 ghost: {
 default: 'bg-transparent text-[#0A0E17]',
 hover: 'hover:bg-[#0A0E17]/5',
 active: 'active:bg-[#0A0E17]/10',
 focus: 'focus:ring-[#0A0E17]/50',
 },
 link: {
 default: 'bg-transparent text-[#0A0E17] underline-offset-4 hover:underline',
 hover: 'hover:text-[#1a2133]',
 active: 'active:text-[#05070b]',
 focus: 'focus:ring-[#0A0E17]/50',
 },
 },

 secondary: {
 filled: {
 default: 'bg-white text-[#0A0E17] border-gray-200/60 shadow-[0_2px_8px_0_rgba(0,0,0,0.04)]',
 hover: 'hover:bg-gray-50 hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.08)] hover:-translate-y-0.5',
 active: 'active:bg-gray-100 active:translate-y-0',
 focus: 'focus:ring-gray-200',
 },
 outline: {
 default: 'bg-transparent text-gray-700 border-gray-200',
 hover: 'hover:border-gray-300 hover:bg-gray-50',
 active: 'active:bg-gray-100',
 focus: 'focus:ring-gray-200',
 },
 ghost: {
 default: 'bg-transparent text-gray-600',
 hover: 'hover:bg-gray-100 hover:text-gray-800',
 active: 'active:bg-gray-200',
 focus: 'focus:ring-gray-200',
 },
 link: {
 default: 'bg-transparent text-gray-700 underline-offset-4 hover:underline',
 hover: 'hover:text-gray-900',
 active: 'active:text-gray-950',
 focus: 'focus:ring-gray-200',
 },
 },

 tertiary: {
 filled: {
 default: 'bg-gray-100 text-gray-800',
 hover: 'hover:bg-gray-200',
 active: 'active:bg-gray-300',
 focus: 'focus:ring-gray-300',
 },
 outline: {
 default: 'bg-transparent text-gray-500 border-gray-200',
 hover: 'hover:border-gray-300 hover:text-gray-700',
 active: 'active:bg-gray-100',
 focus: 'focus:ring-gray-200',
 },
 ghost: {
 default: 'bg-transparent text-gray-500',
 hover: 'hover:bg-gray-100 hover:text-gray-900',
 active: 'active:bg-gray-200',
 focus: 'focus:ring-gray-200',
 },
 link: {
 default: 'bg-transparent text-gray-500 underline-offset-4 hover:underline',
 hover: 'hover:text-gray-700',
 active: 'active:text-gray-900',
 focus: 'focus:ring-gray-200',
 },
 },
 },
} satisfies ButtonTokenSchema;

// ─── Runtime Resolver ─────────────────────────────────────────────────────────

/**
 * Resolves the complete Tailwind class string for a button by composing
 * base, size, and all four state layers (default/hover/active/focus).
 *
 * @param type - 'primary' | 'secondary' | 'tertiary'
 * @param variant - 'filled' | 'outline' | 'ghost' | 'link'
 * @param size - 'small' | 'medium' | 'large'
 * @param extra - Optional extra classes for one-off overrides
 *
 * @example
 * className={getButtonClasses('primary', 'filled', 'medium')}
 * className={getButtonClasses('secondary', 'outline', 'small', 'w-full')}
 */
export function getButtonClasses(
 type: ButtonType,
 variant: ButtonVariant,
 size: ButtonSize,
 extra?: string,
): string {
 const typeMap = BUTTON_TOKENS.types[type];
 if (!typeMap) {
 if (process.env.NODE_ENV !== 'production') {
 console.warn(`[design-system/button] Unknown type: "${type}". Falling back to "primary".`);
 }
 return getButtonClasses('primary', variant, size, extra);
 }

 const variantMap = typeMap[variant];
 if (!variantMap) {
 if (process.env.NODE_ENV !== 'production') {
 console.warn(
 `[design-system/button] Variant "${variant}" not found for type "${type}". Falling back to "filled".`,
 );
 }
 return getButtonClasses(type, 'filled', size, extra);
 }

 const parts = [
 BUTTON_TOKENS.base,
 BUTTON_TOKENS.sizes[size],
 variantMap.default ?? '',
 variantMap.hover ?? '',
 variantMap.active ?? '',
 variantMap.focus ?? '',
 extra ?? '',
 ].filter(Boolean);

 return parts.join(' ');
}

// ─── Pre-resolved Alias Map ───────────────────────────────────────────────────

/**
 * Eagerly evaluated convenience shortcuts for the most common button patterns.
 * Use these in static contexts (e.g., className={btn.primary.filled.md}).
 */
export const btn = {
 primary: {
 filled: { sm: getButtonClasses('primary', 'filled', 'small'), md: getButtonClasses('primary', 'filled', 'medium'), lg: getButtonClasses('primary', 'filled', 'large') },
 outline: { sm: getButtonClasses('primary', 'outline', 'small'), md: getButtonClasses('primary', 'outline', 'medium'), lg: getButtonClasses('primary', 'outline', 'large') },
 ghost: { sm: getButtonClasses('primary', 'ghost', 'small'), md: getButtonClasses('primary', 'ghost', 'medium'), lg: getButtonClasses('primary', 'ghost', 'large') },
 link: { sm: getButtonClasses('primary', 'link', 'small'), md: getButtonClasses('primary', 'link', 'medium'), lg: getButtonClasses('primary', 'link', 'large') },
 },
 secondary: {
 filled: { sm: getButtonClasses('secondary', 'filled', 'small'), md: getButtonClasses('secondary', 'filled', 'medium'), lg: getButtonClasses('secondary', 'filled', 'large') },
 outline: { sm: getButtonClasses('secondary', 'outline', 'small'), md: getButtonClasses('secondary', 'outline', 'medium'), lg: getButtonClasses('secondary', 'outline', 'large') },
 ghost: { sm: getButtonClasses('secondary', 'ghost', 'small'), md: getButtonClasses('secondary', 'ghost', 'medium'), lg: getButtonClasses('secondary', 'ghost', 'large') },
 link: { sm: getButtonClasses('secondary', 'link', 'small'), md: getButtonClasses('secondary', 'link', 'medium'), lg: getButtonClasses('secondary', 'link', 'large') },
 },
 tertiary: {
 filled: { sm: getButtonClasses('tertiary', 'filled', 'small'), md: getButtonClasses('tertiary', 'filled', 'medium'), lg: getButtonClasses('tertiary', 'filled', 'large') },
 outline: { sm: getButtonClasses('tertiary', 'outline', 'small'), md: getButtonClasses('tertiary', 'outline', 'medium'), lg: getButtonClasses('tertiary', 'outline', 'large') },
 ghost: { sm: getButtonClasses('tertiary', 'ghost', 'small'), md: getButtonClasses('tertiary', 'ghost', 'medium'), lg: getButtonClasses('tertiary', 'ghost', 'large') },
 link: { sm: getButtonClasses('tertiary', 'link', 'small'), md: getButtonClasses('tertiary', 'link', 'medium'), lg: getButtonClasses('tertiary', 'link', 'large') },
  },
} as const;
