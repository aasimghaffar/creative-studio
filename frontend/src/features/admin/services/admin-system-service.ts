import { apiRequest, downloadFile } from "@/lib/api-client";

/** Admin → System API: File Manager + Storage Provider. */

export interface ApiAdminFile {
  id: number;
  name: string;
  ext: string;
  type: string;
  size_bytes: number;
  url: string;
  download_count: number;
  generation_id: number | null;
  user: string;
  user_email: string | null;
  tool: string;
  tool_slug: string | null;
  created_at: string;
  updated_at: string;
}

export interface StorageStats {
  total_bytes: number;
  by_tool: { label: string; bytes: number }[];
  by_user: { label: string; bytes: number }[];
}

export function fetchAdminFiles(options: {
  search?: string;
  tool?: string;
  type?: string;
  page?: number;
} = {}): Promise<{ files: ApiAdminFile[]; stats: StorageStats; total: number; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.tool) params.set("tool", options.tool);
  if (options.type) params.set("type", options.type);
  if (options.page) params.set("page", String(options.page));
  const qs = params.toString();

  return apiRequest<{
    files: ApiAdminFile[];
    stats: StorageStats;
    pagination: { total: number; has_more: boolean };
  }>(`/v1/admin/files${qs ? `?${qs}` : ""}`).then((d) => ({
    files: d.files,
    stats: d.stats,
    total: d.pagination.total,
    hasMore: d.pagination.has_more,
  }));
}

export function deleteAdminFile(id: number): Promise<unknown> {
  return apiRequest(`/v1/admin/files/${id}`, { method: "DELETE" });
}

export async function downloadAdminFileById(id: number): Promise<void> {
  const { url, filename } = await apiRequest<{ url: string; filename: string }>(
    `/v1/admin/files/${id}/download`,
    { method: "POST" },
  );
  await downloadFile(url, filename);
}

/* ---------------- Storage providers ---------------- */

export interface ApiStorageProvider {
  id: number;
  slug: "local" | "s3" | "gcs";
  name: string;
  enabled: boolean;
  status: "untested" | "connected" | "failed";
  last_error: string | null;
  last_tested_at: string | null;
  fields_set: Record<string, boolean>;
}

export interface StorageRules {
  max_upload_size_mb: number;
  allowed_file_types: string[];
  max_storage_per_user_gb: number;
  max_files_per_user: number;
}

export function fetchStorageProviders(): Promise<{
  providers: ApiStorageProvider[];
  rules: StorageRules;
}> {
  return apiRequest<{ providers: ApiStorageProvider[]; rules: StorageRules }>(
    "/v1/admin/storage-providers",
  );
}

export function saveStorageProvider(
  id: number,
  payload: { credentials?: Record<string, string>; enable?: boolean },
): Promise<ApiStorageProvider[]> {
  return apiRequest<{ providers: ApiStorageProvider[] }>(`/v1/admin/storage-providers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }).then((d) => d.providers);
}

export function testStorageProvider(
  id: number,
): Promise<{ ok: boolean; message: string; provider: ApiStorageProvider }> {
  return apiRequest<{ ok: boolean; message: string; provider: ApiStorageProvider }>(
    `/v1/admin/storage-providers/${id}/test`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export function saveStorageRules(rules: StorageRules): Promise<StorageRules> {
  return apiRequest<StorageRules>("/v1/admin/storage-settings", {
    method: "PUT",
    body: JSON.stringify(rules),
  });
}
