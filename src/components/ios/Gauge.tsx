import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface RingGaugeProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  unit?: string;
  format?: (v: number) => string;
  centerSlot?: ReactNode;
  className?: string;
}

/**
 * Apple Watch-style activity ring. Drawn as a full circle (270° for visual
 * breathing room), the value arc sweeps from 12 o'clock clockwise.
 */
export function RingGauge({
  value,
  max = 100,
  size = 220,
  strokeWidth = 18,
  color = "hsl(var(--ios-blue))",
  trackColor = "hsl(var(--ios-separator))",
  label,
  unit,
  format,
  centerSlot,
  className,
}: RingGaugeProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const dashOffset = circumference * (1 - pct);

  const display = format ? format(value) : value.toFixed(1);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: "stroke-dashoffset 700ms cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {centerSlot ?? (
          <>
            <div className="text-[44px] font-bold tabular ios-text leading-none tracking-tight">
              {display}
              {unit && <span className="text-[20px] ios-text-tertiary font-medium ml-1">{unit}</span>}
            </div>
            {label && (
              <div className="text-[12px] uppercase tracking-wider ios-text-secondary mt-2 font-semibold">
                {label}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface MiniRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  unit?: string;
}

/** Smaller version for stat tiles. */
export function MiniRing({
  value,
  max = 100,
  size = 72,
  strokeWidth = 8,
  color = "hsl(var(--ios-blue))",
  label,
  unit,
}: MiniRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const dashOffset = circumference * (1 - pct);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--ios-separator))" strokeWidth={strokeWidth} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.32, 0.72, 0, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[15px] font-semibold tabular ios-text leading-none">
          {value.toFixed(1)}
          {unit && <span className="text-[10px] ios-text-tertiary ml-0.5">{unit}</span>}
        </div>
        {label && (
          <div className="text-[9px] uppercase tracking-wide ios-text-tertiary mt-1 font-medium">
            {label}
          </div>
        )}
      </div>
    </div>
  );
}
