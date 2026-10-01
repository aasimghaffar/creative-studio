import { apiRequest } from "@/lib/api-client";
import { shade, type ToolHistoryItem } from "@/features/studio-kit";

/** Global History API — /api/v1/history (all tools, one contract). */

export interface HistoryQuery {
  tool?: string;
  range?: "24h" | "7d" | "30d";
  sort?: "newest" | "oldest";
  page?: number;
  perPage?: number;
}

interface ApiHistoryRow {
  id: number;
  generation_id: number;
  prompt: string;
  thumb: { image_url?: string; colors?: [string, string]; variant?: number };
  images?: { file_id: number; url: string; favorite?: boolean }[];
  credits_used: number;
  status: "queued" | "processing" | "completed" | "failed";
  is_favorite: boolean;
  created_at: string;
  tool_slug: string;
  tool_name: string;
  style: string | null;
  color: string | null;
  ratio: string | null;
}

export interface ApiGenerateLike {
  generation_id: number;
  history_id: number;
  prompt: string;
  style: string;
  color: string;
  ratio: string;
  credits_used: number;
  credits_balance: number;
  tool: string;
  images: { file_id: number; url: string }[];
}

export function toHistoryItem(row: ApiHistoryRow): ToolHistoryItem {
  const color = row.color ?? "#B8823C";
  return {
    id: String(row.id),
    toolId: row.tool_slug,
    prompt: row.prompt,
    style: row.style ?? "",
    color,
    ratio: row.ratio ?? "1:1",
    createdAt: row.created_at.replace(" ", "T"),
    creditsUsed: row.credits_used,
    status: row.status,
    favorite: row.is_favorite,
    thumb: {
      colors: row.thumb.colors ?? [color, shade(color, 0.55)],
      variant: row.thumb.variant ?? 0,
      imageUrl: row.thumb.image_url,
    },
  };
}

export async function fetchGlobalHistory(query: HistoryQuery = {}): Promise<ToolHistoryItem[]> {
  const params = new URLSearchParams();
  if (query.tool) params.set("tool", query.tool);
  if (query.range) params.set("range", query.range);
  if (query.sort) params.set("sort", query.sort);
  if (query.page) params.set("page", String(query.page));
  if (query.perPage) params.set("per_page", String(query.perPage));
  const qs = params.toString();

  const data = await apiRequest<{ history: ApiHistoryRow[] }>(`/v1/history${qs ? `?${qs}` : ""}`);
  return data.history.flatMap((row) => {
    const images = row.images?.length ? row.images : undefined;
    if (!images) return [toHistoryItem(row)];
    return images.map((img, i) => ({
      ...toHistoryItem(row),
      id: `${row.id}-${img.file_id}`,
      favorite: img.favorite ?? false,
      thumb: { ...toHistoryItem(row).thumb, imageUrl: img.url, variant: i },
    }));
  });
}

export function setHistoryFavorite(id: number, favorite: boolean, fileId?: number): Promise<unknown> {
  return apiRequest(`/v1/history/${id}/favorite`, {
    method: "POST",
    body: JSON.stringify({ favorite, file_id: fileId }),
  });
}

export function deleteHistoryEntry(id: number): Promise<unknown> {
  return apiRequest(`/v1/history/${id}`, { method: "DELETE" });
}

/** Server-side regenerate — works for any tool's entry. */
export async function regenerateHistoryEntry(id: number): Promise<ToolHistoryItem> {
  const res = await apiRequest<ApiGenerateLike>(`/v1/history/${id}/regenerate`, { method: "POST" });
  return toHistoryItem({
    id: res.history_id,
    generation_id: res.generation_id,
    prompt: res.prompt,
    thumb: { image_url: res.images[0]?.url, variant: 0 },
    credits_used: res.credits_used,
    status: "completed",
    is_favorite: false,
    created_at: new Date().toISOString(),
    tool_slug: res.tool,
    tool_name: res.tool,
    style: res.style,
    color: res.color,
    ratio: res.ratio,
  });
}
