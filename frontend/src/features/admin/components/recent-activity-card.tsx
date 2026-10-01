import { cn } from "@/lib/utils";
import type { RecentRow } from "@/mocks/admin";
import { PanelCard } from "@/components/common/panel-card";

const TONE_CLASS: Record<NonNullable<RecentRow["tone"]>, string> = {
  teal: "bg-teal",
  brass: "bg-brass",
  destructive: "bg-destructive",
};

/** Generic recents list: dot · primary/secondary · mono time. */
export function RecentActivityCard({ label, items }: { label: string; items: RecentRow[] }) {
  return (
    <PanelCard label={label} contentClassName="p-0">
      <ol>
        {items.map((row, i) => (
          <li
            key={row.id}
            className={cn("flex items-start gap-3 px-5 py-3", i !== items.length - 1 && "border-b")}
          >
            <span
              className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", row.tone ? TONE_CLASS[row.tone] : "bg-muted-foreground/50")}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{row.primary}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.secondary}</p>
            </div>
            <span className="shrink-0 font-mono text-[10px] uppercase text-muted-foreground">{row.meta}</span>
          </li>
        ))}
      </ol>
    </PanelCard>
  );
}
