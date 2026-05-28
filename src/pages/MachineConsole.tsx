import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera,
  Play,
  ChevronRight,
  ArrowUpRight,
  Wheat,
  Zap,
  ShoppingCart,
  Factory,
  FlaskConical,
  CookingPot,
  TrendingUp,
} from "lucide-react";
import { TopBarIOS } from "@/components/ios/TopBarIOS";
import { Tile, TileHeader } from "@/components/ios/Tile";
import { StatusDot } from "@/components/ios/StatusDot";
import { FaultBanner } from "@/components/ios/FaultBanner";
import { HardwareHealthStrip } from "@/components/ios/HardwareHealthStrip";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { useSoundEffects } from "@/hooks/useSoundEffects";
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

const MachineConsole = () => {
  const navigate = useNavigate();
  const sounds = useSoundEffects();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

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
        const r = await fetch(`${BACKEND_URL}/api/raice_labz/analytics/recent-activities?limit=8`);
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

  const samplesToday = analytics?.total_batches ?? 0;
  const samplesAnimated = useAnimatedNumber(samplesToday);
  const speed = analytics?.peak_grains_per_second ?? 0;
  const speedAnimated = useAnimatedNumber(speed);
  const totalGrains = analytics?.total_grains_all_time ?? 0;

  return (
    <div className="flex flex-col min-h-screen">
      <TopBarIOS />
      <FaultBanner />

      <div className="px-6 py-6 max-w-[1400px] w-full mx-auto space-y-6">
        {/* Three classic-style hero KPI cards (Total Grains / Samples / Grains per Second) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ClassicKpiCard
            label="Total Grains Analyzed"
            value={loading ? "…" : formatLargeNumber(totalGrains)}
            icon={<Wheat className="w-7 h-7 text-white" />}
            iconGradient="from-amber-500 to-orange-600"
            valueColor="text-orange-700"
          />
          <ClassicKpiCard
            label="Samples Analyzed Today"
            value={loading ? "…" : Math.round(samplesAnimated).toString()}
            icon={<FlaskConical className="w-7 h-7 text-white" />}
            iconGradient="from-blue-500 to-indigo-600"
            valueColor="text-blue-700"
          />
          <ClassicKpiCard
            label="Grains per Second"
            value={loading ? "…" : Math.round(speedAnimated).toLocaleString()}
            icon={<Zap className="w-7 h-7 text-white" />}
            iconGradient="from-green-500 to-emerald-600"
            valueColor="text-green-700"
          />
        </div>

        {/* Hero row: replay + action zone */}
        <div className="grid items-stretch grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          <ReplayHero runs={recent} loading={recentLoading} />
          <ActionZone onLaunch={() => sounds.play("start")} />
        </div>

        {/* Hardware strip */}
        <Tile padded={false}>
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-[13px] font-semibold ios-text-secondary tracking-wide uppercase">
                Hardware
              </div>
              <div className="text-[12px] ios-text-tertiary mt-0.5">
                Auto-checked every 10 seconds
              </div>
            </div>
            <HardwareHealthStrip />
          </div>
        </Tile>


        {/* Today */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
          <Tile>
            <TileHeader title="Quality today" subtitle="Averaged across runs" />
            <div className="grid grid-cols-2 gap-3">
              <MetricBlock
                label="Head rice"
                value={analytics?.avg_head_rice}
                unit="%"
                color="hsl(var(--grain-head))"
                max={100}
              />
              <MetricBlock
                label="Broken"
                value={analytics?.avg_broken}
                unit="%"
                color="hsl(var(--grain-broken))"
                max={100}
              />
              <MetricBlock
                label="Whiteness"
                value={analytics?.avg_whiteness_index}
                unit="WI"
                color="hsl(var(--accent))"
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

          <Tile padded={false}>
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
              <div>
                <div className="text-[13px] font-semibold ios-text-secondary tracking-wide uppercase">
                  Today's runs
                </div>
                <div className="text-[12px] ios-text-tertiary mt-0.5">
                  {samplesToday} sample{samplesToday === 1 ? "" : "s"} analysed
                </div>
              </div>
              <Link
                to="/data-reports"
                className="text-[12px] font-semibold flex items-center gap-1"
                style={{ color: "hsl(var(--accent))" }}
              >
                All reports <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <ul className="divide-y ios-hairline max-h-[320px] overflow-y-auto">
              {recentLoading ? (
                <li className="px-5 py-8 text-center text-[13px] ios-text-tertiary">Loading…</li>
              ) : recent.length === 0 ? (
                <li className="px-5 py-8 text-center text-[13px] ios-text-tertiary">
                  No runs yet today
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
      </div>
    </div>
  );
};

/* ──────────────────────── helpers ──────────────────────── */

interface ReplayHeroProps {
  runs: any[];
  loading: boolean;
}

const wiGrade = (wi: number | undefined) => {
  if (wi == null || isNaN(wi)) return null;
  if (wi >= 45) return { letter: "A", color: "hsl(var(--ios-green))" };
  if (wi >= 40) return { letter: "B", color: "hsl(var(--accent))" };
  if (wi >= 35) return { letter: "C", color: "hsl(var(--ios-orange))" };
  return { letter: "D", color: "hsl(var(--ios-red))" };
};

const modeMetaForReplay = (modeId?: string, modeType?: string) => {
  const id = (modeId ?? "").toUpperCase();
  if (id.startsWith("PROC") || id.startsWith("PRT") || id.startsWith("IND")) return { label: "Procurement", color: "hsl(var(--ios-green))" };
  if (id.startsWith("PROD")) return { label: "Production", color: "hsl(var(--accent))" };
  if (id.startsWith("MILL") || id.startsWith("MR")) return { label: "Milled rice", color: "hsl(var(--ios-orange))" };
  return { label: modeType ?? "Run", color: "hsl(var(--ios-text-tertiary))" };
};

const analysisRouteForModeId = (modeId?: string, modeType?: string) => {
  const id = (modeId ?? "").toUpperCase();
  if (id.startsWith("PROC") || id.startsWith("PRT") || id.startsWith("IND")) return "/procurement-analysis";
  if (id.startsWith("PROD")) return "/production-analysis";
  if (id.startsWith("MILL") || id.startsWith("MR")) return "/milled-rice-analysis";
  if (modeType === "procurement") return "/procurement-analysis";
  if (modeType === "production") return "/production-analysis";
  if (modeType === "milled-rice") return "/milled-rice-analysis";
  return "/data-reports";
};

const replayIconForMode = (modeId?: string, modeType?: string) => {
  const id = (modeId ?? "").toUpperCase();
  if (id.startsWith("PROC") || id.startsWith("PRT") || id.startsWith("IND") || modeType === "procurement") {
    return <ShoppingCart className="w-8 h-8 text-white" />;
  }
  if (id.startsWith("PROD") || modeType === "production") {
    return <Factory className="w-8 h-8 text-white" />;
  }
  if (id.startsWith("MILL") || id.startsWith("MR") || modeType === "milled-rice") {
    return <Wheat className="w-8 h-8 text-white" />;
  }
  return <Play className="w-8 h-8 text-white" />;
};

const relativeTime = (iso: string | undefined): string => {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return "—";
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
  return `${Math.floor(diffSec / 86400)} d ago`;
};

function ReplayHero({ runs, loading }: ReplayHeroProps) {
  const visible = runs.slice(0, 4);
  const hasRuns = visible.length > 0;

  return (
    <Tile padded={false} className="overflow-hidden h-full">
      <div className="px-4 pt-3 pb-2 flex items-end justify-between">
        <div>
          <div className="text-[12px] font-semibold ios-text-secondary tracking-wide uppercase">
            Replay
          </div>
          <div className="text-[11px] ios-text-tertiary mt-0.5">
            Review runs
          </div>
        </div>
        <Link
          to="/data-reports"
          className="text-[11px] font-semibold flex items-center gap-0.5"
          style={{ color: "hsl(var(--accent))" }}
        >
          All <ArrowUpRight className="w-2.5 h-2.5" />
        </Link>
      </div>

      <div className="px-4 pb-2.5">
        {loading ? (
          <div className="grid grid-cols-2 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="aspect-[5/4] rounded-[14px] ios-raised border ios-hairline"
              />
            ))}
          </div>
        ) : !hasRuns ? (
          <div
            className="rounded-[12px] border ios-hairline px-3 py-5 text-center"
            style={{ background: "hsl(var(--ios-raised))" }}
          >
            <Camera className="w-5 h-5 mx-auto ios-text-tertiary mb-1.5" />
            <div className="text-[12px] font-semibold ios-text">No runs yet</div>
            <div className="text-[10px] ios-text-tertiary mt-0.5">
              Start a sample to populate
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {visible.map((run, i) => (
              <ReplayCard key={run.mode_id ?? i} run={run} />
            ))}
          </div>
        )}
      </div>
    </Tile>
  );
}

