"use client";

import { useState, useTransition } from "react";
import { saveEscalationRulesAction } from "@/server/actions/settings";
import { Button } from "@/components/shared/button";
import { NativeTextarea } from "@/components/shared/native";
import { Input } from "@/components/shared/input";
import { ShieldAlert, Save, Info, AlertCircle, CheckCircle, Mail, Phone } from "lucide-react";
import { cn } from "@/components/shared/utils";

interface RulesSettingsClientProps {
  initialRules: {
    triggerOnRequest: boolean;
    triggerOnEmergency: boolean;
    triggerOnRepeatedFailure: boolean;
    customTriggers: string;
    alertEmail: string;
    alertPhone: string;
    alertChannel: string;
  };
}

export function RulesSettingsClient({ initialRules }: RulesSettingsClientProps) {
  const [rules, setRules] = useState(initialRules);
  const [isSaving, startSave] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = () => {
    setStatus(null);
    startSave(async () => {
      const res = await saveEscalationRulesAction(rules);
      if (res.success) {
        setStatus({ type: "success", text: "Human handoff escalation rules saved successfully." });
      } else {
        setStatus({ type: "error", text: res.error || "Failed to save escalation rules." });
      }
    });
  };

  const toggleTrigger = (key: "triggerOnRequest" | "triggerOnEmergency" | "triggerOnRepeatedFailure") => {
    setRules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-6 items-start">
      {/* Configuration Form (7 Columns) */}
      <div className="lg:col-span-7 space-y-space-6">
        {status && (
          <div
            className={cn(
              "p-space-4 radius-lg border text-body-sm flex items-start gap-space-2.5 animate-fade-in",
              status.type === "success"
                ? "bg-[hsl(var(--state-success-bg))] border-[hsl(var(--state-success-border))] text-[hsl(var(--state-success-text))]"
                : "bg-[hsl(var(--state-error-bg))] border-[hsl(var(--state-error-border))] text-[hsl(var(--state-error-text))]"
            )}
          >
            {status.type === "success" ? (
              <CheckCircle className="h-5 w-5 shrink-0 mt-space-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 mt-space-0.5" />
            )}
            <span>{status.text}</span>
          </div>
        )}

        {/* Triggers Card */}
        <div className="border border-border-default radius-lg bg-bg-layer-1 p-space-6 space-y-space-5">
          <div>
            <h2 className="text-title-md font-bold text-foreground">Handoff Triggers</h2>
            <p className="text-body-sm text-muted-foreground mt-space-1">
              Select what events should force the AI to halt conversation and request human triage.
            </p>
          </div>

          <div className="space-y-space-4">
            {/* Toggle 1 */}
            <div
              className="flex items-start justify-between p-space-4 radius-lg border border-border-subtle bg-bg-layer-2 hover:border-border-default transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              onClick={() => toggleTrigger("triggerOnRequest")}
              tabIndex={0}
              role="checkbox"
              aria-checked={rules.triggerOnRequest}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleTrigger("triggerOnRequest");
                }
              }}
            >
              <div className="space-y-space-1 flex-1 pr-space-4">
                <span className="text-body-sm font-bold text-foreground block">Customer Requests Human</span>
                <span className="text-caption text-muted-foreground leading-snug">
                  Triggers if user asks to "speak with a manager", "talk to receptionist", or "escalate to agent".
                </span>
              </div>
              <div
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out mt-space-1 pointer-events-none",
                  rules.triggerOnRequest ? "bg-primary" : "bg-[hsl(var(--foreground)/0.12)]"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    rules.triggerOnRequest ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </div>
            </div>

            {/* Toggle 2 */}
            <div
              className="flex items-start justify-between p-space-4 radius-lg border border-border-subtle bg-bg-layer-2 hover:border-border-default transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              onClick={() => toggleTrigger("triggerOnEmergency")}
              tabIndex={0}
              role="checkbox"
              aria-checked={rules.triggerOnEmergency}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleTrigger("triggerOnEmergency");
                }
              }}
            >
              <div className="space-y-space-1 flex-1 pr-space-4">
                <span className="text-body-sm font-bold text-foreground block">Urgent/Emergency Pain Reported</span>
                <span className="text-caption text-muted-foreground leading-snug">
                  AI scans for health complaints, intense swelling, toothaches, or dental emergencies.
                </span>
              </div>
              <div
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out mt-space-1 pointer-events-none",
                  rules.triggerOnEmergency ? "bg-primary" : "bg-[hsl(var(--foreground)/0.12)]"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    rules.triggerOnEmergency ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </div>
            </div>

            {/* Toggle 3 */}
            <div
              className="flex items-start justify-between p-space-4 radius-lg border border-border-subtle bg-bg-layer-2 hover:border-border-default transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              onClick={() => toggleTrigger("triggerOnRepeatedFailure")}
              tabIndex={0}
              role="checkbox"
              aria-checked={rules.triggerOnRepeatedFailure}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleTrigger("triggerOnRepeatedFailure");
                }
              }}
            >
              <div className="space-y-space-1 flex-1 pr-space-4">
                <span className="text-body-sm font-bold text-foreground block">Repeated Failure Handoff</span>
                <span className="text-caption text-muted-foreground leading-snug">
                  Handoff occurs automatically if AI fails to parse the customer's intent 3 times in a row.
                </span>
              </div>
              <div
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out mt-space-1 pointer-events-none",
                  rules.triggerOnRepeatedFailure ? "bg-primary" : "bg-[hsl(var(--foreground)/0.12)]"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    rules.triggerOnRepeatedFailure ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </div>
            </div>

            {/* Custom keywords/triggers */}
            <div className="space-y-space-2">
              <label htmlFor="custom-triggers" className="text-body-sm font-bold text-foreground block">
                Custom Trigger Words & Conditions
              </label>
              <NativeTextarea
                id="custom-triggers"
                rows={4}
                placeholder="Example:
