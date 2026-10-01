import { cn } from "@/lib/utils";
import type { ServiceStatus } from "@/mocks/admin";
import { PanelCard } from "@/components/common/panel-card";

const STATUS_STYLE: Record<ServiceStatus["status"], { dot: string; text: string; label: string }> = {
  operational: { dot: "bg-teal", text: "text-teal", label: "Operational" },
  degraded: { dot: "bg-brass animate-pulse", text: "text-brass", label: "Degraded" },
  down: { dot: "bg-destructive", text: "text-destructive", label: "Down" },
};

/** Platform health: service rows with status, uptime, latency. */
export function SystemStatusCard({ services }: { services: ServiceStatus[] }) {
  const degraded = services.filter((s) => s.status !== "operational").length;
  return (
    <PanelCard
      label="System status"
      contentClassName="p-0"
      action={
        <span className={cn("font-mono text-[10px] tracking-[0.06em]", degraded ? "text-brass" : "text-teal")}>
          {degraded ? `${degraded} DEGRADED` : "ALL SYSTEMS GO"}
        </span>
      }
    >
      {services.map((service, i) => {
        const style = STATUS_STYLE[service.status];
        return (
          <div
            key={service.id}
            className={cn("flex items-center gap-3 px-5 py-3", i !== services.length - 1 && "border-b")}
          >
            <span className={cn("size-2 shrink-0 rounded-full", style.dot)} aria-hidden="true" />
            <p className="min-w-0 flex-1 truncate text-sm">{service.name}</p>
            <span className={cn("font-mono text-[10px] uppercase tracking-[0.04em]", style.text)}>{style.label}</span>
            <span className="hidden w-16 text-right font-mono text-[10px] text-muted-foreground sm:block">{service.uptime}</span>
            <span className="hidden w-16 text-right font-mono text-[10px] text-muted-foreground sm:block">{service.latency}</span>
          </div>
        );
      })}
    </PanelCard>
  );
}
