import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";

/**
 * Shared, cached credits summary from GET /billing/credits — the ONE
 * source for every credit figure in the UI (header meter, dashboard
 * card, studio panels). All values are database calculations:
 * total_granted - used_total === balance, always.
 *
 * Call invalidateCreditsSummary() after anything that moves credits
 * (a generation, a plan change) so every consumer refreshes.
 */
export interface CreditsSummary {
  balance: number;
  total_granted: number;
  used_total: number;
  used_this_cycle: number;
  credits_per_cycle: number | null;
  unlimited: boolean;
  resets_on: string | null;
}

const EMPTY: CreditsSummary = {
  balance: 0,
  total_granted: 0,
  used_total: 0,
  used_this_cycle: 0,
  credits_per_cycle: null,
  unlimited: false,
  resets_on: null,
};

let cache: CreditsSummary | null = null;
let inflight: Promise<CreditsSummary> | null = null;
const listeners = new Set<(summary: CreditsSummary) => void>();

function load(): Promise<CreditsSummary> {
  if (cache) return Promise.resolve(cache);
  inflight ??= apiRequest<CreditsSummary>("/v1/billing/credits")
    .then((data) => {
      cache = { ...EMPTY, ...data };
      listeners.forEach((fn) => fn(cache as CreditsSummary));
      return cache;
    })
    .catch(() => cache ?? EMPTY)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function invalidateCreditsSummary(): void {
  cache = null;
  void load();
}

export function useCreditsSummary(): CreditsSummary & { loaded: boolean } {
  const [summary, setSummary] = useState<CreditsSummary | null>(cache);

  useEffect(() => {
    const update = (fresh: CreditsSummary) => setSummary(fresh);
    listeners.add(update);
    void load().then(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  return { ...(summary ?? EMPTY), loaded: summary !== null };
}
