"use client";

import { useState } from "react";
import { Mail, Check, ArrowRight, Sparkles } from "lucide-react";
import { Input } from "@/components/shared/input";
import { Button } from "@/components/shared/button";
import { NativeButton } from "@/components/shared/native";

export function StayUpToDateSection({ className = "" }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setStatus("loading");
    setTimeout(() => {
      setStatus("success");
      setEmail("");
    }, 600);
  };

  return (
    <section className={`relative overflow-hidden py-space-20 md:py-space-24 border-t border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.015)] ${className}`}>
      {/* Ambient background light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-64 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 dot-grid opacity-15 pointer-events-none" />

      <div className="relative container mx-auto max-w-3xl px-space-6 text-center z-10">
        <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border-primary/20 bg-primary/5 mb-space-5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-caption font-medium uppercase tracking-widest text-primary">
            Product Dispatch
          </span>
        </div>

        <h2 className="text-heading-xl md:text-heading-2xl font-bold tracking-tight text-foreground mb-space-3">
          Stay up to date
        </h2>
        <p className="text-body-md text-muted-foreground mb-space-8 max-w-lg mx-auto leading-relaxed">
          Get notified when new capabilities and integrations ship. No spam, only meaningful engineering updates.
        </p>

        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          {status === "success" ? (
            <div className="flex items-center justify-center gap-2 p-space-4 rounded-xl border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-medium text-body-sm animate-in fade-in zoom-in-95 duration-200">
              <Check className="h-4 w-4" />
              <span>You're on the list! We'll keep you posted.</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-space-2.5 p-space-1.5 rounded-2xl border-[hsl(var(--foreground)/0.08)] bg-card/60 backdrop-blur-md shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <div className="relative flex-1 flex items-center">
                <Mail className="absolute left-3.5 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-transparent border-0 pl-10 pr-3 py-2.5 text-body-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:outline-none"
                />
              </div>
              <Button
                type="submit"
                variant="default"
                disabled={status === "loading"}
                className="font-medium px-space-5 py-space-2.5 shadow-sm text-body-sm cursor-pointer select-none"
              >
                {status === "loading" ? "Subscribing..." : "Subscribe"}
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          )}

          <p className="text-caption text-muted-foreground/60 mt-space-3 font-mono">
            Join 4,200+ clinic managers and business owners • Unsubscribe anytime
          </p>
        </form>
      </div>
    </section>
  );
}
