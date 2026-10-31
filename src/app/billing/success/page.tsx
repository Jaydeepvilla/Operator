"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/shared/button";
import { formatMoney } from "@/lib/billing/catalog";

function BillingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pollingStatus, setPollingStatus] = useState<"polling" | "confirmed" | "timeout">("polling");
  const [subDetails, setSubDetails] = useState<any>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const res = await fetch("/api/billing/status");
        if (res.ok) {
          const data = await res.json();
          // Never trust redirect query params alone; require server subscription confirmation
          if (data.ready || (data.hasPaymentMethod && (data.state === "TRIALING" || data.state === "ACTIVE"))) {
            setSubDetails(data);
            setPollingStatus("confirmed");
            clearInterval(intervalId);
            return;
          }
        }
      } catch {
        // Continue polling
      }

      setAttempts((prev) => {
        if (prev >= 12) {
          // After ~18 seconds, allow user to proceed while webhooks finalize in background
          setPollingStatus("timeout");
          clearInterval(intervalId);
        }
        return prev + 1;
      });
    };

    // Initial check
    checkStatus();
    intervalId = setInterval(checkStatus, 1500);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
      <header className="border-b border-border/80 bg-card/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <span className="text-primary font-black">OPERATOR</span>
          <span className="text-muted-foreground text-xs font-semibold px-2 py-0.5 rounded-full bg-muted">
            Payment Confirmation
          </span>
        </Link>
      </header>

      <main className="flex-1 max-w-xl mx-auto px-6 py-16 w-full flex items-center justify-center">
        {pollingStatus === "polling" && (
          <div className="text-center space-y-4 p-8 rounded-2xl bg-card border border-border/80 shadow-sm w-full">
            <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
            <h1 className="text-xl font-bold">Verifying your payment authorization...</h1>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              We are connecting with the payment gateway to verify your mandate. This usually takes just a few seconds.
            </p>
          </div>
        )}

        {pollingStatus === "confirmed" && (
          <div className="text-center space-y-6 p-8 rounded-2xl bg-card border border-border/80 shadow-md w-full animate-fade-up">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Your 14-Day Trial is Active!</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Zero charges today. Your payment method has been verified and saved securely.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border/60 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Activated Plan:</span>
                <span className="font-bold text-foreground">{subDetails?.planName || "Pro"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trial Duration:</span>
                <span className="font-semibold text-emerald-400">14 Days Free</span>
              </div>
              {subDetails?.trialEndsAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">First Scheduled Charge:</span>
                  <span className="font-semibold text-foreground">
                    {new Date(subDetails.trialEndsAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button asChild size="lg" className="w-full font-bold shadow-md shadow-primary/25">
                <Link href="/onboarding">
                  Continue to AI Receptionist Onboarding
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground/80">
              A confirmation receipt has been sent to your registered email address.
            </p>
          </div>
        )}

        {pollingStatus === "timeout" && (
          <div className="text-center space-y-6 p-8 rounded-2xl bg-card border border-border/80 shadow-md w-full">
            <div className="h-14 w-14 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto">
              <ShieldCheck className="h-8 w-8" />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Authorization In Progress</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your payment mandate was safely received. Our automated billing reconciliation will confirm it momentarily.
              </p>
            </div>

            <Button asChild size="lg" className="w-full font-bold">
              <Link href="/onboarding">
                Proceed to Onboarding
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}
      </main>

      <footer className="border-t border-border/60 py-6 px-6 text-center text-xs text-muted-foreground">
        Operator AI • 256-bit Secure Mandate
      </footer>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      }
    >
      <BillingSuccessContent />
    </Suspense>
  );
}

