"use client";

import * as React from "react";
import { cn } from "@/components/shared/utils";
import { Button } from "@/components/shared/button";
import { Check, CheckCircle2, Clock, ArrowUpRight, Zap } from "lucide-react";

export interface IntegrationData {
  id: string;
  name: string;
  category: string;
  status: "live" | "coming-soon";
  logo: React.ReactNode;
  desc: string;
  features: string[];
  difficulty: "Instant" | "1-Click" | "Setup Required";
  popularity?: "Core" | "Popular" | "Standard";
  capabilities?: string;
}

export interface IntegrationCardProps {
  integration: IntegrationData;
  variant?: "featured" | "directory" | "compact-row";
  isConnected?: boolean;
  isLoading?: boolean;
  onConnect?: (id: string) => void;
  className?: string;
}

export function IntegrationCard({
  integration,
  variant = "directory",
  isConnected = false,
  isLoading = false,
  onConnect,
  className,
}: IntegrationCardProps) {
  const isLive = integration.status === "live";

  /* ━━━ VARIANT 1: COMPACT ROW (High-Density List Mode) ━━━ */
  if (variant === "compact-row") {
    return (
      <div
        className={cn(
          "group flex items-center justify-between gap-space-4 px-space-5 py-space-3.5 rounded-xl border transition-all duration-200",
          "border-[hsl(var(--foreground)/0.06)] bg-card/35 hover:bg-card/70 hover:border-primary/25",
          isConnected && "border-primary/20 bg-primary/[0.02]",
          className
        )}
      >
        <div className="flex items-center gap-space-3.5 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-white border border-[hsl(var(--foreground)/0.08)] p-space-1.5 flex items-center justify-center shrink-0 shadow-2xs">
            {integration.logo}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-space-2">
              <h4 className="text-body-sm font-semibold text-foreground truncate">{integration.name}</h4>
              <span className="text-[10px] font-mono text-muted-foreground/70 uppercase px-space-2 py-space-0.5 rounded bg-[hsl(var(--foreground)/0.03)] shrink-0">
                {integration.category}
              </span>
            </div>
            <p className="text-caption text-muted-foreground truncate max-w-md hidden sm:block">
              {integration.desc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-3 shrink-0">
          <span
            className={cn(
              "text-[9px] font-mono uppercase tracking-wider px-space-2 py-space-0.5 rounded-full border hidden md:inline-flex items-center gap-1",
              isLive
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
            )}
          >
            {isLive ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live
              </>
            ) : (
              <>
                <Clock className="w-2.5 h-2.5" />
                Soon
              </>
            )}
          </span>

          {isLive ? (
            <Button
              onClick={() => onConnect?.(integration.id)}
              variant={isConnected ? "outline" : "default"}
              size="sm"
              disabled={isLoading}
              className="text-caption h-8 px-space-3"
            >
              {isLoading ? (
                "Connecting..."
              ) : isConnected ? (
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <Check className="h-3 w-3" /> Connected
                </span>
              ) : (
                "Connect"
              )}
            </Button>
          ) : (
            <span className="text-[11px] font-medium text-muted-foreground/60 px-space-2.5 py-1">
              Coming Soon
            </span>
          )}
        </div>
      </div>
    );
  }

  /* ━━━ VARIANT 2: FEATURED (Elevated Hero Bento Treatment) ━━━ */
  if (variant === "featured") {
    return (
      <div
        className={cn(
          "group relative flex flex-col justify-between rounded-2xl border transition-all duration-300 ease-out",
          "p-space-6 md:p-space-7 bg-card/50 backdrop-blur-xs",
          "border-[hsl(var(--foreground)/0.08)] hover:border-primary/35",
          "hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1",
          isConnected && "ring-1 ring-primary/20 bg-primary/[0.02]",
          className
        )}
      >
        {/* Top subtle highlight shimmer */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div>
          {/* Top Brand Bar */}
          <div className="flex items-center justify-between gap-space-3 mb-space-5">
            <div className="h-10 w-10 rounded-xl bg-white border border-[hsl(var(--foreground)/0.08)] p-space-2 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200">
              {integration.logo}
            </div>
            <div className="flex items-center gap-space-2">
              <span className="text-[10px] font-mono uppercase tracking-wider px-space-2.5 py-space-1 rounded-full border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] text-muted-foreground font-semibold">
                {integration.difficulty}
              </span>
              <span
                className={cn(
                  "text-[10px] font-mono uppercase tracking-wider px-space-2.5 py-space-1 rounded-full border font-bold inline-flex items-center gap-1",
                  isConnected
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                    : "bg-muted/40 text-muted-foreground border-border/40"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isConnected ? "bg-emerald-500" : "bg-muted-foreground/60"
                  )}
                />
                {isConnected ? "Connected" : "Ready"}
              </span>
            </div>
          </div>

          {/* Title & Category */}
          <div className="mb-space-2">
            <span className="text-[10px] font-mono tracking-widest uppercase font-semibold text-primary block mb-space-1">
              {integration.category}
            </span>
            <h3 className="text-title-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
              {integration.name}
            </h3>
          </div>

          <p className="text-caption md:text-body-sm text-muted-foreground leading-relaxed mb-space-5 min-h-[40px]">
            {integration.desc}
          </p>

          {/* Capabilities Callout Box */}
          {integration.capabilities && (
            <div className="mb-space-5 p-space-3.5 rounded-xl border border-[hsl(var(--foreground)/0.04)] bg-[hsl(var(--foreground)/0.015)] group-hover:bg-primary/[0.02] transition-colors">
              <div className="flex items-center gap-space-1.5 text-[10px] font-mono uppercase font-semibold text-foreground/70 mb-space-1">
                <Zap className="h-3 w-3 text-primary" />
                <span>Active AI Function</span>
              </div>
              <p className="text-caption text-foreground/80 leading-snug">
                {integration.capabilities}
              </p>
            </div>
          )}

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-space-1.5 mb-space-6">
            {integration.features.slice(0, 3).map((feat) => (
              <span
                key={feat}
                className="text-[11px] px-space-2.5 py-space-1 rounded-md border border-[hsl(var(--foreground)/0.04)] bg-[hsl(var(--foreground)/0.02)] text-foreground/75 font-medium"
              >
                {feat}
              </span>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div>
          {isLive ? (
            <Button
              onClick={() => onConnect?.(integration.id)}
              variant={isConnected ? "outline" : "default"}
              size="sm"
              disabled={isLoading}
              className="w-full text-caption h-9 font-semibold justify-center"
            >
              {isLoading ? (
                "Connecting..."
              ) : isConnected ? (
                <span className="flex items-center justify-center gap-1.5 text-emerald-500">
                  <Check className="h-3.5 w-3.5" /> Disconnect Integration
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  Link {integration.name} <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              )}
            </Button>
          ) : (
            <div className="w-full py-space-2 text-center rounded-lg border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.01)] text-caption font-semibold text-muted-foreground/60 flex items-center justify-center gap-2">
              <Clock className="h-3.5 w-3.5" /> Scheduled for Next Sprint
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ━━━ VARIANT 3: DIRECTORY (Sleek Compact Grid Card) ━━━ */
  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border transition-all duration-200",
        "p-space-5 bg-card/35 hover:bg-card/70 backdrop-blur-xs",
        "border-[hsl(var(--foreground)/0.06)] hover:border-primary/30",
        "hover:shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:-translate-y-0.5",
        isConnected && "border-primary/25 bg-primary/[0.02]",
        className
      )}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-space-2 mb-space-3.5">
          <div className="h-8 w-8 rounded-lg bg-white border border-[hsl(var(--foreground)/0.08)] p-space-1.5 flex items-center justify-center shadow-2xs">
            {integration.logo}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-muted-foreground/80 uppercase px-space-2 py-0.5 rounded bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.04)]">
              {integration.category}
            </span>
            <span
              className={cn(
                "text-[9px] font-mono uppercase tracking-wider px-space-2 py-0.5 rounded-full border",
                isLive
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
              )}
            >
              {isLive ? "Live" : "Soon"}
            </span>
          </div>
        </div>

        {/* Content */}
        <h4 className="text-body-sm font-semibold text-foreground mb-space-1 group-hover:text-primary transition-colors">
          {integration.name}
        </h4>
        <p className="text-caption text-muted-foreground leading-relaxed mb-space-4 line-clamp-2">
          {integration.desc}
        </p>

        {/* Quick features (compact bullet line) */}
        <div className="space-y-1 mb-space-4 border-t border-[hsl(var(--foreground)/0.04)] pt-space-3">
          {integration.features.slice(0, 2).map((f) => (
            <div key={f} className="flex items-center gap-1.5 text-[11px] text-foreground/75 truncate">
              <CheckCircle2 className="h-3 w-3 text-primary/70 shrink-0" />
              <span className="truncate">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Button */}
      <div className="pt-space-2">
        {isLive ? (
          <button
            onClick={() => onConnect?.(integration.id)}
            disabled={isLoading}
            className={cn(
              "w-full text-caption font-semibold py-1.5 px-3 rounded-lg border transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 select-none",
              isConnected
                ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10"
                : "border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--foreground)/0.02)] text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary"
            )}
          >
            {isLoading ? "Connecting..." : isConnected ? "✓ Connected" : "Connect"}
          </button>
        ) : (
          <div className="w-full py-1 text-center text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">
            In development
          </div>
        )}
      </div>
    </div>
  );
}
