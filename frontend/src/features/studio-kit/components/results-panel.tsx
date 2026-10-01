import { useState } from "react";
import { Download } from "lucide-react";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/ui/button";
import { RATIO_CLASSES } from "../lib";
import type { GeneratedItem, HistoryHandlers, ToolHistoryItem } from "../types";
import { ResultGallery } from "./result-gallery";
import { EmptyState } from "./empty-state";
import { LoadingSkeleton } from "./loading-skeleton";
import { HistoryCard } from "./history-card";

interface ResultsPanelProps {
  items: GeneratedItem[];
  history: ToolHistoryItem[];
  generating: boolean;
  pendingCount: number;
  pendingRatio: string;
  copiedId: string | null;
  emptyHint: string;
  renderArtwork: (item: GeneratedItem) => React.ReactNode;
  renderThumb: (item: ToolHistoryItem) => React.ReactNode;
  tileBackground?: (item: GeneratedItem) => React.CSSProperties;
  onDownload: (item: GeneratedItem) => void;
  onToggleFavorite: (id: string) => void;
  onCopyPrompt: (item: GeneratedItem) => void;
  onDelete: (id: string) => void;
  historyHandlers: HistoryHandlers;
}

/** Right side of every studio: results (grid / skeleton / empty) + rich Recent History. */
export function ResultsPanel({
  items,
  history,
  generating,
  pendingCount,
  pendingRatio,
  copiedId,
  emptyHint,
  renderArtwork,
  renderThumb,
  tileBackground,
  onDownload,
  onToggleFavorite,
  onCopyPrompt,
  onDelete,
  historyHandlers,
}: ResultsPanelProps) {
  const pendingAspect = RATIO_CLASSES[pendingRatio] ?? "aspect-square";
  const [preview, setPreview] = useState<{ imageUrl?: string; prompt: string; artwork?: React.ReactNode } | null>(null);

  return (
    <div className="flex-1 overflow-y-auto p-5 dark:bg-grid sm:p-6">
      <section aria-label="Generated images">
        <p className="eyebrow mb-4 text-[10px] text-muted-foreground">Generated images</p>
        {generating ? (
          <LoadingSkeleton count={pendingCount} aspectClass={pendingAspect} />
        ) : items.length === 0 ? (
          <EmptyState hint={emptyHint} />
        ) : (
          <ResultGallery
            items={items}
            copiedId={copiedId}
            renderArtwork={renderArtwork}
            tileBackground={tileBackground}
            onDownload={onDownload}
            onToggleFavorite={onToggleFavorite}
            onCopyPrompt={onCopyPrompt}
            onDelete={onDelete}
            onPreview={(item) => setPreview({ imageUrl: item.imageUrl, prompt: item.prompt, artwork: renderArtwork(item) })}
          />
        )}
      </section>

      {/* Click-to-preview: the draft at full size with its prompt + download */}
      <Modal open={preview !== null} onClose={() => setPreview(null)} title="Preview" className="max-w-lg">
        {preview && (
          <div className="max-h-[80vh] overflow-y-auto p-5">
            {preview.imageUrl ? (
              <img
                src={preview.imageUrl}
                alt=""
                className="mx-auto max-h-[55vh] w-auto max-w-full rounded-[4px] border border-bp-line object-contain"
              />
            ) : (
              <div className="mx-auto grid aspect-square max-w-xs place-items-center overflow-hidden rounded-[4px] border border-bp-line">
                {preview.artwork}
              </div>
            )}
            <p className="mt-4 text-sm leading-relaxed">{preview.prompt}</p>
            {preview.imageUrl && (
              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void import("@/lib/api-client").then(({ downloadFile }) => downloadFile(preview.imageUrl!, "generation.png"))}
                >
                  <Download className="size-3.5" />
                  Download PNG
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <section aria-label="Recent history" className="mt-10 max-w-2xl">
        <p className="eyebrow mb-3 border-b pb-2 text-[10px] text-muted-foreground">Recent history</p>
        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No generations yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => (
              <HistoryCard
                key={entry.id}
                item={entry}
                renderThumb={renderThumb}
                onDownload={historyHandlers.onDownload}
                onToggleFavorite={historyHandlers.onToggleFavorite}
                onDelete={historyHandlers.onDelete}
                onOpenAgain={historyHandlers.onOpenAgain}
                onPreview={(h) => setPreview({ imageUrl: h.thumb.imageUrl, prompt: h.prompt })}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
