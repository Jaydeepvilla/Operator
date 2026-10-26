import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "./utils";
import { SparklineCard } from "@/components/charts"

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: string;
    positive?: boolean;
  };
  subtitle?: string;
  chartData?: any[];
  chartCategories?: string[];
  chartColors?: string[];
  iconClassName?: string;
}

/**
 * Premium stat/metric card for dashboards.
 */
export function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  subtitle, 
  chartData, 
  chartCategories, 
  chartColors, 
  iconClassName, 
  className, 
  ...props 
}: StatCardProps) {
  return (
    <div
      className={cn(
        "stat-card relative overflow-hidden radius-xl p-space-5 flex flex-col justify-between border border-border-default bg-card hover:border-primary/30 transition-all duration-200 shadow-sm hover:shadow-md group min-h-[145px]",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between z-10 relative">
        <span className="text-caption text-muted-foreground font-semibold uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <div className={cn("flex h-8 w-8 items-center justify-center radius-lg transition-transform duration-200 group-hover:scale-105", iconClassName || "bg-[hsl(var(--foreground)/0.04)] text-foreground")}>
            <Icon className="h-4 w-4"/>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-space-1.5 mt-space-3 z-10 relative pr-[100px]">
        <div className="flex items-baseline gap-space-2.5">
          <span className="text-3xl font-bold text-foreground tracking-tight leading-none tabular-nums">
            {value}
          </span>
          {trend && (
            <span
              className={cn(
                "text-caption font-bold leading-none px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0",
                trend.positive 
                  ? "bg-[hsl(var(--state-success-bg))] border-[hsl(var(--state-success-border))] text-[hsl(var(--state-success-text))]"
                  : "bg-[hsl(var(--state-error-bg))] border-[hsl(var(--state-error-border))] text-[hsl(var(--state-error-text))]"
              )}
            >
              {trend.positive ? "↑" : "↓"} {trend.value}
            </span>
          )}
        </div>
        
        {subtitle && (
          <span className="text-caption text-muted-foreground leading-normal line-clamp-1">{subtitle}</span>
        )}
      </div>

      {chartData && chartCategories && (
        <div className="absolute right-space-5 bottom-space-4 w-24 opacity-80 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <SparklineCard 
            data={chartData} 
            categories={chartCategories} 
            colors={chartColors || ["hsl(var(--primary))"]}
            height={36} 
          />
        </div>
      )}
    </div>
  );
}
