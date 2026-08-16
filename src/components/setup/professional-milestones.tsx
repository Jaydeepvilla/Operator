import React from "react";
import { ShieldCheck, ArrowRight, Zap, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import Link from "next/link";

export function ProfessionalMilestones() {
  return (
    <Card className="border border-[hsl(142_71%_45%/0.3)] bg-[hsl(142_71%_45%/0.02)] radius-2xl overflow-hidden relative">
      <div className="absolute top-space-0 left-space-0 w-full h-1.5 bg-gradient-to-r from-[hsl(142_71%_45%)] to-emerald-300" />
      <CardContent className="p-space-8 md:p-space-12 flex flex-col items-center text-center">
        <div className="h-20 w-20 bg-[hsl(142_71%_45%/0.1)] rounded-full flex items-center justify-center mb-space-6 shadow-xl">
          <Trophy className="h-10 w-10 text-[hsl(142_71%_45%)]" />
        </div>
        
        <h2 className="text-heading-lg font-bold text-foreground mb-space-3">
          Operator is Fully Ready
        </h2>
        
        <p className="text-body-lg text-muted-foreground max-w-xl mx-auto mb-space-8">
          You've completed all recommended setup phases. Operator is equipped with your business knowledge, services, and scheduling rules.
        </p>
        
        <div className="grid sm:grid-cols-2 gap-space-4 w-full max-w-2xl mb-space-8 text-left">
          <div className="flex items-start gap-space-3 p-space-4 radius-lg bg-background border border-border-default/50">
            <Zap className="h-5 w-5 text-amber-500 shrink-0 mt-space-0.5" />
            <div>
              <h4 className="text-body-sm font-semibold text-foreground">Immediate Impact</h4>
              <p className="text-caption text-muted-foreground mt-space-1">You can now expect to automate up to 80% of inbound scheduling queries.</p>
            </div>
          </div>
          <div className="flex items-start gap-space-3 p-space-4 radius-lg bg-background border border-border-default/50">
            <ShieldCheck className="h-5 w-5 text-green-500 shrink-0 mt-space-0.5" />
            <div>
              <h4 className="text-body-sm font-semibold text-foreground">High Confidence</h4>
              <p className="text-caption text-muted-foreground mt-space-1">With full business context, AI hallucination risk is near zero.</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-space-4">
          <Link href="/dashboard" passHref>
            <Button size="lg" variant="secondary">Return to Dashboard</Button>
          </Link>
          <Link href="/settings" passHref>
            <Button size="lg" className="bg-[hsl(142_71%_45%)] hover:bg-[hsl(142_71%_45%)]/90 text-white gap-space-2">
              Launch Channels <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
