import { apiRequest } from "@/lib/api-client";

/** Billing & Credits API — /api/v1/billing + public /api/v1/plans. */

export interface ApiPlan {
  slug: string;
  name: string;
  tagline: string | null;
  monthly_price: number | null;
  yearly_price: number | null;
  credits_per_cycle: number | null;
  seats: number;
  features: string[];
  is_popular: boolean;
  badge?: string;
  sort_order?: number;
}

export interface ApiCurrentPlan {
  plan_slug: string;
  plan_name: string;
  billing_cycle: "monthly" | "yearly";
  status: string;
  price: number | null;
  credits_per_cycle: number | null;
  seats: number;
  started_on: string | null;
  renews_on: string | null;
  auto_renew: boolean;
  is_free: boolean;
}

export interface ApiCredits {
  balance: number;
  total_granted: number;
  used_total: number;
  credits_per_cycle: number | null;
  used_this_cycle: number;
  unlimited: boolean;
  resets_on: string | null;
}

export interface ApiPayment {
  id: number;
  invoice_no: string;
  description: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed" | "refunded";
  gateway: string;
  transaction: string | null;
  date: string;
}

export interface ApiCreditUsage {
  tool_slug: string;
  tool_name: string;
  credits: number;
}

export function fetchPlans(): Promise<ApiPlan[]> {
  return apiRequest<{ plans: ApiPlan[] }>("/v1/plans").then((d) => d.plans);
}

export function fetchCurrentPlan(): Promise<ApiCurrentPlan> {
  return apiRequest<ApiCurrentPlan>("/v1/billing/current-plan");
}

export function fetchCredits(): Promise<ApiCredits> {
  return apiRequest<ApiCredits>("/v1/billing/credits");
}

export function fetchPayments(): Promise<ApiPayment[]> {
  return apiRequest<{ payments: ApiPayment[] }>("/v1/billing/payments").then((d) => d.payments);
}

export function fetchCreditUsage(): Promise<ApiCreditUsage[]> {
  return apiRequest<{ usage: ApiCreditUsage[] }>("/v1/billing/credit-usage").then((d) => d.usage);
}

export function upgradePlan(
  planSlug: string,
  billingCycle: "monthly" | "yearly",
): Promise<{ current_plan: ApiCurrentPlan; credits: ApiCredits }> {
  return apiRequest("/v1/billing/upgrade", {
    method: "POST",
    body: JSON.stringify({ plan_slug: planSlug, billing_cycle: billingCycle }),
  });
}

/* ---- Landing pricing → signup plan hand-off ---- */

const SELECTED_PLAN_KEY = "prism.selected-plan";

export interface SelectedPlan {
  slug: string;
  cycle: "monthly" | "yearly";
}

export function rememberSelectedPlan(plan: SelectedPlan): void {
  try {
    localStorage.setItem(SELECTED_PLAN_KEY, JSON.stringify(plan));
  } catch {
    // Storage unavailable — the user simply lands on the free plan.
  }
}

/**
 * After signup/login: a plan picked on the landing page is NOT assigned
 * automatically anymore — paid plans require real payment. We only read
 * and clear the stored intent; the Billing page routes to checkout.
 */
export function claimSelectedPlan(): SelectedPlan | null {
  let stored: SelectedPlan | null = null;
  try {
    const raw = localStorage.getItem(SELECTED_PLAN_KEY);
    stored = raw ? (JSON.parse(raw) as SelectedPlan) : null;
    localStorage.removeItem(SELECTED_PLAN_KEY);
  } catch {
    stored = null;
  }
  return stored?.slug ? stored : null;
}

/* ---------- Checkout ---------- */

export interface CheckoutContext {
  plan: { slug: string; name: string; credits_per_cycle: number | null };
  cycle: string;
  price: number;
  tax: number;
  total: number;
  currency: string;
  gateways: { slug: string; name: string; environment: string }[];
}

export function fetchCheckoutContext(plan: string, cycle: string): Promise<CheckoutContext> {
  return apiRequest<CheckoutContext>(`/v1/billing/checkout-context?plan=${encodeURIComponent(plan)}&cycle=${encodeURIComponent(cycle)}`);
}

export function startCheckout(plan: string, cycle: string, gateway: string): Promise<{ payment_id: number; redirect_url: string }> {
  return apiRequest("/v1/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ plan, cycle, gateway }),
  });
}

export function confirmCheckout(params: Record<string, string>): Promise<{ status: string; message: string }> {
  return apiRequest("/v1/billing/checkout/confirm", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function invoiceUrlPath(paymentId: number): string {
  return `/v1/billing/invoices/${paymentId}`;
}
