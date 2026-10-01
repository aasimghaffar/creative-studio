import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Mic, Plus, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { tools } from "../data";

/** Mix a hex colour toward warm paper — keeps tiles light and harmonious. */
function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const [pr, pg, pb] = [237, 234, 225]; // #EDEAE1
  const mix = (c: number, p: number) => Math.round(c + (p - c) * amount);
  return `#${((mix(r, pr) << 16) | (mix(g, pg) << 8) | mix(b, pb)).toString(16).padStart(6, "0")}`;
}

/** Six preview tiles: the tool accent woven with studio teal, brass, and paper tints. */
function tilePairs([a, b]: [string, string]): [string, string][] {
  return [
    [tint(a, 0.45), a],
    [tint("#4C9186", 0.35), "#4C9186"],
    [tint(a, 0.7), tint(b, 0.2)],
    [tint("#B8823C", 0.4), "#8C6329"],
    [tint(b, 0.55), a],
    [tint("#4C9186", 0.6), tint(a, 0.1)],
  ];
}

/**
 * Tabbed tool showcase — pick a tool, see its studio screen.
 * Fixed light "paper" palette (independent of the app theme).
 */

/** Each tool's REAL studio controls, miniaturized — matches the dashboard. */
const TOOL_CONTROLS: Record<string, { label: string; options: string[]; active: number }[]> = {
  logo: [
    { label: "Style", options: ["Wordmark", "Monogram", "Badge"], active: 1 },
    { label: "Colours", options: [], active: 0 },
  ],
  avatar: [
    { label: "Style", options: ["Realistic", "Illustrated", "Anime"], active: 1 },
    { label: "Expression", options: ["Neutral", "Soft smile", "Confident"], active: 1 },
  ],
  tattoo: [
    { label: "Style", options: ["Fine-line", "Traditional", "Blackwork"], active: 0 },
    { label: "Placement", options: ["Forearm", "Shoulder", "Back"], active: 0 },
  ],
  image: [
    { label: "Style", options: ["Photorealistic", "Illustration", "3D"], active: 0 },
    { label: "Ratio", options: ["1:1", "16:9", "9:16"], active: 1 },
  ],
  flyer: [
    { label: "Style", options: ["Modern", "Bold", "Elegant"], active: 0 },
    { label: "Ratio", options: ["4:5", "9:16", "1:1"], active: 0 },
  ],
  "image-description": [],
};

