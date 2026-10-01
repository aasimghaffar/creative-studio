import type { BaseSettings } from "@/features/studio-kit";

/** Avatar studio settings — base fields plus portrait-specific controls. */
export interface AvatarSettings extends BaseSettings {
  framing: string; // Headshot | Bust
  expression: string;
  /** Optional reference photo (mock — not sent anywhere yet). */
  referenceImage: File | null;
}
