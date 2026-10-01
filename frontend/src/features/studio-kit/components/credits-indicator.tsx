import { Coins, Infinity as InfinityIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cost + balance line under the Generate button. The "left" figure is
 * REMAINING DRAFTS = remaining credits ÷ cost per generation — it moves
 * automatically when an admin changes the tool's credit cost.
 */
export function CreditsIndicator({
  estimate,
  balance,
  unitLabel = "drafts",
  count,
  costPerDraft,
  unlimited = false,
}: {
  estimate: number;
  balance: number;
  unitLabel?: string;
  count: number;
  /** Cost of ONE generation; falls back to estimate / count. */
  costPerDraft?: number;
  /** Paid plans without a credit allowance skip deduction entirely. */
  unlimited?: boolean;
}) {
  if (unlimited) {
    return (
      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
        <InfinityIcon className="size-3" strokeWidth={1.8} />
        {count} {unitLabel} · unlimited plan — no credits deducted
      </p>
    );
  }

  const perDraft = costPerDraft ?? (count > 0 ? estimate / count : 0);
  const draftsLeft = perDraft > 0 ? Math.floor(balance / perDraft) : 0;
  const insufficient = estimate > balance;

  return (
    <p
      className={cn(
        "mt-2.5 flex items-center justify-center gap-1.5 text-center font-mono text-[10px] uppercase tracking-[0.06em]",
        insufficient ? "text-destructive" : "text-muted-foreground",
      )}
    >
      <Coins className="size-3" strokeWidth={1.8} />
      {count} {unitLabel} · cost ~{estimate} credits · {balance.toLocaleString()} left ({draftsLeft.toLocaleString()} {unitLabel})
      {insufficient && " — top up"}
    </p>
  );
}
