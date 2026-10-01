import { useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
} from "@/features/notifications/services/notification-service";
import { formatDateTime } from "@/features/studio-kit/lib";

/**
 * Notifications bell + dropdown — REAL data from the notifications API.
 * Unread badge loads on mount; the list loads when the menu opens.
 * Mark-read actions call the API (optimistic, revert on failure).
 */
export function NotificationsMenu() {
  const [items, setItems] = useState<ApiNotification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchUnreadCount().then(setUnread).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!open || items !== null) return;
    fetchNotifications({ page: 1, perPage: 12 })
      .then((list) => {
        setItems(list.notifications);
        setUnread(list.unread);
      })
      .catch(() => setItems([]));
  }, [open, items]);

  function markRead(n: ApiNotification) {
    if (n.read_at) return;
    setItems((list) => (list ?? []).map((item) => (item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item)));
    setUnread((u) => Math.max(0, u - 1));
    void markNotificationRead(n.id).catch(() => undefined);
  }

  function markAll() {
    setItems((list) => (list ?? []).map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    setUnread(0);
    void markAllNotificationsRead().catch(() => undefined);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-destructive" />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
            onClick={markAll}
            disabled={unread === 0}
          >
            <CheckCheck className="size-3.5" />
            Mark all read
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items === null ? (
            <p className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => markRead(n)}
                className="flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-0 hover:bg-accent"
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
                    n.read_at ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                  )}
                >
                  <Sparkles className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn("truncate text-sm", n.read_at ? "font-normal" : "font-medium")}>{n.title}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatDateTime(n.created_at.replace(" ", "T"))}
                    </span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>
                </span>
                {!n.read_at && <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />}
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
