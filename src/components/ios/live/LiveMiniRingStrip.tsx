import { cn } from "@/lib/utils";
import { RingMetric } from "./LiveGiantRing";

interface Props {
  metrics: RingMetric[];
  activeIndex: number;
  onSelect: (idx: number) => void;
  showPercent?: boolean;
  className?: string;
}

/**
 * Horizontally scrolling strip of small rings — one per metric. Tap a tile
 * to feature that metric in the giant ring. Active tile has a halo.
 */
export function LiveMiniRingStrip({ metrics, activeIndex, onSelect, showPercent = true, className }: Props) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory", className)}>
      {metrics.map((m, i) => (
        <MiniTile
          key={m.key}
          metric={m}
          active={i === activeIndex}
          onClick={() => onSelect(i)}
          showPercent={showPercent}
        />
      ))}
    </div>
  );
}

function MiniTile({
  metric,
  active,
  onClick,
  showPercent,
}: {
  metric: RingMetric;
  active: boolean;
  onClick: () => void;
  showPercent: boolean;
}) {
  const size = 64;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const fraction = metric.value != null ? Math.max(0, Math.min(1, metric.value / metric.max)) : 0;
  const dashOffset = circumference * (1 - fraction);
  const color = `hsl(var(${metric.tokenVar}))`;

  const display =
    metric.grade ??
    (metric.value == null
      ? "—"
      : showPercent
        ? metric.value.toFixed(1)
        : (metric.count ?? 0).toLocaleString());

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 snap-start ios-surface border ios-hairline rounded-[14px] p-3",
        "flex flex-col items-center gap-1.5",
        "transition-all duration-200 ios-spring hover:scale-[1.04] active:scale-[0.96]",
        active && "ring-2",
      )}
      style={
        active
          ? { boxShadow: `0 0 0 2px ${color} inset, 0 4px 14px hsl(var(${metric.tokenVar}) / 0.18)` }
          : undefined
      }
      aria-pressed={active}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--ios-separator))" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.32, 0.72, 0, 1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-[12px] font-bold ios-text tabular leading-none"
            style={{ color: metric.value != null ? color : "hsl(var(--ios-text-tertiary))" }}
          >
            {display}
          </span>
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-wider font-semibold ios-text-secondary text-center max-w-[70px] truncate">
        {metric.label}
      </div>
    </button>
  );
}
