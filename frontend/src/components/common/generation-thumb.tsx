import { Anchor, Bird, Flower2, MoonStar, Sun, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import { monogram } from "@/features/studio-kit";
import type { ToolHistoryItem } from "@/features/studio-kit";

const MOTIFS = [MoonStar, Flower2, Anchor, Bird, Sun, Waves];

export const TOOL_LABELS: Record<string, string> = {
  logo: "Logo Generator",
  avatar: "Avatar Generator",
  tattoo: "Tattoo Generator",
  image: "Image Generator",
};

/** Mini artwork for any generation, keyed by toolId — used by History & Favorites. */
export function GenerationThumb({
  item,
  size = "sm",
  className,
}: {
  item: Pick<ToolHistoryItem, "toolId" | "prompt" | "thumb">;
  size?: "sm" | "lg";
  className?: string;
}) {
  const lg = size === "lg";
  const bg =
    item.toolId === "tattoo"
      ? "linear-gradient(135deg, #EDEAE1, #D8D2C2)"
      : `linear-gradient(135deg, ${item.thumb.colors[0]}, ${item.thumb.colors[1]})`;

  let mark: React.ReactNode;
  if (item.toolId === "avatar") {
    mark = (
      <span className={lg ? "relative block h-16 w-20" : "relative block h-8 w-10"} aria-hidden="true">
        <span
          className={cn(
            "absolute left-1/2 top-0 -translate-x-1/2 rounded-full border-paper-dark/90",
            lg ? "size-8 border-2" : "size-4 border",
          )}
        />
        <span
          className={cn(
            "absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-full border-b-0 border-paper-dark/90",
            lg ? "h-6 w-16 border-2" : "h-3 w-8 border",
          )}
        />
      </span>
    );
  } else if (item.toolId === "tattoo") {
    const Motif = MOTIFS[item.thumb.variant % MOTIFS.length] ?? MoonStar;
    mark = (
      <span style={{ color: item.thumb.colors[0] }} aria-hidden="true">
        <Motif className={lg ? "size-12" : "size-6"} strokeWidth={1.5} />
      </span>
    );
  } else {
    mark = (
      <span
        className={cn(
          "grid place-items-center rounded-full border-paper-dark/90",
          lg ? "size-14 border-2" : "size-8 border",
        )}
      >
        <span className={cn("font-display font-medium text-paper-dark", lg ? "text-xl" : "text-sm")}>
          {monogram(item.prompt)}
        </span>
      </span>
    );
  }

  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-[3px] border border-bp-line",
        lg ? "aspect-square w-full" : "size-14",
        className,
      )}
      style={{ background: item.thumb.imageUrl ? undefined : bg }}
      aria-hidden="true"
    >
      {!item.thumb.imageUrl && <div className="bg-grid absolute inset-0 opacity-30" />}
      {item.thumb.imageUrl ? (
        <img
          src={item.thumb.imageUrl}
          alt=""
          loading="lazy"
          className={cn("absolute inset-0 size-full", lg ? "object-contain" : "object-cover")}
        />
      ) : (
        mark
      )}
    </div>
  );
}
