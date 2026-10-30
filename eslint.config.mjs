import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const designSystemPlugin = {
  rules: {
    "enforce-tokens": {
      meta: {
        type: "problem",
        docs: {
          description: "Enforce design system tokens and block raw Tailwind utilities.",
        },
      },
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === "string") {
              const classes = node.value.split(/\s+/);
              classes.forEach(cls => {
                const isRawTextSize = /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)(?!\w|-(?:display|heading|title|body|label|caption|fs))\b/.test(cls);
                const isRawFontWeight = /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/.test(cls);
                const isRawSpacing = /^(p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-(\d+(\.\d+)?|\[[^\]]+\])\b/.test(cls);
                const isRawRadius = /^rounded-(sm|md|lg|xl|2xl|3xl|full|none|\[[^\]]+\])\b/.test(cls);
                const isHardcodedColor = /^(bg|text|border|ring|divide)-(slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(-\d+)?(\/[0-9]+)?\b/.test(cls);

                if (isRawTextSize || isRawFontWeight || isRawSpacing || isRawRadius || isHardcodedColor) {
                  context.report({
                    node,
                    message: `Forbidden Tailwind class "${cls}". Use Design System Tokens instead.`,
                  });
                }
              });
            }
          },
          TemplateElement(node) {
            if (node.value && node.value.cooked) {
              const classes = node.value.cooked.split(/\s+/);
              classes.forEach(cls => {
                const isRawTextSize = /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)(?!\w|-(?:display|heading|title|body|label|caption|fs))\b/.test(cls);
                const isRawFontWeight = /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/.test(cls);
                const isRawSpacing = /^(p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-(\d+(\.\d+)?|\[[^\]]+\])\b/.test(cls);
                const isRawRadius = /^rounded-(sm|md|lg|xl|2xl|3xl|full|none|\[[^\]]+\])\b/.test(cls);
                const isHardcodedColor = /^(bg|text|border|ring|divide)-(slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(-\d+)?(\/[0-9]+)?\b/.test(cls);

                if (isRawTextSize || isRawFontWeight || isRawSpacing || isRawRadius || isHardcodedColor) {
                  context.report({
                    node,
                    message: `Forbidden Tailwind class "${cls}". Use Design System Tokens instead.`,
                  });
                }
              });
            }
          }
        };
      }
    }
  }
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "design-system": designSystemPlugin,
    },
    rules: {
      "design-system/enforce-tokens": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".agents/**",
    ".agent/**",
    "playwright/**",
    "tests/**",
    "scripts/**",
    "test-results/**",
    "artifacts/**",
    "public/**",
  ]),
]);

export default eslintConfig;
