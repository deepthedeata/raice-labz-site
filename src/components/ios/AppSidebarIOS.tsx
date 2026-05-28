import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Database,
  ShoppingCart,
  Factory,
  Wheat,
  FileText,
  Settings,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAnalysis } from "@/contexts/AnalysisContext";

interface NavItem {
  titleKey: string;
  url: string;
  icon: typeof Home;
  group: "main" | "analysis" | "admin";
}

const NAV: NavItem[] = [
  { titleKey: "nav.dashboard", url: "/", icon: Home, group: "main" },
  { titleKey: "nav.database", url: "/database", icon: Database, group: "main" },
  { titleKey: "nav.procurementAnalysis", url: "/procurement-analysis", icon: ShoppingCart, group: "analysis" },
  { titleKey: "nav.productionAnalysis", url: "/production-analysis", icon: Factory, group: "analysis" },
  { titleKey: "nav.milledRiceAnalysis", url: "/milled-rice-analysis", icon: Wheat, group: "analysis" },
  { titleKey: "nav.dataReports", url: "/data-reports", icon: FileText, group: "admin" },
  { titleKey: "nav.settings", url: "/settings", icon: Settings, group: "admin" },
];

const GROUP_LABELS: Record<NavItem["group"], string> = {
  main: "Main",
  analysis: "Analysis",
  admin: "Workspace",
};

export function AppSidebarIOS() {
  const location = useLocation();
  const { t } = useLanguage();
  const { seriesExecutionLocked, hasStartedAnalysis } = useAnalysis();

  const grouped = NAV.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <aside
      className={cn(
        "ios-fade",
        "w-[244px] shrink-0 m-3 mr-0",
        "rounded-[20px] border flex flex-col overflow-hidden",
      )}
      style={{
        background: "hsl(var(--sidebar-background))",
        color: "hsl(var(--sidebar-foreground))",
        borderColor: "hsl(var(--sidebar-border))",
      }}
    >
      {/* Brand */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <img src="/raicelabslogo.jpeg" alt="Raice Labs" className="w-12 h-12 object-contain" />
        <div>
          <div className="text-[15px] font-bold leading-tight tracking-tight" style={{ color: "hsl(var(--sidebar-foreground))" }}>
            Raice Labs
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
        {(["main", "analysis", "admin"] as const).map((group) => (
          <div key={group}>
            <div
              className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "hsl(var(--sidebar-foreground) / 0.5)" }}
            >
              {GROUP_LABELS[group]}
            </div>
            <ul className="space-y-0.5">
              {grouped[group]?.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.url;
                const isSeriesLocked =
                  seriesExecutionLocked &&
                  location.pathname === "/production-analysis" &&
                  item.url !== "/production-analysis";
                const isAnalysisLocked = hasStartedAnalysis && item.url !== location.pathname;
                const isLocked = isSeriesLocked || isAnalysisLocked;

                const inner = (
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-[10px]",
                      "transition-colors duration-200 ios-spring nav-row",
                      isActive ? "nav-row-active" : "nav-row-inactive",
                      isLocked && "opacity-40 pointer-events-none",
                    )}
                  >
                    <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
                    <span className="text-[14px] font-medium leading-tight">
                      {t(item.titleKey)}
                    </span>
                  </div>
                );

                return (
                  <li key={item.url}>
                    {isLocked ? inner : <Link to={item.url}>{inner}</Link>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer status pill */}
      <div className="px-4 pb-4">
        <div
          className="rounded-[12px] px-3 py-2.5 flex items-center gap-2.5 border"
          style={{
            background: "hsl(var(--sidebar-foreground) / 0.06)",
            borderColor: "hsl(var(--sidebar-foreground) / 0.1)",
          }}
        >
          <CircleDot className="w-4 h-4" style={{ color: "hsl(var(--ios-green))" }} />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold leading-tight" style={{ color: "hsl(var(--sidebar-foreground))" }}>
              Mill connected
            </div>
            <div className="text-[10px]" style={{ color: "hsl(var(--sidebar-foreground) / 0.55)" }}>
              All systems nominal
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
