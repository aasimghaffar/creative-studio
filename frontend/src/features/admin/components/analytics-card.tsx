import { PanelCard } from "@/components/common/panel-card";

/** Chart panel with a lead stat + mono context label. */
export function AnalyticsCard({
  label,
  headline,
  sub,
  action,
  children,
  className,
}: {
  label: string;
  headline?: string;
  sub?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <PanelCard label={label} action={action} className={className}>
      {(headline || sub) && (
        <div className="mb-4">
          {headline && <p className="font-display text-2xl font-medium tabular-nums">{headline}</p>}
          {sub && <p className="eyebrow mt-0.5 text-[9px] text-muted-foreground">{sub}</p>}
        </div>
      )}
      {children}
    </PanelCard>
  );
}
