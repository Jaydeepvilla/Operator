"use client";

import { Badge } from "@/components/shared/badge";
import { useState, useTransition, useCallback, useEffect } from "react";
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
  Loader2,
  Play,
  Square,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/dialog";
import {
  saveVoiceSettingsAction,
  createRoutingRuleAction,
  updateRoutingRuleAction,
  deleteRoutingRuleAction,
} from "@/server/actions/voice";
import { useToast } from "@/components/shared/toast";
import { formatUserErrorMessage } from "@/lib/errors";
import { cn } from "@/components/shared/utils";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Switch } from "@/components/shared/switch";
import { NativeTextarea, NativeTable } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";

const VALID_VOICE_IDS = [
  "af_heart", "af_bella", "af_nicole", "af_sarah", "af_sky", "af_jessica",
  "am_adam", "am_michael", "am_onyx", "am_eric",
  "bf_emma", "bf_isabella", "bm_george", "bm_lewis",
  "Ashley", "Sarah", "Hana", "Luna", "Dennis", "Blake", "Edward"
];

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
  initialRules,
}: {
  initialSettings: any;
  initialRules: any[];
}) {
  const initialVoiceName =
    initialSettings?.voiceName && VALID_VOICE_IDS.includes(initialSettings.voiceName)
      ? initialSettings.voiceName
      : "af_nicole";

  const [settings, setSettings] = useState<VoiceSettings>({
    voiceName: initialVoiceName,
    speakingSpeed: initialSettings?.speakingSpeed || "1.0",
    greetingMessage:
      initialSettings?.greetingMessage || "Hello! Thanks for calling. How can I assist you today?",
    fallbackNumber: initialSettings?.fallbackNumber || "",
    businessHoursMode: initialSettings?.businessHoursMode || "ai-only",
    voicemailActive: initialSettings?.voicemailActive ?? true,
  });

  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [rules, setRules] = useState<RoutingRule[]>(initialRules as RoutingRule[]);
  const [isSavingSettings, startSaveSettings] = useTransition();
  const [isSavingRule, startSaveRule] = useTransition();
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmDialogId, setConfirmDialogId] = useState<string | null>(null);
  const toast = useToast();

  // Rule builder form state
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleTrigger, setNewRuleTrigger] = useState<RoutingRule["triggerType"]>("business-hours");
  const [newRuleAction, setNewRuleAction] = useState<RoutingRule["routingAction"]>("ai-receptionist");
  const [newRuleTarget, setNewRuleTarget] = useState("");
  const [newRulePriority, setNewRulePriority] = useState("0");
  const [ruleDialogError, setRuleDialogError] = useState<string | null>(null);

  // Ensure browser voices are loaded
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      const onVoices = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.onvoiceschanged = onVoices;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  // Play audio sample via high-fidelity browser synthesis with fallback chime
  const playVoiceSample = useCallback((voiceId: string, speedStr: string, customText?: string) => {
    if (typeof window === "undefined") return;

    const sampleText =
      customText ||
      settings.greetingMessage ||
      "Hello! Thanks for calling. How can I assist you today?";

    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(sampleText);
        const speed = parseFloat(speedStr) || 1.0;
        utterance.rate = Math.max(0.7, Math.min(1.4, speed));

        const isMale =
          voiceId.startsWith("am_") ||
          voiceId.startsWith("bm_") ||
          ["Dennis", "Blake", "Edward"].includes(voiceId);
        const isBritish =
          voiceId.startsWith("bf_") ||
          voiceId.startsWith("bm_") ||
          voiceId === "Edward";

        const availableVoices = window.speechSynthesis.getVoices();
        let chosenVoice: SpeechSynthesisVoice | undefined;

        if (isBritish) {
          chosenVoice = availableVoices.find(
            (v) =>
              v.lang.startsWith("en-GB") &&
              (isMale ? v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("george") : true)
          );
        }
        if (!chosenVoice && isMale) {
          chosenVoice = availableVoices.find(
            (v) =>
              v.lang.startsWith("en") &&
              (v.name.toLowerCase().includes("male") ||
                v.name.toLowerCase().includes("david") ||
                v.name.toLowerCase().includes("guy") ||
                v.name.toLowerCase().includes("adam"))
          );
        }
        if (!chosenVoice) {
          chosenVoice = availableVoices.find(
            (v) =>
              v.lang.startsWith("en") &&
              (v.name.toLowerCase().includes("female") ||
                v.name.toLowerCase().includes("zira") ||
                v.name.toLowerCase().includes("samantha") ||
                v.name.toLowerCase().includes("natural") ||
                v.name.toLowerCase().includes("nicole"))
          );
        }
        if (!chosenVoice) {
          chosenVoice = availableVoices.find((v) => v.lang.startsWith("en"));
        }

        if (chosenVoice) {
          utterance.voice = chosenVoice;
        }

        utterance.pitch = isMale ? 0.92 : 1.06;

        utterance.onstart = () => setIsPlayingPreview(true);
        utterance.onend = () => setIsPlayingPreview(false);
        utterance.onerror = () => setIsPlayingPreview(false);

        (window as any).__voiceUtterance = utterance;

        window.speechSynthesis.speak(utterance);
        setIsPlayingPreview(true);
        return;
      } catch (err) {
        console.warn("Speech synthesis notice:", err);
      }
    }

    // Audio chime fallback if TTS unavailable
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
        setIsPlayingPreview(true);
        setTimeout(() => setIsPlayingPreview(false), 400);
      }
    } catch {
      setIsPlayingPreview(false);
    }
  }, [settings.greetingMessage]);

    const handleTogglePreview = () => {
    if (isPlayingPreview) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingPreview(false);
      return;
    }

    playVoiceSample(settings.voiceName, settings.speakingSpeed);
  };

  const handleVoiceChange = (newVoice: string) => {
    setSettings((prev) => ({ ...prev, voiceName: newVoice }));
  };

  const handleSpeedChange = (newSpeed: string) => {
    setSettings((prev) => ({ ...prev, speakingSpeed: newSpeed }));
  };

  const handleSaveSettings = () => {
    setSettingsStatus(null);
    startSaveSettings(async () => {
      const res = await saveVoiceSettingsAction(settings);
      if (res.success) {
        setSettingsStatus({ type: "success", text: "Settings saved successfully." });
        toast.success("Voice Settings Saved", "AI voice and speech settings have been updated.");
      } else {
        const errorMsg = formatUserErrorMessage(res.error, "Save failed.");
        setSettingsStatus({ type: "error", text: errorMsg });
        toast.error("Failed to save settings", errorMsg);
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
        isActive: true,
      });

      if (res.success && res.rule) {
        setRules((prev) =>
          [...prev, res.rule as unknown as RoutingRule].sort((a, b) => b.priority - a.priority)
        );
        setNewRuleName("");
        setNewRuleTarget("");
        setNewRulePriority("0");
        setIsRuleDialogOpen(false);
        toast.success("Routing Rule Created", `Rule "${newRuleName}" is now active.`);
      } else {
        const errorMsg = formatUserErrorMessage(res.error, "Failed to create rule.");
        setRuleDialogError(errorMsg);
        toast.error("Failed to create rule", errorMsg);
      }
    });
  };

  const handleToggleRule = async (ruleId: string, currentActive: boolean) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, isActive: !currentActive } : r))
    );

    const res = await updateRoutingRuleAction(ruleId, { isActive: !currentActive });
    if (!res.success) {
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, isActive: currentActive } : r))
      );
      toast.error("Failed to update rule status", formatUserErrorMessage(res.error));
    } else {
      toast.success("Routing Rule Updated", !currentActive ? "Rule activated." : "Rule deactivated.");
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
      toast.error("Failed to delete rule", formatUserErrorMessage(res.error));
    } else {
      toast.success("Routing Rule Deleted", "Rule removed from voice routing.");
    }
  };

  return (
    <div className="grid gap-space-4 lg:grid-cols-12 items-start w-full">
      {/* Settings Column */}
      <div className="lg:col-span-5">
        <div className="bg-card border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
          <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center gap-space-2">
            <Sliders className="h-4 w-4 text-primary" />
            <div>
              <h4 className="text-caption font-semibold text-foreground">AI Voice Settings</h4>
              <p className="text-caption text-muted-foreground mt-space-0.5">
                Configure default speech profile for the voice conversational interface.
              </p>
            </div>
          </div>

          <div className="p-space-4 space-y-space-4 bg-[hsl(var(--foreground)/0.002)]">
            <div className="space-y-space-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">
                    Speaking Voice (Kokoro TTS)
                  </Label>
                  <span className="text-xs text-amber-500 font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    Approximate preview
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTogglePreview}
                  className="h-7 px-space-2 text-caption gap-space-1 font-medium border-[hsl(var(--foreground)/0.1)] hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer"
                >
                  {isPlayingPreview ? (
                    <>
                      <Square className="h-3 w-3 fill-current text-rose-500" />
                      <span>Stop sample</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 fill-current text-primary" />
                      <span>Play sample</span>
                    </>
                  )}
                </Button>
              </div>

              <Select value={settings.voiceName || "af_nicole"} onValueChange={handleVoiceChange}>
                <SelectTrigger className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)]">
                  <SelectValue placeholder="Select Speaking Voice" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <div className="px-space-2 py-space-1 text-caption font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    American Female
                  </div>
                  <SelectItem value="af_nicole">Nicole (Clear &amp; Balanced)</SelectItem>
                  <SelectItem value="af_heart">Heart (Warm &amp; Executive)</SelectItem>
                  <SelectItem value="af_bella">Bella (Expressive &amp; Friendly)</SelectItem>
                  <SelectItem value="af_sarah">Sarah (Casual &amp; Approachable)</SelectItem>
                  <SelectItem value="af_sky">Sky (Bright &amp; Engaging)</SelectItem>
                  <SelectItem value="af_jessica">Jessica (Conversational)</SelectItem>

                  <div className="px-space-2 py-space-1 text-caption font-semibold text-muted-foreground/80 uppercase tracking-wider mt-space-1 border-t border-[hsl(var(--foreground)/0.04)] pt-space-1">
                    American Male
                  </div>
                  <SelectItem value="am_adam">Adam (Energetic &amp; Confident)</SelectItem>
                  <SelectItem value="am_michael">Michael (Polished Executive)</SelectItem>
                  <SelectItem value="am_onyx">Onyx (Deep Authoritative)</SelectItem>
                  <SelectItem value="am_eric">Eric (Casual Conversational)</SelectItem>

                  <div className="px-space-2 py-space-1 text-caption font-semibold text-muted-foreground/80 uppercase tracking-wider mt-space-1 border-t border-[hsl(var(--foreground)/0.04)] pt-space-1">
                    British Voices
                  </div>
                  <SelectItem value="bf_emma">Emma (British Professional Female)</SelectItem>
                  <SelectItem value="bf_isabella">Isabella (British Elegant Female)</SelectItem>
                  <SelectItem value="bm_george">George (British Classic Male)</SelectItem>
                  <SelectItem value="bm_lewis">Lewis (British Warm Male)</SelectItem>

                  <div className="px-space-2 py-space-1 text-caption font-semibold text-muted-foreground/80 uppercase tracking-wider mt-space-1 border-t border-[hsl(var(--foreground)/0.04)] pt-space-1">
                    Inworld Voices (inworld-tts-2)
                  </div>
                  <SelectItem value="Ashley">Ashley (Inworld Conversational Female)</SelectItem>
                  <SelectItem value="Sarah">Sarah (Inworld Expressive Female)</SelectItem>
                  <SelectItem value="Hana">Hana (Inworld Gentle Female)</SelectItem>
                  <SelectItem value="Luna">Luna (Inworld Bright Female)</SelectItem>
                  <SelectItem value="Dennis">Dennis (Inworld Executive Male)</SelectItem>
                  <SelectItem value="Blake">Blake (Inworld Natural Male)</SelectItem>
                  <SelectItem value="Edward">Edward (Inworld British Male)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-space-1.5">
              <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">
                Speech Speed Rate
              </Label>
              <Select value={settings.speakingSpeed} onValueChange={handleSpeedChange}>
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
              <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">
                Greeting Message
              </Label>
              <NativeTextarea
                value={settings.greetingMessage}
                onChange={(e) => setSettings({ ...settings, greetingMessage: e.target.value })}
                rows={3}
                placeholder="Hello! Thanks for calling. How can I assist you today?"
                className="w-full radius-md border-[hsl(var(--foreground)/0.08)] bg-background p-space-3 text-caption placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-space-1.5">
              <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">
                Fallback Transfer Number
              </Label>
              <Input
                placeholder="+15550190000"
                value={settings.fallbackNumber || ""}
                onChange={(e) => setSettings({ ...settings, fallbackNumber: e.target.value })}
                className="h-9.5 bg-background text-caption border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
              />
            </div>

            <div className="space-y-space-1.5">
              <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">
                Business Hours Mode
              </Label>
              <Select
                value={settings.businessHoursMode}
                onValueChange={(val: any) => setSettings({ ...settings, businessHoursMode: val })}
              >
                <SelectTrigger className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai-only">Always Operator AI</SelectItem>
                  <SelectItem value="forward">Forward During Open Hours</SelectItem>
                  <SelectItem value="hybrid">Hybrid Smart Routing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-space-3 radius-lg border border-[hsl(var(--foreground)/0.06)] bg-background">
              <div className="space-y-space-0.5">
                <span className="text-caption font-semibold text-foreground block">Voicemail Inbox Active</span>
                <span className="text-caption text-muted-foreground/60 block">Capture messages if lines are busy</span>
              </div>
              <Switch
                checked={settings.voicemailActive}
                onCheckedChange={(val) => setSettings({ ...settings, voicemailActive: val })}
              />
            </div>

            {settingsStatus && (
              <div
                className={cn(
                  "p-space-3 text-caption radius-lg flex items-center gap-space-2",
                  settingsStatus.type === "success"
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/15"
                    : "bg-rose-500/10 text-rose-600 border border-rose-500/15"
                )}
              >
                {settingsStatus.type === "success" ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                )}
                <span>{settingsStatus.text}</span>
              </div>
            )}

            <Button
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="w-full text-caption h-9 font-semibold gap-space-1.5 cursor-pointer"
            >
              {isSavingSettings ? (
                <Loader2 className="h-4 w-4 animate-spin mr-space-1" />
              ) : (
                <Sparkles className="h-4 w-4 mr-space-1" />
              )}
              <span>Save Settings</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Rules Column */}
      <div className="lg:col-span-7">
        <div className="bg-card border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
          <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center justify-between">
            <div>
              <h4 className="text-caption font-semibold text-foreground">Call Routing Rules</h4>
              <p className="text-caption text-muted-foreground mt-space-0.5">
                Define operational behaviors based on business hours, busy status, or timeouts.
              </p>
            </div>

            <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setRuleDialogError(null);
                  setIsRuleDialogOpen(true);
                }}
                className="h-8 text-caption gap-space-1 cursor-pointer font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Rule</span>
              </Button>

              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Routing Rule</DialogTitle>
                  <DialogDescription>
                    Add custom routing for specific caller conditions or hours.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-space-4 py-space-2 text-caption">
                  <div className="space-y-space-1.5">
                    <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">
                      Rule Name
                    </Label>
                    <Input
                      placeholder="e.g. VIP Urgent Triage"
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-space-3">
                    <div className="space-y-space-1.5">
                      <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">
                        Trigger
                      </Label>
                      <Select
                        value={newRuleTrigger}
                        onValueChange={(val: any) => setNewRuleTrigger(val)}
                      >
                        <SelectTrigger className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="business-hours">During Business Hours</SelectItem>
                          <SelectItem value="after-hours">After Hours</SelectItem>
                          <SelectItem value="busy">Lines Busy</SelectItem>
                          <SelectItem value="no-answer">No Answer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-space-1.5">
                      <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">
                        Action
                      </Label>
                      <Select
                        value={newRuleAction}
                        onValueChange={(val: any) => setNewRuleAction(val)}
                      >
                        <SelectTrigger className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ai-receptionist">Operator AI</SelectItem>
                          <SelectItem value="staff-dial">Forward Staff</SelectItem>
                          <SelectItem value="voicemail">Send Voicemail</SelectItem>
                          <SelectItem value="queue">Place Queue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-space-3">
                    <div className="space-y-space-1.5">
                      <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">
                        Target Phone (Optional)
                      </Label>
                      <Input
                        placeholder="+15550190000"
                        value={newRuleTarget}
                        onChange={(e) => setNewRuleTarget(e.target.value)}
                        className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-space-1.5">
                      <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">
                        Priority Order
                      </Label>
                      <Input
                        type="number"
                        placeholder="10"
                        value={newRulePriority}
                        onChange={(e) => setNewRulePriority(e.target.value)}
                        className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>

                  {ruleDialogError && (
                    <div className="p-space-3 bg-rose-500/10 text-rose-600 border-rose-500/15 text-caption leading-relaxed radius-lg flex items-center gap-space-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                      <span>{ruleDialogError}</span>
                    </div>
                  )}
                </div>

                <DialogFooter className="flex gap-space-2 border-t border-[hsl(var(--foreground)/0.05)] pt-space-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRuleDialogOpen(false)}
                    className="h-8.5 text-caption font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateRule} disabled={isSavingRule} size="sm" className="text-caption px-space-4">
                    {isSavingRule ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-space-1" /> : null}
                    <span>Create Rule</span>
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="p-space-0 overflow-hidden">
            {rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-space-8 bg-[hsl(var(--foreground)/0.002)] min-h-64 text-muted-foreground/60 gap-space-1">
                <Clock className="h-8 w-8 text-muted-foreground/30 animate-pulse mb-space-1.5" />
                <span className="text-caption font-semibold text-foreground">No Custom Routing Rules</span>
                <p className="text-caption max-w-60 mx-auto mt-space-0.5 leading-normal">
                  No custom routing rules defined. Default voice settings apply.
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[460px]">
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
                    {rules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-[hsl(var(--foreground)/0.015)] transition-colors">
                        <td className="px-space-5 py-space-3 font-mono font-semibold text-primary">{rule.priority}</td>
                        <td className="px-space-5 py-space-3 font-semibold text-foreground">{rule.ruleName}</td>
                        <td className="px-space-5 py-space-3 text-muted-foreground/90 capitalize">
                          {rule.triggerType.replace("-", " ")}
                        </td>
                        <td className="px-space-5 py-space-3">
                          <Badge>{rule.routingAction.replace("-", " ")}</Badge>
                        </td>
                        <td className="px-space-5 py-space-3 font-mono text-muted-foreground">{rule.targetId || "—"}</td>
                        <td className="px-space-5 py-space-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleRule(rule.id, rule.isActive)}
                            className="focus:outline-none transition-transform active:scale-95 text-primary hover:text-primary/80 cursor-pointer p-0 h-auto"
                          >
                            {rule.isActive ? (
                              <ToggleRight className="h-5.5 w-5.5" />
                            ) : (
                              <ToggleLeft className="h-5.5 w-5.5 text-muted-foreground/45" />
                            )}
                          </Button>
                        </td>
                        <td className="px-space-5 py-space-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRule(rule.id)}
                            aria-label="Delete routing rule"
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer h-7 w-7 radius-md"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </NativeTable>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDialogId}
        onOpenChange={(open) => !open && setConfirmDialogId(null)}
        title="Delete Routing Rule"
        description="Are you sure you want to delete this routing rule?"
        onConfirm={handleConfirmDeleteRule}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
