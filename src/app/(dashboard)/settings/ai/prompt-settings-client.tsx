"use client";

import { useState, useTransition } from "react";
import { saveVoicePromptAction } from "@/server/actions/voice";
import { Button } from "@/components/shared/button";
import { NativeTextarea } from "@/components/shared/native";
import { Sparkles, Save, Info, AlertCircle, Eye, Edit2 } from "lucide-react";
import { cn } from "@/components/shared/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PromptSettingsClientProps {
 initialPromptText: string;
 previewPrompt: string;
 businessDescription: string;
 orgName: string;
}

export function PromptSettingsClient({
 initialPromptText,
 previewPrompt,
 businessDescription,
 orgName,
}: PromptSettingsClientProps) {
 const [promptText, setPromptText] = useState(initialPromptText);
 const [isSaving, startSave] = useTransition();
 const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
 const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

 const handleSave = () => {
 setStatus(null);
 startSave(async () => {
 const res = await saveVoicePromptAction(promptText);
 if (res.success) {
 setStatus({ type: "success", text: "AI prompt guidelines saved and activated successfully." });
 } else {
 setStatus({ type: "error", text: res.error || "Failed to save AI prompt guidelines." });
 }
 });
 };

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

 <div className="border border-border-default radius-lg bg-bg-layer-1 p-space-6 space-y-space-5">
 <div className="flex items-center justify-between border-b border-border-subtle pb-space-4">
 <div>
 <h2 className="text-title-md font-bold text-foreground">Custom Guidelines & Rules</h2>
 <p className="text-body-sm text-muted-foreground mt-space-1">
 Inject custom guardrails, instructions, and behavior rules into Operator AI's prompt.
 </p>
 </div>
 </div>

 <div className="space-y-space-4">
 <div className="space-y-space-2">
 <label htmlFor="custom-instructions" className="text-body-sm font-bold text-foreground block">
 Custom System Instructions
 </label>
 <NativeTextarea
 id="custom-instructions"
 rows={10}
 placeholder={`Example:
- Always greet returning customers by asking if they would like to reschedule their previous type of appointment.
- Under NO circumstances suggest that we are open on Sundays.
- If they ask for general consultations, remind them that booking fees are fully refundable up to 24 hours prior.`}
 value={promptText}
 onChange={(e) => setPromptText(e.target.value)}
 className="w-full text-body-sm min-h-60 p-space-4 radius-lg border border-border-default bg-bg-layer-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground transition-all duration-200 resize-y"
 />
 <p className="text-caption text-muted-foreground leading-snug">
 These rules are appended to the Dynamically Compiled System Prompt and have priority over generic rules.
 </p>
 </div>

 <div className="p-space-4 radius-lg bg-[hsl(var(--foreground)/0.03)] border border-border-subtle flex gap-space-3 items-start">
 <Info className="h-4.5 w-4.5 text-primary-500 shrink-0 mt-space-0.5" />
 <div className="text-caption text-muted-foreground space-y-space-1">
 <span className="font-semibold text-foreground block">How the Operator AI prompt works:</span>
 <p>
 We compile your Operator AI prompt using active parameters: your business description, operating hours, active lead flows, services list, and custom guidelines configured here.
 </p>
 </div>
 </div>

 <div className="pt-space-4 border-t border-border-subtle flex justify-end">
 <Button onClick={handleSave} disabled={isSaving} className="gap-space-2 h-10 px-space-4 font-semibold">
 {isSaving ? (
 <>Saving...</>
 ) : (
 <>
 <Save className="h-4 w-4" /> Save Guidelines
 </>
 )}
 </Button>
 </div>
 </div>
 </div>
 </div>

 {/* Live Preview Column (5 Columns) */}
 <div className="lg:col-span-5 space-y-space-6">
 <div className="border border-border-default radius-lg bg-bg-layer-1 overflow-hidden flex flex-col h-[calc(100vh-16rem)]">
 <div className="border-b border-border-subtle p-space-5 bg-[hsl(var(--foreground)/0.03)] flex items-center justify-between">
 <div>
 <h2 className="text-body-md font-bold text-foreground">Prompt Compiler</h2>
 <p className="text-caption text-muted-foreground mt-space-0.5">Live view of the compiled instructions</p>
 </div>
 <Sparkles className="h-5 w-5 text-primary-500 shrink-0" />
 </div>

 <ScrollArea className="p-space-5 flex-1 font-mono text-xs text-muted-foreground bg-[hsl(var(--foreground)/0.05)] text-[hsl(var(--foreground)/0.8)] whitespace-pre-wrap leading-relaxed select-all" horizontal={false}>
 {/* Header portion dynamically generated */}
 <span className="text-neutral-500 block mb-space-4">
 {"// --- COMPILED SYSTEM PROMPT STARTS ---"}
 </span>

 {previewPrompt}

 {promptText && (
 <>
 {"\n\n"}
 <span className="text-success-400 font-bold block mb-space-2">
 {"CUSTOM BEHAVIOR GUIDELINES (Active):"}
 </span>
 <span className="text-success-300 block">{promptText}</span>
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
