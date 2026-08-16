import React from "react";
import { CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/card";
import { ReadinessScoreResult } from "@/lib/setup-engine/types";

export function ReadinessDashboard({ 
  readiness, 
  confidence 
}: { 
  readiness: ReadinessScoreResult;
  confidence: number;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreStroke = (score: number) => {
    if (score >= 80) return "stroke-green-500";
    if (score >= 50) return "stroke-amber-500";
    return "stroke-red-500";
  };

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - readiness.overallScore / 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-6">
      <Card className="border border-border-default bg-card radius-xl overflow-hidden relative">
        <CardContent className="p-space-6 flex items-center justify-between gap-space-6">
          <div className="space-y-space-2 flex-1">
            <h3 className="text-body-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Receptionist Readiness
            </h3>
            <div className="flex items-baseline gap-space-2">
              <span className={`text-display-sm font-bold tracking-tight ${getScoreColor(readiness.overallScore)}`}>
                {readiness.overallScore}%
              </span>
            </div>
            
            <div className="pt-space-2 space-y-space-1.5">
              {readiness.missingAreas.length === 0 ? (
                <div className="flex items-center gap-space-2 text-caption text-[hsl(var(--state-success-text))]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>All core areas completed</span>
                </div>
              ) : (
                <div className="flex items-start gap-space-2 text-caption text-[hsl(var(--state-warning-text))]">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-space-0.5" />
                  <span>Missing: {readiness.missingAreas.join(", ")}</span>
                </div>
              )}
            </div>
          </div>

          <div className="relative shrink-0 flex items-center justify-center">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                className="text-muted/20 stroke-current"
                strokeWidth="8"
                cx="48"
                cy="48"
                r={radius}
                fill="transparent"
              />
              <circle
                className={`${getScoreStroke(readiness.overallScore)} transition-all duration-1000 ease-out`}
                strokeWidth="8"
                strokeLinecap="round"
                cx="48"
                cy="48"
                r={radius}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border-default bg-card radius-xl overflow-hidden">
        <CardContent className="p-space-6 flex flex-col justify-center h-full">
          <div className="flex items-center justify-between mb-space-4">
            <h3 className="text-body-sm font-semibold tracking-wide uppercase text-muted-foreground">
              AI Confidence Meter
            </h3>
            <HelpCircle className="h-4 w-4 text-muted-foreground/60" />
          </div>
          
          <div className="space-y-space-3">
            <div className="flex justify-between items-end">
              <span className={`text-heading-lg font-bold ${getScoreColor(confidence)}`}>
                {confidence}%
              </span>
              <span className="text-caption text-muted-foreground mb-space-1">
                {confidence >= 80 ? "High understanding" : confidence >= 50 ? "Basic understanding" : "Needs more data"}
              </span>
            </div>
            
            <div className="h-2 w-full bg-muted/20 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${getScoreColor(confidence).replace("text-", "bg-")}`}
                style={{ width: `${confidence}%` }}
              />
            </div>
            
            <p className="text-caption text-muted-foreground pt-space-1">
              Add more FAQs and website content to increase AI accuracy and automation rates.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
