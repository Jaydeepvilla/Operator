"use client";

import { useState, useTransition } from "react";
import { saveBookingPreferencesAction } from "@/server/actions/settings";
import { saveBookingRulesAction } from "@/server/actions/calendar";
import { Button } from "@/components/shared/button";
import { NativeTextarea } from "@/components/shared/native";
import { Input } from "@/components/shared/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/select";
import { CalendarDays, Save, Info, AlertCircle, CheckCircle, CreditCard, DollarSign } from "lucide-react";
import { cn } from "@/components/shared/utils";

interface BookingSettingsClientProps {
  initialPreferences: {
    slotIntervalMinutes: number;
    bufferMinutes: number;
    autoApprove: boolean;
    depositEnabled: boolean;
    depositAmount: number;
    depositType: string;
    cancellationPolicyText: string;
  };
  initialRules: {
    minLeadTime: number;
    maxLookahead: number;
    defaultBufferBefore: number;
    defaultBufferAfter: number;
    allowRescheduling: boolean;
    allowCancellation: boolean;
    cancellationLeadTime: number;
  };
}

export function BookingSettingsClient({
  initialPreferences,
  initialRules,
}: BookingSettingsClientProps) {
  const [prefs, setPrefs] = useState(initialPreferences);
  const [rules, setRules] = useState(initialRules);
  const [isSaving, startSave] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = () => {
    setStatus(null);
    startSave(async () => {
      const [prefsRes, rulesRes] = await Promise.all([
        saveBookingPreferencesAction(prefs),
        saveBookingRulesAction(rules),
      ]);

      if (prefsRes.success && rulesRes.success) {
        setStatus({ type: "success", text: "Booking and cancellation policies saved successfully." });
      } else {
        setStatus({
          type: "error",
          text: (!prefsRes.success ? prefsRes.error : rulesRes.error) || "Failed to save policies.",
        });
      }
    });
  };

  const togglePref = (key: "autoApprove" | "depositEnabled") => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleRule = (key: "allowRescheduling" | "allowCancellation") => {
    setRules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-6 items-start">
      {/* Configuration Column (7 Columns) */}
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

        {/* Reschedule & Cancellation Policy Card */}
        <div className="border border-border-default radius-lg bg-bg-layer-1 p-space-6 space-y-space-5">
          <div>
            <h2 className="text-title-md font-bold text-foreground">Cancellation & Rescheduling Policies</h2>
            <p className="text-body-sm text-muted-foreground mt-space-1">
              Configure cutoff times and rules for appointment modifications.
            </p>
          </div>

          <div className="space-y-space-4">
            {/* Toggle: Allow cancellation */}
            <div
              className="flex items-start justify-between p-space-4 radius-lg border border-border-subtle bg-bg-layer-2 hover:border-border-default transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              onClick={() => toggleRule("allowCancellation")}
              tabIndex={0}
              role="checkbox"
              aria-checked={rules.allowCancellation}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleRule("allowCancellation");
                }
              }}
            >
              <div className="space-y-space-1 flex-1 pr-space-4">
                <span className="text-body-sm font-bold text-foreground block">Allow Cancellations</span>
                <span className="text-caption text-muted-foreground leading-snug">
                  Let customers cancel booked slots online or via Operator AI.
                </span>
              </div>
              <div
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out mt-space-1 pointer-events-none",
                  rules.allowCancellation ? "bg-primary" : "bg-[hsl(var(--foreground)/0.12)]"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    rules.allowCancellation ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </div>
            </div>

            {/* Input: Cancellation Lead Time */}
            {rules.allowCancellation && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-4 pl-space-4 border-l border-primary/20 animate-fade-in">
                <div className="space-y-space-1.5">
                  <label htmlFor="cancel-lead-time" className="text-body-sm font-bold text-foreground block">
                    Cancellation Lead Time (Hours)
                  </label>
                  <Input
                    id="cancel-lead-time"
                    type="number"
                    min={1}
                    value={rules.cancellationLeadTime}
                    onChange={(e) => setRules((prev) => ({ ...prev, cancellationLeadTime: parseInt(e.target.value) || 24 }))}
                    className="bg-bg-layer-2 border-border-default focus-visible:ring-primary/20"
                  />
                  <p className="text-caption text-muted-foreground leading-snug">
                    Minimum hours before the slot to allow penalty-free cancellations.
                  </p>
                </div>
              </div>
            )}

            {/* Toggle: Allow rescheduling */}
            <div
              className="flex items-start justify-between p-space-4 radius-lg border border-border-subtle bg-bg-layer-2 hover:border-border-default transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              onClick={() => toggleRule("allowRescheduling")}
              tabIndex={0}
              role="checkbox"
              aria-checked={rules.allowRescheduling}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleRule("allowRescheduling");
                }
              }}
            >
              <div className="space-y-space-1 flex-1 pr-space-4">
                <span className="text-body-sm font-bold text-foreground block">Allow Rescheduling</span>
                <span className="text-caption text-muted-foreground leading-snug">
                  Let customers reschedule slots instead of cancelling.
                </span>
              </div>
              <div
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out mt-space-1 pointer-events-none",
                  rules.allowRescheduling ? "bg-primary" : "bg-[hsl(var(--foreground)/0.12)]"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    rules.allowRescheduling ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </div>
            </div>

            {/* Custom policy text area */}
            <div className="space-y-space-2">
              <label htmlFor="policy-text" className="text-body-sm font-bold text-foreground block">
                Cancellation Policy Rules Text
              </label>
              <NativeTextarea
                id="policy-text"
                rows={4}
                placeholder="Example: Cancellations must be made at least 24 hours in advance. Late cancellations will be subject to a 50% reservation fee."
                value={prefs.cancellationPolicyText}
                onChange={(e) => setPrefs((prev) => ({ ...prev, cancellationPolicyText: e.target.value }))}
                className="w-full text-body-sm min-h-60 p-space-4 radius-lg border border-border-default bg-bg-layer-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground transition-all duration-200 resize-y"
              />
              <p className="text-caption text-muted-foreground leading-snug">
                This policy text is compiled directly into Operator AI's active references.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Column (5 Columns) */}
      <div className="lg:col-span-5 space-y-space-6">
        <div className="border border-border-default radius-lg bg-bg-layer-1 p-space-6 space-y-space-5">
          <div className="flex items-center gap-space-3 text-primary-500">
            <CalendarDays className="h-6 w-6" />
            <h2 className="text-body-md font-bold text-foreground">Policies Guide</h2>
          </div>

          <div className="space-y-space-4 text-body-sm text-muted-foreground leading-relaxed">
            <p>
              Defining cancellation and rescheduling limits protects your calendar availability and reduces lost time:
            </p>

            <ul className="space-y-space-3 list-disc list-inside text-caption">
              <li>
                <strong className="text-foreground">Penalty-free limits:</strong> Cutoff hours restrict when a customer can self-serve cancellations.
              </li>
              <li>
                <strong className="text-foreground">Deposits threshold:</strong> Enable deposits to reduce high-value slot cancellations.
              </li>
              <li>
                <strong className="text-foreground">Stripe Integration:</strong> Deposit parameters map directly to your connected checkout links.
              </li>
            </ul>

            <div className="p-space-4 radius-lg bg-[hsl(var(--foreground)/0.03)] border border-border-subtle flex gap-space-3 items-start">
              <Info className="h-4.5 w-4.5 text-primary-500 shrink-0 mt-space-0.5" />
              <p className="text-caption leading-normal">
                Make sure your Stripe integration is active before requiring deposits on premium services.
              </p>
            </div>
          </div>
        </div>

        {/* Deposit Policy Configuration Card */}
        <div className="border border-border-default radius-lg bg-bg-layer-1 p-space-6 space-y-space-5">
          <div className="flex items-center justify-between border-b border-border-subtle pb-space-4">
            <div>
              <h2 className="text-title-md font-bold text-foreground">Service Deposits & Payments</h2>
              <p className="text-body-sm text-muted-foreground mt-space-1">
                Secure appointments by requiring a partial or full payment deposit up front.
              </p>
            </div>
            <CreditCard className="h-5 w-5 text-primary-500 shrink-0" />
          </div>

          <div className="space-y-space-4">
            {/* Toggle: Enable Deposits */}
            <div
              className="flex items-start justify-between p-space-4 radius-lg border border-border-subtle bg-bg-layer-2 hover:border-border-default transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              onClick={() => togglePref("depositEnabled")}
              tabIndex={0}
              role="checkbox"
              aria-checked={prefs.depositEnabled}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  togglePref("depositEnabled");
                }
              }}
            >
              <div className="space-y-space-1 flex-1 pr-space-4">
                <span className="text-body-sm font-bold text-foreground block">Require Deposits</span>
                <span className="text-caption text-muted-foreground leading-snug">
                  Require customers to provide card details and pay deposits before slots are confirmed.
                </span>
              </div>
              <div
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out mt-space-1 pointer-events-none",
                  prefs.depositEnabled ? "bg-primary" : "bg-[hsl(var(--foreground)/0.12)]"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    prefs.depositEnabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </div>
            </div>

            {/* Inputs: Deposit Value / Type */}
            {prefs.depositEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-4 pl-space-4 border-l border-primary/20 animate-fade-in">
                <div className="space-y-space-1.5">
                  <label htmlFor="deposit-type" className="text-body-sm font-bold text-foreground block">
                    Deposit Value Type
                  </label>
                  <Select
                    value={prefs.depositType}
                    onValueChange={(val) => setPrefs((prev) => ({ ...prev, depositType: val }))}
                  >
                    <SelectTrigger id="deposit-type" className="bg-bg-layer-2 border-border-default">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-space-1.5">
                  <label htmlFor="deposit-value" className="text-body-sm font-bold text-foreground block">
                    {prefs.depositType === "percentage" ? "Deposit Percentage" : "Deposit Amount ($)"}
                  </label>
                  <div className="relative">
                    {prefs.depositType !== "percentage" && (
                      <DollarSign className="absolute left-space-3 top-space-2.5 h-4 w-4 text-muted-foreground/60" />
                    )}
                    <Input
                      id="deposit-value"
                      type="number"
                      min={1}
                      value={prefs.depositAmount}
                      onChange={(e) => setPrefs((prev) => ({ ...prev, depositAmount: parseFloat(e.target.value) || 0 }))}
                      className={cn(
                        "bg-bg-layer-2 border-border-default focus-visible:ring-primary/20",
                        prefs.depositType !== "percentage" && "pl-space-9"
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-space-4 border-t border-border-subtle flex justify-end">
              <Button onClick={handleSave} disabled={isSaving} className="gap-space-2 h-10 px-space-4 font-semibold">
                {isSaving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Policies
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
