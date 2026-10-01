import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface DashboardCardProps {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * Shared shell for dashboard cards: mono eyebrow header, hairline divider,
 * consistent padding — the prototype's panel language.
 */
export function DashboardCard({ label, action, children, className, contentClassName }: DashboardCardProps) {
  return (
    <Card className={cn("flex h-full flex-col overflow-hidden rounded-md shadow-none", className)}>
      <div className="flex h-11 shrink-0 items-center justify-between border-b px-5">
        <p className="eyebrow text-[10px] text-muted-foreground">{label}</p>
        {action}
      </div>
      <div className={cn("flex-1 p-5", contentClassName)}>{children}</div>
    </Card>
  );
}
