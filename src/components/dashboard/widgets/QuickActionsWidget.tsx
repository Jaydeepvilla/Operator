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

import { APP_ROUTES } from "@/lib/constants/routes";

const QUICK_ACTIONS = [
  {
    label: "New Appointment",
    description: "Book manually",
    href: APP_ROUTES.appointments,
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
    href: APP_ROUTES.contacts,
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
    href: APP_ROUTES.kb,
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
    href: APP_ROUTES.settingsAi,
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
    href: APP_ROUTES.channels,
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
    href: APP_ROUTES.automations,
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
      <Card className="w-full h-full flex flex-col overflow-hidden border border-border/80">
        {/* Header bar */}
        <div className="flex items-center justify-between px-space-5 py-space-3.5 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-space-2">
            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-caption font-bold text-foreground tracking-wide">
              Quick Actions
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Shortcuts
            </span>
          </div>
          <span className="text-caption text-muted-foreground font-medium hidden sm:block">
            Jump anywhere instantly
          </span>
        </div>

        {/* Action Grid */}
        <div className="px-space-4 pb-space-4 pt-space-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-space-3">
            {QUICK_ACTIONS.map((act) => {
              const IconComp = act.icon;
              return (
                <div key={act.label} className="relative">
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
                    className={`group relative flex flex-col items-start gap-space-2.5 p-space-4 rounded-xl border ${act.badge ? 'border-primary/25' : 'border-border/80'} bg-card hover:border-primary/50 hover:bg-primary/[0.02] hover:shadow-md ${act.accent} transition-all duration-200 overflow-hidden cursor-pointer h-full`}
                  >
                    {/* Subtle shimmer on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none rounded-xl" />

                    {/* Icon row */}
                    <div className="flex items-start justify-between w-full">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${act.iconBg} transition-transform duration-200 group-hover:scale-105`}>
                        <IconComp className="h-4.5 w-4.5" />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 ml-auto" />
                    </div>

                    {/* Text */}
                    <div className="min-w-0 w-full">
                      <span className="text-body-sm font-bold text-foreground block leading-snug group-hover:text-primary transition-colors duration-150">
                        {act.label}
                      </span>
                      <p className="text-caption font-normal text-muted-foreground mt-space-0.5 block leading-relaxed line-clamp-2">
                        {act.description}
                      </p>
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
