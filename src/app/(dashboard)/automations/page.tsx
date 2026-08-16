"use client";

import { useState, useEffect } from "react";
import { PageTitle } from "@/components/shared/page-title";
import {
  Save,
  Loader2,
  Check,
  AlertCircle,
  Play,
  Settings,
  Clock,
  UserCheck,
  AlertTriangle,
  Zap,
  RotateCcw,
  Sparkles,
  Plus,
  Trash2,
  Send,
  Mail,
  MessageSquare,
  Globe,
  Bell,
  CheckCircle2,
  XCircle,
  Activity
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/shared/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shared/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/dialog";
import { cn } from "@/components/shared/utils";
import { 
  getCustomAutomationRulesAction, 
  saveCustomAutomationRuleAction, 
  toggleCustomAutomationRuleAction, 
  deleteCustomAutomationRuleAction,
  testCustomAutomationRuleAction 
} from "@/server/actions/automations";

interface RuleItem {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: any;
  conditions: any[];
  actions: any[];
  isActive: boolean;
  executionCount: number;
  lastExecutedAt: Date | null;
  createdAt: Date;
}

interface ExecutionLog {
  id: string;
  ruleId: string;
  triggerEvent: string;
  status: string;
  actionsExecuted: string[];
  errorMessage: string | null;
  executedAt: Date;
}

const TRIGGER_TYPES = [
  { value: "appointment_created", label: "Appointment Booked", icon: Clock },
  { value: "appointment_rescheduled", label: "Appointment Rescheduled", icon: RotateCcw },
  { value: "appointment_cancelled", label: "Appointment Cancelled", icon: AlertCircle },
  { value: "appointment_no_show", label: "Customer No-Show", icon: AlertTriangle },
  { value: "lead_created", label: "New Lead Captured", icon: UserCheck },
  { value: "lead_qualified", label: "Lead Qualified / Scored", icon: Sparkles },
  { value: "call_completed", label: "Voice Call Completed", icon: Activity },
];

const ACTION_TYPES = [
  { value: "send_sms", label: "Send SMS Message", icon: MessageSquare },
  { value: "send_email", label: "Send Email Notification", icon: Mail },
  { value: "send_whatsapp", label: "Send WhatsApp Template", icon: Send },
  { value: "update_lead_status", label: "Update Lead Status", icon: UserCheck },
  { value: "create_notification", label: "Dashboard Team Alert", icon: Bell },
  { value: "webhook_post", label: "HTTP Webhook POST", icon: Globe },
];

export default function AutomationsPage() {
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [executions, setExecutions] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<RuleItem> | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTrigger, setFormTrigger] = useState("appointment_created");
  const [formActionType, setFormActionType] = useState("send_sms");
  const [formActionMessage, setFormActionMessage] = useState("");
  const [formActionSubject, setFormActionSubject] = useState("");
  const [formLeadStatus, setFormLeadStatus] = useState("Hot");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getCustomAutomationRulesAction();
      if (res.success) {
        setRules(res.rules as any);
        setExecutions(res.executions as any);
      }
    } catch (err) {
      console.error("Failed to load automations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (ruleId: string, currentStatus: boolean) => {
    try {
      const nextStatus = !currentStatus;
      setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, isActive: nextStatus } : r)));
      await toggleCustomAutomationRuleAction(ruleId, nextStatus);
    } catch (err) {
      console.error("Failed to toggle rule:", err);
    }
  };

  const handleDelete = async (ruleId: string) => {
    try {
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      await deleteCustomAutomationRuleAction(ruleId);
      setFeedbackMsg({ type: "success", text: "Automation rule deleted successfully." });
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
  };

  const handleTestRule = async (ruleId: string) => {
    try {
      setTestingId(ruleId);
      setFeedbackMsg(null);
      const res = await testCustomAutomationRuleAction(ruleId);
      if (res.success) {
        setFeedbackMsg({
          type: "success",
          text: `Test execution successful! Actions: ${res.results?.[0]?.actionsExecuted?.join(", ") || "Rule verified."}`,
        });
        loadData();
      } else {
        setFeedbackMsg({ type: "error", text: res.error || "Execution failed" });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Test error" });
    } finally {
      setTestingId(null);
    }
  };

  const openCreateDialog = () => {
    setEditingRule(null);
    setFormName("");
    setFormDescription("");
    setFormTrigger("appointment_created");
    setFormActionType("send_sms");
    setFormActionMessage("Hi {{customerName}}, your appointment for {{serviceName}} is confirmed for {{startTime}}!");
    setFormActionSubject("Appointment Confirmation");
    setFormLeadStatus("Booked");
    setDialogOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setSaving(true);
    try {
      let actionConfig: any = {};
      if (formActionType === "send_sms" || formActionType === "send_whatsapp") {
        actionConfig = { message: formActionMessage };
      } else if (formActionType === "send_email") {
        actionConfig = { subject: formActionSubject, body: formActionMessage };
      } else if (formActionType === "update_lead_status") {
        actionConfig = { status: formLeadStatus };
      } else if (formActionType === "create_notification") {
        actionConfig = { title: formName, description: formActionMessage };
      }

      const res = await saveCustomAutomationRuleAction({
        id: editingRule?.id,
        name: formName,
        description: formDescription,
        triggerType: formTrigger,
        actions: [{ type: formActionType as any, config: actionConfig }],
        conditions: [],
      });

      if (res.success) {
        setDialogOpen(false);
        setFeedbackMsg({ type: "success", text: "Automation rule saved and activated!" });
        loadData();
      } else {
        setFeedbackMsg({ type: "error", text: res.error || "Failed to save rule" });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Save error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-space-4 animate-fade-in w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-3 shrink-0">
        <PageTitle
          title="Trigger-Action Automations"
          description="Build customized event-driven workflows that trigger SMS, Email, Status changes, and Webhooks."
        />

        <Button onClick={openCreateDialog} className="self-start sm:self-center gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" />
          <span>New Automation Rule</span>
        </Button>
      </div>

      {feedbackMsg && (
        <div
          className={cn(
            "flex items-center gap-space-2 radius-lg px-space-4 py-space-2.5 text-caption shrink-0 animate-fade-in border",
            feedbackMsg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          )}
        >
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="flex-1 font-medium">{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="hover:opacity-70 font-bold px-1 text-caption cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 space-y-space-5 pb-space-6 sidebar-scroll pr-1">
        {/* Rules Grid */}
        <div className="space-y-space-3">
          <div className="flex items-center justify-between">
            <h3 className="text-caption font-bold text-muted-foreground uppercase tracking-wider">
              Active Workflow Rules ({rules.length})
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12 text-caption text-muted-foreground gap-2 bg-card rounded-xl border border-border">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Loading automation rules...</span>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center p-10 bg-card rounded-xl border border-border space-y-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Zap className="h-5 w-5" />
              </div>
              <h4 className="text-body-sm font-semibold text-foreground">No automation rules created yet</h4>
              <p className="text-caption text-muted-foreground max-w-sm mx-auto">
                Create your first Trigger-Action automation to send automatic SMS confirmations, follow-ups, and notifications.
              </p>
              <Button onClick={openCreateDialog} size="sm" variant="outline">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create First Rule
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-4">
              {rules.map((rule) => {
                const triggerMeta = TRIGGER_TYPES.find((t) => t.value === rule.triggerType) || {
                  label: rule.triggerType,
                  icon: Zap,
                };
                const TriggerIcon = triggerMeta.icon;
                const isTesting = testingId === rule.id;

                return (
                  <div
                    key={rule.id}
                    className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft- flex flex-col justify-between hover:border-[hsl(var(--primary)/0.2)] transition-all duration-200"
                  >
                    <div className="p-space-4.5 space-y-space-3">
                      <div className="flex items-start justify-between gap-space-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-md bg-primary/10 text-primary">
                              <TriggerIcon className="h-4 w-4" />
                            </span>
                            <h4 className="text-body-sm font-semibold text-foreground">{rule.name}</h4>
                          </div>
                          {rule.description && (
                            <p className="text-caption text-muted-foreground line-clamp-2">
                              {rule.description}
                            </p>
                          )}
                        </div>

                        {/* Switch */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={rule.isActive}
                          onClick={() => handleToggle(rule.id, rule.isActive)}
                          className={cn(
                            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none",
                            rule.isActive ? "bg-primary" : "bg-[hsl(var(--foreground)/0.12)]"
                          )}
                        >
                          <span
                            className={cn(
                              "pointer-events-none block h-3.5 w-3.5 rounded-full bg-background ring-0 transition-transform",
                              rule.isActive ? "translate-x-4.5" : "translate-x-0.5"
                            )}
                          />
                        </button>
                      </div>

                      {/* Trigger -> Actions Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-[hsl(var(--foreground)/0.05)] text-foreground/80 font-medium flex items-center gap-1">
                          Trigger: {triggerMeta.label}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        {rule.actions?.map((act: any, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium capitalize"
                          >
                            {act.type?.replace("_", " ")}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground/75 pt-2 border-t border-[hsl(var(--foreground)/0.04)]">
                        <span>Fired {rule.executionCount || 0} times</span>
                        <span>
                          {rule.lastExecutedAt
                            ? `Last: ${new Date(rule.lastExecutedAt).toLocaleDateString()}`
                            : "Never triggered"}
                        </span>
                      </div>
                    </div>

                    <div className="px-space-4.5 py-space-2.5 bg-[hsl(var(--foreground)/0.02)] border-t border-[hsl(var(--foreground)/0.05)] flex items-center justify-between">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTestRule(rule.id)}
                        disabled={isTesting}
                        className="text-caption h-7 px-2.5 text-primary hover:bg-primary/10"
                      >
                        {isTesting ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                        ) : (
                          <Play className="h-3 w-3 mr-1.5" />
                        )}
                        Simulate Test Run
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(rule.id)}
                        className="h-7 w-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
                        title="Delete rule"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Execution Log Stream */}
        <div className="space-y-space-3 pt-space-2">
          <h3 className="text-caption font-bold text-muted-foreground uppercase tracking-wider">
            Live Execution History ({executions.length})
          </h3>

          <div className="bg-card border border-[hsl(var(--foreground)/0.06)] rounded-xl overflow-hidden soft-">
            {executions.length === 0 ? (
              <div className="p-6 text-center text-caption text-muted-foreground">
                No recent automation executions recorded.
              </div>
            ) : (
              <div className="divide-y divide-[hsl(var(--foreground)/0.04)]">
                {executions.map((log) => (
                  <div key={log.id} className="p-3.5 flex items-center justify-between gap-3 text-caption">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {log.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : log.status === "failed" ? (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      ) : (
                        <RotateCcw className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground truncate">
                          Event: {log.triggerEvent}
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {log.actionsExecuted?.join(", ") || log.errorMessage || "Executed"}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] text-muted-foreground/60 shrink-0">
                      {new Date(log.executedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create / Edit Rule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSaveRule}>
            <DialogHeader>
              <DialogTitle>Create Trigger-Action Automation</DialogTitle>
              <DialogDescription>
                Define an event trigger and automated actions executed when conditions are met.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input
                  id="rule-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. VIP Instant SMS Confirmation"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Trigger Event</Label>
                  <Select value={formTrigger} onValueChange={setFormTrigger}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Action to Execute</Label>
                  <Select value={formActionType} onValueChange={setFormActionType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formActionType === "send_email" && (
                <div className="space-y-1.5">
                  <Label>Email Subject</Label>
                  <Input
                    value={formActionSubject}
                    onChange={(e) => setFormActionSubject(e.target.value)}
                    placeholder="e.g. Appointment details for {{customerName}}"
                  />
                </div>
              )}

              {["send_sms", "send_email", "send_whatsapp", "create_notification"].includes(formActionType) && (
                <div className="space-y-1.5">
                  <Label>Message Template (Supports variables like `{"{{customerName}}"}`)</Label>
                  <textarea
                    rows={3}
                    value={formActionMessage}
                    onChange={(e) => setFormActionMessage(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-2.5 text-body-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Hello {{customerName}}, your appointment is booked!"
                  />
                </div>
              )}

              {formActionType === "update_lead_status" && (
                <div className="space-y-1.5">
                  <Label>Target Status</Label>
                  <Select value={formLeadStatus} onValueChange={setFormLeadStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Qualified">Qualified</SelectItem>
                      <SelectItem value="Hot">Hot</SelectItem>
                      <SelectItem value="Booked">Booked</SelectItem>
                      <SelectItem value="Escalated">Escalated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save & Enable Rule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
