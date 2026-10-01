import type { PromptTemplate } from "@/features/studio-kit";

/** Reusable starting prompts, grouped per tool. */
export const mockPromptTemplates: Record<string, PromptTemplate[]> = {
  logo: [
    { id: "lt1", toolId: "logo", label: "Coffee roastery", prompt: "Ember & Oak coffee roasters — a warm flame-and-leaf seal, artisanal" },
    { id: "lt2", toolId: "logo", label: "Tech startup", prompt: "Lattice — a modular grid mark for a developer-tools startup, precise" },
    { id: "lt3", toolId: "logo", label: "Bakery", prompt: "Morning Crumb bakery — a friendly wheat-sprig wordmark, hand-drawn" },
  ],
  avatar: [
    { id: "at1", toolId: "avatar", label: "Team headshot", prompt: "Friendly engineer, short beard, navy sweater, soft office light" },
    { id: "at2", toolId: "avatar", label: "Gamer tag", prompt: "Neon-lit streamer with headphones, confident grin, purple rim light" },
    { id: "at3", toolId: "avatar", label: "Fantasy", prompt: "Elven archer portrait, silver hair, forest bokeh, painterly" },
  ],
  tattoo: [
    { id: "tt1", toolId: "tattoo", label: "Botanical", prompt: "Sprig of lavender with a tiny bee, single needle, delicate" },
    { id: "tt2", toolId: "tattoo", label: "Nautical", prompt: "Old school lighthouse in a storm, bold lines, banner reading 'STEADY'" },
    { id: "tt3", toolId: "tattoo", label: "Geometric", prompt: "Wolf head built from sacred-geometry lines, dotwork shading" },
  ],
};
