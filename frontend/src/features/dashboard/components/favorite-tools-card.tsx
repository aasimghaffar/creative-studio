import { Pin } from "lucide-react";
import type { FavoriteTool } from "../data";
import { DashboardCard } from "./dashboard-card";

export function FavoriteToolsCard({ tools }: { tools: FavoriteTool[] }) {
  return (
    <DashboardCard
      label="Favorite tools"
      action={<Pin className="size-3.5 text-muted-foreground" aria-hidden="true" />}
      contentClassName="p-3"
    >
      <div className="grid grid-cols-2 gap-2">
        {tools.map((tool) => (
          <button
            key={tool.name}
            type="button"
            className="group flex flex-col gap-2.5 rounded-md border p-3.5 text-left transition-colors hover:bg-accent"
          >
            <span className="grid size-9 place-items-center rounded-full border border-current/40 text-foreground">
              <tool.icon className="size-4" strokeWidth={1.6} />
            </span>
            <span>
              <span className="block text-sm font-medium leading-tight">{tool.name}</span>
              <span className="eyebrow mt-1 block text-[9px] text-muted-foreground">{tool.tag}</span>
            </span>
            <span className="font-mono text-[10px] text-brass">
              {tool.runsThisMonth} RUNS / MO
            </span>
          </button>
        ))}
      </div>
    </DashboardCard>
  );
}
