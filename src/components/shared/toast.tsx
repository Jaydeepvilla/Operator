"use client";

import React, { createContext, useContext, useCallback, useReducer, useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { Button } from "@/components/shared/button";
import { cn } from "./utils";
import { m, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

type ToastAction =
  | { type: "ADD"; toast: Toast }
  | { type: "REMOVE"; id: string };

// ─── Context ─────────────────────────────────────────────────────────────────

interface ToastContextValue {
  toast: (options: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Reducer ─────────────────────────────────────────────────────────────────

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case "ADD":
      return [...state, action.toast];
    case "REMOVE":
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

// ─── Individual Toast Component ───────────────────────────────────────────────

const variantConfig: Record<ToastVariant, { icon: React.ReactNode; border: string; progressColor: string }> = {
  success: {
    icon: (
      <m.div
        initial={{ scale: 0.5, rotate: -30, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        <CheckCircle2 className="h-4 w-4 text-success-500 shrink-0" />
      </m.div>
    ),
    border: "border-success-500/20",
    progressColor: "bg-success-500",
  },
  error: {
    icon: (
      <m.div
        initial={{ x: -10, opacity: 0 }}
        animate={{ x: [10, -8, 6, -4, 0], opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <XCircle className="h-4 w-4 text-error-500 shrink-0" />
      </m.div>
    ),
    border: "border-error-500/20",
    progressColor: "bg-error-500",
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4 text-warning-500 shrink-0" />,
    border: "border-warning-500/20",
    progressColor: "bg-warning-500",
  },
  info: {
    icon: <Info className="h-4 w-4 text-primary shrink-0" />,
    border: "border-primary/20",
    progressColor: "bg-primary",
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const config = variantConfig[toast.variant];
  const duration = toast.duration ?? 4000;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    const interval = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - (100 / (duration / 50))));
    }, 50);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [toast.id, duration, onDismiss]);

  return (
    <div
      className={cn(
        "group relative flex w-full max-w-sm items-start gap-space-3 radius-lg border bg-card backdrop-blur-md p-space-4 overflow-hidden shadow-xl shadow-black/5 dark:shadow-black/30",
        config.border
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="mt-space-0 shrink-0">{config.icon}</div>
      <div className="flex-1 min-w-0 space-y-space-1">
        <p className="text-body-sm font-medium text-foreground leading-tight">{toast.title}</p>
        {toast.description && (
          <p className="text-caption text-muted-foreground leading-relaxed">{toast.description}</p>
        )}
        {toast.action && (
          <Button
            onClick={() => { toast.action!.onClick(); onDismiss(); }}
            variant="link"
            size="xs"
            className="mt-space-1 h-auto"
          >
            {toast.action.label}
          </Button>
        )}
      </div>
      <Button
        onClick={onDismiss}
        variant="ghost"
        size="icon-xs"
        aria-label="Dismiss notification"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </Button>

      {/* Auto-dismiss progress bar */}
      <div className="absolute bottom-space-0 left-space-0 right-space-0 h-0.5 bg-[hsl(var(--foreground)/0.04)]">
        <div
          className={cn("h-full transition-[width] duration-100 ease-linear", config.progressColor, "opacity-50")}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const dismiss = useCallback((id: string) => {
    dispatch({ type: "REMOVE", id });
  }, []);

  const toast = useCallback((options: Omit<Toast, "id">) => {
    const id = `toast_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    dispatch({ type: "ADD", toast: { id, ...options } });
  }, []);

  const success = useCallback(
    (title: string, description?: string) => toast({ title, description, variant: "success" }),
    [toast]
  );
  const error = useCallback(
    (title: string, description?: string) => toast({ title, description, variant: "error", duration: 6000 }),
    [toast]
  );
  const warning = useCallback(
    (title: string, description?: string) => toast({ title, description, variant: "warning" }),
    [toast]
  );
  const info = useCallback(
    (title: string, description?: string) => toast({ title, description, variant: "info" }),
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      {/* Toast Viewport */}
      <div
        aria-label="Notifications"
        className="fixed bottom-space-6 right-space-6 z-50 flex flex-col gap-space-3 w-full max-w-sm pointer-events-none"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <m.div
              layout
              key={t.id}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="pointer-events-auto origin-bottom"
            >
              <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
