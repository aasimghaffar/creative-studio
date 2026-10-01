import type { GeneratedItem } from "../types";
import { ImageCard } from "./image-card";

interface ResultGalleryProps {
  items: GeneratedItem[];
  copiedId: string | null;
  renderArtwork: (item: GeneratedItem) => React.ReactNode;
  tileBackground?: (item: GeneratedItem) => React.CSSProperties;
  onDownload: (item: GeneratedItem) => void;
  onToggleFavorite: (id: string) => void;
  onCopyPrompt: (item: GeneratedItem) => void;
  onDelete: (id: string) => void;
  onPreview?: (item: GeneratedItem) => void;
}

/** The generated-results grid, composed of ImageCards. */
export function ResultGallery({
  items,
  copiedId,
  renderArtwork,
  tileBackground,
  onDownload,
  onToggleFavorite,
  onCopyPrompt,
  onDelete,
  onPreview,
}: ResultGalleryProps) {
  return (
    <div className="grid max-w-2xl grid-cols-2 gap-4">
      {items.map((item) => (
        <ImageCard
          key={item.id}
          item={item}
          copied={copiedId === item.id}
          artwork={renderArtwork(item)}
          background={tileBackground?.(item)}
          onDownload={onDownload}
          onToggleFavorite={onToggleFavorite}
          onCopyPrompt={onCopyPrompt}
          onDelete={onDelete}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
}
