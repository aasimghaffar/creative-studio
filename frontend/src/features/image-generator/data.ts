import type { ImageGeneratorSettings } from "./types";

export const IMAGE_STYLES = ["Photorealistic", "Illustration", "3D Render", "Watercolor", "Anime", "Pixel Art"];

export const defaultSettings: ImageGeneratorSettings = {
  prompt: "",
  negativePrompt: "",
  style: "Photorealistic",
  color: "#B8823C",
  ratio: "1:1",
  quantity: 1,
  quality: "Standard",
};
