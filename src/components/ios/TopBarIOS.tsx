import { Search, User } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { StatusDot } from "./StatusDot";
import { useCommandPalette } from "./CommandPalette";
import { AppBranding } from "@/components/AppBranding";
import { cn } from "@/lib/utils";

interface TopBarIOSProps {
  /** Optional page title. Omit to render a bare topbar with only the right-side controls. */
  title?: string;
  subtitle?: string;
  className?: string;
}

export function TopBarIOS({ title, subtitle, className }: TopBarIOSProps) {
  const { setOpen } = useCommandPalette();
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform);
  return (
    <header
      className={cn(
        "ios-glass border-b ios-hairline",
        "h-14 px-6 flex items-center justify-between gap-4",
        "sticky top-0 z-30",
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          {title && (
            <h1 className="text-[17px] font-semibold ios-text leading-tight tracking-tight truncate">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-[12px] ios-text-tertiary truncate -mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeSwitcher />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open command palette"
          title="Search & jump (⌘K / Ctrl-K)"
          className={cn(
            "h-8 px-3 rounded-[10px] border ios-hairline ios-raised",
            "flex items-center gap-2 ios-text-secondary cursor-pointer",
            "hover:ios-text hover:scale-[1.02] active:scale-[0.98]",
            "transition-all duration-150 ios-spring",
          )}
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-[12px]">Search</span>
          <kbd className="text-[10px] ios-text-tertiary border ios-hairline rounded px-1 py-0.5 ml-1">
            {isMac ? "⌘K" : "Ctrl K"}
          </kbd>
        </button>

        <div className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border ios-hairline ios-raised">
          <StatusDot variant="online" pulse size={7} />
          <span className="text-[12px] font-medium ios-text">Online</span>
        </div>
        <AppBranding className="max-w-[220px] hidden sm:flex" />
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center hidden sm:flex"
          style={{ background: "hsl(var(--primary))" }}
        >
          <User className="w-5 h-5" style={{ color: "hsl(var(--primary-foreground))" }} />
        </div>
      </div>
    </header>
  );
}
