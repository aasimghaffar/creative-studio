import { Download } from "lucide-react";
import { formatDateTime, type ToolHistoryItem } from "@/features/studio-kit";
import { STATUS_META } from "@/mocks/generation-status";
import { Modal } from "@/components/common/modal";
import { GenerationThumb, TOOL_LABELS } from "@/components/common/generation-thumb";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Large preview: generated image + the full prompt and meta. */
export function PreviewDialog({
  entry,
  onClose,
  onDownload,
}: {
  entry: ToolHistoryItem | null;
  onClose: () => void;
  onDownload: (entry: ToolHistoryItem) => void;
}) {
  const status = entry ? STATUS_META[entry.status] : null;
  return (
    <Modal open={entry !== null} onClose={onClose} title="Preview" className="max-w-lg">
      {entry && status && (
        <div className="max-h-[80vh] overflow-y-auto p-5">
          {/* Real image rendered directly (a w-fit wrapper collapses the
              thumb's w-full to zero width — the image silently vanished).
              Capped to ~45vh so prompt + Download always fit on screen. */}
          {entry.thumb.imageUrl ? (
            <img
              src={entry.thumb.imageUrl}
              alt=""
              className="mx-auto max-h-[45vh] w-auto max-w-full rounded-[3px] border border-bp-line object-contain"
            />
          ) : (
            <div className="mx-auto max-w-xs">
              <GenerationThumb item={entry} size="lg" />
            </div>
          )}
          <div className="mt-4">
            <p className="eyebrow text-[9px] text-muted-foreground">Prompt</p>
            <p className="mt-1 text-sm leading-relaxed">{entry.prompt}</p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
            <span>{TOOL_LABELS[entry.toolId] ?? entry.toolId}</span>
            <span>{entry.style}</span>
            <span>{entry.ratio}</span>
            <span>{formatDateTime(entry.createdAt)}</span>
            <span>{entry.creditsUsed} cr</span>
            <span className={cn("flex items-center gap-1.5", status.textClass)}>
              <span className={cn("size-1.5 rounded-full", status.dotClass)} />
              {status.label}
            </span>
          </div>
          <div className="mt-5 flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => onDownload(entry)} disabled={entry.status !== "completed"}>
              <Download className="size-3.5" />
              Download PNG
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
