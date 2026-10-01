import type { BaseSettings } from "@/features/studio-kit";

/** Tattoo studio settings — base fields plus ink-specific controls. */
export interface TattooSettings extends BaseSettings {
  placement: string;
  lineWeight: string;
}
