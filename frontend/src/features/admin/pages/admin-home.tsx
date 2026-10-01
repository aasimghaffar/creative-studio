import { useEffect, useState } from "react";
import { DollarSign, Sparkles, TicketPercent, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { PanelCard } from "@/components/common/panel-card";
import { ApiError } from "@/lib/api-client";
import { formatBytes } from "@/lib/format-bytes";
import { timeAgo } from "@/lib/time-ago";
import {
  fetchAdminOverview,
  type AdminOverview,
} from "../services/admin-overview-service";
import { AnalyticsCard, BarChart, LineChart, RecentActivityCard, StatCard, SystemStatusCard } from "../components";

/** "288.00 EUR" -> "€" — the card icon follows the configured currency. */
function currencySymbol(value: string): string {
  const code = (value.trim().split(/\s+/).pop() ?? "").toUpperCase();
  const SYMBOLS: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", INR: "₹", PKR: "₨", AUD: "A$", CAD: "C$",
    JPY: "¥", CNY: "¥", BRL: "R$", AED: "د.إ", SAR: "﷼", TRY: "₺", NGN: "₦", ZAR: "R",
  };
  return SYMBOLS[code] ?? (code.length === 3 ? code : "$");
}

const STAT_ICONS: Record<string, LucideIcon> = {
  users: Users,
  subscriptions: TicketPercent,
  revenue: DollarSign,
  generations: Sparkles,
};

const EMPTY: AdminOverview = {
  stats: [],
  revenue_series: [],
  signup_series: [],
  tool_usage: [],
  storage: { total_bytes: 0, images_bytes: 0, videos_bytes: 0, audio_bytes: 0, documents_bytes: 0, files_count: 0 },
  services: [],
  recent: { registrations: [], activity: [], payments: [] },
};

export function AdminHomePage() {
  const [data, setData] = useState<AdminOverview>(EMPTY);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminOverview()
      .then((fresh) => {
        if (!cancelled) setData(fresh);
      })
      .catch((e) => {
        if (!cancelled)
          setPageError(e instanceof ApiError ? `Could not load the overview: ${e.message}` : "Could not load the overview. Is the backend running?");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const revenueTotal = data.revenue_series.reduce((sum, p) => sum + p.value, 0);
  const signupsThisWeek = data.signup_series.reduce((sum, p) => sum + p.value, 0);
  const generationsMonth = data.tool_usage.reduce((sum, p) => sum + p.value, 0);
  const toRow = (row: AdminOverview["recent"]["registrations"][number]) => ({
    id: row.id,
    primary: row.primary,
    secondary: row.secondary,
    meta: timeAgo(row.created_at),
    tone: row.tone ?? undefined,
  });

  const STORAGE_LINES: [string, number][] = [
    ["Images", data.storage.images_bytes],
    ["Video", data.storage.videos_bytes],
    ["Audio", data.storage.audio_bytes],
    ["Documents", data.storage.documents_bytes],
  ];
  const maxStorage = Math.max(1, ...STORAGE_LINES.map(([, bytes]) => bytes));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Platform"
        title="Dashboard Overview"
        description={pageError ?? "The whole studio at a glance — growth, generation load, money, and machine health. All live."}
      />

      {/* KPI stats — live aggregates */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.stats.map((stat) => (
          <StatCard
            key={stat.id}
            stat={{ ...stat, icon: STAT_ICONS[stat.id] ?? Sparkles }}
            iconOverride={stat.id === "revenue" ? currencySymbol(stat.value) : undefined}
          />
        ))}
      </div>

      {/* Charts row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <AnalyticsCard
          label="Revenue"
          headline={revenueTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          sub="paid revenue · last 12 months"
          className="lg:col-span-2"
        >
          <LineChart data={data.revenue_series} formatValue={(v) => v.toLocaleString()} />
        </AnalyticsCard>
        <AnalyticsCard label="Signups" headline={signupsThisWeek.toLocaleString()} sub="new users · last 7 days">
          <BarChart data={data.signup_series} height={150} />
        </AnalyticsCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <AnalyticsCard label="AI usage by tool" headline={generationsMonth.toLocaleString()} sub="generations · last 30 days">
          {data.tool_usage.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No generations yet.</p>
          ) : (
            <BarChart data={data.tool_usage} height={128} formatValue={(v) => v.toLocaleString()} />
          )}
        </AnalyticsCard>
        <PanelCard label="Storage usage">
          <p className="font-display text-2xl font-medium tabular-nums">
            {formatBytes(data.storage.total_bytes)}
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">
              across {data.storage.files_count.toLocaleString()} files
            </span>
          </p>
          <ul className="mt-4 space-y-2.5">
            {STORAGE_LINES.map(([label, bytes]) => (
              <li key={label}>
                <div className="flex justify-between text-[13px]">
                  <span>{label}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatBytes(bytes)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-brass" style={{ width: `${(bytes / maxStorage) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
            Platform-wide · live from the files table
          </p>
        </PanelCard>
        <SystemStatusCard services={data.services} />
      </div>

      {/* Recents — live rows */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <RecentActivityCard label="Recent registrations" items={data.recent.registrations.map(toRow)} />
        <RecentActivityCard label="Recent AI activity" items={data.recent.activity.map(toRow)} />
        <RecentActivityCard label="Recent payments" items={data.recent.payments.map(toRow)} />
      </div>
    </div>
  );
}
