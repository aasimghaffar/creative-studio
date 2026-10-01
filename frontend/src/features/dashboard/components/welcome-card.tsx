import {  } from "lucide-react";
import { useAuthUser } from "@/features/auth";
import { DashboardCard } from "./dashboard-card";

function greeting(date: Date) {
  const h = date.getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export interface WelcomeStats {
  rendersToday: number;
  rendersWeek: number;
  draftsOpen: number;
}

export function WelcomeCard({
  stats: liveStats = { rendersToday: 0, rendersWeek: 0, draftsOpen: 0 },
}: {
  stats?: WelcomeStats;
}) {
  const stats = [
    { value: String(liveStats.rendersToday), label: "renders today" },
    { value: String(liveStats.rendersWeek), label: "this week" },
    { value: String(liveStats.draftsOpen), label: "drafts open" },
  ];
  const user = useAuthUser();
  const now = new Date();
  const firstName = user?.name.split(" ")[0] ?? "there";
  const dateLabel = now
    .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    .toUpperCase();

  return (
    <DashboardCard label="Overview" action={<span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground">{dateLabel}</span>}>
      <div className="flex h-full flex-col justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl font-medium leading-tight sm:text-3xl">
            {greeting(now)}, {firstName}.
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            The workbench is warmed up — your brand kit is on and yesterday's drafts are where you
            left them.
          </p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex gap-6">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="font-display text-xl font-medium">{s.value}</p>
                <p className="eyebrow mt-0.5 text-[9px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
