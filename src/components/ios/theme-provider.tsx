import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeMode =
  | "classic"
  | "apit"
  | "kuber"
  | "light"
  | "apple"
  | "salesforce"
  | "slack"
  | "notion"
  | "nord"
  | "linear";

/**
 * Themes exposed to the picker. The other variants (light, notion, salesforce,
 * slack, nord, linear) keep their CSS in index.css so any localStorage value
 * from a previous build still resolves — they're just no longer reachable
 * from the UI.
 */
export const ALL_THEMES: ThemeMode[] = ["classic", "apit", "apple", "kuber"];

const DARK_THEMES: ThemeMode[] = ["kuber", "nord", "linear"];
const STORAGE_KEY = "raice-theme";
const DEFAULT_THEME: ThemeMode = "apple";

interface ThemeMeta {
  label: string;
  description: string;
  isDark: boolean;
  swatch: { canvas: string; surface: string; accent: string };
}

export const THEME_META: Record<ThemeMode, ThemeMeta> = {
  classic: {
    label: "Classic",
    description: "Original RAICE LABZ blue / yellow",
    isDark: false,
    swatch: { canvas: "#F8FAFC", surface: "#FFFFFF", accent: "#0B4CAD" },
  },
  apit: {
    label: "APIT",
    description: "Brand · APIT Blue + Yellow",
    isDark: false,
    swatch: { canvas: "#F3F3F3", surface: "#FFFFFF", accent: "#1E4DA1" },
  },
  apple: {
    label: "Daylight",
    description: "Crisp white for mill-floor screens",
    isDark: false,
    swatch: { canvas: "#F5F5F7", surface: "#FFFFFF", accent: "#007AFF" },
  },
  light: {
    label: "Fluent Light",
    description: "Microsoft Fluent neutral",
    isDark: false,
    swatch: { canvas: "#F3F3F3", surface: "#FFFFFF", accent: "#0078D4" },
  },
  notion: {
    label: "Notion",
    description: "Minimal cream / warm grey",
    isDark: false,
    swatch: { canvas: "#FFFFFF", surface: "#F7F6F3", accent: "#2EAADC" },
  },
  salesforce: {
    label: "Salesforce",
    description: "Deep blue sidebar, light cards",
    isDark: false,
    swatch: { canvas: "#F3F3F3", surface: "#FFFFFF", accent: "#0176D3" },
  },
  slack: {
    label: "Slack",
    description: "Eggplant sidebar, green accent",
    isDark: false,
    swatch: { canvas: "#F8F8F8", surface: "#FFFFFF", accent: "#4A154B" },
  },
  kuber: {
    label: "Midnight",
    description: "Deep navy for control-room consoles",
    isDark: true,
    swatch: { canvas: "#0A1628", surface: "#0F1D32", accent: "#3B82F6" },
  },
  nord: {
    label: "Nord",
    description: "Cool dark with arctic cyan",
    isDark: true,
    swatch: { canvas: "#2E3440", surface: "#3B4252", accent: "#88C0D0" },
  },
  linear: {
    label: "Linear",
    description: "Deep indigo / sharp grey",
    isDark: true,
    swatch: { canvas: "#1B1B25", surface: "#22222E", accent: "#5E6AD2" },
  },
};

interface ThemeCtx {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  isDark: boolean;
  isClassic: boolean;
  /** Anything that's not the legacy "classic" theme renders inside the iOS shell. */
  isIOS: boolean;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

function applyTheme(t: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute("data-theme", t);
  if (DARK_THEMES.includes(t)) root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored && ALL_THEMES.includes(stored as ThemeMode)) return stored as ThemeMode;
    return DEFAULT_THEME;
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value: ThemeCtx = {
    theme,
    setTheme: setThemeState,
    isDark: DARK_THEMES.includes(theme),
    isClassic: theme === "classic",
    isIOS: theme !== "classic",
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

/** Backwards compat for the few iOS components that previously read `isIOS`. */
export function useIsIOSTheme(): boolean {
  return !useTheme().isClassic;
}
