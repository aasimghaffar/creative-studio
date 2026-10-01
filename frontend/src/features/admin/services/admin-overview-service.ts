import { apiRequest } from "@/lib/api-client";

/** Admin → Dashboard Overview: live database aggregates. */

export interface ApiOverviewStat {
  id: string;
  label: string;
  value: string;
  delta: string;
  up: boolean;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ApiRecentRow {
  id: string;
  primary: string;
  secondary: string;
  created_at: string;
  tone: "teal" | "brass" | "destructive" | null;
}

export interface ApiServiceRow {
  id: string;
  name: string;
  status: "operational" | "degraded" | "down";
  uptime: string;
  latency: string;
}

export interface AdminOverview {
  stats: ApiOverviewStat[];
  revenue_series: ChartPoint[];
  signup_series: ChartPoint[];
  tool_usage: ChartPoint[];
  storage: {
    total_bytes: number;
    images_bytes: number;
    videos_bytes: number;
    audio_bytes: number;
    documents_bytes: number;
    files_count: number;
  };
  services: ApiServiceRow[];
  recent: {
    registrations: ApiRecentRow[];
    activity: ApiRecentRow[];
    payments: ApiRecentRow[];
  };
}

export function fetchAdminOverview(): Promise<AdminOverview> {
  return apiRequest<AdminOverview>("/v1/admin/overview");
}
