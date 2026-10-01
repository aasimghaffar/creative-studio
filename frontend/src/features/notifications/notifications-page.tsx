import { useEffect, useState } from "react";
import { BellOff, CheckCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChipGroup, EmptyState, formatDateTime } from "@/features/studio-kit";
import { CATEGORY_META } from "@/mocks";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
  type NotificationType,
} from "./services/notification-service";

const FILTERS = ["All", "Generation", "Credits", "Subscription", "Payment", "System"];

export function NotificationsPage() {
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [filter, setFilter] = useState("All");
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Every tab change fetches only that type from the backend.
  useEffect(() => {
    let cancelled = false;
    setError(null);

    const type = filter === "All" ? undefined : (filter.toLowerCase() as NotificationType);

    fetchNotifications({ type, perPage: 50 })
      .then((data) => {
        if (cancelled) return;
        setItems(data.notifications);
        setUnread(data.unread);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded(true);
        setError("Could not load notifications. Is the backend running?");
      });

    return () => {
      cancelled = true;
    };
  }, [filter]);

  function markRead(item: ApiNotification) {
    if (item.read) return;
    setItems((list) => list.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    void markNotificationRead(item.id).catch(() => {
      setItems((list) => list.map((n) => (n.id === item.id ? { ...n, read: false } : n)));
      setUnread((u) => u + 1);
    });
  }

  function markAllRead() {
    const previous = items;
    const previousUnread = unread;
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
    void markAllNotificationsRead().catch(() => {
      setItems(previous);
      setUnread(previousUnread);
    });
  }

  function remove(item: ApiNotification) {
    const previous = items;
    const previousUnread = unread;
    setItems((list) => list.filter((n) => n.id !== item.id));
    if (!item.read) setUnread((u) => Math.max(0, u - 1));
    void deleteNotification(item.id).catch(() => {
      setItems(previous);
      setUnread(previousUnread);
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description={error ?? (unread > 0 ? `${unread} unread` : "You're all caught up.")}
        action={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllRead} disabled={unread === 0}>
            <CheckCheck className="size-3.5" />
            Mark all as read
          </Button>
        }
      />

      <div className="mb-5">
        <ChipGroup options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      {loaded && items.length === 0 ? (
        <EmptyState icon={BellOff} hint="Nothing here — notifications about generations, credits, billing, and product news land in this inbox." />
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const meta = CATEGORY_META[n.category];
            const Icon = meta.icon;
            return (
              <article
                key={n.id}
                className={cn(
                  "flex items-start gap-3.5 rounded-[4px] border bg-card p-3.5 transition-colors",
                  !n.read && "border-brass/40",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border",
                    n.read ? "text-muted-foreground" : "border-brass/50 text-brass",
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.6} />
                </span>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => markRead(n)}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={cn("text-sm", n.read ? "font-normal" : "font-medium")}>{n.title}</p>
                    <span className="shrink-0 font-mono text-[10px] uppercase text-muted-foreground">
                      {formatDateTime(n.created_at.replace(" ", "T"))}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{n.body}</p>
                  <p className="eyebrow mt-1.5 text-[9px] text-muted-foreground">{meta.label}</p>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  {!n.read && (
                    <span className="mr-1 size-1.5 rounded-full bg-brass" aria-label="Unread" />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => remove(n)}
                    aria-label="Delete notification"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
