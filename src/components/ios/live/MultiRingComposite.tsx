import { useState } from "react";
import { cn } from "@/lib/utils";

export interface RingDef {
  key: string;
  label: string;
  value: number | undefined;
  max: number;
  /** CSS variable name without the leading 'hsl(' wrapper. */
  tokenVar: string;
  unit?: string;
  /** Optional subtitle shown below the value when this ring is featured. */
  subtitle?: string;
}

interface Props {
  /** Three rings in outer→inner order. The first index is the outermost. */
  rings: [RingDef, RingDef, RingDef];
  size?: number;
  /** Initially-featured ring index (centre text). */
  initialFeatured?: 0 | 1 | 2;
  className?: string;
}

/**
 * Apple Health-style multi-ring composite: three concentric arcs that
 * sweep from 12 o'clock clockwise, each with its own colour and value.
 * Hovering a ring features it in the centre; clicking persists the
 * featured choice. The centre slot shows the featured metric in big
 * tabular numerals.
 */
export function MultiRingComposite({
  rings,
  size = 280,
  initialFeatured = 0,
  className,
}: Props) {
  const [featured, setFeatured] = useState<number>(initialFeatured);
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? featured;
  const m = rings[active];

  const stroke = 16;
  const gap = 6;
  // Outer ring radius then inset by stroke + gap per inner ring
  const radii = [
    (size - stroke) / 2,
    (size - stroke) / 2 - (stroke + gap),
    (size - stroke) / 2 - 2 * (stroke + gap),
  ];

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {rings.map((ring, i) => {
            const r = radii[i];
            const c = 2 * Math.PI * r;
            const f = ring.value != null ? Math.max(0, Math.min(1, ring.value / ring.max)) : 0;
            const off = c * (1 - f);
            const color = `hsl(var(${ring.tokenVar}))`;
            return (
              <g
                key={ring.key}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setFeatured(i)}
                style={{ cursor: "pointer" }}
              >
                {/* Track */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke="hsl(var(--ios-separator))"
                  strokeWidth={stroke}
                />
                {/* Value arc */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={off}
                  style={{
                    transition: "stroke-dashoffset 700ms cubic-bezier(0.32, 0.72, 0, 1)",
                    filter: i === active ? `drop-shadow(0 0 6px ${color})` : "none",
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* Centre slot */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[11px] uppercase tracking-[0.16em] font-semibold ios-text-tertiary mb-1">
            {m.label}
          </div>
          <div
            className="text-[52px] font-bold ios-text leading-none tabular tracking-[-0.03em]"
            style={{ color: m.value != null ? `hsl(var(${m.tokenVar}))` : "hsl(var(--ios-text-tertiary))" }}
          >
            {m.value != null ? m.value.toFixed(1) : "—"}
            {m.unit && (
              <span className="text-[18px] ios-text-tertiary font-medium ml-1">{m.unit}</span>
            )}
          </div>
          {m.subtitle && (
            <div className="text-[11px] ios-text-tertiary font-medium mt-1.5 max-w-[220px] text-center">
              {m.subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Legend / dot picker */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        {rings.map((ring, i) => {
          const isActive = i === featured;
          return (
            <button
              key={ring.key}
              type="button"
              onClick={() => setFeatured(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2 py-1",
                "transition-all duration-200 ios-spring",
                isActive ? "ios-raised" : "hover:ios-raised",
              )}
              aria-pressed={isActive ? "true" : "false"}
            >
              <span
                className="inline-block rounded-full"
                style={{
                  width: isActive ? 14 : 8,
                  height: 8,
                  background: `hsl(var(${ring.tokenVar}))`,
                  transition: "width 200ms cubic-bezier(0.32, 0.72, 0, 1)",
                }}
              />
              <span
                className="text-[11px] font-semibold ios-text"
                style={{ opacity: isActive ? 1 : 0.7 }}
              >
                {ring.label}
              </span>
              <span className="text-[11px] ios-text-tertiary tabular">
                {ring.value != null ? ring.value.toFixed(1) : "—"}
                {ring.unit ?? ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
