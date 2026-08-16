"use client";import { Badge } from "@/components/shared/badge";

import Link from "next/link";
import { useState } from "react";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  Wrench,
  AlertCircle,
  Search,
  Calendar,
  ArrowRight } from
"lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";

const RELEASES = [
{
  version: "v1.4.0",
  date: "June 21, 2025",
  type: "major",
  title: "Operator Voice AI — General Availability",
  summary: "After 6 months of beta testing with 50+ businesses, Voice AI is now available to all plans.",
  changes: [
  { type: "feature", text: "Operator Voice AI — answer real phone calls with natural AI conversation" },
  { type: "feature", text: "Outbound call capability for follow-ups and appointment reminders" },
  { type: "feature", text: "Real-time call transcription with intent tagging" },
  { type: "feature", text: "Call recording with automatic summarization" },
  { type: "feature", text: "Smart call routing to human staff based on intent" },
  { type: "improvement", text: "Reduced average response latency from 1.2s to 0.8s" },
  { type: "improvement", text: "Improved speech recognition accuracy for industry-specific terminology" },
  { type: "fix", text: "Fixed rare issue where calls would drop during long pauses" },
  { type: "fix", text: "Fixed timezone mismatch in appointment confirmations" }]

},
{
  version: "v1.3.2",
  date: "June 10, 2025",
  type: "patch",
  title: "Security Update & Performance Improvements",
  summary: "Security hardening across all API endpoints plus significant performance improvements.",
  changes: [
  { type: "security", text: "Enhanced API rate limiting to prevent abuse on unauthenticated endpoints" },
  { type: "security", text: "Added additional CSRF protection on form submissions" },
  { type: "improvement", text: "Dashboard load time reduced by 40% through improved data fetching" },
  { type: "improvement", text: "Widget bundle size reduced from 42KB to 31KB (gzipped)" },
  { type: "fix", text: "Fixed Google Calendar sync failing for recurring appointments" },
  { type: "fix", text: "Fixed WhatsApp media messages not being processed correctly" }]

},
{
  version: "v1.3.0",
  date: "May 28, 2025",
  type: "minor",
  title: "Agency White-Label Platform Launch",
  summary: "Full white-label platform for agencies and resellers. Manage unlimited client accounts under your brand.",
  changes: [
  { type: "feature", text: "Agency dashboard for managing multiple client accounts" },
  { type: "feature", text: "White-label branding — custom logo, colors, and domain" },
  { type: "feature", text: "Client-level usage analytics and reporting" },
  { type: "feature", text: "Reseller billing with custom pricing per client" },
  { type: "feature", text: "Client impersonation for support purposes" },
  { type: "improvement", text: "Redesigned onboarding flow for faster client account creation" },
  { type: "fix", text: "Fixed permissions bug where Agency Admins couldn't modify client knowledge bases" }]

},
{
  version: "v1.2.0",
  date: "May 5, 2025",
  type: "minor",
  title: "Billing & Subscription Engine",
  summary: "Full subscription management with Stripe and Razorpay, usage-based billing, and invoice generation.",
  changes: [
  { type: "feature", text: "Stripe subscription billing integration" },
  { type: "feature", text: "Razorpay integration for INR billing" },
  { type: "feature", text: "Usage-based billing with conversation metering" },
  { type: "feature", text: "Automated invoice generation with tax support" },
  { type: "feature", text: "Billing portal for plan changes and payment method updates" },
  { type: "improvement", text: "Trial expiry notifications at 7 days, 3 days, and 1 day" }]

},
{
  version: "v1.1.0",
  date: "April 18, 2025",
  type: "minor",
  title: "Omnichannel Hub — WhatsApp, Instagram & Facebook",
  summary: "Full omnichannel messaging: all customer conversations managed by one AI across all channels.",
  changes: [
  { type: "feature", text: "WhatsApp Business API integration" },
  { type: "feature", text: "Instagram Direct Messages" },
  { type: "feature", text: "Facebook Messenger" },
  { type: "feature", text: "Unified inbox for all channels" },
  { type: "feature", text: "Cross-channel conversation continuity" },
  { type: "improvement", text: "AI maintains context when customers switch channels" }]

},
{
  version: "v1.0.0",
  date: "March 28, 2025",
  type: "major",
  title: "Operator— Public Launch",
  summary: "Initial public release. AI website chat widget, appointment booking, lead qualification, and knowledge base.",
  changes: [
  { type: "feature", text: "AI Website Chat Widget" },
  { type: "feature", text: "Appointment Booking Engine (Google Calendar + Outlook)" },
  { type: "feature", text: "Lead Qualification Engine" },
  { type: "feature", text: "Business Knowledge Base" },
  { type: "feature", text: "Industry templates for 8 verticals" },
  { type: "feature", text: "Multi-tenant dashboard" },
  { type: "feature", text: "Secure local authentication and organization management" }]

}];


