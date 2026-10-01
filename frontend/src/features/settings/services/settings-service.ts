import { apiRequest } from "@/lib/api-client";

/** Settings module API — /api/v1/settings endpoints, one call per tab. */

export interface ApiSettings {
  theme: "light" | "dark" | "system";
  timezone: string;
  default_image_size: string;
  default_style: string;
  auto_save_history: boolean;
  email_generation: boolean;
  email_billing: boolean;
  email_product: boolean;
  push_enabled: boolean;
  two_factor_enabled: boolean;
}

export interface ApiSession {
  id: number;
  device: string;
  ip_address: string | null;
  location: string | null;
  last_active: string;
  created_at: string;
  current: boolean;
}

export interface ApiStorage {
  used_gb: number;
  limit_gb: number;
  breakdown: { images: number; videos: number; audio: number; documents: number };
  rules: { upload_limit_mb: number; allowed_types: string[] };
}

export function fetchSettings(): Promise<ApiSettings> {
  return apiRequest<ApiSettings>("/v1/settings");
}

export function saveGeneral(patch: Partial<Pick<ApiSettings, "theme" | "timezone">>): Promise<null> {
  return apiRequest<null>("/v1/settings/general", { method: "PUT", body: JSON.stringify(patch) });
}

export function saveGeneration(
  patch: Partial<Pick<ApiSettings, "default_image_size" | "default_style" | "auto_save_history">>,
): Promise<null> {
  return apiRequest<null>("/v1/settings/generation", { method: "PUT", body: JSON.stringify(patch) });
}

export function saveNotifications(
  patch: Partial<Pick<ApiSettings, "email_generation" | "email_billing" | "email_product" | "push_enabled">>,
): Promise<null> {
  return apiRequest<null>("/v1/settings/notifications", { method: "PUT", body: JSON.stringify(patch) });
}

export function saveTwoFactor(enabled: boolean): Promise<{ enabled: boolean }> {
  return apiRequest<{ enabled: boolean }>("/v1/settings/two-factor", {
    method: "PUT",
    body: JSON.stringify({ enabled }),
  });
}

export function changePassword(currentPassword: string, newPassword: string): Promise<null> {
  return apiRequest<null>("/v1/settings/password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export function fetchSessions(): Promise<ApiSession[]> {
  return apiRequest<{ sessions: ApiSession[] }>("/v1/settings/sessions").then((d) => d.sessions);
}

export function revokeSession(id: number): Promise<null> {
  return apiRequest<null>(`/v1/settings/sessions/${id}`, { method: "DELETE" });
}

export function fetchStorage(): Promise<ApiStorage> {
  return apiRequest<ApiStorage>("/v1/settings/storage");
}

export function deleteAccount(): Promise<null> {
  return apiRequest<null>("/v1/account", { method: "DELETE" });
}