- Keyword 'complaint' or 'refund'
- Any mention of insurance authorization problems"
                value={rules.customTriggers}
                onChange={(e) => setRules((prev) => ({ ...prev, customTriggers: e.target.value }))}
                className="w-full text-body-sm min-h-60 p-space-4 radius-lg border border-border-default bg-bg-layer-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground transition-all duration-200 resize-y"
              />
              <p className="text-caption text-muted-foreground leading-snug">
                Define specific words or conditions that should instantly trigger human triage.
              </p>
            </div>
          </div>
        </div>

        {/* Notifications Handoff Configuration */}
        <div className="border border-border-default radius-lg bg-bg-layer-1 p-space-6 space-y-space-5">
          <div>
            <h2 className="text-title-md font-bold text-foreground">Notification Channels</h2>
            <p className="text-body-sm text-muted-foreground mt-space-1">
              Select how your office staff should be notified when an escalation request occurs.
            </p>
          </div>

          <div className="space-y-space-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-4">
              <div className="space-y-space-1.5">
                <label htmlFor="alert-email" className="text-body-sm font-bold text-foreground block">
                  Staff Alert Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-space-3 top-space-2.5 h-4.5 w-4.5 text-muted-foreground/60" />
                  <Input
                    id="alert-email"
                    type="email"
                    placeholder="office@glowgrace.com"
                    value={rules.alertEmail}
                    onChange={(e) => setRules((prev) => ({ ...prev, alertEmail: e.target.value }))}
                    className="pl-space-10 bg-bg-layer-2 border-border-default focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-space-1.5">
                <label htmlFor="alert-phone" className="text-body-sm font-bold text-foreground block">
                  Staff Alert Phone (SMS)
                </label>
                <div className="relative">
                  <Phone className="absolute left-space-3 top-space-2.5 h-4.5 w-4.5 text-muted-foreground/60" />
                  <Input
                    id="alert-phone"
                    type="tel"
                    placeholder="+1 (555) 019-2834"
                    value={rules.alertPhone}
                    onChange={(e) => setRules((prev) => ({ ...prev, alertPhone: e.target.value }))}
                    className="pl-space-10 bg-bg-layer-2 border-border-default focus-visible:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            <div className="pt-space-4 border-t border-border-subtle flex justify-end">
              <Button onClick={handleSave} disabled={isSaving} className="gap-space-2 h-10 px-space-4 font-semibold">
                {isSaving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Rules
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Triage Guardrails Guide (5 Columns) */}
      <div className="lg:col-span-5 space-y-space-6">
        <div className="border border-border-default radius-lg bg-bg-layer-1 p-space-6 space-y-space-5">
          <div className="flex items-center gap-space-3 text-primary-500">
            <ShieldAlert className="h-6 w-6" />
            <h2 className="text-body-md font-bold text-foreground">Triage Protocol Guide</h2>
          </div>

          <div className="space-y-space-4 text-body-sm text-muted-foreground leading-relaxed">
            <p>
              When a conversation matches any of these configured triggers, Operator AI executes the following protocol:
            </p>

            <ul className="space-y-space-3 list-decimal list-inside text-caption">
              <li>
                <strong className="text-foreground">Pauses Automated AI Answering:</strong> Operator AI pauses automated replies to prevent conflicting messages.
              </li>
              <li>
                <strong className="text-foreground">Dispatches Notifications:</strong> Dispatches alerts immediately to the staff alert channels configured.
              </li>
              <li>
                <strong className="text-foreground">Appears in Triage Queue:</strong> The conversation is placed directly into the <strong className="text-primary">Triage Tickets Queue</strong> for review.
              </li>
            </ul>

            <div className="p-space-4 radius-lg bg-[hsl(var(--foreground)/0.03)] border border-border-subtle flex gap-space-3 items-start">
              <Info className="h-4.5 w-4.5 text-primary-500 shrink-0 mt-space-0.5" />
              <p className="text-caption leading-normal">
                To return the chatbot receptionist to active duty, staff must mark the escalation ticket as **Resolved** from the escalations triage screen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
