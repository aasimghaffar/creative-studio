import type { ActivityItem } from "@/config/dashboard";
import { DashboardCard } from "./dashboard-card";

export function RecentActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <DashboardCard label="Recent activity" contentClassName="p-0">
      <ol>
        {items.map((item, i) => (
          <li
            key={item.id}
            className={`flex items-start justify-between gap-3 px-5 py-3 ${i !== items.length - 1 ? "border-b" : ""}`}
          >
            <p className="min-w-0 text-sm leading-snug">
              <span className="font-medium">{item.actor}</span>{" "}
              <span className="text-muted-foreground">{item.action}</span>{" "}
              <span className="font-medium">{item.target}</span>
            </p>
            <span className="shrink-0 font-mono text-[10px] uppercase text-muted-foreground">
              {item.time}
            </span>
          </li>
        ))}
      </ol>
    </DashboardCard>
  );
}