function MockControls({ toolId, colors }: { toolId: string; colors: [string, string] }) {
  const rows = TOOL_CONTROLS[toolId] ?? [];
  if (rows.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      {rows.map((row, r) => (
        <motion.div
          key={`${toolId}-${row.label}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12 + r * 0.08, duration: 0.3 }}
          className="flex items-center gap-2"
        >
          <span className="w-20 shrink-0 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-soft">
            {row.label}
          </span>
          {row.options.length === 0 ? (
            <span className="flex gap-1.5">
              {[colors[0], colors[1], "#8A8F84"].map((c) => (
                <span key={c} className="size-4 rounded-full border border-ink/10" style={{ background: c }} />
              ))}
            </span>
          ) : (
            <span className="flex flex-wrap gap-1.5">
              {row.options.map((opt, i) => (
                <span
                  key={opt}
                  className={
                    i === row.active
                      ? "rounded-full bg-brass px-2.5 py-0.5 text-[10.5px] font-medium text-blueprint"
                      : "rounded-full border border-paper-line bg-paper px-2.5 py-0.5 text-[10.5px] text-ink-soft"
                  }
                >
                  {opt}
                </span>
              ))}
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

export function Tools() {
  const [activeId, setActiveId] = useState(tools[0]?.id ?? "logo");
  const active = tools.find((t) => t.id === activeId) ?? tools[0];
  if (!active) return null;
  const ActiveIcon = active.icon;

  return (
    <section id="tools" className="scroll-mt-24 py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="eyebrow text-brass-deep">The AI tools</p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-medium leading-tight text-ink sm:text-4xl">
          One studio, six instruments.
        </h2>

        {/* Tab strip */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mt-10 grid grid-cols-2 items-stretch gap-2 sm:grid-cols-3 lg:grid-cols-6"
          role="tablist"
          aria-label="AI tools"
        >
          {tools.map((tool) => {
            const selected = tool.id === active.id;
            return (
              <motion.button
                key={tool.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveId(tool.id)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "relative rounded-md border px-3 py-3.5 text-center text-[13px] leading-snug transition-colors sm:text-sm",
                  selected
                    ? "border-brass font-medium text-ink"
                    : "border-paper-line bg-paper-hover text-ink-soft hover:border-ink/30 hover:text-ink",
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="tool-tab-active"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-md bg-[#FBFAF4] shadow-[0_1px_0_rgba(27,27,24,0.05)]"
                    aria-hidden="true"
                  />
                )}
                <span className="relative">{tool.tab}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Showcase */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mt-6 grid min-w-0 items-stretch gap-4 sm:gap-6 lg:grid-cols-2"
          >
            {/* Copy card */}
            <div className="flex min-w-0 flex-col justify-center rounded-md border border-paper-line bg-[#FBFAF4] p-5 sm:p-7 lg:p-9">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brass/35 bg-brass/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-brass-deep">
                Unleash your creativity · AI
              </span>
              <h3 className="mt-6 break-words font-display text-2xl font-medium leading-[1.12] text-ink sm:mt-8 sm:text-3xl lg:text-4xl">
                {active.headline}
              </h3>
              <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-soft">{active.description}</p>
            </div>

            {/* Tool screen mock */}
            <div className="min-w-0 rounded-md border border-paper-line bg-paper-hover p-4 sm:p-5 lg:p-7">
              <div className="rounded-md border border-paper-line bg-[#FBFAF4] p-4">
                {/* Prompt bar */}
                <div className="flex items-center gap-2 rounded-[4px] border border-paper-line bg-paper px-3.5 py-2.5">
                  <motion.span
                    key={active.id}
                    initial={{ clipPath: "inset(0 100% 0 0)" }}
                    animate={{ clipPath: "inset(0 0% 0 0)" }}
                    transition={{ delay: 0.05, duration: 0.7, ease: "easeOut" }}
                    className="min-w-0 flex-1 truncate text-[13px] text-ink/80"
                  >
                    {active.prompt}
                  </motion.span>
                  <Mic className="size-3.5 shrink-0 text-ink-soft" strokeWidth={1.6} />
                </div>

                {/* Options row */}
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[12px] text-ink-soft">
                    Advanced Options
                    <Plus className="size-3" strokeWidth={1.8} />
                  </span>
                  <span className="rounded-[3px] bg-brass px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.06em] text-blueprint">
                    CREDIT: 323
                  </span>
                </div>

                <MockControls toolId={active.id} colors={[active.colors[0], active.colors[1]]} />

                {/* Drafts grid */}
                {active.id === "image-description" ? (
                  <div className="mt-3 space-y-2.5" aria-hidden="true">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                      className="grid h-24 place-items-center rounded-[4px] border border-dashed border-ink/20 bg-paper"
                    >
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                        Drop an image · PNG / JPG
                      </span>
                    </motion.div>
                    {[92, 100, 74].map((w, i) => (
                      <motion.div
                        key={w}
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{ delay: 0.3 + i * 0.15, duration: 0.45, ease: "easeOut" }}
                        style={{ width: `${w}%`, transformOrigin: "left" }}
                        className="h-2.5 rounded-full bg-ink/15"
                      />
                    ))}
                  </div>
                ) : (
                <div className="mt-3 grid grid-cols-3 gap-2.5">
                  {tilePairs(active.colors).map(([from, to], i) => (
                    <motion.div
                      key={`${active.id}-${i}`}
                      initial={{ opacity: 0, y: 14, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.08 + i * 0.07, duration: 0.35, ease: "easeOut" }}
                      whileHover={{ scale: 1.04, rotate: [0, -0.6, 0.6, 0][i % 4] }}
                      className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[4px] border border-ink/5"
                      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                      aria-hidden="true"
                    >
                      {/* generating shimmer sweep */}
                      <motion.span
                        className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                        initial={{ x: "-120%" }}
                        animate={{ x: "260%" }}
                        transition={{ delay: 0.2 + i * 0.12, duration: 1.1, ease: "easeInOut" }}
                      />
                      <motion.span
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3 + i * 0.07, type: "spring", stiffness: 300, damping: 18 }}
                      >
                        <ActiveIcon
                          className="size-5 text-[#FBFAF4]"
                          strokeWidth={1.6}
                          style={{ transform: `rotate(${[0, -6, 5, -3, 4, 0][i]}deg)` }}
                        />
                      </motion.span>
                    </motion.div>
                  ))}
                </div>
                )}

                {/* Regenerate */}
                <button
                  type="button"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-[4px] border border-paper-line bg-paper py-2.5 text-[13px] text-ink transition-colors hover:bg-paper-hover"
                >
                  <RefreshCcw className="size-3.5" strokeWidth={1.6} />
                  Re-generate
                </button>
              </div>

              <div className="mt-4 text-center">
                <p className="text-sm font-semibold text-ink">Imagine, Generate, Publish.</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                  Powered by Gemini 
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
