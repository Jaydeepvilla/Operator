"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./dialog";
import { Button } from "./button";
import { AlertTriangle } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
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
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);

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
      <DialogContent className="sm:max-w-md bg-card/95 border border-border/80 shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-space-2 text-foreground font-semibold">
            {isDestructive && <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />}
            {title}
          </DialogTitle>
          <DialogDescription className="pt-space-2 text-muted-foreground text-body-sm leading-relaxed whitespace-pre-line">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-space-6 gap-space-2 sm:gap-space-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={isDestructive ? "destructive" : "default"}
            onClick={handleConfirm}
            loading={isLoading}
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
}

export type ConfirmFunction = (options: string | ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFunction | null>(null);

export function useConfirm(): ConfirmFunction {
  const context = React.useContext(ConfirmContext);
  if (!context) {
    return async (options: string | ConfirmOptions) => {
      const msg = typeof options === "string" ? options : `${options.title || "Confirm"}\n\n${options.description}`;
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
    resolver: ((val: boolean) => void) | null;
  }>({
    isOpen: false,
    title: "Confirm Action",
    description: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    isDestructive: true,
    resolver: null,
  });

  const confirm: ConfirmFunction = React.useCallback((options: string | ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      if (typeof options === "string") {
        const isDelete =
          options.toLowerCase().includes("delete") ||
          options.toLowerCase().includes("remove") ||
          options.toLowerCase().includes("reset") ||
          options.toLowerCase().includes("sign out");
        setState({
          isOpen: true,
          title: isDelete ? "Are you sure?" : "Confirmation Required",
          description: options,
          confirmText: isDelete ? "Delete" : "Proceed",
          cancelText: "Cancel",
          isDestructive: isDelete,
          resolver: resolve,
        });
      } else {
        setState({
          isOpen: true,
          title: options.title || "Confirmation Required",
          description: options.description,
          confirmText: options.confirmText || "Confirm",
          cancelText: options.cancelText || "Cancel",
          isDestructive: options.isDestructive ?? true,
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
        <DialogContent className="sm:max-w-md bg-card/95 border border-border/80 shadow-2xl backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-semibold">
              {state.isDestructive && <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />}
              {state.title}
            </DialogTitle>
            <DialogDescription className="pt-2 text-muted-foreground text-body-sm leading-relaxed whitespace-pre-line">
              {state.description}
            </DialogDescription>
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
              variant={state.isDestructive ? "destructive" : "default"}
              onClick={() => handleClose(true)}
              className="text-body-sm cursor-pointer"
            >
              {state.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
