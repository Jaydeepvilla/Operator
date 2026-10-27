"use client";

import * as React from "react";
import { m } from "framer-motion";
import { scrollReveal, scrollRevealStagger } from "@/components/motion";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  stagger?: boolean;
}

export function ScrollReveal({ children, className, stagger = false }: ScrollRevealProps) {
  return (
    <m.div
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: "0px" }}
      variants={stagger ? scrollRevealStagger : scrollReveal}
      className={className}
    >
      {children}
    </m.div>
  );
}

export function ScrollRevealItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <m.div variants={scrollReveal} className={className}>
      {children}
    </m.div>
  );
}
