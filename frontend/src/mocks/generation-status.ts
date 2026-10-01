import type { GenerationStatus } from "@/features/studio-kit";

/** All possible generation states + their presentation meta. */
export const GENERATION_STATUSES: GenerationStatus[] = [
  "completed",
  "processing",
  "queued",
  "failed",
];

export const STATUS_META: Record<GenerationStatus, { label: string; dotClass: string; textClass: string }> = {
  completed: { label: "Completed", dotClass: "bg-teal", textClass: "text-teal" },
  processing: { label: "Processing", dotClass: "bg-brass animate-pulse", textClass: "text-brass" },
  queued: { label: "Queued", dotClass: "bg-mist", textClass: "text-muted-foreground" },
  failed: { label: "Failed", dotClass: "bg-destructive", textClass: "text-destructive" },
};
