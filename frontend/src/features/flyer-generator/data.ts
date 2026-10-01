import type { FlyerGeneratorSettings } from "./types";

export const FLYER_STYLES = ["Modern", "Bold", "Elegant", "Retro", "Minimal", "Playful"];

export const defaultSettings: FlyerGeneratorSettings = {
  prompt: "",
  negativePrompt: "",
  style: "Modern",
  color: "#B8823C",
  ratio: "1:1",
  quantity: 1,
  quality: "Standard",
};
