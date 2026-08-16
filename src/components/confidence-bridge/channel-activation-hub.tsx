"use client";

import * as React from "react";
import { useState } from "react";
import { 
  Phone, 
  MessageSquare, 
  Globe, 
  CheckCircle2, 
  Sparkles, 
  Copy, 
  Check, 
  Send, 
  ArrowRight, 
  Bot, 
  User, 
  ShieldCheck,
  RefreshCw,
  Rocket,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/components/shared/utils";
import { Button } from "@/components/shared/button";
import { useRouter } from "next/navigation";
import { VoicePersonaCard } from "./voice-persona-card";

interface ChannelActivationHubProps {
  businessName: string;
  orgId: string;
  onFinish?: () => void;
  onBack?: () => void;
}

type SelectedChannel = "phone" | "widget" | "whatsapp";

export function ChannelActivationHub({
  businessName,
  orgId,
  onFinish,
  onBack,
}: ChannelActivationHubProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<"channel" | "ready">("channel");
  const [selectedChannel, setSelectedChannel] = useState<SelectedChannel>("widget");
  const [copied, setCopied] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [testMessages, setTestMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { sender: "ai", text: `Hi! Thank you for contacting ${businessName}. How can I assist you with our services or booking today?` }
  ]);
  const [isSimulating, setIsSimulating] = useState(false);

  const embedSnippet = typeof window !== "undefined"
    ? `<script src="${window.location.origin}/widget.js" data-org-id="${orgId}"></script>`
    : `<script src="https://operator-azure.vercel.app/widget.js" data-org-id="${orgId}"></script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendTestMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testInput.trim() || isSimulating) return;

    const userText = testInput;
    setTestInput("");
    setTestMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setIsSimulating(true);

    setTimeout(() => {
      let aiReply = `I'd be happy to help with that! We are open during regular business hours and have appointment availability this week. Would you like me to find a time for you?`;
      if (userText.toLowerCase().includes("price") || userText.toLowerCase().includes("cost")) {
        aiReply = `Our service rates start according to our verified pricing menu. Is there a specific service you'd like to check?`;
      } else if (userText.toLowerCase().includes("hour") || userText.toLowerCase().includes("open")) {
        aiReply = `We are open Monday through Saturday. You can book an appointment online or call us directly!`;
      }

      setTestMessages((prev) => [...prev, { sender: "ai", text: aiReply }]);
      setIsSimulating(false);
    }, 600);
  };

  // ── Screen 2: Operator is Ready (Next Screen) ──────────────────────────────
  if (currentStep === "ready") {
    return (
      <div className="space-y-space-6 py-space-4 animate-fade-up">
        <div className="flex flex-col items-center text-center space-y-space-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-24 w-24 rounded-full bg-emerald-500/10 animate-ping [animation-duration:2.5s]" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-xl shadow-emerald-500/25">
              <CheckCircle2 className="h-9 w-9 stroke-[2.5]" />
            </div>
          </div>

          <div className="space-y-space-1.5 max-w-md">
            <div className="inline-flex items-center gap-space-2 px-space-3 py-space-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-caption font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Ready for Production</span>
            </div>
            <h2 className="text-heading-lg font-bold text-foreground tracking-tight">
              Operator is Ready!
            </h2>
            <p className="text-body-sm text-muted-foreground leading-relaxed">
              Your AI assistant for <span className="font-semibold text-foreground">{businessName}</span> has been configured, verified, and activated.
            </p>
          </div>
        </div>

        {/* Status Verification Checklist Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-3 max-w-2xl mx-auto">
          <div className="p-space-4 rounded-xl border border-border/80 bg-card/80 space-y-space-1.5 shadow-xs">
            <div className="flex items-center gap-space-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
              <span className="text-body-sm font-semibold text-foreground">Business Profile</span>
            </div>
            <p className="text-caption text-muted-foreground">Hours, services, and policies configured.</p>
          </div>

          <div className="p-space-4 rounded-xl border border-border/80 bg-card/80 space-y-space-1.5 shadow-xs">
            <div className="flex items-center gap-space-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
              <span className="text-body-sm font-semibold text-foreground">AI Knowledge</span>
            </div>
            <p className="text-caption text-muted-foreground">Simulations passed with zero side-effects.</p>
          </div>

          <div className="p-space-4 rounded-xl border border-border/80 bg-card/80 space-y-space-1.5 shadow-xs">
            <div className="flex items-center gap-space-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
              <span className="text-body-sm font-semibold text-foreground">Channel Setup</span>
            </div>
            <p className="text-caption text-muted-foreground">
              {selectedChannel === "widget" ? "Website Chat Live" : selectedChannel === "phone" ? "Forwarding Ready" : "WhatsApp Linked"}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-space-3 pt-space-4 max-w-md mx-auto">
          <Button
            size="lg"
            shape="pill"
            onClick={onFinish ? onFinish : () => router.push("/dashboard")}
            className="w-full sm:w-auto font-bold gap-space-2 shadow-lg shadow-primary/25 px-8"
          >
            <Rocket className="h-4 w-4" />
            <span>Launch Operator</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep("channel")}
            className="text-caption text-muted-foreground hover:text-foreground"
          >
            <span>← Adjust Channel</span>
          </Button>
        </div>
      </div>
    );
  }

  // ── Screen 1: Select & Configure Channel ──────────────────────────────────
  return (
    <div className="space-y-space-5 animate-fade-up">
      {/* Header */}
      <div className="space-y-space-1.5 text-left">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-caption font-semibold text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Back to Verification Tests</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-space-1.5 px-space-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-caption font-bold uppercase tracking-wider">
            <ShieldCheck className="h-3 w-3" />
            <span>Step 3 of 3: Channel Setup</span>
          </div>
        </div>
        <h2 className="text-heading-sm font-bold text-foreground">
          Where do your customers contact you?
        </h2>
        <p className="text-caption text-muted-foreground">
          Choose a primary channel to activate Operator. You can add more anytime in your dashboard.
        </p>
      </div>

      {/* Channel Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-3">
        {/* Option 1: Website Chat */}
        <button
          type="button"
          onClick={() => setSelectedChannel("widget")}
          className={cn(
            "flex flex-col text-left p-space-4 rounded-xl border transition-all duration-fast relative group",
            selectedChannel === "widget"
              ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
              : "border-border/80 bg-card/60 hover:border-border hover:bg-muted/40"
          )}
        >
          <div className="flex items-center justify-between w-full mb-space-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Globe className="h-4 w-4" />
            </div>
            {selectedChannel === "widget" && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              </span>
            )}
          </div>
          <h3 className="text-body-sm font-bold text-foreground">Website Live Chat</h3>
          <p className="text-caption text-muted-foreground mt-0.5 leading-snug">
            Embed AI chat on your site to answer FAQs and book appointments 24/7.
          </p>
        </button>

        {/* Option 2: Phone Forwarding */}
        <button
          type="button"
          onClick={() => setSelectedChannel("phone")}
          className={cn(
            "flex flex-col text-left p-space-4 rounded-xl border transition-all duration-fast relative group",
            selectedChannel === "phone"
              ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
              : "border-border/80 bg-card/60 hover:border-border hover:bg-muted/40"
          )}
        >
          <div className="flex items-center justify-between w-full mb-space-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Phone className="h-4 w-4" />
            </div>
            {selectedChannel === "phone" && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              </span>
            )}
          </div>
          <h3 className="text-body-sm font-bold text-foreground">Keep My Phone</h3>
          <p className="text-caption text-muted-foreground mt-0.5 leading-snug">
            Forward unanswered calls to Operator. Keep your existing phone number.
          </p>
        </button>

        {/* Option 3: WhatsApp */}
        <button
          type="button"
          onClick={() => setSelectedChannel("whatsapp")}
          className={cn(
            "flex flex-col text-left p-space-4 rounded-xl border transition-all duration-fast relative group",
            selectedChannel === "whatsapp"
              ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
              : "border-border/80 bg-card/60 hover:border-border hover:bg-muted/40"
          )}
        >
          <div className="flex items-center justify-between w-full mb-space-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <MessageSquare className="h-4 w-4" />
            </div>
            {selectedChannel === "whatsapp" && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              </span>
            )}
          </div>
          <h3 className="text-body-sm font-bold text-foreground">WhatsApp Business</h3>
          <p className="text-caption text-muted-foreground mt-0.5 leading-snug">
            Connect your WhatsApp business line to handle inbound chats automatically.
          </p>
        </button>
      </div>

      {/* Configuration & Sandbox Card */}
      <div className="rounded-xl border border-border/80 bg-card/60 p-space-4 space-y-space-4 shadow-xs">
        {selectedChannel === "widget" && (
          <div className="space-y-space-2.5">
            <div className="flex items-center justify-between">
              <span className="text-body-sm font-bold text-foreground">Embed Snippet</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyCode}
                className="h-8 gap-space-1.5 text-caption font-bold"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied!" : "Copy Code"}</span>
              </Button>
            </div>
            <div className="rounded-lg bg-muted/70 p-space-3 font-mono text-caption text-foreground border border-border/60 break-all select-all">
              {embedSnippet}
            </div>
          </div>
        )}

        {selectedChannel === "phone" && (
          <div className="space-y-space-2.5">
            <span className="text-body-sm font-bold text-foreground">Carrier Call Forwarding</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-2">
              <div className="p-space-3 rounded-lg border border-border bg-muted/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To Forward Calls</span>
                <p className="text-body-sm font-mono font-bold text-foreground mt-0.5">*71 + (555) 010-0199</p>
              </div>
              <div className="p-space-3 rounded-lg border border-border bg-muted/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To Cancel Forwarding</span>
                <p className="text-body-sm font-mono font-bold text-foreground mt-0.5">*73</p>
              </div>
            </div>
          </div>
        )}

        {selectedChannel === "whatsapp" && (
          <div className="flex items-center justify-between gap-space-3">
            <div>
              <span className="text-body-sm font-bold text-foreground">WhatsApp Business API</span>
              <p className="text-caption text-muted-foreground">Link your Meta WhatsApp Cloud API credentials in dashboard settings.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => router.push("/channels")} className="shrink-0 text-caption font-bold">
              <span>Setup in Settings</span>
            </Button>
          </div>
        )}

        {/* Compact Interactive Test Simulator */}
        <div className="pt-space-3 border-t border-border/60 space-y-space-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-caption font-bold text-foreground">Live Simulation Sandbox</span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Simulated
            </span>
          </div>

          <div className="rounded-lg border border-border/70 bg-background/80 p-space-3 max-h-32 overflow-y-auto space-y-space-2 scrollbar-thin">
            {testMessages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-space-2 text-caption max-w-[90%]",
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <div
                  className={cn(
                    "flex h-5 w-5 rounded-full items-center justify-center shrink-0 text-[9px]",
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground border border-border"
                  )}
                >
                  {msg.sender === "user" ? <User className="h-2.5 w-2.5" /> : <Bot className="h-2.5 w-2.5" />}
                </div>
                <div
                  className={cn(
                    "px-space-3 py-space-1.5 rounded-xl text-caption leading-relaxed",
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted/80 text-foreground rounded-tl-none border border-border/40"
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isSimulating && (
              <div className="flex items-center gap-space-1.5 text-muted-foreground text-caption italic">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Operator is typing…</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSendTestMessage} className="flex gap-space-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Ask a question (e.g., 'What are your hours?')"
              className="flex-1 rounded-lg border border-border bg-background px-space-3 py-1.5 text-caption text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!testInput.trim() || isSimulating}
              className="h-8 gap-space-1 text-caption font-bold"
            >
              <Send className="h-3 w-3" />
              <span>Send</span>
            </Button>
          </form>
        </div>
      </div>

      {/* Bottom Step Progression Button */}
      <div className="flex items-center justify-end pt-space-2">
        <Button
          size="lg"
          shape="pill"
          onClick={() => setCurrentStep("ready")}
          className="w-full sm:w-auto font-bold gap-space-2 shadow-md shadow-primary/20 px-8"
        >
          <span>Continue to Final Launch</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
