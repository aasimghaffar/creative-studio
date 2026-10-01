import { cn } from "@/lib/utils";
import { PanelCard } from "@/components/common/panel-card";

export interface AdminColumn<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

/** Generic bordered table inside a PanelCard — the workhorse of admin lists. */
export function AdminTable<T extends { id: string | number }>({
  label,
  action,
  columns,
  rows,
  empty = "Nothing here yet.",
}: {
  label: string;
  action?: React.ReactNode;
  columns: AdminColumn<T>[];
  rows: T[];
  empty?: string;
}) {
  return (
    <PanelCard label={label} action={action} contentClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn("whitespace-nowrap eyebrow px-5 py-2.5 text-left text-[9px] font-medium text-muted-foreground", col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b transition-colors last:border-0 hover:bg-accent/40">
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-5 py-3 align-middle", col.className)}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PanelCard>
  );
}

/** Small colored status pill used across admin tables. */
export function StatusPill({ tone, children }: { tone: "teal" | "brass" | "destructive" | "muted"; children: React.ReactNode }) {
  const map = {
    teal: "text-teal border-teal/40",
    brass: "text-brass border-brass/40",
    destructive: "text-destructive border-destructive/40",
    muted: "text-muted-foreground border-border",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em]", map[tone])}>
      {children}
    </span>
  );
}
