"use client";import { Badge } from "@/components/shared/badge";

import React, { useState } from "react";
import { Network, Brain, Database, ShieldAlert, Sparkles } from "lucide-react";

interface BrainNode {
  name: string;
  role: string;
  desc: string;
  color: string;
}

const BRAIN_NODES: Record<string, BrainNode> = {
  knowledge: {
    name: "FAQ Knowledge Base",
    role: "Vector Database Ingestion",
    desc: "Ingests practice sheets, rules, PDF documents, guidelines, and prices. Automatically maps these into high-density semantic vectors for instant Retrieval-Augmented Generation (RAG) during conversations.",
    color: "text-primary-500 border-primary-500/30 bg-primary-500/5"
  },
  qualification: {
    name: "Lead Qualification Engine",
    role: "Criteria Matching & Scoring",
    desc: "Qualifies prospect criteria (urgency, geography, intake responses), scores lead value, checks insurance copays, and writes detailed intake card files straight to your CRM database.",
    color: "text-success-500 border-success-500/30 bg-success-500/5"
  },
  booking: {
    name: "Smart Booking Engine",
    role: "Calendar synchronization & buffers",
    desc: "Checks calendar slot availability, locks appointments, manages custom buffer gaps, sends text confirmations, handles reschedules, and synchronizes with Google/Outlook calendars.",
    color: "text-primary border-primary/30 bg-primary/5"
  },
  analytics: {
    name: "Performance Analytics",
    role: "Operational KPI evaluation",
    desc: "Compiles conversation metrics, computes CSAT, tracks booking rates, visualizes weekly revenue recovered, and runs real-time logs checking for routing friction.",
    color: "text-primary border-primary/30 bg-primary/5"
  }
};

export function AiBrain() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const getNodeClass = (key: string) => {
    if (!hoveredNode) {
      return "border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--foreground)/0.03)] text-foreground/80 hover:border-primary/40 hover:bg-primary/5";
    }
    return hoveredNode === key ?
    BRAIN_NODES[key].color + "border-primary scale-[1.02]" :
    "border-[hsl(var(--foreground)/0.03)] bg-[hsl(var(--foreground)/0.01)] text-muted-foreground/30";
  };

  return (
    <div className="mx-auto max-w-4xl w-full">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-space-6 items-center">
 {/* Graph representation */}
 <div className="relative radius-xl border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.01)] p-space-6 h-72 flex flex-col justify-between overflow-hidden">
 
 {/* SVG Dotted Grid Background */}
 <div className="absolute inset-space-0 dot-grid pointer-events-none opacity-40" />

 <div className="flex items-center justify-between z-10 border-b border-[hsl(var(--foreground)/0.06)] pb-space-3 mb-space-1">
 <div className="flex items-center gap-space-2">
 <Network className="h-4 w-4 text-primary" />
 <span className="text-caption text-foreground">Internal Brain Abstraction</span>
 </div>
 <span className="text-caption uppercase text-muted-foreground">Neural core</span>
 </div>

 {/* Central AI Brain Hub */}
 <div className="flex justify-center my-auto z-10">
 <div className="grid grid-cols-2 gap-space-3 w-full max-w-xs">
 {Object.keys(BRAIN_NODES).map((key) => {
                const node = BRAIN_NODES[key];
                return (
                  <div
                    key={key}
                    className={`radius-lg border px-space-4 py-space-4 cursor-pointer text-center transition-all duration-200 ${getNodeClass(key)}`}
                    onMouseEnter={() => setHoveredNode(key)}
                    onMouseLeave={() => setHoveredNode(null)}>
                    
 <span className="text-caption tracking-tight block">{node.name.split("")[0]}</span>
 <span className="text-caption opacity-75 mt-space-1 block font-mono">{node.name.split("").slice(1).join("")}</span>
 </div>);

              })}
 </div>
 </div>

 <div className="border-t border-[hsl(var(--foreground)/0.06)] pt-space-3 text-caption text-muted-foreground flex items-center justify-between z-10">
 <span>Graph nodes interactive</span>
 <span className="flex items-center gap-space-1 text-primary">
 <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Network online
 </span>
 </div>
 </div>

 {/* Explain Card */}
 <div className="radius-xl border border-[hsl(var(--foreground)/0.06)] bg-card p-space-5 h-72 flex flex-col justify-between">
 {hoveredNode ?
          <div className="space-y-space-4 flex-1 flex flex-col justify-between">
 <div className="space-y-space-2 animate-fade-in">
 <span className="text-caption uppercase tracking-wider text-primary">
 {BRAIN_NODES[hoveredNode].role}
 </span>
 <h4 className="text-body-sm text-foreground">
 {BRAIN_NODES[hoveredNode].name}
 </h4>
 <p className="text-caption text-muted-foreground leading-relaxed">
 {BRAIN_NODES[hoveredNode].desc}
 </p>
 </div>
 
 <Badge className="mt-space-3">
 <span className="h-1.5 w-1.5 radius-md bg-primary animate-pulse" />
 Active Node Module Ingesting
 </Badge>
 </div> :

          <div className="flex-1 flex flex-col items-center justify-center text-center p-space-4 space-y-space-2">
 <div className="radius-md bg-primary/10 p-space-3 text-primary">
 <Brain className="h-5 w-5" />
 </div>
 <p className="text-body-sm text-foreground">AI Brain Core</p>
 <p className="text-caption text-muted-foreground leading-relaxed">
  Hover over the network modules on the left to read detailed descriptions of how Operator AI structures business data, triages requests, and automates calendar workflows.
  </p>
 </div>
          }
 </div>
 </div>
 </div>);

}