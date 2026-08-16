"use client";

import { m } from "framer-motion";
import { hoverScale } from "@/components/motion/hover";
import { Card } from "@/components/shared/card";
import {
  CalendarPlus,
  UserPlus,
  BrainCircuit,
  Settings2,
  Share2,
  Tv,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import Link from "next/link";

const QUICK_ACTIONS = [
  {
    label: "New Appointment",
    description: "Book manually",
    href: "/appointments",
    icon: CalendarPlus,
    gradient: "from-violet-500/20 to-primary/10",
    iconBg: "bg-primary/10 text-primary",
    accent: "group-hover:shadow-primary/20",
    badge: "Most used",
    badgeColor: "bg-primary text-white",
  },
  {
    label: "Add Customer",
    description: "Save a lead",
    href: "/contacts",
    icon: UserPlus,
    gradient: "from-emerald-500/15 to-emerald-400/5",
    iconBg: "bg-[hsl(var(--state-success-bg))] text-[hsl(var(--state-success-text))]",
    accent: "group-hover:shadow-emerald-500/20",
    badge: null,
    badgeColor: "",
  },
  {
    label: "Import Knowledge",
    description: "Train AI on site/doc",
    href: "/kb",
    icon: BrainCircuit,
    gradient: "from-violet-500/15 to-fuchsia-500/5",
    iconBg: "bg-primary/10 text-primary",
    accent: "group-hover:shadow-violet-500/20",
    badge: null,
    badgeColor: "",
  },
  {
    label: "AI Settings",
    description: "Tune prompts & tone",
    href: "/settings",
    icon: Settings2,
    gradient: "from-slate-500/10 to-slate-400/5",
    iconBg: "bg-[hsl(var(--foreground)/0.06)] text-muted-foreground",
    accent: "group-hover:shadow-slate-500/15",
    badge: null,
    badgeColor: "",
  },
  {
    label: "Connect Channels",
    description: "WhatsApp, Phone",
    href: "/channels",
    icon: Share2,
    gradient: "from-amber-500/15 to-orange-400/5",
    iconBg: "bg-[hsl(var(--state-warning-bg))] text-[hsl(var(--state-warning-text))]",
    accent: "group-hover:shadow-amber-500/20",
    badge: null,
    badgeColor: "",
  },
  {
    label: "Automations",
    description: "Set triggers & hooks",
    href: "/automations",
    icon: Tv,
    gradient: "from-sky-500/15 to-cyan-400/5",
    iconBg: "bg-[hsl(var(--state-info-bg))] text-[hsl(var(--state-info-text))]",
    accent: "group-hover:shadow-sky-500/20",
    badge: null,
    badgeColor: "",
  },
];

export function QuickActionsWidget() {
  return (
    <m.div whileHover={hoverScale} className="h-full flex flex-col">
<Card className="w-full h-full flex flex-col overflow-hidden border border-[hsl(var(--foreground)/0.07)]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-space-5 py-space-3.5 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)]">
        <div className="flex items-center gap-space-2">
          <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-caption font-semibold text-foreground tracking-wide">
            Quick Actions
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15">
            Shortcuts
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground/60 font-medium hidden sm:block">
          Jump anywhere instantly
        </span>
      </div>

      {/* Action Grid — 3 cols on md, 6 cols on xl */}
      <div className="px-space-4 pb-space-4 pt-space-5">
        <div className="grid grid-cols-3 gap-space-3">
          {QUICK_ACTIONS.map((act) => {
            const IconComp = act.icon;
            return (
              <div key={act.label} className="relative">
                {/* Pricing-style badge ABOVE card */}
                {act.badge && (
                  <div className="absolute -top-3.5 inset-x-0 flex justify-center z-20">
                    <span
                      className={`
                        inline-flex items-center gap-1
                        text-[9px] font-extrabold uppercase tracking-widest
                        px-3 py-1 rounded-full
                        bg-gradient-to-r from-primary to-violet-500
                        text-white shadow-md shadow-primary/40
                        ring-2 ring-[hsl(var(--foreground)/0.08)]
                      `}
                    >
                      <Zap className="w-2.5 h-2.5 fill-white/80 stroke-none" />
                      {act.badge}
                    </span>
                  </div>
                )}
                <Link
                  href={act.href}
                  className={`group relative flex flex-col items-start gap-space-3 p-space-4 rounded-xl border ${act.badge ? 'border-primary/25' : 'border-[hsl(var(--foreground)/0.06)]'} bg-gradient-to-br ${act.gradient} hover:border-[hsl(var(--foreground)/0.14)] hover:shadow-lg ${act.accent} transition-all duration-200 overflow-hidden cursor-pointer h-full`}
                >
                  {/* Subtle shimmer on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/4 to-transparent pointer-events-none rounded-xl" />

                  {/* Icon row */}
                  <div className="flex items-start justify-between w-full">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${act.iconBg} transition-transform duration-200 group-hover:scale-105`}>
                      <IconComp className="h-4.5 w-4.5" />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 ml-auto" />
                  </div>

                  {/* Text */}
                  <div className="min-w-0 w-full">
                    <span className="text-body-sm font-semibold text-foreground block leading-tight group-hover:text-primary transition-colors duration-150">
                      {act.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground/65 mt-space-0.5 block leading-snug">
                      {act.description}
                    </span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
</m.div>
  );
}
