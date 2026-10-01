import type { LucideIcon } from "lucide-react";
import {
  Brush,
  CircleUserRound,
  CreditCard,
  Flower2,
  FolderUp,
  ImagePlus,
  PenTool,
  UserPlus,
  Video,
  Wand2,
} from "lucide-react";

/**
 * Mock data for the Dashboard Home. Components receive this via props from
 * the page — swap this module for real API calls later without touching
 * any card component.
 */

/* ---------- Storage ---------- */
export interface StorageBreakdownItem {
  label: string;
  sizeGb: number;
  colorClass: string;
}

export interface StorageInfo {
  usedGb: number;
  totalGb: number;
  breakdown: StorageBreakdownItem[];
}

export const mockStorage: StorageInfo = {
  usedGb: 34.2,
  totalGb: 100,
  breakdown: [
    { label: "Images", sizeGb: 18.4, colorClass: "bg-brass" },
    { label: "Video", sizeGb: 12.1, colorClass: "bg-teal" },
    { label: "Audio", sizeGb: 2.4, colorClass: "bg-mist" },
    { label: "Documents", sizeGb: 1.3, colorClass: "bg-brass-deep" },
  ],
};

/* ---------- Subscription ---------- */
export interface SubscriptionInfo {
  plan: string;
  billing: string;
  pricePerSeat: number;
  status: "active" | "past_due" | "canceled";
  renewsOn: string;
  seatsUsed: number;
  seatsTotal: number;
}

export const mockSubscription: SubscriptionInfo = {
  plan: "Studio",
  billing: "Yearly",
  pricePerSeat: 24,
  status: "active",
  renewsOn: "Aug 1, 2026",
  seatsUsed: 3,
  seatsTotal: 5,
};

/* ---------- Favorite tools ---------- */
export interface FavoriteTool {
  name: string;
  tag: string;
  icon: LucideIcon;
  runsThisMonth: number;
}

export const mockFavoriteTools: FavoriteTool[] = [
  { name: "Logo Generator", tag: "BRAND → MARK", icon: PenTool, runsThisMonth: 212 },
  { name: "Avatar Generator", tag: "FACE → PORTRAIT", icon: CircleUserRound, runsThisMonth: 64 },
  { name: "Tattoo Generator", tag: "IDEA → INK", icon: Flower2, runsThisMonth: 141 },
  { name: "Image Generator", tag: "TEXT → IMAGE", icon: Brush, runsThisMonth: 27 },
];

/* ---------- Latest images ---------- */
export interface LatestImage {
  id: string;
  title: string;
  tool: string;
  tag: string;
  gradientClass: string;
  /** Real image URL (API) — rendered instead of the gradient. */
  url?: string;
}

export const mockLatestImages: LatestImage[] = [
  {
    id: "img1",
    title: "Matte ceramic bottle, morning light",
    tool: "Image Studio",
    tag: "DRAFT_01",
    gradientClass: "from-bp-panel-2 to-blueprint",
  },
  {
    id: "img2",
    title: "Rooftop launch flyer, sunset tones",
    tool: "Image Studio",
    tag: "DRAFT_02",
    gradientClass: "from-[#3a3326] to-blueprint",
  },
  {
    id: "img3",
    title: "Scandinavian living room, oak",
    tool: "Image Studio",
    tag: "DRAFT_03",
    gradientClass: "from-[#2a4a46] to-[#153029]",
  },
  {
    id: "img4",
    title: "Fine-line crescent moon mark",
    tool: "Logo Maker",
    tag: "DRAFT_04",
    gradientClass: "from-bp-panel to-blueprint",
  },
  {
    id: "img5",
    title: "Editorial avatar set, studio light",
    tool: "Avatar Studio",
    tag: "DRAFT_05",
    gradientClass: "from-[#22343b] to-blueprint",
  },
  {
    id: "img6",
    title: "Campaign hero, warm tungsten",
    tool: "Image Studio",
    tag: "DRAFT_06",
    gradientClass: "from-[#40372a] to-[#12232b]",
  },
];

/* ---------- Usage analytics ---------- */
export interface UsagePoint {
  label: string;
  value: number;
}

/** Generations per day, last 14 days. */
export const mockUsage: UsagePoint[] = [
  { label: "Jun 26", value: 18 },
  { label: "Jun 27", value: 26 },
  { label: "Jun 28", value: 12 },
  { label: "Jun 29", value: 31 },
  { label: "Jun 30", value: 24 },
  { label: "Jul 01", value: 38 },
  { label: "Jul 02", value: 29 },
  { label: "Jul 03", value: 16 },
  { label: "Jul 04", value: 8 },
  { label: "Jul 05", value: 22 },
  { label: "Jul 06", value: 35 },
  { label: "Jul 07", value: 41 },
  { label: "Jul 08", value: 33 },
  { label: "Jul 09", value: 27 },
];

/* ---------- Quick actions ---------- */
export interface QuickAction {
  label: string;
  icon: LucideIcon;
  hint: string;
}

export const mockQuickActions: QuickAction[] = [
  { label: "New image render", icon: ImagePlus, hint: "Image Studio" },
  { label: "New video cut", icon: Video, hint: "Video Lab" },
  { label: "Upscale an asset", icon: Wand2, hint: "Enhance" },
  { label: "Upload to library", icon: FolderUp, hint: "Storage" },
  { label: "Invite a teammate", icon: UserPlus, hint: "2 seats free" },
  { label: "Manage billing", icon: CreditCard, hint: "Studio plan" },
];
