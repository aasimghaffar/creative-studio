import { steps } from "../data";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 border-y border-paper-line bg-paper-hover/60 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              From brief to broadcast <span className="text-ink-soft">in three moves</span>
            </>
          }
        />

        <div className="relative mt-12 grid gap-10 text-center sm:mt-16 md:grid-cols-3 md:gap-6">
          {/* Connector line (desktop) */}
          <div
            aria-hidden="true"
            className="absolute left-[16%] right-[16%] top-7 hidden h-px bg-brass/50 md:block"
          />
          {steps.map((step, i) => (
            <Reveal key={step.number} delay={i * 0.12} className="relative">
              <div className="flex flex-col items-center text-center">
                <span className="relative z-10 grid size-14 place-items-center rounded-full border border-ink bg-paper">
                  <step.icon className="size-5 text-ink" strokeWidth={1.6} />
                  <span className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-brass font-mono text-[11px] font-bold text-white ring-2 ring-paper">
                    {step.number}
                  </span>
                </span>
                <h3 className="mt-5 font-display text-xl font-medium text-ink">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">{step.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
