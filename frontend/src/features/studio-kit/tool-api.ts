import { apiRequest } from "@/lib/api-client";
import { shade } from "./lib";
import type { GeneratedItem, ToolHistoryItem } from "./types";

/**
 * Generic API client for any AI tool — the Logo Generator's service,
 * parameterized by slug. Avatar, Tattoo, and every future tool reuse
 * this instead of duplicating the request/mapping code.
 */

interface ApiImage {
  file_id: number;
  url: string;
}

export interface ToolGenerateResult {
  items: GeneratedItem[];
  creditsBalance: number;
  historyEntry: ToolHistoryItem;
}

interface ApiGenerateResponse {
  generation_id: number;
  history_id: number;
  prompt: string;
  style: string;
  color: string | null;
  ratio: string;
  credits_used: number;
  credits_balance: number;
  images: ApiImage[];
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
  style: string | null;
  color: string | null;
  ratio: string | null;
  options?: Record<string, string>;
}

export interface ToolConfig {
  creditsPerGeneration: number;
  balance: number;
  promptLimit: number;
  uploadSupport: boolean;
}

export interface ToolApi {
  fetchConfig(): Promise<ToolConfig>;
  fetchHistory(): Promise<ToolHistoryItem[]>;
  generate(payload: Record<string, unknown>): Promise<ToolGenerateResult>;
  regenerate(historyId: number): Promise<ToolGenerateResult>;
  setFavorite(historyId: number, favorite: boolean, fileId?: number): Promise<void>;
  remove(historyId: number): Promise<void>;
}

export function createToolApi(slug: string, tag: string): ToolApi {
  const base = `/v1/ai/${slug}`;

  const toItems = (res: ApiGenerateResponse): GeneratedItem[] =>
    res.images.map((image, i) => ({
      id: `gen-${res.generation_id}-${image.file_id}`,
      prompt: res.prompt,
      style: res.style,
      ratio: res.ratio,
      colors: [res.color ?? "#B8823C", shade(res.color, 0.55)] as [string, string],
      tag,
      createdAt: Date.now(),
      favorite: false,
      variant: i,
      imageUrl: image.url,
      historyId: res.history_id,
    }));

  // One visible entry PER GENERATED IMAGE: a 3-draft run yields three
  // history entries (same generation — Open Again / favorite / delete act
  // on the run). Falls back to the stored thumb for legacy rows.
  const toHistoryItems = (row: ApiHistoryRow): ToolHistoryItem[] => {
    const images = row.images?.length ? row.images : undefined;
    if (!images) return [toHistoryItem(row)];
    return images.map((img, i) => ({
      ...toHistoryItem(row),
      id: `${row.id}-${img.file_id}`,
      favorite: img.favorite ?? false,
      thumb: { ...toHistoryItem(row).thumb, imageUrl: img.url, variant: i },
    }));
  };

  const toHistoryItem = (row: ApiHistoryRow): ToolHistoryItem => {
    const color = row.color ?? "#B8823C";
    return {
      id: String(row.id),
      toolId: slug,
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
  };

  const toResult = (res: ApiGenerateResponse): ToolGenerateResult => ({
    items: toItems(res),
    creditsBalance: res.credits_balance,
    historyEntry: toHistoryItem({
      id: res.history_id,
      generation_id: res.generation_id,
      prompt: res.prompt,
      thumb: { image_url: res.images[0]?.url, colors: [res.color ?? "#B8823C", shade(res.color, 0.55)], variant: 0 },
      credits_used: res.credits_used,
      status: "completed",
      is_favorite: false,
      created_at: new Date().toISOString(),
      style: res.style,
      color: res.color,
      ratio: res.ratio,
    }),
  });

  return {
    async fetchConfig() {
      const data = await apiRequest<{
        tool: { credits_per_generation: number; prompt_limit: number; upload_support: boolean };
        credits_balance: number;
      }>(`${base}/config`);
      return {
        creditsPerGeneration: data.tool.credits_per_generation,
        balance: data.credits_balance,
        promptLimit: data.tool.prompt_limit || 1200,
        uploadSupport: data.tool.upload_support,
      };
    },
    async fetchHistory() {
      const data = await apiRequest<{ history: ApiHistoryRow[] }>(`${base}/history`);
      return data.history.flatMap(toHistoryItems);
    },
    async generate(payload) {
      return toResult(
        await apiRequest<ApiGenerateResponse>(`${base}/generate`, {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      );
    },
    async regenerate(historyId) {
      return toResult(
        await apiRequest<ApiGenerateResponse>(`${base}/regenerate`, {
          method: "POST",
          body: JSON.stringify({ id: historyId }),
        }),
      );
    },
    async setFavorite(historyId, favorite, fileId) {
      await apiRequest(`${base}/favorite`, {
        method: "POST",
        body: JSON.stringify({ id: historyId, favorite, file_id: fileId }),
      });
    },
    async remove(historyId) {
      await apiRequest(`${base}/${historyId}`, { method: "DELETE" });
    },
  };
}
