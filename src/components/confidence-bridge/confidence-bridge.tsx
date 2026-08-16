"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  ArrowRight,
  ArrowLeft,
  Zap,
  Check,
  ChevronRight,
  DollarSign,
  Calendar,
  Volume2,
  ChevronDown
} from "lucide-react";
import { VerificationScenario, VerificationStatus } from "@/server/services/verification/types";
import { 
  getVerificationScenariosAction, 
  runVerificationScenarioAction,
  markOrganizationVerifiedAction 
} from "@/server/actions/verification";
import { ScenarioCard } from "./scenario-card";
import { InlineEditModal } from "./inline-edit-modal";
import { ChannelActivationHub } from "./channel-activation-hub";
import { VoicePersonaCard } from "./voice-persona-card";
import { cn } from "@/components/shared/utils";

interface ConfidenceBridgeProps {
  businessName: string;
  orgId?: string;
  onFinish?: () => void;
}

export function ConfidenceBridge({
  businessName,
  orgId,
  onFinish,
}: ConfidenceBridgeProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = React.useState<"verification" | "channels">("verification");
  const [scenarios, setScenarios] = React.useState<VerificationScenario[]>([]);
  const [verificationStatus, setVerificationStatus] = React.useState<VerificationStatus>("unverified");
  const [loading, setLoading] = React.useState(true);
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [runningScenarioId, setRunningScenarioId] = React.useState<string | null>(null);
  const [isBulkRunning, setIsBulkRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [voiceDrawerOpen, setVoiceDrawerOpen] = React.useState(false);

  // Inline edit modal state
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [activeEditService, setActiveEditService] = React.useState<{
    id: string;
    price: string;
    name: string;
  } | null>(null);

  // Fetch initial scenarios
  const loadScenarios = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVerificationScenariosAction(orgId);
      if (res.success && res.scenarios) {
        setScenarios(res.scenarios);
        setVerificationStatus(res.verificationStatus || "unverified");
      } else {
        setError(res.error || "Failed to load verification scenarios.");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load scenarios.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  React.useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  // Run a single scenario
  const handleRunScenario = async (scenarioId: string) => {
    setRunningScenarioId(scenarioId);
    setError(null);
    try {
      const res = await runVerificationScenarioAction(scenarioId, orgId);
      if (res.success && res.result) {
        setScenarios((prev) =>
          prev.map((s) => (s.id === scenarioId ? { ...s, lastResult: res.result } : s))
        );
        if (res.updatedOverallStatus) {
          setVerificationStatus(res.updatedOverallStatus);
        }
      } else {
        setError(res.error || "Scenario run failed.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setRunningScenarioId(null);
    }
  };

  // Run all scenarios in sequence
  const handleRunAll = async () => {
    setIsBulkRunning(true);
    setError(null);
    for (let i = 0; i < scenarios.length; i++) {
      const s = scenarios[i];
      setCurrentStepIndex(i);
      setRunningScenarioId(s.id);
      const res = await runVerificationScenarioAction(s.id, orgId);
      if (res.success && res.result) {
        setScenarios((prev) =>
          prev.map((item) => (item.id === s.id ? { ...item, lastResult: res.result } : item))
        );
        if (res.updatedOverallStatus) {
          setVerificationStatus(res.updatedOverallStatus);
        }
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    setRunningScenarioId(null);
    setIsBulkRunning(false);
  };

  // Open inline edit
  const handleOpenEdit = (serviceId: string, currentPrice: string, currentName: string) => {
    setActiveEditService({ id: serviceId, price: currentPrice, name: currentName });
    setEditModalOpen(true);
  };

  // When inline edit is saved, re-run the pricing scenario
  const handleEditSaved = async () => {
    await loadScenarios();
    const pricingScenario = scenarios.find((s) => s.type === "pricing_hours");
    if (pricingScenario) {
      await handleRunScenario(pricingScenario.id);
    }
  };

  const handleFinish = async () => {
    await markOrganizationVerifiedAction(orgId);
    if (onFinish) {
      onFinish();
    } else {
      router.push("/dashboard");
    }
  };

  const passedCount = scenarios.filter((s) => s.lastResult?.status === "passed").length;
  const totalCount = scenarios.length || 3;
  const isAllVerified = totalCount > 0 && passedCount === totalCount;
  const progressPercent = Math.round((passedCount / totalCount) * 100);

  const activeScenario = scenarios[currentStepIndex] || scenarios[0];
  const activePassed = activeScenario?.lastResult?.status === "passed";
  const hasNextStep = currentStepIndex < scenarios.length - 1;
  const hasPrevStep = currentStepIndex > 0;

  return (
    <div className="space-y-5 animate-fade-up" style={{ animationFillMode: "both" }}>
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-medium">Preparing Operator verification suite…</p>
        </div>
      ) : viewMode === "channels" ? (
        <ChannelActivationHub
          businessName={businessName}
          orgId={orgId || "org-current"}
          onFinish={handleFinish}
          onBack={() => setViewMode("verification")}
        />
      ) : (
        <>
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5">
                <ShieldCheck className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold text-primary tracking-wide uppercase">
                  Step 2 of 3: Verification
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">
                Verify Operator for {businessName}
              </h2>
              <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                Verify pricing, availability, and safety rules one step at a time before connecting customer channels.
              </p>
            </div>

            {/* Optional Voice Persona Drawer Trigger */}
            <button
              onClick={() => setVoiceDrawerOpen((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all shadow-xs shrink-0",
                voiceDrawerOpen
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "border-border/80 bg-card/80 hover:bg-muted text-foreground"
              )}
            >
              <Volume2 className="h-3.5 w-3.5 text-primary" />
              <span>Voice Persona</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", voiceDrawerOpen && "rotate-180")} />
            </button>
          </div>

          {/* Collapsible Voice Persona Drawer */}
          {voiceDrawerOpen && (
            <div className="animate-fade-up">
              <VoicePersonaCard businessName={businessName} />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-xs shadow-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TOP HERO: Progress Bar & Step Tracker */}
          <div
            className={cn(
              "rounded-xl border p-4 shadow-sm transition-all space-y-3",
              isAllVerified
                ? "border-emerald-500/40 bg-emerald-500/[0.04]"
                : "border-border/80 bg-card/60"
            )}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all shadow-sm",
                    isAllVerified
                      ? "bg-emerald-500 text-white shadow-emerald-500/20"
                      : "bg-primary text-primary-foreground shadow-primary/20"
                  )}
                >
                  {isAllVerified ? (
                    <Check className="h-4 w-4 stroke-[3]" />
                  ) : (
                    <span>{passedCount}/{totalCount}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      {isAllVerified ? "All Checks Verified" : `Verification Readiness (${progressPercent}%)`}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.2 text-[10px] font-bold border",
                        isAllVerified
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {isAllVerified ? "Ready for Channels" : `Test ${currentStepIndex + 1} of ${totalCount}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isAllVerified
                      ? "All safety boundaries and pricing rules confirmed. Click below to proceed to channels."
                      : "Complete the single simulation test below to proceed."}
                  </p>
                </div>
              </div>

              {/* Quick 1-Click Run All Option */}
              {!isAllVerified && (
                <button
                  onClick={handleRunAll}
                  disabled={isBulkRunning || runningScenarioId !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 hover:bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground transition-all shadow-xs disabled:opacity-50 ml-auto sm:ml-0"
                >
                  {isBulkRunning ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      <span>Verifying All…</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3 text-primary" />
                      <span>Auto-Run All 3</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Step Indicator Tabs */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {scenarios.map((s, idx) => {
                const isDone = s.lastResult?.status === "passed";
                const isActive = currentStepIndex === idx;
                const tabTitle = idx === 0 ? "Pricing & Hours" : idx === 1 ? "Calendar Booking" : "Safety Rules";
                return (
                  <button
                    key={s.id}
                    onClick={() => setCurrentStepIndex(idx)}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all border text-center shadow-xs",
                      isActive
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30 font-bold"
                        : isDone
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        isDone
                          ? "bg-emerald-500 text-white"
                          : isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground border border-border"
                      )}
                    >
                      {isDone ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : idx + 1}
                    </span>
                    <span className="truncate">{tabTitle}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SINGLE ACTIVE TEST STEP CONTAINER (100% FRONT & CENTER) */}
          {activeScenario && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between px-0.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Current Simulation (Test {currentStepIndex + 1} of {totalCount})
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Isolated dry-run check
                </span>
              </div>

              <ScenarioCard
                scenario={activeScenario}
                onRun={handleRunScenario}
                isRunning={runningScenarioId === activeScenario.id}
                onEditService={handleOpenEdit}
              />

              {/* Progressive Step Navigation Bar */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  {hasPrevStep && (
                    <button
                      onClick={() => setCurrentStepIndex((prev) => Math.max(prev - 1, 0))}
                      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      <span>Previous Test</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {hasNextStep ? (
                    <button
                      onClick={() => setCurrentStepIndex((prev) => prev + 1)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all shadow-sm active:scale-95",
                        activePassed
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 ring-2 ring-primary/20"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      )}
                    >
                      <span>
                        {activePassed
                          ? currentStepIndex === 0
                            ? "Next: Verify Calendar Availability"
                            : "Next: Verify Safety Boundaries"
                          : "Next Test"}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : isAllVerified ? (
                    <button
                      onClick={() => setViewMode("channels")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-all shadow-md shadow-emerald-600/25 active:scale-95 ring-2 ring-emerald-500/30"
                    >
                      <span>All Verified · Connect Customer Channels</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Inline Edit Modal */}
      <InlineEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        serviceId={activeEditService?.id}
        initialPrice={activeEditService?.price}
        initialName={activeEditService?.name}
        onSaveSuccess={handleEditSaved}
      />
    </div>
  );
}
