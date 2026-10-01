import type { LucideIcon } from "lucide-react";
import { Bell, CreditCard, Coins, Megaphone, Sparkles } from "lucide-react";

export type NotificationCategory = "generation" | "credits" | "subscription" | "payment" | "system";

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
}

export const CATEGORY_META: Record<NotificationCategory, { label: string; icon: LucideIcon }> = {
  generation: { label: "Generation", icon: Sparkles },
  credits: { label: "Credits", icon: Coins },
  subscription: { label: "Subscription", icon: Bell },
  payment: { label: "Payment", icon: CreditCard },
  system: { label: "System", icon: Megaphone },
};

export const mockNotifications: NotificationItem[] = [
  { id: "n1", category: "generation", title: "Logo batch completed", description: "4 drafts for “Nimbus & Co.” are ready on your canvas.", createdAt: "2026-07-09T11:25:00", read: false },
  { id: "n2", category: "credits", title: "Credits updated", description: "8 credits used — 1,232 remaining this cycle.", createdAt: "2026-07-09T11:25:00", read: false },
  { id: "n3", category: "generation", title: "Avatar batch completed", description: "4 portraits for “Curly-haired product designer” are ready.", createdAt: "2026-07-09T10:49:00", read: false },
  { id: "n4", category: "payment", title: "Payment received", description: "Your Studio plan renewed for $288.00 (yearly).", createdAt: "2026-07-01T08:01:00", read: true },
  { id: "n5", category: "subscription", title: "Plan renewed", description: "Studio (Yearly) is active until Aug 1, 2026.", createdAt: "2026-07-01T08:00:00", read: true },
  { id: "n6", category: "system", title: "New studio: Tattoo Generator", description: "Ink flash-sheet concepts in six styles — now live for all plans.", createdAt: "2026-06-28T09:00:00", read: true },
  { id: "n7", category: "credits", title: "Low credit warning", description: "You had under 15% of your credits left before the cycle reset.", createdAt: "2026-06-27T18:12:00", read: true },
];
