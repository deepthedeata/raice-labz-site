import { ReactNode } from "react";
import { AppSidebarIOS } from "./AppSidebarIOS";
import { useLocation } from "react-router-dom";

const ROUTE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "Console", subtitle: "Machine status & quick actions" },
  "/recipes": { title: "Recipes", subtitle: "Saved analysis presets" },
  "/database": { title: "Database", subtitle: "Grains and machines" },
  "/grain-database": { title: "Grain Database" },
  "/machine-database": { title: "Machine Database" },
  "/procurement-analysis": { title: "Procurement Analysis", subtitle: "Raw paddy quality" },
  "/production-analysis": { title: "Production Analysis", subtitle: "Machine-wise quality" },
  "/milled-rice-analysis": { title: "Milled Rice Analysis", subtitle: "Basmati / Non-Basmati" },
  "/data-reports": { title: "Reports", subtitle: "Historic mode logs" },
  "/analytics": { title: "Analytics" },
  "/mongodb-viewer": { title: "Database Viewer" },
  "/settings": { title: "Settings" },
  "/manuals": { title: "Manuals" },
};

export function AppShellIOS({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const meta = ROUTE_TITLES[pathname] ?? { title: "RAICE LABZ" };

  return (
    <div className="min-h-screen w-full ios-canvas flex">
      <AppSidebarIOS />
      <main className="flex-1 min-w-0 flex flex-col">
        {/* The TopBar is rendered by individual pages so they can override.
            The /__topbar__/ is supplied via context-free pattern below. */}
        <div className="flex-1 overflow-auto" data-ios-shell-content>
          <div className="ios-fade">{children}</div>
        </div>
      </main>
    </div>
  );
}

/**
 * Re-exported for pages that want to render the iOS topbar themselves.
 * (Pages like Dashboard render their own TopBarIOS at the top.)
 */
export { TopBarIOS } from "./TopBarIOS";
export { useLocation } from "react-router-dom";
