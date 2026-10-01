import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import type { SubscriptionInfo } from "../data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "./dashboard-card";

const statusStyles: Record<SubscriptionInfo["status"], { label: string; className: string }> = {
  active: { label: "Active", className: "bg-teal text-white" },
  past_due: { label: "Past due", className: "bg-destructive text-destructive-foreground" },
  canceled: { label: "Canceled", className: "bg-muted text-muted-foreground" },
};

export function SubscriptionCard({ subscription }: { subscription: SubscriptionInfo }) {
  const navigate = useNavigate();
  const status = statusStyles[subscription.status];

  return (
    <DashboardCard
      label="Subscription"
      action={<Badge className={cn("border-transparent", status.className)}>{status.label}</Badge>}
    >
      <div className="flex h-full flex-col justify-between gap-5">
        <div>
          <p className="font-display text-2xl font-medium">
            {subscription.plan}
            <span className="ml-2 font-mono text-xs font-normal uppercase tracking-[0.08em] text-muted-foreground">
              {subscription.billing}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            ${subscription.pricePerSeat} / seat / month · renews {subscription.renewsOn}
          </p>
        </div>

        <div>
          <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
            <span>SEATS</span>
            <span>
              {subscription.seatsUsed} of {subscription.seatsTotal}
            </span>
          </div>
          <div className="mt-1.5 flex gap-1" aria-hidden="true">
            {Array.from({ length: subscription.seatsTotal }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  i < subscription.seatsUsed ? "bg-brass" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>

        <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => navigate("/app/billing")}>
          Manage plan
          <ArrowUpRight className="size-3.5" />
        </Button>
      </div>
    </DashboardCard>
  );
}
