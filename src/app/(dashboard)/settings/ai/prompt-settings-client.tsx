"use client";

import { useState, useTransition, useCallback } from "react";
import { saveAIPersonaAction } from "@/server/actions/voice";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import { NativeTextarea } from "@/components/shared/native";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/select";
import { Sparkles, Save, Info, AlertCircle, Bot, MessageSquare, Building2, ShieldAlert, Play, Square, Code, CheckCircle2, ShieldCheck, Eye } from "lucide-react";
import { cn } from "@/components/shared/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PromptSettingsClientProps {
  initialAssistantName: string;
  initialTone: string;
  initialBusinessDescription: string;
  initialPromptText: string;
  previewPrompt: string;
  orgName: string;
}


const TONE_SAMPLES: Record<string, { q: string; a: string }> = {
  warm: {
    q: "Do you have any appointments available tomorrow afternoon?",
    a: "Hi! Yes, we do! I'd love to help you book that. We have openings at 2:00 PM and 4:30 PM with Priya. Would either of those work nicely for you?",
  },
  professional: {
    q: "Do you have any appointments available tomorrow afternoon?",
    a: "Good day. Yes, we have availability tomorrow afternoon. We can schedule you at 2:00 PM or 4:30 PM. Please let me know which time is most convenient.",
  },
  concise: {
    q: "Do you have any appointments available tomorrow afternoon?",
    a: "Yes. Tomorrow we have slots at 2:00 PM and 4:30 PM. Which one would you like to reserve?",
  },
};

const TONE_OPTIONS = [
  {
    value: "professional",
    label: "Professional & Courteous",
    description: "Polished, respectful, executive clarity and calm reassurance.",
  },
  {
    value: "warm",
    label: "Warm, Friendly & Empathetic",
    description: "Welcoming, kind, makes every customer feel personally cared for.",
  },
  {
    value: "concise",
    label: "Direct, Fast & Concise",
    description: "Straight to the point, answers immediately without small talk.",
  },
  {
    value: "luxury",
    label: "Luxury & High-Touch Concierge",
    description: "Refined, white-glove etiquette, bespoke attentiveness.",
  },
  {
    value: "casual",
    label: "Casual & Approachable",
    description: "Relaxed, plain conversational language like an approachable team member.",
  },
];

