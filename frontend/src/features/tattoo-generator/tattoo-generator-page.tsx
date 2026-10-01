import { Anchor, Bird, Flower2, MoonStar, Sun, Waves } from "lucide-react";
import {
  ResultsPanel,
  Workbench,
  useToolStudio,
  type GeneratedItem,
  type ToolHistoryItem,
} from "@/features/studio-kit";
import { defaultSettings } from "./data";
import type { TattooSettings } from "./types";
import { PromptPanel } from "./components/prompt-panel";

/** Flash-sheet motifs, cycled per draft. */
const MOTIFS = [MoonStar, Flower2, Anchor, Bird, Sun, Waves];

/** Tattoo tiles sit on "skin paper" — the ink colour comes from the swatch. */
const paperBackground = (): React.CSSProperties => ({
  background: "linear-gradient(135deg, #EDEAE1, #D8D2C2)",
});

function TattooMotif({ variant, ink, small }: { variant: number; ink: string; small?: boolean }) {
  const Motif = MOTIFS[variant % MOTIFS.length] ?? MoonStar;
  const tilt = [0, -6, 5, -3][variant % 4] ?? 0;
  return (
    <span style={{ color: ink, transform: `rotate(${tilt}deg)` }} aria-hidden="true">
      <Motif className={small ? "size-6" : "size-16"} strokeWidth={small ? 1.6 : 1.3} />
    </span>
  );
}

export function TattooGeneratorPage() {
  const studio = useToolStudio<TattooSettings>({
    slug: "tattoo",
    tag: "TATTOO",
    defaultSettings,
    // Raw selections only — the backend builds the AI prompt.
    buildPayload: (s) => ({
      prompt: s.prompt,
      negative_prompt: s.negativePrompt,
      style: s.style,
      color: s.color,
      ratio: s.ratio,
      quantity: s.quantity,
      quality: s.quality,
      placement: s.placement,
      line_weight: s.lineWeight,
    }),
    restoreFromHistory: (entry) => ({
      prompt: entry.prompt,
      style: entry.style || defaultSettings.style,
      color: entry.color,
      ratio: entry.ratio,
    }),
  });

  return (
    <Workbench
      eyebrow="Idea → Ink"
      title="Tattoo Generator"
      description="Describe the design, choose a style, placement, and line weight, and ink a flash sheet of concepts to take to your artist."
      panel={
        <PromptPanel
          settings={studio.settings}
          onChange={studio.patchSettings}
          onGenerate={studio.handleGenerate}
          onRetry={studio.handleRetry}
          generating={studio.generating}
          creditsBalance={studio.creditsBalance}
          estimatedCost={studio.estimatedCost}
          creditsPerDraft={studio.creditsPerDraft}
          unlimited={studio.unlimited}
          error={studio.error}
          success={studio.success}
        />
      }
    >
      <ResultsPanel
        items={studio.items}
        history={studio.history}
        generating={studio.generating}
        pendingCount={studio.settings.quantity}
        pendingRatio={studio.settings.ratio}
        copiedId={studio.copiedId}
        emptyHint="Describe the design on the left and ink the first flash sheet."
        renderArtwork={(item: GeneratedItem) =>
          item.imageUrl ? (
            <img src={item.imageUrl} alt={item.prompt} loading="lazy" className="absolute inset-0 size-full object-cover" />
          ) : (
            <TattooMotif variant={item.variant} ink={item.colors[0]} />
          )
        }
        renderThumb={(item: ToolHistoryItem) =>
          item.thumb.imageUrl ? (
            <img src={item.thumb.imageUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
          ) : (
            <TattooMotif variant={item.thumb.variant} ink="#EDEAE1" small />
          )
        }
        tileBackground={paperBackground}
        onDownload={studio.handleDownload}
        onToggleFavorite={studio.handleToggleFavorite}
        onCopyPrompt={studio.handleCopyPrompt}
        onDelete={studio.handleDelete}
        historyHandlers={studio.historyHandlers}
      />
    </Workbench>
  );
}
