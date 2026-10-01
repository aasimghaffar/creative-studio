import { Quote } from "lucide-react";
import { testimonials } from "../data";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

const avatarColors = ["bg-brass", "bg-teal", "bg-brass-deep", "bg-[#5B584E]", "bg-[#C9A45C]", "bg-[#3A5A54]"];

export function Testimonials() {
  return (
    <section className="border-y border-paper-line bg-paper-hover/60 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="From the floor"
          title={
            <>
              Teams that traded busywork <span className="text-ink-soft">for taste</span>
            </>
          }
        />

        <div className="mt-14 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={(i % 3) * 0.07} className="h-full">
              <figure className="flex h-full flex-col border border-paper-line bg-paper p-6">
                <Quote className="size-4 text-brass-deep" strokeWidth={1.6} aria-hidden="true" />
                <blockquote className="mt-3 text-[15px] leading-relaxed text-ink">{t.quote}</blockquote>
                <figcaption className="mt-auto flex items-center gap-3 pt-5">
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-paper ${avatarColors[i % avatarColors.length]}`}
                  >
                    {t.initials}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">{t.name}</p>
                    <p className="font-mono text-[11px] text-ink-soft">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
