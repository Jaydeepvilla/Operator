"use client";

import React, { useEffect, useRef, useImperativeHandle } from "react";
import { cn } from "@/components/shared/utils";

export interface ScrollAreaProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onScroll"> {
  children: React.ReactNode;
  horizontal?: boolean;
  vertical?: boolean;
  wheelPropagation?: boolean;
  onScroll?: (e: Event) => void;
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ children, className, horizontal = true, vertical = true, wheelPropagation = false, onScroll, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const psRef = useRef<any>(null);

    // Forward ref to the inner container
    useImperativeHandle(ref, () => containerRef.current!);

    useEffect(() => {
      if (!containerRef.current) return;
      let resizeObserver: ResizeObserver | null = null;

      const initPs = async () => {
        const { default: Ps } = await import("perfect-scrollbar");
        if (!containerRef.current) return;

        const PsConstructor = Ps as any;
        psRef.current = new PsConstructor(containerRef.current, {
          suppressScrollX: !horizontal,
          suppressScrollY: !vertical,
          wheelPropagation: wheelPropagation,
        });

        if (typeof window !== "undefined" && "ResizeObserver" in window) {
          resizeObserver = new ResizeObserver(() => {
            if (psRef.current) {
              psRef.current.update();
            }
          });
          resizeObserver.observe(containerRef.current);
        }

        // Register custom scroll listeners if requested
        if (onScroll && containerRef.current) {
          containerRef.current.addEventListener("ps-scroll-y", onScroll);
          containerRef.current.addEventListener("ps-scroll-x", onScroll);
        }
      };

      initPs();

      return () => {
        if (psRef.current) {
          psRef.current.destroy();
          psRef.current = null;
        }
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        if (containerRef.current && onScroll) {
          containerRef.current.removeEventListener("ps-scroll-y", onScroll);
          containerRef.current.removeEventListener("ps-scroll-x", onScroll);
        }
      };
    }, [horizontal, vertical, wheelPropagation, onScroll]);

    // Update perfect-scrollbar whenever the component renders (to handle content resizing)
    useEffect(() => {
      if (psRef.current) {
        psRef.current.update();
      }
    });

    return (
      <div
        ref={containerRef}
        className={cn("relative overflow-hidden w-full h-full overscroll-contain ps", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ScrollArea.displayName = "ScrollArea";
