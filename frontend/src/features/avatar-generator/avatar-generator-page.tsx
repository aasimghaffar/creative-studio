import {
  ResultsPanel,
  Workbench,
  useToolStudio,
  type GeneratedItem,
  type ToolHistoryItem,
} from "@/features/studio-kit";
import { defaultSettings } from "./data";
import type { AvatarSettings } from "./types";
import { PromptPanel } from "./components/prompt-panel";

/** Geometric head + shoulders, slightly varied per draft. */
function AvatarFigure({ variant, small }: { variant: number; small?: boolean }) {
  const tilt = [0, -4, 4, -2][variant % 4] ?? 0;
  return (
    <span
      className={small ? "relative block h-8 w-10" : "relative block h-20 w-24"}
      style={{ transform: `rotate(${tilt}deg)` }}
      aria-hidden="true"
    >
      <span
        className={
          small
            ? "absolute left-1/2 top-0 size-4 -translate-x-1/2 rounded-full border border-paper-dark/90"
            : "absolute left-1/2 top-0 size-10 -translate-x-1/2 rounded-full border-2 border-paper-dark/90"
        }
      />
      <span
        className={
          small
            ? "absolute bottom-0 left-1/2 h-3 w-8 -translate-x-1/2 rounded-t-full border border-b-0 border-paper-dark/90"
            : "absolute bottom-0 left-1/2 h-8 w-20 -translate-x-1/2 rounded-t-full border-2 border-b-0 border-paper-dark/90"
        }
      />
    </span>
  );
}

export function AvatarGeneratorPage() {
  const studio = useToolStudio<AvatarSettings>({
    slug: "avatar",
    tag: "AVATAR",
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
      framing: s.framing,
      expression: s.expression,
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
      eyebrow="Face → Portrait"
      title="Avatar Generator"
      description="Describe a person, pick a style, expression, and backdrop, and cast a set of portraits for profiles, teams, and characters."
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
        emptyHint="Describe the person on the left and cast the first portraits."
        renderArtwork={(item: GeneratedItem) =>
          item.imageUrl ? (
            <img src={item.imageUrl} alt={item.prompt} loading="lazy" className="absolute inset-0 size-full object-cover" />
          ) : (
            <AvatarFigure variant={item.variant} />
          )
        }
        renderThumb={(item: ToolHistoryItem) =>
          item.thumb.imageUrl ? (
            <img src={item.thumb.imageUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
          ) : (
            <AvatarFigure variant={item.thumb.variant} small />
          )
        }
        onDownload={studio.handleDownload}
        onToggleFavorite={studio.handleToggleFavorite}
        onCopyPrompt={studio.handleCopyPrompt}
        onDelete={studio.handleDelete}
        historyHandlers={studio.historyHandlers}
      />
    </Workbench>
  );
}
