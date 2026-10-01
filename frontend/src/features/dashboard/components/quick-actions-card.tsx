import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router";
import type { LucideIcon } from "lucide-react";
import { DashboardCard } from "./dashboard-card";

export interface QuickActionLink {
  id: string;
  label: string;
  meta: string;
  href: string;
  icon: LucideIcon;
}

/** Real destinations — every row navigates. */
export function QuickActionsCard({ actions }: { actions: QuickActionLink[] }) {
  const navigate = useNavigate();
  return (
    <DashboardCard label="Quick actions" contentClassName="p-2">
      <ul>
        {actions.map((action) => (
          <li key={action.id}>
            <button
              type="button"
              onClick={() => navigate(action.href)}
              className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-current/40">
                <action.icon className="size-4" strokeWidth={1.6} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px]">{action.label}</span>
                <span className="block font-mono text-[9.5px] uppercase tracking-[0.06em] text-muted-foreground">
                  {action.meta}
                </span>
              </span>
              <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
