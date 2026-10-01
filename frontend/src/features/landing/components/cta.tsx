import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./reveal";

export function Cta() {
  return (
    <section className="px-4 pb-24 sm:px-6 sm:pb-28">
      <Reveal className="mx-auto max-w-5xl">
        {/* Blueprint panel with drafting corners */}
        <div className="relative overflow-hidden rounded-md border border-paper-line bg-paper-hover px-6 py-16 text-center sm:px-12 sm:py-20">
          <span className="peg-corner peg-corner-tl" />
          <span className="peg-corner peg-corner-tr" />
          <span className="peg-corner peg-corner-bl" />
          <span className="peg-corner peg-corner-br" />

          <div className="relative">
            <p className="eyebrow mb-5 text-brass">Open the workbench</p>
            <h2 className="font-display text-3xl font-medium leading-tight text-ink sm:text-5xl">
              Your next campaign is
              <br className="hidden sm:block" /> <em className="italic text-brass">one prompt away</em>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[15px] text-ink-soft">
              Free to start. No card required. Your first render takes about 20 seconds.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/auth/sign-up"
                className="inline-flex items-center gap-2 rounded-sm bg-brass px-7 py-3 text-sm font-semibold text-blueprint transition-colors hover:bg-[#c99a4f]"
              >
                Try Tools
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-sm border border-ink/25 px-7 py-3 text-sm text-ink transition-colors hover:bg-paper"
              >
                Compare plans
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
