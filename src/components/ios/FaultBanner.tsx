import { AlertTriangle } from "lucide-react";
import { useHardwareHealth } from "@/hooks/useHardwareHealth";

/**
 * Sticky banner shown when one or more hardware subsystems are offline.
 * Sits below the topbar. Quietly hides itself when everything is healthy.
 */
export function FaultBanner() {
  const { checks, hasFault } = useHardwareHealth();
  if (!hasFault) return null;

  const offline = checks.filter((c) => c.status === "offline").map((c) => c.label);

  return (
    <div
      className="px-6 py-2 flex items-center gap-3 border-b ios-hairline"
      style={{
        background: "hsl(var(--ios-red) / 0.1)",
        color: "hsl(var(--ios-red))",
      }}
      role="alert"
    >
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <div className="text-[12px] font-semibold">
        Hardware fault — {offline.join(", ")} {offline.length === 1 ? "is" : "are"} offline.
      </div>
      <span className="text-[11px] opacity-80 ml-1">Live analysis may be degraded.</span>
    </div>
  );
}
