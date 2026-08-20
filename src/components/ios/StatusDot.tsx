import { cn } from "@/lib/utils";

type StatusVariant = "online" | "warning" | "offline" | "neutral" | "info";

const variantToken: Record<StatusVariant, string> = {
  online: "var(--ios-green)",
  warning: "var(--ios-orange)",
  offline: "var(--ios-red)",
  neutral: "var(--ios-text-tertiary)",
  info: "var(--ios-blue)",
};

interface StatusDotProps {
  variant?: StatusVariant;
  pulse?: boolean;
  size?: number;
  className?: string;
}

export function StatusDot({ variant = "online", pulse, size = 8, className }: StatusDotProps) {
  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {pulse && (
        <span
          className="ios-pulse absolute inset-0 rounded-full opacity-60"
          style={{ background: `hsl(${variantToken[variant]})` }}
        />
      )}
      <span
        className="relative inline-block rounded-full"
        style={{
          width: size,
          height: size,
          background: `hsl(${variantToken[variant]})`,
          boxShadow: `0 0 0 2px hsl(var(--ios-surface))`,
        }}
      />
    </span>
  );
}
