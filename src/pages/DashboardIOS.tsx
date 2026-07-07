import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import {
  Wheat,
  FlaskConical,
  Zap,
  ShoppingCart,
  Factory,
  Sparkles,
  Brain,
  ArrowUpRight,
  ChevronRight,
  Database,
  Camera,
  Cpu,
  Cable,
} from "lucide-react";
import { TopBarIOS } from "@/components/ios/TopBarIOS";
import { Tile, TileHeader } from "@/components/ios/Tile";
import { GroupedList, GroupedRow } from "@/components/ios/GroupedList";
import { Sparkline } from "@/components/ios/Sparkline";
import { StatusDot } from "@/components/ios/StatusDot";
import { cn } from "@/lib/utils";

const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

const toTitleCase = (value: string) =>
  value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const formatVariety = (value: string) => {
  const v = value.trim();
  if (v.length === 3) return v.toUpperCase();
  return toTitleCase(v);
};

const formatLargeNumber = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

interface AnalyticsData {
  total_grains_all_time?: number;
  total_batches?: number;
  peak_grains_per_second?: number;
  avg_head_rice?: number;
  avg_broken?: number;
  avg_whiteness_index?: number;
  avg_grain_length?: number;
}

const DashboardIOS = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const animatedSpeed = useAnimatedNumber(analytics?.peak_grains_per_second ?? 0, { duration: 600 });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${BACKEND_URL}/api/raice_labz/analytics/summary`);
        if (r.ok) {
          const d = await r.json();
          setAnalytics(d.summary);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();

    (async () => {
      try {
        const r = await fetch(`${BACKEND_URL}/api/raice_labz/analytics/recent-activities?limit=5`);
        if (r.ok) {
          const d = await r.json();
          setRecent(d.activities || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setRecentLoading(false);
      }
    })();
  }, []);

  // Demo sparkline data (would come from real time-series endpoint)
  const grainsSeries = [42, 48, 51, 55, 49, 62, 68, 73, 71, 78, 82, 88];
  const samplesSeries = [12, 14, 18, 16, 22, 25, 28, 30, 28, 33, 36, 42];
  const speedSeries = [2800, 2950, 3100, 3050, 3200, 3180, 3250, 3300, 3210, 3380];

  const totalGrains = analytics?.total_grains_all_time ?? 0;
  const samples = analytics?.total_batches ?? 0;
  const speed = analytics?.peak_grains_per_second ?? 0;

  return (
    <div className="flex flex-col min-h-screen">
      <TopBarIOS title="Dashboard" subtitle="Real-time mill overview" />

      <div className="px-6 py-6 max-w-[1400px] w-full mx-auto space-y-6">
        {/* Hero metric tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <HeroMetric
            label="Total grains"
            value={loading ? "—" : formatLargeNumber(totalGrains)}
            sub="All-time count"
            tokenVar="--ios-orange"
            icon={<Wheat className="w-5 h-5" />}
            series={grainsSeries}
            trend="+4.2%"
          />
          <HeroMetric
            label="Samples today"
            value={loading ? "—" : String(samples)}
            sub="Across all modes"
            tokenVar="--ios-blue"
            icon={<FlaskConical className="w-5 h-5" />}
            series={samplesSeries}
            trend="+18%"
          />
          <HeroMetric
            label="Throughput"
            value={loading ? "—" : animatedSpeed > 0 ? Math.round(animatedSpeed).toLocaleString() : "—"}
            sub="Grains per second"
            tokenVar="--ios-green"
            icon={<Zap className="w-5 h-5" />}
            series={speedSeries}
            trend="Peak"
          />
        </div>

        {/* Start an analysis */}
        <Tile padded={false} className="overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-end justify-between">
            <div>
              <div className="text-[20px] font-bold ios-text tracking-tight">Start an analysis</div>
              <div className="text-[13px] ios-text-secondary mt-0.5">
                Choose a workflow to begin a new measurement session
              </div>
            </div>
          </div>

          <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            <AnalysisLaunchCard
              to="/procurement-analysis"
              title="Procurement"
              sub="Raw paddy quality"
              icon={<ShoppingCart className="w-5 h-5" />}
              color="hsl(var(--ios-green))"
              enabled
            />
            <AnalysisLaunchCard
              to="/production-analysis"
              title="Production"
              sub="Machine-wise quality"
              icon={<Factory className="w-5 h-5" />}
              color="hsl(var(--ios-blue))"
              enabled
            />
            <AnalysisLaunchCard
              to="/milled-rice-analysis"
              title="Milled rice"
              sub="Basmati / Non-Basmati"
              icon={<Wheat className="w-5 h-5" />}
              color="hsl(var(--ios-orange))"
              enabled
            />
            <AnalysisLaunchCard
              to="#"
              title="Cooked rice"
              sub="Cooking properties"
              icon={<Sparkles className="w-5 h-5" />}
              color="hsl(var(--ios-text-tertiary))"
              enabled={false}
            />
            <AnalysisLaunchCard
              to="#"
              title="Predictive"
              sub="Yield forecasting"
              icon={<Brain className="w-5 h-5" />}
              color="hsl(var(--ios-text-tertiary))"
              enabled={false}
            />
          </div>
        </Tile>

        {/* Today summary + recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Today's summary — 2x2 metric ring grid */}
          <Tile>
            <TileHeader title="Today" subtitle="Quality at a glance" />
            <div className="grid grid-cols-2 gap-3">
              <MetricBlock
                label="Avg head rice"
                value={analytics?.avg_head_rice}
                unit="%"
                color="hsl(var(--ios-green))"
                max={100}
              />
              <MetricBlock
                label="Avg broken"
                value={analytics?.avg_broken}
                unit="%"
                color="hsl(var(--ios-red))"
                max={100}
              />
              <MetricBlock
                label="Whiteness"
                value={analytics?.avg_whiteness_index}
                unit="WI"
                color="hsl(var(--ios-blue))"
                max={50}
              />
              <MetricBlock
                label="Grain length"
                value={analytics?.avg_grain_length}
                unit="mm"
                color="hsl(var(--ios-orange))"
                max={10}
                decimals={2}
              />
            </div>
          </Tile>

          {/* Recent tests list */}
          <Tile padded={false}>
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
              <div>
                <div className="text-[13px] font-semibold ios-text-secondary tracking-wide uppercase">
                  Recent tests
                </div>
                <div className="text-[12px] ios-text-tertiary mt-0.5">Today's activity</div>
              </div>
              <Link
                to="/data-reports"
                className="text-[12px] font-semibold flex items-center gap-1"
                style={{ color: "hsl(var(--ios-blue))" }}
              >
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <ul className="divide-y ios-hairline">
              {recentLoading ? (
                <li className="px-5 py-8 text-center text-[13px] ios-text-tertiary">Loading…</li>
              ) : recent.length === 0 ? (
                <li className="px-5 py-8 text-center text-[13px] ios-text-tertiary">
                  No tests recorded today
                </li>
              ) : (
                recent.map((a, i) => (
                  <li key={i} className="px-5 py-3 flex items-center gap-3">
                    <StatusDot variant="online" size={8} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium ios-text leading-tight">
                        {a.variety ? formatVariety(a.variety) : "—"}
                        {a.machine && (
                          <span className="ios-text-tertiary font-normal">
                            {" · "}
                            {toTitleCase(a.machine)}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] ios-text-tertiary mt-0.5">
                        {a.mode_type || "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-mono ios-text-secondary">
                        {a.mode_id || "—"}
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </Tile>
        </div>

        {/* System status — iOS Settings-style grouped list */}
        <GroupedList title="System">
          <GroupedRow
            icon={<Database className="w-4 h-4" />}
            iconBg="hsl(var(--ios-blue))"
            title="Database"
            subtitle="Connected · 24ms"
            trailing={<StatusDot variant="online" size={7} />}
            chevron
          />
          <GroupedRow
            icon={<Camera className="w-4 h-4" />}
            iconBg="hsl(var(--ios-green))"
            title="Camera"
            subtitle="Streaming · 60 fps"
            trailing={<StatusDot variant="online" size={7} />}
            chevron
          />
          <GroupedRow
            icon={<Cpu className="w-4 h-4" />}
            iconBg="hsl(var(--ios-orange))"
            title="ML Models"
            subtitle="3 loaded · v2.4.1"
            trailing={<StatusDot variant="online" size={7} />}
            chevron
          />
          <GroupedRow
            icon={<Cable className="w-4 h-4" />}
            iconBg="hsl(var(--ios-red))"
            title="Modbus / Hardware"
            subtitle="Slave 1 · 9600 baud"
            trailing={<StatusDot variant="online" size={7} />}
            chevron
          />
        </GroupedList>
      </div>
    </div>
  );
};

/* ──────────────────────── helpers ──────────────────────── */

interface HeroProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  /** CSS-var token (e.g. "--ios-blue") — without the leading hsl() wrapper. */
  tokenVar: string;
  series: number[];
  trend: string;
}

function HeroMetric({ label, value, sub, icon, tokenVar, series, trend }: HeroProps) {
  const solid = `hsl(var(${tokenVar}))`;
  const tint = `hsl(var(${tokenVar}) / 0.15)`;
  return (
    <Tile className="relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-[8px] flex items-center justify-center text-white"
            style={{ background: solid }}
          >
            {icon}
          </div>
          <div className="text-[12px] font-semibold uppercase tracking-wider ios-text-secondary">
            {label}
          </div>
        </div>
        <div
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: tint, color: solid }}
        >
          {trend}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[36px] font-bold ios-text leading-none tabular tracking-tight">
            {value}
          </div>
          <div className="text-[12px] ios-text-tertiary mt-1">{sub}</div>
        </div>
        <Sparkline data={series} color={solid} width={96} height={36} />
      </div>
    </Tile>
  );
}

function AnalysisLaunchCard({
  to,
  title,
  sub,
  icon,
  color,
  enabled,
}: {
  to: string;
  title: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  enabled: boolean;
}) {
  const inner = (
    <div
      className={cn(
        "ios-raised border ios-hairline rounded-[14px] p-4 h-full",
        "flex flex-col gap-3 transition-all duration-200 ios-spring",
        enabled
          ? "hover:scale-[1.015] hover:border-[hsl(var(--ios-blue)/0.4)] cursor-pointer active:scale-[0.99]"
          : "opacity-50 cursor-not-allowed",
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white"
          style={{ background: color }}
        >
          {icon}
        </div>
        {enabled ? (
          <ChevronRight className="w-4 h-4 ios-text-tertiary" />
        ) : (
          <span className="text-[10px] uppercase tracking-wider ios-text-tertiary font-semibold">
            Soon
          </span>
        )}
      </div>
      <div>
        <div className="text-[15px] font-semibold ios-text">{title}</div>
        <div className="text-[12px] ios-text-tertiary mt-0.5">{sub}</div>
      </div>
    </div>
  );
  return enabled ? <Link to={to}>{inner}</Link> : <div>{inner}</div>;
}

function MetricBlock({
  label,
  value,
  unit,
  color,
  max,
  decimals = 1,
}: {
  label: string;
  value: number | undefined;
  unit: string;
  color: string;
  max: number;
  decimals?: number;
}) {
  const pct = value != null ? Math.min(1, value / max) : 0;
  return (
    <div className="ios-raised rounded-[12px] p-4 border ios-hairline">
      <div className="text-[11px] uppercase tracking-wider font-semibold ios-text-tertiary mb-2">
        {label}
      </div>
      <div className="text-[26px] font-bold ios-text leading-none tabular tracking-tight">
        {value != null ? value.toFixed(decimals) : "—"}
        <span className="text-[14px] ios-text-tertiary font-medium ml-1">{unit}</span>
      </div>
      <div className="mt-3 h-1.5 rounded-full ios-separator overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ios-spring"
          style={{ width: `${pct * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default DashboardIOS;
