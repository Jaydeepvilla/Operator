"use client";

import { useState } from "react";
import { m } from "framer-motion";
import { hoverScale } from "@/components/motion/hover";
import { Card } from "@/components/shared/card";
import {
  CalendarPlus,
  UserPlus,
  BrainCircuit,
  Settings2,
  Share2,
  Tv,
  ArrowUpRight,
  Zap,
  Loader2,
  Calendar,
  User,
  Mail,
  Phone,
  DollarSign,
  Clock,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { APP_ROUTES } from "@/lib/constants/routes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/shared/dialog";
import { Input } from "@/components/shared/input";
import { Button } from "@/components/shared/button";
import { quickCreateAppointmentAction } from "@/server/actions/appointments";
import { createContactAction } from "@/server/actions/omnichannel";
import { createFaqAction } from "@/server/actions/faq";

interface QuickActionsWidgetProps {
  onActionSuccess?: () => void;
}

export function QuickActionsWidget({ onActionSuccess }: QuickActionsWidgetProps) {
  // Modal states
  const [activeModal, setActiveModal] = useState<"appointment" | "customer" | "knowledge" | null>(null);

  // Appointment Form State
  const [aptName, setAptName] = useState("");
  const [aptPhone, setAptPhone] = useState("");
  const [aptEmail, setAptEmail] = useState("");
  const [aptService, setAptService] = useState("Consultation");
  const [aptDateTime, setAptDateTime] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [aptPrice, setAptPrice] = useState("");
  const [isSubmittingApt, setIsSubmittingApt] = useState(false);
  const [aptError, setAptError] = useState("");
  const [aptSuccess, setAptSuccess] = useState(false);

  // Customer Form State
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custStatus, setCustStatus] = useState("New");
  const [custNotes, setCustNotes] = useState("");
  const [isSubmittingCust, setIsSubmittingCust] = useState(false);
  const [custError, setCustError] = useState("");
  const [custSuccess, setCustSuccess] = useState(false);

  // Knowledge Form State
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [faqCategory, setFaqCategory] = useState("General");
  const [isSubmittingFaq, setIsSubmittingFaq] = useState(false);
  const [faqError, setFaqError] = useState("");
  const [faqSuccess, setFaqSuccess] = useState(false);

  // Reset forms on open
  const openModal = (type: "appointment" | "customer" | "knowledge") => {
    setActiveModal(type);
    setAptError("");
    setAptSuccess(false);
    setCustError("");
    setCustSuccess(false);
    setFaqError("");
    setFaqSuccess(false);
  };

  // Submit Appointment
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aptName.trim()) {
      setAptError("Customer name is required");
      return;
    }
    setIsSubmittingApt(true);
    setAptError("");
    try {
      const res = await quickCreateAppointmentAction({
        customerName: aptName.trim(),
        customerPhone: aptPhone.trim() || null,
        customerEmail: aptEmail.trim() || null,
        serviceName: aptService.trim() || "Consultation",
        startTime: new Date(aptDateTime).toISOString(),
        price: aptPrice.trim() || null,
      });

      if (res.success) {
        setAptSuccess(true);
        onActionSuccess?.();
        setTimeout(() => {
          setActiveModal(null);
          setAptName("");
          setAptPhone("");
          setAptEmail("");
          setAptPrice("");
          setAptSuccess(false);
        }, 1200);
      } else {
        setAptError(res.error || "Failed to create appointment");
      }
    } catch (err: any) {
      setAptError(err?.message || "An unexpected error occurred");
    } finally {
      setIsSubmittingApt(false);
    }
  };

  // Submit Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) {
      setCustError("Customer name is required");
      return;
    }
    setIsSubmittingCust(true);
    setCustError("");
    try {
      const res = await createContactAction({
        name: custName.trim(),
        phone: custPhone.trim() || null,
        email: custEmail.trim() || null,
        status: custStatus,
        notes: custNotes.trim() || null,
      });

      if (res.success) {
        setCustSuccess(true);
        onActionSuccess?.();
        setTimeout(() => {
          setActiveModal(null);
          setCustName("");
          setCustPhone("");
          setCustEmail("");
          setCustNotes("");
          setCustSuccess(false);
        }, 1200);
      } else {
        setCustError(res.error || "Failed to create customer");
      }
    } catch (err: any) {
      setCustError(err?.message || "An unexpected error occurred");
    } finally {
      setIsSubmittingCust(false);
    }
  };

  // Submit FAQ
  const handleCreateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      setFaqError("Question and answer are required");
      return;
    }
    setIsSubmittingFaq(true);
    setFaqError("");
    try {
      const res = await createFaqAction({
        question: faqQuestion.trim(),
        answer: faqAnswer.trim(),
        category: faqCategory,
      });

      if (res.success) {
        setFaqSuccess(true);
        onActionSuccess?.();
        setTimeout(() => {
          setActiveModal(null);
          setFaqQuestion("");
          setFaqAnswer("");
          setFaqSuccess(false);
        }, 1200);
      } else {
        setFaqError(res.error || "Failed to save FAQ");
      }
    } catch (err: any) {
      setFaqError(err?.message || "An unexpected error occurred");
    } finally {
      setIsSubmittingFaq(false);
    }
  };

  return (
    <>
      <m.div whileHover={hoverScale} className="h-full flex flex-col">
        <Card className="w-full h-full flex flex-col overflow-hidden border border-border/80">
          {/* Header bar */}
          <div className="flex items-center justify-between px-space-5 py-space-3.5 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-space-2">
              <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-caption font-bold text-foreground tracking-wide">
                Quick Actions
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                1-Click Execution
              </span>
            </div>
            <span className="text-caption text-muted-foreground font-medium hidden sm:block">
              Add bookings & customers instantly
            </span>
          </div>

          {/* Action Grid */}
          <div className="px-space-4 pb-space-4 pt-space-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-space-3">
              {/* 1. New Appointment (Modal Trigger) */}
              <div className="relative">
                <div className="absolute -top-3.5 inset-x-0 flex justify-center z-20 pointer-events-none">
                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-gradient-to-r from-primary to-violet-500 text-white shadow-md shadow-primary/40 ring-2 ring-[hsl(var(--foreground)/0.08)]">
                    <Zap className="w-2.5 h-2.5 fill-white/80 stroke-none" />
                    Most Used
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openModal("appointment")}
                  className="w-full text-left group relative flex flex-col items-start gap-space-2.5 p-space-4 rounded-xl border border-primary/30 bg-card hover:border-primary/60 hover:bg-primary/[0.03] hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer h-full"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none rounded-xl" />
                  <div className="flex items-start justify-between w-full">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                      <CalendarPlus className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-[11px] font-semibold text-primary opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
                      Book <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
                    </span>
                  </div>
                  <div className="min-w-0 w-full">
                    <span className="text-body-sm font-bold text-foreground block leading-snug group-hover:text-primary transition-colors duration-150">
                      New Appointment
                    </span>
                    <p className="text-caption font-normal text-muted-foreground mt-space-0.5 block leading-relaxed line-clamp-2">
                      Schedule customer booking
                    </p>
                  </div>
                </button>
              </div>

              {/* 2. Add Customer (Modal Trigger) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => openModal("customer")}
                  className="w-full text-left group relative flex flex-col items-start gap-space-2.5 p-space-4 rounded-xl border border-border/80 bg-card hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer h-full"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none rounded-xl" />
                  <div className="flex items-start justify-between w-full">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-transform duration-200 group-hover:scale-105">
                      <UserPlus className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
                      Add <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
                    </span>
                  </div>
                  <div className="min-w-0 w-full">
                    <span className="text-body-sm font-bold text-foreground block leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-150">
                      Add Customer
                    </span>
                    <p className="text-caption font-normal text-muted-foreground mt-space-0.5 block leading-relaxed line-clamp-2">
                      Save profile & lead info
                    </p>
                  </div>
                </button>
              </div>

              {/* 3. Import Knowledge (Modal Trigger) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => openModal("knowledge")}
                  className="w-full text-left group relative flex flex-col items-start gap-space-2.5 p-space-4 rounded-xl border border-border/80 bg-card hover:border-violet-500/50 hover:bg-violet-500/[0.02] hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer h-full"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none rounded-xl" />
                  <div className="flex items-start justify-between w-full">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-violet-500/10 text-violet-600 dark:text-violet-400 transition-transform duration-200 group-hover:scale-105">
                      <BrainCircuit className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
                      Train <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
                    </span>
                  </div>
                  <div className="min-w-0 w-full">
                    <span className="text-body-sm font-bold text-foreground block leading-snug group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-150">
                      Import Knowledge
                    </span>
                    <p className="text-caption font-normal text-muted-foreground mt-space-0.5 block leading-relaxed line-clamp-2">
                      Add instant FAQ or topic
                    </p>
                  </div>
                </button>
              </div>

              {/* 4. AI Settings (Route Link) */}
              <Link
                href={APP_ROUTES.settingsAi}
                className="group relative flex flex-col items-start gap-space-2.5 p-space-4 rounded-xl border border-border/80 bg-card hover:border-primary/50 hover:bg-primary/[0.02] hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer h-full"
              >
                <div className="flex items-start justify-between w-full">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-[hsl(var(--foreground)/0.06)] text-muted-foreground transition-transform duration-200 group-hover:scale-105">
                    <Settings2 className="h-4.5 w-4.5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 ml-auto" />
                </div>
                <div className="min-w-0 w-full">
                  <span className="text-body-sm font-bold text-foreground block leading-snug group-hover:text-primary transition-colors duration-150">
                    AI Settings
                  </span>
                  <p className="text-caption font-normal text-muted-foreground mt-space-0.5 block leading-relaxed line-clamp-2">
                    Tune prompts & tone
                  </p>
                </div>
              </Link>

              {/* 5. Connect Channels (Route Link) */}
              <Link
                href={APP_ROUTES.channels}
                className="group relative flex flex-col items-start gap-space-2.5 p-space-4 rounded-xl border border-border/80 bg-card hover:border-amber-500/50 hover:bg-amber-500/[0.02] hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer h-full"
              >
                <div className="flex items-start justify-between w-full">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-transform duration-200 group-hover:scale-105">
                    <Share2 className="h-4.5 w-4.5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 ml-auto" />
                </div>
                <div className="min-w-0 w-full">
                  <span className="text-body-sm font-bold text-foreground block leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-150">
                    Connect Channels
                  </span>
                  <p className="text-caption font-normal text-muted-foreground mt-space-0.5 block leading-relaxed line-clamp-2">
                    WhatsApp, Phone, Web
                  </p>
                </div>
              </Link>

              {/* 6. Automations (Route Link) */}
              <Link
                href={APP_ROUTES.automations}
                className="group relative flex flex-col items-start gap-space-2.5 p-space-4 rounded-xl border border-border/80 bg-card hover:border-sky-500/50 hover:bg-sky-500/[0.02] hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer h-full"
              >
                <div className="flex items-start justify-between w-full">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-sky-500/10 text-sky-600 dark:text-sky-400 transition-transform duration-200 group-hover:scale-105">
                    <Tv className="h-4.5 w-4.5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-sky-600 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 ml-auto" />
                </div>
                <div className="min-w-0 w-full">
                  <span className="text-body-sm font-bold text-foreground block leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors duration-150">
                    Automations
                  </span>
                  <p className="text-caption font-normal text-muted-foreground mt-space-0.5 block leading-relaxed line-clamp-2">
                    Triggers, hooks & actions
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </Card>
      </m.div>

      {/* ─── MODAL 1: Quick Appointment ────────────────────────────────────────── */}
      <Dialog open={activeModal === "appointment"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <CalendarPlus className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle>Book New Appointment</DialogTitle>
                <DialogDescription>
                  Manually record or schedule a confirmed customer appointment.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {aptSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-body-base font-bold text-foreground">Appointment Confirmed!</p>
              <p className="text-caption text-muted-foreground">
                Logged to schedule & metrics updated live.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateAppointment} className="space-y-4 py-2">
              {aptError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-caption text-rose-500 font-medium">
                  {aptError}
                </div>
              )}

              <div>
                <label className="text-[12px] font-semibold text-foreground block mb-1">
                  Customer Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    placeholder="e.g. Sarah Connor"
                    value={aptName}
                    onChange={(e) => setAptName(e.target.value)}
                    className="pl-9 text-body-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-semibold text-foreground block mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <Input
                      placeholder="+1 (555) 000-0000"
                      value={aptPhone}
                      onChange={(e) => setAptPhone(e.target.value)}
                      className="pl-9 text-body-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-foreground block mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <Input
                      placeholder="client@example.com"
                      value={aptEmail}
                      onChange={(e) => setAptEmail(e.target.value)}
                      className="pl-9 text-body-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-semibold text-foreground block mb-1">
                    Date & Time *
                  </label>
                  <div className="relative">
                    <Input
                      type="datetime-local"
                      value={aptDateTime}
                      onChange={(e) => setAptDateTime(e.target.value)}
                      className="text-body-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-foreground block mb-1">
                    Service / Reason
                  </label>
                  <Input
                    placeholder="Consultation"
                    value={aptService}
                    onChange={(e) => setAptService(e.target.value)}
                    className="text-body-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-foreground block mb-1">
                  Price / Fee ($)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={aptPrice}
                    onChange={(e) => setAptPrice(e.target.value)}
                    className="pl-9 text-body-sm"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2 flex flex-col sm:flex-row sm:justify-between items-center gap-2">
                <Link
                  href={APP_ROUTES.appointments}
                  className="text-[12px] text-muted-foreground hover:text-foreground underline underline-offset-4 self-start sm:self-center"
                >
                  Go to full calendar →
                </Link>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveModal(null)}
                    disabled={isSubmittingApt}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmittingApt} className="gap-1.5">
                    {isSubmittingApt && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm Booking</span>
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: Add Customer ────────────────────────────────────────────── */}
      <Dialog open={activeModal === "customer"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <UserPlus className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>
                  Save a contact profile into your CRM customer directory.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {custSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-body-base font-bold text-foreground">Customer Profile Saved!</p>
              <p className="text-caption text-muted-foreground">
                Stored in customer database & available for instant AI lookups.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateCustomer} className="space-y-4 py-2">
              {custError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-caption text-rose-500 font-medium">
                  {custError}
                </div>
              )}

              <div>
                <label className="text-[12px] font-semibold text-foreground block mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    placeholder="e.g. John Doe"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="pl-9 text-body-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-semibold text-foreground block mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <Input
                      placeholder="+1 (555) 234-5678"
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      className="pl-9 text-body-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-foreground block mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <Input
                      placeholder="client@example.com"
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
                      className="pl-9 text-body-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-foreground block mb-1">
                  Lifecycle Status
                </label>
                <select
                  value={custStatus}
                  onChange={(e) => setCustStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="New">New Lead</option>
                  <option value="Qualified">Qualified Prospect</option>
                  <option value="Hot">Hot Lead</option>
                  <option value="Booked">Active Customer</option>
                  <option value="VIP">VIP Client</option>
                </select>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-foreground block mb-1">
                  Notes / Context
                </label>
                <Input
                  placeholder="Inquired about pricing and availability..."
                  value={custNotes}
                  onChange={(e) => setCustNotes(e.target.value)}
                  className="text-body-sm"
                />
              </div>

              <DialogFooter className="pt-2 flex flex-col sm:flex-row sm:justify-between items-center gap-2">
                <Link
                  href={APP_ROUTES.contacts}
                  className="text-[12px] text-muted-foreground hover:text-foreground underline underline-offset-4 self-start sm:self-center"
                >
                  Go to CRM directory →
                </Link>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveModal(null)}
                    disabled={isSubmittingCust}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmittingCust} className="gap-1.5">
                    {isSubmittingCust && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Customer</span>
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: Quick Knowledge / FAQ ────────────────────────────────────── */}
      <Dialog open={activeModal === "knowledge"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
                <BrainCircuit className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle>Train AI Knowledge</DialogTitle>
                <DialogDescription>
                  Teach Operator AI an answer to a frequent customer question.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {faqSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-body-base font-bold text-foreground">Knowledge Saved & Synced!</p>
              <p className="text-caption text-muted-foreground">
                Operator AI will immediately use this answer in customer calls & chats.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateFaq} className="space-y-4 py-2">
              {faqError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-caption text-rose-500 font-medium">
                  {faqError}
                </div>
              )}

              <div>
                <label className="text-[12px] font-semibold text-foreground block mb-1">
                  Customer Question *
                </label>
                <Input
                  placeholder="e.g. What are your business hours on weekends?"
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  className="text-body-sm"
                  required
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-foreground block mb-1">
                  AI Answer *
                </label>
                <textarea
                  placeholder="e.g. We are open Saturdays 9:00 AM to 5:00 PM, and closed on Sundays."
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-lg border border-border bg-background text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-foreground block mb-1">
                  Category
                </label>
                <select
                  value={faqCategory}
                  onChange={(e) => setFaqCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="General">General</option>
                  <option value="Hours">Hours & Availability</option>
                  <option value="Pricing">Pricing & Payments</option>
                  <option value="Services">Services & Procedures</option>
                  <option value="Location">Location & Parking</option>
                </select>
              </div>

              <DialogFooter className="pt-2 flex flex-col sm:flex-row sm:justify-between items-center gap-2">
                <Link
                  href={APP_ROUTES.kb}
                  className="text-[12px] text-muted-foreground hover:text-foreground underline underline-offset-4 self-start sm:self-center"
                >
                  Go to knowledge base →
                </Link>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveModal(null)}
                    disabled={isSubmittingFaq}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmittingFaq} className="gap-1.5">
                    {isSubmittingFaq && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save to AI</span>
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
