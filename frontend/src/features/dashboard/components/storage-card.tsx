import type { StorageInfo } from "../data";
import { DashboardCard } from "./dashboard-card";

export function StorageCard({ storage }: { storage: StorageInfo }) {
  const pct = Math.min((storage.usedGb / storage.totalGb) * 100, 100);

  return (
    <DashboardCard label="Storage">
      <div className="flex h-full flex-col gap-5">
        <div>
          <p className="font-display text-3xl font-medium tabular-nums">
            {storage.usedGb.toFixed(1)}
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">
              of {storage.totalGb} GB
            </span>
          </p>
          {/* Stacked segment bar */}
          <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            {storage.breakdown.map((item) => (
              <div
                key={item.label}
                className={item.colorClass}
                style={{ width: `${(item.sizeGb / storage.totalGb) * 100}%` }}
              />
            ))}
          </div>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">{pct.toFixed(0)}% used</p>
        </div>

        <ul className="space-y-2.5">
          {storage.breakdown.map((item) => (
            <li key={item.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className={`size-2 rounded-full ${item.colorClass}`} aria-hidden="true" />
                {item.label}
              </span>
              <span className="font-mono text-xs tabular-nums">{item.sizeGb.toFixed(1)} GB</span>
            </li>
          ))}
        </ul>
      </div>
    </DashboardCard>
  );
}
