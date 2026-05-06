import { Clock } from "lucide-react";
import { StatusDot } from "@/components/ios/StatusDot";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";

interface Props {
  modeId?: string;
  variety?: string;
  process?: string;
  isRunning: boolean;
  isPaused: boolean;
  totalGrains: number;
  elapsedSec: number;
}

const formatVariety = (v?: string) => {
  if (!v) return "";
  const s = v.trim();
  if (s.length === 3) return s.toUpperCase();
  return s.toLowerCase().replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const fmtElapsed = (sec: number): string => {
  if (sec <= 0) return "00:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/**
 * Identity strip rendered above the giant ring on iOS Live Analysis.
 * Big total grain count (animated), variety + process tag, status pill,
 * elapsed timer.
 */
export function LiveStatHeader({
  modeId,
  variety,
  process,
  isRunning,
  isPaused,
  totalGrains,
  elapsedSec,
}: Props) {
  const animated = useAnimatedNumber(totalGrains, { duration: 350 });
  const status = !isRunning
    ? { variant: "neutral" as const, label: "Idle" }
    : isPaused
      ? { variant: "warning" as const, label: "Paused" }
      : { variant: "online" as const, label: "Running" };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <StatusDot variant={status.variant} pulse={status.variant === "online"} size={8} />
        <span className="text-[12px] uppercase tracking-[0.16em] font-semibold ios-text-secondary">
          {status.label}
        </span>
        {modeId && (
          <span className="text-[11px] font-mono ios-text-tertiary px-2 py-0.5 rounded-full ios-raised border ios-hairline">
            {modeId}
          </span>
        )}
        {variety && (
          <span className="text-[11px] font-semibold ios-text px-2 py-0.5 rounded-full ios-raised border ios-hairline">
            {formatVariety(variety)}
          </span>
        )}
        {process && (
          <span className="text-[11px] font-semibold ios-text-secondary px-2 py-0.5 rounded-full ios-raised border ios-hairline">
            {process}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-wider font-semibold ios-text-tertiary mb-1">
            Total grains
          </div>
          <div className="text-[44px] font-bold ios-text leading-none tabular tracking-tight">
            {Math.round(animated).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-2 ios-raised border ios-hairline rounded-[12px] px-3 py-2">
          <Clock className="w-4 h-4 ios-text-secondary" />
          <span className="text-[14px] font-semibold ios-text tabular">{fmtElapsed(elapsedSec)}</span>
        </div>
      </div>
    </div>
  );
}