const CHANGE_CONFIG = {
  feature: { icon: Zap, color: "text-primary", bg: "bg-[hsl(var(--primary)/0.08)] border-[hsl(var(--primary)/0.15)]", label: "New" },
  improvement: { icon: CheckCircle2, color: "text-[hsl(142_71%_45%)]", bg: "bg-[hsl(142_71%_45%/0.08)] border-[hsl(142_71%_45%/0.15)]", label: "Improved" },
  fix: { icon: Wrench, color: "text-warning-500", bg: "bg-warning-500/8 border-warning-500/15", label: "Fixed" },
  security: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/8 border-destructive/15", label: "Security" }
};

const VERSION_CONFIG = {
  major: { badge: "bg-[hsl(var(--primary)/0.08)] text-primary border-[hsl(var(--primary)/0.15)]", label: "Major" },
  minor: { badge: "bg-[hsl(142_71%_45%/0.08)] text-[hsl(142_71%_45%)] border-[hsl(142_71%_45%/0.15)]", label: "Minor" },
  patch: { badge: "bg-[hsl(var(--foreground)/0.06)] text-muted-foreground border-[hsl(var(--foreground)/0.08)]", label: "Patch" }
};

const CATEGORIES = ["All", "Features", "Improvements", "Bug Fixes", "Security"];

