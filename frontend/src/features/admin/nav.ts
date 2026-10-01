import type { LucideIcon } from "lucide-react";
import {
  Coins,
  CreditCard,
  Database,
  FileQuestion,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Megaphone,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  } from "lucide-react";

export interface AdminNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface AdminNavSection {
  label: string;
  items: AdminNavItem[];
}

/** Admin sidebar structure — single source of truth. */
export const adminNav: AdminNavSection[] = [
  {
    label: "Dashboard",
    items: [{ title: "Overview", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "User Management",
    items: [{ title: "Users", href: "/admin/users", icon: Users }],
  },
  {
    label: "AI Management",
    items: [
      { title: "AI Tools", href: "/admin/ai-tools", icon: Sparkles },
      { title: "AI Providers", href: "/admin/ai-providers", icon: KeyRound },
    ],
  },
  {
    label: "Billing",
    items: [
      { title: "Subscription Plans", href: "/admin/plans", icon: CreditCard },
      { title: "Payments", href: "/admin/payments", icon: Coins },
      { title: "Credits Management", href: "/admin/credits", icon: Coins },
    ],
  },
  {
    label: "Content",
    items: [
      { title: "Announcements", href: "/admin/announcements", icon: Megaphone },
      { title: "Help Center", href: "/admin/help-center", icon: LifeBuoy },
      { title: "FAQs", href: "/admin/faqs", icon: FileQuestion },
    ],
  },
  {
    label: "Reports",
    items: [
      { title: "AI Usage", href: "/admin/ai-usage", icon: Gauge },
      { title: "Credits Usage", href: "/admin/credits-usage", icon: Coins },
    ],
  },
  {
    label: "System",
    items: [
      { title: "File Manager", href: "/admin/file-manager", icon: Database },
      { title: "Storage Provider", href: "/admin/storage-provider", icon: Database },
      { title: "Email Settings", href: "/admin/email", icon: Mail },
      { title: "Payment Settings", href: "/admin/payment-settings", icon: CreditCard },
      { title: "Security", href: "/admin/security", icon: ShieldCheck },
      { title: "Support Inbox", href: "/admin/support", icon: LifeBuoy },
      { title: "Notifications", href: "/admin/notification-settings", icon: Megaphone },
      { title: "General Settings", href: "/admin/general", icon: Settings },
    ],
  },
];

