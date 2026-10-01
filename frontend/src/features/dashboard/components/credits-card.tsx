import { Zap } from "lucide-react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import type { CreditsInfo } from "@/config/dashboard";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "./dashboard-card";

export function CreditsCard({ credits }: { credits: CreditsInfo }) {
  const navigate = useNavigate();
  const remaining = credits.balance ?? Math.max(credits.total - credits.used, 0);
  const pct = credits.total > 0 ? Math.min((credits.used / credits.total) * 100, 100) : 0;
  const low = !credits.unlimited && credits.total > 0 && remaining / credits.total < 0.15;

  if (credits.unlimited) {
    return (
      <DashboardCard label="Credits">
        <div className="flex h-full flex-col justify-between gap-5">
          <div>
            <p className="font-display text-3xl font-medium tabular-nums">
              ∞<span className="ml-1.5 text-sm font-normal text-muted-foreground">unlimited</span>
            </p>
            <p className="mt-4 font-mono text-[11px] text-muted-foreground">
              Your plan includes unlimited generations — no credits are deducted.
            </p>
          </div>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard label="Credits">
      <div className="flex h-full flex-col justify-between gap-5">
        <div>
          <p className="font-display text-3xl font-medium tabular-nums">
            {remaining.toLocaleString()}
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">left</span>
          </p>
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn("h-full rounded-full", low ? "bg-destructive" : "bg-brass")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[11px] text-muted-foreground">
            <span>{credits.used.toLocaleString()} / {credits.total.toLocaleString()} used</span>
            <span>{credits.renewsOn !== "—" ? `resets ${credits.renewsOn}` : "no reset scheduled"}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => navigate("/app/billing")}>
          <Zap className="size-3.5" />
          Get more credits
        </Button>
      </div>
    </DashboardCard>
  );
}
