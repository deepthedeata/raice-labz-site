import { cn } from "@/lib/utils";

export interface TimelinePoint {
  time: number;
  headRice: number;
  broken: number;
  chalky?: number;
  rejections?: number;
  whitenessIndex?: number;
}

interface Props {
  data: TimelinePoint[];
  /** Window in seconds — visual axis. Defaults to 60. */
  windowSec?: number;
  height?: number;
  className?: string;
}

interface SeriesDef {
  key: keyof TimelinePoint;
  label: string;
  color: string;
}

const SERIES: SeriesDef[] = [
  { key: "headRice", label: "Head", color: "hsl(var(--ios-green))" },
  { key: "broken", label: "Broken", color: "hsl(var(--ios-red))" },
  { key: "whitenessIndex", label: "WI", color: "hsl(var(--accent))" },
];

/**
 * 60-second rolling line chart for the live session. Renders as thin lines
 * with subtle area fills underneath. Pure SVG — no chart library — so it's
 * cheap on every tick.
 */
export function LiveTimeline({ data, windowSec = 60, height = 110, className }: Props) {
  const width = 800; // viewBox width — actual width comes from container
  const padX = 8;
  const padY = 8;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  if (!data || data.length < 2) {
    return (
      <div
        className={cn("ios-surface border ios-hairline rounded-[14px] flex items-center justify-center", className)}
        style={{ height }}
      >
        <span className="text-[12px] ios-text-tertiary">Waiting for live data…</span>
      </div>
    );
  }

  // Trim to the window
  const tNow = data[data.length - 1].time;
  const tStart = tNow - windowSec * 1000;
  const visible = data.filter((p) => p.time >= tStart);

  const buildPath = (key: keyof TimelinePoint) => {
    const pts = visible
      .map((p) => {
        const v = p[key] as number | undefined;
        if (v == null || isNaN(v)) return null;
        const x = padX + ((p.time - tStart) / (windowSec * 1000)) * chartW;
        const max = key === "whitenessIndex" ? 50 : 100;
        const y = padY + chartH - Math.max(0, Math.min(1, v / max)) * chartH;
        return [x, y] as const;
      })
      .filter(Boolean) as Array<readonly [number, number]>;
    if (pts.length === 0) return { line: "", area: "" };
    const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${(padY + chartH).toFixed(1)} L ${pts[0][0].toFixed(1)} ${(padY + chartH).toFixed(1)} Z`;
    return { line, area };
  };

  return (
    <div
      className={cn("ios-surface border ios-hairline rounded-[14px] p-3", className)}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[11px] uppercase tracking-wider font-semibold ios-text-tertiary">
          Last {windowSec}s
        </div>
        <div className="flex items-center gap-3">
          {SERIES.map((s) => (
            <div key={s.key as string} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-1 rounded-full"
                style={{ background: s.color }}
              />
              <span className="text-[10px] ios-text-secondary font-medium">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        <defs>
          {SERIES.map((s) => (
            <linearGradient key={s.key as string} id={`live-fill-${s.key as string}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {/* Subtle horizontal grid */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={padX}
            x2={width - padX}
            y1={padY + chartH * f}
            y2={padY + chartH * f}
            stroke="hsl(var(--ios-separator))"
            strokeWidth={1}
            strokeDasharray="2 4"
            opacity={0.5}
          />
        ))}

        {SERIES.map((s) => {
          const { line, area } = buildPath(s.key);
          return (
            <g key={s.key as string}>
              {area && <path d={area} fill={`url(#live-fill-${s.key as string})`} />}
              {line && <path d={line} fill="none" stroke={s.color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
