import { apiRequest } from "@/lib/api-client";
import type { FileItem } from "@/mocks";
import type { StorageUsage } from "@/mocks";

/** My Files API — /api/v1/files, reading the rows the AI tools write. */

interface ApiFile {
  id: number;
  generation_id: number | null;
  name: string;
  ext: string;
  mime_type: string;
  type: FileItem["type"];
  size_bytes: number;
  url: string;
  download_count: number;
  created_at: string;
}

interface ApiStorage {
  used_gb: number;
  limit_gb: number;
  breakdown: { images: number; videos: number; audio: number; documents: number };
}

const TYPE_COLORS: Record<FileItem["type"], [string, string]> = {
  image: ["#B8823C", "#523a1b"],
  video: ["#3a3326", "#12232b"],
  audio: ["#2a4a46", "#153029"],
  document: ["#5B584E", "#292723"],
};

function toFileItem(row: ApiFile): FileItem {
  return {
    id: String(row.id),
    name: row.name,
    type: row.type,
    ext: row.ext,
    sizeMb: row.size_bytes / (1024 * 1024),
    createdAt: row.created_at.replace(" ", "T"),
    colors: TYPE_COLORS[row.type],
    url: row.url,
  };
}

function toStorage(api: ApiStorage): StorageUsage {
  return {
    usedGb: api.used_gb,
    totalGb: api.limit_gb,
    breakdown: [
      { label: "Images", sizeGb: api.breakdown.images, colorClass: "bg-brass" },
      { label: "Video", sizeGb: api.breakdown.videos, colorClass: "bg-teal" },
      { label: "Audio", sizeGb: api.breakdown.audio, colorClass: "bg-mist" },
      { label: "Documents", sizeGb: api.breakdown.documents, colorClass: "bg-brass-deep" },
    ],
  };
}

export async function fetchFiles(options: { type?: string; search?: string } = {}): Promise<{
  files: FileItem[];
  storage: StorageUsage;
}> {
  const params = new URLSearchParams();
  if (options.type) params.set("type", options.type);
  if (options.search) params.set("search", options.search);
  const qs = params.toString();

  const data = await apiRequest<{ files: ApiFile[]; storage: ApiStorage }>(
    `/v1/files${qs ? `?${qs}` : ""}`,
  );

  return { files: data.files.map(toFileItem), storage: toStorage(data.storage) };
}

export function renameFile(id: number, name: string): Promise<unknown> {
  return apiRequest(`/v1/files/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
}

export function deleteFile(id: number): Promise<unknown> {
  return apiRequest(`/v1/files/${id}`, { method: "DELETE" });
}

export function requestDownload(id: number): Promise<{ url: string; filename: string }> {
  return apiRequest<{ url: string; filename: string }>(`/v1/files/${id}/download`, { method: "POST" });
}
