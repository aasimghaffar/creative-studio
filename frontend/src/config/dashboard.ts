import type { LucideIcon } from "lucide-react";
import { CreditCard, Rocket, ShieldCheck, UserPlus } from "lucide-react";

/**
 * Placeholder shell data for the dashboard chrome (notifications, activity,
 * credits). Components receive this via props from the layout — swap the
 * source for real API data later without touching the components.
 */

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  icon: LucideIcon;
}

export const sampleNotifications: AppNotification[] = [
  {
    id: "n1",
    title: "Render complete",
    description: "Your export finished processing and is ready to download.",
    time: "2m ago",
    read: false,
    icon: Rocket,
  },
  {
    id: "n2",
    title: "New team member",
    description: "Sana Malik accepted your workspace invitation.",
    time: "1h ago",
    read: false,
    icon: UserPlus,
  },
  {
    id: "n3",
    title: "Payment received",
    description: "Your Studio plan renewed successfully.",
    time: "Yesterday",
    read: true,
    icon: CreditCard,
  },
  {
    id: "n4",
    title: "Security check passed",
    description: "No unusual sign-in activity in the last 30 days.",
    time: "2d ago",
    read: true,
    icon: ShieldCheck,
  },
];

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
}

export const sampleActivity: ActivityItem[] = [
  { id: "a1", actor: "You", action: "created project", target: "Spring Campaign", time: "10:24 AM" },
  { id: "a2", actor: "Sana", action: "commented on", target: "Homepage hero v3", time: "9:52 AM" },
  { id: "a3", actor: "You", action: "exported", target: "Q3 teaser (4K)", time: "9:15 AM" },
  { id: "a4", actor: "Jonas", action: "updated brand kit", target: "Nordlicht", time: "Yesterday" },
  { id: "a5", actor: "You", action: "invited", target: "omar@studio.co", time: "Yesterday" },
  { id: "a6", actor: "System", action: "renewed plan", target: "Studio (yearly)", time: "Mon" },
];

export interface CreditsInfo {
  /** True for paid plans with no credit allowance — deduction is bypassed. */
  unlimited?: boolean;
  plan: string;
  used: number;
  total: number;
  /** Real remaining balance (API) — falls back to total - used. */
  balance?: number;
  renewsOn: string;
}

export const sampleCredits: CreditsInfo = {
  plan: "—",
  used: 0,
  total: 0,
  renewsOn: "—",
  balance: 0,
};

/** Route segment → breadcrumb label. Extend as routes are added. */
export const breadcrumbLabels: Record<string, string> = {
  app: "Dashboard",
  projects: "Projects",
  team: "Team",
  reports: "Reports",
  settings: "Settings",
  logos: "Logo Generator",
  avatars: "Avatar Generator",
  tattoos: "Tattoo Generator",
  images: "Image Generator",
  flyers: "Flyer Generator",
  interiors: "Interior Designer",
  "face-detection": "Face Detection",
  "image-description": "Image Description",
  history: "Global History",
  files: "My Files",
  favorites: "Favorites",
  notifications: "Notifications",
  billing: "Billing & Plans",
  profile: "Profile",
  help: "Help & Support",
  admin: "Admin",
  users: "Users",
  "ai-tools": "AI Tools",
  plans: "Subscription Plans",
  payments: "Payments",
  announcements: "Announcements",
  "help-center": "Help Center",
  faqs: "FAQs",
  "ai-usage": "AI Usage",
  "credits-usage": "Credits Usage",
  "file-manager": "File Manager",
  "storage-provider": "Storage Provider",
  "payment-settings": "Payment Settings",
  "notification-settings": "Notifications",
  "ai-providers": "AI Providers",
  credits: "Credits Management",
  email: "Email Settings",
  security: "Security",
  general: "General Settings",
};
