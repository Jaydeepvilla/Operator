"use client";

import { useState, useTransition } from "react";
import { 
  CreditCard, 
  Sparkles, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  History, 
  Activity, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle,
  Download,
  Calendar,
  PhoneCall,
  MessageSquare,
  ShieldAlert,
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
}

export function BillingPortalClient({
  initialSubscription,
  initialAccount,
  initialInvoices,
  initialPayments,
  initialUsageCounters,
  paymentProvidersData
}: BillingPortalClientProps) {
  const [activeTab, setActiveTab] = useState<"plans" | "usage" | "invoices" | "providers">("plans");
  const [subscription, setSubscription] = useState(initialSubscription);
  const [invoices] = useState(initialInvoices || []);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const handleCancel = () => {
    const confirmationText = 
      "Cancel your subscription?\n\n" +
      "• Your AI receptionist will continue answering calls until the end of your billing period.\n" +
      "• After that, phone numbers will be released and live call answering will pause.\n" +
      "• You can reactivate anytime before your period ends.";
    if (!confirm(confirmationText)) return;

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
          text: errPayload.message || "We couldn't restore your subscription. Try again or contact support." 
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

  return (
    <div className="space-y-space-6">
      {/* Dynamic Tab Switcher */}
      <div className="flex gap-space-2 p-space-1 bg-muted/20 border border-border/20 radius-lg max-w-sm backdrop-blur-xs">
        <Button 
          variant={activeTab === "plans" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("plans")}
          className="flex-1 text-caption cursor-pointer"
        >
          <Sliders className="h-3.5 w-3.5 mr-space-2 text-primary" />
          Plans & Pricing
        </Button>
        <Button 
          variant={activeTab === "usage" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("usage")}
          className="flex-1 text-caption cursor-pointer"
        >
          <Activity className="h-3.5 w-3.5 mr-space-2 text-success" />
          Usage Counters
        </Button>
        <Button 
          variant={activeTab === "invoices" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("invoices")}
          className="flex-1 text-caption cursor-pointer"
        >
          <History className="h-3.5 w-3.5 mr-space-2 text-warning-500" />
          Statement Invoices
        </Button>
        <Button 
          variant={activeTab === "providers" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("providers")}
          className="flex-1 text-caption cursor-pointer"
        >
          <CreditCard className="h-3.5 w-3.5 mr-space-2 text-primary" />
          Payment Providers
        </Button>
      </div>

      {statusMessage && (
        <div className={`p-space-3 radius-lg flex items-start gap-space-2 text-caption max-w-5xl ${
          statusMessage.type === "success" 
            ? "bg-success-500/10 text-success border border-success-500/20" 
            : statusMessage.type === "info"
            ? "bg-primary/10 text-primary border border-primary/20"
            : "bg-destructive/10 text-destructive border border-error-500/20"
        }`}>
          {statusMessage.type === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0 mt-space-1" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-space-1" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {activeTab === "plans" && (
        <div className="space-y-space-8">
          {/* Dynamic Active State Banner */}
          <Card className={`border max-w-5xl ${
            isSuspended 
              ? "bg-destructive/5 border-destructive/30" 
              : isPastDue 
              ? "bg-warning-500/5 border-warning-500/30" 
              : isCanceling
              ? "bg-warning-500/5 border-warning-500/20"
              : "bg-card/45 border-primary/20 bg-primary/5"
          }`}>
            <CardContent className="p-space-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-space-4">
              <div className="flex items-center gap-space-3">
                <div className={`h-10 w-10 radius-lg flex items-center justify-center ${
                  isSuspended 
                    ? "bg-destructive/15 text-destructive" 
                    : isPastDue 
                    ? "bg-warning-500/15 text-warning-500" 
                    : "bg-primary/10 text-primary"
                }`}>
                  {isSuspended || isPastDue ? <ShieldAlert className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-foreground font-semibold flex items-center gap-2">
                    <span>Active Plan: {subscription?.plan?.name || currentPlanId.toUpperCase()}</span>
                    <span className={`text-[10px] px-2 py-0.5 radius-full font-mono uppercase font-semibold ${
                      isSuspended
                        ? "bg-destructive/15 text-destructive"
                        : isPastDue
                        ? "bg-warning-500/15 text-warning-500"
                        : isCanceling
                        ? "bg-muted text-muted-foreground"
                        : isTrial
                        ? "bg-primary/20 text-primary"
                        : "bg-success/20 text-success"
                    }`}>
                      {subState}
                    </span>
                  </h3>
                  <p className="text-caption text-muted-foreground mt-space-1">
                    {isSuspended ? (
                      "Your Operator services are currently suspended. Update your payment method to restore live call handling immediately."
                    ) : isPastDue ? (
                      `Payment failed. You have ${subscription?.gracePeriodDaysRemaining ?? 5} days remaining in your grace period before suspension.`
                    ) : isCanceling ? (
                      `Active until ${subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "period end"}. Cancellation is scheduled.`
                    ) : isTrial ? (
                      `Free trial active (${subscription?.trialDaysRemaining ?? 14} days remaining). Full features enabled.`
                    ) : (
                      `Billing period renews on ${subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "next reset date"}.`
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isCanceling ? (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={handleRevokeCancellation}
                    disabled={isPending}
                    className="cursor-pointer"
                  >
                    Reactivate Subscription
                  </Button>
                ) : !isSuspended && !isTrial && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCancel}
                    disabled={isPending}
                    className="text-destructive hover:text-error-500 hover:bg-destructive/10 cursor-pointer text-caption"
                  >
                    Cancel Plan
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Pricing Grid generated directly from PLAN_CATALOG */}
          <div className="grid gap-space-6 md:grid-cols-3 max-w-5xl">
            {dynamicPlans.map((tier: PlanConfig) => {
              const isActive = currentPlanId === tier.id;
              const featuresList = [
                `${tier.limits.conversations.toLocaleString()} Conversations / mo`,
                `${tier.limits.voiceMinutes.toLocaleString()} Voice AI Minutes`,
                tier.limits.calendars === null ? "Unlimited Calendar Sync" : `${tier.limits.calendars} Calendar Integration`,
                tier.features.whatsapp ? "WhatsApp & Social Messaging" : "SMS & Website Widget Included",
                tier.features.customAiTraining ? "Custom AI Model Training" : "Standard AI Templates",
              ];

              return (
                <Card 
                  key={tier.id} 
                  className={`flex flex-col justify-between border-border/60 bg-card/30 backdrop-blur-xs relative overflow-hidden ${
                    isActive ? "border-primary ring-1 ring-primary" : ""
                  }`}
                >
                  {tier.badge && (
                    <div className="absolute top-space-0 right-space-0 rounded-bl-lg bg-primary px-space-2 py-space-1 text-caption uppercase tracking-wider text-primary-foreground font-semibold">
                      {tier.badge}
                    </div>
                  )}
                  <div>
                    <CardHeader>
                      <CardTitle className="text-body-md font-semibold">{tier.name}</CardTitle>
                      <CardDescription className="text-caption min-h-9">{tier.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-space-4">
                      <div className="flex items-baseline gap-space-1">
                        <span className="text-heading-lg font-bold text-foreground font-mono">${tier.price}</span>
                        <span className="text-caption text-muted-foreground">/month</span>
                      </div>
                      <div className="h-px bg-border/20" />
                      <ul className="space-y-space-2 text-caption text-muted-foreground">
                        {featuresList.map((feat, idx) => (
                          <li key={idx} className="flex items-center gap-space-2">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </div>
                  <CardFooter className="pt-space-6 border-t border-border/10 flex flex-col gap-2">
                    {isActive ? (
                      <Button variant="outline" disabled className="w-full text-caption">
                        Current Plan
                      </Button>
                    ) : (
                      <div className="w-full space-y-2">
                        <Button
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handlePlanChange(tier.id)}
                          className="w-full text-caption cursor-pointer"
                        >
                          {isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-space-2" /> : null}
                          Switch to {tier.name}
                        </Button>
                        <RazorpayCheckoutButton
                          amountInPaise={tier.price * 100}
                          planName={tier.name}
                          description={`Instant subscription for ${tier.name} Plan`}
                          prefill={{
                            email: initialAccount?.email || "",
                            name: initialAccount?.name || "Business Admin",
                          }}
                          onSuccess={async (payment) => {
                            setStatusMessage({
                              type: "success",
                              text: `Payment verified (${payment.payment_id}). Upgrading plan to ${tier.name}...`,
                            });
                            await handlePlanChange(tier.id);
                          }}
                          onError={(err) => {
                            setStatusMessage({
                              type: "error",
                              text: err?.message || "Payment checkout cancelled.",
                            });
                          }}
                          className="w-full text-caption cursor-pointer"
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-space-2 text-primary" />
                          Pay with Razorpay (${tier.price})
                        </RazorpayCheckoutButton>
                      </div>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "usage" && (
        <Card className="bg-card/45 border border-border/50 max-w-5xl">
          <CardHeader>
            <CardTitle className="text-body-md font-semibold flex items-center gap-space-2">
              <Activity className="h-5 w-5 text-primary" />
              Dynamic Resource Metering
            </CardTitle>
            <CardDescription className="text-caption">
              Track real-time monthly usage against current plan limits. Resets each billing period.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-space-6">
            <div className="grid gap-space-6 sm:grid-cols-3">
              {/* Conversations Meter */}
              <div className="space-y-space-2 p-space-4 radius-lg bg-background/30 border border-border/20">
                <div className="flex items-center gap-2 text-caption font-semibold">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span>Conversations</span>
                </div>
                <div className="flex justify-between text-caption font-mono text-muted-foreground">
                  <span>{convUsage.toLocaleString()} used</span>
                  <span>{convLimit.toLocaleString()} limit</span>
                </div>
                <div className="w-full bg-border/40 h-2 radius-md overflow-hidden">
                  <div 
                    className={`h-full radius-md transition-all ${
                      convPercent >= 90 ? "bg-destructive" : convPercent >= 80 ? "bg-warning-500" : "bg-primary"
                    }`}
                    style={{ width: `${convPercent}%` }} 
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">{convPercent}% of allowance used</p>
              </div>

              {/* Voice Minutes Meter */}
              <div className="space-y-space-2 p-space-4 radius-lg bg-background/30 border border-border/20">
                <div className="flex items-center gap-2 text-caption font-semibold">
                  <PhoneCall className="h-4 w-4 text-success" />
                  <span>Voice AI Minutes</span>
                </div>
                <div className="flex justify-between text-caption font-mono text-muted-foreground">
                  <span>{voiceUsage.toLocaleString()} min</span>
                  <span>{voiceLimit.toLocaleString()} min</span>
                </div>
                <div className="w-full bg-border/40 h-2 radius-md overflow-hidden">
                  <div 
                    className={`h-full radius-md transition-all ${
                      voicePercent >= 90 ? "bg-destructive" : voicePercent >= 80 ? "bg-warning-500" : "bg-success"
                    }`}
                    style={{ width: `${voicePercent}%` }} 
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">{voicePercent}% of minutes used</p>
              </div>

              {/* Calendar Connections Meter */}
              <div className="space-y-space-2 p-space-4 radius-lg bg-background/30 border border-border/20">
                <div className="flex items-center gap-2 text-caption font-semibold">
                  <Calendar className="h-4 w-4 text-warning-500" />
                  <span>Calendar Integrations</span>
                </div>
                <div className="flex justify-between text-caption font-mono text-muted-foreground">
                  <span>{calUsage} connected</span>
                  <span>{calLimit === null ? "Unlimited" : `${calLimit} max`}</span>
                </div>
                <div className="w-full bg-border/40 h-2 radius-md overflow-hidden">
                  <div 
                    className="bg-primary h-full radius-md transition-all" 
                    style={{ width: calLimit === null ? "25%" : `${Math.min(100, Math.round((calUsage / calLimit) * 100))}%` }} 
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {calLimit === null ? "Unlimited calendar integrations included" : `${calLimit - calUsage} available slots remaining`}
                </p>
              </div>
            </div>

            {/* Smart Progressive Warning Banners */}
            {convPercent >= 100 ? (
              <div className="p-space-3 radius-lg border border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-space-2 text-caption">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-space-1 text-destructive" />
                <div>
                  <span className="font-semibold">Monthly conversation limit reached:</span>
                  <p className="mt-space-1 text-muted-foreground">
                    You have used all {convLimit.toLocaleString()} included conversations for this period. Upgrade your plan to resume uninterrupted AI call handling.
                  </p>
                </div>
              </div>
            ) : convPercent >= 90 ? (
              <div className="p-space-3 radius-lg border border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-space-2 text-caption">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-space-1" />
                <div>
                  <span className="font-semibold">You've used {convPercent}% of your monthly conversations:</span>
                  <p className="mt-space-1 text-muted-foreground">
                    Consider upgrading your plan before reaching the limit to prevent call answering interruptions.
                  </p>
                </div>
              </div>
            ) : convPercent >= 80 ? (
              <div className="p-space-3 radius-lg border border-warning-500/20 bg-warning-500/5 text-warning-500 flex items-start gap-space-2 text-caption">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-space-1" />
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

      {activeTab === "invoices" && (
        <Card className="bg-card/45 border border-border/50 max-w-5xl">
          <CardHeader>
            <CardTitle className="text-body-md font-semibold flex items-center gap-space-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Invoices & Statement Log
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
                          <span className={`inline-flex items-center px-space-2 py-space-1 radius-md text-caption uppercase tracking-wider font-semibold ${
                            inv.status === "paid" 
                              ? "bg-success-500/10 text-success-500 border border-success-500/20" 
                              : "bg-warning-500/10 text-warning-500 border border-warning-500/20"
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

      {activeTab === "providers" && paymentProvidersData && (
        <Card className="bg-card/45 border border-border/50 max-w-5xl">
          <CardHeader>
            <CardTitle className="text-body-md font-semibold flex items-center gap-space-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Global Payment Networks
            </CardTitle>
            <CardDescription className="text-caption">
              Setup and manage multiple international checkout networks dynamically filtered for your region.
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
    </div>
  );
}
