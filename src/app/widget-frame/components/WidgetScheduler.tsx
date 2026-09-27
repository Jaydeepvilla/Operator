"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Calendar,
  Check,
  Loader2,
  CalendarPlus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Calendar3DIcon } from "./WidgetIcons3D";

interface Service {
  id: string;
  name: string;
  duration: number;
  price: string | number;
}

interface Staff {
  id: string;
  name: string;
  role?: string | null;
}

interface Slot {
  startTime: string; // HH:mm
  endTime?: string;
  staffMemberId?: string;
}

interface WidgetSchedulerProps {
  initialService?: Service | null;
  services: Service[];
  staff: Staff[];
  onFetchSlots: (serviceId: string, dateStr: string, staffId?: string) => Promise<Slot[]>;
  onBookAppointment: (data: {
    serviceId: string;
    staffMemberId: string;
    targetDate: Date;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }) => Promise<{ success: boolean; appointment?: any; error?: string }>;
  onCancel: () => void;
  onSuccess: (appointment: any, service: Service, date: Date, time: string) => void;
}

export function WidgetScheduler({
  initialService,
  services,
  staff,
  onFetchSlots,
  onBookAppointment,
  onCancel,
  onSuccess,
}: WidgetSchedulerProps) {
  // Wizard Step: 'service' | 'staff' | 'datetime' | 'contact' | 'confirmed'
  const [step, setStep] = useState<"service" | "staff" | "datetime" | "contact" | "confirmed">(
    initialService ? "staff" : "service"
  );

  const [selectedService, setSelectedService] = useState<Service | null>(initialService || null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null); // null = "Any Available"

  // Date selection
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Contact inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Confirmed appointment metadata for success screen
  const [confirmedAppt, setConfirmedAppt] = useState<any>(null);

  // Load slots when service, date, or staff changes
  useEffect(() => {
    if (selectedService && selectedDate && step === "datetime") {
      setLoadingSlots(true);
      setSelectedSlot(null);
      onFetchSlots(selectedService.id, selectedDate, selectedStaff?.id)
        .then((res) => {
          setSlots(res || []);
        })
        .catch(() => setSlots([]))
        .finally(() => setLoadingSlots(false));
    }
  }, [selectedService, selectedDate, selectedStaff, step]);

  // Categorize slots into Morning, Afternoon, Evening
  const categorizedSlots = useMemo(() => {
    const morning: Slot[] = [];
    const afternoon: Slot[] = [];
    const evening: Slot[] = [];

    slots.forEach((s) => {
      const hour = parseInt(s.startTime.split(":")[0], 10);
      if (hour < 12) morning.push(s);
      else if (hour < 17) afternoon.push(s);
      else evening.push(s);
    });

    return { morning, afternoon, evening };
  }, [slots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedSlot || !name.trim()) return;

    setSubmitting(true);
    setSubmitError("");

    const targetDate = new Date(selectedDate);
    const [h, m] = selectedSlot.startTime.split(":").map(Number);
    targetDate.setHours(h, m, 0, 0);

    const res = await onBookAppointment({
      serviceId: selectedService.id,
      staffMemberId: selectedStaff?.id || "",
      targetDate,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
    });

    if (res.success && res.appointment) {
      setConfirmedAppt(res.appointment);
      setStep("confirmed");
      onSuccess(res.appointment, selectedService, targetDate, selectedSlot.startTime);
    } else {
      setSubmitError(res.error || "Unable to confirm booking. Please try another time.");
    }
    setSubmitting(false);
  };

  // Google Calendar Link Generator
  const googleCalendarUrl = useMemo(() => {
    if (!confirmedAppt || !selectedService || !selectedSlot) return "";
    const startDate = new Date(selectedDate);
    const [h, m] = selectedSlot.startTime.split(":").map(Number);
    startDate.setHours(h, m, 0, 0);
    const endDate = new Date(startDate.getTime() + (selectedService.duration || 30) * 60000);

    const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const title = encodeURIComponent(`${selectedService.name} Appointment`);
    const details = encodeURIComponent(
      `Appointment booked via Operator AI Receptionist.\nProvider: ${
        selectedStaff?.name || "Assigned Staff"
      }`
    );

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(
      startDate
    )}/${fmt(endDate)}&details=${details}`;
  }, [confirmedAppt, selectedService, selectedSlot, selectedDate, selectedStaff]);

  return (
    <div className="flex flex-col rounded-2xl border border-primary/25 bg-card/95 backdrop-blur-md shadow-md overflow-hidden my-2 animate-in fade-in zoom-in-95 duration-200">
      {/* Wizard Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/40 border-b border-border/40 text-xs">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Calendar3DIcon size={18} />
          <span>
            {step === "service" && "1. Select Service"}
            {step === "staff" && "2. Choose Provider"}
            {step === "datetime" && "3. Date & Time"}
            {step === "contact" && "4. Your Information"}
            {step === "confirmed" && "Booking Confirmed"}
          </span>
        </div>

        {step !== "confirmed" && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Step Content */}
      <div className="p-3.5">
        {/* Step 1: Service Selection */}
        {step === "service" && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] text-muted-foreground">Select a service to book:</span>
            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedService(s);
                    setStep("staff");
                  }}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-semibold text-foreground">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">{s.duration} mins</div>
                  </div>
                  <span className="text-xs font-semibold text-primary">${s.price}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Staff Selection */}
        {step === "staff" && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Choose your specialist:</span>
              <button
                type="button"
                onClick={() => setStep("service")}
                className="text-[11px] text-primary inline-flex items-center gap-0.5 cursor-pointer"
              >
                <ChevronLeft className="h-3 w-3" /> Back
              </button>
            </div>

            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
              {/* Option 1: Any Available */}
              <button
                type="button"
                onClick={() => {
                  setSelectedStaff(null);
                  setStep("datetime");
                }}
                className="flex items-center justify-between p-2.5 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-primary/20 text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">Any Available Staff</div>
                    <div className="text-[11px] text-muted-foreground">Fastest appointment matching</div>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              {/* Specific Staff */}
              {staff.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setSelectedStaff(st);
                    setStep("datetime");
                  }}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-accent/30 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-muted text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">{st.name}</div>
                      <div className="text-[11px] text-muted-foreground">{st.role || "Specialist"}</div>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Date & Slot Matrix */}
        {step === "datetime" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Select date & opening:</span>
              <button
                type="button"
                onClick={() => setStep("staff")}
                className="text-[11px] text-primary inline-flex items-center gap-0.5 cursor-pointer"
              >
                <ChevronLeft className="h-3 w-3" /> Back
              </button>
            </div>

            {/* Quick Date Pills */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  selectedDate === todayStr
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(tomorrowStr)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  selectedDate === tomorrowStr
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                Tomorrow
              </button>
              <input
                type="date"
                min={todayStr}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="py-1 px-2 rounded-lg text-xs border border-border/60 bg-muted/30 text-foreground cursor-pointer"
              />
            </div>

            {/* Slot Matrix */}
            <div className="flex flex-col gap-2 pt-1 max-h-48 overflow-y-auto pr-1">
              {loadingSlots ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Checking calendar openings...
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground italic">
                  No open slots on {new Date(selectedDate).toLocaleDateString()}. Please try another date.
                </div>
              ) : (
                <>
                  {categorizedSlots.morning.length > 0 && (
                    <div>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">
                        Morning
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {categorizedSlots.morning.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedSlot(s)}
                            className={`py-1.5 px-2 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                              selectedSlot === s
                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                : "border-border/50 bg-card hover:border-primary/40 text-foreground"
                            }`}
                          >
                            {s.startTime}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {categorizedSlots.afternoon.length > 0 && (
                    <div>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1 mt-1">
                        Afternoon
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {categorizedSlots.afternoon.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedSlot(s)}
                            className={`py-1.5 px-2 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                              selectedSlot === s
                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                : "border-border/50 bg-card hover:border-primary/40 text-foreground"
                            }`}
                          >
                            {s.startTime}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {categorizedSlots.evening.length > 0 && (
                    <div>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1 mt-1">
                        Evening
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {categorizedSlots.evening.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedSlot(s)}
                            className={`py-1.5 px-2 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                              selectedSlot === s
                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                : "border-border/50 bg-card hover:border-primary/40 text-foreground"
                            }`}
                          >
                            {s.startTime}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {selectedSlot && (
              <button
                type="button"
                onClick={() => setStep("contact")}
                className="w-full mt-1 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1 shadow-sm cursor-pointer transition-all"
              >
                Continue to Confirm <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Step 4: Contact Details */}
        {step === "contact" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Who is this booking for?</span>
              <button
                type="button"
                onClick={() => setStep("datetime")}
                className="text-[11px] text-primary inline-flex items-center gap-0.5 cursor-pointer"
              >
                <ChevronLeft className="h-3 w-3" /> Back
              </button>
            </div>

            {/* Booking Summary Tag */}
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40 text-xs">
              <div className="font-semibold text-foreground">{selectedService?.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {new Date(selectedDate).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}{" "}
                at {selectedSlot?.startTime} • {selectedStaff?.name || "Any available staff"}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-foreground">Your Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border/60 bg-background focus:outline-none focus:border-primary text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-foreground">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border/60 bg-background focus:outline-none focus:border-primary text-foreground"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-foreground">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 019-2834"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border/60 bg-background focus:outline-none focus:border-primary text-foreground"
                />
              </div>
            </div>

            {submitError && (
              <div className="text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full mt-1.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1 shadow-sm cursor-pointer disabled:opacity-50 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Confirming with Reception Desk...
                </>
              ) : (
                <>
                  Confirm Appointment <Check className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 5: Confirmed Success State */}
        {step === "confirmed" && (
          <div className="flex flex-col items-center text-center p-3 gap-3 animate-in zoom-in-95 duration-300">
            <div className="h-12 w-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-sm">
              <Check className="h-6 w-6 stroke-[2.5]" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">Appointment Confirmed!</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                We have added you to our schedule and reserved your time.
              </p>
            </div>

            <div className="w-full p-3 rounded-xl bg-muted/40 border border-border/40 text-left text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service:</span>
                <span className="font-semibold text-foreground">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time:</span>
                <span className="font-medium text-foreground">
                  {new Date(selectedDate).toLocaleDateString()} at {selectedSlot?.startTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Specialist:</span>
                <span className="font-medium text-foreground">
                  {selectedStaff?.name || "Assigned Specialist"}
                </span>
              </div>
            </div>

            <div className="flex w-full gap-2">
              {googleCalendarUrl && (
                <a
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-lg border border-border/60 hover:bg-muted text-foreground text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <CalendarPlus className="h-3.5 w-3.5 text-primary" /> Add to Calendar
                </a>
              )}
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer transition-colors"
              >
                Return to Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
