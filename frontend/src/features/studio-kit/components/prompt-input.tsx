import { cn } from "@/lib/utils";
import type { PromptTemplate } from "../types";
import { Field } from "./fields";

interface PromptInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** Optional starter prompts rendered as chips under the textarea. */
  templates?: PromptTemplate[];
  onTemplate?: (template: PromptTemplate) => void;
  /** Label of the currently selected template (renders an active state). */
  activeTemplate?: string | null;
}

/** Labeled prompt textarea with optional template chips. */
export function PromptInput({
  label,
  value,
  onChange,
  placeholder,
  minHeight = 84,
  templates,
  onTemplate,
  activeTemplate = null,
}: PromptInputProps) {
  return (
    <Field label={label}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ minHeight }}
        className={cn(
          "w-full resize-y rounded-[3px] border bg-background px-3 py-2.5 text-[13.5px] text-foreground",
          "placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      />
      {templates && templates.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
            Templates
          </span>
          {templates.map((template) => {
            const active = activeTemplate === template.label;
            return (
              <button
                key={template.id}
                type="button"
                aria-pressed={active}
                onClick={() => onTemplate?.(template)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                  active
                    ? "border-brass/70 bg-brass/15 text-foreground"
                    : "border-dashed text-muted-foreground hover:border-solid hover:bg-accent hover:text-foreground",
                )}
              >
                {template.label}
              </button>
            );
          })}
        </div>
      )}
    </Field>
  );
}
