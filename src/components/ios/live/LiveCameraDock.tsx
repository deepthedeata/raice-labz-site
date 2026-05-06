import { Camera, ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw, AlertCircle } from "lucide-react";
import { StatusDot } from "@/components/ios/StatusDot";
import { cn } from "@/lib/utils";

interface Props {
  /** Callback that receives the <video> element so the parent can attach the WebRTC stream. */
  videoRef: (el: HTMLVideoElement | null) => void;
  webrtcConnected: boolean;
  webrtcError?: string | null;
  cameraFps?: number;
  detectionsPerFrame?: number;
  isFullscreen: boolean;
  videoZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFullscreenToggle: () => void;
  onZoomReset: () => void;
  className?: string;
}

/**
 * iOS-styled camera card. Wraps the WebRTC <video> element with a rounded
 * frame, status overlays (connection, fps, detections), and floating zoom
 * controls. Logic is owned by the parent — this component is purely visual.
 */
export function LiveCameraDock({
  videoRef,
  webrtcConnected,
  webrtcError,
  cameraFps,
  detectionsPerFrame,
  isFullscreen,
  videoZoom,
  onZoomIn,
  onZoomOut,
  onFullscreenToggle,
  onZoomReset,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "ios-surface border ios-hairline rounded-[18px] overflow-hidden",
        "relative aspect-video",
        className,
      )}
    >
      {/* Video container */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(var(--ios-canvas)), hsl(var(--ios-raised)))" }}>
        {webrtcConnected ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: `scale(${videoZoom})`, transition: "transform 200ms cubic-bezier(0.32, 0.72, 0, 1)" }}
          />
        ) : webrtcError ? (
          <div className="flex flex-col items-center gap-2 text-center px-6">
            <AlertCircle className="w-7 h-7" style={{ color: "hsl(var(--ios-red))" }} />
            <div className="text-[14px] font-semibold ios-text">Camera unavailable</div>
            <div className="text-[12px] ios-text-tertiary max-w-[280px]">{webrtcError}</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "hsl(var(--ios-raised))", border: "1px solid hsl(var(--ios-separator))" }}
            >
              <Camera className="w-7 h-7 ios-text-secondary" />
            </div>
            <div className="text-[14px] font-semibold ios-text">Connecting camera…</div>
          </div>
        )}
      </div>

      {/* Top-left status pill */}
      <div
        className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
        style={{
          background: "hsl(var(--ios-surface) / 0.78)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <StatusDot variant={webrtcConnected ? "online" : webrtcError ? "offline" : "warning"} pulse={webrtcConnected} size={6} />
        <span className="text-[10px] font-semibold uppercase tracking-wider ios-text">
          {webrtcConnected ? "Live" : webrtcError ? "Error" : "Connecting"}
        </span>
      </div>

      {/* Top-right metrics pills */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <MetaPill label={`${(cameraFps ?? 0).toFixed(0)} fps`} />
        <MetaPill label={`${(detectionsPerFrame ?? 0).toFixed(1)}/f`} />
      </div>

      {/* Bottom-right zoom controls */}
      <div
        className="absolute bottom-3 right-3 flex items-center gap-1 p-1 rounded-full"
        style={{
          background: "hsl(var(--ios-surface) / 0.78)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid hsl(var(--ios-separator))",
        }}
      >
        <ZoomBtn onClick={onZoomOut} aria-label="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></ZoomBtn>
        <span className="text-[10px] font-semibold ios-text tabular px-1 min-w-[32px] text-center">
          {(videoZoom * 100).toFixed(0)}%
        </span>
        <ZoomBtn onClick={onZoomIn} aria-label="Zoom in"><ZoomIn className="w-3.5 h-3.5" /></ZoomBtn>
        <ZoomBtn onClick={onZoomReset} aria-label="Reset zoom"><RotateCcw className="w-3.5 h-3.5" /></ZoomBtn>
        <ZoomBtn onClick={onFullscreenToggle} aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </ZoomBtn>
      </div>
    </div>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <span
      className="text-[10px] font-semibold tabular ios-text px-2 py-0.5 rounded-full"
      style={{
        background: "hsl(var(--ios-surface) / 0.78)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {label}
    </span>
  );
}

function ZoomBtn({
  children,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-7 h-7 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-150 ios-spring ios-text"
      {...rest}
    >
      {children}
    </button>
  );
}
