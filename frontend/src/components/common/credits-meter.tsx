import { Coins, Zap } from "lucide-react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import type { CreditsInfo } from "@/config/dashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Credits/usage widget for the header. Data arrives via props so the
 * source can move from placeholder config to a billing API untouched.
 */
export function CreditsMeter({ credits }: { credits: CreditsInfo }) {
  const navigate = useNavigate();
  const remaining = credits.balance ?? Math.max(credits.total - credits.used, 0);
  const pct = credits.total > 0 ? Math.min((credits.used / credits.total) * 100, 100) : 0;
  const low = !credits.unlimited && credits.total > 0 && remaining / credits.total < 0.15;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 gap-1.5 rounded-full px-3 font-mono text-[11px] font-medium tracking-[0.04em]",
            low
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "bg-brass text-blueprint hover:bg-brass/90 hover:text-blueprint",
          )}
          aria-label={`Credits: ${remaining} remaining`}
        >
          <Coins className="size-3.5" strokeWidth={1.8} />
          <span className="hidden tabular-nums sm:inline">{credits.unlimited ? "∞" : remaining.toLocaleString()} CREDITS</span>
          <span className="tabular-nums sm:hidden">{credits.unlimited ? "∞" : remaining.toLocaleString()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Credits</p>
          <Badge variant="secondary">{credits.plan} plan</Badge>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium tabular-nums">
              {credits.used.toLocaleString()}
              <span className="text-muted-foreground"> / {credits.total.toLocaleString()} used</span>
            </span>
            <span className={cn("text-xs", low ? "text-destructive" : "text-muted-foreground")}>
              {remaining.toLocaleString()} left
            </span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all",
                low ? "bg-destructive" : "bg-brass",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Resets on {credits.renewsOn}</p>
        </div>

        <Button size="sm" className="mt-4 w-full gap-1.5" onClick={() => navigate("/app/billing")}>
          <Zap className="size-3.5" />
          Get more credits
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
