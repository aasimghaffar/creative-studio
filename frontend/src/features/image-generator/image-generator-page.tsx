import { NativeSelect } from "@/components/ui/native-select";
import {
  ASPECT_RATIOS,
  CreditsIndicator,
  DEFAULT_SWATCHES,
  Field,
  GenerateButton,
  PromptForm,
  PromptInput,
  QUALITY_LEVELS,
  ResultsPanel,
  Stepper,
  StyleSelector,
  SwatchRow,
  Workbench,
  useToolStudio,
  type GeneratedItem,
  type ToolHistoryItem,
} from "@/features/studio-kit";
import { defaultSettings, IMAGE_STYLES } from "./data";
import type { ImageGeneratorSettings } from "./types";

/** Placeholder art while an image streams in. */
function ArtFallback({ tone }: { tone: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center" style={{ background: `linear-gradient(135deg, ${tone}22, ${tone}55)` }}>
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/70">Rendering</span>
    </div>
  );
}

export function ImageGeneratorPage() {
  const studio = useToolStudio<ImageGeneratorSettings>({
    slug: "image",
    tag: "IMAGE",
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
    }),
    restoreFromHistory: (entry) => ({
      prompt: entry.prompt,
      style: entry.style || defaultSettings.style,
      color: entry.color,
      ratio: entry.ratio,
    }),
  });
  const canGenerate = studio.settings.prompt.trim().length > 0 && !studio.generating;

  return (
    <Workbench
      eyebrow="Text → Image"
      title="Image Generator"
      description="Describe any scene and render it — every image lands in your files and history."
      panel={
        <PromptForm
          footer={
            <>
              <GenerateButton onClick={studio.handleGenerate} disabled={!canGenerate} generating={studio.generating} busyLabel="Rendering…" />
              <CreditsIndicator
                count={studio.settings.quantity}
                unitLabel="images"
                estimate={studio.estimatedCost}
                balance={studio.creditsBalance}
                costPerDraft={studio.creditsPerDraft}
                unlimited={studio.unlimited}
              />
              {studio.error && (
                <div className="mt-3 rounded-[3px] border border-destructive/40 bg-destructive/10 px-3 py-2">
                  <p className="text-xs leading-relaxed text-destructive">{studio.error}</p>
                  <button
                    type="button"
                    onClick={studio.handleRetry}
                    disabled={studio.generating}
                    className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-destructive underline underline-offset-2 disabled:opacity-50"
                  >
                    Retry
                  </button>
                </div>
              )}
              {studio.success && (
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.06em] text-teal">{studio.success}</p>
              )}
            </>
          }
        >
          <PromptInput
            label="Describe it"
            value={studio.settings.prompt}
            onChange={(prompt) => studio.patchSettings({ prompt })}
            placeholder="A misty pine forest at sunrise, warm light through the trees…"
          />
          <PromptInput
            label="Negative prompt"
            value={studio.settings.negativePrompt}
            onChange={(negativePrompt) => studio.patchSettings({ negativePrompt })}
            placeholder="No people, no text, avoid oversaturation…"
            minHeight={56}
          />
          <StyleSelector options={IMAGE_STYLES} value={studio.settings.style} onChange={(style) => studio.patchSettings({ style })} />
          <Field label="Accent colour">
            <SwatchRow colors={DEFAULT_SWATCHES} value={studio.settings.color} onChange={(color) => studio.patchSettings({ color })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Aspect ratio">
              <NativeSelect value={studio.settings.ratio} onChange={(ratio) => studio.patchSettings({ ratio })} options={ASPECT_RATIOS} aria-label="Aspect ratio" />
            </Field>
            <Field label="Quality">
              <NativeSelect value={studio.settings.quality} onChange={(quality) => studio.patchSettings({ quality })} options={QUALITY_LEVELS} aria-label="Quality" />
            </Field>
          </div>
          <Field label="Quantity">
            <Stepper value={studio.settings.quantity} min={1} max={4} onChange={(quantity) => studio.patchSettings({ quantity })} />
          </Field>
        </PromptForm>
      }
    >
      <ResultsPanel
        items={studio.items}
        history={studio.history}
        generating={studio.generating}
        pendingCount={studio.settings.quantity}
        pendingRatio={studio.settings.ratio}
        emptyHint="Describe the scene on the left and render your first image."
        copiedId={studio.copiedId}
        renderArtwork={(item: GeneratedItem) =>
          item.imageUrl ? (
            <img src={item.imageUrl} alt={item.prompt} loading="lazy" className="absolute inset-0 size-full object-cover" />
          ) : (
            <ArtFallback tone={item.colors[0]} />
          )
        }
        renderThumb={(item: ToolHistoryItem) =>
          item.thumb.imageUrl ? (
            <img src={item.thumb.imageUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
          ) : (
            <ArtFallback tone={item.thumb.colors[0]} />
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
