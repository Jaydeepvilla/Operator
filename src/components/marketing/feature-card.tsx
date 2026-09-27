"use client";

import * as React from "react";
import { cn } from "@/components/shared/utils";

export interface FeatureCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  badge?: string;
  variant?: "flagship" | "standard" | "compact" | "metric";
  metric?: {
    value: string;
    label: string;
    sublabel?: string;
  };
  highlight?: boolean;
  className?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export function FeatureCard({
  title,
  description,
  icon,
  badge,
  variant = "standard",
  metric,
  highlight = false,
  className,
  children,
  footer,
}: FeatureCardProps) {
  const isFlagship = variant === "flagship";
  const isCompact = variant === "compact";
  const isMetric = variant === "metric";

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border transition-all duration-300 ease-out",
        "bg-card/40 backdrop-blur-xs",
        "border-[hsl(var(--foreground)/0.06)] hover:border-primary/30",
        "hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5",
        highlight && "ring-1 ring-primary/20 border-primary/25 bg-primary/[0.02]",
        isFlagship && "p-space-8 md:p-space-10",
        isCompact && "p-space-5",
        !isFlagship && !isCompact && "p-space-6 md:p-space-7",
        className
      )}
    >
      {/* Subtle top glare gradient */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--foreground)/0.08)] to-transparent group-hover:via-primary/30 transition-all duration-500" />

      {/* Main card body */}
      <div>
        {/* Header row: Icon & Badge */}
        <div className="flex items-center justify-between gap-space-3 mb-space-4">
          {icon && (
            <div
              className={cn(
                "flex items-center justify-center rounded-xl transition-colors duration-300",
                isFlagship ? "h-11 w-11 bg-primary/10 text-primary" : "h-9 w-9 bg-[hsl(var(--foreground)/0.04)] text-foreground group-hover:text-primary group-hover:bg-primary/10"
              )}
            >
              {icon}
            </div>
          )}
          {badge && (
            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold px-space-2.5 py-space-1 rounded-full border border-primary/20 bg-primary/5 text-primary">
              {badge}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className={cn(
            "font-semibold text-foreground tracking-tight transition-colors duration-200",
            isFlagship ? "text-heading-sm md:text-heading-md mb-space-3" : "text-title-md mb-space-2",
            isCompact && "text-body-md mb-space-1"
          )}
        >
          {title}
        </h3>

        {/* Description */}
        <p
          className={cn(
            "text-muted-foreground leading-relaxed",
            isFlagship ? "text-body-md mb-space-6" : "text-caption md:text-body-sm mb-space-5",
            isCompact && "text-caption mb-space-3"
          )}
        >
          {description}
        </p>

        {/* Optional Metric Highlight */}
        {metric && (
          <div className="my-space-4 p-space-4 rounded-xl border border-[hsl(var(--foreground)/0.05)] bg-[hsl(var(--foreground)/0.02)]">
            <div className="text-display-xs md:text-heading-lg font-mono font-bold text-foreground">
              {metric.value}
            </div>
            <div className="text-caption font-semibold text-muted-foreground mt-space-0.5">
              {metric.label}
            </div>
            {metric.sublabel && (
              <div className="text-[10px] text-muted-foreground/70 mt-space-0.5">
                {metric.sublabel}
              </div>
            )}
          </div>
        )}

        {/* Inner Interactive Children */}
        {children && <div className="mt-space-2 mb-space-4">{children}</div>}
      </div>

      {/* Footer slot */}
      {footer && (
        <div className="mt-space-4 pt-space-4 border-t border-[hsl(var(--foreground)/0.05)]">
          {footer}
        </div>
      )}
    </div>
  );
}
