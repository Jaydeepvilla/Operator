"use client";

import { m } from "framer-motion";
import { hoverScale } from "@/components/motion/hover";
import { GlobalGapAnalysis } from "@/lib/gap-analysis-engine";
import { Card } from "@/components/shared/card";
import { NativeButton } from "@/components/shared/native";
import Link from "next/link";
import {
  Target,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Package,
  Users,
  FileText,
  Plug,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/components/shared/utils";
import { useState } from "react";
import { APP_ROUTES } from "@/lib/constants/routes";

interface MissedOppsWidgetProps {
  gapAnalysis: GlobalGapAnalysis;
}

const CATEGORY_META: Record<
  string,
  { icon: React.ElementType; label: string; href: string; color: string; iconBg: string }
> = {
  businessInfo: { icon: Building2, label: "Business Info", href: APP_ROUTES.profile, color: "text-primary", iconBg: "bg-primary/10" },
  services:     { icon: Package,   label: "Services",      href: APP_ROUTES.services, color: "text-primary",                          iconBg: "bg-primary/10" },
  staff:        { icon: Users,     label: "Staff",          href: APP_ROUTES.staff,    color: "text-[hsl(var(--state-info-text))]",        iconBg: "bg-[hsl(var(--state-info-bg))]" },
  documents:    { icon: FileText,  label: "Knowledge",     href: APP_ROUTES.kb,       color: "text-[hsl(var(--state-success-text))]",iconBg: "bg-[hsl(var(--state-success-bg))]" },
  integrations: { icon: Plug,      label: "Integrations",  href: APP_ROUTES.channels, color: "text-[hsl(var(--state-warning-text))]",   iconBg: "bg-[hsl(var(--state-warning-bg))]" },
};

export function MissedOppsWidget({ gapAnalysis }: MissedOppsWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const { totalMissingItems, breakdown } = gapAnalysis;

  const categories = Object.entries(breakdown)
    .map(([key, result]) => {
      const meta = CATEGORY_META[key] ?? {
        icon: AlertTriangle,
        label: key,
        href: APP_ROUTES.settings,
        color: "text-amber-500",
        iconBg: "bg-amber-500/10",
      };
      return { key, ...meta, missing: result.missingItems, score: result.score };
    })
    .filter((c) => c.missing.length > 0)
    .sort((a, b) => a.score - b.score);

  const visibleCategories = expanded ? categories : categories.slice(0, 3);

  if (totalMissingItems === 0) {
    return (
      <m.div whileHover={hoverScale}>
        <Card className="h-full p-space-5 flex flex-col items-center justify-center text-center gap-space-3 border border-[hsl(var(--foreground)/0.07)]">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-body-sm font-bold text-foreground">No Gaps Found</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">Your business is fully configured.</p>
          </div>
        </Card>
      </m.div>
    );
  }

  return (
    <m.div whileHover={hoverScale}>
      <Card className="h-full flex flex-col overflow-hidden border border-[hsl(var(--foreground)/0.07)]">
        <div className="p-space-5 flex flex-col gap-space-4 flex-1">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-2">
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Target className="w-3.5 h-3.5 text-[hsl(var(--state-warning-text))]" />
              </div>
              <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                Missing Requirements
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[hsl(var(--state-warning-bg))] text-[hsl(var(--state-warning-text))] border border-[hsl(var(--state-warning-border))]">
              {totalMissingItems} total
            </span>
          </div>

          {/* Categorized missing items */}
          <div className="space-y-space-2 flex-1">
            {visibleCategories.map((cat) => {
              const IconComp = cat.icon;
              return (
                <Link
                  key={cat.key}
                  href={cat.href}
                  className="flex items-center justify-between p-space-3 rounded-lg bg-[hsl(var(--foreground)/0.02)] hover:bg-[hsl(var(--foreground)/0.05)] border border-[hsl(var(--foreground)/0.05)] transition-colors group"
                >
                  <div className="flex items-center gap-space-2.5 min-w-0">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", cat.iconBg)}>
                      <IconComp className={cn("w-3.5 h-3.5", cat.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-body-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {cat.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 truncate">
                        {cat.missing.slice(0, 2).join(", ")}
                        {cat.missing.length > 2 ? ` +${cat.missing.length - 2} more` : ""}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors shrink-0 ml-2" />
                </Link>
              );
            })}
          </div>

          {/* Expand/collapse if more than 3 */}
          {categories.length > 3 && (
            <NativeButton
              type="button"
              className="w-full text-caption text-muted-foreground/60 hover:text-muted-foreground flex items-center justify-center pt-2"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" /> Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" /> Show {categories.length - 3} More
                </>
              )}
            </NativeButton>
          )}
        </div>
      </Card>
    </m.div>
  );
}
