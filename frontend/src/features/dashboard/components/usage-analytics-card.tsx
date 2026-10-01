import { useMemo } from "react";
import type { UsagePoint } from "../data";
import { DashboardCard } from "./dashboard-card";

/**
 * Dependency-free bar chart: last 14 days of generations.
 * Peak day is highlighted in brass, the rest in teal — prototype palette.
 */
export function UsageAnalyticsCard({ usage }: { usage: UsagePoint[] }) {
  const { max, total, avg, peak } = useMemo(() => {
    const values = usage.map((p) => p.value);
    const maxValue = Math.max(...values, 1);
    const sum = values.reduce((a, b) => a + b, 0);
    const peakPoint = usage.find((p) => p.value === maxValue);
    return {
      max: maxValue,
      total: sum,
      avg: Math.round(sum / Math.max(usage.length, 1)),
      peak: peakPoint,
    };
  }, [usage]);

  return (
    <DashboardCard
      label="Usage analytics"
      action={<span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground">LAST 14 DAYS</span>}
    >
      <div className="flex h-full flex-col gap-5">
        <div className="flex gap-8">
          <div>
            <p className="font-display text-2xl font-medium tabular-nums">{total}</p>
            <p className="eyebrow mt-0.5 text-[9px] text-muted-foreground">generations</p>
          </div>
          <div>
            <p className="font-display text-2xl font-medium tabular-nums">{avg}</p>
            <p className="eyebrow mt-0.5 text-[9px] text-muted-foreground">avg / day</p>
          </div>
          <div>
            <p className="font-display text-2xl font-medium tabular-nums">{max}</p>
            <p className="eyebrow mt-0.5 text-[9px] text-muted-foreground">
              peak{peak ? ` · ${peak.label}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-end gap-1.5" role="img" aria-label={`Bar chart of generations per day over the last 14 days, ${total} total`}>
          {usage.map((point) => (
            <div key={point.label} className="group relative flex h-32 flex-1 items-end">
              <div
                className={`w-full rounded-t-[2px] transition-colors ${
                  point.value === max ? "bg-brass" : "bg-teal/60 group-hover:bg-teal"
                }`}
                style={{ height: `${(point.value / max) * 100}%` }}
              />
              <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm border bg-popover px-1.5 py-0.5 font-mono text-[9px] text-popover-foreground opacity-0 transition-opacity group-hover:opacity-100">
                {point.label} · {point.value}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-between font-mono text-[9px] uppercase tracking-[0.06em] text-muted-foreground">
          <span>{usage[0]?.label}</span>
          <span>{usage[usage.length - 1]?.label}</span>
        </div>
      </div>
    </DashboardCard>
  );
}
