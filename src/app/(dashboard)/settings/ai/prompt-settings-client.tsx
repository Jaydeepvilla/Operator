"use client";

import { useState, useTransition } from "react";
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
import { Sparkles, Save, Info, AlertCircle, Bot, MessageSquare, Building2, ShieldAlert } from "lucide-react";
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
  const [tone, setTone] = useState(initialTone || "professional");
  const [businessDescription, setBusinessDescription] = useState(initialBusinessDescription || "");
  const [promptText, setPromptText] = useState(initialPromptText || "");
  const [isSaving, startSave] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
              <Label htmlFor="tone-select" className="text-body-sm font-semibold text-foreground">
                Tone of Voice
              </Label>
              <Select value={tone} onValueChange={(val) => setTone(val)}>
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
              placeholder="e.g. Nexxtechnologies is an IT solutions and software agency specializing in digital transformation, 24/7 enterprise support, and AI automation. We serve clients across healthcare, retail, and finance."
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
- Always greet returning customers by asking if they would like to reschedule their previous type of appointment.
- Under NO circumstances suggest that we are open on Sundays.
- If they ask for general consultations, remind them that booking fees are fully refundable up to 24 hours prior.`}
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
              className="gap-space-2 h-11 px-space-6 font-semibold shadow-sm"
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
              <h2 className="text-body-md font-bold text-foreground">Live Prompt Compiler</h2>
              <p className="text-caption text-muted-foreground mt-space-0.5">
                Real-time preview of instructions passed to Gemini AI
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-primary-500 shrink-0" />
          </div>

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

            {/* Base prompt details from server */}
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
        </div>
      </div>
    </div>
  );
}
