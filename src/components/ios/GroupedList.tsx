import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { ReactNode, HTMLAttributes } from "react";

interface GroupedListProps {
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function GroupedList({ title, footer, children, className }: GroupedListProps) {
  return (
    <section className={cn("space-y-2", className)}>
      {title && (
        <div className="px-4 text-[12px] font-semibold uppercase tracking-wider ios-text-tertiary">
          {title}
        </div>
      )}
      <div className="ios-surface rounded-[14px] border ios-hairline overflow-hidden">
        <ul className="divide-y ios-hairline">{children}</ul>
      </div>
      {footer && (
        <div className="px-4 text-[12px] ios-text-tertiary">{footer}</div>
      )}
    </section>
  );
}

interface GroupedRowProps extends Omit<HTMLAttributes<HTMLLIElement>, "title"> {
  icon?: ReactNode;
  iconBg?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
}

export function GroupedRow({
  icon,
  iconBg = "hsl(var(--ios-blue))",
  title,
  subtitle,
  trailing,
  chevron,
  onClick,
  className,
  ...rest
}: GroupedRowProps) {
  const interactive = Boolean(onClick) || chevron;
  return (
    <li
      {...rest}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors duration-150",
        interactive && "cursor-pointer hover:ios-raised active:ios-raised",
        className,
      )}
    >
      {icon !== undefined && (
        <div
          className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 text-white"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[15px] ios-text leading-tight truncate">{title}</div>
        {subtitle && (
          <div className="text-[12px] ios-text-secondary mt-0.5 truncate">{subtitle}</div>
        )}
      </div>
      {trailing && (
        <div className="text-[14px] ios-text-secondary tabular shrink-0">{trailing}</div>
      )}
      {chevron && <ChevronRight className="w-4 h-4 ios-text-tertiary shrink-0" />}
    </li>
  );
}
