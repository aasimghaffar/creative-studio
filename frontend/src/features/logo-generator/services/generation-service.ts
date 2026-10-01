import { apiRequest } from "@/lib/api-client";
import { shade, type GeneratedItem, type ToolHistoryItem } from "@/features/studio-kit";
import type { LogoSettings } from "../types";

/**
 * Real API service for the Logo Generator — talks to the PHP backend's
 * /api/v1/ai/logo endpoints. This file is the swap point that used to
 * host the mock; the mock is gone.
 */

interface ApiImage {
  file_id: number;
  url: string;
}

export interface GenerateResult {
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
}

function toItems(res: ApiGenerateResponse): GeneratedItem[] {
  const baseColor = res.color ?? "#B8823C";
  return res.images.map((image, i) => ({
    id: `gen-${res.generation_id}-${image.file_id}`,
    prompt: res.prompt,
    style: res.style,
    ratio: res.ratio,
    colors: [baseColor, shade(baseColor, 0.55)] as [string, string],
    tag: "LOGO",
    createdAt: Date.now(),
    favorite: false,
    variant: i,
    imageUrl: image.url,
    historyId: res.history_id,
  }));
}

function toHistoryItem(row: ApiHistoryRow): ToolHistoryItem {
  const color = row.color ?? "#B8823C";
  return {
    id: String(row.id),
    toolId: "logo",
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

export async function generateLogos(settings: LogoSettings): Promise<GenerateResult> {
  const res = await apiRequest<ApiGenerateResponse>("/v1/ai/logo/generate", {
    method: "POST",
    // Raw selections only — the backend builds the final AI prompt.
    body: JSON.stringify({
      prompt: settings.prompt,
      negative_prompt: settings.negativePrompt,
      template: settings.template ?? "",
      style: settings.style,
      colors: settings.colors,
      ratio: settings.ratio,
      quantity: settings.quantity,
      quality: settings.quality,
      transparent: settings.transparent,
    }),
  });

  return {
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
  };
}

export async function fetchLogoConfig(): Promise<{
  creditsPerGeneration: number;
  balance: number;
  promptLimit: number;
  uploadSupport: boolean;
}> {
  const data = await apiRequest<{
    tool: {
      credits_per_generation: number;
      prompt_limit: number;
      upload_support: boolean;
    };
    credits_balance: number;
  }>("/v1/ai/logo/config");

  return {
    creditsPerGeneration: data.tool.credits_per_generation,
    balance: data.credits_balance,
    promptLimit: data.tool.prompt_limit || 1200,
    uploadSupport: data.tool.upload_support,
  };
}

export async function fetchLogoHistory(): Promise<ToolHistoryItem[]> {
  const data = await apiRequest<{ history: ApiHistoryRow[] }>("/v1/ai/logo/history");
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

export async function setLogoFavorite(historyId: number, favorite: boolean, fileId?: number): Promise<void> {
  await apiRequest("/v1/ai/logo/favorite", {
    method: "POST",
    body: JSON.stringify({ id: historyId, favorite, file_id: fileId }),
  });
}

export async function deleteLogoGeneration(historyId: number): Promise<void> {
  await apiRequest(`/v1/ai/logo/${historyId}`, { method: "DELETE" });
}

export async function regenerateLogo(historyId: number): Promise<GenerateResult> {
  const res = await apiRequest<ApiGenerateResponse>("/v1/ai/logo/regenerate", {
    method: "POST",
    body: JSON.stringify({ id: historyId }),
  });

  return {
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
  };
}
