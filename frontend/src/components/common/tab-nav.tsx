import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
}

/** Underline tab strip (Settings, Favorites, …). */
export function TabNav({
  tabs,
  value,
  onChange,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm transition-colors",
              active
                ? "border-brass font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
