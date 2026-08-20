import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RingMetric {
  key: string;
  label: string;
  value: number | undefined;
  count?: number;
  unit: string;
  max: number;
  /** CSS variable name without leading 'hsl(' wrapper. */
  tokenVar: string;
  /** Optional grade label for the centre slot — overrides numeric display. */
  grade?: string;
}

interface Props {
  metrics: RingMetric[];
  /** Index of the metric to feature in the giant ring. */
  activeIndex: number;
  onChangeIndex: (idx: number) => void;
  size?: number;
  showPercent?: boolean;
}

/**
 * A large Apple-Watch-style ring that shows one selected metric prominently,
 * with left/right chevrons (and dot indicators) so the operator can flick
 * between metrics without moving their gaze.
 */
export function LiveGiantRing({
  metrics,
  activeIndex,
  onChangeIndex,
  size = 280,
  showPercent = true,
}: Props) {
  const [hoverDir, setHoverDir] = useState<"left" | "right" | null>(null);
  const safeIndex = Math.max(0, Math.min(metrics.length - 1, activeIndex));
  const m = metrics[safeIndex];

  const stroke = 22;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const fraction = m && m.value != null ? Math.max(0, Math.min(1, m.value / m.max)) : 0;
  const dashOffset = circumference * (1 - fraction);
  const color = m ? `hsl(var(${m.tokenVar}))` : "hsl(var(--ios-blue))";

  const display = !m
    ? "—"
    : m.grade
      ? m.grade
      : m.value == null
        ? "—"
        : showPercent
          ? m.value.toFixed(1)
          : (m.count ?? 0).toLocaleString();

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        {/* Left chevron */}
        <button
          type="button"
          onClick={() => onChangeIndex(safeIndex === 0 ? metrics.length - 1 : safeIndex - 1)}
          onMouseEnter={() => setHoverDir("left")}
          onMouseLeave={() => setHoverDir(null)}
          aria-label="Previous metric"
          className={cn(
            "absolute -left-2 z-10 w-9 h-9 rounded-full flex items-center justify-center",
            "ios-surface border ios-hairline transition-transform duration-200 ios-spring",
            hoverDir === "left" && "scale-110",
          )}
        >
          <ChevronLeft className="w-4 h-4 ios-text" />
        </button>

        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="hsl(var(--ios-separator))"
              strokeWidth={stroke}
            />
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
              style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.32, 0.72, 0, 1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] ios-text-tertiary mb-2">
              {m?.label ?? "—"}
            </div>
            <div
              className="text-[64px] font-bold ios-text leading-none tabular tracking-[-0.03em]"
              style={{ color: m?.value != null ? color : "hsl(var(--ios-text-tertiary))" }}
            >
              {display}
            </div>
            {!m?.grade && m?.unit && (
              <div className="text-[16px] ios-text-tertiary font-medium mt-1">{m.unit}</div>
            )}
          </div>
        </div>

        {/* Right chevron */}
        <button
          type="button"
          onClick={() => onChangeIndex(safeIndex === metrics.length - 1 ? 0 : safeIndex + 1)}
          onMouseEnter={() => setHoverDir("right")}
          onMouseLeave={() => setHoverDir(null)}
          aria-label="Next metric"
          className={cn(
            "absolute -right-2 z-10 w-9 h-9 rounded-full flex items-center justify-center",
            "ios-surface border ios-hairline transition-transform duration-200 ios-spring",
            hoverDir === "right" && "scale-110",
          )}
        >
          <ChevronRight className="w-4 h-4 ios-text" />
        </button>
      </div>

      {/* Dot indicator */}
      <div className="flex items-center gap-1.5">
        {metrics.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChangeIndex(i)}
            aria-label={`Switch to metric ${i + 1}`}
            className="rounded-full transition-all duration-200 ios-spring"
            style={{
              width: i === safeIndex ? 18 : 6,
              height: 6,
              background:
                i === safeIndex
                  ? `hsl(var(${metrics[i].tokenVar}))`
                  : "hsl(var(--ios-separator))",
            }}
          />
        ))}
      </div>
    </div>
  );
}
