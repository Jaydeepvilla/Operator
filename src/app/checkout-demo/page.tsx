"use client";

import React, { useState } from "react";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { RazorpayCheckoutButton } from "@/components/billing/razorpay-checkout-button";
import { Shield, CheckCircle2, CreditCard, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CheckoutDemoPage() {
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "pro" | "custom">("pro");
  const [customAmount, setCustomAmount] = useState("499");
  const [customerName, setCustomerName] = useState("Demo User");
  const [customerEmail, setCustomerEmail] = useState("customer@nexxtecchnologies.com");
  const [customerPhone, setCustomerPhone] = useState("9876543210");
  const [lastPayment, setLastPayment] = useState<any>(null);

  const getAmountInPaise = () => {
    if (selectedPlan === "starter") return 4900; // ₹49.00
    if (selectedPlan === "pro") return 14900; // ₹149.00
    const amt = parseFloat(customAmount);
    return isNaN(amt) ? 10000 : Math.max(100, Math.round(amt * 100));
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />

      <main className="flex-1 py-16 px-6 max-w-4xl mx-auto w-full pt-32">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold text-primary mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Razorpay Standard Web Checkout Integration
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Test Razorpay Payment Flow
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Test order creation (<code>/api/create-order</code>), interactive popup modal, and
            HMAC-SHA256 signature verification (<code>/api/verify-payment</code>) with your Razorpay Test Credentials.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Left Column: Configuration */}
          <div className="bg-card border border-border/70 rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              1. Select Plan or Custom Amount
            </h2>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedPlan("starter")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedPlan === "starter"
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <div className="text-xs text-muted-foreground">Starter</div>
                <div className="text-base font-bold">₹49</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan("pro")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedPlan === "pro"
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <div className="text-xs text-muted-foreground">Pro Plan</div>
                <div className="text-base font-bold">₹149</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan("custom")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedPlan === "custom"
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <div className="text-xs text-muted-foreground">Custom</div>
                <div className="text-base font-bold">₹ Custom</div>
              </button>
            </div>

            {selectedPlan === "custom" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Amount in INR (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border/80 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter amount (e.g. 500)"
                />
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-border/60">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Prefill Customer Details
              </h3>
              <div>
                <label className="text-xs text-muted-foreground">Full Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm mt-1 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email Address</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm mt-1 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Phone Number</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm mt-1 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Checkout Execution & Verification Status */}
          <div className="bg-card border border-border/70 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
                <Shield className="h-4 w-4 text-emerald-500" />
                2. Execute Razorpay Standard Checkout
              </h2>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Selected Item:</span>
                  <span className="font-medium capitalize">{selectedPlan} Plan</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Payable:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{(getAmountInPaise() / 100).toFixed(2)} INR
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Test Key ID:</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    rzp_test_TVtKeJYufz4TgQ
                  </span>
                </div>
              </div>

              <RazorpayCheckoutButton
                amountInPaise={getAmountInPaise()}
                planName={`${selectedPlan.toUpperCase()} Plan`}
                prefill={{
                  name: customerName,
                  email: customerEmail,
                  contact: customerPhone,
                }}
                onSuccess={(data) => {
                  setLastPayment(data);
                }}
                className="w-full py-6 text-base font-semibold"
              />
            </div>

            {lastPayment && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-card to-[#0B0F19] border border-emerald-500/30 text-foreground text-xs space-y-3 shadow-lg shadow-emerald-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Official Payment Verified
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                    STATUS: PAID
                  </span>
                </div>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Transaction Ref:</span>
                    <span className="font-mono text-white font-medium">{lastPayment.payment_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Razorpay Order:</span>
                    <span className="font-mono text-white">{lastPayment.order_id}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border/60 text-xs text-muted-foreground flex justify-between items-center">
              <span>Uses Razorpay Standard Modal (v1/checkout.js)</span>
              <Link href="/pricing" className="text-primary hover:underline inline-flex items-center gap-1">
                View Pricing <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
