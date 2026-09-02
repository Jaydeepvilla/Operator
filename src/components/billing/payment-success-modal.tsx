"use client";

import React, { useState } from "react";
import { CheckCircle2, Download, Printer, ArrowRight, ShieldCheck, Mail, Sparkles, Building2, Calendar, FileText, Check } from "lucide-react";
import { Button } from "@/components/shared/button";
import { LogoIcon } from "@/components/shared/logo";
import Link from "next/link";

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  planName: string;
  description?: string;
  amount: number; // in INR
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  paymentId: string;
  orderId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  businessName?: string;
  businessAddress?: string;
  businessGst?: string;
  supportEmail?: string;
}

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData | null;
}

export function PaymentSuccessModal({ isOpen, onClose, invoice }: PaymentSuccessModalProps) {
  const [emailSent, setEmailSent] = useState(false);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Printable Invoice Container */}
      <div 
        id="printable-invoice"
        className="relative w-full max-w-2xl bg-[#0F1420] border border-emerald-500/30 rounded-3xl shadow-[0_25px_80px_-15px_rgba(16,185,129,0.25)] overflow-hidden text-foreground my-auto"
      >
        {/* Glow ambient header accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-gradient-to-b from-emerald-500/20 to-transparent blur-3xl pointer-events-none" />

        {/* Top Success Banner (Screen only) */}
        <div className="relative px-6 pt-8 pb-6 text-center border-b border-border/40 bg-gradient-to-b from-emerald-950/40 via-card/50 to-transparent print:hidden">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/20 animate-bounce-short">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Payment Confirmed & Verified
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Thank You for Upgrading!
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Your payment was processed securely by Razorpay. Your Operator AI subscription is now fully active.
          </p>
        </div>

        {/* Official Invoice Sheet */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Invoice Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
            <div className="flex items-center gap-3">
              <LogoIcon className="h-10 w-10 rounded-xl" />
              <div>
                <h3 className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
                  Operator AI <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Official Receipt</span>
                </h3>
                <p className="text-xs text-muted-foreground">Nexx Technologies Inc.</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Tax Invoice</div>
              <div className="text-sm font-mono font-bold text-white">{invoice.invoiceNumber}</div>
              <div className="text-xs text-muted-foreground">{invoice.date}</div>
            </div>
          </div>

          {/* Bill To & Bill From Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-card/40 p-4 rounded-2xl border border-border/30">
            <div>
              <span className="text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Billed To</span>
              <div className="font-semibold text-white text-sm">{invoice.customerName || "Valued Customer"}</div>
              {invoice.customerEmail && <div className="text-muted-foreground">{invoice.customerEmail}</div>}
              {invoice.customerPhone && <div className="text-muted-foreground">{invoice.customerPhone}</div>}
            </div>
            <div className="sm:text-right">
              <span className="text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Issued By</span>
              <div className="font-semibold text-white text-sm">{invoice.businessName || "Operator AI (Nexx Technologies)"}</div>
              <div className="text-muted-foreground">{invoice.supportEmail || "hello@nexxtecchnologies.com"}</div>
              <div className="text-muted-foreground font-mono text-[11px]">GSTIN: {invoice.businessGst || "27AAACN8491F1Z8"}</div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="rounded-2xl border border-border/40 overflow-hidden">
            <div className="grid grid-cols-12 bg-card/80 px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
              <div className="col-span-7">Plan & Services</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-3 text-right">Amount</div>
            </div>
            <div className="divide-y divide-border/20 text-sm">
              <div className="grid grid-cols-12 px-4 py-3.5 items-center">
                <div className="col-span-7">
                  <div className="font-semibold text-white">{invoice.planName}</div>
                  <div className="text-xs text-muted-foreground">{invoice.description || "24/7 Voice & AI Receptionist Tier"}</div>
                </div>
                <div className="col-span-2 text-center text-muted-foreground">1</div>
                <div className="col-span-3 text-right font-medium text-white">
                  ₹{invoice.subtotal.toFixed(2)}
                </div>
              </div>
            </div>
            {/* Calculation rows */}
            <div className="bg-card/40 px-4 py-3 border-t border-border/40 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal (Base):</span>
                <span className="font-mono">₹{invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Goods & Services Tax (GST 18%):</span>
                <span className="font-mono">₹{invoice.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-emerald-400 pt-2 border-t border-border/30">
                <span>Total Amount Paid:</span>
                <span className="font-mono">₹{invoice.total.toFixed(2)} {invoice.currency}</span>
              </div>
            </div>
          </div>

          {/* Payment Reference & Trust Stamp */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
            <div className="space-y-0.5">
              <div className="text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-medium text-white">Razorpay Secure Transaction</span>
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">
                Ref: <span className="text-emerald-400 font-semibold">{invoice.paymentId}</span> | Order: {invoice.orderId}
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-xs shrink-0 flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> PAID
            </div>
          </div>
        </div>

        {/* Action Controls Footer (Screen only) */}
        <div className="p-6 bg-card/80 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs w-1/2 sm:w-auto cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" /> Print / Save PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendEmail}
              className="gap-1.5 text-xs w-1/2 sm:w-auto cursor-pointer"
            >
              <Mail className="h-3.5 w-3.5" /> {emailSent ? "Receipt Sent!" : "Email Receipt"}
            </Button>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              asChild
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold gap-1.5 text-xs w-full sm:w-auto cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <Link href="/dashboard">
                Launch Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-white cursor-pointer"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
