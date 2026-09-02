"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/card";
import { QualityScoreResult } from "@/lib/quality-engine/knowledge-quality"; // Note: same interface used by CRM
import { Users, TrendingUp, TrendingDown, Minus, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/shared/button";
import Link from "next/link";

interface CrmIntelligenceCardProps {
  quality: QualityScoreResult;
}

export function CrmIntelligenceCard({ quality }: CrmIntelligenceCardProps) {
  return (
    <Card className="border border-border-default radius-xl overflow-hidden flex flex-col h-full bg-gradient-to-br from-background to-purple-500/5 hover:border-purple-500/30 transition-colors">
      <CardHeader className="border-b border-border-default/50 pb-space-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-body-md font-semibold flex items-center gap-space-2 text-primary">
            <Users className="h-5 w-5" />
            CRM Quality Engine
          </CardTitle>
          {quality.trend === "up" ? (
             <TrendingUp className="h-5 w-5 text-green-500" />
          ) : quality.trend === "down" ? (
             <TrendingDown className="h-5 w-5 text-red-500" />
          ) : (
             <Minus className="h-5 w-5 text-amber-500" />
          )}
        </div>
        
        <div className="flex items-baseline gap-space-2 mt-space-3">
          <span className={`text-heading-xl font-bold tracking-tight ${
            quality.score >= 80 ? "text-green-500" : quality.score >= 50 ? "text-amber-500" : "text-red-500"
          }`}>
            {quality.score}
          </span>
          <span className="text-body-sm text-muted-foreground">/ 100 Score</span>
        </div>
        
        <div className="mt-space-2 w-full bg-muted radius-full h-2 overflow-hidden">
          <div 
            className="bg-purple-500 h-full transition-all duration-500 ease-out" 
            style={{ width: `${quality.coverage}%` }} 
          />
        </div>
        <p className="text-caption text-muted-foreground mt-space-1">{quality.coverage}% Data Completeness</p>
      </CardHeader>
      
      <CardContent className="p-space-5 flex flex-col flex-1 space-y-space-4">
        <div>
           <h4 className="text-caption font-semibold text-muted-foreground mb-space-2 uppercase">Strengths</h4>
           <ul className="space-y-space-2">
             {quality.strongAreas.length === 0 && <li className="text-body-sm text-muted-foreground">No strengths detected yet.</li>}
             {quality.strongAreas.map((area, i) => (
               <li key={i} className="flex items-start gap-space-2 text-body-sm">
                 <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-space-0.5" />
                 <span>{area}</span>
               </li>
             ))}
           </ul>
        </div>
        
        <div>
           <h4 className="text-caption font-semibold text-muted-foreground mb-space-2 uppercase">Weaknesses</h4>
           <ul className="space-y-space-2">
             {quality.weakAreas.length === 0 && <li className="text-body-sm text-muted-foreground">No weaknesses detected.</li>}
             {quality.weakAreas.map((area, i) => (
               <li key={i} className="flex items-start gap-space-2 text-body-sm">
                 <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-space-0.5" />
                 <span>{area}</span>
               </li>
             ))}
           </ul>
        </div>
        
        <div className="mt-auto pt-space-4">
          <Link href="/contacts" passHref>
            <Button variant="outline" className="w-full">Manage Customers</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
