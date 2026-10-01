import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Prototype-style field primitives for tool panels. */

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow mb-2.5 text-[10px] text-muted-foreground">{children}</p>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

export function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              active
                ? "border-brass bg-brass font-medium text-blueprint"
                : "border-input bg-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function TogglePair({
  options,
  value,
  onChange,
}: {
  options: [string, string];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex w-fit overflow-hidden rounded-full border" role="radiogroup">
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option)}
            className={cn(
              "px-4 py-1.5 text-xs transition-colors",
              active ? "bg-brass font-medium text-blueprint" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function SwatchRow({
  colors,
  value,
  onChange,
}: {
  colors: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Colour palette">
      {colors.map((color) => {
        const active = color === value;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Colour ${color}`}
            onClick={() => onChange(color)}
            className={cn(
              "size-[26px] rounded-full border-2 transition-transform hover:scale-110",
              active ? "border-foreground" : "border-transparent",
            )}
            style={{ backgroundColor: color }}
          />
        );
      })}
    </div>
  );
}

export function Stepper({
  value,
  min = 1,
  max = 8,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-3.5 font-mono">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="grid size-[26px] place-items-center rounded-[3px] border text-foreground transition-colors hover:bg-accent disabled:opacity-40"
        disabled={value <= min}
      >
        <Minus className="size-3.5" strokeWidth={1.6} />
      </button>
      <span className="min-w-4 text-center text-sm tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="grid size-[26px] place-items-center rounded-[3px] border text-foreground transition-colors hover:bg-accent disabled:opacity-40"
        disabled={value >= max}
      >
        <Plus className="size-3.5" strokeWidth={1.6} />
      </button>
    </div>
  );
}
