import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
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
  TogglePair,
  DEFAULT_SWATCHES,
} from "@/features/studio-kit";
import { mockPromptTemplates } from "@/mocks";
import { LOGO_STYLES } from "../data";
import type { LogoSettings } from "../types";

interface PromptPanelProps {
  settings: LogoSettings;
  onChange: (patch: Partial<LogoSettings>) => void;
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
            busyLabel="Casting drafts…"
          />
          <CreditsIndicator
            count={settings.quantity}
            unitLabel="drafts"
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
            <p className="mt-3 rounded-[3px] border border-teal/40 bg-teal/10 px-3 py-2 text-xs text-teal">
              {success}
            </p>
          )}
        </>
      }
    >
      <PromptInput
        label="Describe your logo"
        value={settings.prompt}
        onChange={(prompt) => onChange({ prompt })}
        placeholder="Nimbus & Co. — a calm cloud mark for a homeware brand…"
        templates={mockPromptTemplates["logo"]}
        activeTemplate={settings.template}
        onTemplate={(t) => onChange({ template: settings.template === t.label ? null : t.label })}
      />

      <PromptInput
        label="Negative prompt"
        value={settings.negativePrompt}
        onChange={(negativePrompt) => onChange({ negativePrompt })}
        placeholder="No gradients, no mascots, avoid thin strokes…"
        minHeight={56}
      />

      <StyleSelector options={LOGO_STYLES} value={settings.style} onChange={(style) => onChange({ style })} />

      <Field label="Colour palette">
        <div className="flex gap-2" role="group" aria-label="Brand colours">
          {DEFAULT_SWATCHES.map((color) => {
            const active = settings.colors.includes(color);
            const full = !active && settings.colors.length >= 3;
            return (
              <button
                key={color}
                type="button"
                aria-pressed={active}
                aria-label={`Colour ${color}`}
                disabled={full}
                onClick={() =>
                  onChange({
                    colors: active
                      ? settings.colors.filter((c) => c !== color)
                      : [...settings.colors, color],
                  })
                }
                className={cn(
                  "relative size-7 rounded-full border-2 transition-all",
                  active
                    ? "scale-110 border-foreground shadow-[0_0_0_2px_rgba(0,0,0,0.35)]"
                    : "border-transparent hover:scale-105",
                  full && "cursor-not-allowed opacity-35",
                )}
                style={{ backgroundColor: color }}
              >
                {active && <Check className="absolute inset-0 m-auto size-3.5 text-white drop-shadow" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
          Select up to 3 brand colors.
        </p>
      </Field>

      <StyleSelector
        label="Aspect ratio"
        options={ASPECT_RATIOS}
        value={settings.ratio}
        onChange={(ratio) => onChange({ ratio })}
      />

      <SettingsPanel>
        <Field label="Quantity">
          <Stepper value={settings.quantity} min={1} max={4} onChange={(quantity) => onChange({ quantity })} />
        </Field>
        <StyleSelector
          label="Quality"
          options={QUALITY_LEVELS}
          value={settings.quality}
          onChange={(quality) => onChange({ quality })}
        />
        <Field label="Background">
          <TogglePair
            options={["Solid", "Transparent"]}
            value={settings.transparent ? "Transparent" : "Solid"}
            onChange={(v) => onChange({ transparent: v === "Transparent" })}
          />
        </Field>
      </SettingsPanel>
    </PromptForm>
  );
}
