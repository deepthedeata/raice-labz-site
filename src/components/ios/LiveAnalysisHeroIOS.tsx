import { useTheme } from "./theme-provider";
import { Tile } from "./Tile";
import { StatusDot } from "./StatusDot";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { Play, Pause, Activity, Camera, Cpu } from "lucide-react";

interface Props {
  /** Whether the session is currently running (started, not stopped). */
  isRunning?: boolean;
  /** Whether the running session is currently paused. */
  isPaused?: boolean;
  /** Total grains detected so far. */
  totalGrains?: number;
  /** Live whiteness index (0–50). */
  whitenessIndex?: number;
  /** Live head-rice percentage (0–100). */
  headRicePercent?: number;
  /** Live broken-grain percentage (0–100). */
  brokenPercent?: number;
  /** Camera FPS reported by the backend. */
  cameraFps?: number;
  /** Detections per frame from the model. */
  detectionsPerFrame?: number;
  /** Whether the WebRTC video stream is connected. */
  webrtcConnected?: boolean;
  /** Whether the socket.io statistics channel is connected. */
  socketConnected?: boolean;
}

/**
 * iOS-style summary banner shown above the existing Live Analysis layout.
 * Render-only (no controls) — the existing UI below remains the source of
 * truth for everything else. Returns null on classic theme so the legacy
 * page is untouched in that mode.
 */
export function LiveAnalysisHeroIOS({
  isRunning,
  isPaused,
  totalGrains = 0,
  whitenessIndex,
  headRicePercent,
  brokenPercent,
  cameraFps,
  detectionsPerFrame,
  webrtcConnected,
  socketConnected,
}: Props) {
  const { isClassic } = useTheme();
  if (isClassic) return null;

  const animatedTotal = useAnimatedNumber(totalGrains, { duration: 400 });

  const status = !isRunning
    ? { variant: "neutral" as const, label: "Idle", color: "hsl(var(--ios-text-tertiary))" }
    : isPaused
      ? { variant: "warning" as const, label: "Paused", color: "hsl(var(--ios-orange))" }
      : { variant: "online" as const, label: "Running", color: "hsl(var(--ios-green))" };

  const wiFraction = whitenessIndex != null ? Math.max(0, Math.min(1, whitenessIndex / 50)) : 0;
  const wiSize = 140;
  const wiStroke = 12;
  const wiR = (wiSize - wiStroke) / 2;
  const wiCircumference = 2 * Math.PI * wiR;
  const wiOffset = wiCircumference * (1 - wiFraction);
  const wiColor = whitenessIndex == null
    ? "hsl(var(--ios-text-tertiary))"
    : whitenessIndex >= 45
      ? "hsl(var(--ios-green))"
      : whitenessIndex >= 40
        ? "hsl(var(--accent))"
        : whitenessIndex >= 35
          ? "hsl(var(--ios-orange))"
          : "hsl(var(--ios-red))";

  return (
    <div className="px-6 pt-6 pb-2">
      <Tile padded={false} className="overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-6 items-center p-5">
          {/* Whiteness ring (Apple Watch style) */}
          <div className="relative flex flex-col items-center">
            <div className="relative" style={{ width: wiSize, height: wiSize }}>
              <svg width={wiSize} height={wiSize} viewBox={`0 0 ${wiSize} ${wiSize}`} className="-rotate-90">
                <circle
                  cx={wiSize / 2}
                  cy={wiSize / 2}
                  r={wiR}
                  fill="none"
                  stroke="hsl(var(--ios-separator))"
                  strokeWidth={wiStroke}
                />
                <circle
                  cx={wiSize / 2}
                  cy={wiSize / 2}
                  r={wiR}
                  fill="none"
                  stroke={wiColor}
                  strokeWidth={wiStroke}
                  strokeLinecap="round"
                  strokeDasharray={wiCircumference}
                  strokeDashoffset={wiOffset}
                  style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.32, 0.72, 0, 1)" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-[28px] font-bold ios-text leading-none tabular tracking-tight">
                  {whitenessIndex != null ? whitenessIndex.toFixed(1) : "—"}
                </div>
                <div className="text-[9px] uppercase tracking-[0.18em] font-semibold ios-text-tertiary mt-1">
                  Whiteness
                </div>
              </div>
            </div>
          </div>

          {/* Headline column */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <StatusDot variant={status.variant} pulse={status.variant === "online"} size={8} />
              <span className="text-[12px] uppercase tracking-[0.16em] font-semibold ios-text-secondary">
                {status.label}
              </span>
            </div>
            <div className="text-[44px] font-bold ios-text leading-none tabular tracking-tight">
              {Math.round(animatedTotal).toLocaleString()}
              <span className="text-[16px] ios-text-tertiary font-medium ml-2">grains</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 max-w-[420px]">
              <MiniMetric label="Head rice" value={headRicePercent} unit="%" tokenVar="--grain-head" />
              <MiniMetric label="Broken" value={brokenPercent} unit="%" tokenVar="--grain-broken" />
            </div>
          </div>

          {/* Right column — connection status */}
          <div className="flex flex-col gap-2 min-w-[160px]">
            <ConnPill
              icon={<Camera className="w-3.5 h-3.5" />}
              label="Camera"
              detail={cameraFps ? `${cameraFps.toFixed(0)} fps` : "—"}
              connected={!!webrtcConnected}
            />
            <ConnPill
              icon={<Cpu className="w-3.5 h-3.5" />}
              label="Detector"
              detail={detectionsPerFrame ? `${detectionsPerFrame.toFixed(1)}/frame` : "—"}
              connected={!!socketConnected && !!isRunning}
            />
            <ConnPill
              icon={<Activity className="w-3.5 h-3.5" />}
              label="Stream"
              detail={socketConnected ? "Live" : "Offline"}
              connected={!!socketConnected}
            />
          </div>
        </div>

        {/* Running session bar pulse */}
        {isRunning && !isPaused && (
          <div
            className="h-1 relative overflow-hidden"
            style={{ background: "hsl(var(--ios-separator))" }}
          >
            <div
              className="absolute inset-y-0 w-1/3 ios-pulse"
              style={{
                background: "linear-gradient(90deg, transparent, hsl(var(--ios-green)), transparent)",
              }}
            />
          </div>
        )}
        {isRunning && isPaused && (
          <div
            className="h-1"
            style={{ background: "hsl(var(--ios-orange))" }}
          />
        )}
      </Tile>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  unit,
  tokenVar,
}: {
  label: string;
  value: number | undefined;
  unit: string;
  tokenVar: string;
}) {
  const color = `hsl(var(${tokenVar}))`;
  const display = value != null && !isNaN(value) ? value.toFixed(1) : "—";
  return (
    <div className="ios-raised border ios-hairline rounded-[10px] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider font-semibold ios-text-tertiary">
        {label}
      </div>
      <div className="text-[20px] font-bold ios-text leading-none tabular mt-0.5" style={{ color }}>
        {display}
        <span className="text-[11px] ios-text-tertiary font-medium ml-0.5">{unit}</span>
      </div>
    </div>
  );
}

function ConnPill({
  icon,
  label,
  detail,
  connected,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  connected: boolean;
}) {
  return (
    <div className="flex items-center gap-2 ios-raised border ios-hairline rounded-[10px] px-3 py-1.5">
      <span className={connected ? "ios-text" : "ios-text-tertiary"}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold ios-text leading-tight">{label}</div>
        <div className="text-[10px] ios-text-tertiary tabular">{detail}</div>
      </div>
      <StatusDot variant={connected ? "online" : "offline"} size={6} />
    </div>
  );
}

export default LiveAnalysisHeroIOS;
