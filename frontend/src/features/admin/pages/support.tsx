import { useEffect, useState } from "react";
import { CheckCircle2, Inbox, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { PanelCard } from "@/components/common/panel-card";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api-client";
import { formatDateTime } from "@/features/studio-kit/lib";
import { cn } from "@/lib/utils";

interface AdminTicket {
  id: number;
  topic: string;
  priority: string;
  subject: string;
  message: string;
  status: "open" | "pending" | "resolved";
  created_at: string;
  user_name: string;
  user_email: string;
}

const PRIORITY_CLASS: Record<string, string> = {
  high: "text-destructive",
  normal: "text-brass",
  low: "text-muted-foreground",
};

/** Admin → Support Inbox: everything users send from Help & Support. */
export function AdminSupportPage() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ tickets: AdminTicket[] }>("/v1/admin/support/tickets")
      .then((d) => {
        if (!cancelled) setTickets(d.tickets);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof ApiError ? `Could not load tickets: ${e.message}` : "Could not load tickets. Is the backend running?");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setStatus(ticket: AdminTicket, status: "open" | "resolved") {
    const previous = tickets;
    setTickets((list) => list.map((t) => (t.id === ticket.id ? { ...t, status } : t)));
    void apiRequest(`/v1/admin/support/tickets/${ticket.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }).catch(() => setTickets(previous));
  }

  const open = tickets.filter((t) => t.status !== "resolved");
  const resolved = tickets.filter((t) => t.status === "resolved");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Support"
        title="Support Inbox"
        description={error ?? "Messages your users sent from Help & Support — newest first. You are also notified in the bell menu when a ticket arrives."}
      />
      {tickets.length === 0 && !error ? (
        <PanelCard label="Inbox">
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Inbox className="size-4" /> No support messages yet.
          </p>
        </PanelCard>
      ) : (
        <div className="space-y-4">
          {[...open, ...resolved].map((t) => (
            <PanelCard key={t.id} label={`#${t.id} · ${t.topic}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", t.status === "resolved" && "text-muted-foreground line-through")}>
                    {t.subject}
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">{t.message}</p>
                  <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
                    {t.user_name} · {t.user_email} · {formatDateTime(t.created_at.replace(" ", "T"))} ·{" "}
                    <span className={PRIORITY_CLASS[t.priority] ?? ""}>{t.priority} priority</span>
                  </p>
                </div>
                <div className="shrink-0">
                  {t.status === "resolved" ? (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setStatus(t, "open")}>
                      <RotateCcw className="size-3.5" />
                      Reopen
                    </Button>
                  ) : (
                    <Button size="sm" className="gap-1.5" onClick={() => setStatus(t, "resolved")}>
                      <CheckCircle2 className="size-3.5" />
                      Mark resolved
                    </Button>
                  )}
                </div>
              </div>
            </PanelCard>
          ))}
        </div>
      )}
    </div>
  );
}
