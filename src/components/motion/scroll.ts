import { Variants } from "framer-motion";
import { transitions } from "./transitions";

export const scrollReveal: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: transitions.easeOut },
};

export const scrollRevealStagger: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: transitions.easeOut },
};
