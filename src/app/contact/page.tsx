"use client";

import Link from "next/link";
import { useState } from "react";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import {
  ArrowRight,
  Mail,
  MessageSquare,
  Building2,
  Clock,
  Check,
  Send,
  Headphones,
  Globe,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { NativeSelect, NativeTextarea, NativeA } from "@/components/shared/native";

const CONTACT_TYPES = [
  { id: "sales", icon: TrendingUp, label: "Sales Inquiry", desc: "Interested in a plan or need a custom quote" },
  { id: "support", icon: Headphones, label: "Technical Support", desc: "Having an issue with your account or integration" },
  { id: "agency", icon: Building2, label: "Agency / Partnership", desc: "Want to resell Operator or explore partnerships" },
  { id: "other", icon: MessageSquare, label: "General Inquiry", desc: "Anything else — press, feedback, or ideas" },
];

export default function ContactPage() {
  const [type, setType] = useState<string>("sales");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="relative flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden">
      <MarketingNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-space-0 dot-grid grid-fade-b pointer-events-none" />
          <div className="absolute top-space-0 left-1/2 -translate-x-1/2 w-[var(--bg-blob)] h-[var(--bg-blob-h)] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)] pointer-events-none" />

          <div className="relative mx-auto max-w-3xl px-space-6 pt-32 pb-space-16 text-center">
            <p className="text-body-sm text-primary  mb-space-4">Contact us</p>
            <h1 className="text-display-xl  tracking-tight-xs leading-display text-foreground mb-space-5">
              We're here to <span className="text-primary">help.</span>
            </h1>
            <p className="text-title-lg text-muted-foreground leading-relaxed mb-space-8">
              Sales question, support issue, partnership opportunity — we respond to every message, usually within a few hours.
            </p>
          </div>
        </section>

        {/* Main content */}
        <section className="mx-auto max-w-5xl px-space-6 pb-space-24">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-space-10">
            {/* Form */}
            <div className="lg:col-span-3">
              {submitted ? (
                <div className="radius-xl border border-primary/20 bg-primary/[0.03] p-space-10 text-center">
                  <Check className="h-12 w-12 text-primary mx-auto mb-space-5" />
                  <h2 className="text-title-lg  text-foreground mb-space-3">Message received!</h2>
                  <p className="text-muted-foreground mb-space-6">Thanks for reaching out. Our team will get back to you within 1 business day — usually much faster.</p>
                  <Button onClick={() => setSubmitted(false)} className="text-body-sm  text-primary hover:text-primary/80 transition-colors">
                    Send another message
                  </Button>
                </div>
              ) : (
                <div className="radius-xl border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] p-space-7">
                  <h2 className="text-title-lg  text-foreground mb-space-6">Send us a message</h2>

                  {/* Contact type selector */}
                  <div className="grid grid-cols-2 gap-space-3 mb-space-6">
                    {CONTACT_TYPES.map((t) => (
                      <Button key={t.id} onClick={() => setType(t.id)}
                        className={`flex items-start gap-space-3 radius-lg border p-space-3 text-left transition-colors ${type === t.id
                            ? "border-primary/30 bg-primary/[0.04]"
                            : "border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] hover:bg-[hsl(var(--foreground)/0.04)]"
                          }`}
                      >
                        <t.icon className={`h-4 w-4 shrink-0 mt-space-1 ${type === t.id ? "text-primary" : "text-muted-foreground"}`} />
                        <div>
                          <p className={`text-caption  ${type === t.id ? "text-foreground" : "text-muted-foreground"}`}>{t.label}</p>
                          <p className="text-caption text-muted-foreground leading-tight hidden sm:block">{t.desc}</p>
                        </div>
                      </Button>
                    ))}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-space-4">
                    <div className="grid grid-cols-2 gap-space-4">
                      <div>
                        <label className="block text-caption  text-muted-foreground mb-space-2">First Name *</label>
                        <Input required className="w-full radius-lg border border-[hsl(var(--foreground)/0.08)] bg-background px-space-3 py-space-2 text-body-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none transition-colors" placeholder="Rohan" />
                      </div>
                      <div>
                        <label className="block text-caption  text-muted-foreground mb-space-2">Last Name *</label>
                        <Input required className="w-full radius-lg border border-[hsl(var(--foreground)/0.08)] bg-background px-space-3 py-space-2 text-body-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none transition-colors" placeholder="Mehta" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-caption  text-muted-foreground mb-space-2">Business Email *</label>
                      <Input required type="email" className="w-full radius-lg border border-[hsl(var(--foreground)/0.08)] bg-background px-space-3 py-space-2 text-body-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none transition-colors" placeholder="rohan@clinic.com" />
                    </div>
                    <div>
                      <label className="block text-caption  text-muted-foreground mb-space-2">Company / Practice Name</label>
                      <Input className="w-full radius-lg border border-[hsl(var(--foreground)/0.08)] bg-background px-space-3 py-space-2 text-body-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none transition-colors" placeholder="Bright Smile Dental" />
                    </div>
                    <div>
                      <label className="block text-caption  text-muted-foreground mb-space-2">Phone Number</label>
                      <Input type="tel" className="w-full radius-lg border border-[hsl(var(--foreground)/0.08)] bg-background px-space-3 py-space-2 text-body-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none transition-colors" placeholder="+91 98765 43210" />
                    </div>
                    {type === "sales" && (
                      <div>
                        <label className="block text-caption  text-muted-foreground mb-space-2">How many locations?</label>
                        <NativeSelect className="w-full radius-lg border border-[hsl(var(--foreground)/0.08)] bg-background px-space-3 py-space-2 text-body-sm text-foreground focus:border-primary/40 focus:outline-none transition-colors">
                          <option value="">Select...</option>
                          <option>1 location</option>
                          <option>2–5 locations</option>
                          <option>6–20 locations</option>
                          <option>20+ locations (Agency/Enterprise)</option>
                        </NativeSelect>
                      </div>
                    )}
                    <div>
                      <label className="block text-caption  text-muted-foreground mb-space-2">Message *</label>
                      <NativeTextarea
                        required
                        rows={4}
                        className="w-full radius-lg border border-[hsl(var(--foreground)/0.08)] bg-background px-space-3 py-space-2 text-body-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none transition-colors resize-none"
                        placeholder={type === "sales" ? "Tell us about your business and what you're looking for..." : type === "support" ? "Describe the issue you're experiencing..." : "Tell us about the partnership opportunity..."}
                      />
                    </div>
                    <Button type="submit" disabled={loading} width="full" className=" py-space-3 text-body-sm text-primary-foreground disabled:opacity-60">
                      {loading ? (
                        <div className="h-4 w-4 radius-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Message
                        </>
                      )}
                    </Button>
                    <p className="text-center text-caption text-muted-foreground">
                      We respond within 1 business day. Usually much faster.
                    </p>
                  </form>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-space-5">
              {/* Response times */}
              <div className="radius-lg border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] p-space-6">
                <h3 className=" text-body-sm text-foreground mb-space-4 flex items-center gap-space-2">
                  <Clock className="h-4 w-4 text-primary" /> Response Times
                </h3>
                <div className="space-y-space-3">
                  {[
                    { label: "Sales Inquiries", time: "< 4 hours" },
                    { label: "Technical Support", time: "< 12 hours" },
                    { label: "Agency Requests", time: "< 1 business day" },
                    { label: "General Inquiries", time: "< 1 business day" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between text-body-sm">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className="text-caption  text-primary">{r.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Business hours */}
              <div className="radius-lg border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] p-space-6">
                <h3 className=" text-body-sm text-foreground mb-space-4 flex items-center gap-space-2">
                  <Clock className="h-4 w-4 text-primary" /> Business Hours
                </h3>
                <div className="space-y-space-2 text-body-sm text-muted-foreground">
                  <div className="flex justify-between"><span>Monday – Friday</span><span className="text-foreground ">9am – 7pm IST</span></div>
                  <div className="flex justify-between"><span>Saturday</span><span className="text-foreground ">10am – 4pm IST</span></div>
                  <div className="flex justify-between"><span>Sunday</span><span className="text-muted-foreground">Closed</span></div>
                </div>
                <p className="text-caption text-muted-foreground mt-space-4 pt-space-4 border-t border-[hsl(var(--foreground)/0.06)]">
                  Emergency technical support is available 24/7 for Business and Agency plan customers.
                </p>
              </div>

              {/* Other ways */}
              <div className="radius-lg border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] p-space-6">
                <h3 className=" text-body-sm text-foreground mb-space-4">Other ways to reach us</h3>
                <div className="space-y-space-3">
                  {[
                    { icon: Mail, label: "Email", value: "hello@nexx.ai", href: "mailto:hello@nexx.ai" },
                    { icon: Headphones, label: "Support Portal", value: "support.nexx.ai", href: "#" },
                    { icon: Globe, label: "Live Chat", value: "Available on all pages", href: "#" },
                  ].map((c) => (
                    <NativeA key={c.label} href={c.href} className="flex items-center gap-space-3 group">
                      <div className="h-8 w-8 radius-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                        <c.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-caption text-muted-foreground">{c.label}</p>
                        <p className="text-body-sm  text-foreground group-hover:text-primary transition-colors">{c.value}</p>
                      </div>
                    </NativeA>
                  ))}
                </div>
              </div>

              {/* Quick links */}
              <div className="radius-lg border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] p-space-6">
                <h3 className=" text-body-sm text-foreground mb-space-4">Frequently visited</h3>
                <div className="space-y-space-2">
                  {[["Documentation", "/docs"], ["Pricing", "/pricing"], ["Security Policy", "/security"], ["FAQ", "/#faq"]].map(([label, href]) => (
                    <Link key={label} href={href} className="flex items-center justify-between text-body-sm text-muted-foreground hover:text-foreground transition-colors group py-space-1">
                      {label} <ChevronRight className="h-3 w-3 group-hover:text-primary transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
