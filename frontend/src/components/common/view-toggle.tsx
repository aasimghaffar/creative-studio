import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "list";

/** Grid / list switcher used by History, Files, and Favorites. */
export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex overflow-hidden rounded-[3px] border" role="radiogroup" aria-label="View mode">
      {(
        [
          { mode: "grid" as const, icon: LayoutGrid, label: "Grid view" },
          { mode: "list" as const, icon: List, label: "List view" },
        ]
      ).map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={value === mode}
          aria-label={label}
          onClick={() => onChange(mode)}
          className={cn(
            "grid size-8 place-items-center transition-colors",
            value === mode ? "bg-brass text-blueprint" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" strokeWidth={1.6} />
        </button>
      ))}
    </div>
  );
}
