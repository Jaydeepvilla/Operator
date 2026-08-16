"use client";

import { useState, useEffect, useRef, Suspense } from"react";
import Image from"next/image";
import { useSearchParams } from"next/navigation";
import { sendMessageAction, getConversationHistoryAction } from"@/server/actions/chat";
import { getServicesAction } from"@/server/actions/services";
import { getStaffListAction } from"@/server/actions/staff";
import { getAvailableSlotsAction } from"@/server/actions/availability";
import { createAppointmentAction } from"@/server/actions/appointments";
import {
 Send,
 Calendar,
 Clock,
 User,
 Check,
 ChevronRight,
 ChevronLeft,
 X,
 Sparkles,
 Briefcase,
 MapPin,
 Phone,
 AlertCircle,
 Loader2,
 FileText
} from"lucide-react";
import { Button } from"@/components/shared/button";
import { Input } from"@/components/shared/input";
import { Label } from"@/components/shared/label";
import { cn } from"@/components/shared/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
 id: string;
 sender:"user"|"assistant";
 content: string;
 createdAt: Date;
 isScheduler?: boolean;
}

function WidgetFrameContent() {
 const searchParams = useSearchParams();
 const orgId = searchParams.get("orgId") ||"";
 const initialConvId = searchParams.get("convId") ||"";

 const [conversationId, setConversationId] = useState(initialConvId);
 const [messages, setMessages] = useState<Message[]>([]);
 const [inputText, setInputText] = useState("");
 const [loading, setLoading] = useState(false);
 const [settings, setSettings] = useState<any>(null);

 // Booking Wizard states
 const [bookingStep, setBookingStep] = useState<"service"|"staff"|"date"|"confirm"|"success">("service");
 const [services, setServices] = useState<any[]>([]);
 const [selectedService, setSelectedService] = useState<any>(null);
 const [staff, setStaff] = useState<any[]>([]);
 const [selectedStaff, setSelectedStaff] = useState<any>(null);
 const [bookingDate, setBookingDate] = useState("");
 const [availableSlots, setAvailableSlots] = useState<any[]>([]);
 const [selectedSlot, setSelectedSlot] = useState<any>(null);
 const [loadingSlots, setLoadingSlots] = useState(false);
 const [custName, setCustName] = useState("");
 const [custEmail, setCustEmail] = useState("");
 const [custPhone, setCustPhone] = useState("");
 const [bookingLoading, setBookingLoading] = useState(false);

 const scrollRef = useRef<HTMLDivElement>(null);

 // 1. Fetch Widget Theme & Configuration Settings
 useEffect(() => {
 if (!orgId) return;
 fetch(`/api/widget/config?orgId=${orgId}`)
 .then((res) => res.json())
 .then((data) => {
 if (data.success && data.settings) {
 setSettings(data.settings);
 }
 })
 .catch((e) => console.error("Error loading config:", e));
 }, [orgId]);

 // 2. Initialize Session Recovery
 useEffect(() => {
 if (!orgId) return;

 // Post API request to set up session
 fetch("/api/widget/session", {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({
 orgId,
 conversationId: conversationId || null,
 deviceInfo: { userAgent: navigator.userAgent }
 })
 })
 .then((res) => res.json())
 .then((data) => {
 if (data.success) {
 setConversationId(data.conversationId);
 if (data.messages && data.messages.length > 0) {
 setMessages(data.messages.map((m: any) => ({
 id: m.id,
 sender: m.sender,
 content: m.content,
 createdAt: new Date(m.createdAt)
 })));
 }
 // Notify host script of session recovery
 window.parent.postMessage({
 type:"NEXX_SESSION_STARTED",
 conversationId: data.conversationId
 },"*");
 }
 })
 .catch((e) => console.error("Error init session:", e));
 }, [orgId, initialConvId]);

 // 3. Scroll to bottom of chat
 useEffect(() => {
 if (scrollRef.current) {
 scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
 }
 }, [messages]);

 // 4. Send Conversational Text message
 const handleSend = async (text: string) => {
 if (!text.trim() || loading || !orgId) return;

 // Add user message
 const userMsgId = Math.random().toString(36).substring(7);
 const userMsg: Message = {
 id: userMsgId,
 sender:"user",
 content: text,
 createdAt: new Date()
 };
 setMessages((prev) => [...prev, userMsg]);
 setInputText("");
 setLoading(true);

 try {
 const res = await sendMessageAction({
 organizationId: orgId,
 conversationId: conversationId || undefined,
 message: text
 });

 if (res.success && res.data) {
 setMessages((prev) => [
 ...prev,
 {
 id: Math.random().toString(36).substring(7),
 sender:"assistant",
 content: res.data.assistantMessage,
 createdAt: new Date()
 }
 ]);
 if (res.data.isEscalated) {
 window.parent.postMessage({ type:"NEXX_ESCALATED"},"*");
 }
 }
 } catch (e) {
 console.error("Message send error:", e);
 } finally {
 setLoading(false);
 }
 };

 // 5. Trigger Quick Action Suggestion
 const handleActionClick = (actionType: string) => {
 if (actionType ==="book") {
 // Toggle visual scheduling card inside messaging
 const schedulerId = Math.random().toString(36).substring(7);
 setMessages((prev) => [
 ...prev,
 {
 id: schedulerId,
 sender:"assistant",
 content:"Let's schedule an appointment! Select a service to get started.",
 createdAt: new Date(),
 isScheduler: true
 }
 ]);
 // Fetch services immediately
 getServicesAction().then((res) => {
 if (res.success && res.services) {
 setServices(res.services);
 }
 });
 setBookingStep("service");
 } else if (actionType ==="services") {
 handleSend("What services do you offer?");
 } else if (actionType ==="pricing") {
 handleSend("What are your prices?");
 } else if (actionType ==="hours") {
 handleSend("What are your business hours?");
 } else if (actionType ==="location") {
 handleSend("Where are you located?");
 } else if (actionType ==="human") {
 handleSend("I want to speak with a manager.");
 }
 };

 // 6. Inline Scheduler Flow Handler
 const handleSelectService = (service: any) => {
 setSelectedService(service);
 getStaffListAction().then((res) => {
 if (res.success && res.staff) {
 setStaff(res.staff);
 }
 });
 setBookingStep("staff");
 };

 const handleSelectStaff = (staffMember: any) => {
 setSelectedStaff(staffMember);
 setBookingStep("date");
 };

 useEffect(() => {
 if (bookingStep ==="date"&& bookingDate && selectedService) {
 setLoadingSlots(true);
 getAvailableSlotsAction({
 serviceId: selectedService.id,
 dateStr: bookingDate,
 staffMemberId: selectedStaff?.id || null
 }).then((res) => {
 if (res.success && res.slots) {
 setAvailableSlots(res.slots);
 } else {
 setAvailableSlots([]);
 }
 setLoadingSlots(false);
 });
 }
 }, [bookingDate, bookingStep, selectedService, selectedStaff]);

 const handleBookAppointment = async () => {
 if (!selectedService || !selectedSlot || !custName || !orgId) return;

 setBookingLoading(true);

 const targetDate = new Date(bookingDate);
 const [h, m] = selectedSlot.startTime.split(":").map(Number);
 targetDate.setHours(h, m, 0, 0);

 try {
 const res = await createAppointmentAction({
 serviceId: selectedService.id,
 staffMemberId: selectedStaff?.id ||"",
 startTime: targetDate.toISOString(),
 customerName: custName,
 customerEmail: custEmail || null,
 customerPhone: custPhone || null
 });

 if (res.success && res.appointment) {
 setBookingStep("success");
 // Add success chat message
 setMessages((prev) => [
 ...prev,
 {
 id: Math.random().toString(36).substring(7),
 sender:"assistant",
 content:`Thank you! I have confirmed your appointment for ${selectedService.name} on ${new Date(targetDate).toLocaleDateString()} at ${selectedSlot.startTime}.`,
 createdAt: new Date()
 }
 ]);

 // Post messaging events to host page for hook notifications
 window.parent.postMessage({
 type:"NEXX_BOOKING_COMPLETED",
 details: {
 appointmentId: res.appointment.id,
 serviceName: selectedService.name,
 startTime: res.appointment.startTime
 }
 },"*");
 }
 } catch (e) {
 console.error(e);
 } finally {
 setBookingLoading(false);
 }
 };

 if (!settings) {
 return (
 <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground text-caption gap-space-2">
 <Loader2 className="h-4 w-4 animate-spin text-primary"/>
 Connecting to Operator...
 </div>
 );
 }

 // CSS variables mapping brand theme color tokens dynamically
 const brandingStyles = {
 "--primary-color": settings.theme.primaryColor,
 "--background-color": settings.theme.backgroundColor,
 "--text-color": settings.theme.textColor,
 "--border-color": settings.theme.borderColor,
 "--border-radius": settings.theme.borderRadius,
 } as React.CSSProperties;

 return (
 <div
 className="flex flex-col h-dvh overflow-hidden text-foreground antialiased bg-background text-foreground"
 style={{
 ...brandingStyles
 }}
 >
 {/* Header Panel */}
 <div className="flex items-center justify-between p-space-4 border-b border-border/30 bg-background/25 backdrop-blur-md">
 <div className="flex items-center gap-space-3">
 <div className="relative">
 {settings.branding.logoUrl ? (
 <Image
 src={settings.branding.logoUrl}
 alt="Brand Logo"
 width={40}
 height={40}
 className="h-10 w-10 radius-full object-cover border border-border/30 bg-background"
 />
 ) : (
 <div className="h-10 w-10 radius-full bg-primary/20 border border-primary/40 flex items-center justify-center">
 <Sparkles className="h-5 w-5 text-primary"/>
 </div>
 )}
 <span className="absolute bottom-space-0 right-space-0 h-2.5 w-2.5 radius-full bg-success-500 ring-2 ring-background"/>
 </div>
 <div>
 <h3 className="text-caption truncate max-w-44">{settings.branding.companyName}</h3>
 <p className="text-caption text-muted-foreground truncate max-w-44">{settings.branding.tagline}</p>
 </div>
 </div>

 {/* Custom close trigger communicating to host */}
 <Button onClick={() => window.parent.postMessage({ type:"NEXX_TOGGLE"},"*")}
 className="text-muted-foreground hover:text-foreground hover:bg-background/5 p-space-1 radius-md transition-colors"
 >
 <X className="h-4 w-4"/>
 </Button>
 </div>

 {/* Message Area */}
 <ScrollArea
          ref={scrollRef}
          className="flex-1 p-space-4 space-y-space-4 scroll-smooth"
           horizontal={false}>
          {messages.map((msg) => {
          const isUser = msg.sender ==="user";
          return (
          <div key={msg.id} className={cn("flex flex-col", isUser ?"items-end":"items-start")}>
          <div
          className={cn(
          "max-w-5/6 radius-lg p-space-3 text-caption leading-relaxed",
          isUser
          ?"bg-primary text-primary-foreground"
          :"border border-border/20 bg-background/5 text-foreground/90"
          )}
          >
          {msg.content}
          </div>

          {/* Inline Interactive Scheduling Card */}
          {msg.isScheduler && (
          <div className="w-full max-w-5/6 mt-space-3 border border-border/20 radius-lg bg-background/35 overflow-hidden">
          {/* Step headers */}
          <div className="p-space-3 border-b border-border/10 bg-background/5 flex items-center justify-between text-caption text-muted-foreground uppercase">
          <span>Booking Wizard</span>
          <span>Step {bookingStep ==="service"? 1 : bookingStep ==="staff"? 2 : bookingStep ==="date"? 3 : 4}/4</span>
          </div>

          <div className="p-space-3">
          {/* Select Service */}
          {bookingStep ==="service"&& (
          <div className="space-y-space-2">
          <Label className="text-caption text-muted-foreground uppercase">Select Service</Label>
          <ScrollArea className="space-y-space-2 max-h-36" horizontal={false}>
                                                {services.length === 0 ? (
                                                <div className="text-caption italic text-muted-foreground">Loading services directory...</div>
                                                ) : (
                                                services.map((s) => (
                                                <Button key={s.id} onClick={() => handleSelectService(s)}
                                                className="w-full text-left p-space-2 radius-md border border-border/10 hover:border-primary/40 bg-background/5 hover:bg-primary/5 transition-all text-caption flex justify-between items-center"
                                                >
                                                <div>
                                                <div className="">{s.name}</div>
                                                <div className="text-caption text-muted-foreground">{s.duration} min</div>
                                                </div>
                                                <span className="text-primary text-caption">${s.price}</span>
                                                </Button>
                                                ))
                                                )}
                                                </ScrollArea>
          </div>
          )}

          {/* Select Staff */}
          {bookingStep ==="staff"&& (
          <div className="space-y-space-2">
          <div className="flex items-center justify-between">
          <Label className="text-caption text-muted-foreground uppercase">Select Provider</Label>
          <Button onClick={() => setBookingStep("service")} className="text-caption text-primary flex items-center gap-space-1">
          <ChevronLeft className="h-3 w-3"/> Back
          </Button>
          </div>
          <ScrollArea className="space-y-space-2 max-h-36" horizontal={false}>
                                                <Button onClick={() => handleSelectStaff(null)}
                                                className="w-full text-left p-space-2 radius-md border border-border/10 hover:border-primary/40 bg-background/5 hover:bg-primary/5 transition-all text-caption"
                                                >
                                                <div className="text-foreground">Any Available Staff</div>
                                                <div className="text-caption text-muted-foreground">Fastest availability slot matching</div>
                                                </Button>

                                                {staff.map((st) => (
                                                <Button key={st.id} onClick={() => handleSelectStaff(st)}
                                                className="w-full text-left p-space-2 radius-md border border-border/10 hover:border-primary/40 bg-background/5 hover:bg-primary/5 transition-all text-caption"
                                                >
                                                <div className="text-foreground">{st.name}</div>
                                                <div className="text-caption text-muted-foreground">{st.role}</div>
                                                </Button>
                                                ))}
                                                </ScrollArea>
          </div>
          )}

          {/* Select Date and Slot */}
          {bookingStep ==="date"&& (
          <div className="space-y-space-2">
          <div className="flex items-center justify-between">
          <Label className="text-caption text-muted-foreground uppercase">Pick Date & Time</Label>
          <Button onClick={() => setBookingStep("staff")} className="text-caption text-primary flex items-center gap-space-1">
          <ChevronLeft className="h-3 w-3"/> Back
          </Button>
          </div>

          <Input
          type="date"
          value={bookingDate}
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => setBookingDate(e.target.value)}
          className="h-8 bg-transparent text-caption"
          />

          {bookingDate && (
          <div className="pt-space-2">
          <span className="text-caption text-muted-foreground uppercase block mb-space-1">Available Slots</span>
          {loadingSlots ? (
          <div className="text-caption text-muted-foreground flex items-center gap-space-1"><Loader2 className="h-3 w-3 animate-spin"/> Fetching slots...</div>
          ) : availableSlots.length === 0 ? (
          <div className="text-caption italic text-muted-foreground">No available slots. Try another date.</div>
          ) : (
          <ScrollArea className="grid grid-cols-3 gap-space-2 max-h-24 pr-space-1" horizontal={false}>
                                                                    {availableSlots.map((slot, idx) => (
                                                                    <Button key={idx} onClick={() => setSelectedSlot(slot)}
                                                                    className={cn(
                                                                    "h-7 text-caption rounded border transition-all",
                                                                    selectedSlot === slot
                                                                    ?"bg-primary border-primary text-primary-foreground"
                                                                    :"border-border/30 hover:border-primary/50 bg-background/5 text-foreground"
                                                                    )}
                                                                    >
                                                                    {slot.startTime}
                                                                    </Button>
                                                                    ))}
                                                                    </ScrollArea>
          )}
          </div>
          )}

          {selectedSlot && (
          <Button onClick={() => setBookingStep("confirm")}
          size="sm"
          className="w-full text-caption h-8 mt-space-2"
          >
          Next: Confirmation <ChevronRight className="ml-space-1 h-3.5 w-3.5"/>
          </Button>
          )}
          </div>
          )}

          {/* Customer Info Confirmation */}
          {bookingStep ==="confirm"&& (
          <div className="space-y-space-2">
          <div className="flex items-center justify-between">
          <Label className="text-caption text-muted-foreground uppercase">Verify Details</Label>
          <Button onClick={() => setBookingStep("date")} className="text-caption text-primary flex items-center gap-space-1">
          <ChevronLeft className="h-3 w-3"/> Back
          </Button>
          </div>

          <div className="space-y-space-1">
          <Label htmlFor="custName"className="text-caption text-muted-foreground uppercase">Your Name</Label>
          <Input
          id="custName"
          value={custName}
          onChange={(e) => setCustName(e.target.value)}
          placeholder="John Doe"
          className="h-7 text-caption bg-transparent"
          required
          />
          </div>

          <div className="grid grid-cols-2 gap-space-2">
          <div className="space-y-space-1">
          <Label htmlFor="custEmail"className="text-caption text-muted-foreground uppercase">Email Address</Label>
          <Input
          id="custEmail"
          type="email"
          value={custEmail}
          onChange={(e) => setCustEmail(e.target.value)}
          placeholder="john@example.com"
          className="h-7 text-caption bg-transparent"
          />
          </div>
          <div className="space-y-space-1">
          <Label htmlFor="custPhone"className="text-caption text-muted-foreground uppercase">Phone Number</Label>
          <Input
          id="custPhone"
          value={custPhone}
          onChange={(e) => setCustPhone(e.target.value)}
          placeholder="555-0199"
          className="h-7 text-caption bg-transparent"
          />
          </div>
          </div>

          <Button onClick={handleBookAppointment} size="sm" width="full" className="text-caption pt-space-1" disabled={!custName.trim() || bookingLoading}>
          {bookingLoading ? (
          <><Loader2 className="mr-space-2 h-3.5 w-3.5 animate-spin"/> Completing booking...</>
          ) : (
          <>Confirm Appointment <Check className="ml-space-1 h-3.5 w-3.5"/></>
          )}
          </Button>
          </div>
          )}

          {/* Booking success state */}
          {bookingStep ==="success"&& (
          <div className="text-center py-space-4 space-y-space-2">
          <div className="mx-auto h-8 w-8 radius-full bg-success-500/10 border border-success-500/30 flex items-center justify-center text-success-500">
          <Check className="h-4.5 w-4.5"/>
          </div>
          <div>
          <h4 className="text-caption text-foreground">Appointment Scheduled!</h4>
          <p className="text-caption text-muted-foreground mt-space-1">We have synced this to our schedule and queued notifications.</p>
          </div>
          </div>
          )}

          </div>
          </div>
          )}
          </div>
          );
          })}

          {loading && (
          <div className="flex items-center gap-space-1 text-caption text-muted-foreground italic">
          <span className="h-1.5 w-1.5 radius-full bg-muted-foreground animate-bounce delay-75"/>
          <span className="h-1.5 w-1.5 radius-full bg-muted-foreground animate-bounce delay-150"/>
          <span className="h-1.5 w-1.5 radius-full bg-muted-foreground animate-bounce delay-300"/>
          <span>Operator AI is typing...</span>
          </div>
          )}
          </ScrollArea>

 {/* Suggested Quick Replies row */}
 {messages.length > 0 && !loading && (
 <ScrollArea className="flex gap-space-2 p-space-3 bg-background/10 border-t border-border/10 shrink-0" vertical={false}>
              {settings.customization.suggestedActions.map((act: any, idx: number) => (
              <Button key={idx} onClick={() => handleActionClick(act.type)}
              className="text-caption border border-border/30 hover:border-primary/50 radius-full px-space-3 py-space-1 bg-background/50 hover:bg-primary/5 transition-all text-foreground/80 shrink-0 select-none cursor-pointer"
              >
              {act.label}
              </Button>
              ))}
              {/* Default back up pills */}
              <Button onClick={() => handleActionClick("hours")}
              className="text-caption border border-border/30 hover:border-primary/50 radius-full px-space-3 py-space-1 bg-background/50 hover:bg-primary/5 transition-all text-foreground/80 shrink-0 select-none cursor-pointer"
              >
              Hours
              </Button>
              <Button onClick={() => handleActionClick("location")}
              className="text-caption border border-border/30 hover:border-primary/50 radius-full px-space-3 py-space-1 bg-background/50 hover:bg-primary/5 transition-all text-foreground/80 shrink-0 select-none cursor-pointer"
              >
              Location
              </Button>
              <Button onClick={() => handleActionClick("human")}
              className="text-caption border border-border/30 hover:border-primary/50 radius-full px-space-3 py-space-1 bg-background/50 hover:bg-primary/5 transition-all text-foreground/80 shrink-0 select-none cursor-pointer text-error-500 border-error-500/10"
              >
              Speak to Human
              </Button>
              </ScrollArea>
 )}

 {/* Chat Text Input footer */}
 <form
 onSubmit={(e) => { e.preventDefault(); handleSend(inputText); }}
 className="p-space-3 border-t border-border/20 bg-background/35 flex items-center gap-space-2 shrink-0"
 >
 <Input
 value={inputText}
 onChange={(e) => setInputText(e.target.value)}
 placeholder="Ask a question or type a reply..."
 className="flex-1 h-8 bg-transparent text-caption border-border/40 focus:ring-0 focus:border-primary"
 disabled={loading}
 />
 <Button type="submit" size="icon" className="radius-md" disabled={!inputText.trim() || loading}>
 <Send className="h-3.5 w-3.5"/>
 </Button>
 </form>
 </div>
 );
}

export default function WidgetFramePage() {
 return (
 <Suspense fallback={
 <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground text-caption gap-space-2">
 <Loader2 className="h-4 w-4 animate-spin text-primary"/>
 Connecting to Operator...
 </div>
 }>
 <WidgetFrameContent />
 </Suspense>
 );
}
