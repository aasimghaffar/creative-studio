import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Brush,
  CircleUserRound,
  CreditCard,
  Flower2,
  FolderOpen,
  Heart,
  History,
  LayoutDashboard,
  LifeBuoy,
  Newspaper,
  PenTool,
    ScanText,
  Settings,
    UserRound,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon?: LucideIcon;
  disabled?: boolean;
  external?: boolean;
  badge?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Central navigation config. Layouts read from here so adding a page
 * later only requires a route + one entry in this file.
 */
export const mainNav: NavItem[] = [
  // { title: "Pricing", href: "/pricing" },
];

/** Sidebar navigation, grouped into labeled sections. */
export const sidebarSections: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { title: "Dashboard", href: "/app", icon: LayoutDashboard },
      { title: "Global History", href: "/app/history", icon: History },
      { title: "My Files", href: "/app/files", icon: FolderOpen },
      { title: "Favorites", href: "/app/favorites", icon: Heart },
    ],
  },
  {
    label: "AI Tools",
    // Fallback while the live catalog loads — the sidebar swaps these for
    // the ai_tools table via useAiToolsNav (single source of truth).
    items: [
      { title: "Logo Generator", href: "/app/logos", icon: PenTool },
      { title: "Avatar Generator", href: "/app/avatars", icon: CircleUserRound },
      { title: "Tattoo Generator", href: "/app/tattoos", icon: Flower2 },
      { title: "Image Generator", href: "/app/images", icon: Brush },
      { title: "Flyer Generator", href: "/app/flyers", icon: Newspaper },
      { title: "Image Description", href: "/app/image-description", icon: ScanText },
    ],
  },
  {
    label: "General",
    items: [
      { title: "Notifications", href: "/app/notifications", icon: Bell },
      { title: "Billing & Plans", href: "/app/billing", icon: CreditCard },
      { title: "Profile", href: "/app/profile", icon: UserRound },
      { title: "Settings", href: "/app/settings", icon: Settings },
      { title: "Help & Support", href: "/app/help", icon: LifeBuoy },
    ],
  },
];

/** Route + icon for every tool slug — used by the dynamic sidebar. */
export const AI_TOOL_LINKS: Record<string, { href: string; icon: NavItem["icon"] }> = {
  logo: { href: "/app/logos", icon: PenTool },
  avatar: { href: "/app/avatars", icon: CircleUserRound },
  tattoo: { href: "/app/tattoos", icon: Flower2 },
  image: { href: "/app/images", icon: Brush },
  flyer: { href: "/app/flyers", icon: Newspaper },
  "image-description": { href: "/app/image-description", icon: ScanText },
};
