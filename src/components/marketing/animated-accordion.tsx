"use client";

import * as React from "react";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/components/shared/utils";

export interface AccordionItem {
  q: string;
  a: string;
  category?: string;
}

interface AnimatedAccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  className?: string;
}

export function AnimatedAccordion({
  items,
  allowMultiple = false,
  className,
}: AnimatedAccordionProps) {
  const [openIndices, setOpenIndices] = useState<number[]>([0]); // First item open by default

  const toggleIndex = (idx: number) => {
    if (allowMultiple) {
      setOpenIndices((prev) =>
        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
      );
    } else {
      setOpenIndices((prev) => (prev.includes(idx) ? [] : [idx]));
    }
  };

  return (
    <div className={cn("space-y-space-3 divide-y-0", className)}>
      {items.map((item, idx) => {
        const isOpen = openIndices.includes(idx);
        const itemId = `faq-item-${idx}`;
        const contentId = `faq-content-${idx}`;

        return (
          <div
            key={idx}
            className={cn(
              "rounded-xl border transition-all duration-300 overflow-hidden",
              "bg-card/40 backdrop-blur-xs",
              isOpen
                ? "border-primary/25 bg-card/70 shadow-xs"
                : "border-[hsl(var(--foreground)/0.06)] hover:border-[hsl(var(--foreground)/0.12)] hover:bg-card/60"
            )}
          >
            {/* Question Header Button */}
            <button
              id={itemId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={contentId}
              onClick={() => toggleIndex(idx)}
              className="w-full flex items-center justify-between gap-space-4 px-space-6 py-space-5 text-left select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span
                className={cn(
                  "text-body-md font-semibold tracking-tight transition-colors duration-200",
                  isOpen ? "text-primary" : "text-foreground"
                )}
              >
                {item.q}
              </span>
              <div
                className={cn(
                  "flex items-center justify-center h-7 w-7 rounded-full shrink-0 transition-all duration-300",
                  isOpen
                    ? "bg-primary/10 text-primary rotate-180"
                    : "bg-[hsl(var(--foreground)/0.04)] text-muted-foreground rotate-0"
                )}
              >
                <ChevronDown className="h-4 w-4" />
              </div>
            </button>

            {/* Smooth Animated Height Panel via Grid Transition */}
            <div
              id={contentId}
              role="region"
              aria-labelledby={itemId}
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <div className="px-space-6 pb-space-5 pt-space-1 text-body-sm text-muted-foreground leading-relaxed border-t border-[hsl(var(--foreground)/0.04)]">
                  {item.a}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