export function PromptSettingsClient({
  initialAssistantName,
  initialTone,
  initialBusinessDescription,
  initialPromptText,
  previewPrompt,
  orgName,
}: PromptSettingsClientProps) {
  const [assistantName, setAssistantName] = useState(initialAssistantName || "Ava");
  const [tone, setTone] = useState(initialTone || "warm");
  const [businessDescription, setBusinessDescription] = useState(initialBusinessDescription || "");
  const [promptText, setPromptText] = useState(initialPromptText || "");
  const [isSaving, startSave] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPlayingTonePreview, setIsPlayingTonePreview] = useState(false);
  const [showRawPrompt, setShowRawPrompt] = useState(false);

  const playToneSample = useCallback(
    (toneValue: string, name?: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

      window.speechSynthesis.cancel();
      const assistant = name || assistantName || "Ava";
      const samplePhrases: Record<string, string> = {
        professional: `Hello. Thank you for contacting ${orgName || "our business"}. My name is ${assistant}. How may I assist you with scheduling or service inquiries today?`,
        warm: `Hi there! Welcome to ${orgName || "our salon"}. I'm ${assistant}, and I'd love to help you book your next appointment or answer any questions!`,
        concise: `${orgName || "Front desk"}. I'm ${assistant}. I can check schedule availability or book your service immediately. What time works best?`,
        luxury: `Good day and welcome to ${orgName || "our concierge"}. I am ${assistant}, and it is my absolute pleasure to curate your booking reservation today.`,
        casual: `Hey! Thanks for reaching out to ${orgName || "us"}. I'm ${assistant}. What can I get set up for you today?`,
      };

      const textToSpeak = samplePhrases[toneValue] || samplePhrases.warm;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);

      const availableVoices = window.speechSynthesis.getVoices();
      const voice =
        availableVoices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.toLowerCase().includes("female") ||
              v.name.toLowerCase().includes("zira") ||
              v.name.toLowerCase().includes("samantha") ||
              v.name.toLowerCase().includes("natural") ||
              v.name.toLowerCase().includes("nicole"))
        ) || availableVoices.find((v) => v.lang.startsWith("en"));

      if (voice) utterance.voice = voice;

      if (toneValue === "concise") {
        utterance.rate = 1.15;
        utterance.pitch = 1.0;
      } else if (toneValue === "warm") {
        utterance.rate = 0.95;
        utterance.pitch = 1.08;
      } else if (toneValue === "luxury") {
        utterance.rate = 0.88;
        utterance.pitch = 0.96;
      } else if (toneValue === "casual") {
        utterance.rate = 1.05;
        utterance.pitch = 1.04;
      } else {
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
      }

      utterance.onstart = () => setIsPlayingTonePreview(true);
      utterance.onend = () => setIsPlayingTonePreview(false);
      utterance.onerror = () => setIsPlayingTonePreview(false);

      window.speechSynthesis.speak(utterance);
      setIsPlayingTonePreview(true);
    },
    [assistantName, orgName]
  );

  const handleToneChange = (val: string) => {
    setTone(val);
    playToneSample(val, assistantName);
  };

  const handleToggleToneAudio = () => {
    if (isPlayingTonePreview) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingTonePreview(false);
    } else {
      playToneSample(tone, assistantName);
    }
  };

  const handleSave = () => {
    setStatus(null);
    startSave(async () => {
      const res = await saveAIPersonaAction({
        assistantName,
        tone,
        businessDescription,
        customInstructions: promptText,
      });
      if (res.success) {
        setStatus({
          type: "success",
          text: "AI Receptionist persona, tone, business description, and instructions saved successfully!",
        });
      } else {
        setStatus({
          type: "error",
          text: res.error || "Failed to save AI persona settings.",
        });
      }
    });
  };

  const selectedToneObj = TONE_OPTIONS.find((t) => t.value === tone) || TONE_OPTIONS[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-6 items-start">
      {/* Configuration Column (7 Columns) */}
      <div className="lg:col-span-7 space-y-space-6">
        {status && (
          <div
            className={cn(
              "p-space-4 radius-lg border text-body-sm flex items-start gap-space-2.5",
              status.type === "success"
                ? "bg-[hsl(var(--state-success-bg))] border-[hsl(var(--state-success-border))] text-[hsl(var(--state-success-text))]"
                : "bg-[hsl(var(--state-error-bg))] border-[hsl(var(--state-error-border))] text-[hsl(var(--state-error-text))]"
            )}
          >
            {status.type === "success" ? (
              <Sparkles className="h-5 w-5 shrink-0 mt-space-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 mt-space-0.5" />
            )}
            <span>{status.text}</span>
          </div>
        )}

        {/* Section 1: AI Assistant Persona & Tone */}
        <div className="border border-border-default radius-lg bg-bg-layer-1 p-space-6 space-y-space-5">
          <div className="flex items-center gap-space-3 border-b border-border-subtle pb-space-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-title-md font-bold text-foreground">AI Receptionist Persona</h2>
              <p className="text-body-sm text-muted-foreground mt-space-0.5">
                Configure your AI assistant&apos;s name and speaking tone across voice and chat.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-4">
            <div className="space-y-space-2">
              <Label htmlFor="assistant-name" className="text-body-sm font-semibold text-foreground">
                Assistant Name
              </Label>
              <Input
                id="assistant-name"
                type="text"
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
                placeholder="e.g. Ava, Alex, Rachel"
                className="h-10 bg-bg-layer-2"
              />
              <p className="text-caption text-muted-foreground">
                The name your AI receptionist uses to introduce themselves to customers.
              </p>
            </div>

            <div className="space-y-space-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tone-select" className="text-body-sm font-semibold text-foreground">
                  Tone of Voice
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleToneAudio}
                  className="h-7 px-space-2 text-caption gap-space-1 font-medium border-[hsl(var(--foreground)/0.1)] hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer"
                >
                  {isPlayingTonePreview ? (
                    <>
                      <Square className="h-3 w-3 fill-current text-rose-500" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 fill-current text-primary" />
                      <span>Listen Tone</span>
                    </>
                  )}
                </Button>
              </div>
              <Select value={tone} onValueChange={handleToneChange}>
                <SelectTrigger id="tone-select" className="h-10 bg-bg-layer-2">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="font-medium">{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-caption text-muted-foreground">
                {selectedToneObj.description}
              </p>

              {/* Step 4: Before & After Sample Reply for Selected Tone */}
              <div className="mt-3 p-3.5 rounded-xl bg-background/80 border border-border/70 space-y-2">
                <div className="flex items-center justify-between text-caption font-semibold text-muted-foreground">
                  <span>Customer question:</span>
                  <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Tone Preview</span>
                </div>
                <p className="text-caption text-foreground/80 italic bg-muted/40 p-2 rounded-lg border border-border/40">
                  "{(TONE_SAMPLES[tone] || TONE_SAMPLES.warm).q}"
                </p>
                <div className="text-caption font-semibold text-muted-foreground pt-0.5">
                  <span>{assistantName || "Ava"} answers:</span>
                </div>
                <p className="text-caption text-foreground leading-relaxed bg-primary/10 border border-primary/20 p-2.5 rounded-lg font-medium">
                  "{(TONE_SAMPLES[tone] || TONE_SAMPLES.warm).a}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Business Description & Specialty */}
        <div className="border border-border-default radius-lg bg-bg-layer-1 p-space-6 space-y-space-5">
          <div className="flex items-center gap-space-3 border-b border-border-subtle pb-space-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-title-md font-bold text-foreground">Business Description & Core Role</h2>
              <p className="text-body-sm text-muted-foreground mt-space-0.5">
                Explain what your business does so the AI knows your specialty and offerings.
              </p>
            </div>
          </div>

          <div className="space-y-space-2">
            <Label htmlFor="business-description" className="text-body-sm font-semibold text-foreground">
              What does your business do?
            </Label>
            <NativeTextarea
              id="business-description"
              rows={4}
              placeholder="e.g. Operator Demo Salon is a premier full-service salon and restorative spa offering expert haircutting, blowout styling, coloring, and restorative facials."
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              className="w-full text-body-sm p-space-3.5 radius-lg border border-border-default bg-bg-layer-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground transition-all duration-200 resize-y"
            />
            <p className="text-caption text-muted-foreground">
              This description is provided directly to the AI to answer general queries about your company.
            </p>
          </div>
        </div>

        {/* Section 3: Custom System Instructions & Guardrails */}
        <div className="border border-border-default radius-lg bg-bg-layer-1 p-space-6 space-y-space-5">
          <div className="flex items-center gap-space-3 border-b border-border-subtle pb-space-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-title-md font-bold text-foreground">Custom Guidelines & Guardrails</h2>
              <p className="text-body-sm text-muted-foreground mt-space-0.5">
                Inject custom rules, dos and don&apos;ts, and escalation policies for Operator AI.
              </p>
            </div>
          </div>

          <div className="space-y-space-2">
            <Label htmlFor="custom-instructions" className="text-body-sm font-semibold text-foreground">
              Custom Rules & System Instructions
            </Label>
            <NativeTextarea
              id="custom-instructions"
              rows={6}
              placeholder={`Example:
- Always greet returning customers warmly by asking if they would like to rebook their favorite stylist.
- Under NO circumstances suggest that appointments can be made outside our working hours.
- If clients ask about cancellations, inform them we have a 24-hour advance notice policy.`}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="w-full text-body-sm p-space-3.5 radius-lg border border-border-default bg-bg-layer-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground transition-all duration-200 resize-y"
            />
            <p className="text-caption text-muted-foreground">
              These guidelines take priority over generic AI responses and enforce specific operational policies.
            </p>
          </div>

          <div className="p-space-4 radius-lg bg-[hsl(var(--foreground)/0.03)] border border-border-subtle flex gap-space-3 items-start">
            <Info className="h-4.5 w-4.5 text-primary-500 shrink-0 mt-space-0.5" />
            <div className="text-caption text-muted-foreground space-y-space-1">
              <span className="font-semibold text-foreground block">Real-time Prompt Compilation:</span>
              <p>
                Operator AI combines your Assistant Name, Tone Profile, Business Description, Operating Hours, Services Catalog, and Custom Guidelines into a compiled system prompt displayed on the right.
              </p>
            </div>
          </div>

          <div className="pt-space-4 border-t border-border-subtle flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-space-2 h-11 px-space-6 font-semibold shadow-sm cursor-pointer"
            >
              {isSaving ? (
                <>Saving Changes...</>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save AI Configuration
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Live Preview Column (5 Columns) */}
      <div className="lg:col-span-5 space-y-space-6">
        <div className="border border-border-default radius-lg bg-bg-layer-1 overflow-hidden flex flex-col h-[calc(100vh-14rem)] sticky top-6">
          <div className="border-b border-border-subtle p-space-5 bg-[hsl(var(--foreground)/0.03)] flex items-center justify-between">
            <div>
              <h2 className="text-body-md font-bold text-foreground">
                {showRawPrompt ? "System Prompt Inspection" : "AI Receptionist Behavior Preview"}
              </h2>
              <p className="text-caption text-muted-foreground mt-space-0.5">
                {showRawPrompt
                  ? "Raw runtime directives passed to the Gemini engine"
                  : "How your AI assistant introduces itself and speaks with callers"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowRawPrompt(!showRawPrompt)}
              className="text-caption font-semibold h-8 gap-1.5 shrink-0"
            >
              {showRawPrompt ? (
                <>
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span>Client View</span>
                </>
              ) : (
                <>
                  <Code className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Inspect Code</span>
                </>
              )}
            </Button>
          </div>

          {showRawPrompt ? (
            <ScrollArea
              className="p-space-5 flex-1 font-mono text-xs text-muted-foreground bg-[hsl(var(--foreground)/0.04)] text-[hsl(var(--foreground)/0.8)] whitespace-pre-wrap leading-relaxed select-all"
              horizontal={false}
            >
              <span className="text-neutral-500 block mb-space-3">
                {"// --- COMPILED SYSTEM PROMPT STARTS ---"}
              </span>

              <span className="text-primary font-bold block mb-space-1">
                {`You are "${assistantName || "Ava"}", the official AI receptionist and front desk assistant for "${orgName}" (powered by Operator AI).`}
              </span>
              <span className="text-muted-foreground block mb-space-3">
                {`Your identity in conversation is "${assistantName || "Ava"}" representing "${orgName}". Always represent "${orgName}".`}
              </span>

              <span className="text-neutral-400 font-bold block mb-space-1">
                {`TONE OF VOICE & CONVERSATION STYLE:`}
              </span>
              <span className="text-amber-500/90 font-medium block mb-space-3">
                {`Tone Profile: ${tone.toUpperCase()}\nStyle Guidelines: ${selectedToneObj.description}`}
              </span>

              <span className="text-neutral-400 font-bold block mb-space-1">
                {`Business Description:`}
              </span>
              <span className="text-foreground/80 block mb-space-3">
                {businessDescription.trim() || `${orgName} - Professional Front Desk & Automated Receptionist`}
              </span>

              {previewPrompt}

              {promptText && (
                <>
                  {"\n\n"}
                  <span className="text-emerald-500 font-bold block mb-space-1">
                    {"CUSTOM BEHAVIOR GUIDELINES (Active):"}
                  </span>
                  <span className="text-emerald-400 block whitespace-pre-wrap">{promptText}</span>
                </>
              )}

              <span className="text-neutral-500 block mt-space-6">
                {"// --- COMPILED SYSTEM PROMPT ENDS ---"}
              </span>
            </ScrollArea>
          ) : (
            <div className="p-space-5 flex-1 overflow-y-auto space-y-4 [scrollbar-width:thin]">
              {/* Persona Identity Card */}
              <div className="p-4 rounded-xl bg-card border border-border/80 flex items-center gap-3.5 shadow-xs">
                <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {assistantName ? assistantName[0].toUpperCase() : "A"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-body-md font-bold text-foreground">
                      {assistantName || "Ava"}
                    </h3>
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Front Desk AI
                    </span>
                  </div>
                  <p className="text-caption text-muted-foreground mt-0.5">
                    Official voice & messaging assistant for <strong className="text-foreground font-semibold">{orgName}</strong>
                  </p>
                </div>
              </div>

              {/* Speaking Tone */}
              <div className="p-4 rounded-xl bg-card border border-border/80 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-caption font-bold text-muted-foreground uppercase tracking-wider">
                    Speaking Tone
                  </span>
                  <span className="text-caption font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {selectedToneObj.label}
                  </span>
                </div>
                <p className="text-body-sm text-foreground/85 leading-relaxed">
                  {selectedToneObj.description}
                </p>
              </div>

              {/* What the AI Knows About Your Business */}
              <div className="p-4 rounded-xl bg-card border border-border/80 space-y-2 shadow-xs">
                <span className="text-caption font-bold text-muted-foreground uppercase tracking-wider">
                  Company Focus & Specialty
                </span>
                <p className="text-body-sm text-foreground/85 leading-relaxed">
                  {businessDescription.trim() || `${orgName} delivers exceptional service with automated front-desk scheduling and inquiries support.`}
                </p>
              </div>

              {/* Active Custom Rules */}
              <div className="p-4 rounded-xl bg-card border border-border/80 space-y-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-caption font-bold text-muted-foreground uppercase tracking-wider">
                    Active Business Rules
                  </span>
                </div>
                {promptText.trim() ? (
                  <div className="space-y-1.5 pt-1">
                    {promptText.split("\n").filter(Boolean).map((line, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-body-sm text-foreground/80">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{line.replace(/^[-*•]\s*/, "")}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-caption text-muted-foreground/70 italic">
                    Standard booking guidelines and business hours protection active.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
