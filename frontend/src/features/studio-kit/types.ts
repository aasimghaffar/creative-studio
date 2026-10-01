/** Shared domain types for all generation studios. */

export interface BaseSettings {
  prompt: string;
  negativePrompt: string;
  style: string;
  color: string;
  ratio: string;
  quantity: number;
  seed: string;
  quality: string;
}

export interface GeneratedItem {
  id: string;
  prompt: string;
  style: string;
  ratio: string;
  /** [base, deep] pair derived from the chosen swatch. */
  colors: [string, string];
  tag: string;
  createdAt: number;
  favorite: boolean;
  /** Batch index — lets artwork renderers vary per draft. */
  variant: number;
  /** Real generated image URL (API-backed tools); absent for mock tools. */
  imageUrl?: string;
  /** Server ids for API-backed tools. */
  historyId?: number;
}

/** Minimal shape needed to build a downloadable SVG (works for items and history). */
export type SvgSource = Pick<GeneratedItem, "prompt" | "colors" | "variant">;

export type GenerationStatus = "completed" | "processing" | "failed" | "queued";

/** Thumbnail spec stored on history entries; studios render it however they like. */
export interface ThumbSpec {
  colors: [string, string];
  variant: number;
  /** Real generated image URL (API-backed tools). */
  imageUrl?: string;
}

/** A rich per-tool history entry. */
export interface ToolHistoryItem {
  id: string;
  toolId: string;
  prompt: string;
  style: string;
  color: string;
  ratio: string;
  /** ISO datetime. */
  createdAt: string;
  creditsUsed: number;
  status: GenerationStatus;
  favorite: boolean;
  thumb: ThumbSpec;
}

export interface PromptTemplate {
  id: string;
  toolId: string;
  label: string;
  prompt: string;
}

export interface UserCredits {
  balance: number;
  total: number;
  plan: string;
  resetsOn: string;
}

/** Grouped callbacks for the history section. */
export interface HistoryHandlers {
  onDownload: (item: ToolHistoryItem) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenAgain: (item: ToolHistoryItem) => void;
}
