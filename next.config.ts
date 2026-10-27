import { withSentryConfig } from "@sentry/nextjs/config";
// Force rebuild touch for DB SSL settings reload
import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.razorpay.com https://*.posthog.com https://*.sentry.io https://challenges.cloudflare.com https://snippet.maze.co https://*.maze.co",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.razorpay.com https://*.gravatar.com https://images.unsplash.com https://*.maze.co",
      "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://*.razorpay.com https://*.posthog.com https://*.sentry.io https://generativelanguage.googleapis.com wss://*.twilio.com https://challenges.cloudflare.com https://snippet.maze.co https://*.maze.co",
      "frame-src 'self' https://api.razorpay.com https://*.razorpay.com https://challenges.cloudflare.com https://*.maze.co",
      "worker-src 'self' blob:",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "kokoro-js",
    "@huggingface/transformers",
    "phonemizer",
    "onnxruntime-node",
  ],
  async headers() {
    return [
      {
        // Apply security headers to all routes except widget iframe
        source: "/((?!widget-frame|widget\\.js).*)",
        headers: securityHeaders,
      },
      {
        // Embed-safe headers for widget iframe to allow external embedding on client sites
        source: "/widget-frame",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
      {
        // Headers for widget script loader
        source: "/widget.js",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // CORS headers for public widget APIs
        source: "/api/widget/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "apps.nexxtechnologies.com",
          },
        ],
        destination: "https://operator.nexxtechnologies.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "apps.nexxtechnolgoies.com",
          },
        ],
        destination: "https://operator.nexxtechnologies.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "ai-appointments-git-main-jc16.vercel.app",
          },
        ],
        destination: "https://operator.nexxtechnologies.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "ai-appointments-jzovt71pf-jc16.vercel.app",
          },
        ],
        destination: "https://operator.nexxtechnologies.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "ai-appointments(.*)\\.vercel\\.app",
          },
        ],
        destination: "https://operator.nexxtechnologies.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "operator-azure(.*)\\.vercel\\.app",
          },
        ],
        destination: "https://operator.nexxtechnologies.com/:path*",
        permanent: true,
      },
    ];
  },
  // Logging configuration
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "nexxtechnologies",

  project: "operator",

  authToken: process.env.SENTRY_AUTH_TOKEN,

  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  release: {
    create: Boolean(process.env.SENTRY_AUTH_TOKEN),
  },

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
