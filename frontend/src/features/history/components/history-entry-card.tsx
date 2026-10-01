import { Download, Eye, Heart, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime, type ToolHistoryItem } from "@/features/studio-kit";
import { STATUS_META } from "@/mocks/generation-status";
import { GenerationThumb, TOOL_LABELS } from "@/components/common/generation-thumb";
import type { ViewMode } from "@/components/common/view-toggle";

interface HistoryEntryCardProps {
  entry: ToolHistoryItem;
  view: ViewMode;
  regenerating: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
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

/** One global-history entry in grid or list form, with the full action set. */
export function HistoryEntryCard({
  entry,
  view,
  regenerating,
  onPreview,
  onDownload,
  onToggleFavorite,
  onDelete,
  onRegenerate,
}: HistoryEntryCardProps) {
  const status = STATUS_META[entry.status];
  const completed = entry.status === "completed";

  const meta = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
      <span>{TOOL_LABELS[entry.toolId] ?? entry.toolId}</span>
      <span>{formatDateTime(entry.createdAt)}</span>
      <span>{entry.creditsUsed} cr</span>
      <span className={cn("flex items-center gap-1.5", status.textClass)}>
        <span className={cn("size-1.5 rounded-full", status.dotClass)} />
        {status.label}
      </span>
    </div>
  );

  const actions = (
    <div className="flex items-center gap-1.5">
      <IconAction label="Preview" onClick={onPreview}>
        <Eye className="size-3.5" strokeWidth={1.6} />
      </IconAction>
      <IconAction label="Download" onClick={onDownload} disabled={!completed}>
        <Download className="size-3.5" strokeWidth={1.6} />
      </IconAction>
      <IconAction label={entry.favorite ? "Remove favorite" : "Favorite"} onClick={onToggleFavorite} active={entry.favorite}>
        <Heart className={cn("size-3.5", entry.favorite && "fill-current")} strokeWidth={1.6} />
      </IconAction>
      <IconAction label="Delete" onClick={onDelete}>
        <Trash2 className="size-3.5" strokeWidth={1.6} />
      </IconAction>
      <IconAction label="Regenerate" onClick={onRegenerate} disabled={regenerating}>
        {regenerating ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RotateCcw className="size-3.5" strokeWidth={1.6} />
        )}
      </IconAction>
    </div>
  );

  if (view === "grid") {
    return (
      <article className="rounded-[4px] border bg-card p-3">
        <button type="button" onClick={onPreview} className="block w-full" aria-label="Preview generation">
          <GenerationThumb item={entry} size="lg" />
        </button>
        <p className="mt-2.5 truncate text-sm">{entry.prompt}</p>
        <div className="mt-1.5">{meta}</div>
        <div className="mt-3 flex justify-end border-t pt-2.5">{actions}</div>
      </article>
    );
  }

  return (
    <article className="flex flex-wrap items-center gap-3.5 rounded-[4px] border bg-card p-3 transition-colors hover:bg-accent/40 sm:flex-nowrap">
      <button type="button" onClick={onPreview} aria-label="Preview generation" className="shrink-0">
        <GenerationThumb item={entry} />
      </button>
      {/* Row 1 on mobile: image + text. Actions wrap to their own full-width
          row below (basis-full) instead of overlapping; single row from sm up. */}
      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-sm">{entry.prompt}</p>
        <div className="mt-1">{meta}</div>
      </div>
      <div className="flex basis-full justify-start sm:basis-auto sm:shrink-0 sm:justify-end">{actions}</div>
    </article>
  );
}
