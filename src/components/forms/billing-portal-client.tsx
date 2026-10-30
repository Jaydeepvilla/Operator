"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { 
  CreditCard, 
  Sparkles, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  History, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  Download,
  Calendar,
  PhoneCall,
  MessageSquare,
  ShieldAlert,
  TrendingUp,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shared/card";
import { 
  upgradeSubscriptionAction, 
  cancelSubscriptionAction,
  revokeCancellationAction 
} from "@/server/actions/billing";
import { PaymentProvidersClient } from "./payment-providers-client";
import { RazorpayCheckoutButton } from "@/components/billing/razorpay-checkout-button";
import { getAllPlans, PlanConfig } from "@/lib/billing/plans";
import { BarChartCard } from "@/components/charts";
import { useConfirm } from "@/components/shared/confirm-dialog";

interface BillingPortalClientProps {
  initialSubscription: any;
  initialAccount: any;
  initialInvoices: any[];
  initialPayments: any[];
  initialUsageCounters: any[];
  paymentProvidersData?: {
    country: string;
    currency: string;
    language: string;
    recommended: any[];
    supported: any[];
    connections: any[];
  };
  chartData?: { month: string; mrr: number; revenue: number }[];
}

export function BillingPortalClient({
  initialSubscription,
  initialAccount,
  initialInvoices,
  initialPayments,
  initialUsageCounters,
  paymentProvidersData,
  chartData
}: BillingPortalClientProps) {
  const [activeTab, setActiveTab] = useState<"usage" | "invoices" | "providers" | "revenue">("usage");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [subscription, setSubscription] = useState(initialSubscription);
  const [invoices] = useState(initialInvoices || []);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const confirm = useConfirm();

  const dynamicPlans = getAllPlans();

  const handlePlanChange = (planId: string) => {
    if (planId === subscription?.planId && subscription?.status === "active") return;

    setStatusMessage(null);
    startTransition(async () => {
      const res = await upgradeSubscriptionAction(planId);
      if (res.success) {
        setStatusMessage({ 
          type: res.scheduledAtPeriodEnd ? "info" : "success", 
          text: res.message || `Plan changed to ${planId.toUpperCase()}.` 
        });
        if (!res.scheduledAtPeriodEnd) {
          setSubscription((prev: any) => ({ ...prev, planId, status: "active", state: "ACTIVE" }));
        }
      } else {
        const errPayload = res as { message?: string; error?: string; correlationId?: string };
        const errorText = errPayload.message || errPayload.error || "We couldn't change your plan. Check your payment details or try again.";
        const refText = errPayload.correlationId ? ` (Ref: ${errPayload.correlationId})` : "";
        setStatusMessage({ 
          type: "error", 
          text: `${errorText}${refText}` 
        });
      }
    });
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: "Cancel Subscription?",
      description: "• Your AI receptionist will continue answering calls until the end of your billing period.\n• After that, phone numbers will be released and live call answering will pause.\n• You can reactivate anytime before your period ends.",
      confirmText: "Cancel Subscription",
      cancelText: "Keep Subscription",
      variant: "danger",
      isDestructive: true,
    });
    if (!ok) return;

    setStatusMessage(null);
    startTransition(async () => {
      const res = await cancelSubscriptionAction();
      if (res.success) {
        setStatusMessage({ 
          type: "info", 
          text: `Cancellation scheduled. Your plan remains active until ${res.periodEnd ? new Date(res.periodEnd).toLocaleDateString() : "the end of this billing period"}.` 
        });
        setSubscription((prev: any) => ({ 
          ...prev, 
          cancelAtPeriodEnd: true, 
          state: "CANCELING" 
        }));
      } else {
        const errPayload = res as { message?: string; error?: string; correlationId?: string };
        setStatusMessage({ 
          type: "error", 
          text: errPayload.message || "We couldn't schedule the cancellation. Try again or contact support." 
        });
      }
    });
  };

  const handleRevokeCancellation = () => {
    setStatusMessage(null);
    startTransition(async () => {
      const res = await revokeCancellationAction();
      if (res.success) {
        setStatusMessage({ 
          type: "success", 
          text: "Cancellation revoked. Your subscription remains active and will renew on schedule." 
        });
        setSubscription((prev: any) => ({ 
          ...prev, 
          cancelAtPeriodEnd: false, 
          status: "active",
          state: "ACTIVE" 
        }));
      } else {
        const errPayload = res as { message?: string; error?: string };
        setStatusMessage({ 
          type: "error", 
          text: errPayload.message || "We couldn't restore your subscription. Try again." 
        });
      }
    });
  };

  const currentPlanId = (subscription?.planId || "starter").toLowerCase();
  const subState = subscription?.state || (subscription?.status === "active" ? "ACTIVE" : "TRIALING");
  const isTrial = subState === "TRIALING";
  const isCanceling = subscription?.cancelAtPeriodEnd || subState === "CANCELING";
  const isPastDue = subState === "PAST_DUE";
  const isSuspended = subState === "SUSPENDED" || subState === "EXPIRED";

  // Dynamic usage stats from subscription or fallback to counters
  const convUsage = subscription?.usage?.conversations?.current ?? 0;
  const convLimit = subscription?.usage?.conversations?.limit ?? 500;
  const convPercent = convLimit ? Math.min(100, Math.round((convUsage / convLimit) * 100)) : 0;

  const voiceUsage = subscription?.usage?.voiceMinutes?.current ?? 0;
  const voiceLimit = subscription?.usage?.voiceMinutes?.limit ?? 100;
  const voicePercent = voiceLimit ? Math.min(100, Math.round((voiceUsage / voiceLimit) * 100)) : 0;

  const calUsage = subscription?.usage?.calendars?.current ?? 0;
  const calLimit = subscription?.usage?.calendars?.limit; // null = unlimited

  const activePlanConfig = dynamicPlans.find(p => p.id === currentPlanId) || dynamicPlans[0];
  const activePlanPrice = billingInterval === "yearly" && activePlanConfig?.yearlyPrice 
    ? activePlanConfig.yearlyPrice 
    : activePlanConfig?.price ?? 49;

  return (
    <div className="space-y-space-6 w-full">
      {/* Executive Overview Hero: Active Plan & Quotas */}
      <div className="radius-2xl border border-border/50 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-md p-space-6 soft-shadow transition-all">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-6 items-center">
          
          {/* Plan Summary */}
          <div className="lg:col-span-5 space-y-space-3 border-b lg:border-b-0 lg:border-r border-border/30 pb-space-5 lg:pb-space-0 lg:pr-space-6">
            <div className="flex items-center gap-space-2.5">
              <div className="h-9 w-9 radius-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-space-2 flex-wrap">
                  <h2 className="text-body-lg font-bold text-foreground capitalize">
                    {subscription?.plan?.name || activePlanConfig?.name || currentPlanId} Plan
                  </h2>
                  <span className={`inline-flex items-center gap-space-1 px-space-2.5 py-0.5 radius-full text-caption font-semibold tracking-wide uppercase ${
                    isSuspended
                      ? "bg-destructive/15 text-destructive border border-destructive/25"
                      : isPastDue
                      ? "bg-warning-500/15 text-warning-500 border border-warning-500/25"
                      : isCanceling
                      ? "bg-muted text-muted-foreground border border-border/30"
                      : isTrial
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                  }`}>
                    {isTrial ? (
                      <>
                        <span className="h-1.5 w-1.5 radius-full bg-primary animate-pulse" />
                        Trial ({subscription?.trialDaysRemaining ?? 14}d left)
                      </>
                    ) : (
                      subState
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-baseline gap-space-1.5 pt-space-1">
              <span className="text-heading-md font-semibold text-foreground font-mono">
                ${activePlanPrice}
              </span>
              <span className="text-caption text-muted-foreground">/ month</span>
            </div>

            <p className="text-caption text-muted-foreground leading-relaxed">
              {isSuspended ? (
                "Services suspended. Update your payment method to restore live call handling immediately."
              ) : isPastDue ? (
                `Payment failed. ${subscription?.gracePeriodDaysRemaining ?? 5} days remaining in grace period before suspension.`
              ) : isCanceling ? (
                `Scheduled to cancel on ${subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "period end"}. Call answering active until then.`
              ) : isTrial ? (
                `Full features active for testing. Upgrade anytime to ensure zero downtime.`
              ) : (
                `Auto-renews on ${subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "next billing date"}.`
              )}
            </p>

            <div className="flex items-center gap-space-2 pt-space-2 flex-wrap">
              {isCanceling ? (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={handleRevokeCancellation}
                  disabled={isPending}
                  className="cursor-pointer text-caption"
                >
                  Reactivate Subscription
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    asChild
                    className="text-caption cursor-pointer"
                  >
                    <Link href="/pricing">
                      Compare & Change Plan
                    </Link>
                  </Button>
                  {!isSuspended && !isTrial && (
                    <Button 
                      onClick={handleCancel}
                      disabled={isPending}
                      className="text-caption text-muted-foreground hover:text-destructive transition-colors cursor-pointer px-space-2 py-space-1"
                    >
                      Cancel Plan
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Real-time Usage Quotas */}
          <div className="lg:col-span-7 space-y-space-3.5">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/75">
                Current Period Quota Usage
              </span>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("usage")}
                className="text-caption font-semibold flex items-center gap-space-1 cursor-pointer h-7 px-space-2.5 text-foreground hover:text-primary hover:border-primary/50"
              >
                <span>Details</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-3">
              {/* Conversations */}
              <div className="p-space-3.5 radius-xl bg-background/40 border border-border/30 space-y-space-2">
                <div className="flex items-center justify-between text-caption font-medium">
                  <span className="flex items-center gap-space-1.5 text-foreground/90">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    Conversations
                  </span>
                  <span className="font-mono text-muted-foreground text-caption">{convPercent}%</span>
                </div>
                <div className="w-full bg-border/40 h-1.5 radius-full overflow-hidden">
                  <div 
                    className={`h-full radius-full transition-all ${
                      convPercent >= 90 ? "bg-destructive" : convPercent >= 80 ? "bg-warning-500" : "bg-primary"
                    }`}
                    style={{ width: `${convPercent}%` }} 
                  />
                </div>
                <p className="text-caption text-muted-foreground font-mono">
                  {convUsage.toLocaleString()} / {convLimit.toLocaleString()}
                </p>
              </div>

              {/* Voice Minutes */}
              <div className="p-space-3.5 radius-xl bg-background/40 border border-border/30 space-y-space-2">
                <div className="flex items-center justify-between text-caption font-medium">
                  <span className="flex items-center gap-space-1.5 text-foreground/90">
                    <PhoneCall className="h-3.5 w-3.5 text-emerald-400" />
                    Voice AI
                  </span>
                  <span className="font-mono text-muted-foreground text-caption">{voicePercent}%</span>
                </div>
                <div className="w-full bg-border/40 h-1.5 radius-full overflow-hidden">
                  <div 
                    className={`h-full radius-full transition-all ${
                      voicePercent >= 90 ? "bg-destructive" : voicePercent >= 80 ? "bg-warning-500" : "bg-emerald-400"
                    }`}
                    style={{ width: `${voicePercent}%` }} 
                  />
                </div>
                <p className="text-caption text-muted-foreground font-mono">
                  {voiceUsage.toLocaleString()} / {voiceLimit.toLocaleString()}m
                </p>
              </div>

              {/* Calendars */}
              <div className="p-space-3.5 radius-xl bg-background/40 border border-border/30 space-y-space-2">
                <div className="flex items-center justify-between text-caption font-medium">
                  <span className="flex items-center gap-space-1.5 text-foreground/90">
                    <Calendar className="h-3.5 w-3.5 text-amber-400" />
                    Calendars
                  </span>
                  <span className="font-mono text-muted-foreground text-caption">
                    {calLimit === null ? "Unlimited" : `${calUsage}/${calLimit}`}
                  </span>
                </div>
                <div className="w-full bg-border/40 h-1.5 radius-full overflow-hidden">
                  <div 
                    className="bg-amber-400 h-full radius-full transition-all" 
                    style={{ width: calLimit === null ? "30%" : `${Math.min(100, Math.round((calUsage / calLimit) * 100))}%` }} 
                  />
                </div>
                <p className="text-caption text-muted-foreground">
                  {calLimit === null ? "All calendars synced" : `${calLimit - calUsage} available slots`}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modern Segmented Navigation Bar */}
      <div className="flex items-center justify-between flex-wrap gap-space-3 border-b border-border/20 pb-space-3">
        <div className="inline-flex items-center gap-space-1 p-space-1 bg-card/60 border border-border/40 radius-full backdrop-blur-md">
          <Button 
            variant={activeTab === "usage" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("usage")}
            className="text-caption font-medium cursor-pointer h-8 px-space-3.5 radius-full"
          >
            <Activity className="h-3.5 w-3.5 mr-space-1.5 text-emerald-400" />
            Usage Quotas
          </Button>
          <Button 
            variant={activeTab === "invoices" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("invoices")}
            className="text-caption font-medium cursor-pointer h-8 px-space-3.5 radius-full"
          >
            <History className="h-3.5 w-3.5 mr-space-1.5 text-amber-400" />
            Invoices & Receipts
          </Button>
          <Button 
            variant={activeTab === "providers" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("providers")}
            className="text-caption font-medium cursor-pointer h-8 px-space-3.5 radius-full"
          >
            <CreditCard className="h-3.5 w-3.5 mr-space-1.5 text-primary" />
            Payment Gateways
          </Button>
          {chartData && chartData.some(d => d.revenue > 0) && (
            <Button 
              variant={activeTab === "revenue" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("revenue")}
              className="text-caption font-medium cursor-pointer h-8 px-space-3.5 radius-full"
            >
              <TrendingUp className="h-3.5 w-3.5 mr-space-1.5 text-emerald-400" />
              Revenue
            </Button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className={`p-space-3.5 radius-xl flex items-start gap-space-2.5 text-caption ${
          statusMessage.type === "success" 
            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" 
            : statusMessage.type === "info"
            ? "bg-primary/10 text-primary border border-primary/20"
            : "bg-destructive/10 text-destructive border border-destructive/20"
        }`}>
          {statusMessage.type === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* TAB: Usage Quotas & Limits */}
      {activeTab === "usage" && (
        <Card className="bg-card/45 border border-border/50">
          <CardHeader>
            <CardTitle className="text-body-md font-semibold flex items-center gap-space-2">
              <Activity className="h-5 w-5 text-emerald-400" />
              Dynamic Resource Metering
            </CardTitle>
            <CardDescription className="text-caption">
              Track real-time monthly usage against current plan limits. Quotas reset each billing cycle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-space-6">
            <div className="grid gap-space-6 sm:grid-cols-3">
              {/* Conversations Meter */}
              <div className="space-y-space-2.5 p-space-4 radius-xl bg-background/30 border border-border/30">
                <div className="flex items-center gap-space-2 text-caption font-semibold">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span>Conversations</span>
                </div>
                <div className="flex justify-between text-caption font-mono text-muted-foreground">
                  <span>{convUsage.toLocaleString()} used</span>
                  <span>{convLimit.toLocaleString()} limit</span>
                </div>
                <div className="w-full bg-border/40 h-2 radius-full overflow-hidden">
                  <div 
                    className={`h-full radius-full transition-all ${
                      convPercent >= 90 ? "bg-destructive" : convPercent >= 80 ? "bg-warning-500" : "bg-primary"
                    }`}
                    style={{ width: `${convPercent}%` }} 
                  />
                </div>
                <p className="text-caption text-muted-foreground">{convPercent}% of monthly allowance used</p>
              </div>

              {/* Voice Minutes Meter */}
              <div className="space-y-space-2.5 p-space-4 radius-xl bg-background/30 border border-border/30">
                <div className="flex items-center gap-space-2 text-caption font-semibold">
                  <PhoneCall className="h-4 w-4 text-emerald-400" />
                  <span>Voice AI Minutes</span>
                </div>
                <div className="flex justify-between text-caption font-mono text-muted-foreground">
                  <span>{voiceUsage.toLocaleString()} min</span>
                  <span>{voiceLimit.toLocaleString()} min</span>
                </div>
                <div className="w-full bg-border/40 h-2 radius-full overflow-hidden">
                  <div 
                    className={`h-full radius-full transition-all ${
                      voicePercent >= 90 ? "bg-destructive" : voicePercent >= 80 ? "bg-warning-500" : "bg-emerald-400"
                    }`}
                    style={{ width: `${voicePercent}%` }} 
                  />
                </div>
                <p className="text-caption text-muted-foreground">{voicePercent}% of included minutes used</p>
              </div>

              {/* Calendar Connections Meter */}
              <div className="space-y-space-2.5 p-space-4 radius-xl bg-background/30 border border-border/30">
                <div className="flex items-center gap-space-2 text-caption font-semibold">
                  <Calendar className="h-4 w-4 text-amber-400" />
                  <span>Calendar Integrations</span>
                </div>
                <div className="flex justify-between text-caption font-mono text-muted-foreground">
                  <span>{calUsage} connected</span>
                  <span>{calLimit === null ? "Unlimited" : `${calLimit} max`}</span>
                </div>
                <div className="w-full bg-border/40 h-2 radius-full overflow-hidden">
                  <div 
                    className="bg-amber-400 h-full radius-full transition-all" 
                    style={{ width: calLimit === null ? "25%" : `${Math.min(100, Math.round((calUsage / calLimit) * 100))}%` }} 
                  />
                </div>
                <p className="text-caption text-muted-foreground">
                  {calLimit === null ? "Unlimited calendar integrations included" : `${calLimit - calUsage} available slots remaining`}
                </p>
              </div>
            </div>

            {/* Smart Progressive Warning Banners */}
            {convPercent >= 100 ? (
              <div className="p-space-3.5 radius-xl border border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-space-2.5 text-caption">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-space-0.5 text-destructive" />
                <div>
                  <span className="font-semibold">Monthly conversation limit reached:</span>
                  <p className="mt-space-1 text-muted-foreground">
                    You have used all {convLimit.toLocaleString()} included conversations for this period. Upgrade your plan to resume uninterrupted AI call handling.
                  </p>
                </div>
              </div>
            ) : convPercent >= 90 ? (
              <div className="p-space-3.5 radius-xl border border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-space-2.5 text-caption">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-space-0.5" />
                <div>
                  <span className="font-semibold">You've used {convPercent}% of your monthly conversations:</span>
                  <p className="mt-space-1 text-muted-foreground">
                    Consider upgrading your plan before reaching the limit to prevent call answering interruptions.
                  </p>
                </div>
              </div>
            ) : convPercent >= 80 ? (
              <div className="p-space-3.5 radius-xl border border-warning-500/20 bg-warning-500/5 text-warning-500 flex items-start gap-space-2.5 text-caption">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-space-0.5" />
                <div>
                  <span className="font-semibold">Approaching monthly conversation limit:</span>
                  <p className="mt-space-1 text-muted-foreground">
                    You have used {convUsage.toLocaleString()} of your {convLimit.toLocaleString()} included conversations ({convPercent}%).
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* TAB: Invoices & Receipts */}
      {activeTab === "invoices" && (
        <Card className="bg-card/45 border border-border/50">
          <CardHeader>
            <CardTitle className="text-body-md font-semibold flex items-center gap-space-2">
              <History className="h-5 w-5 text-amber-400" />
              Invoices & Statement History
            </CardTitle>
            <CardDescription className="text-caption">
              Review history logs of completed payments and billing statements.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-space-0 border-t border-border/10">
            {invoices.length === 0 ? (
              <div className="py-space-12 text-center text-muted-foreground text-body-sm px-space-4">
                <p className="font-medium text-foreground">No invoices yet</p>
                <p className="text-caption text-muted-foreground mt-1">
                  Your billing invoices and payment receipts will appear here after your first paid billing cycle.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-caption">
                  <thead>
                    <tr className="border-b border-border/30 bg-muted/20 text-caption uppercase tracking-wider text-muted-foreground font-semibold">
                      <th className="px-space-6 py-space-4">Invoice Number</th>
                      <th className="px-space-6 py-space-4">Total Amount</th>
                      <th className="px-space-6 py-space-4">Payment Status</th>
                      <th className="px-space-6 py-space-4">Paid On</th>
                      <th className="px-space-6 py-space-4 text-right">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10 text-muted-foreground">
                    {invoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-accent/5 transition-colors">
                        <td className="px-space-6 py-space-4 text-foreground font-medium">{inv.number}</td>
                        <td className="px-space-6 py-space-4 font-mono text-primary font-semibold">${inv.total}</td>
                        <td className="px-space-6 py-space-4">
                          <span className={`inline-flex items-center px-space-2.5 py-0.5 radius-full text-caption font-semibold uppercase tracking-wider ${
                            inv.status === "paid" 
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" 
                              : "bg-warning-500/15 text-warning-500 border border-warning-500/25"
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-space-6 py-space-4 font-mono">{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : "Pending"}</td>
                        <td className="px-space-6 py-space-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => window.open(inv.pdfUrl || "#")}
                            aria-label={`Download invoice ${inv.number}`}
                            className="h-8 w-8 text-primary hover:bg-primary/10 cursor-pointer"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB: Payment Providers */}
      {activeTab === "providers" && paymentProvidersData && (
        <Card className="bg-card/45 border border-border/50">
          <CardHeader>
            <CardTitle className="text-body-md font-semibold flex items-center gap-space-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Global Payment Networks
            </CardTitle>
            <CardDescription className="text-caption">
              Setup and manage international payment checkout gateways dynamically configured for your region.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentProvidersClient
              country={paymentProvidersData.country}
              currency={paymentProvidersData.currency}
              language={paymentProvidersData.language}
              recommended={paymentProvidersData.recommended}
              supported={paymentProvidersData.supported}
              initialConnections={paymentProvidersData.connections}
            />
          </CardContent>
        </Card>
      )}

      {/* TAB: Revenue Trend (Shown cleanly in dedicated tab if data exists) */}
      {activeTab === "revenue" && chartData && (
        <Card className="bg-card/45 border border-border/50">
          <CardHeader>
            <CardTitle className="text-body-md font-semibold flex items-center gap-space-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Revenue Performance
            </CardTitle>
            <CardDescription className="text-caption">
              Live monthly revenue processed through Operator services and customer transactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-space-2">
            <BarChartCard
              data={chartData}
              index="month"
              categories={["revenue"]}
              colors={["#10b981"]}
              height={260}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
