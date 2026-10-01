import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

/** Scroll-triggered entrance used across the landing page. */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={cn(className)}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.65, delay, ease: [0.21, 0.68, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}
