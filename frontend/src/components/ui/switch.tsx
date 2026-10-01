import { cn } from "@/lib/utils";

/** Minimal switch (no Radix): brass when on. */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
        checked ? "border-brass bg-brass" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-background shadow-sm transition-all",
          checked ? "left-[18px]" : "left-[3px]",
        )}
      />
    </button>
  );
}
