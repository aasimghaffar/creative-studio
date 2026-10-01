import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminStat } from "@/mocks/admin";
import { Card } from "@/components/ui/card";

/** Compact KPI card: label, value, delta, icon.
 * `iconOverride` renders a text glyph (e.g. the configured currency
 * symbol) instead of the static icon. */
export function StatCard({ stat, iconOverride }: { stat: AdminStat; iconOverride?: string }) {
  const Icon = stat.icon;
  const Trend = stat.up ? TrendingUp : TrendingDown;
  return (
    <Card className="rounded-md p-4 shadow-none">
      <div className="flex items-start justify-between">
        <p className="eyebrow text-[9px] text-muted-foreground">{stat.label}</p>
        <span className="grid size-7 place-items-center rounded-full border text-muted-foreground">
          {iconOverride ? (
            <span className="text-[11px] font-semibold leading-none">{iconOverride}</span>
          ) : (
            <Icon className="size-3.5" strokeWidth={1.6} />
          )}
        </span>
      </div>
      <p className="mt-1.5 font-display text-2xl font-medium tabular-nums">{stat.value}</p>
      <p className={cn("mt-1 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.04em]", stat.up ? "text-teal" : "text-brass")}>
        <Trend className="size-3" strokeWidth={1.8} />
        {stat.delta}
      </p>
    </Card>
  );
}
