import { Transition } from "framer-motion";

export const transitions: Record<string, Transition> = {
  spring: { type: "spring", stiffness: 500, damping: 30 },
  snappy: { type: "spring", stiffness: 600, damping: 28 },
  easeOut: { type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.15 },
  easeInOut: { type: "tween", ease: "easeInOut", duration: 0.18 },
  slow: { type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.22 },
  smooth: { type: "spring", stiffness: 450, damping: 32 },
};
