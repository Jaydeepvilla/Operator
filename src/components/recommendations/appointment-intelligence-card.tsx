import React from "react";
import { HealthScoreResult } from "@/lib/health-engine/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/card";
import { ShieldAlert, ShieldCheck, Shield, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/shared/button";
import Link from "next/link";

export function AppointmentIntelligenceCard({ quality }: { quality: HealthScoreResult }) {
  return (
    <Card className="border border-border-default radius-xl overflow-hidden flex flex-col h-full hover:border-primary/20 transition-colors">
      <CardHeader className="bg-muted/5 border-b border-border-default pb-space-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-body-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Appointment Engine
          </CardTitle>
          {quality.score >= 80 ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : quality.score >= 50 ? (
            <Shield className="h-5 w-5 text-amber-500" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-red-500" />
          )}
        </div>
        <div className="flex items-baseline gap-space-2 mt-space-2">
          <span className={`text-heading-lg font-bold tracking-tight ${
            quality.score >= 80 ? "text-green-500" : quality.score >= 50 ? "text-amber-500" : "text-red-500"
          }`}>
            {quality.score}%
          </span>
          <span className="text-body-sm text-muted-foreground">{quality.status}</span>
        </div>
      </CardHeader>
      <CardContent className="p-space-5 flex flex-col flex-1">
        <p className="text-body-sm text-foreground mb-space-4">
          {quality.reason}
        </p>
        
        {quality.missingRequirements.length > 0 && (
          <div className="mb-space-4">
            <h4 className="text-caption font-semibold text-muted-foreground mb-space-2 uppercase">Critical Issues</h4>
            <ul className="space-y-space-1">
              {quality.missingRequirements.slice(0, 3).map((req, i) => (
                <li key={i} className="flex items-start gap-space-2 text-body-sm text-[hsl(var(--state-error-text))]">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-space-0.5" />
                  <span className="line-clamp-1">{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {quality.recommendations.length > 0 && (
          <div className="mb-space-6">
            <h4 className="text-caption font-semibold text-muted-foreground mb-space-2 uppercase">Suggestions</h4>
            <ul className="list-disc pl-space-4 space-y-space-1">
              {quality.recommendations.slice(0, 2).map((rec, i) => (
                <li key={i} className="text-body-sm text-muted-foreground line-clamp-2">{rec}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="mt-auto pt-space-4 flex justify-between items-center border-t border-border-default/50">
          <span className="text-caption text-muted-foreground">
            Confidence: {quality.confidence}%
          </span>
          <Link href="/appointments" passHref>
            <Button size="sm" variant="outline" className="gap-space-1 h-8 px-space-2">
              Optimize <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