function ReplayCard({ run }: { run: any }) {
  const meta = modeMetaForReplay(run.mode_id, run.mode_type);
  const icon = replayIconForMode(run.mode_id, run.mode_type);
  const grade = wiGrade(typeof run.whiteness_index === "number" ? run.whiteness_index : undefined);
  const variety = run.variety ?? "—";

  return (
    <Link
      to={analysisRouteForModeId(run.mode_id, run.mode_type)}
      onClick={() => {
        if (run.mode_id) sessionStorage.setItem("mode_id", run.mode_id);
      }}
      className={cn(
        "relative ios-surface border ios-hairline rounded-[14px] overflow-hidden",
        "transition-transform duration-150 ios-spring hover:scale-[1.015] active:scale-[0.99]",
      )}
    >
      <div
        className="aspect-[3/2.5] relative flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${meta.color} 0%, ${meta.color} 60%, hsl(var(--ios-raised)) 140%)`,
        }}
      >
        <div className="w-16 h-16 rounded-[18px] flex items-center justify-center shadow-lg bg-white/10">
          {icon}
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.18)" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.95)" }}
          >
            <Play className="w-4 h-4 fill-current" style={{ color: meta.color }} />
          </div>
        </div>
        {grade && (
          <div
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px]"
            style={{ background: "rgba(255,255,255,0.95)", color: grade.color }}
            title={`Whiteness Index grade ${grade.letter}`}
          >
            {grade.letter}
          </div>
        )}
        <div
          className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[8px] font-semibold uppercase tracking-wider"
          style={{ background: "rgba(255,255,255,0.95)", color: meta.color }}
        >
          {meta.label}
        </div>
      </div>
      <div className="px-2 py-1">
        <div className="text-[11px] font-semibold ios-text leading-tight truncate">
          {formatVariety(variety)}
        </div>
        <div className="text-[9px] ios-text-tertiary flex items-center justify-between mt-0.5">
          <span className="truncate">{run.mode_id ?? "—"}</span>
          <span className="shrink-0">{relativeTime(run.timestamp ?? run.date)}</span>
        </div>
      </div>
    </Link>
  );
}

