import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { SeriesPoint } from "@/mocks/admin";

/** Dependency-free vertical bar chart (the dashboard's chart language). */
export function BarChart({
  data,
  height = 128,
  highlightMax = true,
  formatValue = (v: number) => String(v),
}: {
  data: SeriesPoint[];
  height?: number;
  highlightMax?: boolean;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }} role="img" aria-label="Bar chart">
        {data.map((point) => (
          <div key={point.label} className="group relative flex h-full flex-1 items-end">
            <div
              className={cn(
                "w-full rounded-t-[2px] transition-colors",
                highlightMax && point.value === max ? "bg-brass" : "bg-teal/60 group-hover:bg-teal",
              )}
              style={{ height: `${(point.value / max) * 100}%` }}
            />
            <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm border bg-popover px-1.5 py-0.5 font-mono text-[9px] text-popover-foreground opacity-0 transition-opacity group-hover:opacity-100">
              {point.label} · {formatValue(point.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[9px] uppercase tracking-[0.06em] text-muted-foreground">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/** Dependency-free SVG line/area chart — used for revenue. */
export function LineChart({
  data,
  height = 150,
  formatValue = (v: number) => String(v),
}: {
  data: SeriesPoint[];
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = 160;
  const PAD = 8;

  const { points, path, area } = useMemo(() => {
    const max = Math.max(...data.map((d) => d.value), 1);
    const min = Math.min(...data.map((d) => d.value), 0);
    const range = Math.max(max - min, 1);
    const pts = data.map((d, i) => ({
      x: PAD + (i * (W - PAD * 2)) / Math.max(data.length - 1, 1),
      y: H - PAD - ((d.value - min) / range) * (H - PAD * 2),
      point: d,
    }));
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const areaPath = `${line} L${pts[pts.length - 1]?.x ?? W - PAD},${H - PAD} L${PAD},${H - PAD} Z`;
    return { points: pts, path: line, area: areaPath };
  }, [data]);

  const active = hover !== null ? points[hover] : null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ height }}
        className="w-full"
        role="img"
        aria-label="Line chart"
        onMouseLeave={() => setHover(null)}
      >
        <path d={area} fill="var(--color-brass)" opacity="0.12" />
        <path d={path} fill="none" stroke="var(--color-brass)" strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={p.point.label}>
            <rect
              x={p.x - W / data.length / 2}
              y={0}
              width={W / data.length}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={hover === i ? 4 : 2.5}
              fill="var(--color-brass)"
              stroke="var(--color-background)"
              strokeWidth="1.5"
            />
          </g>
        ))}
        {active && (
          <line x1={active.x} y1={PAD} x2={active.x} y2={H - PAD} stroke="var(--color-brass)" strokeDasharray="3 3" opacity="0.4" />
        )}
      </svg>
      <div className="mt-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.06em] text-muted-foreground">
        <span>{data[0]?.label}</span>
        <span className="text-brass">
          {active ? `${active.point.label} · ${formatValue(active.point.value)}` : ""}
        </span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
