"use client";

import React, { useState, useTransition } from "react";
import { 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  ArrowLeft,
  Building,
  Check
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { confirmPublicCustomerPaymentAction } from "@/server/actions/public-booking";
import Link from "next/link";

interface CustomerCheckoutClientProps {
  payment: {
    id: string;
    amount: string;
    currency: string;
    type: string;
    status: string;
    provider: string;
    businessName: string;
    businessSlug: string;
    serviceName: string;
  };
  token: string;
}

export function CustomerCheckoutClient({ payment, token }: CustomerCheckoutClientProps) {
  const [isProcessing, startProcessing] = useTransition();
  const [isPaid, setIsPaid] = useState(payment.status === "captured");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<any | null>(null);

  const handlePayNow = () => {
    setErrorMessage(null);
    startProcessing(async () => {
      const res = await confirmPublicCustomerPaymentAction(payment.id);
      if (res.success) {
        setIsPaid(true);
        if (res.appointment) {
          setConfirmedAppointment(res.appointment);
        }
      } else {
        setErrorMessage(res.error || "Payment processing failed. Please try again.");
      }
    });
  };

  if (isPaid) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-8 text-center space-y-6 shadow-sm animate-fade-in">
        <div className="h-16 w-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Payment & Appointment Confirmed!
          </h1>
          <p className="text-sm text-muted-foreground">
            We have captured your {payment.type} of ${payment.amount} {payment.currency} for {payment.businessName}.
          </p>
        </div>

        <div className="bg-muted/40 border border-border/60 rounded-xl p-4 text-left text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service:</span>
            <span className="font-semibold text-foreground">{payment.serviceName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount Paid:</span>
            <span className="font-semibold text-foreground">${payment.amount} {payment.currency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Transaction ID:</span>
            <span className="font-mono text-muted-foreground">{payment.id}</span>
          </div>
          {confirmedAppointment && (
            <div className="flex justify-between pt-1 border-t border-border/40">
              <span className="text-muted-foreground">Booking ID:</span>
              <span className="font-mono font-semibold text-foreground">{confirmedAppointment.id}</span>
            </div>
          )}
        </div>

        <div className="pt-2">
          {payment.businessSlug ? (
            <Link href={`/book/${payment.businessSlug}`}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Return to {payment.businessName}</span>
              </Button>
            </Link>
          ) : (
            <Link href="/">
              <Button variant="outline">Done</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Appointment Checkout
          </span>
          <h1 className="text-xl font-bold text-foreground mt-0.5">
            {payment.businessName}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 text-emerald-500" />
          <span>Secure SSL</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm flex items-start gap-2 animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Payment Item Details */}
      <div className="space-y-3 bg-muted/30 border border-border/60 rounded-xl p-4 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Service</span>
          <span className="font-medium text-foreground">{payment.serviceName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Payment Type</span>
          <span className="font-medium text-foreground capitalize">{payment.type.replace("_", " ")}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-border/40 text-base">
          <span className="font-semibold text-foreground">Total Due Now</span>
          <span className="font-bold text-foreground text-lg">
            ${payment.amount} <span className="text-xs text-muted-foreground font-normal">{payment.currency}</span>
          </span>
        </div>
      </div>

      {/* Security & Direct Settlement Notice */}
      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1">
        <div className="font-medium text-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Direct Merchant Settlement</span>
        </div>
        <p>
          You are paying {payment.businessName} directly. Operator coordinates booking verification without holding card details.
        </p>
      </div>

      {/* Submit Payment Action */}
      <div className="pt-2 space-y-3">
        <Button
          type="button"
          disabled={isProcessing}
          onClick={handlePayNow}
          className="w-full py-6 font-semibold text-base gap-2"
        >
          {isProcessing ? (
            <span>Authorizing Payment...</span>
          ) : (
            <>
              <CreditCard className="h-5 w-5" />
              <span>Pay ${payment.amount} & Confirm Appointment</span>
            </>
          )}
        </Button>

        {payment.businessSlug && (
          <div className="text-center">
            <Link
              href={`/book/${payment.businessSlug}`}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Cancel and return to booking</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
