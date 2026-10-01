import { useEffect, useState } from "react";
import { Brush, CreditCard, FolderOpen, Newspaper, PenTool } from "lucide-react";
import { WelcomeCard } from "./components/welcome-card";
import { CreditsCard } from "./components/credits-card";
import { StorageCard } from "./components/storage-card";
import { SubscriptionCard } from "./components/subscription-card";
import { RecentActivityCard } from "./components/recent-activity-card";
import { LatestImagesCard } from "./components/latest-images-card";
import { UsageAnalyticsCard } from "./components/usage-analytics-card";
import { QuickActionsCard } from "./components/quick-actions-card";
import { fetchDashboard, type DashboardData } from "./services/dashboard-service";

/**
 * Dashboard Home — a responsive bento grid of overview cards, fed by one
 * aggregated API call. Quick actions and favorite tools are navigation
 * config, not data, so they stay local.
 */
/** Real destinations only — no invented stats, no dead links. */
const REAL_QUICK_ACTIONS = [
  { id: "logo", label: "New logo", meta: "Brand → mark", href: "/app/logos", icon: PenTool },
  { id: "image", label: "New image", meta: "Text → image", href: "/app/images", icon: Brush },
  { id: "flyer", label: "New flyer", meta: "Print → promo", href: "/app/flyers", icon: Newspaper },
  { id: "files", label: "Open My Files", meta: "Downloads & storage", href: "/app/files", icon: FolderOpen },
  { id: "billing", label: "Manage billing", meta: "Plan & credits", href: "/app/billing", icon: CreditCard },
];

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDashboard()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 lg:grid-cols-12">
      <div className="md:col-span-2 lg:col-span-8">
        <WelcomeCard stats={data?.stats} />
      </div>
      <div className="lg:col-span-4">
        <CreditsCard
          credits={data?.credits ?? { plan: "—", used: 0, total: 0, renewsOn: "—", balance: 0 }}
        />
      </div>

      <div className="md:col-span-2 lg:col-span-8">
        <UsageAnalyticsCard usage={data?.usage ?? []} />
      </div>
      <div className="lg:col-span-4">
        <SubscriptionCard
          subscription={
            data?.subscription ?? {
              plan: "—",
              billing: "Monthly",
              pricePerSeat: 0,
              status: "active",
              renewsOn: "—",
              seatsUsed: 1,
              seatsTotal: 1,
            }
          }
        />
      </div>

      <div className="md:col-span-2 lg:col-span-8">
        <LatestImagesCard images={data?.latestImages ?? []} />
      </div>
      <div className="lg:col-span-4">
        <StorageCard storage={data?.storage ?? { usedGb: 0, totalGb: 10, breakdown: [] }} />
      </div>

      <div className="md:col-span-2 lg:col-span-6">
        <QuickActionsCard actions={REAL_QUICK_ACTIONS} />
      </div>
      <div className="md:col-span-2 lg:col-span-6">
        <RecentActivityCard items={data?.activity ?? []} />
      </div>
    </div>
  );
}
