import type { LogoSettings } from "./types";

export const LOGO_STYLES = ["Minimal", "Bold", "Classic", "Playful", "3D", "Sketch"];

export const defaultSettings: LogoSettings = {
  prompt: "",
  negativePrompt: "",
  template: null,
  style: "Minimal",
  colors: [],
  ratio: "1:1",
  quantity: 1,
  quality: "Standard",
  transparent: false,
};
