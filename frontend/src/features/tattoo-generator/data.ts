import type { TattooSettings } from "./types";

export const TATTOO_STYLES = ["Fine-line", "Old School", "Blackwork", "Geometric", "Tribal", "Watercolor"];
export const PLACEMENTS = ["Forearm", "Shoulder", "Back", "Wrist", "Ankle", "Chest"];
export const LINE_WEIGHTS = ["Fine", "Medium", "Bold"];

/** Ink palette — black plus the studio's muted tones. */
export const INK_COLORS = ["#1B1B18", "#3A5A54", "#8C6329", "#4C9186", "#5B584E", "#B04A35"];

export const defaultSettings: TattooSettings = {
  prompt: "",
  negativePrompt: "",
  style: "Fine-line",
  color: INK_COLORS[0] ?? "#1B1B18",
  ratio: "1:1",
  quantity: 1,
  seed: "",
  quality: "Standard",
  placement: "Forearm",
  lineWeight: "Fine",
};
