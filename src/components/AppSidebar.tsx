import {
  Database,
  FileText,
  Home,
  Settings,
  Wheat,
  ShoppingCart,
  Factory,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAnalysis } from "@/contexts/AnalysisContext";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

type NavGroup = "main" | "analysis" | "admin";

interface NavItem {
  titleKey: string;
  url: string;
  icon: typeof Home;
  group: NavGroup;
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

const GROUP_LABELS: Record<NavGroup, string> = {
  main: "Main",
  analysis: "Analysis",
  admin: "Workspace",
};

export function AppSidebar() {
  const location = useLocation();
  const { t } = useLanguage();
  const { seriesExecutionLocked, hasStartedAnalysis } = useAnalysis();

  const grouped = NAV.reduce<Record<NavGroup, NavItem[]>>(
    (acc, item) => {
      (acc[item.group] ??= []).push(item);
      return acc;
    },
    { main: [], analysis: [], admin: [] },
  );

  return (
    <Sidebar className="border-0 h-screen sticky top-0 self-start">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex flex-col items-center gap-1.5">
          <div className="text-sidebar-foreground font-bold text-sm tracking-widest uppercase text-center leading-tight">
            Total Mill Analyzer
          </div>
          <img src="/tma-icon.png" alt="Total Mill Analyzer" className="w-40 h-11" />
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4 space-y-2">
        {(["main", "analysis", "admin"] as const).map((group) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel className="text-sidebar-foreground/70 font-semibold uppercase tracking-wider text-[10px] mb-2">
              {GROUP_LABELS[group]}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {grouped[group].map((item) => {
                  const isSeriesLocked =
                    seriesExecutionLocked &&
                    location.pathname === "/production-analysis" &&
                    item.url !== "/production-analysis";
                  const isAnalysisLocked = hasStartedAnalysis && item.url !== location.pathname;
                  const isLocked = isSeriesLocked || isAnalysisLocked;
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.titleKey}>
                      <SidebarMenuButton
                        asChild={!isLocked}
                        className={`text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-300 ease-in-out mb-1 rounded-lg ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-4 border-sidebar-accent shadow-md"
                            : ""
                        } ${isLocked ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
                      >
                        {isLocked ? (
                          <div className="flex items-center gap-2">
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{t(item.titleKey)}</span>
                          </div>
                        ) : (
                          <Link to={item.url}>
                            <item.icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                            <span className="font-medium transition-all duration-300">
                              {t(item.titleKey)}
                            </span>
                          </Link>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
