import { Download, Heart, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_META } from "@/mocks/generation-status";
import { formatDateTime } from "../lib";
import type { ToolHistoryItem } from "../types";

interface HistoryCardProps {
  item: ToolHistoryItem;
  onPreview?: (item: ToolHistoryItem) => void;
  /** Studio-specific mini artwork rendered inside the thumbnail. */
  renderThumb: (item: ToolHistoryItem) => React.ReactNode;
  onDownload: (item: ToolHistoryItem) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenAgain: (item: ToolHistoryItem) => void;
}

function IconAction({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid size-7 place-items-center rounded-[3px] border transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-35",
        active ? "text-brass" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** One rich history row: thumbnail · prompt · datetime · credits · status · actions. */
export function HistoryCard({
  item,
  onPreview,
  renderThumb,
  onDownload,
  onToggleFavorite,
  onDelete,
  onOpenAgain,
}: HistoryCardProps) {
  const status = STATUS_META[item.status];

  return (
    <article className="flex flex-wrap items-center gap-3.5 rounded-[4px] border bg-card p-3 transition-colors hover:bg-accent/40 sm:flex-nowrap">
      {/* Thumbnail — click to preview (like Global History / My Files) */}
      <button
        type="button"
        onClick={onPreview ? () => onPreview(item) : undefined}
        aria-label="Preview this generation"
        className={cn(
          "relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-[3px] border border-bp-line",
          onPreview && "cursor-zoom-in",
        )}
        style={{ background: item.thumb.imageUrl ? undefined : `linear-gradient(135deg, ${item.thumb.colors[0]}, ${item.thumb.colors[1]})` }}
      >
        {!item.thumb.imageUrl && <div className="bg-grid absolute inset-0 opacity-30" />}
        {renderThumb(item)}
      </button>

      {/* Prompt + meta (row 1 on mobile, with the thumbnail) */}
      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-sm">{item.prompt}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
          <span>{formatDateTime(item.createdAt)}</span>
          <span>{item.creditsUsed} cr</span>
          <span className={cn("flex items-center gap-1.5", status.textClass)}>
            <span className={cn("size-1.5 rounded-full", status.dotClass)} />
            {status.label}
          </span>
        </div>
      </div>

      {/* Actions wrap to their own full-width row on mobile (basis-full),
          single row from sm up — no overlapping. */}
      <div className="flex basis-full items-center gap-1.5 sm:basis-auto sm:shrink-0">
        <IconAction
          label={item.status === "completed" ? "Download" : "Download (available when completed)"}
          onClick={() => onDownload(item)}
          disabled={item.status !== "completed"}
        >
          <Download className="size-3.5" strokeWidth={1.6} />
        </IconAction>
        <IconAction
          label={item.favorite ? "Remove favorite" : "Favorite"}
          onClick={() => onToggleFavorite(item.id)}
          active={item.favorite}
        >
          <Heart className={cn("size-3.5", item.favorite && "fill-current")} strokeWidth={1.6} />
        </IconAction>
        <IconAction label="Delete" onClick={() => onDelete(item.id)}>
          <Trash2 className="size-3.5" strokeWidth={1.6} />
        </IconAction>
        <button
          type="button"
          onClick={() => onOpenAgain(item)}
          className="ml-1 flex items-center gap-1.5 rounded-[3px] border px-2.5 py-1.5 font-mono text-[10px] tracking-[0.04em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <RotateCcw className="size-3" strokeWidth={1.6} />
          OPEN AGAIN
        </button>
      </div>
    </article>
  );
}
