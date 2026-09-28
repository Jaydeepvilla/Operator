"use client";

import React, { useState, useEffect, useRef, Suspense, useMemo } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { sendMessageAction } from "@/server/actions/chat";
import { getServicesAction } from "@/server/actions/services";
import { getStaffListAction } from "@/server/actions/staff";
import { getAvailableSlotsAction } from "@/server/actions/availability";
import { createAppointmentAction } from "@/server/actions/appointments";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/components/shared/utils";
import { OPERATOR_WIDGET_EVENTS, OperatorWidgetMessagePayload } from "@/lib/constants/widget-events";

import { WidgetHeader } from "./components/WidgetHeader";
import { WidgetWelcome } from "./components/WidgetWelcome";
import { WidgetServiceCards } from "./components/WidgetServiceCards";
import { WidgetScheduler } from "./components/WidgetScheduler";
import { WidgetQuickActions, DynamicActionItem } from "./components/WidgetQuickActions";
import { WidgetInputBar } from "./components/WidgetInputBar";
import { OperatorAvatarOrb } from "./components/WidgetIcons3D";

interface Message {
  id: string;
  sender: "user" | "assistant";
  content: string;
  createdAt: Date;
  structuredType?: "services" | "scheduler";
}

function WidgetFrameContent() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") || "";
  const initialConvId = searchParams.get("convId") || "";
  const targetOriginParam = searchParams.get("origin");

  // Validate target origin for parent postMessage
  const targetOrigin = useMemo(() => {
    if (!targetOriginParam) return "*";
    try {
      const parsed = new URL(targetOriginParam);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.origin;
      }
    } catch {}
    return "*";
  }, [targetOriginParam]);

  const postToParent = (payload: OperatorWidgetMessagePayload) => {
    if (typeof window !== "undefined" && window.parent && window.parent !== window) {
      window.parent.postMessage(payload, targetOrigin);
    }
  };

  // State Management
  const [settings, setSettings] = useState<any>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [conversationId, setConversationId] = useState(initialConvId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiState, setAiState] = useState<"idle" | "thinking" | "responding">("idle");
  const [thinkingLabel, setThinkingLabel] = useState("Operator AI is thinking...");

  // Active View: 'chat' | 'scheduler' | 'services'
  const [activeInlineView, setActiveInlineView] = useState<"none" | "scheduler" | "services">("none");
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<any>(null);

  // Business Data Cache
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [dynamicActions, setDynamicActions] = useState<DynamicActionItem[]>([]);
  const [quickActionContext, setQuickActionContext] = useState<"general" | "services" | "booking" | "completed">("general");

  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Configuration & Dynamic Theme Tokens
  useEffect(() => {
    if (!orgId) return;
    setSettingsLoading(true);
    fetch(`/api/widget/config?orgId=${orgId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      })
      .catch((e) => console.error("Widget config error:", e))
      .finally(() => setSettingsLoading(false));
  }, [orgId]);

  // Ensure widget-frame always renders with the dark mode theme tokens
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  }, []);

  // 2. Initialize or Recover Conversation Session
  useEffect(() => {
    if (!orgId) return;

    fetch("/api/widget/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        conversationId: conversationId || null,
        deviceInfo: { userAgent: navigator.userAgent },
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setConversationId(data.conversationId);
          if (typeof window !== "undefined") {
            localStorage.setItem(`operator_widget_conv_id_${orgId}`, data.conversationId);
          }
          if (data.messages && data.messages.length > 0) {
            setMessages(
              data.messages.map((m: any) => ({
                id: m.id || Math.random().toString(36).substring(7),
                sender: m.sender,
                content: m.content,
                createdAt: new Date(m.createdAt || Date.now()),
              }))
            );
          }
          postToParent({
            type: OPERATOR_WIDGET_EVENTS.SESSION_STARTED,
            conversationId: data.conversationId,
          });
        }
      })
      .catch((e) => console.error("Session init error:", e));
  }, [orgId, initialConvId]);

  // 3. Pre-fetch services & staff for instant zero-latency booking
  useEffect(() => {
    if (!orgId) return;
    getServicesAction(orgId).then((res) => {
      if (res.success && res.services) {
        setServices(res.services);
      }
    });
    getStaffListAction(orgId).then((res) => {
      if (res.success && res.staff) {
        setStaff(res.staff);
      }
    });
  }, [orgId]);

  // Auto-scroll on new message or state change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, aiState, activeInlineView]);

  // 4. Send Message Handler
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || aiState === "thinking" || !orgId) return;

    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      sender: "user",
      content: text,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setAiState("thinking");
    setThinkingLabel("Checking information...");

    // Check if user specifically asked for services or booking
    const lower = text.toLowerCase();
    if (lower.includes("service") || lower.includes("offer") || lower.includes("menu")) {
      setQuickActionContext("services");
    } else if (lower.includes("book") || lower.includes("appointment") || lower.includes("schedule")) {
      setQuickActionContext("booking");
    }

    const clientMsgId = Math.random().toString(36).substring(2) + Date.now().toString(36);

    try {
      const res = await sendMessageAction({
        organizationId: orgId,
        conversationId: conversationId || undefined,
        message: text,
        clientMessageId: clientMsgId,
      });

      if (res.success && res.data) {
        setAiState("responding");
        const assistantText = res.data.assistantMessage;

        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            sender: "assistant",
            content: assistantText,
            createdAt: new Date(),
          },
        ]);

        if (res.data.actions && res.data.actions.length > 0) {
          setDynamicActions(res.data.actions);
        }

        if (res.data.isEscalated) {
          postToParent({ type: OPERATOR_WIDGET_EVENTS.ESCALATED });
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            sender: "assistant",
            content:
              res.error ||
              "I apologize, but I am having trouble connecting to our system right now. Please try again in a moment.",
            createdAt: new Date(),
          },
        ]);
      }
    } catch (e) {
      console.error("Message send error:", e);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          sender: "assistant",
          content: "I encountered a network hiccup. Please ask again.",
          createdAt: new Date(),
        },
      ]);
    } finally {
      setAiState("idle");
    }
  };

  // 5. Dynamic Action Dispatcher
  const handleActionDispatch = (action: DynamicActionItem) => {
    if (action.type === "booking" || action.id === "BOOK_APPOINTMENT" || action.id === "BOOK_SERVICE") {
      if (action.payload?.serviceId) {
        const found = services.find((s) => s.id === action.payload.serviceId);
        setSelectedServiceForBooking(found || null);
      } else {
        setSelectedServiceForBooking(null);
      }
      setActiveInlineView("scheduler");
      return;
    }

    if (action.type === "view" || action.id === "VIEW_SERVICES") {
      setActiveInlineView("services");
      return;
    }

    if (action.type === "escalate" || action.id === "SPEAK_WITH_HUMAN") {
      handleSendMessage("I'd like to speak with a staff member or manager.");
      return;
    }

    if (action.payload?.text) {
      handleSendMessage(action.payload.text);
    } else if (action.label) {
      handleSendMessage(action.label);
    }
  };

  const handleWelcomeIntent = (intent: "book" | "services" | "pricing" | "hours" | "question", text?: string) => {
    switch (intent) {
      case "book":
        setSelectedServiceForBooking(null);
        setActiveInlineView("scheduler");
        break;
      case "services":
        setActiveInlineView("services");
        break;
      case "pricing":
        handleSendMessage("What are your service prices and fees?");
        break;
      case "hours":
        handleSendMessage("What are your business hours?");
        break;
      case "question":
        if (text) handleSendMessage(text);
        break;
      default:
        handleSendMessage(intent);
    }
  };

  // 6. Reset Conversation Handler
  const handleResetConversation = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`operator_widget_conv_id_${orgId}`);
      localStorage.removeItem(`nexx_widget_conv_id_${orgId}`);
    }
    setConversationId("");
    setMessages([]);
    setDynamicActions([]);
    setActiveInlineView("none");
    setSelectedServiceForBooking(null);
    setQuickActionContext("general");
  };

  // 7. Appointment Booking Helpers
  const handleFetchSlots = async (serviceId: string, dateStr: string, staffId?: string) => {
    const res = await getAvailableSlotsAction({
      serviceId,
      dateStr,
      staffMemberId: staffId || undefined,
      organizationId: orgId,
    });
    return res.success && res.slots ? res.slots : [];
  };

  const handleBookAppointment = async (data: {
    serviceId: string;
    staffMemberId: string;
    targetDate: Date;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }) => {
    return createAppointmentAction({
      serviceId: data.serviceId,
      staffMemberId: data.staffMemberId,
      startTime: data.targetDate.toISOString(),
      customerName: data.customerName,
      customerEmail: data.customerEmail || null,
      customerPhone: data.customerPhone || null,
      organizationId: orgId,
    });
  };

  const handleBookingSuccess = (appointment: any, service: any, date: Date, time: string) => {
    setQuickActionContext("completed");
    postToParent({
      type: OPERATOR_WIDGET_EVENTS.BOOKING_COMPLETED,
      details: {
        appointmentId: appointment.id,
        serviceName: service.name,
        startTime: appointment.startTime,
      },
    });

    // Add confirmation message to chat transcript
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        sender: "assistant",
        content: `🎉 I have confirmed your appointment for **${service.name}** on **${date.toLocaleDateString()}** at **${time}**. We look forward to seeing you!`,
        createdAt: new Date(),
      },
    ]);
  };

  if (settingsLoading) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-background text-muted-foreground text-xs gap-3 p-6 text-center select-none">
        <OperatorAvatarOrb state="thinking" size={44} />
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span>Connecting to Operator AI...</span>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-background text-muted-foreground text-xs gap-2 p-6 text-center">
        <AlertCircle className="h-6 w-6 text-amber-500" />
        <div className="font-semibold text-foreground">Unable to load widget configuration</div>
        <p className="text-[11px] text-muted-foreground">
          Please verify your organization ID or check that the widget is enabled in your settings.
        </p>
      </div>
    );
  }

  const brandingStyles = {
    "--primary-color": settings.theme.primaryColor || "#7a5af8",
    "--background-color": settings.theme.backgroundColor || "#ffffff",
    "--text-color": settings.theme.textColor || "#18181b",
    "--border-color": settings.theme.borderColor || "#e4e4e7",
    "--border-radius": settings.theme.borderRadius || "0.75rem",
  } as React.CSSProperties;

  return (
    <div
      className="flex flex-col h-dvh w-full overflow-hidden text-foreground antialiased bg-background font-sans select-text"
      style={brandingStyles}
    >
      {/* 1. Header */}
      <WidgetHeader
        companyName={settings.branding.companyName}
        tagline={settings.branding.tagline}
        logoUrl={settings.branding.logoUrl}
        aiState={aiState}
        onResetConversation={handleResetConversation}
        onClose={() => postToParent({ type: OPERATOR_WIDGET_EVENTS.TOGGLE })}
      />

      {/* 2. Main Content & Conversational Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 space-y-3.5 scroll-smooth"
      >
        {/* Zero-empty-state welcome layer when conversation has not been initiated by the visitor */}
        {!messages.some((m) => m.sender === "user") && activeInlineView === "none" && (
          <WidgetWelcome
            companyName={settings.branding.companyName}
            welcomeMessage={settings.branding.welcomeMessage}
            starterQuestions={settings.customization?.starterQuestions}
            hasServices={services.length > 0}
            hasBooking={services.length > 0}
            onSelectIntent={handleWelcomeIntent}
          />
        )}

        {/* Message bubbles (rendered once visitor has interacted) */}
        {messages.some((m) => m.sender === "user") && messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={cn("flex gap-2.5", isUser ? "justify-end" : "justify-start")}
            >
              {!isUser && (
                <div className="shrink-0 mt-0.5">
                  <OperatorAvatarOrb size={26} state={aiState === "responding" ? "responding" : "idle"} />
                </div>
              )}

              <div className={cn("flex flex-col max-w-[85%]", isUser ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs whitespace-pre-wrap break-words",
                    isUser
                      ? "bg-primary text-primary-foreground rounded-tr-xs"
                      : "bg-card border border-border/50 text-foreground rounded-tl-xs"
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground/60 px-1 mt-0.5">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}

        {/* Inline Service Catalog View */}
        {activeInlineView === "services" && (
          <WidgetServiceCards
            services={services}
            onSelectService={(s) => {
              setSelectedServiceForBooking(s);
              setActiveInlineView("scheduler");
            }}
          />
        )}

        {/* Inline Scheduler View */}
        {activeInlineView === "scheduler" && (
          <WidgetScheduler
            initialService={selectedServiceForBooking}
            services={services}
            staff={staff}
            onFetchSlots={handleFetchSlots}
            onBookAppointment={handleBookAppointment}
            onCancel={() => {
              setActiveInlineView("none");
              setSelectedServiceForBooking(null);
            }}
            onSuccess={handleBookingSuccess}
          />
        )}

        {/* Intelligent AI Thinking Status */}
        {aiState === "thinking" && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground animate-pulse w-fit">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-spin-slow" />
            <span>{thinkingLabel}</span>
          </div>
        )}
      </div>

      {/* 3. Adaptive Context-Aware Action Chips */}
      <WidgetQuickActions
        dynamicActions={dynamicActions}
        onAction={handleActionDispatch}
        hasBooking={services.length > 0 && staff.length > 0}
        hasServices={services.length > 0}
      />

      {/* 4. Intelligent Input Dock */}
      <WidgetInputBar
        onSendMessage={handleSendMessage}
        isLoading={aiState === "thinking"}
        contextPlaceholder={
          activeInlineView === "scheduler"
            ? "Need help with booking? Ask a question..."
            : undefined
        }
      />
    </div>
  );
}

export default function WidgetFramePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground text-xs gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Connecting to Operator...
        </div>
      }
    >
      <WidgetFrameContent />
    </Suspense>
  );
}
