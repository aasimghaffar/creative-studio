import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Collapsible "Advanced settings" section used at the bottom of tool forms. */
export function SettingsPanel({
  title = "Advanced settings",
  defaultOpen = false,
  children,
}: {
  title?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-6 border-t pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between"
      >
        <span className="eyebrow text-[10px] text-muted-foreground">{title}</span>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
          strokeWidth={1.6}
        />
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}
