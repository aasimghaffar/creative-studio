import { ArrowUpRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LatestImage } from "../data";
import { DashboardCard } from "./dashboard-card";

export function LatestImagesCard({ images }: { images: LatestImage[] }) {
  return (
    <DashboardCard
      label="Latest images"
      action={
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 font-mono text-[10px] tracking-[0.06em] text-muted-foreground">
          VIEW LIBRARY
          <ArrowUpRight className="size-3" />
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((image) => (
          <figure key={image.id} className="group relative">
            {/* Blueprint tile (prototype gallery style) */}
            <div
              className={`relative aspect-square overflow-hidden rounded-[3px] border border-bp-line bg-gradient-to-br ${image.gradientClass}`}
            >
              <div className="bg-grid absolute inset-0 opacity-40" aria-hidden="true" />
              {image.url && (
                <img src={image.url} alt={image.title} loading="lazy" className="absolute inset-0 size-full object-cover" />
              )}
              <span className="absolute bottom-2 left-2 font-mono text-[9px] tracking-[0.04em] text-mist">
                {image.tag}
              </span>
              <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-[3px] border border-bp-line bg-blueprint/70 opacity-0 transition-opacity group-hover:opacity-100">
                <Download className="size-3.5 text-mist" strokeWidth={1.6} />
              </span>
            </div>
            <figcaption className="mt-1.5">
              <p className="truncate text-xs font-medium">{image.title}</p>
              <p className="font-mono text-[9px] uppercase text-muted-foreground">{image.tool}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </DashboardCard>
  );
}
