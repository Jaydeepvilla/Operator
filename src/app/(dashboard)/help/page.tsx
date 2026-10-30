import Link from "next/link";
import { PageTitle } from "@/components/shared/page-title";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import {
  GraduationCap,
  PlayCircle,
  HelpCircle,
  MessageCircle,
  Mail,
  Sparkles,
  ArrowRight,
  BookOpen,
  PhoneCall,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export const metadata = {
  title: "Help & Support — Operator",
  description: "Guides, tutorials, and support for your AI receptionist.",
};

const QUICK_GUIDES = [
  {
    title: "How to connect your WhatsApp in 2 minutes",
    desc: "Scan a QR code from WhatsApp Business to let Operator start replying automatically.",
    href: "/channels",
    icon: MessageCircle,
    tag: "Channels",
  },
  {
    title: "Adding your services and prices",
    desc: "Teach your assistant what you offer, how long each slot takes, and how much it costs.",
    href: "/services",
    icon: Calendar,
    tag: "Services",
  },
  {
    title: "Setting up your cancellation & refund policy",
    desc: "Add your policy so your assistant can answer customer policy questions accurately.",
    href: "/settings",
    icon: BookOpen,
    tag: "Settings",
  },
  {
    title: "How your assistant sounds (Tone of Voice)",
    desc: "Choose between Friendly, Professional, or Short & Direct with live audio samples.",
    href: "/settings/ai",
    icon: Sparkles,
    tag: "AI Tone",
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-space-6 animate-fade-in w-full pb-space-16">
      {/* Page Header */}
      <PageTitle
        title="Help & Guides"
        description="Simple guides, interactive demos, and real customer support to help you run your business."
      />

      {/* Hero: Replay Tour Card */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-background p-space-6 shadow-sm">
        <div className="max-w-2xl space-y-space-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary-light text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-primary-light" />
            <span>5-Minute Guided Tour</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            New to Operator? See how it works in 5 minutes.
          </h2>
          <p className="text-body-sm text-muted-foreground leading-relaxed">
            Watch a quick walkthrough on how your AI receptionist answers messages, schedules appointments, and sends reminders while you focus on clients.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Button asChild shape="pill" className="gap-2 font-semibold shadow-md shadow-primary/20">
              <Link href="/demo-center">
                <PlayCircle className="w-4 h-4" />
                <span>Open Interactive Demo</span>
              </Link>
            </Button>
            <Button asChild variant="outline" shape="pill" className="gap-2 font-semibold">
              <Link href="/academy">
                <GraduationCap className="w-4 h-4" />
                <span>Founder Academy Lessons</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Guides Grid */}
      <div className="space-y-space-3">
        <h3 className="text-body-md font-bold text-foreground">Popular Step-by-Step Guides</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-4">
          {QUICK_GUIDES.map((guide) => {
            const Icon = guide.icon;
            return (
              <Link
                key={guide.title}
                href={guide.href}
                className="group relative flex flex-col justify-between p-space-5 rounded-xl border border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30 transition-all shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/40">
                      {guide.tag}
                    </span>
                  </div>
                  <h4 className="text-body-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {guide.title}
                  </h4>
                  <p className="text-caption text-muted-foreground leading-relaxed">
                    {guide.desc}
                  </p>
                </div>
                <div className="pt-3 flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <span>Open guide</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Contact & Support Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-4 pt-2">
        <Card className="border border-border/70">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <MessageCircle className="w-4 h-4" />
              </div>
              <CardTitle className="text-body-md">Live WhatsApp Support</CardTitle>
            </div>
            <CardDescription className="text-caption">
              Direct line to our support team for setup assistance or questions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full gap-2 font-semibold">
              <a
                href="https://wa.me/919999999999?text=Hi%2C%20I%20need%20help%20setting%20up%20Operator%20AI"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-500" />
                <span>Message Support on WhatsApp</span>
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-border/70">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Mail className="w-4 h-4" />
              </div>
              <CardTitle className="text-body-md">Email Support</CardTitle>
            </div>
            <CardDescription className="text-caption">
              We respond within 2 hours during normal business hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full gap-2 font-semibold">
              <a href="mailto:support@nexxtechnologies.com?subject=Operator%20Support%20Request">
                <Mail className="w-4 h-4 text-primary" />
                <span>support@nexxtechnologies.com</span>
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

