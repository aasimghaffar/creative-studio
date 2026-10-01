import { useEffect, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchPlans,
  rememberSelectedPlan,
  type ApiPlan,
} from "@/features/billing/services/billing-service";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/** Card shape derived from the API plan — presentation only, no pricing logic. */
interface PricingCard {
  slug: string;
  name: string;
  tagline: string;
  monthly: number | null;
  yearly: number | null;
  popular: boolean;
  badgeText: string | null;
  cta: string;
  featureList: string[];
}

function toCard(plan: ApiPlan): PricingCard {
  const monthly = plan.monthly_price === null ? null : Number(plan.monthly_price);
  const yearlyPrice = plan.yearly_price === null ? null : Number(plan.yearly_price);
  const badge = plan.badge || (plan.is_popular ? "Popular" : "");

  return {
    slug: plan.slug,
    name: plan.name,
    tagline: plan.tagline ?? "",
    monthly,
    yearly: yearlyPrice,
    popular: badge !== "",
    badgeText: badge === "" ? null : badge === "Popular" ? "MOST POPULAR" : badge.toUpperCase(),
    cta: monthly === null ? "Talk to us" : monthly === 0 ? "Start free" : "Start 14-day trial",
    featureList: plan.features ?? [],
  };
}

export function Pricing() {
  const [yearly, setYearly] = useState(true);
  const [plans, setPlans] = useState<PricingCard[]>([]);

  // Single source of truth: the same /v1/plans catalogue the Billing page
  // uses — enabled plans only, ordered by display order, straight from DB.
  useEffect(() => {
    let cancelled = false;
    fetchPlans()
      .then((data) => {
        if (!cancelled) setPlans(data.map(toCard));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="pricing" className="scroll-mt-24 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Pricing"
          title={
            <>
              Simple plans, <span className="text-ink-soft">serious output</span>
            </>
          }
          description="Start free. Upgrade when the work does. Yearly billing saves about 17%."
        />

        {/* Billing toggle */}
        <Reveal className="mt-8 flex justify-center">
          <div className="relative flex rounded-full border border-ink p-1 text-sm">
            {(["Monthly", "Yearly"] as const).map((label) => {
              const active = (label === "Yearly") === yearly;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setYearly(label === "Yearly")}
                  className={cn(
                    "relative rounded-full px-5 py-2 transition-colors",
                    active ? "text-paper" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="billing-pill"
                      className="absolute inset-0 rounded-full bg-ink"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">
                    {label}
                    {label === "Yearly" && (
                      <span className={cn("ml-1.5 font-mono text-xs", active ? "text-brass" : "text-brass-deep")}>
                        −17%
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </Reveal>

        <div className="mt-12 grid items-stretch gap-5 lg:grid-cols-3">
          {plans.map((plan, i) => {
            // yearly is the TOTAL per year (single source) — cards show the /mo equivalent
            const price = yearly ? (plan.yearly === null ? null : plan.yearly / 12) : plan.monthly;
            const popular = plan.popular;
            return (
              <Reveal key={plan.slug} delay={i * 0.08}>
                <article
                  className={cn(
                    "relative flex h-full flex-col p-7",
                    popular
                      ? "rounded-md border-[1.5px] border-brass bg-paper-hover text-ink"
                      : "border border-paper-line bg-paper",
                  )}
                >
                  {popular && plan.badgeText && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brass px-3 py-1 font-mono text-[10px] font-medium tracking-[0.08em] text-blueprint">
                      {plan.badgeText}
                    </span>
                  )}
                  <h3 className={cn("font-display text-lg font-medium", "text-ink")}>
                    {plan.name}
                  </h3>
                  <p className={cn("mt-1 text-sm", "text-ink-soft")}>{plan.tagline}</p>

                  <div className="mt-6 flex h-14 items-end gap-1.5">
                    {price === null ? (
                      <span className={cn("font-display text-3xl font-medium", "text-ink")}>
                        Custom
                      </span>
                    ) : (
                      <>
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={price}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className={cn("font-display text-4xl font-medium", "text-ink")}
                          >
                            ${price}
                          </motion.span>
                        </AnimatePresence>
                        <span className={cn("pb-1 font-mono text-xs", "text-ink-soft")}>
                          {price === 0 ? "forever" : `/mo${yearly ? ", billed yearly" : ""}`}
                        </span>
                      </>
                    )}
                  </div>
                  {yearly && plan.yearly !== null && plan.yearly > 0 && (
                    <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-soft">
                      ${Number(plan.yearly).toLocaleString()} charged per year
                    </p>
                  )}

                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.featureList.map((item) => (
                      <li
                        key={item}
                        className={cn(
                          "flex items-start gap-2.5 text-sm",
                          "text-ink",
                        )}
                      >
                        <Check className={cn("mt-0.5 size-4 shrink-0", popular ? "text-brass" : "text-brass-deep")} strokeWidth={1.8} />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/auth/sign-up"
                    onClick={() =>
                      rememberSelectedPlan({
                        slug: plan.slug,
                        cycle: yearly ? "yearly" : "monthly",
                      })
                    }
                    className={cn(
                      "mt-8 rounded-sm py-3 text-center text-sm font-medium transition-colors",
                      popular
                        ? "bg-brass font-semibold text-blueprint hover:bg-[#c99a4f]"
                        : "bg-ink text-paper hover:bg-brass-deep",
                    )}
                  >
                    {plan.cta}
                  </Link>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
