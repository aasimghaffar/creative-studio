import { Input } from "@/components/ui/input";
import {
  ASPECT_RATIOS,
  CreditsIndicator,
  Field,
  GenerateButton,
  PromptForm,
  PromptInput,
  QUALITY_LEVELS,
  SettingsPanel,
  Stepper,
  StyleSelector,
  SwatchRow,
} from "@/features/studio-kit";
import { mockPromptTemplates } from "@/mocks";
import { INK_COLORS, LINE_WEIGHTS, PLACEMENTS, TATTOO_STYLES } from "../data";
import type { TattooSettings } from "../types";

interface PromptPanelProps {
  settings: TattooSettings;
  onChange: (patch: Partial<TattooSettings>) => void;
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
            busyLabel="Inking flash…"
          />
          <CreditsIndicator
            count={settings.quantity}
            unitLabel="designs"
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
        label="Describe the design"
        value={settings.prompt}
        onChange={(prompt) => onChange({ prompt })}
        placeholder="Crescent moon wrapped in wildflowers, single needle, delicate…"
        templates={mockPromptTemplates["tattoo"]}
        onTemplate={(t) => onChange({ prompt: t.prompt })}
      />

      <PromptInput
        label="Negative prompt"
        value={settings.negativePrompt}
        onChange={(negativePrompt) => onChange({ negativePrompt })}
        placeholder="No skulls, no text, avoid heavy black fills…"
        minHeight={56}
      />

      <StyleSelector options={TATTOO_STYLES} value={settings.style} onChange={(style) => onChange({ style })} />

      <StyleSelector
        label="Placement"
        options={PLACEMENTS}
        value={settings.placement}
        onChange={(placement) => onChange({ placement })}
      />

      <StyleSelector
        label="Line weight"
        options={LINE_WEIGHTS}
        value={settings.lineWeight}
        onChange={(lineWeight) => onChange({ lineWeight })}
      />

      <Field label="Ink colour">
        <SwatchRow colors={INK_COLORS} value={settings.color} onChange={(color) => onChange({ color })} />
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
