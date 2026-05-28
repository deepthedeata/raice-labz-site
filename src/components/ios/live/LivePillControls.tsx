import { Play, Pause, Square, SkipForward, RotateCcw, CheckCircle, Loader2, Percent, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  isRunning: boolean;
  isPaused: boolean;
  isLoading: boolean;
  operationType: "starting" | "stopping" | null;
  canStart: boolean;
  canStop: boolean;
  canPause: boolean;
  showPercent: boolean;
  showRestart?: boolean;
  showSkip?: boolean;
  showComplete?: boolean;
  completeDisabled?: boolean;
  onStartStop: () => void;
  onTogglePause: () => void;
  onRestart?: () => void;
  onSkip?: () => void;
  onComplete?: () => void;
  onTogglePercent: () => void;
  className?: string;
}

/**
 * Bottom action bar with iOS-style pill buttons. Big touch targets for
 * mill-floor use; clearly differentiates primary (Start/Stop) from
 * secondary (Pause/Skip/Complete). All handlers and disabled flags come
 * from the owner — no internal session logic.
 */
export function LivePillControls({
  isRunning,
  isPaused,
  isLoading,
  operationType,
  canStart,
  canStop,
  canPause,
  showPercent,
  showRestart,
  showSkip,
  showComplete,
  completeDisabled,
  onStartStop,
  onTogglePause,
  onRestart,
  onSkip,
  onComplete,
  onTogglePercent,
  className,
}: Props) {
  const startStopLabel = isLoading
    ? operationType === "starting"
      ? "Starting…"
      : "Stopping…"
    : isRunning
      ? "Stop"
      : "Start";
  const startStopIcon = isLoading ? (
    <Loader2 className="w-5 h-5 animate-spin" />
  ) : isRunning ? (
    <Square className="w-5 h-5 fill-current" />
  ) : (
    <Play className="w-5 h-5 fill-current" />
  );
  const startStopColor = isRunning ? "hsl(var(--ios-red))" : "hsl(var(--ios-green))";
  const startStopDisabled = isLoading || (!isRunning && !canStart) || (isRunning && !canStop);

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {/* Primary: Start / Stop */}
      <button
        type="button"
        onClick={onStartStop}
        disabled={startStopDisabled}
        className={cn(
          "h-12 px-6 rounded-full flex items-center gap-2 text-[14px] font-semibold",
          "transition-transform duration-150 ios-spring",
          "hover:scale-[1.02] active:scale-[0.98]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        )}
        style={{
          background: startStopColor,
          color: "white",
          boxShadow: `0 6px 18px ${startStopColor.replace(")", " / 0.3)")}`,
        }}
      >
        {startStopIcon}
        {startStopLabel}
      </button>

      {/* Pause / Resume */}
      <button
        type="button"
        onClick={onTogglePause}
        disabled={!canPause || isLoading}
        className="h-12 px-5 rounded-full flex items-center gap-2 text-[13px] font-semibold border ios-hairline ios-surface ios-text transition-transform duration-150 ios-spring hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        {isPaused ? "Resume" : "Pause"}
      </button>

      {/* Restart */}
      {showRestart && onRestart && (
        <button
          type="button"
          onClick={onRestart}
          disabled={isLoading || !isRunning}
          className="h-12 w-12 rounded-full flex items-center justify-center border ios-hairline ios-surface ios-text transition-transform duration-150 ios-spring hover:scale-[1.05] active:scale-[0.95] disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Restart sample"
          title="Restart sample"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}

      {/* Skip */}
      {showSkip && onSkip && (
        <button
          type="button"
          onClick={onSkip}
          disabled={isLoading}
          className="h-12 px-5 rounded-full flex items-center gap-2 text-[13px] font-semibold border ios-hairline ios-surface ios-text transition-transform duration-150 ios-spring hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <SkipForward className="w-4 h-4" />
          Skip
        </button>
      )}

      {/* Complete */}
      {showComplete && onComplete && (
        <button
          type="button"
          onClick={onComplete}
          disabled={completeDisabled || isLoading}
          className="h-12 px-5 rounded-full flex items-center gap-2 text-[13px] font-semibold transition-transform duration-150 ios-spring hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{
            background: "hsl(var(--accent))",
            color: "hsl(var(--primary-foreground))",
          }}
        >
          <CheckCircle className="w-4 h-4" />
          Complete
        </button>
      )}

      <div className="flex-1" />

      {/* Percent / Count toggle (right side) */}
      <button
        type="button"
        onClick={onTogglePercent}
        className="h-12 px-4 rounded-full flex items-center gap-2 text-[12px] font-semibold border ios-hairline ios-raised ios-text transition-transform duration-150 ios-spring hover:scale-[1.02] active:scale-[0.98]"
        title="Toggle percent / count display"
      >
        {showPercent ? <Percent className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
        {showPercent ? "Percent" : "Count"}
      </button>
    </div>
  );
}
