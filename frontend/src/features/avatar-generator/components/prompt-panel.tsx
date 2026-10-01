import { Input } from "@/components/ui/input";
import {
  ASPECT_RATIOS,
  CreditsIndicator,
  DEFAULT_SWATCHES,
  Field,
  GenerateButton,
  ImageUpload,
  PromptForm,
  PromptInput,
  QUALITY_LEVELS,
  SettingsPanel,
  Stepper,
  StyleSelector,
  SwatchRow,
  TogglePair,
} from "@/features/studio-kit";
import { mockPromptTemplates } from "@/mocks";
import { AVATAR_STYLES, EXPRESSIONS, FRAMINGS } from "../data";
import type { AvatarSettings } from "../types";

interface PromptPanelProps {
  settings: AvatarSettings;
  onChange: (patch: Partial<AvatarSettings>) => void;
  onGenerate: () => void;
  onRetry: () => void;
  generating: boolean;
  creditsBalance: number;
  estimatedCost: number;
  creditsPerDraft: number;
  unlimited: boolean;
  error: string | null;
  success: string | null;
}

export function PromptPanel({
  settings,
  onChange,
  onGenerate,
  onRetry,
  generating,
  creditsBalance,
  estimatedCost,
  creditsPerDraft,
  unlimited,
  error,
  success,
}: PromptPanelProps) {
  const canGenerate = settings.prompt.trim().length > 0 && !generating;

  return (
    <PromptForm
      footer={
        <>
          <GenerateButton
            onClick={onGenerate}
            disabled={!canGenerate}
            generating={generating}
            busyLabel="Casting portraits…"
          />
          <CreditsIndicator
            count={settings.quantity}
            unitLabel="portraits"
            estimate={estimatedCost}
            balance={creditsBalance}
            costPerDraft={creditsPerDraft}
            unlimited={unlimited}
          />
          {error && (
            <div className="mt-3 rounded-[3px] border border-destructive/40 bg-destructive/10 px-3 py-2">
              <p className="text-xs leading-relaxed text-destructive">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                disabled={generating}
                className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-destructive underline underline-offset-2 disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          )}
          {success && (
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.06em] text-teal">{success}</p>
          )}
        </>
      }
    >
      <PromptInput
        label="Describe the person"
        value={settings.prompt}
        onChange={(prompt) => onChange({ prompt })}
        placeholder="Curly-haired product designer, round glasses, warm studio light…"
        templates={mockPromptTemplates["avatar"]}
        onTemplate={(t) => onChange({ prompt: t.prompt })}
      />

      <ImageUpload
        label="Reference photo (optional)"
        file={settings.referenceImage}
        onChange={(referenceImage) => onChange({ referenceImage })}
        hint="PNG / JPG · likeness guide"
      />

      <PromptInput
        label="Negative prompt"
        value={settings.negativePrompt}
        onChange={(negativePrompt) => onChange({ negativePrompt })}
        placeholder="No hats, no heavy shadows, avoid busy backgrounds…"
        minHeight={56}
      />

      <StyleSelector options={AVATAR_STYLES} value={settings.style} onChange={(style) => onChange({ style })} />

      <StyleSelector
        label="Expression"
        options={EXPRESSIONS}
        value={settings.expression}
        onChange={(expression) => onChange({ expression })}
      />

      <Field label="Framing">
        <TogglePair options={FRAMINGS} value={settings.framing} onChange={(framing) => onChange({ framing })} />
      </Field>

      <Field label="Backdrop colour">
        <SwatchRow colors={DEFAULT_SWATCHES} value={settings.color} onChange={(color) => onChange({ color })} />
      </Field>

      <StyleSelector
        label="Aspect ratio"
        options={ASPECT_RATIOS}
        value={settings.ratio}
        onChange={(ratio) => onChange({ ratio })}
      />

      <SettingsPanel>
        <Field label="Quantity">
          <Stepper value={settings.quantity} onChange={(quantity) => onChange({ quantity })} />
        </Field>
        <Field label="Seed">
          <Input
            value={settings.seed}
            onChange={(e) => onChange({ seed: e.target.value })}
            placeholder="Random"
            className="rounded-[3px] font-mono text-xs"
          />
        </Field>
        <StyleSelector
          label="Quality"
          options={QUALITY_LEVELS}
          value={settings.quality}
          onChange={(quality) => onChange({ quality })}
        />
      </SettingsPanel>
    </PromptForm>
  );
}
