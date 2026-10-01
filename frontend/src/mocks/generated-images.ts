import { makeBatch } from "@/features/studio-kit/lib";
import type { GeneratedItem } from "@/features/studio-kit/types";

/** Seed batches shown on each studio's canvas before the first generation. */
export const mockGeneratedImages: Record<string, GeneratedItem[]> = {
  logo: makeBatch(
    {
      prompt: "Nimbus & Co. — a calm cloud mark for a homeware brand",
      negativePrompt: "",
      style: "Minimal",
      color: "#B8823C",
      ratio: "1:1",
      quantity: 4,
      seed: "",
      quality: "Standard",
    },
    "DRAFT",
  ).map((item, i) => ({ ...item, favorite: i === 1 })),

  avatar: makeBatch(
    {
      prompt: "Curly-haired product designer, round glasses, warm studio light",
      negativePrompt: "",
      style: "Illustrated",
      color: "#4C9186",
      ratio: "1:1",
      quantity: 4,
      seed: "",
      quality: "Standard",
    },
    "FACE",
  ).map((item, i) => ({ ...item, favorite: i === 0 })),

  tattoo: makeBatch(
    {
      prompt: "Crescent moon wrapped in wildflowers, single needle, delicate",
      negativePrompt: "",
      style: "Fine-line",
      color: "#1B1B18",
      ratio: "1:1",
      quantity: 4,
      seed: "",
      quality: "Standard",
    },
    "INK",
  ).map((item, i) => ({ ...item, favorite: i === 2 })),
};
