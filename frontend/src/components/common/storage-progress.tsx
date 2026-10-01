import type { StorageUsage } from "@/mocks/storage-usage";
import { formatGb } from "@/lib/format-bytes";

/** Stacked storage bar + breakdown (the dashboard Storage card language). */
export function StorageProgress({ storage, compact = false }: { storage: StorageUsage; compact?: boolean }) {
  const pct = Math.min((storage.usedGb / storage.totalGb) * 100, 100);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className={compact ? "text-sm font-medium tabular-nums" : "font-display text-2xl font-medium tabular-nums"}>
          {formatGb(storage.usedGb)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">of {storage.totalGb} GB</span>
        </p>
        <span className="shrink-0 whitespace-nowrap font-mono text-[11px] text-muted-foreground">{pct.toFixed(0)}% used</span>
      </div>
      <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {storage.breakdown.map((item) => (
          <div key={item.label} className={item.colorClass} style={{ width: `${(item.sizeGb / storage.totalGb) * 100}%` }} />
        ))}
      </div>
      {!compact && (
        <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 min-[420px]:grid-cols-2 sm:grid-cols-4">
          {storage.breakdown.map((item) => (
            <li key={item.label} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className={`size-1.5 rounded-full ${item.colorClass}`} aria-hidden="true" />
                {item.label}
              </span>
              <span className="shrink-0 whitespace-nowrap font-mono tabular-nums">{formatGb(item.sizeGb)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
