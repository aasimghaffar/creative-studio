import { apiRequest } from "@/lib/api-client";
import { shade, type ToolHistoryItem } from "@/features/studio-kit";
import type { FavoritePrompt } from "@/mocks";

/** Favorites API — /api/v1/favorites (images + prompts). */

interface ApiFavoriteImage {
  favorite_id: number;
  favorited_at: string;
  history_id: number;
  prompt: string;
  thumb: { image_url?: string; colors?: [string, string]; variant?: number };
  credits_used: number;
  status: "queued" | "processing" | "completed" | "failed";
  created_at: string;
  tool_slug: string;
  tool_name: string;
  style: string | null;
  color: string | null;
  ratio: string | null;
}

interface ApiFavoritePrompt {
  favorite_id: number;
  prompt_text: string;
  favorited_at: string;
  tool_slug: string | null;
  tool_name: string | null;
}

/** ToolHistoryItem keyed by favorite id — the page's existing shape. */
export interface FavoriteImageItem extends ToolHistoryItem {
  favoriteId: number;
  historyId: number;
}

function toImageItem(row: ApiFavoriteImage): FavoriteImageItem {
  const color = row.color ?? "#B8823C";
  return {
    id: String(row.favorite_id),
    favoriteId: row.favorite_id,
    historyId: row.history_id,
    toolId: row.tool_slug,
    prompt: row.prompt,
    style: row.style ?? "",
    color,
    ratio: row.ratio ?? "1:1",
    createdAt: row.created_at.replace(" ", "T"),
    creditsUsed: row.credits_used,
    status: row.status,
    favorite: true,
    thumb: {
      colors: row.thumb.colors ?? [color, shade(color, 0.55)],
      variant: row.thumb.variant ?? 0,
      imageUrl: row.thumb.image_url,
    },
  };
}

function toPromptItem(row: ApiFavoritePrompt): FavoritePrompt {
  return {
    id: String(row.favorite_id),
    toolId: row.tool_slug ?? "logo",
    prompt: row.prompt_text,
    savedAt: row.favorited_at.replace(" ", "T"),
  };
}

export async function fetchFavorites(): Promise<{
  images: FavoriteImageItem[];
  prompts: FavoritePrompt[];
}> {
  const data = await apiRequest<{
    images: ApiFavoriteImage[];
    prompts: ApiFavoritePrompt[];
  }>("/v1/favorites");

  return {
    images: (data.images ?? []).map(toImageItem),
    prompts: (data.prompts ?? []).map(toPromptItem),
  };
}

export function removeFavorite(favoriteId: number): Promise<unknown> {
  return apiRequest(`/v1/favorites/${favoriteId}`, { method: "DELETE" });
}
