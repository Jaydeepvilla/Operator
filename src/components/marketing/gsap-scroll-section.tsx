"use client";

import * as React from "react";
import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ── Reusable GSAP Scroll-Triggered Section Wrapper ────────────── */
interface GsapScrollSectionProps {
  children: React.ReactNode;
  className?: string;
  /** Animation preset */
  animation?: "fade-up" | "fade-in" | "slide-left" | "slide-right" | "scale-up" | "parallax" | "reveal-mask";
  /** Stagger children elements matching this selector */
  staggerSelector?: string;
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** Duration of each element's animation */
  duration?: number;
  /** Stagger interval between children */
  stagger?: number;
  /** Start trigger position */
  start?: string;
  /** Scrub animation to scroll */
  scrub?: boolean | number;
  /** Pin the section while animating */
  pin?: boolean;
  /** ID for the section element */
  id?: string;
}

export function GsapScrollSection({
  children,
  className = "",
  animation = "fade-up",
  staggerSelector,
  delay = 0,
  duration = 1,
  stagger: staggerInterval = 0.15,
  start = "top 85%",
  scrub = false,
  pin = false,
  id,
}: GsapScrollSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !sectionRef.current) return;

    const el = sectionRef.current;
    const targets = staggerSelector ? el.querySelectorAll(staggerSelector) : [el];

    // Build animation properties based on preset
    let fromVars: gsap.TweenVars = {};
    let toVars: gsap.TweenVars = {};

    switch (animation) {
      case "fade-up":
        fromVars = { opacity: 0, y: 60 };
        toVars = { opacity: 1, y: 0, ease: "power3.out" };
        break;
      case "fade-in":
        fromVars = { opacity: 0 };
        toVars = { opacity: 1, ease: "power2.out" };
        break;
      case "slide-left":
        fromVars = { opacity: 0, x: 80 };
        toVars = { opacity: 1, x: 0, ease: "power3.out" };
        break;
      case "slide-right":
        fromVars = { opacity: 0, x: -80 };
        toVars = { opacity: 1, x: 0, ease: "power3.out" };
        break;
      case "scale-up":
        fromVars = { opacity: 0, scale: 0.9 };
        toVars = { opacity: 1, scale: 1, ease: "power3.out" };
        break;
      case "parallax":
        fromVars = { y: 40 };
        toVars = { y: -40, ease: "none" };
        break;
      case "reveal-mask":
        fromVars = { clipPath: "inset(100% 0 0 0)" };
        toVars = { clipPath: "inset(0% 0 0 0)", ease: "power4.inOut" };
        break;
    }

    const ctx = gsap.context(() => {
      if (staggerSelector && targets.length > 1) {
        gsap.fromTo(targets, fromVars, {
          ...toVars,
          duration,
          delay,
          stagger: staggerInterval,
          scrollTrigger: {
            trigger: el,
            start,
            scrub: scrub as any,
            pin,
            toggleActions: "play none none none",
          },
        });
      } else {
        gsap.fromTo(el, fromVars, {
          ...toVars,
          duration,
          delay,
          scrollTrigger: {
            trigger: el,
            start,
            scrub: scrub as any,
            pin,
            toggleActions: "play none none none",
          },
        });
      }
    }, el);

    return () => ctx.revert();
  }, [animation, staggerSelector, delay, duration, staggerInterval, start, scrub, pin]);

  return (
    <div ref={sectionRef} className={className} id={id}>
      {children}
    </div>
  );
}

/* ── Inline GSAP reveal for individual elements ────────────── */
interface GsapRevealProps {
  children: React.ReactNode;
  className?: string;
  animation?: "fade-up" | "fade-in" | "slide-left" | "slide-right" | "scale-up";
  delay?: number;
  duration?: number;
  start?: string;
}

export function GsapReveal({
  children,
  className = "",
  animation = "fade-up",
  delay = 0,
  duration = 0.8,
  start = "top 88%",
}: GsapRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !ref.current) return;

    let fromVars: gsap.TweenVars = {};
    let toVars: gsap.TweenVars = {};

    switch (animation) {
      case "fade-up":
        fromVars = { opacity: 0, y: 40 };
        toVars = { opacity: 1, y: 0, ease: "power3.out" };
        break;
      case "fade-in":
        fromVars = { opacity: 0 };
        toVars = { opacity: 1, ease: "power2.out" };
        break;
      case "slide-left":
        fromVars = { opacity: 0, x: 60 };
        toVars = { opacity: 1, x: 0, ease: "power3.out" };
        break;
      case "slide-right":
        fromVars = { opacity: 0, x: -60 };
        toVars = { opacity: 1, x: 0, ease: "power3.out" };
        break;
      case "scale-up":
        fromVars = { opacity: 0, scale: 0.92 };
        toVars = { opacity: 1, scale: 1, ease: "power3.out" };
        break;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current, fromVars, {
        ...toVars,
        duration,
        delay,
        scrollTrigger: {
          trigger: ref.current,
          start,
          toggleActions: "play none none none",
        },
      });
    }, ref.current!);

    return () => ctx.revert();
  }, [animation, delay, duration, start]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/* ── Counter Animation Component ────────────── */
interface AnimatedCounterProps {
  value: string;
  className?: string;
  duration?: number;
}

export function AnimatedCounter({ value, className = "", duration = 2 }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !ref.current) {
      if (ref.current) ref.current.textContent = value;
      return;
    }

    // Extract numeric part
    const prefix = value.match(/^[^0-9]*/)?.[0] || "";
    const suffix = value.match(/[^0-9]*$/)?.[0] || "";
    const numStr = value.replace(prefix, "").replace(suffix, "");
    const num = parseFloat(numStr.replace(/,/g, ""));

    if (isNaN(num)) {
      if (ref.current) ref.current.textContent = value;
      return;
    }

    const isDecimal = numStr.includes(".");
    const decimalPlaces = isDecimal ? numStr.split(".")[1]?.length || 0 : 0;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: ref.current,
        start: "top 90%",
        once: true,
        onEnter: () => {
          if (hasAnimated.current) return;
          hasAnimated.current = true;
          const obj = { val: 0 };
          gsap.to(obj, {
            val: num,
            duration,
            ease: "power2.out",
            onUpdate: () => {
              if (ref.current) {
                const formatted = isDecimal
                  ? obj.val.toFixed(decimalPlaces)
                  : Math.round(obj.val).toLocaleString();
                ref.current.textContent = `${prefix}${formatted}${suffix}`;
              }
            },
          });
        },
      });
    }, ref.current!);

    return () => ctx.revert();
  }, [value, duration]);

  return <span ref={ref} className={className}>{value}</span>;
}
