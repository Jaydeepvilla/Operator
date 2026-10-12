"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  Calendar, 
  Clock, 
  User, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ChevronLeft, 
  Sparkles, 
  ShieldCheck,
  Check,
  Building,
  Info
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import { 
  getPublicAvailableSlotsAction, 
  createPublicBookingAction,
  CreatePublicBookingInput 
} from "@/server/actions/public-booking";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: string;
}

interface StaffItem {
  id: string;
  name: string;
  role: string;
}

interface BusinessInfo {
  id: string;
  name: string;
  slug: string;
  industry: string;
  timezone: string;
  cancellationPolicy: string;
  depositEnabled: boolean;
  depositAmount: number;
  depositType: string;
}

interface HostedBookingClientProps {
  business: BusinessInfo;
  services: ServiceItem[];
  staff: StaffItem[];
}

export function HostedBookingClient({ business, services, staff }: HostedBookingClientProps) {
  const router = useRouter();

  // Wizard Steps: 1: Service, 2: Specialist, 3: Date/Time, 4: Contact Details, 5: Confirmed
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form selections
  const [selectedServiceId, setSelectedServiceId] = useState<string>(services[0]?.id || "");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    // Default to tomorrow
    today.setDate(today.getDate() + 1);
    return today.toISOString().split("T")[0];
  });
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Customer Contact Details
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  // Available Slots state
  const [slots, setSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, startSubmit] = useTransition();
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);
  const [paymentSession, setPaymentSession] = useState<any | null>(null);

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedStaff = staff.find((s) => s.id === selectedStaffId);

  // Fetch available slots when Service, Staff, or Date changes
  useEffect(() => {
    if (!selectedServiceId || !selectedDate) return;

    let isMounted = true;
    setLoadingSlots(true);
    setSlotsError(null);
    setSelectedTime("");

    getPublicAvailableSlotsAction(business.id, selectedServiceId, selectedDate, selectedStaffId || undefined)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.slots) {
          setSlots(res.slots);
          if (res.slots.length > 0) {
            setSelectedTime(res.slots[0].startTime);
          }
        } else {
          setSlots([]);
          setSlotsError(res.error || "No available slots found for this date.");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setSlots([]);
        setSlotsError("Failed to fetch slots. Please try another date.");
      })
      .finally(() => {
        if (isMounted) setLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [business.id, selectedServiceId, selectedStaffId, selectedDate]);

  // Handle final booking submission
  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    if (!customerName.trim()) {
      setBookingError("Please provide your full name.");
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes("@")) {
      setBookingError("Please enter a valid email address.");
      return;
    }
    if (!selectedDate || !selectedTime) {
      setBookingError("Please pick an appointment date and time.");
      return;
    }

    startSubmit(async () => {
      const res = await createPublicBookingAction({
        slug: business.slug,
        serviceId: selectedServiceId,
        staffMemberId: selectedStaffId || undefined,
        date: selectedDate,
        time: selectedTime,
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        notes: customerNotes || undefined,
      });

      if (res.success && res.appointment) {
        setConfirmedBooking(res.appointment);
        if (res.requiresPayment && res.payment?.checkoutUrl) {
          setPaymentSession(res.payment);
          // Redirect to customer checkout
          router.push(res.payment.checkoutUrl);
        } else {
          setStep(5); // Confirmed
        }
      } else {
        setBookingError(res.error || "Failed to confirm appointment. Please try again.");
      }
    });
  };

  return (
    <div className="w-full space-y-8 animate-fade-in">
      {/* Header Profile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mb-2">
            <Building className="h-3.5 w-3.5" />
            <span>{business.industry}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {business.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Book an appointment online in minutes. Instant calendar verification.
          </p>
        </div>

        {/* Step Indicator (when not confirmed) */}
        {step < 5 && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-card border border-border/70 px-3.5 py-1.5 rounded-full text-xs font-medium text-muted-foreground shadow-xs">
            <span className={step >= 1 ? "text-primary font-semibold" : ""}>1. Service</span>
            <span>&rarr;</span>
            <span className={step >= 2 ? "text-primary font-semibold" : ""}>2. Staff</span>
            <span>&rarr;</span>
            <span className={step >= 3 ? "text-primary font-semibold" : ""}>3. Date</span>
            <span>&rarr;</span>
            <span className={step >= 4 ? "text-primary font-semibold" : ""}>4. Details</span>
          </div>
        )}
      </div>

      {/* Step 1: Select Service */}
      {step === 1 && (
        <section aria-labelledby="select-service-heading" className="space-y-6">
          <div className="space-y-1">
            <h2 id="select-service-heading" className="text-lg font-semibold text-foreground">
              Select a Service
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose the service you wish to schedule today.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service) => {
              const isSelected = selectedServiceId === service.id;
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedServiceId(service.id)}
                  className={`text-left p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                      : "border-border/70 bg-card hover:border-border hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="font-semibold text-base text-foreground flex items-center gap-2">
                        <span>{service.name}</span>
                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                      {service.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {service.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold text-foreground">
                        ${service.price}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>{service.duration} mins</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="button"
              disabled={!selectedServiceId}
              onClick={() => setStep(2)}
              className="gap-2 px-6"
            >
              <span>Continue to Specialist</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {/* Step 2: Choose Specialist */}
      {step === 2 && (
        <section aria-labelledby="select-staff-heading" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="select-staff-heading" className="text-lg font-semibold text-foreground">
                Choose a Specialist
              </h2>
              <p className="text-sm text-muted-foreground">
                Select a specific provider or let us assign any available specialist.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Any Specialist Option */}
            <button
              type="button"
              onClick={() => setSelectedStaffId("")}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                selectedStaffId === ""
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                  : "border-border/70 bg-card hover:border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">Any Specialist</span>
                {selectedStaffId === "" && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum availability & earliest open slot
              </p>
            </button>

            {/* Individual Staff */}
            {staff.map((member) => {
              const isSelected = selectedStaffId === member.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedStaffId(member.id)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                      : "border-border/70 bg-card hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">{member.name}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">
                    {member.role || "Team Specialist"}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <Button
              type="button"
              onClick={() => setStep(3)}
              className="gap-2 px-6"
            >
              <span>Continue to Schedule</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {/* Step 3: Date & Time Slot Picker */}
      {step === 3 && (
        <section aria-labelledby="select-date-heading" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="select-date-heading" className="text-lg font-semibold text-foreground">
                Select Date & Time
              </h2>
              <p className="text-sm text-muted-foreground">
                All times shown in business local time ({business.timezone}).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Date Selection (5 Cols) */}
            <div className="md:col-span-5 bg-card border border-border/70 rounded-2xl p-5 shadow-xs space-y-4">
              <Label htmlFor="booking-date" className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Appointment Date</span>
              </Label>
              <Input
                id="booking-date"
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full font-medium"
              />

              <div className="p-3 rounded-xl bg-muted/40 border border-border/40 text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>Duration: {selectedService?.duration || 30} mins</span>
                </div>
                <div>Staff: {selectedStaff ? selectedStaff.name : "Any Available Specialist"}</div>
              </div>
            </div>

            {/* Time Slots (7 Cols) */}
            <div className="md:col-span-7 bg-card border border-border/70 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Available Slots</span>
                </span>
                {loadingSlots && (
                  <span className="text-xs text-muted-foreground animate-pulse">Checking live availability...</span>
                )}
              </div>

              {loadingSlots ? (
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-10 rounded-xl bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : slots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                  {slots.map((slot) => {
                    const isSelected = selectedTime === slot.startTime;
                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        onClick={() => setSelectedTime(slot.startTime)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background border-border/60 text-foreground hover:border-primary/50"
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground bg-muted/20 border border-dashed border-border/80 rounded-xl">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mx-auto mb-2 opacity-60" />
                  <span>{slotsError || "No slots available on this date. Please choose another date."}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(2)}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <Button
              type="button"
              disabled={!selectedTime || loadingSlots}
              onClick={() => setStep(4)}
              className="gap-2 px-6"
            >
              <span>Continue to Details</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {/* Step 4: Contact Details & Policy Review */}
      {step === 4 && (
        <form onSubmit={handleSubmitBooking} className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Your Contact Information
              </h2>
              <p className="text-sm text-muted-foreground">
                We will send booking verification and reminders to these contact details.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          </div>

          {bookingError && (
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{bookingError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Form Fields (7 Cols) */}
            <div className="md:col-span-7 bg-card border border-border/70 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cust-name">Full Name *</Label>
                <Input
                  id="cust-name"
                  required
                  placeholder="e.g. Jane Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cust-email">Email Address *</Label>
                <Input
                  id="cust-email"
                  type="email"
                  required
                  placeholder="jane@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cust-phone">Phone Number (Optional)</Label>
                <Input
                  id="cust-phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cust-notes">Special Requests or Notes</Label>
                <textarea
                  id="cust-notes"
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  placeholder="Any details you'd like us to know in advance..."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Summary & Deposit Rules (5 Cols) */}
            <div className="md:col-span-5 bg-card border border-border/70 rounded-2xl p-6 shadow-xs space-y-5">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Booking Summary</span>
              </h3>

              <div className="space-y-2 text-xs border-b border-border/60 pb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service:</span>
                  <span className="font-semibold text-foreground">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-semibold text-foreground">{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-semibold text-foreground">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Specialist:</span>
                  <span className="font-semibold text-foreground">{selectedStaff ? selectedStaff.name : "Any Specialist"}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Total Service Fee:</span>
                  <span className="font-bold text-foreground text-sm">${selectedService?.price}</span>
                </div>
              </div>

              {business.depositEnabled && business.depositAmount > 0 && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-primary space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Deposit Required: ${business.depositAmount}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    A refundable deposit is required to lock in this appointment slot.
                  </p>
                </div>
              )}

              <div className="text-[11px] text-muted-foreground space-y-1">
                <span className="font-medium text-foreground block">Cancellation Policy:</span>
                <p>{business.cancellationPolicy}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(3)}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 px-8 font-semibold"
            >
              {isSubmitting ? (
                <span>Confirming Booking...</span>
              ) : business.depositEnabled && business.depositAmount > 0 ? (
                <span>Proceed to Deposit (${business.depositAmount}) &rarr;</span>
              ) : (
                <span>Confirm Appointment &rarr;</span>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Step 5: Confirmed Booking Screen */}
      {step === 5 && confirmedBooking && (
        <section aria-labelledby="confirmation-heading" className="max-w-2xl mx-auto text-center py-8 space-y-6">
          <div className="h-16 w-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-xs">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h2 id="confirmation-heading" className="text-2xl font-bold tracking-tight text-foreground">
              Appointment Verified & Confirmed!
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Thank you, {confirmedBooking.customerName}. We have saved your slot and emailed confirmation details to {confirmedBooking.customerEmail}.
            </p>
          </div>

          <div className="bg-card border border-border/80 rounded-2xl p-6 text-left shadow-xs space-y-3 text-sm">
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Booking ID:</span>
              <span className="font-mono font-medium text-foreground">{confirmedBooking.id}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Business:</span>
              <span className="font-semibold text-foreground">{business.name}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Service:</span>
              <span className="font-semibold text-foreground">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Date & Time:</span>
              <span className="font-semibold text-foreground">{selectedDate} at {selectedTime}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-muted-foreground">Status:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                <span>Confirmed</span>
              </span>
            </div>
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep(1);
                setConfirmedBooking(null);
              }}
            >
              Book Another Appointment
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
