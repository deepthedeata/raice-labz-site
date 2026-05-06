import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { GrainProvider } from "@/contexts/GrainContext";
import { AnalysisProvider } from "@/contexts/AnalysisContext";
import { MachineProvider } from "@/contexts/MachineContext";
import LoadingPage from "@/components/LoadingPage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import MachineConsole from "./pages/MachineConsole";
import RecipesPage from "./pages/RecipesPage";
import DataReportsIOS from "./pages/DataReportsIOS";
import ManualsIOS from "./pages/ManualsIOS";
import SettingsIOS from "./pages/SettingsIOS";
import { ThemeProvider, useTheme } from "@/components/ios/theme-provider";
import { AppSidebarIOS } from "@/components/ios/AppSidebarIOS";
import { CommandPaletteProvider } from "@/components/ios/CommandPalette";
import { IdleAmbient } from "@/components/ios/IdleAmbient";
import { RecipesProvider } from "@/contexts/RecipesContext";
import Analytics from "./pages/Analytics";
import DataReports from "./pages/DataReports";
import Settings from "./pages/Settings";
import Manuals from "./pages/Manuals";
import MongoDBViewer from "./pages/MongoDBViewer";
import GrainsViewer from "./pages/GrainsViewer";
import GrainDatabase from "./pages/GrainDatabase";
import MachineDatabase from "./pages/MachineDatabase";
import DatabasePage from "./pages/DatabasePage";
import ProcurementAnalysis from "./pages/ProcurementAnalysis";
import ProductionAnalysis from "./pages/ProductionAnalysis";
import MilledRiceAnalysis from "./pages/MilledRiceAnalysis";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  // Clear navigation state on app start and stop backend analysis if page was refreshed
  useEffect(() => {
    const handlePageRefresh = async () => {
      // Check if this is a page refresh (no navigation state exists)
      const isPageRefresh = !sessionStorage.getItem('app_navigation_state');
      
      if (isPageRefresh) {
        console.log('🔄 Page refresh detected - stopping any running backend analysis');
        
        // Stop backend analysis on page refresh
        try {
          // const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://192.168.0.143:5000';
          const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

          const response = await fetch(`${BACKEND_URL}/api/stop`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            console.log('✅ Backend analysis stopped due to page refresh');
          } else {
            console.log('⚠️ Failed to stop backend analysis, but continuing...');
          }
        } catch (error) {
          console.log('⚠️ Error stopping backend analysis on refresh:', error);
          // Continue anyway - don't block the app from loading
        }
      }
      
      // Clear navigation state regardless
      sessionStorage.removeItem('app_navigation_state');
    };
    
    // Function to stop backend analysis
    const stopBackendAnalysis = async () => {
      try {
        // const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://192.168.0.143:5000';
          const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;
        
        await fetch(`${BACKEND_URL}/api/stop`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log('✅ Backend analysis stopped due to page unload');
      } catch (error) {
        console.log('⚠️ Error stopping backend analysis on unload:', error);
      }
    };
    
    // Handle page unload (browser close, tab close, etc.)
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Stop backend analysis when user closes browser/tab
      stopBackendAnalysis();
      // Note: This is asynchronous and may not complete before page unloads
      // But we try our best to clean up
    };
    
    // Add event listener for page unload
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Run the refresh cleanup
    handlePageRefresh();
    
    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  if (isLoading) {
    return <LoadingPage onLoadingComplete={handleLoadingComplete} />;
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LanguageProvider>
            <AnalysisProvider>
              <MachineProvider>
                <GrainProvider>
                  <RecipesProvider>
                    <Toaster />
                    <Sonner />
                    <BrowserRouter>
                      <CommandPaletteProvider>
                        <SidebarProvider>
                          <ThemedShell />
                        </SidebarProvider>
                      </CommandPaletteProvider>
                    </BrowserRouter>
                  </RecipesProvider>
                </GrainProvider>
              </MachineProvider>
            </AnalysisProvider>
          </LanguageProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

/**
 * ThemedShell renders one of two layouts depending on the active theme.
 * - "classic": original RAICE LABZ layout with the rice-primary blue sidebar.
 * - "ios-light" / "ios-dark": iOS-style floating rail + iOS Dashboard variant.
 * Pages other than Dashboard reuse the existing implementations regardless of
 * theme — only the shell changes around them.
 */
const ThemedShell = () => {
  const { isIOS } = useTheme();

  const routes = (
    <Routes>
      <Route path="/" element={isIOS ? <MachineConsole /> : <Dashboard />} />
      <Route path="/recipes" element={<RecipesPage />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/data-reports" element={isIOS ? <DataReportsIOS /> : <DataReports />} />
      <Route path="/database" element={<DatabasePage />} />
      <Route path="/grain-database" element={<GrainDatabase />} />
      <Route path="/machine-database" element={<MachineDatabase />} />
      <Route path="/procurement-analysis" element={<ProcurementAnalysis />} />
      <Route path="/production-analysis" element={<ProductionAnalysis />} />
      <Route path="/milled-rice-analysis" element={<MilledRiceAnalysis />} />
      <Route path="/mongodb-viewer" element={<GrainsViewer />} />
      <Route
        path="/settings"
        element={
          <ErrorBoundary
            fallbackTitle="Settings failed to load"
            fallbackMessage="Try clearing site data for this app (localStorage) or check the browser console."
          >
            {isIOS ? <SettingsIOS /> : <Settings />}
          </ErrorBoundary>
        }
      />
      <Route
        path="/settings/advanced"
        element={
          <ErrorBoundary
            fallbackTitle="Settings failed to load"
            fallbackMessage="Try clearing site data for this app (localStorage) or check the browser console."
          >
            <Settings />
          </ErrorBoundary>
        }
      />
      <Route path="/manuals" element={isIOS ? <ManualsIOS /> : <Manuals />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  if (isIOS) {
    return (
      <div className="min-h-screen flex w-full ios-canvas">
        <AppSidebarIOS />
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">{routes}</main>
        <IdleAmbient />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-gray-50">
      <AppSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">{routes}</main>
    </div>
  );
};

export default App;
