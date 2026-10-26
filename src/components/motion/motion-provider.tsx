"use client";

import { AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { pageTransition } from "./page-transitions";
import { m } from "framer-motion";

export function MotionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={pathname}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageTransition}
          className="flex-1 flex flex-col h-full"
        >
          {children}
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}
