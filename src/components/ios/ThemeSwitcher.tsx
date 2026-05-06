import { useState } from "react";
import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTheme, ThemeMode, ALL_THEMES, THEME_META } from "./theme-provider";

interface ThemeSwitcherProps {
  className?: string;
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const current = THEME_META[theme];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Theme: ${current.label}`}
          title={current.label}
          className={cn(
            "group h-8 px-2.5 rounded-[10px] border ios-hairline",
            "flex items-center gap-2 text-[12px] font-medium overflow-hidden",
            "hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150 ios-spring",
            className,
          )}
          style={{
            background: "hsl(var(--ios-raised))",
            color: "hsl(var(--ios-text))",
          }}
        >
          <ThemeSwatch theme={theme} size={14} />
          <span
            className={cn(
              "max-w-0 opacity-0 whitespace-nowrap",
              "group-hover:max-w-[160px] group-hover:opacity-100 group-focus-visible:max-w-[160px] group-focus-visible:opacity-100",
              "transition-all duration-200 ios-spring",
            )}
          >
            {current.label}
          </span>
          <Palette className="w-3.5 h-3.5 ios-text-tertiary shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[280px] p-2"
        style={{
          background: "hsl(var(--ios-surface))",
          border: "1px solid hsl(var(--ios-separator))",
        }}
      >
        <div className="px-2 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-wider ios-text-tertiary">
          Theme
        </div>
        <ul className="space-y-0.5">
          {ALL_THEMES.map((mode) => {
            const meta = THEME_META[mode];
            const active = mode === theme;
            return (
              <li key={mode}>
                <button
                  type="button"
                  onClick={() => {
                    setTheme(mode as ThemeMode);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-[10px] px-2.5 py-2",
                    "transition-colors duration-150",
                    active ? "ios-raised" : "hover:ios-raised",
                  )}
                >
                  <ThemeSwatch theme={mode} size={26} />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-[13px] font-semibold ios-text leading-tight flex items-center gap-1.5">
                      {meta.label}
                      {meta.isDark && (
                        <span className="text-[9px] uppercase tracking-wider ios-text-tertiary font-medium">
                          Dark
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] ios-text-tertiary truncate">
                      {meta.description}
                    </div>
                  </div>
                  {active && (
                    <Check
                      className="w-4 h-4 shrink-0"
                      style={{ color: "hsl(var(--accent))" }}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function ThemeSwatch({ theme, size = 18 }: { theme: ThemeMode; size?: number }) {
  const meta = THEME_META[theme];
  return (
    <span
      className="relative inline-block rounded-full overflow-hidden shrink-0"
      style={{
        width: size,
        height: size,
        boxShadow: "inset 0 0 0 1px hsl(var(--ios-separator))",
        background: meta.swatch.canvas,
      }}
    >
      <span
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${meta.swatch.surface} 0%, ${meta.swatch.surface} 50%, ${meta.swatch.accent} 50%, ${meta.swatch.accent} 100%)`,
        }}
      />
    </span>
  );
}
