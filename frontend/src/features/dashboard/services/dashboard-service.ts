import { apiRequest } from "@/lib/api-client";
import type { LatestImage, StorageInfo, SubscriptionInfo, UsagePoint } from "../data";
import type { ActivityItem, CreditsInfo } from "@/config/dashboard";

/** Dashboard Home API — one aggregated call. */

interface ApiDashboard {
  stats: { renders_today: number; renders_week: number; drafts_open: number };
  usage: {
    points: { date: string; count: number }[];
    total: number;
    avg_per_day: number;
    peak: { count: number; date: string } | null;
  };
  latest_images: { id: number; title: string; tool: string; url: string }[];
  recent_activity: { id: number; actor: string; action: string; target: string; time: string; category: string }[];
  credits: {
    balance: number;
    total_granted: number;
    used_total: number;
    used_this_cycle: number;
    credits_per_cycle: number | null;
    unlimited: boolean;
    resets_on: string | null;
  };
  subscription: {
    plan_name: string;
    billing_cycle: string;
    price: number | null;
    status: string;
    renews_on: string | null;
    seats: number;
  };
  storage: {
    used_gb: number;
    limit_gb: number;
    breakdown: { images: number; videos: number; audio: number; documents: number };
  };
}

const GRADIENTS = [
  "from-bp-panel-2 to-blueprint",
  "from-[#3a3326] to-blueprint",
  "from-[#2a4a46] to-[#153029]",
  "from-bp-panel to-blueprint",
  "from-[#22343b] to-blueprint",
  "from-[#40372a] to-[#12232b]",
];

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

function shortDateTime(value: string): string {
  return new Date(value.replace(" ", "T")).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export interface DashboardData {
  stats: { rendersToday: number; rendersWeek: number; draftsOpen: number };
  usage: UsagePoint[];
  latestImages: LatestImage[];
  activity: ActivityItem[];
  credits: CreditsInfo;
  subscription: SubscriptionInfo;
  storage: StorageInfo;
}

export async function fetchDashboard(): Promise<DashboardData> {
  const api = await apiRequest<ApiDashboard>("/v1/dashboard");

  return {
    stats: {
      rendersToday: api.stats.renders_today,
      rendersWeek: api.stats.renders_week,
      draftsOpen: api.stats.drafts_open,
    },
    usage: api.usage.points.map((p) => ({ label: shortDate(p.date), value: p.count })),
    latestImages: api.latest_images.map((img, i) => ({
      id: String(img.id),
      title: img.title,
      tool: img.tool,
      tag: `DRAFT_${String(i + 1).padStart(2, "0")}`,
      gradientClass: GRADIENTS[i % GRADIENTS.length] ?? "",
      url: img.url,
    })),
    activity: api.recent_activity.map((a) => ({
      id: String(a.id),
      actor: a.actor,
      action: a.action,
      target: a.target,
      time: shortDateTime(a.time),
    })),
    credits: {
      plan: api.subscription.plan_name,
      used: api.credits.used_total,
      total: api.credits.total_granted,
      unlimited: api.credits.unlimited,
      renewsOn: api.credits.resets_on ? shortDateTime(api.credits.resets_on) : "next cycle",
      balance: api.credits.balance,
    },
    subscription: {
      plan: api.subscription.plan_name,
      billing: api.subscription.billing_cycle === "yearly" ? "Yearly" : "Monthly",
      pricePerSeat: api.subscription.price ?? 0,
      status: (api.subscription.status === "active" || api.subscription.status === "trialing"
        ? "active"
        : api.subscription.status === "past_due"
          ? "past_due"
          : "canceled") as SubscriptionInfo["status"],
      renewsOn: api.subscription.renews_on ? shortDateTime(api.subscription.renews_on) : "—",
      seatsUsed: 1,
      seatsTotal: api.subscription.seats,
    },
    storage: {
      usedGb: api.storage.used_gb,
      totalGb: api.storage.limit_gb,
      breakdown: [
        { label: "Images", sizeGb: api.storage.breakdown.images, colorClass: "bg-brass" },
        { label: "Video", sizeGb: api.storage.breakdown.videos, colorClass: "bg-teal" },
        { label: "Audio", sizeGb: api.storage.breakdown.audio, colorClass: "bg-mist" },
        { label: "Documents", sizeGb: api.storage.breakdown.documents, colorClass: "bg-brass-deep" },
      ],
    },
  };
}
