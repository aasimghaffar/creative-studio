import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field } from "./fields";

interface ImageUploadProps {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  hint?: string;
}

/** Drag-and-drop / click image upload with preview — for reference-image tools. */
export function ImageUpload({ label, file, onChange, hint }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (files: FileList | null) => {
    const first = files?.[0];
    if (first && first.type.startsWith("image/")) onChange(first);
  };

  return (
    <Field label={label}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => pick(e.target.files)}
      />
      {previewUrl ? (
        <div className="relative overflow-hidden rounded-[3px] border">
          <img src={previewUrl} alt="Reference upload preview" className="max-h-36 w-full object-cover" />
          <button
            type="button"
            aria-label="Remove image"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="absolute right-2 top-2 grid size-7 place-items-center rounded-[3px] border border-bp-line bg-blueprint/80 text-mist backdrop-blur hover:bg-bp-panel-2"
          >
            <X className="size-3.5" strokeWidth={1.6} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files);
          }}
          className={cn(
            "flex w-full flex-col items-center gap-1.5 rounded-[3px] border-[1.5px] border-dashed px-4 py-6 text-center transition-colors",
            dragging ? "border-brass bg-brass/5" : "hover:bg-accent/60",
          )}
        >
          <ImagePlus className="size-5 text-muted-foreground" strokeWidth={1.4} />
          <span className="text-xs text-muted-foreground">
            Drop an image or <span className="text-foreground underline underline-offset-2">browse</span>
          </span>
          {hint && <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-muted-foreground/70">{hint}</span>}
        </button>
      )}
    </Field>
  );
}
