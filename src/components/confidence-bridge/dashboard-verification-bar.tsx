"use client";

import * as React from "react";
import { ShieldAlert, Play, CheckCircle2, X } from "lucide-react";
import { VerificationStatus } from "@/server/services/verification/types";
import { ConfidenceBridge } from "./confidence-bridge";

interface DashboardVerificationBarProps {
  businessName: string;
  verificationStatus: VerificationStatus;
  orgId?: string;
}

export function DashboardVerificationBar({
  businessName,
  verificationStatus,
  orgId,
}: DashboardVerificationBarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  if (verificationStatus === "verified" || dismissed) {
    return null;
  }

  const isReview = verificationStatus === "needs_review";

  return (
    <>
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-space-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-3 animate-fade-in">
        <div className="flex items-center gap-space-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <p className="text-body-sm font-bold text-foreground">
              {isReview ? "AI Verification Needs Review" : "AI Verification Incomplete"}
            </p>
            <p className="text-caption text-muted-foreground">
              {isReview
                ? "Recent changes to services or hours require re-verifying critical AI behaviors."
                : "Verify your AI's pricing quotes, booking dry-run, and safety boundaries before connecting real customer channels."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-2 shrink-0">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-space-1.5 rounded-xl bg-amber-500 px-space-4 py-space-2 text-[12px] font-bold text-white hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>{isReview ? "Review Verification" : "Run Verification"}</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-amber-500/10 hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Verification Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-space-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-space-6 sm:p-space-8 shadow-2xl space-y-space-6 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-space-2 border-b border-border">
              <div className="flex items-center gap-space-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h3 className="text-title-md font-bold text-foreground">AI Verification Studio</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ConfidenceBridge
              businessName={businessName}
              orgId={orgId}
              onFinish={() => setIsOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
