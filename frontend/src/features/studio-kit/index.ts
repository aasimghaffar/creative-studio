/** Public API of the shared studio kit. */
export type {
  BaseSettings,
  GeneratedItem,
  GenerationStatus,
  HistoryHandlers,
  PromptTemplate,
  SvgSource,
  ThumbSpec,
  ToolHistoryItem,
  UserCredits,
} from "./types";
export {
  ASPECT_RATIOS,
  DEFAULT_SWATCHES,
  QUALITY_LEVELS,
  RATIO_CLASSES,
  delay,
  formatDateTime,
  makeBatch,
  monogram,
  shade,
} from "./lib";
export { useStudio } from "./use-studio";

/* Layout */
export { Workbench } from "./components/workbench";
export { PromptForm } from "./components/prompt-form";
export { ResultsPanel } from "./components/results-panel";

/* Form building blocks */
export { PromptInput } from "./components/prompt-input";
export { ImageUpload } from "./components/image-upload";
export { StyleSelector } from "./components/style-selector";
export { SettingsPanel } from "./components/settings-panel";
export { GenerateButton } from "./components/generate-button";
export { CreditsIndicator } from "./components/credits-indicator";
export { ChipGroup, Field, FieldLabel, Stepper, SwatchRow, TogglePair } from "./components/fields";

/* Results & history */
export { ResultGallery } from "./components/result-gallery";
export { ImageCard, StudioTile } from "./components/image-card";
export { HistoryCard } from "./components/history-card";
export { EmptyState } from "./components/empty-state";
export { LoadingSkeleton } from "./components/loading-skeleton";
export { createToolApi, type ToolApi, type ToolGenerateResult } from "./tool-api";
export { useToolStudio } from "./use-tool-studio";
