"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./dialog";
import { Button } from "./button";
import { AlertTriangle, Trash2, Archive, HelpCircle } from "lucide-react";
import { cn } from "./utils";

export type ConfirmVariant = "danger" | "warning" | "info" | "default";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  variant?: ConfirmVariant;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = true,
  variant,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const effectiveVariant: ConfirmVariant =
    variant || (isDestructive ? "danger" : "default");

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 border border-border/80 shadow-2xl backdrop-blur-2xl rounded-2xl p-6">
        <DialogHeader className="gap-3">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                effectiveVariant === "danger" &&
                  "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400",
                effectiveVariant === "warning" &&
                  "bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400",
                (effectiveVariant === "info" || effectiveVariant === "default") &&
                  "bg-primary/10 border-primary/20 text-primary"
              )}
            >
              {effectiveVariant === "danger" && <Trash2 className="h-5 w-5" />}
              {effectiveVariant === "warning" && <Archive className="h-5 w-5" />}
              {effectiveVariant === "info" && <AlertTriangle className="h-5 w-5" />}
              {effectiveVariant === "default" && <HelpCircle className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-body-md font-bold text-foreground leading-snug">
                {title}
              </DialogTitle>
              <DialogDescription className="pt-2 text-muted-foreground text-body-sm leading-relaxed whitespace-pre-line">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-6 gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="text-body-sm cursor-pointer"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={effectiveVariant === "danger" ? "destructive" : "default"}
            onClick={handleConfirm}
            loading={isLoading}
            className={cn(
              "text-body-sm cursor-pointer",
              effectiveVariant === "warning" &&
                "bg-amber-600 hover:bg-amber-700 text-white border-transparent"
            )}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Global Programmatic Confirm Hook & Provider
// ─────────────────────────────────────────────────────────────────────────────

export interface ConfirmOptions {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  variant?: ConfirmVariant;
}

export type ConfirmFunction = (options: string | ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFunction | null>(null);

export function useConfirm(): ConfirmFunction {
  const context = React.useContext(ConfirmContext);
  if (!context) {
    return async (options: string | ConfirmOptions) => {
      const msg =
        typeof options === "string"
          ? options
          : `${options.title || "Confirm"}\n\n${options.description}`;
      return typeof window !== "undefined" ? window.confirm(msg) : true;
    };
  }
  return context;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    isDestructive: boolean;
    variant: ConfirmVariant;
    resolver: ((val: boolean) => void) | null;
  }>({
    isOpen: false,
    title: "Confirm Action",
    description: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    isDestructive: false,
    variant: "default",
    resolver: null,
  });

  const confirm: ConfirmFunction = React.useCallback((options: string | ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      if (typeof options === "string") {
        const lower = options.toLowerCase();
        const isArchive = lower.includes("archive");
        const isDelete =
          lower.includes("delete") ||
          lower.includes("remove") ||
          lower.includes("reset") ||
          lower.includes("sign out");

        let variant: ConfirmVariant = "default";
        let defaultTitle = "Confirmation Required";
        let defaultConfirm = "Proceed";
        let isDestructive = false;

        if (isArchive) {
          variant = "warning";
          defaultTitle = "Archive Item?";
          defaultConfirm = "Archive";
        } else if (isDelete) {
          variant = "danger";
          defaultTitle = "Are you sure?";
          defaultConfirm = "Delete";
          isDestructive = true;
        }

        setState({
          isOpen: true,
          title: defaultTitle,
          description: options,
          confirmText: defaultConfirm,
          cancelText: "Cancel",
          isDestructive,
          variant,
          resolver: resolve,
        });
      } else {
        const variant =
          options.variant ||
          (options.isDestructive ? "danger" : "default");

        setState({
          isOpen: true,
          title: options.title || "Confirmation Required",
          description: options.description,
          confirmText: options.confirmText || (variant === "danger" ? "Delete" : "Confirm"),
          cancelText: options.cancelText || "Cancel",
          isDestructive: options.isDestructive ?? (variant === "danger"),
          variant,
          resolver: resolve,
        });
      }
    });
  }, []);

  const handleClose = (result: boolean) => {
    state.resolver?.(result);
    setState((prev) => ({ ...prev, isOpen: false, resolver: null }));
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={state.isOpen} onOpenChange={(open) => !open && handleClose(false)}>
        <DialogContent className="sm:max-w-md bg-card/95 border border-border shadow-2xl backdrop-blur-2xl rounded-2xl p-6">
          <DialogHeader className="gap-3">
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                  state.variant === "danger" &&
                    "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400",
                  state.variant === "warning" &&
                    "bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400",
                  (state.variant === "info" || state.variant === "default") &&
                    "bg-primary/10 border-primary/20 text-primary"
                )}
              >
                {state.variant === "danger" && <Trash2 className="h-5 w-5" />}
                {state.variant === "warning" && <Archive className="h-5 w-5" />}
                {state.variant === "info" && <AlertTriangle className="h-5 w-5" />}
                {state.variant === "default" && <HelpCircle className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-body-md font-bold text-foreground leading-snug">
                  {state.title}
                </DialogTitle>
                <DialogDescription className="pt-2 text-muted-foreground text-body-sm leading-relaxed whitespace-pre-line">
                  {state.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              className="text-body-sm cursor-pointer"
            >
              {state.cancelText}
            </Button>
            <Button
              type="button"
              variant={state.variant === "danger" ? "destructive" : "default"}
              onClick={() => handleClose(true)}
              className={cn(
                "text-body-sm cursor-pointer",
                state.variant === "warning" &&
                  "bg-amber-600 hover:bg-amber-700 text-white border-transparent"
              )}
            >
              {state.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
