"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, User, Clock } from "lucide-react";
import { Button } from "@/components/shared/button";
import { COPY } from "@/lib/copy/labels";

export interface AttentionItem {
  id: string;
  customerName: string;
  summary: string;
  timeAgo: string;
  actionText: string;
  actionHref: string;
  priority?: "urgent" | "normal";
}

interface NeedsAttentionListProps {
  items: AttentionItem[];
}

export function NeedsAttentionList({ items }: NeedsAttentionListProps) {
  const visibleItems = items.slice(0, 5);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-space-6 shadow-sm space-y-space-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h3 className="text-body-md font-bold text-foreground">Needs Your Attention</h3>
          {visibleItems.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
              {visibleItems.length}
            </span>
          )}
        </div>

        {visibleItems.length > 0 && (
          <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-primary">
            <Link href="/escalations">
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        )}
      </div>

      {/* Empty State */}
      {visibleItems.length === 0 ? (
        <div className="p-space-6 rounded-xl border border-dashed border-border/70 text-center space-y-2 bg-muted/20">
          <div className="h-10 w-10 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-body-sm font-semibold text-foreground">
            {COPY.home.attentionEmpty}
          </p>
          <p className="text-caption text-muted-foreground max-w-sm mx-auto">
            When a customer requests a manager or a booking requires confirmation, it will appear here with a one-click button.
          </p>
        </div>
      ) : (
        /* Max 5 Items with 1 Button Each */
        <div className="divide-y divide-border/40">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="py-3.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-body-sm font-semibold text-foreground">
                    {item.customerName}
                  </span>
                  <span className="text-xs text-muted-foreground/80 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{item.timeAgo}</span>
                  </span>
                </div>
                <p className="text-caption text-muted-foreground leading-relaxed">
                  {item.summary}
                </p>
              </div>

              <div className="shrink-0">
                <Button asChild size="sm" variant="outline" className="gap-1 font-semibold text-xs">
                  <Link href={item.actionHref}>
                    <span>{item.actionText}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

