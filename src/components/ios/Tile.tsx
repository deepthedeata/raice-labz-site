import { cn } from "@/lib/utils";
import { ReactNode, HTMLAttributes } from "react";

interface TileProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  padded?: boolean;
}

export function Tile({ children, interactive, padded = true, className, ...rest }: TileProps) {
  return (
    <div
      {...rest}
      className={cn(
        "ios-surface rounded-[18px] border ios-hairline",
        "transition-transform duration-300 ios-spring",
        padded && "p-5",
        interactive && "cursor-pointer hover:scale-[1.015] active:scale-[0.99]",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface TileHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  className?: string;
}

export function TileHeader({ title, subtitle, trailing, className }: TileHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between mb-4", className)}>
      <div>
        <div className="text-[13px] font-semibold ios-text-secondary tracking-wide uppercase">
          {title}
        </div>
        {subtitle && (
          <div className="text-[12px] ios-text-tertiary mt-0.5">{subtitle}</div>
        )}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
