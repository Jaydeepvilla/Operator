"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/shared/button";
import Link from "next/link";
import { sentry } from "@/lib/observability/sentry";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to structured logger and Sentry bridge
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        context: "DashboardErrorBoundary",
        digest: error.digest,
        message: error.message,
      })
    );

    sentry.captureException(error, {
      tags: {
        context: "DashboardErrorBoundary",
        digest: error.digest || "none",
      },
    });
  }, [error]);

  return (
    <div className="flex min-h-[var(--min-h-60,60vh)] flex-col items-center justify-center text-center p-space-8">
      <div className="flex h-16 w-16 items-center justify-center radius-full bg-destructive/10 text-destructive mb-space-6">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="text-heading-lg  text-foreground mb-space-2">
        Something went wrong
      </h1>
      <p className="text-body-sm text-muted-foreground max-w-sm leading-relaxed mb-space-2">
        We couldn't load this page. This is usually temporary — try refreshing.
      </p>
      {error.digest && (
        <p className="font-mono text-caption text-muted-foreground/40 mb-space-8">
          Ref: {error.digest}
        </p>
      )}
      {!error.digest && <div className="mb-space-8" />}
      <div className="flex items-center gap-space-3">
        <Button onClick={reset} id="error-retry-btn">
          <RefreshCw className="h-4 w-4" />
          Refresh Page
        </Button>
        <Button asChild variant="outline" id="error-home-btn">
          <Link href="/dashboard">
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
