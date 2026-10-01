import { apiRequest, downloadFile } from "@/lib/api-client";

/** Admin → Subscription Plans + Payments API. */

export interface ApiAdminPlan {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  monthly_price: number | string | null;
  yearly_price: number | string | null;
  credits_per_cycle: number | null;
  seats: number;
  storage_gb: number | null;
  max_generations: number | null;
  allowed_tools: string[];
  features: string[];
  badge: string;
  is_active: boolean;
  sort_order: number;
  subscriptions: number;
}

export interface PlanDraft {
  name: string;
  tagline: string;
  monthly_price: string;
  yearly_price: string;
  credits_per_cycle: string;
  storage_gb: string;
  max_generations: string;
  seats: number;
  sort_order: number;
  badge: string;
  allowed_tools: string[];
  features: string;
  is_active: boolean;
}

export function toDraft(plan: ApiAdminPlan | null): PlanDraft {
  return {
    name: plan?.name ?? "",
    tagline: plan?.tagline ?? "",
    monthly_price: plan?.monthly_price != null ? String(plan.monthly_price) : "",
    yearly_price: plan?.yearly_price != null ? String(plan.yearly_price) : "",
    credits_per_cycle: plan?.credits_per_cycle != null ? String(plan.credits_per_cycle) : "",
    storage_gb: plan?.storage_gb != null ? String(plan.storage_gb) : "",
    max_generations: plan?.max_generations != null ? String(plan.max_generations) : "",
    seats: plan?.seats ?? 1,
    sort_order: plan?.sort_order ?? 0,
    badge: plan?.badge ?? "",
    allowed_tools: plan?.allowed_tools ?? [],
    features: (plan?.features ?? []).join("\n"),
    is_active: plan?.is_active ?? true,
  };
}

function draftToPayload(draft: PlanDraft): Record<string, unknown> {
  return {
    name: draft.name,
    tagline: draft.tagline,
    monthly_price: draft.monthly_price === "" ? null : Number(draft.monthly_price),
    yearly_price: draft.yearly_price === "" ? null : Number(draft.yearly_price),
    credits_per_cycle: draft.credits_per_cycle === "" ? null : Number(draft.credits_per_cycle),
    storage_gb: draft.storage_gb === "" ? null : Number(draft.storage_gb),
    max_generations: draft.max_generations === "" ? null : Number(draft.max_generations),
    seats: draft.seats,
    sort_order: draft.sort_order,
    badge: draft.badge,
    allowed_tools: draft.allowed_tools,
    features: draft.features.split("\n").map((f) => f.trim()).filter(Boolean),
    is_active: draft.is_active,
  };
}

export function fetchAdminPlans(): Promise<ApiAdminPlan[]> {
  return apiRequest<{ plans: ApiAdminPlan[] }>("/v1/admin/plans").then((d) => d.plans);
}

export function createAdminPlan(draft: PlanDraft): Promise<ApiAdminPlan> {
  return apiRequest<ApiAdminPlan>("/v1/admin/plans", {
    method: "POST",
    body: JSON.stringify(draftToPayload(draft)),
  });
}

export function updateAdminPlan(id: number, draft: PlanDraft): Promise<ApiAdminPlan> {
  return apiRequest<ApiAdminPlan>(`/v1/admin/plans/${id}`, {
    method: "PUT",
    body: JSON.stringify(draftToPayload(draft)),
  });
}

export function deleteAdminPlan(id: number): Promise<unknown> {
  return apiRequest(`/v1/admin/plans/${id}`, { method: "DELETE" });
}

export function toggleAdminPlan(id: number, active: boolean): Promise<ApiAdminPlan> {
  return apiRequest<ApiAdminPlan>(`/v1/admin/plans/${id}/toggle`, {
    method: "POST",
    body: JSON.stringify({ active }),
  });
}

/* ---------------- Payments (read-only) ---------------- */

export interface ApiAdminPayment {
  id: number;
  invoice_no: string;
  customer: string;
  customer_email: string | null;
  description: string;
  plan: string | null;
  amount: number;
  currency: string;
  gateway: string;
  transaction: string | null;
  webhook_ref: string | null;
  status: "paid" | "pending" | "failed" | "refunded";
  date: string;
}

export function fetchAdminPayments(options: {
  search?: string;
  status?: string;
  gateway?: string;
  page?: number;
} = {}): Promise<{ payments: ApiAdminPayment[]; total: number; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.status) params.set("status", options.status);
  if (options.gateway) params.set("gateway", options.gateway);
  if (options.page) params.set("page", String(options.page));
  const qs = params.toString();

  return apiRequest<{
    payments: ApiAdminPayment[];
    pagination: { total: number; has_more: boolean };
  }>(`/v1/admin/payments${qs ? `?${qs}` : ""}`).then((d) => ({
    payments: d.payments,
    total: d.pagination.total,
    hasMore: d.pagination.has_more,
  }));
}

export async function downloadAdminInvoice(id: number, invoiceNo: string): Promise<void> {
  await downloadFile(`/v1/admin/payments/${id}/invoice`, `${invoiceNo}.html`);
}

/** Client-side CSV export of the currently loaded rows. */
export function exportPaymentsCsv(rows: ApiAdminPayment[]): void {
  const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  // Date and time are separate short columns: a combined datetime gets
  // parsed by Excel and shown as ###### in the default column width.
  const header = ["Date", "Time", "Invoice", "Customer", "Email", "Plan", "Amount", "Currency", "Gateway", "Transaction", "Webhook Ref", "Status"];
  // Excel renders parsed date cells as ###### when the default column is
  // too narrow. Formula-wrapped text (="2026-08-13") is never coerced, so
  // the date always displays — in Excel, LibreOffice, and Google Sheets.
  const asText = (v: string) => `="${v.replaceAll('"', "")}"`;
  const lines = rows.map((p) => {
    const [datePart = "", timePart = ""] = String(p.date).split(" ");
    return [asText(datePart), asText(timePart.slice(0, 5)), ...[p.invoice_no, p.customer, p.customer_email ?? "", p.plan ?? p.description, p.amount.toFixed(2), p.currency, p.gateway, p.transaction ?? "", p.webhook_ref ?? "", p.status].map(esc)].join(",");
  });
  const blob = new Blob([[header.map(esc).join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payments-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// re-export so pages importing from one place stay tidy
export { downloadFile };
