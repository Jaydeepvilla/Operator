"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/shared/dialog";
import { Button } from "@/components/shared/button";
import { Phone, Sparkles, CheckCircle2 } from "lucide-react";

interface UpgradeProModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  feature?: string;
}

export function UpgradeProModal({
  open,
  onOpenChange,
  title = "Upgrade to Pro",
  description = "AI Phone Receptionist with 24/7 call answering, instant call summaries, and intelligent call routing is available on Pro and Business plans.",
  feature = "voice",
}: UpgradeProModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onOpenChange(false);
    router.push(`/billing?upgrade=pro&feature=${feature}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/80 radius-2xl p-6 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-inner">
            <Phone className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-body-sm text-muted-foreground leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="my-3 space-y-2.5 rounded-xl border border-border/50 bg-muted/30 p-3.5">
          <div className="flex items-center gap-2.5 text-xs text-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>250 included Voice AI phone answering minutes / mo</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Automated missed-call text-back and booking links</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Custom call transfer rules & staff routing</span>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto font-medium"
            onClick={() => onOpenChange(false)}
          >
            Maybe Later
          </Button>
          <Button
            type="button"
            className="w-full sm:flex-1 font-semibold gap-1.5 shadow-md"
            onClick={handleUpgrade}
          >
            <Sparkles className="h-4 w-4" />
            Upgrade to Pro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

