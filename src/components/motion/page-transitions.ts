import { Variants } from "framer-motion";
import { transitions } from "./transitions";

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: transitions.smooth },
  exit: { opacity: 0, y: 10, transition: transitions.easeOut },
};

export const pageFade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitions.slow },
  exit: { opacity: 0, transition: transitions.easeOut },
};
