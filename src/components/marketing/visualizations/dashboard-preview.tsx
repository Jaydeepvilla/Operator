"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  MessageSquare,
  Calendar,
  BarChart3,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  Search,
  Settings,
  Sparkles,
  Database,
  Inbox,
  MoreHorizontal,
  Activity,
  Globe,
  Volume2,
  Check,
  ChevronDown,
  MessageCircle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { NativeButton } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CallLog {
  id: number;
  name: string;
  phone: string;
  time: string;
  duration: string;
  type: string;
  status: "Booked" | "Qualified" | "Answered";
  avatarColor: string;
  transcript: { speaker: "user" | "ai"; text: string }[];
  timeline: {
    title: string;
    desc: string;
    icon: React.ReactNode;
    active: boolean;
  }[];
  integrations: { name: string; status: string; synced: boolean }[];
}

export function DashboardPreview() {
  const [activeTab, setActiveTab] = useState<
    "calls" | "chats" | "calendar" | "analytics"
  >("calls");
  const [selectedCallId, setSelectedCallId] = useState<number>(1);
  const [mobileView, setMobileView] = useState<"list" | "details">("list");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(35);
  const playbackInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      playbackInterval.current = setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 150);
    } else {
      if (playbackInterval.current) clearInterval(playbackInterval.current);
    }
    return () => {
      if (playbackInterval.current) clearInterval(playbackInterval.current);
    };
  }, [isPlaying]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const stats = [
    {
      label: "Calls Handled",
      value: "47",
      change: "+12%",
      trend: "up",
      color: "text-primary",
      sparkline: [25, 30, 22, 35, 40, 38, 47],
    },
    {
      label: "Leads Qualified",
      value: "23",
      change: "+8%",
      trend: "up",
      color: "text-emerald-500",
      sparkline: [12, 15, 14, 18, 20, 19, 23],
    },
    {
      label: "Appts Booked",
      value: "18",
      change: "+31%",
      trend: "up",
      color: "text-indigo-500",
      sparkline: [8, 10, 12, 11, 15, 14, 18],
    },
    {
      label: "Revenue Rec.",
      value: "$2,700",
      change: "+18%",
      trend: "up",
      color: "text-pink-500",
      sparkline: [800, 1200, 950, 1500, 1800, 2100, 2700],
    },
  ];

  const calls: CallLog[] = [
    {
      id: 1,
      name: "Sarah Jenkins",
      phone: "(415) 555-0192",
      time: "Just now",
      duration: "1m 42s",
      type: "Dental Checkup",
      status: "Booked",
      avatarColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
      transcript: [
        {
          speaker: "user",
          text: "Hey, do you have any openings for an orthodontic consultation this Friday?",
        },
        {
          speaker: "ai",
          text: "Hi Sarah! Yes, I see a slot available at 2:00 PM this Friday, July 10, with Dr. Jenkins. Would you like me to book that for you?",
        },
        {
          speaker: "user",
          text: "That works perfectly, yes please! Will Dr. Jenkins be doing the exam?",
        },
        {
          speaker: "ai",
          text: "Yes, Dr. Jenkins handles all orthodontic consults. I've booked your slot for Friday at 2:00 PM and sent a confirmation SMS to your number.",
        },
      ],
      timeline: [
        {
          title: "Call Answered",
          desc: "0.2s via Operator SIP Gateway",
          icon: <Phone className="h-3.5 w-3.5" />,
          active: true,
        },
        {
          title: "Intent Identified",
          desc: "Schedule orthodontic consult",
          icon: <Sparkles className="h-3.5 w-3.5" />,
          active: true,
        },
        {
          title: "Calendar Synced",
          desc: "Booked Friday 2:00 PM",
          icon: <Calendar className="h-3.5 w-3.5" />,
          active: true,
        },
        {
          title: "Notification Dispatched",
          desc: "SMS reminder sent via Twilio",
          icon: <MessageSquare className="h-3.5 w-3.5" />,
          active: true,
        },
      ],
      integrations: [
        { name: "Google Calendar", status: "Synced Slot", synced: true },
        { name: "HubSpot CRM", status: "Updated Contact", synced: true },
        { name: "Twilio SMS", status: "Dispatched SMS", synced: true },
      ],
    },
    {
      id: 2,
      name: "David Kovalenko",
      phone: "(312) 555-0143",
      time: "12 mins ago",
      duration: "2m 15s",
      type: "Case Evaluation",
      status: "Qualified",
      avatarColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      transcript: [
        {
          speaker: "user",
          text: "I had a car accident yesterday and I need to consult with a lawyer about my case.",
        },
        {
          speaker: "ai",
          text: "I'm sorry to hear that, David. I can definitely help with that. First, is this related to a personal injury claim, and are there any active injuries?",
        },
        {
          speaker: "user",
          text: "Yes, personal injury. I have a fractured wrist, and the other driver ran a red light.",
        },
        {
          speaker: "ai",
          text: "Thank you for sharing those details. I've logged this information. Dr. Thomas has availability for case assessments tomorrow at 10:00 AM or 1:00 PM. Which works best?",
        },
        { speaker: "user", text: "Let's do 10:00 AM." },
        {
          speaker: "ai",
          text: "Great. I have booked your case evaluation for tomorrow at 10:00 AM. I am notifying our legal intake team now.",
        },
      ],
      timeline: [
        {
          title: "Call Answered",
          desc: "0.4s via Web Widget Call",
          icon: <Phone className="h-3.5 w-3.5" />,
          active: true,
        },
        {
          title: "Qualifying Intake",
          desc: "Verified dispute type & injury status",
          icon: <Database className="h-3.5 w-3.5" />,
          active: true,
        },
        {
          title: "CRM Entry Created",
          desc: "Logged new lead info in HubSpot",
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          active: true,
        },
        {
          title: "Staff Notified",
          desc: "Sent slack alert to intake team",
          icon: <Activity className="h-3.5 w-3.5" />,
          active: true,
        },
      ],
      integrations: [
        { name: "HubSpot CRM", status: "Created Lead", synced: true },
        { name: "Slack Alerts", status: "Notified #intake", synced: true },
        { name: "Google Calendar", status: "Synced Slot", synced: true },
      ],
    },
    {
      id: 3,
      name: "Elena Rostova",
      phone: "(212) 555-0188",
      time: "42 mins ago",
      duration: "1m 10s",
      type: "Spa Package",
      status: "Booked",
      avatarColor: "bg-pink-500/10 text-pink-500 border-pink-500/20",
      transcript: [
        {
          speaker: "user",
          text: "Hi, I'd like to book a couples massage package for this Saturday afternoon.",
        },
        {
          speaker: "ai",
          text: "Hi Elena! I can help you secure that. We have openings for our signature Couples Spa Package this Saturday at 11:00 AM or 3:00 PM. Does either work?",
        },
        { speaker: "user", text: "3:00 PM is perfect." },
        {
          speaker: "ai",
          text: "Perfect. The package is $240 and requires prepayment to secure. Can I text a secure Stripe link to your mobile?",
        },
        { speaker: "user", text: "Yes, send it over." },
        {
          speaker: "ai",
          text: "Sent! Once processed, your Saturday 3:00 PM slot will be locked in. We look forward to seeing you!",
        },
      ],
      timeline: [
        {
          title: "Call Answered",
          desc: "0.1s via Operator SIP",
          icon: <Phone className="h-3.5 w-3.5" />,
          active: true,
        },
        {
          title: "Intent Identified",
          desc: "Couples Massage Booking",
          icon: <Sparkles className="h-3.5 w-3.5" />,
          active: true,
        },
        {
          title: "Payment Triggered",
          desc: "Generated Stripe payment link",
          icon: <Globe className="h-3.5 w-3.5" />,
          active: true,
        },
        {
          title: "Link Dispatched",
          desc: "SMS sent via SMS gateway",
          icon: <MessageSquare className="h-3.5 w-3.5" />,
          active: true,
        },
      ],
      integrations: [
        { name: "Stripe", status: "Invoice Created", synced: true },
        { name: "Mindbody Sync", status: "Held Slot (Hold)", synced: true },
        { name: "Twilio SMS", status: "Sent Link", synced: true },
      ],
    },
    {
      id: 4,
      name: "Marcus Brody",
      phone: "(617) 555-0129",
      time: "1 hr ago",
      duration: "0m 52s",
      type: "FAQ / Insurance",
      status: "Answered",
      avatarColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      transcript: [
        {
          speaker: "user",
          text: "Hi, do you accept Delta Dental insurance, and what is your hourly rate for standard cleanings?",
        },
        {
          speaker: "ai",
          text: "Hi Marcus! Yes, we accept Delta Dental PPO and Cigna. For standard cleanings, the out-of-pocket rate is $150 before any insurance coverage is applied.",
        },
        {
          speaker: "user",
          text: "Great, that is all I needed to know. Thanks for the quick answer!",
        },
        {
          speaker: "ai",
          text: "You're very welcome! If you'd like to book an appointment in the future, just let us know. Have a wonderful day!",
        },
      ],
      timeline: [
        {
          title: "Call Answered",
          desc: "0.3s via SIP Trunk",
          icon: <Phone className="h-3.5 w-3.5" />,
          active: true,
        },
        {
          title: "Knowledge Retrieval",
          desc: "Matched KB Article: Insurance-102",
          icon: <Database className="h-3.5 w-3.5" />,
          active: true,
        },
        {
          title: "FAQ Resolved",
          desc: "Provided pricing and network details",
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          active: true,
        },
        {
          title: "Session Concluded",
          desc: "No call-back required",
          icon: <Check className="h-3.5 w-3.5" />,
          active: true,
        },
      ],
      integrations: [
        { name: "Knowledge Base", status: "Article Fetched", synced: true },
        { name: "Clio Manage", status: "Logged Interaction", synced: true },
      ],
    },
    {
      id: 5,
      name: "James Chen",
      phone: "(415) 555-0144",
      time: "2 hrs ago",
      duration: "1m 20s",
      type: "Appointment Cancel",
      status: "Answered",
      avatarColor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      transcript: [
        {
          speaker: "user",
          text: "I need to cancel my appointment for tomorrow.",
        },
      ],
      timeline: [
        {
          title: "Call Answered",
          desc: "via SIP Trunk",
          icon: <Phone className="h-3.5 w-3.5" />,
          active: true,
        },
      ],
      integrations: [],
    },
    {
      id: 6,
      name: "Olivia Davis",
      phone: "(510) 555-0199",
      time: "3 hrs ago",
      duration: "3m 15s",
      type: "Billing Inquiry",
      status: "Answered",
      avatarColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      transcript: [
        { speaker: "user", text: "I have a question about my last invoice." },
      ],
      timeline: [
        {
          title: "Call Answered",
          desc: "via SIP Trunk",
          icon: <Phone className="h-3.5 w-3.5" />,
          active: true,
        },
      ],
      integrations: [],
    },
  ];

  const recentChats = [
    {
      id: 1,
      source: "WhatsApp",
      sender: "Dr. Thomas",
      msg: "Hey, are you open on Saturday? We have a patient asking.",
      time: "3m ago",
      status: "Answered",
    },
    {
      id: 2,
      source: "Web Chat",
      sender: "Unknown Visitor",
      msg: "I need to reschedule my cleaning appointment next Tuesday",
      time: "15m ago",
      status: "Link Sent",
    },
    {
      id: 3,
      source: "Instagram DM",
      sender: "luxe_beauty",
      msg: "How much is the facial whitening package? Do you do discounts?",
      time: "1h ago",
      status: "Answered",
    },
  ];

  const selectedCall = calls.find((c) => c.id === selectedCallId) || calls[0];

  return (
    <div className="relative mx-auto max-w-full w-full">
      {/* Deep Ambient Mesh Background */}
      <div className="absolute -inset-space-20 bg-[radial-gradient(circle_at_20%_30%,rgba(99,102,241,0.25),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(236,72,153,0.15),transparent_40%),radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.15),transparent_60%)] pointer-events-none z-0 dark:opacity-80 opacity-50 blur-3xl animate-pulse duration-10000" />

      {/* Main Glassmorphic Wrapper */}
      <div className="relative radius-2xl bg-white/60 dark:bg-black/40 backdrop-blur-2xl overflow-hidden flex flex-col md:flex-row transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] min-h-176">
        {/* Sleek Sidebar (Desktop) */}
        <aside className="hidden md:flex md:w-16 xl:w-64 shrink-0 border-r border-border-subtle bg-white/20 dark:bg-white/5 flex-col justify-between p-space-4 xl:p-space-6 transition-all duration-300">
          <div>
            {/* Org Picker / Brand Header */}
            <div className="flex items-center gap-space-3 px-space-2 py-space-2 mb-space-8 justify-center xl:justify-start">
              <div className="h-10 w-10 radius-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-primary-foreground font-semibold shrink-0 border border-white/20">
                <Sparkles className="h-5 w-5 fill-white/20" />
              </div>
              <div className="xl:flex flex-col min-w-0 hidden">
                <span className="text-body-sm font-semibold tracking-tight text-foreground flex items-center gap-space-1.5 truncate">
                  Operator AI{" "}
                  <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
                </span>
                <span className="text-caption text-muted-foreground leading-none font-medium truncate mt-space-0.5">
                  Dental & Spa Org
                </span>
              </div>
            </div>

            {/* Premium Sidebar Navigation */}
            <div className="space-y-space-1.5">
              {[
                { id: "calls", label: "Voice Inbox", icon: Inbox, badge: "12" },
                { id: "chats", label: "Text Inbox", icon: MessageSquare },
                { id: "calendar", label: "Calendar Hub", icon: Calendar },
                { id: "analytics", label: "Analytics Portal", icon: BarChart3 },
              ].map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <NativeButton
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center justify-center xl:justify-between px-space-3 xl:px-space-4 py-space-2.5 xl:py-space-3 radius-md text-caption font-normal transition-all duration-300 group relative overflow-hidden ${
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    {isActive && (
                      <>
                        <div className="absolute inset-space-0 bg-gradient-to-r from-primary/20 to-transparent dark:from-primary/15" />
                        <div className="absolute left-space-0 top-space-1/4 bottom-space-1/4 w-1 bg-primary radius-md 0_0_8px_rgba(99,102,241,0.6)]" />
                      </>
                    )}
                    <div className="flex items-center gap-space-3 relative z-10">
                      <Icon
                        className={`h-4.5 w-4.5 shrink-0 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:translate-x-space-1"}`}
                      />
                      <span className="hidden xl:inline tracking-wide">
                        {item.label}
                      </span>
                    </div>
                    {item.badge && (
                      <span
                        className={`hidden xl:inline-block px-space-2 py-space-0.5 radius-md text-caption font-mono leading-none font-bold relative z-10 transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-black/10 dark:bg-white/10 text-muted-foreground"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NativeButton>
                );
              })}
            </div>

            {/* Separator */}
            <div className="my-space-6 border-t border-border-subtle" />

            {/* Secondary navigation */}
            <div className="space-y-space-1.5">
              <div className="px-space-4 py-space-1.5 text-caption font-semibold text-muted-foreground/50 uppercase tracking-widest hidden xl:block">
                AI Management
              </div>
              <NativeButton className="w-full flex items-center justify-center xl:justify-start gap-space-3 px-space-3 xl:px-space-4 py-space-2.5 radius-md text-caption font-medium text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all group">
                <Settings className="h-4 w-4 shrink-0 group-hover:rotate-90 transition-transform duration-500" />
                <span className="hidden xl:inline">Voice Prompts</span>
              </NativeButton>
              <NativeButton className="w-full flex items-center justify-center xl:justify-start gap-space-3 px-space-3 xl:px-space-4 py-space-2.5 radius-md text-caption font-medium text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all group">
                <Database className="h-4 w-4 shrink-0 group-hover:-translate-y-space-0.5 transition-transform" />
                <span className="hidden xl:inline">Knowledge Bases</span>
              </NativeButton>
            </div>
          </div>

          {/* User Profile Block */}
          <div className="hidden md:flex items-center justify-center xl:justify-between border-t border-border-subtle pt-space-5 mt-space-8 relative">
            <div className="flex items-center gap-space-3">
              <div className="h-9 w-9 radius-md bg-gradient-to-br from-indigo-400 to-purple-500 p-[1.5px] shrink-0">
                <div className="h-full w-full bg-card radius-md flex items-center justify-center text-primary text-caption font-semibold">
                  JC
                </div>
              </div>
              <div className="xl:flex flex-col min-w-0 hidden">
                <span className="text-caption font-semibold text-foreground leading-none truncate">
                  Jaydeep C.
                </span>
                <span className="text-caption text-muted-foreground uppercase tracking-wider font-semibold mt-space-1 truncate">
                  Admin
                </span>
              </div>
            </div>
            <NativeButton className="text-muted-foreground hover:text-foreground shrink-0 p-space-1.5 hover:bg-black/5 dark:hover:bg-white/10 radius-md transition-colors hidden xl:block">
              <MoreHorizontal className="h-4 w-4" />
            </NativeButton>
          </div>
        </aside>

        {/* Right Main Screen (Header + Body) */}
        <main className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10">
          {/* Top Address Bar / Nav Bar */}
          <header className="border-b border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between px-space-5 sm:px-space-6 py-space-4 bg-white/10 dark:bg-black/10 backdrop-blur-md gap-y-space-4 sm:gap-y-space-0 w-full z-20">
            {/* Breadcrumb Path & Search Mockup */}
            <div className="flex items-center justify-between sm:justify-start gap-space-5 w-full sm:w-auto">
              <div className="flex items-center gap-space-2 text-caption text-muted-foreground font-semibold">
                <div className="h-6 w-6 radius-md bg-white/50 dark:bg-white/10 flex items-center justify-center border border-border-subtle">
                  <Inbox className="h-3.5 w-3.5 text-foreground shrink-0" />
                </div>
                <span>Operator AI</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                <span className="text-foreground capitalize tracking-wide bg-black/5 dark:bg-white/10 px-space-2 py-space-0.5 radius-md">
                  {activeTab === "calls"
                    ? "Voice Inbox"
                    : activeTab === "chats"
                      ? "Text Inbox"
                      : activeTab === "calendar"
                        ? "Calendar Hub"
                        : "Analytics Portal"}
                </span>
              </div>
              <div className="hidden lg:flex items-center gap-space-2 bg-white/40 dark:bg-black/40 border border-border-subtle radius-md px-space-4 py-space-1.5 text-caption text-muted-foreground w-56 group hover:bg-white/60 dark:hover:bg-black/60 transition-colors">
                <Search className="h-4 w-4 text-muted-foreground/60 shrink-0 group-hover:text-primary transition-colors" />
                <span className="text-caption flex-1 text-left font-medium">
                  Search anything...
                </span>
                <span className="text-caption font-mono leading-none bg-black/5 dark:bg-white/10 px-space-1.5 py-space-1 radius-md border border-border-subtle shrink-0 text-foreground/70">
                  ⌘K
                </span>
              </div>
            </div>

            {/* Glowing Operator AI live status pill */}
            <div className="flex items-center gap-space-3 shrink-0 w-full sm:w-auto justify-start sm:justify-end">
              <div className="relative group cursor-default">
                <div className="absolute inset-space-0 bg-emerald-500/20 blur-md radius-md group-hover:bg-emerald-500/30 transition-all duration-500" />
                <span className="relative text-caption font-semibold radius-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-space-3.5 py-space-1.5 flex items-center gap-space-2 backdrop-blur-md">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Operator AI Active (24/7)
                </span>
              </div>
            </div>
          </header>

          {/* Floating Metrics Ribbon */}
          <section className="px-space-6 py-space-5 grid grid-cols-2 lg:grid-cols-4 gap-space-4 z-10 relative">
            {stats.map((stat, idx) => (
              <div key={idx} className="relative group">
                <div className="absolute inset-space-0 bg-gradient-to-b from-white/40 to-white/10 dark:from-white/5 dark:to-transparent radius-2xl blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative p-space-5 flex flex-col justify-between radius-2xl border border-border-default bg-white dark:bg-card shadow-sm transition-all duration-300 hover:-translate-y-space-0.5 hover:shadow-md">
                  <div className="flex justify-between items-start">
                    <span className="text-caption font-semibold text-muted-foreground uppercase tracking-widest">
                      {stat.label}
                    </span>
                    <span className="text-caption font-semibold px-space-2 py-space-0.5 radius-md bg-primary/10 text-primary border border-primary/20">
                      {stat.change}
                    </span>
                  </div>
                  <div className="flex items-end justify-between mt-space-4">
                    <span className="text-title-lg font-semibold font-mono tracking-tight text-foreground leading-none">
                      {stat.value}
                    </span>

                    {/* Sparkline mini-visual with smooth curve and gradient */}
                    <div className="w-16 h-8 relative">
                      <svg
                        className="absolute inset-space-0 h-full w-full text-primary"
                        viewBox="0 0 6 3"
                        preserveAspectRatio="none"
                      >
                        <defs>
                          <linearGradient
                            id={`gradient-${idx}`}
                            x1="0%"
                            y1="0%"
                            x2="0%"
                            y2="100%"
                          >
                            <stop
                              offset="0%"
                              stopColor="currentColor"
                              stopOpacity="0.25"
                            />
                            <stop
                              offset="100%"
                              stopColor="currentColor"
                              stopOpacity="0"
                            />
                          </linearGradient>
                        </defs>
                        {/* Gradient Area Fill */}
                        <polygon
                          fill={`url(#gradient-${idx})`}
                          points={`0,3 ${stat.sparkline.map((val, i) => `${i},${3 - (val / Math.max(...stat.sparkline)) * 2.2}`).join(" ")} 6,3`}
                        />
                        {/* Line Stroke */}
                        <polyline
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="0.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={stat.sparkline
                            .map(
                              (val, i) =>
                                `${i},${3 - (val / Math.max(...stat.sparkline)) * 2.2}`,
                            )
                            .join(" ")}
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Core Content Body */}
          <div className="px-space-6 pb-space-6 flex-1 flex flex-col min-h-0 relative z-10">
            {/* VIEW 1: CALL INBOX */}
            {activeTab === "calls" && (
              <div className="flex-1 flex flex-col md:flex-row gap-space-5 min-h-0 animate-in fade-in slide-in-from-bottom-space-4 duration-700 ease-out">
                {/* Calls List Panel */}
                <div
                  className={`w-full md:w-64 xl:w-80 flex flex-col gap-space-3 shrink-0 ${
                    mobileView === "details" ? "hidden md:flex" : "flex"
                  }`}
                >
                  <div className="flex justify-between items-center px-space-1 mb-space-1">
                    <div className="text-caption font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-space-2">
                      <div className="h-1.5 w-1.5 radius-md bg-primary animate-pulse" />
                      Recent Operations
                    </div>
                    <span className="text-caption font-mono bg-black/5 dark:bg-white/10 px-space-2 py-space-0.5 radius-md font-semibold">
                      4 active
                    </span>
                  </div>

                  {/* List Container - Premium Scroll */}
                  <ScrollArea
                    className="max-h-[480px] pr-space-3"
                    horizontal={false}
                  >
                    <div className="flex flex-col gap-space-3 pb-space-4">
                      {calls.map((call, idx) => {
                        const isSelected = selectedCallId === call.id;
                        return (
                          <div
                            key={call.id}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedCallId(call.id);
                                setIsPlaying(false);
                              }
                            }}
                            onClick={() => {
                              setSelectedCallId(call.id);
                              setIsPlaying(false);
                              setPlaybackProgress(25);
                              setMobileView("details");
                            }}
                            className={`radius-2xl p-space-4 cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col gap-space-3 relative overflow-hidden group border mt-[10px] ml-[10px] ${
                              isSelected
                                ? "bg-white/80 dark:bg-black/60 shadow-xl border-primary/40 scale-[1.02] z-10"
                                : "bg-white/40 dark:bg-white/5 border-white/20 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10"
                            }`}
                            style={{ animationDelay: `${idx * 100}ms` }}
                          >
                            {/* Upper Section: Avatar, Status, Call info */}
                            <div className="flex items-start gap-space-3 relative z-10">
                              <div
                                className={`h-9 w-9 radius-xl flex items-center justify-center font-semibold text-caption border shrink-0 ${call.avatarColor}`}
                              >
                                {call.name
                                  .split(" ")
                                  .map((w) => w[0])
                                  .join("")}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center gap-space-2">
                                  <p className="text-caption font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                    {call.name}
                                  </p>
                                  <span
                                    className={`px-space-2 py-space-0.5 radius-md text-caption font-normal uppercase tracking-widest shrink-0 border ${
                                      call.status === "Booked"
                                        ? "bg-primary/10 text-primary border-primary/20"
                                        : call.status === "Qualified"
                                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                    }`}
                                  >
                                    {call.status}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-space-2 gap-y-space-0.5 mt-space-1 text-caption text-muted-foreground">
                                  <span className="font-mono whitespace-nowrap text-caption">
                                    {call.phone}
                                  </span>
                                  <span className="opacity-40 select-none text-caption">
                                    •
                                  </span>
                                  <span className="font-semibold text-foreground/70 truncate text-caption">
                                    {call.type}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Bottom line: timestamp, view details triggers */}
                            <div className="flex items-center justify-between pt-space-3 border-t border-border-subtle relative z-10">
                              <span className="text-caption text-muted-foreground flex items-center gap-space-1.5 font-medium uppercase tracking-wider">
                                <Clock className="h-3 w-3 text-muted-foreground/60 shrink-0" />{" "}
                                {call.time}
                              </span>
                              <span className="text-caption text-muted-foreground font-mono font-semibold bg-black/5 dark:bg-white/10 px-space-1.5 py-space-0.5 radius-md">
                                {call.duration}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                {/* Rich Details Pane (Selected Call Details) */}
                <div
                  className={`flex-1 radius-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-black/50 backdrop-blur-xl flex flex-col overflow-hidden min-w-0 relative ${
                    mobileView === "list" ? "hidden md:flex" : "flex"
                  }`}
                >
                  {/* Subtle inner top glare */}
                  <div className="absolute top-space-0 left-space-0 right-space-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent z-20" />

                  {/* Top Details Header */}
                  <div className="px-space-6 py-space-5 border-b border-border-subtle bg-white/40 dark:bg-black/40 flex items-center justify-between gap-space-4 relative z-10">
                    <div className="min-w-0">
                      <Button
                        onClick={() => setMobileView("list")}
                        className="md:hidden inline-flex items-center gap-space-1.5 text-caption font-semibold text-primary mb-space-2 hover:underline p-space-0 h-auto bg-transparent"
                      >
                        <ChevronLeft className="h-4 w-4" /> Back to Calls
                      </Button>
                      <div className="flex items-center gap-space-3 flex-wrap">
                        <h4 className="text-body-sm font-semibold text-foreground truncate">
                          {selectedCall.name}
                        </h4>
                        <span className="h-1.5 w-1.5 radius-md bg-muted-foreground/30 shrink-0" />
                        <span className="text-caption text-muted-foreground font-mono truncate font-medium bg-black/5 dark:bg-white/10 px-space-2 py-space-0.5 radius-md">
                          {selectedCall.phone}
                        </span>
                      </div>
                      <p className="text-caption text-muted-foreground mt-space-1.5 whitespace-nowrap uppercase tracking-widest">
                        Interaction Ref:{" "}
                        <span className="font-mono text-primary font-semibold tracking-wider ml-space-1">
                          #OPR-{selectedCall.id}29-A
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-space-2 shrink-0">
                      <Button className="h-9 w-9 p-space-0 radius-md border border-border-default bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Body Wrapper - Custom scroll */}
                  <ScrollArea
                    className="flex-1 p-space-6 space-y-space-8 max-h-full relative z-10"
                    horizontal={false}
                  >
                    {/* Premium Audio Player Waveform Simulation */}
                    <div className="radius-2xl border border-white/20 dark:border-white/10 bg-white/50 dark:bg-black/60 p-space-5 relative overflow-hidden group">
                      <div className="absolute inset-space-0 bg-gradient-to-br from-primary/5 to-pink-500/5 opacity-50" />

                      <div className="relative z-10 flex justify-between items-center text-caption text-muted-foreground font-semibold uppercase tracking-widest mb-space-4">
                        <span className="flex items-center gap-space-2 text-foreground/80">
                          <Volume2 className="h-3.5 w-3.5 text-primary shrink-0" />{" "}
                          High-Fidelity Recording
                        </span>
                        <span className="font-mono opacity-80 bg-black/5 dark:bg-white/10 px-space-2 py-space-1 radius-md">
                          July 9, 2026
                        </span>
                      </div>

                      <div className="relative z-10 flex items-center gap-space-4">
                        <NativeButton
                          onClick={handlePlayPause}
                          className="h-12 w-12 radius-md bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center hover:scale-105 transition-all 0_0_20px_rgba(99,102,241,0.4)] shrink-0 active:scale-95 border border-white/20"
                        >
                          {isPlaying ? (
                            <Pause className="h-5 w-5 fill-white" />
                          ) : (
                            <Play className="h-5 w-5 fill-white ml-space-1" />
                          )}
                        </NativeButton>

                        {/* Interactive Wave Bar Visualizer */}
                        <div className="flex-1 flex items-center h-10 gap-[3px] overflow-hidden">
                          {[
                            25, 45, 18, 32, 65, 85, 52, 38, 48, 70, 92, 45, 25,
                            35, 55, 82, 60, 42, 28, 48, 68, 85, 58, 34, 20, 38,
                            52, 68, 45, 30, 60, 78, 40, 22,
                          ].map((h, i) => {
                            const threshold = (i / 34) * 100;
                            const isPlayed = threshold <= playbackProgress;
                            return (
                              <div
                                key={i}
                                className={`flex-1 radius-md transition-all duration-300 ${
                                  isPlayed
                                    ? "bg-gradient-to-t from-primary to-indigo-400 0_0_8px_rgba(99,102,241,0.6)]"
                                    : "bg-black/10 dark:bg-white/20 hover:bg-black/20 dark:hover:bg-white/30"
                                }`}
                                style={{ height: `${Math.max(15, h)}%` }}
                              />
                            );
                          })}
                        </div>
                        <div className="flex flex-col items-end shrink-0 min-w-12">
                          <span className="text-body-sm font-mono text-primary font-semibold">
                            {isPlaying
                              ? `0:${Math.floor((playbackProgress / 100) * 42)
                                  .toString()
                                  .padStart(2, "0")}`
                              : "0:00"}
                          </span>
                          <span className="text-caption font-mono text-muted-foreground font-semibold">
                            1:42
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Step-by-Step AI Routing Timeline */}
                    <div className="space-y-space-5">
                      <h5 className="text-caption font-semibold text-muted-foreground uppercase tracking-widest px-space-1 flex items-center gap-space-2">
                        <Activity className="h-3.5 w-3.5" /> Operations Routing
                      </h5>
                      <div className="relative border-l-space-2 border-dashed border-border-default pl-space-7 ml-space-4 space-y-space-7">
                        {selectedCall.timeline.map((step, idx) => (
                          <div key={idx} className="relative group/step">
                            {/* Animated Glowing Node */}
                            <div className="absolute -left-[37px] top-space-0 h-7 w-7 radius-md bg-white dark:bg-gray-900 border-2 border-border-default group-hover/step:border-primary transition-colors flex items-center justify-center text-primary shrink-0 z-10">
                              {step.active && (
                                <div className="absolute inset-space-0 bg-primary/20 radius-md animate-ping opacity-50" />
                              )}
                              {React.cloneElement(
                                step.icon as React.ReactElement,
                                {
                                  className: "h-3.5 w-3.5 relative z-10",
                                } as any,
                              )}
                            </div>
                            <div className="min-w-0 pl-space-1 bg-white/40 dark:bg-white/5 radius-xl p-space-3 border border-transparent group-hover/step:border-white/20 dark:group-hover/step:border-white/10 transition-colors">
                              <p className="text-body-sm font-semibold text-foreground leading-none">
                                {step.title}
                              </p>
                              <p className="text-caption text-muted-foreground mt-space-1.5 leading-snug font-medium">
                                {step.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dialogue Bubbles - Premium UI */}
                    <div className="space-y-space-4 pb-space-4">
                      <h5 className="text-caption font-semibold text-muted-foreground uppercase tracking-widest px-space-1 flex items-center gap-space-2">
                        <MessageSquare className="h-3.5 w-3.5" /> Live
                        Transcript
                      </h5>
                      <div className="space-y-space-5 bg-white/30 dark:bg-black/20 border border-white/20 dark:border-white/5 radius-3xl p-space-5 relative">
                        {selectedCall.transcript.map((bubble, idx) => (
                          <div
                            key={idx}
                            className={`flex ${bubble.speaker === "ai" ? "justify-start" : "justify-end"} animate-in fade-in slide-in-from-bottom-space-2 duration-500`}
                            style={{ animationDelay: `${idx * 150}ms` }}
                          >
                            <div
                              className={`max-w-[85%] flex gap-space-3 items-end ${bubble.speaker === "ai" ? "" : "flex-row-reverse"}`}
                            >
                              {/* Small Avatar badge for transcript */}
                              <div
                                className={`h-7 w-7 radius-md flex items-center justify-center font-normal text-caption border shrink-0 ${
                                  bubble.speaker === "ai"
                                    ? "bg-gradient-to-br from-primary to-indigo-600 text-white border-primary/50"
                                    : "bg-white dark:bg-gray-800 text-muted-foreground border-border-default"
                                }`}
                              >
                                {bubble.speaker === "ai" ? (
                                  <Sparkles className="h-3.5 w-3.5" />
                                ) : (
                                  selectedCall.name
                                    .split(" ")
                                    .map((w) => w[0])
                                    .join("")
                                )}
                              </div>
                              <div
                                className={`radius-2xl px-space-5 py-space-3 text-body-sm leading-relaxed backdrop-blur-md ${
                                  bubble.speaker === "ai"
                                    ? "bg-gradient-to-br from-primary/10 to-indigo-500/10 dark:from-primary/20 dark:to-indigo-500/20 text-foreground border border-primary/20 radius-bl-sm"
                                    : "bg-white/80 dark:bg-white/10 text-foreground border border-border-default radius-br-sm"
                                }`}
                              >
                                {bubble.text}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>

                  {/* Bottom Integrations Synced Ribbon - Glowing Badges */}
                  <div className="px-space-6 py-space-4 border-t border-border-subtle bg-white/50 dark:bg-black/40 flex flex-col sm:flex-row sm:items-center justify-between gap-space-4 relative z-10 backdrop-blur-md 0_-10px_30px_rgba(0,0,0,0.02)]">
                    <span className="text-caption font-semibold text-muted-foreground uppercase tracking-widest shrink-0">
                      System Sync
                    </span>
                    <div className="flex flex-wrap items-center gap-space-3">
                      {selectedCall.integrations.map((integration, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-space-2 shrink-0 whitespace-nowrap bg-white/80 dark:bg-white/10 border border-border-default px-space-3 py-space-1.5 radius-md hover:scale-105 transition-transform cursor-default"
                        >
                          <div className="h-4 w-4 radius-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 0_0_8px_rgba(16,185,129,0.3)]">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </div>
                          <span className="text-caption font-semibold text-foreground/80">
                            {integration.name}
                          </span>
                          <span className="text-caption text-muted-foreground font-medium bg-black/5 dark:bg-black/20 px-space-2 py-space-0.5 radius-md uppercase tracking-wider">
                            {integration.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: CHATS INBOX - Enhanced Spacing & Premium Cards */}
            {activeTab === "chats" && (
              <div className="space-y-space-5 flex-1 animate-in fade-in slide-in-from-bottom-space-4 duration-700 ease-out">
                <p className="text-caption font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-space-2">
                  <MessageCircle className="h-4 w-4" /> Multi-Channel Client
                  Inbox
                </p>
                <ScrollArea
                  className="grid grid-cols-1 gap-space-4 max-h-136 pr-space-2 pb-space-4"
                  horizontal={false}
                >
                  {recentChats.map((chat, idx) => (
                    <div
                      key={chat.id}
                      className="radius-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-md p-space-5 flex flex-col sm:flex-row sm:items-center justify-between hover:border-primary/30 0_8px_30px_rgba(99,102,241,0.12)] hover:-translate-y-space-0.5 transition-all duration-300 gap-space-4"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="flex items-center gap-space-5">
                        <div className="h-12 w-12 radius-2xl bg-gradient-to-br from-primary/10 to-indigo-500/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                          {chat.source === "WhatsApp" ? (
                            <MessageCircle className="h-6 w-6" />
                          ) : chat.source === "Instagram DM" ? (
                            <Globe className="h-6 w-6" />
                          ) : (
                            <MessageSquare className="h-6 w-6" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-space-3">
                            <span className="text-body-sm font-semibold text-foreground">
                              {chat.sender}
                            </span>
                            <span className="text-caption radius-md bg-white/80 dark:bg-white/10 border border-border-default px-space-2.5 py-space-0.5 text-muted-foreground font-semibold tracking-widest uppercase">
                              {chat.source}
                            </span>
                          </div>
                          <p className="text-body-sm text-muted-foreground mt-space-1.5 leading-snug font-medium max-w-lg">
                            {chat.msg}
                          </p>
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-space-2 shrink-0">
                        <span className="text-caption font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-space-3 py-space-1.5 radius-md uppercase tracking-wider">
                          {chat.status}
                        </span>
                        <span className="text-caption text-muted-foreground font-mono mt-space-1 font-semibold">
                          {chat.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            {/* VIEW 3: CALENDAR HUB - Enhanced Spacing & Premium Cards */}
            {activeTab === "calendar" && (
              <ScrollArea
                className="space-y-space-6 flex-1 max-h-136 pr-space-2 animate-in fade-in slide-in-from-bottom-space-4 duration-700 ease-out pb-space-4"
                horizontal={false}
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-border-default pb-space-5 gap-space-4">
                  <div>
                    <h4 className="text-body-md font-semibold text-foreground flex items-center gap-space-2">
                      <Calendar className="h-4.5 w-4.5 text-primary" />{" "}
                      Omni-Channel Synchronization
                    </h4>
                    <p className="text-caption text-muted-foreground mt-space-1 font-medium">
                      Real-time slot alignment checking configured across Google
                      & Outlook
                    </p>
                  </div>
                  <span className="text-caption font-semibold text-foreground bg-white/80 dark:bg-white/10 border border-border-default px-space-4 py-space-2 radius-xl font-mono self-start sm:self-auto backdrop-blur-md">
                    Friday, July 9, 2026
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-space-3 text-center">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (d) => (
                      <div
                        key={d}
                        className="text-caption font-semibold text-muted-foreground uppercase tracking-widest py-space-2"
                      >
                        {d}
                      </div>
                    ),
                  )}
                  {Array.from({ length: 14 }, (_, i) => i + 5).map((d) => (
                    <div
                      key={d}
                      className={`radius-2xl p-space-4 text-body-sm font-mono border transition-all duration-300 flex flex-col items-center justify-between gap-space-3 ${
                        d === 9
                          ? "bg-gradient-to-br from-primary to-indigo-600 text-white border-primary/50 0_8px_25px_rgba(99,102,241,0.4)] scale-105 font-normal z-10"
                          : d === 12 || d === 15
                            ? "bg-primary/10 dark:bg-primary/20 text-primary border-primary/20 font-normal hover:bg-primary/20"
                            : "bg-white/50 dark:bg-white/5 text-foreground/80 border-border-subtle hover:border-border-hover hover:bg-white/80 dark:hover:bg-white/10"
                      }`}
                    >
                      <span>{d}</span>
                      {d === 9 && (
                        <span className="text-caption uppercase tracking-widest opacity-90 font-sans font-semibold bg-white/20 px-space-2 py-space-0.5 radius-md">
                          Today
                        </span>
                      )}
                      {(d === 12 || d === 15) && (
                        <span className="h-2 w-2 radius-md bg-primary mt-space-1 0_0_8px_rgba(99,102,241,0.6)]" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Calendar Active Slots */}
                <div className="space-y-space-3 mt-space-8">
                  <p className="text-caption font-semibold uppercase tracking-widest text-muted-foreground px-space-1 mb-space-4">
                    AI Reserved Slots Today
                  </p>
                  {[
                    {
                      time: "9:00 AM",
                      client: "Jane Smith",
                      type: "Dental Cleaning",
                      status: "AI Reserved",
                      avatar: "JS",
                      color:
                        "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
                    },
                    {
                      time: "11:30 AM",
                      client: "Mike Chen",
                      type: "Whitening Session",
                      status: "AI Reserved",
                      avatar: "MC",
                      color: "bg-pink-500/10 text-pink-500 border-pink-500/20",
                    },
                    {
                      time: "2:00 PM",
                      client: "Sarah Jenkins",
                      type: "Orthodontic Consult",
                      status: "Google Synced",
                      avatar: "SJ",
                      color:
                        "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                    },
                  ].map((slot, i) => (
                    <div
                      key={i}
                      className="flex flex-col sm:flex-row sm:items-center justify-between radius-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-md px-space-6 py-space-4 hover:border-primary/30 transition-all duration-300 gap-space-4 group"
                    >
                      <div className="flex items-center gap-space-5">
                        <span className="text-body-sm font-mono font-semibold text-primary w-16 shrink-0">
                          {slot.time}
                        </span>
                        <div
                          className={`h-10 w-10 radius-xl flex items-center justify-center font-semibold text-caption border shrink-0 ${slot.color}`}
                        >
                          {slot.avatar}
                        </div>
                        <div>
                          <p className="text-body-sm font-semibold text-foreground leading-none group-hover:text-primary transition-colors">
                            {slot.client}
                          </p>
                          <p className="text-caption text-muted-foreground mt-space-1.5 font-medium">
                            {slot.type}
                          </p>
                        </div>
                      </div>
                      <span className="text-caption font-semibold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-space-3.5 py-space-1.5 radius-md shrink-0 self-start sm:self-auto">
                        {slot.status}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* VIEW 4: ANALYTICS PORTAL - Premium Charts & Stats */}
            {activeTab === "analytics" && (
              <ScrollArea
                className="space-y-space-6 flex-1 max-h-136 pr-space-2 animate-in fade-in slide-in-from-bottom-space-4 duration-700 ease-out pb-space-4"
                horizontal={false}
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-border-default pb-space-5 gap-space-4">
                  <div>
                    <h4 className="text-body-md font-semibold text-foreground flex items-center gap-space-2">
                      <BarChart3 className="h-4.5 w-4.5 text-primary" /> Operator
                      Diagnostics
                    </h4>
                    <p className="text-caption text-muted-foreground mt-space-1 font-medium">
                      Automated savings and capturing rates analysis
                    </p>
                  </div>
                  <span className="text-caption font-semibold text-muted-foreground uppercase tracking-widest font-mono bg-white/80 dark:bg-white/10 border border-border-default px-space-4 py-space-2 radius-xl backdrop-blur-md">
                    July 2026 REPORT
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-5">
                  {[
                    {
                      label: "Answer Efficiency",
                      value: "99.8%",
                      desc: "Under 1s average response",
                      sub: "Voicemail bypass: 100%",
                    },
                    {
                      label: "Lead Qualification",
                      value: "87.4%",
                      desc: "Avg profile capture complete",
                      sub: "HubSpot sync time: < 1s",
                    },
                    {
                      label: "Operations Savings",
                      value: "76%",
                      desc: "Compared to human desk",
                      sub: "Savings recovery: $1,420",
                    },
                  ].map((card, i) => (
                    <div
                      key={i}
                      className="radius-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-md p-space-6 hover:border-primary/40 hover:-translate-y-space-1 0_15px_30px_rgba(99,102,241,0.15)] transition-all duration-300 text-center relative overflow-hidden group"
                    >
                      <div className="absolute inset-space-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <p className="relative z-10 text-caption font-semibold text-muted-foreground uppercase tracking-widest mb-space-3">
                        {card.label}
                      </p>
                      <p className="relative z-10 text-3xl text-foreground font-mono font-black leading-none py-space-2">
                        {card.value}
                      </p>
                      <p className="relative z-10 text-caption text-primary font-semibold mt-space-2 leading-snug">
                        {card.desc}
                      </p>
                      <p className="relative z-10 text-caption text-muted-foreground mt-space-4 border-t border-border-subtle pt-space-3 font-semibold">
                        {card.sub}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Main Weekly Bar Chart - Premium Style */}
                <div className="radius-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-md p-space-6 space-y-space-6 relative group mt-space-2">
                  <div className="flex justify-between items-start px-space-2">
                    <div>
                      <span className="text-body-sm font-semibold text-foreground">
                        Weekly Revenue Recovered
                      </span>
                      <p className="text-caption text-muted-foreground mt-space-1 font-medium">
                        Recovered from missed incoming leads
                      </p>
                    </div>
                    <span className="text-caption font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-space-3 py-space-1.5 radius-md flex items-center gap-space-1.5 uppercase tracking-wider">
                      <TrendingUp className="h-3.5 w-3.5 shrink-0" /> Avg +18%
                      weekly
                    </span>
                  </div>

                  <div className="h-44 flex items-end gap-space-6 px-space-4 sm:px-space-8 mt-space-4 relative">
                    {/* Background grid lines */}
                    <div className="absolute inset-space-0 flex flex-col justify-between pointer-events-none px-space-4 sm:px-space-8">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-full h-px bg-black/5 dark:bg-white/5"
                        />
                      ))}
                    </div>

                    {[450, 780, 1100, 1850].map((val, idx) => (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-space-4 h-full justify-end relative z-10"
                      >
                        <div
                          className="w-full max-w-16 bg-gradient-to-t from-primary/40 to-indigo-500/80 hover:from-primary/60 hover:to-indigo-400 radius-t-xl transition-all duration-500 cursor-pointer relative group/bar border-t-space-2 border-white/40 0_-5px_15px_rgba(99,102,241,0.2)]"
                          style={{ height: `${(val / 2000) * 100}%` }}
                        >
                          {/* Rich Tooltip on Hover */}
                          <div className="absolute -top-space-12 left-space-1/2 -translate-x-space-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <span className="bg-foreground text-background px-space-3 py-space-1.5 radius-lg text-caption font-semibold font-mono whitespace-nowrap">
                              ${val}
                            </span>
                            <div className="w-2 h-2 bg-foreground rotate-45 absolute -bottom-space-1 left-space-1/2 -translate-x-space-1/2" />
                          </div>
                        </div>
                        <span className="text-caption font-semibold text-muted-foreground font-mono tracking-widest bg-black/5 dark:bg-white/10 px-space-2 py-space-1 radius-md">
                          WK {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
