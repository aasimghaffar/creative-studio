import { Check, Copy, Download, Heart, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RATIO_CLASSES } from "../lib";
import type { GeneratedItem } from "../types";

interface ImageCardProps {
  item: GeneratedItem;
  copied: boolean;
  /** Studio-specific artwork rendered in the tile center. */
  artwork: React.ReactNode;
  /** Tile background; defaults to a gradient from the item's colors. */
  background?: React.CSSProperties;
  onDownload: (item: GeneratedItem) => void;
  onToggleFavorite: (id: string) => void;
  onCopyPrompt: (item: GeneratedItem) => void;
  onDelete: (id: string) => void;
  onPreview?: (item: GeneratedItem) => void;
}

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-[3px] border border-bp-line bg-blueprint/80 text-mist backdrop-blur transition-colors hover:bg-bp-panel-2"
    >
      {children}
    </button>
  );
}

/** One generated result: tile + hover action bar (Download / Copy / Delete / Favorite). */
export function ImageCard({
  item,
  copied,
  artwork,
  background,
  onDownload,
  onToggleFavorite,
  onCopyPrompt,
  onDelete,
  onPreview,
}: ImageCardProps) {
  const aspect = RATIO_CLASSES[item.ratio] ?? "aspect-square";
  const style = background ?? {
    background: `linear-gradient(135deg, ${item.colors[0]}, ${item.colors[1]})`,
  };

  return (
    <figure className="group">
      <div className={cn("relative overflow-hidden rounded-[3px] border border-bp-line", aspect)} style={style}>
        <div className="bg-grid absolute inset-0 opacity-30" aria-hidden="true" />

        {onPreview ? (
          <button
            type="button"
            onClick={() => onPreview(item)}
            aria-label="Preview this draft"
            className="absolute inset-0 grid cursor-zoom-in place-items-center"
          >
            {artwork}
          </button>
        ) : (
          <div className="absolute inset-0 grid place-items-center">{artwork}</div>
        )}

        <span className="absolute bottom-2 left-2 font-mono text-[9px] tracking-[0.04em] text-paper-dark/80 mix-blend-difference">
          {item.tag}
        </span>

        <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <ActionButton label="Download PNG" onClick={() => onDownload(item)}>
            <Download className="size-3.5" strokeWidth={1.6} />
          </ActionButton>
          <ActionButton label={copied ? "Copied" : "Copy prompt"} onClick={() => onCopyPrompt(item)}>
            {copied ? (
              <Check className="size-3.5 text-teal" strokeWidth={2} />
            ) : (
              <Copy className="size-3.5" strokeWidth={1.6} />
            )}
          </ActionButton>
          <ActionButton label="Delete" onClick={() => onDelete(item.id)}>
            <Trash2 className="size-3.5" strokeWidth={1.6} />
          </ActionButton>
        </div>

        <button
          type="button"
          title={item.favorite ? "Remove favorite" : "Favorite"}
          aria-label={item.favorite ? "Remove favorite" : "Favorite"}
          aria-pressed={item.favorite}
          onClick={() => onToggleFavorite(item.id)}
          className={cn(
            "absolute left-2 top-2 grid size-8 place-items-center rounded-[3px] border border-bp-line bg-blueprint/80 backdrop-blur transition-all hover:bg-bp-panel-2",
            item.favorite
              ? "text-brass opacity-100"
              : "text-mist opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
          )}
        >
          <Heart className={cn("size-3.5", item.favorite && "fill-current")} strokeWidth={1.6} />
        </button>
      </div>
      <figcaption className="mt-1.5 flex items-center justify-between gap-2">
        <p className="truncate text-xs text-muted-foreground">
          {item.style} · {item.ratio}
        </p>
        {item.favorite && <Heart className="size-3 shrink-0 fill-brass text-brass" aria-hidden="true" />}
      </figcaption>
    </figure>
  );
}

/** Back-compat alias. */
export const StudioTile = ImageCard;
