import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { PageHeader } from "@/components/common/page-header";
import { PanelCard } from "@/components/common/panel-card";
import { AnalyticsCard, BarChart } from "../components";
import {
  fetchAiUsage,
  fetchCreditUsage,
  type AiUsageReport,
  type CreditUsageReport,
} from "../services/admin-reports-service";

/** Shared loader hook for the two read-only report pages. */
function useReport<T>(loader: () => Promise<T>): { data: T | null; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loader()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof ApiError ? `Could not load the report: ${e.message}` : "Could not load the report. Is the backend running?");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, error };
}

function ShareBar({ label, value, max, format, colorClass }: {
  label: string;
  value: number;
  max: number;
  format: (v: number) => string;
  colorClass: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <li>
      <div className="flex justify-between text-[13px]">
        <span>{label}</span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{format(value)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

export function AdminAiUsagePage() {
  const { data, error } = useReport<AiUsageReport>(fetchAiUsage);

  const byTool = data?.by_tool ?? [];
  const totalGenerations = byTool.reduce((sum, t) => sum + t.generations, 0);
  const chartData = byTool
    .filter((t) => t.generations > 0)
    .map((t) => ({ label: t.tool.replace(" Generator", "").replace(" Designer", ""), value: t.generations }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Reports"
        title="AI Usage"
        description={error ?? "Generation volume by studio — computed live from every completed generation."}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsCard
          label="Generations by tool"
          headline={(data?.totals.today ?? 0).toLocaleString()}
          sub={`today · ${(data?.totals.week ?? 0).toLocaleString()} this week · ${(data?.totals.lifetime ?? 0).toLocaleString()} lifetime`}
        >
          {chartData.length > 0 ? (
            <BarChart data={chartData} height={170} formatValue={(v) => v.toLocaleString()} />
          ) : (
            <p className="grid h-[170px] place-items-center text-[13px] text-muted-foreground">
              No completed generations yet.
            </p>
          )}
        </AnalyticsCard>
        <PanelCard label="Share of load">
          <ul className="space-y-3.5">
            {byTool.map((t) => (
              <ShareBar
                key={t.slug}
                label={t.tool}
                value={t.generations}
                max={totalGenerations}
                format={(v) => (totalGenerations > 0 ? `${((v / totalGenerations) * 100).toFixed(1)}%` : "0%")}
                colorClass="bg-brass"
              />
            ))}
          </ul>
        </PanelCard>
      </div>
    </div>
  );
}

export function AdminCreditsUsagePage() {
  const { data, error } = useReport<CreditUsageReport>(fetchCreditUsage);

  const byTool = data?.by_tool ?? [];
  const maxCredits = Math.max(1, ...byTool.map((t) => t.credits));
  const series = data?.weekly_series ?? [];
  const totals = data?.totals ?? { today: 0, week: 0, month: 0, lifetime: 0 };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Reports"
        title="Credits Usage"
        description={error ?? "Where credits are burned — spends net of refunds, straight from the ledger."}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsCard
          label="Credits consumed"
          headline={totals.today.toLocaleString()}
          sub={`today · ${totals.week.toLocaleString()} this week · ${totals.month.toLocaleString()} this month · ${totals.lifetime.toLocaleString()} lifetime`}
        >
          {series.some((w) => w.value > 0) ? (
            <BarChart data={series} height={150} formatValue={(v) => v.toLocaleString()} />
          ) : (
            <p className="grid h-[150px] place-items-center text-[13px] text-muted-foreground">
              No credits consumed in the last four weeks.
            </p>
          )}
        </AnalyticsCard>
        <PanelCard label="Credits by tool">
          <ul className="space-y-3.5">
            {byTool.map((t) => (
              <ShareBar
                key={t.tool}
                label={t.tool}
                value={t.credits}
                max={maxCredits}
                format={(v) => `${v.toLocaleString()} cr`}
                colorClass="bg-teal"
              />
            ))}
          </ul>
        </PanelCard>
      </div>
    </div>
  );
}
