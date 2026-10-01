import { Link } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { CornerDownLeft, Sparkles } from "lucide-react";
import { heroPrompts } from "../data";
import { usePromptCycle } from "../hooks/use-prompt-cycle";

/* Blueprint-panel "renders" that crossfade as the prompt cycles */

const stats = [
  { value: "12M+", label: "assets generated" },
  { value: "40k", label: "creative teams" },
  { value: "4.9/5", label: "average rating" },
];

export function Hero() {
  const { text } = usePromptCycle(heroPrompts);
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden pb-20 pt-32 sm:pt-40">
      {/* Ambient motion: two slow-drifting glows (skipped for reduced motion) */}
      {!reduce && (
        <>
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -left-32 top-16 size-96 rounded-full bg-brass/15 blur-3xl"
            animate={{ x: [0, 46, 0], y: [0, 28, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 top-64 size-80 rounded-full bg-teal/10 blur-3xl"
            animate={{ x: [0, -38, 0], y: [0, -24, 0] }}
            transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="eyebrow mb-5 text-brass-deep"
          >
            AI Creative Studio · one workbench, every medium
          </motion.p>

          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.21, 0.68, 0.32, 1] }}
            className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.01em] text-ink sm:text-6xl md:text-[64px]"
          >
            Every asset you'll ever need,{" "}
            <em className="font-medium italic text-brass-deep">cast in seconds.</em>
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16, ease: [0.21, 0.68, 0.32, 1] }}
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:text-[17px]"
          >
            Generate logos, avatars, tattoos, images, flyers, and image descriptions in one canvas.
            Describe the outcome; the AI tools do the rendering.
          </motion.p>

          {/* Live prompt bar */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease: [0.21, 0.68, 0.32, 1] }}
            className="mx-auto mt-9 flex max-w-2xl items-center gap-3 rounded-md border border-ink/60 bg-paper p-2 pl-4 text-left"
          >
            <Sparkles className="size-4 shrink-0 text-brass-deep" />
            <p className="min-h-6 flex-1 truncate text-sm text-ink sm:text-[15px]">
              {text}
              <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-ink align-middle" />
            </p>
            <Link
              to="/auth/sign-up"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-brass px-4 py-2.5 text-sm font-semibold text-blueprint transition-colors hover:bg-[#c99a4f]"
            >
              Generate
              <CornerDownLeft className="size-3.5" />
            </Link>
          </motion.div>

          <motion.p
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-5 font-mono text-xs uppercase tracking-[0.08em] text-ink-soft"
          >
          Unlimited drafts. Unlimited creativity.
          </motion.p>
        </div>

    
        {/* Stats */}
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 divide-x divide-paper-line border border-paper-line">
          {stats.map((s) => (
            <div key={s.label} className="px-2 py-5 text-center">
              <p className="font-display text-xl font-medium text-ink sm:text-2xl">{s.value}</p>
              <p className="eyebrow mt-1.5 text-[10px] text-ink-soft">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
