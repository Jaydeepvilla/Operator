import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/card";
import { ShieldCheck, ShieldAlert, Shield, Brain, ArrowRight, AlertTriangle, MessageSquare } from "lucide-react";
import { GlobalAIReadiness } from "@/lib/ai-readiness-engine";
import { Button } from "@/components/shared/button";
import Link from "next/link";

export function AIReadinessCard({ readiness }: { readiness: GlobalAIReadiness }) {
  const { overallScore, overallConfidence, domains, criticalMissingInformation } = readiness;

  return (
    <Card className="border border-border-default radius-xl overflow-hidden flex flex-col h-full bg-gradient-to-br from-indigo-500/5 to-purple-500/5 hover:border-indigo-500/30 transition-colors relative">
      <div className="absolute top-space-0 left-space-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
      <CardHeader className="border-b border-border-default/50 pb-space-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-body-sm font-semibold tracking-wide uppercase text-indigo-500 flex items-center gap-space-2">
            <Brain className="h-4 w-4" /> AI Readiness Engine
          </CardTitle>
          {overallScore >= 80 ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : overallScore >= 50 ? (
            <Shield className="h-5 w-5 text-amber-500" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-red-500" />
          )}
        </div>
        
        <div className="flex items-end gap-space-4 mt-space-3">
          <div>
            <div className="text-caption text-muted-foreground mb-space-1">Knowledge Coverage</div>
            <div className="flex items-baseline gap-space-1">
              <span className={`text-heading-lg font-bold tracking-tight ${
                overallScore >= 80 ? "text-green-500" : overallScore >= 50 ? "text-amber-500" : "text-red-500"
              }`}>
                {overallScore}%
              </span>
            </div>
          </div>
          <div>
            <div className="text-caption text-muted-foreground mb-space-1">AI Confidence</div>
            <div className="flex items-baseline gap-space-1">
              <span className={`text-heading-md font-bold tracking-tight ${
                overallConfidence >= 80 ? "text-green-500" : overallConfidence >= 50 ? "text-amber-500" : "text-red-500"
              }`}>
                {overallConfidence}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-space-5 flex flex-col flex-1">
        <div className="space-y-space-4 mb-space-4">
          <div className="flex justify-between items-center">
            <span className="text-body-sm text-foreground flex items-center gap-space-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" /> Contact Questions
            </span>
            <span className="text-body-sm font-medium">{domains.contact.readinessScore}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-body-sm text-foreground flex items-center gap-space-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" /> Business Hours & Availability
            </span>
            <span className="text-body-sm font-medium">{domains.businessHours.readinessScore}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-body-sm text-foreground flex items-center gap-space-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" /> Policies & Guidelines
            </span>
            <span className="text-body-sm font-medium">{domains.policies.readinessScore}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-body-sm text-foreground flex items-center gap-space-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" /> Services & Pricing
            </span>
            <span className="text-body-sm font-medium">{domains.services.readinessScore}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-body-sm text-foreground flex items-center gap-space-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" /> Booking & Availability
            </span>
            <span className="text-body-sm font-medium">{domains.booking.readinessScore}%</span>
          </div>
        </div>
        
        {criticalMissingInformation.length > 0 && (
          <div className="mb-space-4 mt-auto">
            <h4 className="text-caption font-semibold text-muted-foreground mb-space-2 uppercase">Critical Missing Data</h4>
            <ul className="space-y-space-1">
              {criticalMissingInformation.slice(0, 3).map((req, i) => (
                <li key={i} className="flex items-start gap-space-2 text-body-sm text-[hsl(var(--state-error-text))]">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-space-0.5" />
                  <span className="line-clamp-1">{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="mt-space-4 pt-space-4 flex justify-between items-center border-t border-border-default/50">
          <span className="text-caption text-muted-foreground">
            {Object.values(domains).reduce((acc, curr) => acc + curr.improvements.length, 0)} improvements found
          </span>
          <Link href="/settings/ai" passHref>
            <Button size="sm" variant="default" className="gap-space-1 h-8 px-space-3 bg-indigo-600 hover:bg-indigo-700 text-white">
              View Readiness <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
