import {
  monogram,
  ResultsPanel,
  Workbench,
  type GeneratedItem,
  type ToolHistoryItem,
} from "@/features/studio-kit";
import { useLogoStudio } from "./use-logo-studio";
import { PromptPanel } from "./components/prompt-panel";

/** Real generated image when available; monogram placeholder otherwise. */
function LogoArtwork({ item }: { item: GeneratedItem }) {
  if (item.imageUrl) {
    return (
      <img
        src={item.imageUrl}
        alt={item.prompt}
        loading="lazy"
        className="absolute inset-0 size-full object-cover"
      />
    );
  }
  return (
    <span className="grid size-16 place-items-center rounded-full border-2 border-paper-dark/90">
      <span className="font-display text-2xl font-medium text-paper-dark">{monogram(item.prompt)}</span>
    </span>
  );
}

function LogoThumb({ item }: { item: ToolHistoryItem }) {
  if (item.thumb.imageUrl) {
    return (
      <img
        src={item.thumb.imageUrl}
        alt=""
        loading="lazy"
        className="absolute inset-0 size-full object-cover"
      />
    );
  }
  return (
    <span className="grid size-8 place-items-center rounded-full border border-paper-dark/90">
      <span className="font-display text-sm font-medium text-paper-dark">{monogram(item.prompt)}</span>
    </span>
  );
}

export function LogoGeneratorPage() {
  const studio = useLogoStudio();

  return (
    <Workbench
      eyebrow="Brand → Mark"
      title="Logo Generator"
      description="Describe the mark, pick a style and palette, and generate real logo concepts with Google AI. Every run lands in your history and files."
      panel={
        <PromptPanel
          settings={studio.settings}
          onChange={studio.patchSettings}
          onGenerate={studio.handleGenerate}
          onRetry={studio.handleRetry}
          generating={studio.generating}
          creditsBalance={studio.creditsBalance}
          creditsPerDraft={studio.creditsPerDraft}
          unlimited={studio.unlimited}
          estimatedCost={studio.estimatedCost}
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
        emptyHint="Describe your mark on the left and generate the first real drafts."
        renderArtwork={(item) => <LogoArtwork item={item} />}
        renderThumb={(item) => <LogoThumb item={item} />}
        onDownload={studio.handleDownload}
        onToggleFavorite={studio.handleToggleFavorite}
        onCopyPrompt={studio.handleCopyPrompt}
        onDelete={studio.handleDelete}
        historyHandlers={studio.historyHandlers}
      />
    </Workbench>
  );
}
