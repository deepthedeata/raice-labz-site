import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Clock,
  TrendingUp,
  Wheat,
  ShoppingCart,
  Factory,
  CookingPot,
  FileText,
} from "lucide-react";

const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

const Dashboard = () => {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isLoadingRecentActivities, setIsLoadingRecentActivities] = useState(true);
  const [riceMillSettings, setRiceMillSettings] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [cameraActive, setCameraActive] = useState<boolean | null>(null);
  const [modbusConnected, setModbusConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
    fetchRecentActivities();
    fetchRiceMillSettings();
    fetchSystemStatus();
    checkCameraHardware();
    checkModbusStatus();
    // Poll system status, camera and modbus every 5 seconds
    const statusInterval = setInterval(() => {
      fetchSystemStatus();
      checkCameraHardware();
      checkModbusStatus();
    }, 5000);
    return () => clearInterval(statusInterval);
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/raice_labz/analytics/summary`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data.summary);
      } else {
        console.error("Failed to fetch analytics data");
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      setIsLoadingRecentActivities(true);
      const response = await fetch(
        `${BACKEND_URL}/api/raice_labz/analytics/recent-activities?limit=5`
      );
      if (response.ok) {
        const data = await response.json();
        setRecentActivities(data.activities || []);
      } else {
        console.error("Failed to fetch recent activities");
      }
    } catch (error) {
      console.error("Error fetching recent activities:", error);
    } finally {
      setIsLoadingRecentActivities(false);
    }
  };

  const fetchRiceMillSettings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/raice_labz/settings/rice-mill`);
      if (response.ok) {
        const data = await response.json();
        setRiceMillSettings(data.settings || data);
      } else {
        console.error("Failed to fetch rice mill settings");
      }
    } catch (error) {
      console.error("Error fetching rice mill settings:", error);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/status`);
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data);
      }
    } catch (error) {
      setSystemStatus(null);
    }
  };

  const checkCameraHardware = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/camera/check`);
      if (res.ok) {
        const data = await res.json();
        setCameraActive(data.available === true);
      } else {
        setCameraActive(false);
      }
    } catch (error) {
      setCameraActive(false);
    }
  };

  const checkModbusStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/modbus_rtu/status`);
      if (res.ok) {
        const data = await res.json();
        setModbusConnected(data.connected === true);
      } else {
        setModbusConnected(false);
      }
    } catch (error) {
      setModbusConnected(false);
    }
  };

  // Format today's date as DD-MM-YYYY
  const getTodayFormatted = () => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // Get most analyzed variety from today's analytics
  const getMostAnalyzedVariety = () => {
    if (analyticsData?.most_analyzed_variety?.variety && analyticsData.most_analyzed_variety.variety !== 'None') {
      const v = analyticsData.most_analyzed_variety.variety;
      return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
    }
    return "—";
  };

  // System is active when both camera and modbus are connected
  const isSystemActive = cameraActive === true && modbusConnected === true;
  const isSystemChecking = cameraActive === null || modbusConnected === null;

  // Get operator name from rice mill settings
  const getOperatorName = () => {
    if (riceMillSettings) {
      return (
        riceMillSettings.operatorName ||
        riceMillSettings.riceMillName ||
        "—"
      );
    }
    return "—";
  };

  // Analysis tiles definition
  const analysisTiles = [
    {
      label: "Procurement Analysis",
      sub: "Raw Paddy Quality",
      icon: ShoppingCart,
      link: "/procurement-analysis",
      color: "from-green-500 to-emerald-600",
      bgColor: "from-green-50 to-emerald-100",
      borderColor: "border-green-200 hover:border-green-400",
      textColor: "text-green-700",
      disabled: false,
    },
    {
      label: "Production Analysis",
      sub: "Machine-Wise Quality",
      icon: Factory,
      link: "/production-analysis",
      color: "from-blue-500 to-blue-700",
      bgColor: "from-blue-50 to-blue-100",
      borderColor: "border-blue-200 hover:border-blue-400",
      textColor: "text-blue-700",
      disabled: false,
    },
    {
      label: "Milled Rice Quality",
      sub: "Basmati / Non-Basmati",
      icon: Wheat,
      link: "/milled-rice-analysis",
      color: "from-teal-500 to-teal-700",
      bgColor: "from-teal-50 to-teal-100",
      borderColor: "border-teal-200 hover:border-teal-400",
      textColor: "text-teal-700",
      disabled: false,
    },
    {
      label: "Cooked Rice Quality",
      sub: "Cooking Properties",
      icon: CookingPot,
      link: null,
      color: "from-purple-400 to-purple-500",
      bgColor: "from-purple-50 to-purple-100",
      borderColor: "border-purple-200",
      textColor: "text-purple-500",
      disabled: true,
    },
    {
      label: "Predictive Analysis",
      sub: "Yield Forecasting",
      icon: TrendingUp,
      link: null,
      color: "from-amber-400 to-amber-500",
      bgColor: "from-amber-50 to-amber-100",
      borderColor: "border-amber-200",
      textColor: "text-amber-500",
      disabled: true,
    },
  ];

  // Today's summary metrics
  const summaryMetrics = [
    {
      label: "Avg Head Rice",
      value: isLoading ? "—" : analyticsData?.avg_head_rice != null ? Number(analyticsData.avg_head_rice).toFixed(1) : "—",
      unit: "%",
      color: "from-green-400 to-green-600",
      bgColor: "from-green-50 to-emerald-100",
      borderColor: "border-green-200 hover:border-green-400",
      textColor: "text-green-700",
    },
    {
      label: "Avg Broken",
      value: isLoading ? "—" : analyticsData?.avg_broken != null ? Number(analyticsData.avg_broken).toFixed(1) : "—",
      unit: "%",
      color: "from-red-400 to-red-600",
      bgColor: "from-red-50 to-red-100",
      borderColor: "border-red-200 hover:border-red-400",
      textColor: "text-red-700",
    },
    {
      label: "Whiteness Index",
      value: isLoading ? "—" : analyticsData?.avg_whiteness_index != null ? Number(analyticsData.avg_whiteness_index).toFixed(1) : "—",
      unit: "WI",
      color: "from-blue-400 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
      borderColor: "border-blue-200 hover:border-blue-400",
      textColor: "text-blue-700",
    },
    {
      label: "Avg Grain Length",
      value: isLoading ? "—" : analyticsData?.avg_grain_length != null ? Number(analyticsData.avg_grain_length).toFixed(2) : "—",
      unit: "mm",
      color: "from-amber-400 to-amber-600",
      bgColor: "from-amber-50 to-amber-100",
      borderColor: "border-amber-200 hover:border-amber-400",
      textColor: "text-amber-700",
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-white">
      <PageHeader
        title="Dashboard"
        subtitle="Central hub for rice quality management"
      />

      <div className="flex-1 overflow-auto p-6 space-y-8">

        {/* ── 1. Top Info Bar ── */}
        <div className="animate-fade-in grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4" style={{ animationDelay: "0ms" }}>
          {/* SAMPLES ANALYZED TODAY */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50 hover:from-rice-primary/5 hover:to-rice-secondary/5">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-gray-600 tracking-wider mb-3">
                Samples Analyzed Today
              </p>
              <p className="text-4xl font-bold text-rice-primary group-hover:text-rice-secondary transition-colors duration-300">
                {isLoading ? "…" : analyticsData?.total_batches ?? "0"}
              </p>
            </CardContent>
          </Card>

          {/* OPERATOR */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50 hover:from-rice-primary/5 hover:to-rice-secondary/5">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-gray-600 tracking-wider mb-3">
                Operator
              </p>
              <p className="text-2xl font-bold text-rice-primary group-hover:text-rice-secondary transition-colors duration-300 truncate">
                {getOperatorName()}
              </p>
            </CardContent>
          </Card>

          {/* MOST ANALYZED VARIETY */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50 hover:from-rice-primary/5 hover:to-rice-secondary/5">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-gray-600 tracking-wider mb-3">
                Top Variety Today
              </p>
              <p className="text-2xl font-bold text-rice-primary group-hover:text-rice-secondary transition-colors duration-300 truncate">
                {isLoading ? "…" : getMostAnalyzedVariety()}
              </p>
            </CardContent>
          </Card>

          {/* DATE */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50 hover:from-rice-primary/5 hover:to-rice-secondary/5">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-gray-600 tracking-wider mb-3">
                Date
              </p>
              <p className="text-2xl font-bold text-rice-primary group-hover:text-rice-secondary transition-colors duration-300 font-mono">
                {getTodayFormatted()}
              </p>
            </CardContent>
          </Card>

          {/* SYSTEM STATUS */}
          <Card className={`group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50 ${isSystemActive ? "hover:from-green-50 hover:to-emerald-50" : "hover:from-gray-100 hover:to-gray-50"}`}>
            <CardContent className="p-5 flex flex-col justify-center h-full">
              <p className="text-sm font-semibold text-gray-600 tracking-wider mb-3">
                System Status
              </p>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  {isSystemActive && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isSystemChecking ? "bg-gray-400" : isSystemActive ? "bg-green-500" : "bg-red-500"}`}></span>
                </span>
                <span className={`text-2xl font-bold tracking-wider ${isSystemChecking ? "text-gray-500" : isSystemActive ? "text-green-600" : "text-red-600"}`}>
                  {isSystemChecking ? "Checking..." : isSystemActive ? "Active" : "Inactive"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── 2. Analysis Tiles ── */}
        <Card className="animate-fade-in hover:shadow-xl transition-all duration-300" style={{ animationDelay: "200ms" }}>
          <CardHeader className="bg-gradient-to-r from-rice-primary/5 to-rice-secondary/5 border-b">
            <CardTitle className="text-rice-primary flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Analysis Modules
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {analysisTiles.map((tile, index) => {
                const TileIcon = tile.icon;
                const inner = (
                  <div
                    className="animate-fade-in h-full"
                    style={{ animationDelay: `${300 + index * 100}ms` }}
                  >
                    <Button
                      variant="outline"
                      disabled={tile.disabled}
                      className={`h-full min-h-[160px] p-5 flex flex-col items-center justify-center space-y-3 w-full bg-gradient-to-br ${tile.bgColor} ${tile.borderColor} border-2 rounded-2xl transition-all duration-300 ${
                        tile.disabled
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:scale-105 hover:shadow-lg"
                      }`}
                    >
                      <div
                        className={`w-12 h-12 bg-gradient-to-br ${tile.color} rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 ${
                          tile.disabled ? "" : "group-hover:shadow-xl group-hover:scale-110"
                        }`}
                      >
                        <TileIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-center">
                        <div className={`font-bold text-base ${tile.textColor} leading-tight`}>
                          {tile.label}
                        </div>
                        <div className="text-sm text-gray-600 mt-1 tracking-wide font-medium">
                          {tile.sub}
                        </div>
                        {tile.disabled && (
                          <div className="text-xs text-gray-400 mt-1 italic">Coming soon</div>
                        )}
                      </div>
                    </Button>
                  </div>
                );

                return tile.link && !tile.disabled ? (
                  <Link key={index} to={tile.link} className="group h-full">
                    {inner}
                  </Link>
                ) : (
                  <div key={index} className="h-full">{inner}</div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── 3. Bottom 2-Column Layout ── */}
        <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ animationDelay: "500ms" }}>

          {/* Left: Recent Tests Today table */}
          <Card className="overflow-hidden hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-rice-primary/5 to-rice-secondary/5 border-b">
              <CardTitle className="text-rice-primary flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Tests Today
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingRecentActivities ? (
                <div className="text-center py-10">
                  <p className="text-gray-500">Loading recent tests…</p>
                </div>
              ) : recentActivities.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-50 to-white border-b">
                          <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 tracking-wider">Test Id</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 tracking-wider">Type</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 tracking-wider">Machine</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 tracking-wider">Variety</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentActivities.map((activity: any, index: number) => {
                          const statusVal = activity.status || "";
                          const isAccepted =
                            statusVal.toLowerCase() === "accepted" ||
                            statusVal.toLowerCase() === "done";
                          return (
                            <tr
                              key={index}
                              className="border-b last:border-0 hover:bg-gradient-to-r hover:from-rice-primary/5 hover:to-rice-secondary/5 transition-colors duration-200"
                            >
                              <td className="px-4 py-3">
                                <span className="inline-block bg-blue-100 text-blue-700 font-mono text-xs font-semibold px-2 py-1 rounded-md border border-blue-200">
                                  {activity.mode_id || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-700 font-medium">
                                {activity.mode_type || "—"}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {activity.machine || "—"}
                              </td>
                              <td className="px-4 py-3 text-gray-700 font-medium capitalize">
                                {activity.variety || "—"}
                              </td>
                              <td className="px-4 py-3">
                                {statusVal ? (
                                  <span
                                    className={`inline-block text-xs font-semibold px-2 py-1 rounded-full border ${
                                      isAccepted
                                        ? "bg-green-100 text-green-700 border-green-200"
                                        : "bg-red-100 text-red-700 border-red-200"
                                    }`}
                                  >
                                    {statusVal}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 border-t bg-gradient-to-r from-gray-50 to-white">
                    <Link to="/data-reports">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-rice-primary border-rice-primary/30 hover:bg-rice-primary/5 hover:border-rice-primary hover:shadow transition-all duration-200 font-semibold text-sm tracking-wider"
                      >
                        View All Reports →
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500">No tests recorded today</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Today's Summary 2x2 grid */}
          <Card className="overflow-hidden hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-rice-primary/5 to-rice-secondary/5 border-b">
              <CardTitle className="text-rice-primary flex items-center gap-2">
                <Wheat className="w-5 h-5" />
                Today's Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {summaryMetrics.map((metric, index) => (
                  <div key={index} className="group cursor-default">
                    <div
                      className={`bg-gradient-to-br ${metric.bgColor} p-6 rounded-2xl border-2 ${metric.borderColor} hover:scale-105 transition-all duration-300 transform hover:shadow-lg`}
                    >
                      <div className="text-center">
                        <div
                          className={`w-20 h-20 bg-gradient-to-br ${metric.color} rounded-full flex flex-col items-center justify-center mx-auto mb-3 shadow-lg group-hover:shadow-xl transition-all duration-300`}
                        >
                          <span className="text-xl font-bold text-white leading-none">
                            {isLoading ? "…" : metric.value}
                          </span>
                          <span className="text-xs font-semibold text-white/80 mt-0.5">
                            {metric.unit}
                          </span>
                        </div>
                        <span className={`text-sm font-semibold ${metric.textColor} tracking-wide`}>
                          {metric.label}
                        </span>
                        <div className="mt-2 h-2 bg-white/60 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${metric.color} rounded-full animate-[slideIn_1.5s_ease-out]`}
                            style={{
                              width: `${Math.min(
                                parseFloat(metric.value) || 0,
                                metric.unit === "mm" ? 10 : 100
                              ) * (metric.unit === "mm" ? 10 : 1)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
