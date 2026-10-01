import { apiRequest } from "@/lib/api-client";
import type { AdminUser } from "@/mocks/admin";

/** Admin → User Management API — /api/v1/admin/users. */

interface ApiAdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  plan: string;
  status: "active" | "suspended" | "trial";
  credits: number;
  credits_used: number;
  generations: number;
  storage_gb: number;
  country: string | null;
  joined_at: string;
  last_active: string;
}

export interface AdminUserDetail extends AdminUser {
  role: string;
  creditsBalance: number;
  topTool: string | null;
  avgBatchSize: number;
}

function toAdminUser(row: ApiAdminUser): AdminUser {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    plan: (["Sketch", "Studio", "Agency"].includes(row.plan) ? row.plan : "Sketch") as AdminUser["plan"],
    status: row.status,
    creditsUsed: row.credits_used,
    generations: row.generations,
    storageGb: row.storage_gb,
    country: row.country ?? "—",
    joinedAt: row.joined_at.replace(" ", "T"),
    lastActive: row.last_active.replace(" ", "T"),
  };
}

function toDetail(row: ApiAdminUser & { top_tool: string | null; avg_batch_size: number }): AdminUserDetail {
  return {
    ...toAdminUser(row),
    role: row.role,
    creditsBalance: row.credits,
    topTool: row.top_tool,
    avgBatchSize: row.avg_batch_size,
  };
}

export async function fetchAdminUsers(options: {
  search?: string;
  status?: string;
  plan?: string;
} = {}): Promise<{ users: AdminUser[]; total: number }> {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.status) params.set("status", options.status);
  if (options.plan) params.set("plan", options.plan);
  const qs = params.toString();

  const data = await apiRequest<{
    users: ApiAdminUser[];
    pagination: { total: number };
  }>(`/v1/admin/users${qs ? `?${qs}` : ""}`);

  return { users: data.users.map(toAdminUser), total: data.pagination.total };
}

export async function fetchAdminUser(id: string): Promise<AdminUserDetail> {
  const data = await apiRequest<ApiAdminUser & { top_tool: string | null; avg_batch_size: number }>(
    `/v1/admin/users/${id}`,
  );
  return toDetail(data);
}

export async function setUserSuspended(id: string, suspend: boolean): Promise<AdminUserDetail> {
  const data = await apiRequest<ApiAdminUser & { top_tool: string | null; avg_batch_size: number }>(
    `/v1/admin/users/${id}/suspend`,
    { method: "POST", body: JSON.stringify({ suspend }) },
  );
  return toDetail(data);
}

export function grantUserCredits(id: string, amount: number, note: string): Promise<{ balance: number }> {
  return apiRequest<{ balance: number }>(`/v1/admin/users/${id}/credits`, {
    method: "POST",
    body: JSON.stringify({ amount, note }),
  });
}

export function sendUserPasswordReset(id: string): Promise<null> {
  return apiRequest<null>(`/v1/admin/users/${id}/reset-password`, { method: "POST" });
}
