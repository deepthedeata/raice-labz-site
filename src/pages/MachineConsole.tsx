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
  Sparkles,
  BookmarkPlus,
} from "lucide-react";
import { TopBarIOS } from "@/components/ios/TopBarIOS";
import { Tile, TileHeader } from "@/components/ios/Tile";
import { Sparkline } from "@/components/ios/Sparkline";
import { StatusDot } from "@/components/ios/StatusDot";
import { FaultBanner } from "@/components/ios/FaultBanner";
import { HardwareHealthStrip } from "@/components/ios/HardwareHealthStrip";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { ProcessFlowRibbon } from "@/components/ios/ProcessFlowRibbon";
import { RiceStrip } from "@/components/ios/RiceStrip";
import { VarietyThumbnail } from "@/components/ios/VarietyThumbnail";
import { useRecipes, MODE_LABEL, MODE_TO_PATH } from "@/contexts/RecipesContext";
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
  const { recipes, markUsed } = useRecipes();
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

  const sortedRecipes = useMemo(() => {
    const arr = [...recipes];
    arr.sort((a, b) => (b.useCount ?? 0) - (a.useCount ?? 0));
    return arr.slice(0, 4);
  }, [recipes]);

  const launchRecipe = (recipeId: string) => {
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) return;
    markUsed(recipeId);
    sounds.play("start");
    navigate(`${MODE_TO_PATH[recipe.mode]}?recipe=${encodeURIComponent(recipeId)}`);
  };

  // Demo sparkline series (would come from a real timeseries endpoint in prod)
  const samplesSeries = [12, 14, 18, 16, 22, 25, 28, 30, 28, 33, 36, samplesToday || 42];
  const speedSeries = [2800, 2950, 3100, 3050, 3200, 3180, 3250, 3300, 3210, 3380, 3290, speed || 3380];

  return (
    <div className="flex flex-col min-h-screen">
      <TopBarIOS title="Console" subtitle={`Machine status · ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`} />
      <FaultBanner />

      <div className="px-6 py-6 max-w-[1400px] w-full mx-auto space-y-6">
        {/* Persistent process-flow ribbon — domain identity */}
        <ProcessFlowRibbon activeStage={null} />

        {/* Hero row: camera + action zone */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          <CameraHeroCard />
          <ActionZone
            samplesToday={samplesAnimated}
            samplesLoading={loading}
            speed={speedAnimated}
            samplesSeries={samplesSeries}
            speedSeries={speedSeries}
            onLaunch={() => sounds.play("start")}
          />
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

        {/* Recipes — saved presets */}
        <Tile padded={false}>
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold ios-text-secondary tracking-wide uppercase">
                Recipes
              </div>
              <div className="text-[12px] ios-text-tertiary mt-0.5">
                One-tap launch with saved settings
              </div>
            </div>
            <Link
              to="/recipes"
              className="text-[12px] font-semibold flex items-center gap-1"
              style={{ color: "hsl(var(--accent))" }}
            >
              All recipes <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sortedRecipes.length === 0 ? (
              <Link
                to="/recipes"
                className="col-span-full ios-raised border ios-hairline rounded-[12px] p-4 flex items-center gap-3 hover:scale-[1.005] transition-transform"
              >
                <BookmarkPlus className="w-4 h-4 ios-text-secondary" />
                <span className="text-[13px] ios-text-secondary">
                  Save your first recipe to launch a configured run with one tap.
                </span>
              </Link>
            ) : (
              sortedRecipes.map((recipe) => {
                const Icon =
                  recipe.mode === "procurement"
                    ? ShoppingCart
                    : recipe.mode === "production"
                      ? Factory
                      : Wheat;
                const color =
                  recipe.mode === "procurement"
                    ? "hsl(var(--ios-green))"
                    : recipe.mode === "production"
                      ? "hsl(var(--accent))"
                      : "hsl(var(--ios-orange))";
                return (
                  <button
                    key={recipe.id}
                    onClick={() => launchRecipe(recipe.id)}
                    className="ios-raised border ios-hairline rounded-[12px] p-3.5 text-left hover:scale-[1.015] active:scale-[0.99] transition-transform duration-150 ios-spring"
                  >
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <VarietyThumbnail variety={recipe.variety} size={36} />
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-7 h-7 rounded-[7px] flex items-center justify-center text-white"
                          style={{ background: color }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] uppercase tracking-wider ios-text-tertiary font-semibold">
                          {MODE_LABEL[recipe.mode]}
                        </span>
                      </div>
                    </div>
                    <div className="text-[14px] font-semibold ios-text leading-tight">
                      {recipe.name}
                    </div>
                    <div className="text-[11px] ios-text-tertiary mt-1.5 flex items-center gap-2">
                      {recipe.variety && <span>{formatVariety(recipe.variety)}</span>}
                      {recipe.useCount ? (
                        <>
                          <span>·</span>
                          <span>{recipe.useCount} runs</span>
                        </>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
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

function CameraHeroCard() {
  return (
    <Tile padded={false} className="overflow-hidden">
      <div className="relative aspect-video flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(var(--ios-raised)), hsl(var(--ios-canvas)))" }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 12px)",
        }} />
        <div className="relative flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: "hsl(var(--ios-raised))", border: "1px solid hsl(var(--ios-separator))" }}
          >
            <Camera className="w-7 h-7 ios-text-secondary" />
          </div>
          <div className="text-[15px] font-semibold ios-text">Camera idle</div>
          <div className="text-[12px] ios-text-tertiary">Live feed appears during a run</div>
          <RiceStrip count={10} fill={0} grainW={10} grainH={20} animate className="mt-2" />
        </div>

        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "hsl(var(--ios-surface) / 0.8)", backdropFilter: "blur(8px)" }}>
          <StatusDot variant="warning" size={6} />
          <span className="text-[10px] font-semibold uppercase tracking-wider ios-text-secondary">Standby</span>
        </div>
      </div>
    </Tile>
  );
}

interface ActionZoneProps {
  samplesToday: number;
  samplesLoading: boolean;
  speed: number;
  samplesSeries: number[];
  speedSeries: number[];
  onLaunch?: () => void;
}

function ActionZone({ samplesToday, samplesLoading, speed, samplesSeries, speedSeries, onLaunch }: ActionZoneProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Big primary action */}
      <Tile padded={false} className="overflow-hidden">
        <div className="p-5">
          <div className="text-[13px] font-semibold ios-text-secondary tracking-wide uppercase mb-1">
            Start a sample
          </div>
          <div className="text-[12px] ios-text-tertiary mb-4">
            Walk-up workflow — pick a mode below
          </div>
          <div className="grid grid-cols-3 gap-2">
            <PrimaryAction onLaunch={onLaunch} to="/procurement-analysis" label="Procurement" sub="Raw paddy" icon={<ShoppingCart className="w-4 h-4" />} color="hsl(var(--ios-green))" />
            <PrimaryAction onLaunch={onLaunch} to="/production-analysis" label="Production" sub="Machine-wise" icon={<Factory className="w-4 h-4" />} color="hsl(var(--accent))" />
            <PrimaryAction onLaunch={onLaunch} to="/milled-rice-analysis" label="Milled rice" sub="Final stage" icon={<Wheat className="w-4 h-4" />} color="hsl(var(--ios-orange))" />
          </div>
          <Link
            to="/recipes"
            className="mt-3 w-full ios-raised border ios-hairline rounded-[10px] px-3 py-2.5 flex items-center justify-between text-[13px] font-medium ios-text hover:scale-[1.005] transition-transform"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 ios-text-secondary" />
              Or pick a saved recipe
            </span>
            <ChevronRight className="w-4 h-4 ios-text-tertiary" />
          </Link>
        </div>
      </Tile>

      {/* Compact KPI tiles */}
      <div className="grid grid-cols-2 gap-3">
        <KpiInline
          label="Samples today"
          value={samplesLoading ? "—" : Math.round(samplesToday).toString()}
          tokenVar="--accent"
          icon={<Wheat className="w-4 h-4" />}
          series={samplesSeries}
        />
        <KpiInline
          label="Throughput"
          value={speed > 0 ? Math.round(speed).toLocaleString() : "—"}
          tokenVar="--ios-green"
          icon={<Zap className="w-4 h-4" />}
          series={speedSeries}
          sub="grains/s"
        />
      </div>
    </div>
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

function KpiInline({
  label,
  value,
  tokenVar,
  icon,
  series,
  sub,
}: {
  label: string;
  value: string;
  tokenVar: string;
  icon: React.ReactNode;
  series: number[];
  sub?: string;
}) {
  const solid = `hsl(var(${tokenVar}))`;
  return (
    <Tile className="!p-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-6 h-6 rounded-[6px] flex items-center justify-center text-white"
          style={{ background: solid }}
        >
          {icon}
        </div>
        <span className="text-[10px] uppercase tracking-wider font-semibold ios-text-tertiary">
          {label}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-[24px] font-bold ios-text leading-none tabular tracking-tight">
          {value}
          {sub && <span className="text-[11px] ios-text-tertiary font-medium ml-1">{sub}</span>}
        </div>
        <Sparkline data={series} color={solid} width={64} height={26} />
      </div>
    </Tile>
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
