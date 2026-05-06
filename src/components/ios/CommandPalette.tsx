import { useEffect, useState, createContext, useContext, ReactNode, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  Database,
  ShoppingCart,
  Factory,
  Wheat,
  FileText,
  Settings,
  BookOpen,
  LineChart,
  Server,
  Palette,
  Moon,
  Sun,
  Languages,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useTheme, ALL_THEMES, THEME_META, ThemeMode } from "./theme-provider";
import { useLanguage } from "@/contexts/LanguageContext";

interface CmdCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

const CommandPaletteContext = createContext<CmdCtx | null>(null);

/**
 * Mounts a Cmd/Ctrl-K command palette globally. Other components can call
 * `useCommandPalette()` to imperatively open it (e.g. from the topbar pill).
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const language = useLanguage();

  // Global ⌘K / Ctrl-K shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = useCallback((fn: () => void) => {
    setOpen(false);
    setTimeout(fn, 0);
  }, []);

  const ctx: CmdCtx = {
    open,
    setOpen,
    toggle: () => setOpen((o) => !o),
  };

  const goto = (path: string) => run(() => navigate(path));

  return (
    <CommandPaletteContext.Provider value={ctx}>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, themes, actions…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>

          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => goto("/")} keywords={["console", "home", "dashboard"]}>
              <Home className="mr-2 h-4 w-4" /> Console
              <CommandShortcut>G H</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => goto("/recipes")} keywords={["recipe", "presets", "saved", "favorites"]}>
              <Sparkles className="mr-2 h-4 w-4" /> Recipes
            </CommandItem>
            <CommandItem onSelect={() => goto("/database")}>
              <Database className="mr-2 h-4 w-4" /> Database
            </CommandItem>
            <CommandItem onSelect={() => goto("/grain-database")}>
              <Wheat className="mr-2 h-4 w-4" /> Grain database
            </CommandItem>
            <CommandItem onSelect={() => goto("/machine-database")}>
              <Server className="mr-2 h-4 w-4" /> Machine database
            </CommandItem>
            <CommandItem onSelect={() => goto("/data-reports")}>
              <FileText className="mr-2 h-4 w-4" /> Reports
            </CommandItem>
            <CommandItem onSelect={() => goto("/analytics")}>
              <LineChart className="mr-2 h-4 w-4" /> Analytics
            </CommandItem>
            <CommandItem onSelect={() => goto("/mongodb-viewer")}>
              <Database className="mr-2 h-4 w-4" /> MongoDB viewer
            </CommandItem>
            <CommandItem onSelect={() => goto("/settings")}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </CommandItem>
            <CommandItem onSelect={() => goto("/manuals")}>
              <BookOpen className="mr-2 h-4 w-4" /> Manuals
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Start analysis">
            <CommandItem onSelect={() => goto("/procurement-analysis")} keywords={["paddy", "raw", "intake"]}>
              <ShoppingCart className="mr-2 h-4 w-4" /> Procurement analysis
              <CommandShortcut>
                <ArrowRight className="h-3 w-3" />
              </CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => goto("/production-analysis")} keywords={["machine", "series", "line"]}>
              <Factory className="mr-2 h-4 w-4" /> Production analysis
              <CommandShortcut>
                <ArrowRight className="h-3 w-3" />
              </CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => goto("/milled-rice-analysis")} keywords={["basmati", "polished", "milled"]}>
              <Wheat className="mr-2 h-4 w-4" /> Milled rice analysis
              <CommandShortcut>
                <ArrowRight className="h-3 w-3" />
              </CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Theme">
            {ALL_THEMES.map((t) => {
              const meta = THEME_META[t];
              const active = t === theme;
              return (
                <CommandItem
                  key={t}
                  keywords={[meta.label, meta.description, meta.isDark ? "dark" : "light"]}
                  onSelect={() => run(() => setTheme(t as ThemeMode))}
                >
                  {meta.isDark ? (
                    <Moon className="mr-2 h-4 w-4" />
                  ) : t === "classic" ? (
                    <Palette className="mr-2 h-4 w-4" />
                  ) : (
                    <Sun className="mr-2 h-4 w-4" />
                  )}
                  <span>{meta.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {meta.description}
                  </span>
                  {active && <CommandShortcut>Active</CommandShortcut>}
                </CommandItem>
              );
            })}
          </CommandGroup>

          {language && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Language">
                <CommandItem onSelect={() => run(() => language.setLanguage("en"))}>
                  <Languages className="mr-2 h-4 w-4" /> English
                  {language.language === "en" && <CommandShortcut>Active</CommandShortcut>}
                </CommandItem>
                <CommandItem onSelect={() => run(() => language.setLanguage("kn"))}>
                  <Languages className="mr-2 h-4 w-4" /> ಕನ್ನಡ (Kannada)
                  {language.language === "kn" && <CommandShortcut>Active</CommandShortcut>}
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used inside <CommandPaletteProvider>");
  return ctx;
}
