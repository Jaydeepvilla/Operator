"use client";
import { Badge } from "@/components/shared/badge";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { SessionAwareCta } from "@/components/marketing/session-aware-cta";
import {
  ArrowRight,
  Mic,
  MessageSquare,
  Calendar,
  BarChart3,
  Check,
  Bot,
  Stethoscope,
  Scale,
  Scissors,
  Dumbbell,
  Home,
  HeartPulse,
  Send,
  Phone,
  Volume2 } from
"lucide-react";
import { Button } from "@/components/shared/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/shared/tabs";
import { Input } from "@/components/shared/input";
import { NativeA, NativeSelect } from "@/components/shared/native";

const DEMO_TABS = [
{ id: "voice", icon: Mic, label: "Voice AI" },
{ id: "chat", icon: MessageSquare, label: "Chat Widget" },
{ id: "booking", icon: Calendar, label: "Booking Engine" },
{ id: "dashboard", icon: BarChart3, label: "Dashboard" }];


const CONVERSATIONS = {
  voice: [
  { from: "bot", text: "Good morning, thank you for calling Bright Smile Dental. This is Maya, how can I help you today?" },
  { from: "user", text: "Hi, I'd like to make an appointment for a teeth cleaning." },
  { from: "bot", text: "Of course! Are you a new or returning patient with us?" },
  { from: "user", text: "New patient." },
  { from: "bot", text: "Perfect, welcome! New patient cleanings are $89 and take about 45 minutes. I have availability on Tuesday at 10am, Wednesday at 2pm, or Friday at 9am. Which works best for you?" },
  { from: "user", text: "Wednesday at 2pm." },
  { from: "bot", text: "Excellent! I'm booking Wednesday July 9th at 2pm for your cleaning. May I get your full name and best callback number?" }],

  chat: [
  { from: "bot", text: "👋 Hi! I'm Operator AI for Okonkwo Law Group. How can I help you today?" },
  { from: "user", text: "I need help with a property dispute. What are your consultation fees?" },
  { from: "bot", text: "Our initial consultation for property disputes is $250 for 60 minutes. This includes a case review and strategy session with one of our partners.\n\nWould you like to schedule a consultation?" },
  { from: "user", text: "Yes please." },
  { from: "bot", text: "Great. To make sure we assign the right attorney, can you briefly describe the nature of the dispute?" },
  { from: "user", text: "Boundary dispute with a neighbor — they built a fence on my land." },
  { from: "bot", text: "Got it. James Okonkwo handles exactly these cases. He has Thursday 3pm and Friday 10am available this week. Which works?" }],

  booking: [
  { from: "bot", text: "Hi! Ready to book your appointment at Peak Performance Gym. What service are you interested in?" },
  { from: "user", text: "Personal training session" },
  { from: "bot", text: "We have 60-min personal training sessions for $85 with any of our certified trainers. Do you have a preferred trainer, or should I find the first available?" },
  { from: "user", text: "First available is fine." },
  { from: "bot", text: "I found availability with Coach Sarah tomorrow at 7am or Tuesday at 6pm. Any preference?" },
  { from: "user", text: "Tomorrow 7am." },
  { from: "bot", text: "✅ Booked! Personal training with Coach Sarah tomorrow at 7:00am. I've sent a confirmation to your email. See you then!" }],

  dashboard: []
};

const INDUSTRIES = [
{ icon: Stethoscope, label: "Dental Clinic", tab: "voice", prompt: "Book a cleaning" },
{ icon: Scale, label: "Law Firm", tab: "chat", prompt: "Property dispute inquiry" },
{ icon: Dumbbell, label: "Gym", tab: "booking", prompt: "Book personal training" },
{ icon: Scissors, label: "Salon", tab: "chat", prompt: "Hair color appointment" },
{ icon: Home, label: "Real Estate", tab: "voice", prompt: "Property viewing" },
{ icon: HeartPulse, label: "Medical Clinic", tab: "booking", prompt: "GP appointment" }];


