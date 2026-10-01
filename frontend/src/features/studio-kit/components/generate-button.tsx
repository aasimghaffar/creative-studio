import { Loader2, Sparkles } from "lucide-react";

/** The brass primary action of every studio. */
export function GenerateButton({
  onClick,
  disabled,
  generating,
  idleLabel = "Generate",
  busyLabel = "Generating…",
}: {
  onClick: () => void;
  disabled?: boolean;
  generating: boolean;
  idleLabel?: string;
  busyLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || generating}
      className="flex w-full items-center justify-center gap-2 rounded-[3px] bg-brass py-3.5 text-sm font-semibold tracking-[0.02em] text-blueprint transition-colors hover:bg-[#c99a4f] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {generating ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {busyLabel}
        </>
      ) : (
        <>
          <Sparkles className="size-4" strokeWidth={1.8} />
          {idleLabel}
        </>
      )}
    </button>
  );
}
