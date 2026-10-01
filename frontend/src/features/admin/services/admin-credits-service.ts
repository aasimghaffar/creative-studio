import { apiRequest } from "@/lib/api-client";

/** Admin → Credit rules API. */

export interface CreditSettings {
  default_free_credits: number;
  daily_credit_limit: number;
  monthly_credit_reset: boolean;
  credit_expiry_days: number;
}

export function fetchCreditSettings(): Promise<CreditSettings> {
  return apiRequest<CreditSettings>("/v1/admin/credit-settings");
}

export function saveCreditSettings(settings: CreditSettings): Promise<CreditSettings> {
  return apiRequest<CreditSettings>("/v1/admin/credit-settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

/** Manual adjustment reuses the existing per-user credits endpoint. */
export function adjustUserCredits(
  userId: string,
  amount: number,
  note: string,
): Promise<{ balance: number }> {
  return apiRequest<{ balance: number }>(`/v1/admin/users/${userId}/credits`, {
    method: "POST",
    body: JSON.stringify({ amount, note }),
  });
}