export default function DemoPage() {
  const [activeTab, setActiveTab] = useState("voice");
  const [formSubmitted, setFormSubmitted] = useState(false);

  return (
    <div className="relative flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden">
      <MarketingNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-space-0 dot-grid grid-fade-b pointer-events-none" />
          <div className="absolute top-space-0 left-1/2 -translate-x-1/2 w-[var(--bg-blob)] h-[var(--bg-blob-h)] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)] pointer-events-none" />

          <div className="relative mx-auto max-w-4xl px-space-6 pt-32 pb-space-16 text-center">
            <p className="text-body-sm text-primary  mb-space-4">Live Product Demo</p>
            <h1 className="text-display-xl  tracking-tight-xs leading-display text-foreground mb-space-5">
              See Operator <span className="text-primary">live in action.</span>
            </h1>
            <p className="text-title-lg text-muted-foreground mb-space-10 max-w-2xl mx-auto leading-relaxed">
              Explore the voice AI, chat widget, booking engine, and dashboard. See how each channel handles real customer conversations.
            </p>
            <div className="flex flex-col sm:flex-row gap-space-4 justify-center">
              <Button asChild size="lg">
                <Link href="/sign-up">Start Free Trial <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <NativeA href="#book-demo"><Calendar className="h-4 w-4 text-primary" /> Book a Guided Demo</NativeA>
              </Button>
            </div>
          </div>
        </section>

        {/* Interactive Demo */}
        <section className="mx-auto max-w-5xl px-space-6 pb-space-20">
          {/* Tab selector */}
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} variant="pills" className="w-full mb-space-8">
          <TabsList className="flex flex-wrap justify-center gap-space-2 w-full bg-transparent border-none">
            {DEMO_TABS.map((t) =>
            <TabsTrigger key={t.id} value={t.id}
            className="flex items-center gap-space-2 text-body-sm"
            >
                <t.icon className="h-4 w-4" />
                {t.label}
              </TabsTrigger>
            )}
          </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-8 items-start">
            {/* Demo window */}
            <div className="radius-xl border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] overflow-hidden">
              <div className="border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.03)] p-space-4 flex items-center gap-space-3">
                <div className="flex gap-space-2">
                  <div className="h-2.5 w-2.5 radius-full bg-foreground/10" />
                  <div className="h-2.5 w-2.5 radius-full bg-foreground/10" />
                  <div className="h-2.5 w-2.5 radius-full bg-foreground/10" />
                </div>
                <div className="flex-1 flex items-center gap-space-2">
                  <div className="h-8 w-8 radius-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-caption  text-foreground">
                      {activeTab === "voice" ? "Voice AI — Bright Smile Dental" :
                      activeTab === "chat" ? "Chat Widget — Okonkwo Law Group" :
                      activeTab === "dashboard" ? "Operator Dashboard" :
                      "Booking Engine — Peak Performance Gym"}
                    </p>
                    <p className="text-caption text-primary flex items-center gap-space-1">
                      <span className="h-1.5 w-1.5 radius-full bg-primary inline-block animate-pulse" />
                      {activeTab === "voice" ? "Call in progress" : "Active now"}
                    </p>
                  </div>
                </div>
                {activeTab === "voice" &&
                <div className="flex items-center gap-space-2 text-caption text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span>0:47</span>
                  </div>
                }
              </div>

              {activeTab === "dashboard" ?
              <div className="p-space-5 space-y-space-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-3">
                    {[
                  { label: "Calls Today", value: "47" },
                  { label: "Leads", value: "23" },
                  { label: "Booked", value: "18" },
                  { label: "CSAT", value: "4.9★" }].
                  map((m) =>
                  <div key={m.label} className="radius-lg border border-[hsl(var(--foreground)/0.06)] bg-background p-space-3">
                        <p className="text-caption text-muted-foreground uppercase tracking-wider ">{m.label}</p>
                        <p className="text-title-lg  mt-space-1 text-primary font-mono">{m.value}</p>
                      </div>
                  )}
                  </div>
                  <div className="radius-lg border border-[hsl(var(--foreground)/0.06)] bg-background p-space-4">
                    <p className="text-caption  text-muted-foreground uppercase tracking-wider mb-space-3">Conversation Funnel</p>
                    {[["Conversations", "47", "100%"], ["Qualified Leads", "31", "66%"], ["Bookings", "18", "38%"], ["Confirmed", "16", "34%"]].map(([label, count, pct]) =>
                  <div key={label as string} className="mb-space-2">
                        <div className="flex justify-between text-caption text-muted-foreground mb-space-1">
                          <span>{label}</span><span>{count} ({pct})</span>
                        </div>
                        <div className="h-1.5 radius-full bg-[hsl(var(--foreground)/0.06)]"><div className="h-full radius-full bg-primary" style={{ width: pct as string }} /></div>
                      </div>
                  )}
                  </div>
                  <div className="radius-lg border border-[hsl(var(--foreground)/0.06)] bg-background p-space-4">
                    <p className="text-caption  text-muted-foreground uppercase tracking-wider mb-space-3">Today&apos;s Appointments</p>
                    {[["9:00 AM", "Jane Smith — Root Canal"], ["11:30 AM", "Mike Chen — Whitening"], ["2:15 PM", "Priya Nair — Checkup"]].map(([time, name]) =>
                  <div key={time as string} className="flex items-center gap-space-3 py-space-2 border-b border-[hsl(var(--foreground)/0.04)] last:border-0">
                        <span className="text-caption text-primary  w-16 shrink-0">{time}</span>
                        <span className="text-caption text-foreground/80">{name}</span>
                      </div>
                  )}
                  </div>
                </div> :

              <div className="p-space-5 space-y-space-4">
                  {(CONVERSATIONS[activeTab as keyof typeof CONVERSATIONS] as any[]).map((msg, i) =>
                <div key={i} className={`flex gap-space-2 max-w-11/12 ${msg.from === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                      <div className={`h-7 w-7 shrink-0 radius-full flex items-center justify-center text-caption overflow-hidden border ${msg.from === "bot" ? "p-0.5 border-primary/20" : "bg-secondary text-foreground border-[hsl(var(--foreground)/0.06)]"}`}>
                        {msg.from === "bot" ? (
                          <Image
                            src="/logo.png"
                            alt="Operator AI"
                            width={24}
                            height={24}
                            unoptimized
                            className="h-full w-full object-contain"
                          />
                        ) : "Y"}
                      </div>
                      <div className={`radius-xl px-space-4 py-space-2 text-caption leading-relaxed whitespace-pre-line ${msg.from === "bot" ? "bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.06)] text-foreground" : "bg-primary text-primary-foreground"}`}>
                        {msg.text}
                      </div>
                    </div>
                )}
                  <div className="flex items-center gap-space-2 px-space-2 pt-space-2 border-t border-[hsl(var(--foreground)/0.06)]">
                    {activeTab === "voice" && <Volume2 className="h-4 w-4 text-primary shrink-0" />}
                    <Badge variant="soft">
                      {activeTab === "voice" ? "Speaking live..." : "Type a message..."}
                    </Badge>
                    <Button className=" p-space-2 text-primary-foreground">
                      {activeTab === "voice" ? <Mic className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              }
            </div>

            {/* Capabilities */}
            <div className="space-y-space-5">
              {activeTab === "voice" &&
              <>
                  <h3 className=" text-title-lg text-foreground">Operator Voice AI</h3>
                  <p className="text-muted-foreground text-body-sm leading-relaxed">Operator AI answers real phone calls using natural language. It understands context, handles interruptions, and books appointments directly to your calendar.</p>
                  {["Answers in under 1 second", "Understands context across turns", "Books directly to your calendar", "Records and transcribes every call", "Escalates to humans when needed", "Works on your existing phone number"].map((f) =>
                <div key={f} className="flex items-center gap-space-2 text-body-sm"><Check className="h-4 w-4 text-primary shrink-0" /><span className="text-foreground/80">{f}</span></div>
                )}
                </>
              }
              {activeTab === "chat" &&
              <>
                  <h3 className=" text-title-lg text-foreground">Embedded Chat Widget</h3>
                  <p className="text-muted-foreground text-body-sm leading-relaxed">Paste one line of code on your website. The widget handles all chat conversations, qualifies leads, and books appointments automatically.</p>
                  {["One-line embed code", "Custom branding & colors", "Mobile-responsive design", "Lead qualification built in", "Multi-language support", "Works on any website platform"].map((f) =>
                <div key={f} className="flex items-center gap-space-2 text-body-sm"><Check className="h-4 w-4 text-primary shrink-0" /><span className="text-foreground/80">{f}</span></div>
                )}
                </>
              }
              {activeTab === "booking" &&
              <>
                  <h3 className=" text-title-lg text-foreground">Smart Booking Engine</h3>
                  <p className="text-muted-foreground text-body-sm leading-relaxed">Real-time calendar sync. The AI checks actual availability and confirms bookings instantly — no back-and-forth emails required.</p>
                  {["Real-time calendar sync", "Multi-service scheduling", "Automated confirmations", "Reminder sequences", "Reschedule & cancellation handling", "No-show reduction workflows"].map((f) =>
                <div key={f} className="flex items-center gap-space-2 text-body-sm"><Check className="h-4 w-4 text-primary shrink-0" /><span className="text-foreground/80">{f}</span></div>
                )}
                </>
              }
              {activeTab === "dashboard" &&
              <>
                  <h3 className=" text-title-lg text-foreground">Analytics Dashboard</h3>
                  <p className="text-muted-foreground text-body-sm leading-relaxed">Full visibility into every conversation, lead, and booking. Track conversion funnels, CSAT, and revenue attribution in real time.</p>
                  {["Real-time conversation monitor", "Lead conversion funnel", "CSAT & sentiment analysis", "Revenue attribution", "Channel performance comparison", "Custom report builder"].map((f) =>
                <div key={f} className="flex items-center gap-space-2 text-body-sm"><Check className="h-4 w-4 text-primary shrink-0" /><span className="text-foreground/80">{f}</span></div>
                )}
                </>
              }

              <div className="pt-space-4 border-t border-[hsl(var(--foreground)/0.06)] space-y-space-3">
                <Button asChild size="lg" className="w-full justify-between">
                  <Link href="/sign-up">Start Free Trial — 14 Days Free <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full justify-between">
                  <NativeA href="#book-demo">Book a 30-min Guided Demo <Calendar className="h-4 w-4 text-primary" /></NativeA>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Industry examples */}
        <section className="border-y border-[hsl(var(--foreground)/0.06)] py-space-20">
          <div className="mx-auto max-w-6xl px-space-6">
            <div className="text-center mb-space-12">
              <p className="text-body-sm text-primary  mb-space-3">Industry Examples</p>
              <h2 className="text-heading-lg  tracking-tight-sm text-foreground mb-space-3">See it in your industry</h2>
              <p className="text-muted-foreground">Click any industry to see how Operator handles their specific use case.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-4">
              {INDUSTRIES.map((ind) =>
              <Button key={ind.label} onClick={() => setActiveTab(ind.tab)} className="flex items-center gap-space-3 border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] p-space-4 hover:border-[hsl(var(--foreground)/0.15)] transition-colors text-left">
                  <ind.icon className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-body-sm  text-foreground">{ind.label}</p>
                    <p className="text-caption text-muted-foreground">{ind.prompt}</p>
                  </div>
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Book demo form */}
        <section id="book-demo" className="py-space-28 md:py-space-36 scroll-mt-space-20">
          <div className="mx-auto max-w-4xl px-space-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-10">
              <div>
                <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 radius-full border border-primary/20 bg-primary/5 mb-space-6">
                  <span className="text-caption uppercase tracking-widest text-primary font-semibold">Guided Demo</span>
                </div>
                <h2 className="text-heading-lg  tracking-tight-md text-foreground mb-space-4">
                  Personalized Walkthrough.
                  <br />
                  Get a <span className="text-primary">guided live demo.</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-space-6 text-body-sm">See Operator configured for your specific industry, use case, and business size. We&apos;ll answer every question and help you get set up.</p>
                {["30-minute session, no fluff", "Industry-specific configuration shown", "Questions answered live", "Custom pricing discussed if needed", "Get started same day if you like"].map((f) =>
                <div key={f} className="flex items-center gap-space-2 text-body-sm mb-space-2"><Check className="h-4 w-4 text-primary shrink-0" /><span className="text-foreground/80">{f}</span></div>
                )}
              </div>
              {formSubmitted ?
              <div className="radius-xl border border-primary/20 bg-primary/[0.03] p-space-10 text-center self-start">
                  <Check className="h-12 w-12 text-primary mx-auto mb-space-4" />
                  <h3 className="text-title-lg  mb-space-3 text-foreground">Demo Request Sent!</h3>
                  <p className="text-muted-foreground text-body-sm">We&apos;ll email you within 1 business hour with calendar link options.</p>
                </div> :

              <form onSubmit={(e) => {e.preventDefault();setFormSubmitted(true);}} className="radius-xl border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] p-space-6 space-y-space-4">
                  <div className="grid grid-cols-2 gap-space-3">
                    <div>
                      <label className="block text-caption  text-muted-foreground mb-space-2">First Name *</label>
                      <Input required className="w-full radius-lg border border-[hsl(var(--foreground)/0.08)] bg-background px-space-3 py-space-2 text-body-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none transition-colors" placeholder="Jane" />
                    </div>
                    <div>
                      <label className="block text-caption  text-muted-foreground mb-space-2">Last Name *</label>
                      <Input required className="w-full radius-lg border border-[hsl(var(--foreground)/0.08)] bg-background px-space-3 py-space-2 text-body-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none transition-colors" placeholder="Smith" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-caption  text-muted-foreground mb-space-2">Business Email *</label>
                    <Input required type="email" className="w-full radius-lg border border-[hsl(var(--foreground)/0.08)] bg-background px-space-3 py-space-2 text-body-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none transition-colors" placeholder="jane@yourbusiness.com" />
                  </div>
                  <div>
                    <label className="block text-caption  text-muted-foreground mb-space-2">Industry</label>
                    <NativeSelect className="w-full radius-lg border border-[hsl(var(--foreground)/0.08)] bg-background px-space-3 py-space-2 text-body-sm text-foreground focus:border-primary/40 focus:outline-none transition-colors">
                      <option>Dental Clinic</option>
                      <option>Medical Clinic</option>
                      <option>Law Firm</option>
                      <option>Salon / Spa</option>
                      <option>Gym / Fitness</option>
                      <option>Real Estate</option>
                      <option>Consulting</option>
                      <option>Other</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-caption  text-muted-foreground mb-space-2">Preferred Demo Time</label>
                    <NativeSelect className="w-full radius-lg border border-[hsl(var(--foreground)/0.08)] bg-background px-space-3 py-space-2 text-body-sm text-foreground focus:border-primary/40 focus:outline-none transition-colors">
                      <option>Morning (9am – 12pm IST)</option>
                      <option>Afternoon (12pm – 3pm IST)</option>
                      <option>Evening (3pm – 6pm IST)</option>
                    </NativeSelect>
                  </div>
                  <Button type="submit" width="full" className=" py-space-3 text-body-sm text-primary-foreground">
                    <Calendar className="h-4 w-4" /> Book My Demo
                  </Button>
                  <p className="text-center text-caption text-muted-foreground">No commitment. Free for all businesses.</p>
                </form>
              }
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-space-28 md:py-space-36 overflow-hidden border-t border-[hsl(var(--foreground)/0.06)]">
          <div className="absolute inset-space-0 dot-grid grid-fade-y pointer-events-none" />
          <div className="relative mx-auto max-w-2xl px-space-6 text-center">
            <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 radius-full border border-primary/20 bg-primary/5 mb-space-6">
              <span className="text-caption uppercase tracking-widest text-primary font-semibold">Free Trial</span>
            </div>
            <h2 className="text-heading-lg sm:text-heading-lg  tracking-tight-sm text-foreground mb-space-5">
              No Commitment.
              <br />
              Start <span className="text-primary">your free trial.</span>
            </h2>
            <p className="text-muted-foreground mb-space-8">14 days free. No credit card. Setup in 30 minutes.</p>
            <SessionAwareCta
              signedInText="Go to Dashboard"
              signedOutText="Start Free Trial"
              signedOutHref="/sign-in"
              size="lg"
            />
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>);

}