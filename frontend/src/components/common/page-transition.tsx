import { motion, useReducedMotion } from "motion/react";
import { useLocation } from "react-router";

/**
 * Wraps routed content in a subtle Framer Motion fade/slide,
 * keyed by pathname so it re-runs on navigation.
 * Respects the user's reduced-motion preference.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      key={location.pathname}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