export default function ChangelogPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filteredReleases = RELEASES.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
    r.title.toLowerCase().includes(q) ||
    r.summary.toLowerCase().includes(q) ||
    r.version.toLowerCase().includes(q) ||
    r.changes.some((c) => c.text.toLowerCase().includes(q));

    const matchFilter = filter === "All" ||
    filter === "Features" && r.changes.some((c) => c.type === "feature") ||
    filter === "Improvements" && r.changes.some((c) => c.type === "improvement") ||
    filter === "Bug Fixes" && r.changes.some((c) => c.type === "fix") ||
    filter === "Security" && r.changes.some((c) => c.type === "security");

    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <MarketingNav />

      {/* Background */}
      <div className="pointer-events-none fixed inset-space-0 z-0 overflow-hidden">
        <div className="absolute -top-[15%] left-[5%] h-96 w-full max-w-sm radius-full bg-[hsl(var(--primary)/0.05)] blur-[100px]" />
        <div className="dot-grid absolute inset-space-0 grid-fade-b opacity-40" />
      </div>

      <main className="relative z-10">
        {/* Hero */}
        <section className="container mx-auto max-w-3xl px-space-6 pt-space-28 pb-space-16 text-center">
          <Badge variant="soft" className="mb-space-6">
            <Sparkles className="h-3 w-3 text-primary" /> Product Changelog
          </Badge>
          <h1 className="text-display-lg sm:text-display-lg  tracking-tight-2xs text-foreground leading-heading mb-space-5">
            What's new in{" "}
            <span className="text-primary">Operator</span>
          </h1>
          <p className="text-body-md text-muted-foreground leading-relaxed mb-space-8 max-w-xl mx-auto">
            New features, improvements, and bug fixes — shipped regularly.
          </p>
          <div className="flex items-center gap-space-2 text-body-sm text-muted-foreground justify-center">
            <span className="h-1.5 w-1.5 radius-full bg-[hsl(142_71%_45%)] animate-pulse" />
            Latest:{" "}
            <span className="text-foreground ">{RELEASES[0].version} — {RELEASES[0].title}</span>
          </div>
        </section>

        {/* Filters */}
        <section className="container mx-auto max-w-4xl px-space-6 pb-space-8">
          <div className="flex flex-col sm:flex-row gap-space-3 mb-space-5">
            <div className="relative flex-1">
              <Search className="absolute left-space-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full radius-lg border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--foreground)/0.03)] pl-space-8 pr-space-4 py-space-2 text-body-sm text-foreground placeholder:text-muted-foreground/50 focus:border-[hsl(var(--primary)/0.4)] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary)/0.2)]"
                placeholder="Search releases..." />
              
            </div>
          </div>
          <div className="flex flex-wrap gap-space-2">
            {CATEGORIES.map((cat) =>
            <Button key={cat} onClick={() => setFilter(cat)}
            className={`radius-lg border px-space-4 py-space-2 text-caption  transition-all duration-150 ${filter === cat ?
            "border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.06)] text-primary" :
            "border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--foreground)/0.03)] text-muted-foreground hover:text-foreground hover:border-[hsl(var(--foreground)/0.12)]"}`
            }>
              
                {cat}
              </Button>
            )}
          </div>
        </section>

        {/* Timeline */}
        <section className="container mx-auto max-w-4xl px-space-6 pb-space-24">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-space-2 top-space-3 bottom-space-0 w-px bg-[hsl(var(--foreground)/0.08)] hidden sm:block" />

            <div className="space-y-space-6">
              {filteredReleases.map((release) => {
                const typeConfig = VERSION_CONFIG[release.type as keyof typeof VERSION_CONFIG];
                return (
                  <div key={release.version} className="flex gap-space-6 sm:gap-space-7">
                    {/* Timeline dot */}
                    <div className="hidden sm:flex flex-col items-center shrink-0 mt-space-3">
                      <div className="h-5 w-5 radius-full bg-[hsl(var(--primary)/0.10)] border border-[hsl(var(--primary)/0.25)] ring-4 ring-background flex items-center justify-center">
                        <div className="h-1.5 w-1.5 radius-full bg-primary" />
                      </div>
                    </div>

                    {/* Release card */}
                    <div className="flex-1 radius-lg border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] overflow-hidden hover:border-[hsl(var(--foreground)/0.10)] transition-colors duration-150">
                      {/* Card header */}
                      <div className="flex flex-wrap items-center gap-space-2 p-space-5 pb-space-4 border-b border-[hsl(var(--foreground)/0.05)]">
                        <span className={`text-caption  px-space-2 py-space-1 rounded border ${typeConfig.badge}`}>
                          {release.version}
                        </span>
                        <span className={`text-caption  px-space-2 py-space-1 rounded border ${typeConfig.badge}`}>
                          {typeConfig.label}
                        </span>
                        <div className="flex items-center gap-space-2 text-caption text-muted-foreground ml-auto">
                          <Calendar className="h-3 w-3" />
                          {release.date}
                        </div>
                      </div>

                      <div className="p-space-5">
                        <h2 className=" text-body-md text-foreground tracking-tight-lg mb-space-2">
                          {release.title}
                        </h2>
                        <p className="text-body-sm text-muted-foreground mb-space-4 leading-relaxed">{release.summary}</p>
                        <div className="space-y-space-2">
                          {release.changes.
                          filter((c) => {
                            if (filter === "All") return true;
                            if (filter === "Features") return c.type === "feature";
                            if (filter === "Improvements") return c.type === "improvement";
                            if (filter === "Bug Fixes") return c.type === "fix";
                            if (filter === "Security") return c.type === "security";
                            return true;
                          }).
                          map((change, i) => {
                            const cfg = CHANGE_CONFIG[change.type as keyof typeof CHANGE_CONFIG];
                            return (
                              <div key={i} className="flex items-start gap-space-2">
                                  <span className={`shrink-0 mt-space-1 text-caption  rounded px-space-2 py-space-1 uppercase tracking-wide border ${cfg.bg} ${cfg.color}`}>
                                    {cfg.label}
                                  </span>
                                  <p className="text-body-sm text-foreground/80 leading-relaxed">{change.text}</p>
                                </div>);

                          })}
                        </div>
                      </div>
                    </div>
                  </div>);

              })}

              {filteredReleases.length === 0 &&
              <div className="text-center py-space-16 text-muted-foreground radius-lg border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)]">
                  <Search className="h-6 w-6 mx-auto mb-space-3 opacity-30" />
                  <p className="text-body-sm">No releases match your search</p>
                </div>
              }
            </div>
          </div>
        </section>

        {/* Subscribe CTA */}
        <section className="border-t border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] py-space-16">
          <div className="container mx-auto max-w-2xl px-space-6 text-center">
            <h2 className="text-heading-lg  tracking-tight-xs mb-space-3">Stay up to date</h2>
            <p className="text-body-sm text-muted-foreground mb-space-7 leading-relaxed">
              Get notified when new features ship. No spam, only meaningful updates.
            </p>
            <div className="flex flex-col sm:flex-row gap-space-2 justify-center max-w-sm mx-auto">
              <Input
                type="email"
                className="flex-1 radius-lg border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--foreground)/0.03)] px-space-4 py-space-2 text-body-sm text-foreground placeholder:text-muted-foreground/50 focus:border-[hsl(var(--primary)/0.4)] focus:outline-none"
                placeholder="your@email.com" />
              
              <Button className=" px-space-5 py-space-2 text-body-sm text-primary-foreground duration-150 whitespace-nowrap">
                Subscribe
              </Button>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>);

}