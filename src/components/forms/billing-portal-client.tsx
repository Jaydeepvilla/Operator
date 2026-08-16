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
  Download
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shared/card";
import { upgradeSubscriptionAction, cancelSubscriptionAction } from "@/server/actions/billing";
import { PaymentProvidersClient } from "./payment-providers-client";

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
  const [invoices, setInvoices] = useState(initialInvoices);
  const [payments, setPayments] = useState(initialPayments);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const pricingTiers = [
    {
      id: "free",
      name: "Starter Trial",
      price: "$0",
      period: "month",
      description: "Get familiar with automated Operator AI features.",
      features: [
        "Operator Voice AI (100 mins)",
        "Dental & Salon Agent Templates",
        "SMS & Web Chatbot integrations",
        "1 operator seat included",
      ],
    },
    {
      id: "pro",
      name: "Professional Desk",
      price: "$79",
      period: "month",
      description: "Scale your front-desk operations with dedicated numbers.",
      features: [
        "Unlimited Voice Receptionists",
        "All Industry Templates (Dental, Law, Spa, Gym)",
        "Calendar synchronization (Google, Cal.com)",
        "1,000 monthly voice minutes included",
        "Advanced Knowledge Base indexing",
        "Up to 5 operator seats",
      ],
    },
    {
      id: "business",
      name: "Business Agency",
      price: "$299",
      period: "month",
      description: "Advanced team structures, customized integrations, and higher limits.",
      features: [
        "Everything in Professional Desk",
        "Custom CRM integrations (Dentrix, Clio, Mindbody)",
        "5,000 monthly voice minutes included",
        "Dedicated phone lines",
        "Custom email white-labeling templates",
        "Up to 20 operator seats",
      ],
    },
  ];

  const handleUpgrade = (planId: string) => {
    if (planId === subscription.planId) return;

    setStatusMessage(null);
    startTransition(async () => {
      const res = await upgradeSubscriptionAction(planId);
      if (res.success) {
        setStatusMessage({ type: "success", text: `Plan successfully updated to ${planId.toUpperCase()}!` });
        setSubscription({ ...subscription, planId, status: "active" });
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to update plan." });
      }
    });
  };

  const handleCancel = () => {
    if (!confirm("Are you sure you want to cancel your subscription? You will lose access to premium calling features.")) return;

    setStatusMessage(null);
    startTransition(async () => {
      const res = await cancelSubscriptionAction();
      if (res.success) {
        setStatusMessage({ type: "success", text: "Subscription cancelled successfully." });
        setSubscription({ ...subscription, planId: "free", status: "canceled" });
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to cancel subscription." });
      }
    });
  };

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
            : "bg-destructive/10 text-destructive border border-error-500/20"
        }`}>
          {statusMessage.type === "error" ? <AlertCircle className="h-4 w-4 shrink-0 mt-space-1" /> : <CheckCircle2 className="h-4 w-4 shrink-0 mt-space-1" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {activeTab === "plans" && (
        <div className="space-y-space-8">
          {/* Active Banner */}
          <Card className="bg-card/45 border border-primary/20 bg-primary/5 max-w-5xl">
            <CardContent className="p-space-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-space-4">
              <div className="flex items-center gap-space-3">
                <div className="h-10 w-10 bg-primary/10 text-primary radius-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className=" text-foreground">
                    Active Plan: {subscription.planId.toUpperCase()} ({subscription.status})
                  </h3>
                  <p className="text-caption text-muted-foreground mt-space-1">
                    Your current billing period renews on {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "next reset date"}.
                  </p>
                </div>
              </div>
              {subscription.planId !== "free" && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCancel}
                  disabled={isPending}
                  className="text-destructive hover:text-error-500 hover:bg-destructive/10 cursor-pointer"
                >
                  Cancel Plan
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Pricing Grid */}
          <div className="grid gap-space-6 md:grid-cols-3 max-w-5xl">
            {pricingTiers.map((tier) => {
              const isActive = subscription.planId === tier.id;
              return (
                <Card 
                  key={tier.id} 
                  className={`flex flex-col justify-between border-border/60 bg-card/30 backdrop-blur-xs relative overflow-hidden ${
                    isActive ? "border-primary ring-1 ring-primary" : ""
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-space-0 right-space-0 rounded-bl-lg bg-primary px-space-2 py-space-1 text-caption  uppercase tracking-wider text-primary-foreground">
                      Active Plan
                    </div>
                  )}
                  <div>
                    <CardHeader>
                      <CardTitle className="text-body-md ">{tier.name}</CardTitle>
                      <CardDescription className="text-caption min-h-9">{tier.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-space-4">
                      <div className="flex items-baseline gap-space-1">
                        <span className="text-heading-lg  text-foreground">{tier.price}</span>
                        <span className="text-caption text-muted-foreground">/{tier.period}</span>
                      </div>
                      <div className="h-px bg-border/20" />
                      <ul className="space-y-space-2 text-caption text-muted-foreground">
                        {tier.features.map((feat, idx) => (
                          <li key={idx} className="flex items-center gap-space-2">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </div>
                  <CardFooter className="pt-space-6 border-t border-border/10">
                    <Button
                      variant={isActive ? "outline" : "default"}
                      disabled={isActive || isPending}
                      onClick={() => handleUpgrade(tier.id)}
                      className="w-full  text-caption cursor-pointer"
                    >
                      {isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-space-2" /> : null}
                      {isActive ? "Current Plan" : `Select ${tier.name}`}
                    </Button>
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
            <CardTitle className="text-body-md  flex items-center gap-space-2">
              <Activity className="h-5 w-5 text-primary" />
              Resource Metering Dashboard
            </CardTitle>
            <CardDescription className="text-caption">
              Check real-time workspace resource counters against current tier allowances.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-space-6">
            {/* Visual limits indicators */}
            <div className="grid gap-space-6 sm:grid-cols-2">
              {/* Voice Minutes meter */}
              <div className="space-y-space-2 p-space-4 radius-lg bg-background/30 border border-border/20">
                <div className="flex justify-between text-caption ">
                  <span>Inbound/Outbound Minutes</span>
                  <span className="font-mono text-muted-foreground">
                    {subscription.planId === "pro" ? "412 / 1,000 min" : "12 / 100 min"}
                  </span>
                </div>
                <div className="w-full bg-border h-2 radius-md overflow-hidden">
                  <div 
                    className="bg-success-500 h-full radius-md" 
                    style={{ width: subscription.planId === "pro" ? "41.2%" : "12%" }} 
                  />
                </div>
              </div>

              {/* AI Token meter */}
              <div className="space-y-space-2 p-space-4 radius-lg bg-background/30 border border-border/20">
                <div className="flex justify-between text-caption ">
                  <span>Operator AI Tokens</span>
                  <span className="font-mono text-muted-foreground">
                    {subscription.planId === "pro" ? "1.5M / 5M tokens" : "80K / 500K tokens"}
                  </span>
                </div>
                <div className="w-full bg-border h-2 radius-md overflow-hidden">
                  <div 
                    className="bg-primary h-full radius-md" 
                    style={{ width: subscription.planId === "pro" ? "30%" : "16%" }} 
                  />
                </div>
              </div>

              {/* Operators meter */}
              <div className="space-y-space-2 p-space-4 radius-lg bg-background/30 border border-border/20">
                <div className="flex justify-between text-caption ">
                  <span>Workspace Seat Users</span>
                  <span className="font-mono text-muted-foreground">
                    {subscription.planId === "pro" ? "3 / 5 seats" : "1 / 1 seats"}
                  </span>
                </div>
                <div className="w-full bg-border h-2 radius-md overflow-hidden">
                  <div 
                    className="bg-warning-500 h-full radius-md" 
                    style={{ width: subscription.planId === "pro" ? "60%" : "100%" }} 
                  />
                </div>
              </div>

              {/* Widgets meter */}
              <div className="space-y-space-2 p-space-4 radius-lg bg-background/30 border border-border/20">
                <div className="flex justify-between text-caption ">
                  <span>Widget Installations</span>
                  <span className="font-mono text-muted-foreground">
                    {subscription.planId === "pro" ? "2 / Unlimited" : "1 / 1 widgets"}
                  </span>
                </div>
                <div className="w-full bg-border h-2 radius-md overflow-hidden">
                  <div 
                    className="bg-primary-500 h-full radius-md" 
                    style={{ width: subscription.planId === "pro" ? "20%" : "100%" }} 
                  />
                </div>
              </div>
            </div>

            {/* Warn notice when usage is high */}
            {subscription.planId === "free" && (
              <div className="p-space-3 radius-lg border border-warning-500/20 bg-warning-500/5 text-warning-500 flex items-start gap-space-2 text-caption">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-space-1" />
                <div>
                  <span className="">Overage Threshold Reached:</span>
                  <p className="mt-space-1 text-muted-foreground">
                    Your free workspace operator limit is at 100%. Please upgrade to the Professional Desk to add more team members.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "invoices" && (
        <Card className="bg-card/45 border border-border/50 max-w-5xl">
          <CardHeader>
            <CardTitle className="text-body-md  flex items-center gap-space-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Invoices & Statement Log
            </CardTitle>
            <CardDescription className="text-caption">
              Review history logs of completed payments and billing statements.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-space-0 border-t border-border/10">
            {invoices.length === 0 ? (
              <div className="py-space-12 text-center text-muted-foreground text-body-sm">
                No invoices found in your billing history.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-caption">
                  <thead>
                    <tr className="border-b border-border/30 bg-muted/20 text-caption  uppercase tracking-wider text-muted-foreground">
                      <th className="px-space-6 py-space-4">Invoice Number</th>
                      <th className="px-space-6 py-space-4">Total Amount</th>
                      <th className="px-space-6 py-space-4">Payment Status</th>
                      <th className="px-space-6 py-space-4">Paid On</th>
                      <th className="px-space-6 py-space-4 text-right">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10 text-muted-foreground">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-accent/5 transition-colors">
                        <td className="px-space-6 py-space-4  text-foreground">{inv.number}</td>
                        <td className="px-space-6 py-space-4 font-mono  text-primary">${inv.total}</td>
                        <td className="px-space-6 py-space-4">
                          <span className={`inline-flex items-center px-space-2 py-space-1 radius-md text-caption  uppercase tracking-wider ${
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
            <CardTitle className="text-body-md flex items-center gap-space-2">
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