interface ActionZoneProps {
  onLaunch?: () => void;
}

function ActionZone({ onLaunch }: ActionZoneProps) {
  return (
    <div className="flex flex-col gap-4 h-full">
      <Tile padded={false} className="overflow-hidden h-full">
        <div className="p-5">
          <div className="text-[13px] font-semibold ios-text-secondary tracking-wide uppercase mb-1">
            Start a sample
          </div>
          <div className="text-[12px] ios-text-tertiary mb-4">
            Walk-up workflow — pick a mode below
          </div>
          <div className="grid grid-cols-1 gap-2">
            <PrimaryAction onLaunch={onLaunch} to="/procurement-analysis" label="Procurement" sub="Raw paddy" icon={<ShoppingCart className="w-4 h-4" />} color="hsl(var(--ios-green))" />
            <PrimaryAction onLaunch={onLaunch} to="/production-analysis" label="Production" sub="Machine-wise" icon={<Factory className="w-4 h-4" />} color="hsl(var(--accent))" />
            <PrimaryAction onLaunch={onLaunch} to="/milled-rice-analysis" label="Milled rice" sub="Final stage" icon={<Wheat className="w-4 h-4" />} color="hsl(var(--ios-orange))" />
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200/30">
            <div className="grid grid-cols-2 gap-2">
              <DisabledAnalysisCard title="Cooked Rice Quality" sub="Cooking Properties" icon={<CookingPot className="w-5 h-5" />} color="hsl(var(--ios-text-tertiary))" />
              <DisabledAnalysisCard title="Predictive Analysis" sub="Yield Forecasting" icon={<TrendingUp className="w-5 h-5" />} color="hsl(var(--ios-text-tertiary))" />
            </div>
          </div>
        </div>
      </Tile>
    </div>
  );
}

/**
 * Three large hero KPI cards modelled on the Classic Dashboard — gradient
 * icon box on the left, small grey label, bold coloured number below.
 * Used at the top of the iOS Machine Console so all themes share the same
 * top-of-page summary the Classic theme had.
 */
function ClassicKpiCard({
  label,
  value,
  icon,
  iconGradient,
  valueColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconGradient: string;
  valueColor: string;
}) {
  return (
    <Tile className="!p-5">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0",
            "bg-gradient-to-br",
            iconGradient,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold ios-text-secondary tracking-wide mb-0.5 truncate">
            {label}
          </p>
          <p className={cn("text-3xl font-bold tabular leading-none truncate", valueColor)}>
            {value}
          </p>
        </div>
      </div>
    </Tile>
  );
}

function PrimaryAction({
  to,
  label,
  sub,
  icon,
  color,
  onLaunch,
}: {
  to: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  onLaunch?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onLaunch}
      className={cn(
        "ios-raised border ios-hairline rounded-[12px] p-3 flex flex-col gap-2",
        "hover:scale-[1.02] active:scale-[0.99] transition-all duration-150 ios-spring",
        "hover:border-[hsl(var(--accent)/0.4)]",
      )}
    >
      <div
        className="w-7 h-7 rounded-[8px] flex items-center justify-center text-white"
        style={{ background: color }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[13px] font-semibold ios-text leading-tight">{label}</div>
        <div className="text-[11px] ios-text-tertiary mt-0.5">{sub}</div>
      </div>
      <Play className="w-3 h-3 ios-text-tertiary self-end -mt-1" />
    </Link>
  );
}

function DisabledAnalysisCard({
  title,
  sub,
  icon,
  color,
}: {
  title: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className={cn(
        "ios-raised border ios-hairline rounded-[12px] p-3 flex flex-col gap-2",
        "opacity-60 cursor-not-allowed",
      )}
    >
      <div
        className="w-7 h-7 rounded-[8px] flex items-center justify-center text-white opacity-70"
        style={{ background: color }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[13px] font-semibold ios-text leading-tight">{title}</div>
        <div className="text-[11px] ios-text-tertiary mt-0.5">{sub}</div>
        <div className="text-[10px] ios-text-tertiary mt-1 italic">Coming soon</div>
      </div>
    </div>
  );
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

export default MachineConsole;
