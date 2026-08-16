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
  AlertCircle, 
  ShieldCheck,
  RefreshCw,
  Zap
} from "lucide-react";
import { cn } from "@/components/shared/utils";
import { Button } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { useRouter } from "next/navigation";
import { VoicePersonaCard } from "./voice-persona-card";

interface ChannelActivationHubProps {
  businessName: string;
  orgId: string;
  onFinish?: () => void;
  onBack?: () => void;
}

type SelectedChannel = "phone" | "widget" | "whatsapp" | null;

export function ChannelActivationHub({
  businessName,
  orgId,
  onFinish,
  onBack,
}: ChannelActivationHubProps) {
  const router = useRouter();
  const [selectedChannel, setSelectedChannel] = useState<SelectedChannel>("widget");
  const [copied, setCopied] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [testMessages, setTestMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { sender: "ai", text: `Hi! Thank you for contacting ${businessName}. How can I assist you with our services or booking today?` }
  ]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isChannelConnected, setIsChannelConnected] = useState(false);

  const embedSnippet = typeof window !== "undefined"
    ? `<script src="${window.location.origin}/widget.js" data-org-id="${orgId}"></script>`
    : `<script src="https://receptionist.nexx.ai/widget.js" data-org-id="${orgId}"></script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopied(true);
    setIsChannelConnected(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendTestMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testInput.trim() || isSimulating) return;

    const userText = testInput;
    setTestInput("");
    setTestMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setIsSimulating(true);

    // Simulate Operator AI turn
    setTimeout(() => {
      let aiReply = `I'd be happy to help with that! We are open during regular business hours and have appointment availability this week. Would you like me to find a time for you?`;
      if (userText.toLowerCase().includes("price") || userText.toLowerCase().includes("cost")) {
        aiReply = `Our service rates start according to our verified pricing menu. Is there a specific service you'd like to check?`;
      } else if (userText.toLowerCase().includes("hour") || userText.toLowerCase().includes("open")) {
        aiReply = `We are open Monday through Saturday. You can book an appointment online or call us directly!`;
      }

      setTestMessages((prev) => [...prev, { sender: "ai", text: aiReply }]);
      setIsSimulating(false);
      setIsChannelConnected(true);
    }, 600);
  };

  return (
    <div className="space-y-space-6 animate-fade-up">
      {/* Header with optional back navigation */}
      <div className="space-y-space-2 text-center sm:text-left relative">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <span>← Back to Verification Tests</span>
          </button>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-space-2 px-space-3 py-space-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>AI Verified · Step 3 of 3</span>
          </div>
        </div>
        <h2 className="text-heading-md font-bold text-foreground">
          Where do your customers contact you?
        </h2>
        <p className="text-body-sm text-muted-foreground max-w-xl">
          Start with one primary channel. You can connect additional channels anytime from your dashboard.
        </p>
      </div>

      {/* Channel Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-4">
        {/* Option 1: Website Chat Widget */}
        <button
          type="button"
          onClick={() => setSelectedChannel("widget")}
          className={cn(
            "flex flex-col text-left p-space-5 rounded-2xl border transition-all duration-200 relative group",
            selectedChannel === "widget"
              ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-2 ring-primary/20"
              : "border-border bg-card hover:border-border-hover hover:bg-muted/40"
          )}
        >
          <div className="flex items-center justify-between w-full mb-space-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
              <Globe className="h-5 w-5" />
            </div>
            {selectedChannel === "widget" && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            )}
          </div>
          <h3 className="text-body-md font-bold text-foreground">Website Live Chat</h3>
          <p className="text-caption text-muted-foreground mt-space-1 leading-relaxed">
            Let website visitors chat, ask questions, and book with Operator immediately.
          </p>
          <span className="mt-space-4 text-[11px] font-bold text-primary flex items-center gap-space-1">
            <span>Instant 1-Line Setup</span>
            <ArrowRight className="h-3 w-3" />
          </span>
        </button>

        {/* Option 2: Smart Call Forwarding */}
        <button
          type="button"
          onClick={() => setSelectedChannel("phone")}
          className={cn(
            "flex flex-col text-left p-space-5 rounded-2xl border transition-all duration-200 relative group",
            selectedChannel === "phone"
              ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-2 ring-primary/20"
              : "border-border bg-card hover:border-border-hover hover:bg-muted/40"
          )}
        >
          <div className="flex items-center justify-between w-full mb-space-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <Phone className="h-5 w-5" />
            </div>
            {selectedChannel === "phone" && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            )}
          </div>
          <h3 className="text-body-md font-bold text-foreground">Keep My Phone (Forwarding)</h3>
          <p className="text-caption text-muted-foreground mt-space-1 leading-relaxed">
            Operator answers when you're busy or closed. Keep your existing published number.
          </p>
          <span className="mt-space-4 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-space-1">
            <span>Zero Number Change</span>
            <ArrowRight className="h-3 w-3" />
          </span>
        </button>

        {/* Option 3: WhatsApp Business */}
        <button
          type="button"
          onClick={() => setSelectedChannel("whatsapp")}
          className={cn(
            "flex flex-col text-left p-space-5 rounded-2xl border transition-all duration-200 relative group",
            selectedChannel === "whatsapp"
              ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-2 ring-primary/20"
              : "border-border bg-card hover:border-border-hover hover:bg-muted/40"
          )}
        >
          <div className="flex items-center justify-between w-full mb-space-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <MessageSquare className="h-5 w-5" />
            </div>
            {selectedChannel === "whatsapp" && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            )}
          </div>
          <h3 className="text-body-md font-bold text-foreground">WhatsApp Business</h3>
          <p className="text-caption text-muted-foreground mt-space-1 leading-relaxed">
            Connect your WhatsApp line to answer questions and schedule appointments 24/7.
          </p>
          <span className="mt-space-4 text-[11px] font-bold text-muted-foreground flex items-center gap-space-1">
            <span>Meta API or Forwarding</span>
            <ArrowRight className="h-3 w-3" />
          </span>
        </button>
      </div>

      {/* Selected Channel Interactive Action Area */}
      <div className="rounded-2xl border border-border bg-card p-space-6 shadow-sm space-y-space-5">
        {selectedChannel === "widget" && (
          <div className="space-y-space-4">
            <div className="flex items-start justify-between gap-space-4">
              <div>
                <h4 className="text-body-md font-bold text-foreground">Embed AI Chat Widget</h4>
                <p className="text-caption text-muted-foreground mt-space-0.5">
                  Paste this snippet right before the <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">&lt;/body&gt;</code> tag on your website HTML.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyCode}
                className="shrink-0 gap-space-2 text-body-sm font-bold"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? "Copied Snippet!" : "Copy Code"}</span>
              </Button>
            </div>

            <div className="rounded-xl bg-muted p-space-3 font-mono text-[11px] text-foreground border border-border overflow-x-auto whitespace-pre">
              {embedSnippet}
            </div>
          </div>
        )}

        {selectedChannel === "phone" && (
          <div className="space-y-space-4">
            <div>
              <h4 className="text-body-md font-bold text-foreground">Smart Call Forwarding Instructions</h4>
              <p className="text-caption text-muted-foreground mt-space-0.5">
                From your business phone, dial the standard carrier forwarding code to link unanswered calls to Operator:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-3">
              <div className="p-space-4 rounded-xl border border-border bg-muted/40 space-y-space-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">When Busy / Unanswered</span>
                <p className="text-body-md font-mono font-bold text-foreground">*71 + (555) 010-0199</p>
                <p className="text-[11px] text-muted-foreground">Standard carrier conditional forwarding</p>
              </div>
              <div className="p-space-4 rounded-xl border border-border bg-muted/40 space-y-space-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To Turn Off Forwarding Anytime</span>
                <p className="text-body-md font-mono font-bold text-foreground">*73</p>
                <p className="text-[11px] text-muted-foreground">Immediately returns all calls to your phone</p>
              </div>
            </div>

            {/* Voice Persona Configuration for Phone Line */}
            <div className="pt-2">
              <VoicePersonaCard businessName={businessName} />
            </div>
          </div>
        )}

        {selectedChannel === "whatsapp" && (
          <div className="space-y-space-4">
            <div className="flex items-start justify-between gap-space-4">
              <div>
                <h4 className="text-body-md font-bold text-foreground">Connect WhatsApp Business</h4>
                <p className="text-caption text-muted-foreground mt-space-0.5">
                  Link your Meta WhatsApp Business API account or route inquiries via smart forwarding.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/channels")}
                className="shrink-0 gap-space-2 text-body-sm font-bold"
              >
                <span>Configure in /channels</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Live Interactive Test Simulator ("Test Before Live") */}
        <div className="pt-space-4 border-t border-border space-y-space-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-[12px] font-bold text-foreground">Interactive Sandbox: Test Your AI Live</span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-space-2 py-0.5 rounded-full">
              Simulated Chat (0 side-effects)
            </span>
          </div>

          {/* Chat Bubble Sandbox */}
          <div className="rounded-xl border border-border bg-background p-space-4 max-h-48 overflow-y-auto space-y-space-3">
            {testMessages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-space-2 text-body-sm max-w-[85%]",
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 rounded-full items-center justify-center shrink-0 text-[10px]",
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground border border-border"
                  )}
                >
                  {msg.sender === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                </div>
                <div
                  className={cn(
                    "p-space-3 rounded-2xl text-[12px] leading-relaxed",
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted text-foreground rounded-tl-none border border-border/50"
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isSimulating && (
              <div className="flex items-center gap-space-2 text-muted-foreground text-caption italic">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Operator is typing...</span>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendTestMessage} className="flex gap-space-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Ask a question (e.g., 'What are your hours?' or 'How much is a consultation?')"
              className="flex-1 rounded-xl border border-border bg-background px-space-4 py-space-2 text-body-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!testInput.trim() || isSimulating}
              className="gap-space-1.5 font-bold"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send Test</span>
            </Button>
          </form>
        </div>
      </div>

      {/* Operator is Ready: Launch to Dashboard */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-space-4 p-space-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-sm">
        <div className="flex items-center gap-space-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-body-md font-bold text-foreground">Operator is Ready</h3>
            <p className="text-caption text-muted-foreground">
              Business setup complete · Knowledge verified · Channel ready for customer inquiries
            </p>
          </div>
        </div>

        <Button
          size="lg"
          shape="pill"
          onClick={onFinish ? onFinish : () => router.push("/dashboard")}
          className="w-full sm:w-auto font-bold gap-space-2 shadow-md shadow-primary/20"
        >
          <span>Launch Operator</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
