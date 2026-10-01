import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Activity, Loader2, X } from "lucide-react";
import { fetchDashboard } from "@/features/dashboard/services/dashboard-service";
import type { ActivityItem } from "@/config/dashboard";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";

/** Session cache — the feed loads once per open session. */
let cachedActivity: ActivityItem[] | null = null;

/**
 * Optional right panel (activity feed placeholder).
 *  - xl and up: inline column next to the main content
 *  - below xl: slide-over drawer with overlay
 * Toggled from the header; open state persists.
 */
export function RightPanel() {
  const open = useUiStore((s) => s.rightPanelOpen);
  const setOpen = useUiStore((s) => s.setRightPanelOpen);
  const [items, setItems] = useState<ActivityItem[] | null>(cachedActivity);

  // REAL activity — the user's own recent generations/events from the
  // dashboard API. No sample data.
  useEffect(() => {
    if (!open || items !== null) return;
    let cancelled = false;
    fetchDashboard()
      .then((data) => {
        if (cancelled) return;
        cachedActivity = data.activity;
        setItems(data.activity);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, items]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 xl:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <motion.aside
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l bg-background xl:sticky xl:top-14 xl:z-auto xl:h-[calc(100svh-3.5rem)] xl:shrink-0"
            aria-label="Activity panel"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="size-4 text-muted-foreground" />
                Activity
              </p>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close panel">
                <X className="size-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {items === null && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading your activity…
                </p>
              )}
              {items !== null && items.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No activity yet — generate something and it will show up here.
                </p>
              )}
              <ol className="relative space-y-5 border-l pl-5">
                {(items ?? []).map((item) => (
                  <li key={item.id} className="relative">
                    <span
                      className="absolute -left-[1.4rem] top-1.5 size-2 rounded-full border-2 border-background bg-muted-foreground/50"
                      aria-hidden="true"
                    />
                    <p className="text-sm leading-snug">
                      <span className="font-medium">{item.actor}</span>{" "}
                      <span className="text-muted-foreground">{item.action}</span>{" "}
                      <span className="font-medium">{item.target}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.time}</p>
                  </li>
                ))}
              </ol>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
