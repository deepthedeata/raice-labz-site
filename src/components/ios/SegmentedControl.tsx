import { cn } from "@/lib/utils";

interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  segments: Segment<T>[];
  size?: "sm" | "md";
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  segments,
  size = "md",
  className,
}: SegmentedControlProps<T>) {
  const padY = size === "sm" ? "py-1" : "py-1.5";
  const padX = size === "sm" ? "px-3" : "px-4";
  const text = size === "sm" ? "text-[12px]" : "text-[13px]";

  return (
    <div
      className={cn(
        "inline-flex rounded-[10px] p-0.5",
        "ios-raised border ios-hairline",
        className,
      )}
      role="tablist"
    >
      {segments.map((seg) => {
        const active = seg.value === value;
        return (
          <button
            key={seg.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(seg.value)}
            className={cn(
              "rounded-[8px] font-medium transition-all duration-200 ios-spring",
              "flex items-center gap-1.5 justify-center",
              padX,
              padY,
              text,
              active
                ? "ios-surface ios-text shadow-sm"
                : "ios-text-secondary hover:ios-text",
            )}
          >
            {seg.icon}
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
