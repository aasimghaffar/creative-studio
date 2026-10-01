import type { ToolHistoryItem } from "@/features/studio-kit/types";

/** Favorited generations (image side). */
export const mockFavoriteImages: ToolHistoryItem[] = [
  {
    id: "fi1",
    toolId: "logo",
    prompt: "Nimbus & Co. — a calm cloud mark for a homeware brand",
    style: "Minimal",
    color: "#B8823C",
    ratio: "1:1",
    createdAt: "2026-07-09T11:24:00",
    creditsUsed: 8,
    status: "completed",
    favorite: true,
    thumb: { colors: ["#B8823C", "#523a1b"], variant: 0 },
  },
  {
    id: "fi2",
    toolId: "avatar",
    prompt: "Curly-haired product designer, round glasses, warm studio light",
    style: "Illustrated",
    color: "#4C9186",
    ratio: "1:1",
    createdAt: "2026-07-09T10:48:00",
    creditsUsed: 8,
    status: "completed",
    favorite: true,
    thumb: { colors: ["#4C9186", "#22413c"], variant: 0 },
  },
  {
    id: "fi3",
    toolId: "tattoo",
    prompt: "Crescent moon wrapped in wildflowers, single needle, delicate",
    style: "Fine-line",
    color: "#1B1B18",
    ratio: "1:1",
    createdAt: "2026-07-09T12:05:00",
    creditsUsed: 8,
    status: "completed",
    favorite: true,
    thumb: { colors: ["#1B1B18", "#0c0c0b"], variant: 0 },
  },
  {
    id: "fi4",
    toolId: "logo",
    prompt: "Featherlight running club, fast wing monogram",
    style: "Bold",
    color: "#4C9186",
    ratio: "16:9",
    createdAt: "2026-07-08T17:41:00",
    creditsUsed: 4,
    status: "completed",
    favorite: true,
    thumb: { colors: ["#4C9186", "#22413c"], variant: 2 },
  },
];

export interface FavoritePrompt {
  id: string;
  toolId: string;
  prompt: string;
  savedAt: string;
}

/** Favorited prompts (text side). */
export const mockFavoritePrompts: FavoritePrompt[] = [
  { id: "fp1", toolId: "logo", prompt: "Lattice — a modular grid mark for a developer-tools startup, precise", savedAt: "2026-07-08T12:00:00" },
  { id: "fp2", toolId: "tattoo", prompt: "Sprig of lavender with a tiny bee, single needle, delicate", savedAt: "2026-07-07T15:30:00" },
  { id: "fp3", toolId: "avatar", prompt: "Elven archer portrait, silver hair, forest bokeh, painterly", savedAt: "2026-07-06T09:10:00" },
];
