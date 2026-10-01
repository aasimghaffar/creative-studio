import { ImageIcon, type LucideIcon } from "lucide-react";

/** Dashed placeholder shown before the first generation. */
export function EmptyState({ hint, icon: Icon = ImageIcon }: { hint: string; icon?: LucideIcon }) {
  return (
    <div className="grid max-w-2xl place-items-center rounded-[4px] border-[1.5px] border-dashed py-16 text-center">
      <Icon className="size-6 text-muted-foreground" strokeWidth={1.4} />
      <p className="mt-3 max-w-xs text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
