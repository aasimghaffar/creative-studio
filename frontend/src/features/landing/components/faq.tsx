import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchPublicFaqs, type FaqItem } from "@/features/support/services/content-service";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function Faq() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchPublicFaqs()
      .then((data) => {
        if (!cancelled) setFaqs(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 py-24 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered"
          description="Everything else lives in the docs — or ask us directly, a person replies within a day."
        />

        <Reveal className="mt-12 divide-y divide-paper-line border border-paper-line bg-paper">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div key={faq.id}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-paper-hover"
                >
                  <span className={cn("font-display text-[16px]", isOpen ? "font-medium text-ink" : "text-ink/80")}>
                    {faq.question}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn("shrink-0", isOpen ? "text-brass-deep" : "text-ink-soft")}
                  >
                    <Plus className="size-4" strokeWidth={1.6} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-panel-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.21, 0.68, 0.32, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-sm leading-relaxed text-ink-soft">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
