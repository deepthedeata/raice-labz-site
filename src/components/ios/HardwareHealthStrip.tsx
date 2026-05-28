import { Database, Cpu, Camera, Cable, Wheat } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHardwareHealth, HealthStatus } from "@/hooks/useHardwareHealth";
import { StatusDot } from "./StatusDot";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  database: Database,
  "grain-db": Wheat,
  models: Cpu,
  camera: Camera,
  modbus: Cable,
};

const dotVariant = (s: HealthStatus): "online" | "warning" | "offline" | "neutral" => {
  if (s === "online") return "online";
  if (s === "warning") return "warning";
  if (s === "offline") return "offline";
  return "neutral";
};

interface HardwareHealthStripProps {
  className?: string;
  compact?: boolean;
}

export function HardwareHealthStrip({ className, compact }: HardwareHealthStripProps) {
  const { checks } = useHardwareHealth();

  return (
    <div
      className={cn(
        "flex items-center gap-2 flex-wrap",
        className,
      )}
    >
      {checks.map((c) => {
        const Icon = ICONS[c.id] ?? Cpu;
        const isFault = c.status === "offline";
        return (
          <div
            key={c.id}
            className={cn(
              "flex items-center gap-2 rounded-full border ios-hairline px-3 py-1.5",
              "transition-colors duration-200",
              compact && "px-2.5 py-1",
              isFault && "ring-1 ring-[hsl(var(--ios-red))]",
            )}
            style={{
              background: isFault
                ? "hsl(var(--ios-red) / 0.1)"
                : "hsl(var(--ios-raised))",
            }}
            title={`${c.label}: ${c.status}`}
          >
            <Icon
              className={cn(
                compact ? "w-3 h-3" : "w-3.5 h-3.5",
                isFault ? "ios-red" : "ios-text-secondary",
              )}
            />
            <span
              className={cn(
                "text-[11px] font-medium",
                isFault ? "ios-red" : "ios-text",
                compact && "text-[10px]",
              )}
            >
              {c.label}
            </span>
            <StatusDot variant={dotVariant(c.status)} size={compact ? 5 : 6} pulse={isFault} />
          </div>
        );
      })}
    </div>
  );
}
