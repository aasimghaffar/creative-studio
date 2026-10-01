import { apiRequest } from "@/lib/api-client";

/** Admin → Reports API (read-only aggregates). */

export interface AiUsageReport {
  totals: { today: number; week: number; lifetime: number };
  by_tool: { tool: string; slug: string; generations: number; images: number }[];
}

export interface CreditUsageReport {
  totals: { today: number; week: number; month: number; lifetime: number };
  by_tool: { tool: string; credits: number }[];
  weekly_series: { label: string; value: number }[];
}

export function fetchAiUsage(): Promise<AiUsageReport> {
  return apiRequest<AiUsageReport>("/v1/admin/reports/ai-usage");
}

export function fetchCreditUsage(): Promise<CreditUsageReport> {
  return apiRequest<CreditUsageReport>("/v1/admin/reports/credit-usage");
}
