"use client";

import * as React from "react";
import { ShieldCheck, CheckCircle2, MessageSquare, Phone, Globe, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/components/shared/utils";

interface VerificationSummaryCardProps {
  businessName: string;
  isAllVerified: boolean;
  passedCount: number;
  totalCount: number;
  onGoToDashboard: () => void;
}

export function VerificationSummaryCard({
  businessName,
  isAllVerified,
  passedCount,
  totalCount,
  onGoToDashboard,
}: VerificationSummaryCardProps) {
  const router = useRouter();

  return (
    <div
      className={cn(
        "rounded-2xl border p-space-6 shadow-sm transition-all duration-300 space-y-space-5",
        isAllVerified
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-card"
      )}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-4">
        <div className="flex items-center gap-space-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-2xl shrink-0 transition-colors",
              isAllVerified
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                : "bg-muted text-muted-foreground"
            )}
          >
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-title-sm font-bold text-foreground">
              {isAllVerified
                ? `Operator is Verified for ${businessName}`
                : `Verification Progress (${passedCount}/${totalCount})`}
            </h3>
            <p className="text-body-sm text-muted-foreground">
              {isAllVerified
                ? "Critical pricing, booking dry-run, and safety boundaries are confirmed."
                : "Run the tests above to confirm critical AI behaviors before connecting real customer channels."}
            </p>
          </div>
        </div>

        {isAllVerified && (
          <button
            onClick={onGoToDashboard}
            className="flex items-center gap-space-2 rounded-xl bg-primary px-space-5 py-space-2.5 text-body-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 shrink-0"
          >
            <span>Complete Setup</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {isAllVerified && (
        <div className="space-y-space-3 pt-space-2 border-t border-emerald-500/20">
          <p className="text-[11px] font-bold text-foreground uppercase tracking-wider">
            Step 3: Connect Your Customer Channels
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-3">
            <button
              onClick={() => router.push("/channels")}
              className="flex items-center gap-space-3 rounded-xl border border-border bg-card p-space-3.5 text-left hover:border-primary hover:bg-primary/5 transition-all shadow-sm group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-foreground">WhatsApp Business</p>
                <p className="text-[10px] text-muted-foreground">Connect number & automated chat</p>
              </div>
            </button>

            <button
              onClick={() => router.push("/channels")}
              className="flex items-center gap-space-3 rounded-xl border border-border bg-card p-space-3.5 text-left hover:border-primary hover:bg-primary/5 transition-all shadow-sm group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-foreground">Smart Phone Line</p>
                <p className="text-[10px] text-muted-foreground">Forward business calls to Operator</p>
              </div>
            </button>

            <button
              onClick={() => router.push("/widget")}
              className="flex items-center gap-space-3 rounded-xl border border-border bg-card p-space-3.5 text-left hover:border-primary hover:bg-primary/5 transition-all shadow-sm group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-foreground">Live Website Widget</p>
                <p className="text-[10px] text-muted-foreground">Embed chat popup snippet</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
