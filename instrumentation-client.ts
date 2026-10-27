import * as Sentry from "@sentry/nextjs";
import { sentry } from "./src/lib/observability/sentry";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: process.env.NODE_ENV || "development",
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    beforeSend: (event) => sentry.beforeSendScrubber(event),
    beforeSendTransaction: (event) => sentry.beforeSendTransactionScrubber(event),
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
