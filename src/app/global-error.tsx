"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "fatal",
        context: "GlobalErrorBoundary",
        digest: error.digest,
        message: error.message,
      })
    );
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-[#09090b] text-[#fafafa] font-sans antialiased min-h-screen flex items-center justify-center p-6">
        <div className="flex flex-col items-center justify-center text-center max-w-md w-full">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400 mb-6 border border-red-500/20">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#fafafa] mb-2">
            Application Error
          </h1>
          <p className="text-sm text-[#a1a1aa] leading-relaxed mb-4">
            A critical error occurred while running the application. Please try reloading the page.
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-[#71717a] mb-6">
              Ref: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-[#fafafa] text-[#09090b] hover:bg-[#e4e4e7] transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
