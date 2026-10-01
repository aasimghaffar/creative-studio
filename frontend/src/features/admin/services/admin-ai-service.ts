import { apiRequest } from "@/lib/api-client";
import type { ToolConfig } from "@/mocks/admin";

/** Admin → AI Tools + Providers API. */

interface ApiTool {
  id: number;
  slug: string;
  name: string;
  category: string;
  enabled: boolean;
  status: string;
  credits_per_generation: number;
  prompt_limit: number;
  upload_support: boolean;
  max_upload_mb: number;
  allowed_types: string[];
  model: string;
  timeout_sec: number;
}

export interface ApiProviderState {
  id: number;
  slug: string;
  name: string;
  enabled: boolean;
  priority: 1 | 2 | 3;
  status: "untested" | "connected" | "failed";
  has_key: boolean;
  masked_key: string | null;
  model: string;
  timeout_sec: number;
  last_error: string | null;
  last_tested_at: string | null;
}

export interface ProviderPatch {
  api_key?: string;
  enabled?: boolean;
  priority?: 1 | 2 | 3;
  model?: string;
  timeout_sec?: number;
}

/** ToolConfig keyed by the numeric DB id (stored in dbId). */
export interface AdminToolConfig extends ToolConfig {
  dbId: number;
  slug: string;
}

function toToolConfig(row: ApiTool): AdminToolConfig {
  return {
    id: row.slug,
    dbId: row.id,
    slug: row.slug,
    name: row.name,
    enabled: row.enabled,
    creditsPerGeneration: row.credits_per_generation,
    promptLimit: row.prompt_limit,
    uploadSupport: row.upload_support,
    maxUploadMb: row.max_upload_mb,
    allowedTypes: row.allowed_types,
    model: row.model,
    timeoutSec: row.timeout_sec,
  };
}

export async function fetchAdminTools(): Promise<AdminToolConfig[]> {
  const data = await apiRequest<{ tools: ApiTool[] }>("/v1/admin/ai-tools");
  return data.tools.map(toToolConfig);
}

export async function updateAdminTool(tool: AdminToolConfig): Promise<AdminToolConfig> {
  const data = await apiRequest<ApiTool>(`/v1/admin/ai-tools/${tool.dbId}`, {
    method: "PUT",
    body: JSON.stringify({
      enabled: tool.enabled,
      credits_per_generation: tool.creditsPerGeneration,
      prompt_limit: tool.promptLimit,
      upload_support: tool.uploadSupport,
      max_upload_mb: tool.maxUploadMb,
      allowed_types: tool.allowedTypes,
      model: tool.model,
      timeout_sec: tool.timeoutSec,
    }),
  });
  return toToolConfig(data);
}

export async function toggleAdminTool(dbId: number, enabled: boolean): Promise<AdminToolConfig> {
  const data = await apiRequest<ApiTool>(`/v1/admin/ai-tools/${dbId}/toggle`, {
    method: "POST",
    body: JSON.stringify({ enabled }),
  });
  return toToolConfig(data);
}

export function fetchAdminProviders(): Promise<ApiProviderState[]> {
  return apiRequest<{ providers: ApiProviderState[] }>("/v1/admin/ai-providers").then(
    (d) => d.providers,
  );
}

export function saveAdminProvider(id: number, patch: ProviderPatch): Promise<ApiProviderState[]> {
  return apiRequest<{ providers: ApiProviderState[] }>(`/v1/admin/ai-providers/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  }).then((d) => d.providers);
}

export function testAdminProvider(
  id: number,
): Promise<{ ok: boolean; message: string; provider: ApiProviderState }> {
  return apiRequest<{ ok: boolean; message: string; provider: ApiProviderState }>(
    `/v1/admin/ai-providers/${id}/test`,
    { method: "POST", body: JSON.stringify({}) },
  );
}
