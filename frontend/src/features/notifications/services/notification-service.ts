import { apiRequest } from "@/lib/api-client";

/** Notifications API — /api/v1/notifications. */

export type NotificationType = "generation" | "credits" | "subscription" | "payment" | "system";

export interface ApiNotification {
  id: number;
  category: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationList {
  notifications: ApiNotification[];
  pagination: { page: number; per_page: number; total: number; has_more: boolean };
  unread: number;
}

export function fetchNotifications(options: {
  type?: NotificationType;
  page?: number;
  perPage?: number;
} = {}): Promise<NotificationList> {
  const params = new URLSearchParams();
  if (options.type) params.set("type", options.type);
  if (options.page) params.set("page", String(options.page));
  if (options.perPage) params.set("per_page", String(options.perPage));
  const query = params.toString();

  return apiRequest<NotificationList>(`/v1/notifications${query ? `?${query}` : ""}`);
}

export function fetchUnreadCount(): Promise<number> {
  return apiRequest<{ unread: number }>("/v1/notifications/unread-count").then((d) => d.unread);
}

export function markNotificationRead(id: number): Promise<unknown> {
  return apiRequest(`/v1/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead(): Promise<unknown> {
  return apiRequest("/v1/notifications/read-all", { method: "PATCH" });
}

export function deleteNotification(id: number): Promise<unknown> {
  return apiRequest(`/v1/notifications/${id}`, { method: "DELETE" });
}
