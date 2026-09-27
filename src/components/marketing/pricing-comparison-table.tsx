"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronRight, Sparkles, MessageSquare, Phone, Calendar, Brain, Shield, Users } from "lucide-react";
import { cn } from "@/components/shared/utils";
import { Button } from "@/components/shared/button";

export interface PlanComparisonData {
  id: string;
  name: string;
  highlight?: boolean;
  badge?: string;
  price: number;
  yearlyPrice: number;
  features: Record<string, string | boolean | null>;
}

export interface FeatureCategory {
  label: string;
  icon?: React.ReactNode;
  features: string[];
}

interface PricingComparisonTableProps {
  plans: PlanComparisonData[];
  categories: FeatureCategory[];
  yearly: boolean;
  className?: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Core Messaging": <MessageSquare className="h-4 w-4 text-primary" />,
  "Voice AI": <Phone className="h-4 w-4 text-emerald-500" />,
  "Scheduling": <Calendar className="h-4 w-4 text-indigo-500" />,
  "AI & Automation": <Brain className="h-4 w-4 text-amber-500" />,
  "Platform": <Users className="h-4 w-4 text-blue-500" />,
  "Support & SLA": <Shield className="h-4 w-4 text-emerald-500" />,
};

function FeatureCell({ value, isPopular }: { value: string | boolean | null; isPopular?: boolean }) {
  if (value === true) {
    return (
      <div className="flex items-center justify-center">
        <span
          className={cn(
            "flex items-center justify-center h-6 w-6 rounded-full",
            isPopular ? "bg-primary/15 text-primary" : "bg-emerald-500/10 text-emerald-500"
          )}
        >
          <Check className="h-3.5 w-3.5" />
        </span>
      </div>
    );
  }
  if (value === false || value === null) {
    return (
      <div className="flex items-center justify-center">
        <span className="text-muted-foreground/30 font-mono text-body-sm">—</span>
      </div>
    );
  }
  return (
    <span
      className={cn(
        "text-caption font-medium",
        isPopular ? "text-foreground font-semibold" : "text-foreground/80"
      )}
    >
      {value}
    </span>
  );
}

export function PricingComparisonTable({
  plans,
  categories,
  yearly,
  className,
}: PricingComparisonTableProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (label: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    categories.forEach((c) => {
      all[c.label] = true;
    });
    setCollapsedCategories(all);
  };

  const expandAll = () => {
    setCollapsedCategories({});
  };

  const isAllCollapsed = categories.every((c) => collapsedCategories[c.label]);

  return (
    <div className={cn("w-full relative", className)}>
      {/* Table Toolbar */}
      <div className="flex items-center justify-between gap-space-4 mb-space-4 px-space-2 text-caption">
        <span className="text-muted-foreground font-mono text-[11px] uppercase tracking-wider">
          Compare all {categories.reduce((acc, c) => acc + c.features.length, 0)} features across 3 tiers
        </span>
        <button
          type="button"
          onClick={isAllCollapsed ? expandAll : collapseAll}
          className="text-primary hover:text-primary-hover font-semibold text-caption cursor-pointer transition-colors"
        >
          {isAllCollapsed ? "Expand all sections" : "Collapse all sections"}
        </button>
      </div>

      {/* Responsive Table Container with horizontal scroll affordance */}
      <div className="overflow-x-auto rounded-2xl border border-[hsl(var(--foreground)/0.08)] bg-card/40 backdrop-blur-xs shadow-sm no-scrollbar">
        <table className="w-full text-left border-collapse min-w-[640px]">
          {/* Sticky Table Header */}
          <thead className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-[hsl(var(--foreground)/0.08)] shadow-2xs">
            <tr>
              <th className="px-space-6 py-space-5 text-left text-body-sm font-semibold text-foreground/80 w-[34%]">
                Plan Overview
              </th>
              {plans.map((p) => {
                const isPopular = p.highlight || p.id === "professional";
                return (
                  <th
                    key={p.id}
                    className={cn(
                      "px-space-5 py-space-5 text-center transition-colors relative w-[22%]",
                      isPopular
                        ? "bg-primary/[0.04] border-x border-primary/20"
                        : "border-x border-transparent"
                    )}
                  >
                    {isPopular && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-primary font-bold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 mb-1">
                        <Sparkles className="h-2.5 w-2.5" /> Most Popular
                      </span>
                    )}
                    <div className="text-body-md font-bold text-foreground">{p.name}</div>
                    <div className="text-body-sm font-mono text-muted-foreground mt-0.5">
                      ${yearly ? p.yearlyPrice : p.price}
                      <span className="text-[10px]">/mo</span>
                    </div>
                    <div className="mt-space-2.5">
                      <Button
                        asChild
                        size="sm"
                        variant={isPopular ? "default" : "outline"}
                        className="w-full text-caption h-8 font-semibold"
                      >
                        <Link href="/sign-up">Start Free</Link>
                      </Button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {categories.map((cat) => {
              const isCollapsed = collapsedCategories[cat.label];
              const icon = CATEGORY_ICONS[cat.label] || <Sparkles className="h-4 w-4 text-primary" />;

              return (
                <React.Fragment key={cat.label}>
                  {/* Category Header Row */}
                  <tr
                    onClick={() => toggleCategory(cat.label)}
                    className="border-t border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] hover:bg-[hsl(var(--foreground)/0.035)] cursor-pointer transition-colors select-none"
                  >
                    <td
                      colSpan={plans.length + 1}
                      className="px-space-6 py-space-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-space-2.5">
                          <span className="p-1 rounded-md bg-[hsl(var(--foreground)/0.04)]">
                            {icon}
                          </span>
                          <span className="text-body-sm font-bold text-foreground">
                            {cat.label}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground bg-[hsl(var(--foreground)/0.04)] px-2 py-0.5 rounded-full font-semibold">
                            {cat.features.length}
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Feature Rows */}
                  {!isCollapsed &&
                    cat.features.map((feat, idx) => (
                      <tr
                        key={feat}
                        className={cn(
                          "border-b border-[hsl(var(--foreground)/0.04)] transition-colors hover:bg-[hsl(var(--foreground)/0.02)]",
                          idx % 2 === 1 && "bg-[hsl(var(--foreground)/0.008)]"
                        )}
                      >
                        {/* Feature Name */}
                        <td className="px-space-6 py-space-3.5 text-body-sm text-foreground/80 font-medium">
                          {feat}
                        </td>

                        {/* Plan Feature Values */}
                        {plans.map((p) => {
                          const isPopular = p.highlight || p.id === "professional";
                          const val = p.features[feat] ?? false;
                          return (
                            <td
                              key={p.id}
                              className={cn(
                                "px-space-5 py-space-3.5 text-center transition-colors",
                                isPopular && "bg-primary/[0.03] border-x border-primary/15 font-medium"
                              )}
                            >
                              <FeatureCell value={val} isPopular={isPopular} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
