"use client";import { Badge } from "@/components/shared/badge";

import { useState, useTransition } from "react";
import {
  Volume2,
  Settings,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Sliders,
  Clock,
  UserCheck,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  Info,
  ArrowRight,
  Loader2 } from
"lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/shared/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shared/dialog";
import { saveVoiceSettingsAction, createRoutingRuleAction, updateRoutingRuleAction, deleteRoutingRuleAction } from "@/server/actions/voice";
import { cn } from "@/components/shared/utils";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { NativeTextarea, NativeTable } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VoiceSettings {
  voiceName: string;
  speakingSpeed: string;
  greetingMessage: string;
  fallbackNumber: string | null;
  businessHoursMode: "ai-only" | "forward" | "hybrid";
  voicemailActive: boolean;
}

interface RoutingRule {
  id: string;
  ruleName: string;
  triggerType: "business-hours" | "after-hours" | "busy" | "no-answer";
  routingAction: "ai-receptionist" | "staff-dial" | "voicemail" | "queue";
  targetId: string | null;
  isActive: boolean;
  priority: number;
}

export function VoiceSettingsClient({
  initialSettings,
  initialRules



}: {initialSettings: any;initialRules: any[];}) {
  const [settings, setSettings] = useState<VoiceSettings>({
    voiceName: initialSettings?.voiceName || "Rachel",
    speakingSpeed: initialSettings?.speakingSpeed || "1.0",
    greetingMessage: initialSettings?.greetingMessage || "Hello! Thank you for calling. How can I help you today?",
    fallbackNumber: initialSettings?.fallbackNumber || "",
    businessHoursMode: initialSettings?.businessHoursMode || "ai-only",
    voicemailActive: initialSettings?.voicemailActive ?? true
  });

  const [rules, setRules] = useState<RoutingRule[]>(initialRules as RoutingRule[]);
  const [isSavingSettings, startSaveSettings] = useTransition();
  const [isSavingRule, startSaveRule] = useTransition();
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<{type: "success" | "error";text: string;} | null>(null);
  const [confirmDialogId, setConfirmDialogId] = useState<string | null>(null);

  // Rule builder form state
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleTrigger, setNewRuleTrigger] = useState<RoutingRule["triggerType"]>("business-hours");
  const [newRuleAction, setNewRuleAction] = useState<RoutingRule["routingAction"]>("ai-receptionist");
  const [newRuleTarget, setNewRuleTarget] = useState("");
  const [newRulePriority, setNewRulePriority] = useState("0");
  const [ruleDialogError, setRuleDialogError] = useState<string | null>(null);

  const handleSaveSettings = () => {
    setSettingsStatus(null);
    startSaveSettings(async () => {
      const res = await saveVoiceSettingsAction(settings);
      if (res.success) {
        setSettingsStatus({ type: "success", text: "Settings saved successfully." });
      } else {
        setSettingsStatus({ type: "error", text: res.error || "Save failed." });
      }
    });
  };

  const handleCreateRule = () => {
    if (!newRuleName.trim()) {
      setRuleDialogError("Rule name is required.");
      return;
    }
    setRuleDialogError(null);
    startSaveRule(async () => {
      const res = await createRoutingRuleAction({
        ruleName: newRuleName,
        triggerType: newRuleTrigger,
        routingAction: newRuleAction,
        targetId: newRuleTarget || undefined,
        priority: parseInt(newRulePriority, 10) || 0,
        isActive: true
      });

      if (res.success && res.rule) {
        setRules((prev) => [...prev, res.rule as unknown as RoutingRule].sort((a, b) => b.priority - a.priority));
        setNewRuleName("");
        setNewRuleTarget("");
        setNewRulePriority("0");
        setIsRuleDialogOpen(false);
      } else {
        setRuleDialogError(res.error || "Failed to create rule.");
      }
    });
  };

  const handleToggleRule = async (ruleId: string, currentActive: boolean) => {
    setRules((prev) =>
    prev.map((r) => r.id === ruleId ? { ...r, isActive: !currentActive } : r)
    );

    const res = await updateRoutingRuleAction(ruleId, { isActive: !currentActive });
    if (!res.success) {
      setRules((prev) =>
      prev.map((r) => r.id === ruleId ? { ...r, isActive: currentActive } : r)
      );
      alert("Failed to update rule status:" + res.error);
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    setConfirmDialogId(ruleId);
  };

  const handleConfirmDeleteRule = async () => {
    if (!confirmDialogId) return;
    const ruleId = confirmDialogId;
    setConfirmDialogId(null);

    const originalRules = [...rules];
    setRules((prev) => prev.filter((r) => r.id !== ruleId));

    const res = await deleteRoutingRuleAction(ruleId);
    if (!res.success) {
      setRules(originalRules);
      alert("Failed to delete rule: " + res.error);
    }
  };

  return (
    <div className="grid gap-space-4 lg:grid-cols-12 items-start w-full">
 {/* Settings Column */}
 <div className="lg:col-span-5">
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center gap-space-2">
 <Sliders className="h-4 w-4 text-primary" />
 <div>
 <h4 className="text-caption font-semibold text-foreground">AI Voice Settings</h4>
 <p className="text-caption text-muted-foreground mt-space-0.5">Configure default speech profile for the voice conversational interface.</p>
 </div>
 </div>

 <div className="p-space-4 space-y-space-4 bg-[hsl(var(--foreground)/0.002)]">
 <div className="space-y-space-1.5">
 <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Speaking Voice</Label>
 <Select
                value={settings.voiceName}
                onValueChange={(val) => setSettings({ ...settings, voiceName: val })}>
                
 <SelectTrigger className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)]">
 <SelectValue placeholder="Select Speaking Voice" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Rachel">Rachel (Professional Female)</SelectItem>
 <SelectItem value="Drew">Drew (Energetic Male)</SelectItem>
 <SelectItem value="Clyde">Clyde (Medical Specialist Male)</SelectItem>
 <SelectItem value="Bella">Bella (Friendly Female)</SelectItem>
 <SelectItem value="Dom">Dom (Authoritative Male)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-space-1.5">
 <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Speech Speed Rate</Label>
 <Select
                value={settings.speakingSpeed}
                onValueChange={(val) => setSettings({ ...settings, speakingSpeed: val })}>
                
 <SelectTrigger className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)]">
 <SelectValue placeholder="Select Speech Speed" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="0.8">0.8x (Slower)</SelectItem>
 <SelectItem value="0.9">0.9x</SelectItem>
 <SelectItem value="1.0">1.0x (Normal)</SelectItem>
 <SelectItem value="1.1">1.1x</SelectItem>
 <SelectItem value="1.2">1.2x (Faster)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-space-1.5">
 <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Greeting Message</Label>
 <NativeTextarea
                value={settings.greetingMessage}
                onChange={(e) => setSettings({ ...settings, greetingMessage: e.target.value })}
                rows={3}
                placeholder="Hello! Thank you for calling..."
                className="w-full radius-md border border-[hsl(var(--foreground)/0.08)] bg-background p-space-3 text-caption placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground resize-none leading-relaxed" />
              
 </div>

 <div className="space-y-space-1.5">
 <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Fallback Transfer Number</Label>
 <Input
                placeholder="+15550190000"
                value={settings.fallbackNumber || ""}
                onChange={(e) => setSettings({ ...settings, fallbackNumber: e.target.value })}
                className="h-9.5 bg-background text-caption border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20" />
              
 </div>

 <div className="space-y-space-1.5">
 <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Business Hours Mode</Label>
 <Select
                value={settings.businessHoursMode}
                onValueChange={(val: any) => setSettings({ ...settings, businessHoursMode: val })}>
                
 <SelectTrigger className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)]">
 <SelectValue placeholder="Select Business Hours Mode" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="ai-only">Always Operator AI</SelectItem>
 <SelectItem value="forward">Forward Out-of-Hours to Fallback Number</SelectItem>
 <SelectItem value="hybrid">Evaluate Custom Routing Rules First</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="flex items-center justify-between pt-space-2 border-t border-[hsl(var(--foreground)/0.04)]">
 <div className="space-y-space-0.5">
 <Label className="text-caption font-semibold text-foreground">Voicemail Inbox Active</Label>
 <p className="text-caption text-muted-foreground/80">Capture messages if lines are busy</p>
 </div>
 <Button type="button" role="switch" aria-checked={settings.voicemailActive} onClick={() => setSettings({ ...settings, voicemailActive: !settings.voicemailActive })}
              className={cn(
                "relative inline-flex h-5.5 w-9.5 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
                settings.voicemailActive ? "bg-primary" : "bg-[hsl(var(--foreground)/0.12)]"
              )}>
                
 <span
                  className={cn(
                    "pointer-events-none block h-4 w-4 rounded-full bg-background ring-0 transition-transform",
                    settings.voicemailActive ? "translate-x-space-4" : "translate-x-space-0.5"
                  )} />
                
 </Button>
 </div>

 {settingsStatus &&
            <div className={cn(
              "p-space-3 radius-lg flex items-start gap-space-2 text-caption leading-relaxed",
              settingsStatus.type === "success" ?
              "bg-emerald-500/10 text-emerald-600 border border-emerald-500/15" :
              "bg-rose-500/10 text-rose-600 border border-rose-500/15"
            )}>
 {settingsStatus.type === "error" ? <AlertCircle className="h-4 w-4 shrink-0 mt-space-0.5 text-rose-500" /> : <Check className="h-4 w-4 shrink-0 mt-space-0.5 text-emerald-500" />}
 <span>{settingsStatus.text}</span>
 </div>
            }
 </div>

 <div className="p-space-3 border-t border-[hsl(var(--foreground)/0.06)] bg-background flex justify-end shrink-0">
 <Button onClick={handleSaveSettings} disabled={isSavingSettings} size="sm" className="text-caption px-space-4">
 {isSavingSettings ?
              <>
 <Loader2 className="h-3.5 w-3.5 animate-spin mr-space-1" />
 <span>Saving...</span>
 </> :

              <>
 <Sparkles className="h-3.5 w-3.5 mr-space-1.5" />
 <span>Save Settings</span>
 </>
              }
 </Button>
 </div>
 </div>
 </div>

 {/* Rules Column */}
 <div className="lg:col-span-7">
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center justify-between gap-space-3">
 <div>
 <h4 className="text-caption font-semibold text-foreground">Call Routing Rules</h4>
 <p className="text-caption text-muted-foreground mt-space-0.5">Define operational behaviors based on business hours, busy status, or timeouts.</p>
 </div>
 
 <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
 <DialogTrigger asChild>
 <Button size="sm" className="gap-space-1 text-caption px-space-3 text-white hover:text-white">
 <Plus className="h-3.5 w-3.5 text-white" />
 <span className="text-white">Add Rule</span>
 </Button>
 </DialogTrigger>
 <DialogContent className="max-w-md bg-card border-[hsl(var(--foreground)/0.08)] radius-xl">
 <DialogHeader>
 <DialogTitle className="text-body-sm font-semibold text-foreground">Add New Call Routing Rule</DialogTitle>
 <DialogDescription className="text-caption text-muted-foreground mt-space-1 leading-normal">
 Configure triggering parameters and the target connection response.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-space-4 py-space-3 text-caption">
 <div className="space-y-space-1.5">
 <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Rule Name</Label>
 <Input
                      placeholder="e.g. Weekend Redirect"
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20" />
                    
 </div>

 <div className="grid grid-cols-2 gap-space-3">
 <div className="space-y-space-1.5">
 <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Trigger Parameter</Label>
 <Select
                        value={newRuleTrigger}
                        onValueChange={(val: any) => setNewRuleTrigger(val)}>
                        
 <SelectTrigger className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)]">
 <SelectValue placeholder="Select Trigger" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="business-hours">During Business Hours</SelectItem>
 <SelectItem value="after-hours">After Business Hours</SelectItem>
 <SelectItem value="busy">Operator Busy</SelectItem>
 <SelectItem value="no-answer">No Answer / Timeout</SelectItem>
 </SelectContent>
 </Select>
 </div>

  <div className="space-y-space-1.5">
  <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Routing Action</Label>
  <Select
                         value={newRuleAction}
                         onValueChange={(val: any) => setNewRuleAction(val)}>
                         
  <SelectTrigger className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)]">
  <SelectValue placeholder="Select Action" />
  </SelectTrigger>
  <SelectContent>
  <SelectItem value="ai-receptionist">Operator AI Answering</SelectItem>
  <SelectItem value="staff-dial">Forward Staff Number</SelectItem>
  <SelectItem value="voicemail">Voicemail Box</SelectItem>
  <SelectItem value="queue">Call Hold Queue</SelectItem>
  </SelectContent>
  </Select>
  </div>
  </div>

  <div className="grid grid-cols-2 gap-space-3">
  <div className="space-y-space-1.5">
  <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Target Number (Optional)</Label>
  <Input
                         placeholder="e.g. +15550192000"
                         value={newRuleTarget}
                         onChange={(e) => setNewRuleTarget(e.target.value)}
                         className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20" />
                       
  </div>

 <div className="space-y-space-1.5">
 <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Rule Priority</Label>
 <Input
                        type="number"
                        placeholder="10"
                        value={newRulePriority}
                        onChange={(e) => setNewRulePriority(e.target.value)}
                        className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20" />
                      
 </div>
 </div>

 {ruleDialogError &&
                  <div className="p-space-3 bg-rose-500/10 text-rose-600 border border-rose-500/15 text-caption leading-relaxed radius-lg flex items-center gap-space-2">
 <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
 <span>{ruleDialogError}</span>
 </div>
                  }
 </div>

 <DialogFooter className="flex gap-space-2 border-t border-[hsl(var(--foreground)/0.05)] pt-space-3">
 <Button variant="outline" size="sm" onClick={() => setIsRuleDialogOpen(false)} className="h-8.5 text-caption font-semibold">Cancel</Button>
 <Button onClick={handleCreateRule} disabled={isSavingRule} size="sm" className="text-caption px-space-4">
 {isSavingRule ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-space-1" /> : null}
 <span>Create Rule</span>
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>

 <div className="p-space-0 overflow-hidden">
 {rules.length === 0 ?
            <div className="flex flex-col items-center justify-center text-center p-space-8 bg-[hsl(var(--foreground)/0.002)] min-h-64 text-muted-foreground/60 gap-space-1">
 <Clock className="h-8 w-8 text-muted-foreground/30 animate-pulse mb-space-1.5" />
 <span className="text-caption font-semibold text-foreground">No Custom Routing Rules</span>
 <p className="text-caption max-w-60 mx-auto mt-space-0.5 leading-normal">
 No custom routing rules defined. Default voice settings apply.
 </p>
 </div> :

            <ScrollArea className="">
                           <NativeTable className="w-full text-left border-collapse text-caption">
                           <thead>
                           <tr className="border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] text-caption uppercase tracking-widest font-semibold text-muted-foreground/60">
                           <th className="px-space-5 py-space-3">Priority</th>
                           <th className="px-space-5 py-space-3">Rule Name</th>
                           <th className="px-space-5 py-space-3">Trigger</th>
                           <th className="px-space-5 py-space-3">Action</th>
                           <th className="px-space-5 py-space-3">Target</th>
                           <th className="px-space-5 py-space-3">Active</th>
                           <th className="px-space-5 py-space-3 text-right">Delete</th>
                           </tr>
                           </thead>
                           <tbody className="divide-y divide-[hsl(var(--foreground)/0.04)] bg-background/30">
                           {rules.map((rule) =>
                                            <tr key={rule.id} className="hover:bg-[hsl(var(--foreground)/0.015)] transition-colors">
                           <td className="px-space-5 py-space-3 font-mono font-semibold text-primary">{rule.priority}</td>
                           <td className="px-space-5 py-space-3 font-semibold text-foreground">{rule.ruleName}</td>
                           <td className="px-space-5 py-space-3 text-muted-foreground/90 capitalize">{rule.triggerType.replace("-", "")}</td>
                           <td className="px-space-5 py-space-3">
                           <Badge>
                           {rule.routingAction.replace("-", "")}
                           </Badge>
                           </td>
                           <td className="px-space-5 py-space-3 font-mono text-muted-foreground">{rule.targetId || "—"}</td>
                           <td className="px-space-5 py-space-3">
                           <Button onClick={() => handleToggleRule(rule.id, rule.isActive)}
                                                className="focus:outline-none transition-transform active:scale-95 text-primary hover:text-primary/80 cursor-pointer">
                                                  
                           {rule.isActive ?
                                                  <ToggleRight className="h-5.5 w-5.5" /> :

                                                  <ToggleLeft className="h-5.5 w-5.5 text-muted-foreground/45" />
                                                  }
                           </Button>
                           </td>
                           <td className="px-space-5 py-space-3 text-right">
                           <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)}
                                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer h-7 w-7 radius-md">
                                                  
                           <Trash2 className="h-3.5 w-3.5" />
                           </Button>
                           </td>
                           </tr>
                                            )}
                           </tbody>
                           </NativeTable>
                           </ScrollArea>
            }
 </div>
 </div>
 </div>

  <ConfirmDialog
        open={!!confirmDialogId}
        onOpenChange={(open) => !open && setConfirmDialogId(null)}
        title="Delete Routing Rule"
        description="Are you sure you want to delete this routing rule?"
        onConfirm={handleConfirmDeleteRule}
        confirmText="Delete" />
      
  </div>);

}