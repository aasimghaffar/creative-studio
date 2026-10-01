import { DEFAULT_SWATCHES } from "@/features/studio-kit";
import type { AvatarSettings } from "./types";

export const AVATAR_STYLES = ["Realistic", "Illustrated", "Anime", "Pixel", "3D", "Watercolor"];
export const EXPRESSIONS = ["Neutral", "Soft smile", "Confident", "Playful"];
export const FRAMINGS: [string, string] = ["Headshot", "Bust"];

export const defaultSettings: AvatarSettings = {
  prompt: "",
  negativePrompt: "",
  style: "Illustrated",
  color: DEFAULT_SWATCHES[1] ?? "#4C9186",
  ratio: "1:1",
  quantity: 1,
  seed: "",
  quality: "Standard",
  framing: "Headshot",
  expression: "Neutral",
  referenceImage: null,
};
