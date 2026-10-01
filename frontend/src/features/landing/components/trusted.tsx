import { trustedCompanies } from "../data";

/** Logo marquee — duplicated list for a seamless CSS loop. */
export function Trusted() {
  const row = [...trustedCompanies, ...trustedCompanies];
  return (
    <section className="border-y border-paper-line py-10" aria-label="Trusted by">
      <p className="eyebrow mb-7 text-center text-ink-soft">Trusted by creative teams at</p>
      <div className="marquee-mask relative overflow-hidden">
        <div className="animate-marquee flex w-max items-center gap-14 pr-14">
          {row.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="font-display text-lg font-medium text-ink-soft transition-colors hover:text-ink"
              aria-hidden={i >= trustedCompanies.length}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
