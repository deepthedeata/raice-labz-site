import { Fragment, useMemo, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, ThumbsDown, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  type FlatSample,
  type MetricKey,
  type MetricDef,
  type AggregateBucket,
  METRICS,
  computeOutliers,
  computeBucketOutliers,
  groupByDay,
  DEFAULT_CHALKY_THRESHOLD_PCT,
} from "@/lib/reportsAnalytics";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const CHART_TOOLTIP_STYLE = { borderRadius: 8, fontSize: 12, border: "1px solid #e5e7eb" };

export function metricDef(key: MetricKey): MetricDef {
  return METRICS.find((m) => m.key === key) ?? METRICS[0];
}

/* ─────────────────────────── shared primitives ─────────────────────────── */

export function MetricPicker({
  active,
  onToggle,
  available,
}: {
  active: MetricKey[];
  onToggle: (key: MetricKey) => void;
  /** Restricts the checkbox list to a subset (e.g. a machine type's parameter table) — defaults to every metric. */
  available?: MetricKey[];
}) {
  const options = available ? METRICS.filter((m) => available.includes(m.key)) : METRICS;
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((m) => (
        <label key={m.key} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
          <Checkbox checked={active.includes(m.key)} onCheckedChange={() => onToggle(m.key)} />
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
          {m.label}
          {m.demo && <span className="text-[10px] font-semibold text-purple-500">(demo)</span>}
        </label>
      ))}
    </div>
  );
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
      Demo data
    </span>
  );
}

export function InsightCard({
  label,
  value,
  sublabel,
  demo,
}: {
  label: string;
  value: string;
  sublabel?: string;
  demo?: boolean;
}) {
  return (
    <Card className={demo ? "border-purple-200 bg-purple-50/40" : undefined}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium text-gray-500">{label}</div>
          {demo && <DemoBadge />}
        </div>
        <div className="text-xl font-bold text-gray-800 mt-1">{value}</div>
        {sublabel && <div className="text-xs text-gray-500 mt-0.5">{sublabel}</div>}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── chalky threshold ─────────────────────────── */

/** Tailwind classes for a value relative to the chalky threshold — used in both charts and tables. Not user-editable; uses the fixed default. */
export function chalkyToneClass(value: number, threshold: number = DEFAULT_CHALKY_THRESHOLD_PCT): string {
  return value > threshold ? "text-red-600 font-semibold" : "text-gray-700";
}

/* ─────────────────────────── variety / process filters (shared across all three domain panels) ─────────────────────────── */

export const ALL_VARIETIES = "__all_varieties__";
export const ALL_PROCESSES = "__all_processes__";

/** Narrows a sample list to one variety and/or one process — "All" (the default) passes everything through. */
export function filterSamplesByVarietyProcess(samples: FlatSample[], variety: string, process: string): FlatSample[] {
  return samples.filter((s) => (variety === ALL_VARIETIES || s.variety === variety) && (process === ALL_PROCESSES || s.process === process));
}

/**
 * Local "Variety" / "Process" narrowing for a single analysis panel — independent of the global
 * Data Reports filters, so a user can drill into one variety/process's comparison without changing
 * what the rest of the page shows. Only renders a dropdown when there's more than one option to pick from.
 */
export function VarietyProcessFilters({
  samples,
  variety,
  onVarietyChange,
  process,
  onProcessChange,
  hideProcess = false,
}: {
  samples: FlatSample[];
  variety: string;
  onVarietyChange: (v: string) => void;
  process: string;
  onProcessChange: (v: string) => void;
  /** Procurement doesn't need the Process filter — hide it without touching the shared Variety control. */
  hideProcess?: boolean;
}) {
  const varietyOptions = useMemo(() => [...new Set(samples.map((s) => s.variety))].sort(), [samples]);
  const processOptions = useMemo(() => (hideProcess ? [] : [...new Set(samples.map((s) => s.process))].sort()), [samples, hideProcess]);

  if (varietyOptions.length <= 1 && processOptions.length <= 1) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {varietyOptions.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Variety:</span>
          <Select value={variety} onValueChange={onVarietyChange}>
            <SelectTrigger className="h-8 text-xs w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VARIETIES} className="text-xs">
                All varieties (WHOLE)
              </SelectItem>
              {varietyOptions.map((v) => (
                <SelectItem key={v} value={v} className="text-xs">
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {processOptions.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Process:</span>
          <Select value={process} onValueChange={onProcessChange}>
            <SelectTrigger className="h-8 text-xs w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PROCESSES} className="text-xs">
                All processes
              </SelectItem>
              {processOptions.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── sample-wise vs day-wise granularity ─────────────────────────── */

export type Granularity = "sample" | "day";

/**
 * Sample-wise plots every individual sample; day-wise averages every sample from the same
 * calendar day into a single point. Applies to trend charts and detail tables — not to
 * variety/process/machine comparison charts, which already aggregate across the whole period.
 */
export function GranularityToggle({ value, onChange }: { value: Granularity; onChange: (v: Granularity) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-500 whitespace-nowrap">View:</span>
      <ToggleGroup type="single" value={value} onValueChange={(v) => v && onChange(v as Granularity)}>
        <ToggleGroupItem value="sample" className="text-xs px-3">
          Sample-wise
        </ToggleGroupItem>
        <ToggleGroupItem value="day" className="text-xs px-3">
          Day-wise
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

/* ─────────────────────────── shared Y-axis domain (for side-by-side scale matching) ─────────────────────────── */

/** Rounds a bucket's max metric value up to a friendly axis ceiling so two compared charts can share a domain. */
export function sharedYDomain(bucketSets: AggregateBucket[][], metrics: MetricKey[]): [number, number] {
  let max = 0;
  for (const buckets of bucketSets) {
    for (const b of buckets) {
      for (const mk of metrics) {
        max = Math.max(max, b.avg[mk] ?? 0);
      }
    }
  }
  if (max <= 0) return [0, 1];
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const ceiling = Math.ceil(max / magnitude) * magnitude;
  return [0, ceiling];
}

/* ─────────────────────────── sample-to-sample trend ─────────────────────────── */

interface OutlierDisplay {
  value: number;
  caption: string;
}

function sampleDisplay(s: FlatSample, key: MetricKey): OutlierDisplay {
  return { value: (s[key] as number) ?? 0, caption: `${format(new Date(s.date), "MMM dd")} · ${s.variety}` };
}

function bucketDisplay(b: AggregateBucket, key: MetricKey): OutlierDisplay {
  const n = b.count;
  return { value: b.avg[key] ?? 0, caption: `${format(new Date(b.key), "MMM dd")} · ${n} sample${n === 1 ? "" : "s"}` };
}

function OutlierCard({
  icon: Icon,
  label,
  display,
  metric,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  display: OutlierDisplay | null;
  metric: MetricDef;
  tone: "green" | "red";
}) {
  const toneClasses = tone === "green" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700";
  return (
    <Card className={`border ${toneClasses}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className="w-5 h-5 flex-shrink-0" />
        <div>
          <div className="text-xs font-medium opacity-80">{label}</div>
          {display ? (
            <>
              <div className="text-lg font-bold">
                {display.value.toFixed(1)}
                {metric.unit}
              </div>
              <div className="text-xs opacity-70">{display.caption}</div>
            </>
          ) : (
            <div className="text-sm opacity-60">—</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AbnormalCard({ count, metric, unitLabel }: { count: number; metric: MetricDef; unitLabel: string }) {
  return (
    <Card className="border bg-amber-50 border-amber-200 text-amber-700">
      <CardContent className="p-4 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <div>
          <div className="text-xs font-medium opacity-80">Abnormal / off-spec {unitLabel}</div>
          <div className="text-lg font-bold">{count}</div>
          <div className="text-xs opacity-70">±1.5σ from mean {metric.label.toLowerCase()}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SampleTrendChart({
  samples,
  metrics,
  title = "Sample-to-sample trend",
  granularity = "sample",
}: {
  samples: FlatSample[];
  metrics: MetricKey[];
  title?: string;
  granularity?: Granularity;
}) {
  const [showControlChart, setShowControlChart] = useState(false);
  const isDay = granularity === "day";
  const dayBuckets = useMemo(() => groupByDay(samples), [samples]);
  const primaryMetric = metricDef(metrics[0] ?? "goodRice");

  const primaryBest = isDay ? computeBucketOutliers(dayBuckets, primaryMetric.key, primaryMetric.higherIsBetter) : computeOutliers(samples, primaryMetric.key, primaryMetric.higherIsBetter);
  const bestDisplay = primaryBest.best ? (isDay ? bucketDisplay(primaryBest.best as AggregateBucket, primaryMetric.key) : sampleDisplay(primaryBest.best as FlatSample, primaryMetric.key)) : null;
  const worstDisplay = primaryBest.worst ? (isDay ? bucketDisplay(primaryBest.worst as AggregateBucket, primaryMetric.key) : sampleDisplay(primaryBest.worst as FlatSample, primaryMetric.key)) : null;

  const chartData = isDay
    ? dayBuckets.map((b) => ({ ...b.avg, label: format(new Date(b.key), "MMM dd") }))
    : samples.map((s, i) => ({ ...s, label: `#${i + 1} · ${format(new Date(s.date), "MMM dd")}` }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <OutlierCard icon={Trophy} label={isDay ? "Best day" : "Best sample"} display={bestDisplay} metric={primaryMetric} tone="green" />
        <OutlierCard icon={ThumbsDown} label={isDay ? "Worst day" : "Worst sample"} display={worstDisplay} metric={primaryMetric} tone="red" />
        <AbnormalCard count={primaryBest.abnormal.length} metric={primaryMetric} unitLabel={isDay ? "days" : "samples"} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-rice-primary">{title}</span>
        <button
          type="button"
          onClick={() => setShowControlChart((v) => !v)}
          className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
            showControlChart
              ? "bg-rice-primary/10 border-rice-primary/30 text-rice-primary"
              : "border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          Control chart {showControlChart ? "on" : "off"}
        </button>
      </div>

      {metrics.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Select at least one parameter above to see its trend.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {metrics.map((mk) => {
            const def = metricDef(mk);
            const outliers = isDay ? computeBucketOutliers(dayBuckets, mk, def.higherIsBetter) : computeOutliers(samples, mk, def.higherIsBetter);
            return (
              <Card key={mk}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold" style={{ color: def.color }}>
                    {def.label} {def.unit ? `(${def.unit})` : ""}
                    {def.demo && <span className="text-purple-500 font-normal"> · demo</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                        <Line type="monotone" dataKey={mk} name={def.label} stroke={def.color} strokeWidth={2} dot={{ r: 3 }} />
                        {showControlChart && (
                          <>
                            <ReferenceLine y={outliers.mean} stroke={def.color} strokeDasharray="4 4" label={{ value: "Mean", fontSize: 9, position: "right" }} />
                            <ReferenceLine
                              y={outliers.mean + 2 * outliers.stdDev}
                              stroke="#ef4444"
                              strokeDasharray="3 3"
                              label={{ value: "UCL", fontSize: 9, position: "right" }}
                            />
                            <ReferenceLine
                              y={Math.max(0, outliers.mean - 2 * outliers.stdDev)}
                              stroke="#ef4444"
                              strokeDasharray="3 3"
                              label={{ value: "LCL", fontSize: 9, position: "right" }}
                            />
                          </>
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── sample-wise heatmap (most recent N samples) ─────────────────────────── */

/**
 * Sample-wise view as a heat strip per metric, instead of a line trend — one cell per sample,
 * capped to the most recent `maxSamples` so the row stays readable. Day-wise still uses
 * `SampleTrendChart`; this is only for the sample granularity.
 */
export function SampleMetricHeatmap({
  samples,
  metrics,
  maxSamples = 15,
}: {
  samples: FlatSample[];
  metrics: MetricKey[];
  maxSamples?: number;
}) {
  const limited = useMemo(() => samples.slice(-maxSamples), [samples, maxSamples]);

  if (limited.length === 0 || metrics.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No data available for selected filters.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-rice-primary">
          Sample-wise heatmap (last {limited.length} sample{limited.length === 1 ? "" : "s"})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-auto">
        {metrics.map((mk) => {
          const def = metricDef(mk);
          const values = limited.map((s) => (s[mk] as number) ?? 0);
          const min = Math.min(...values);
          const max = Math.max(...values);
          return (
            <div key={mk}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-600">
                  {def.label} {def.unit ? `(${def.unit})` : ""}
                  {def.demo && <span className="text-purple-500 font-normal"> · demo</span>}
                </span>
              </div>
              <HeatLegend metric={def} min={min} max={max} />
              <div className="flex gap-1 min-w-max">
                {limited.map((s, i) => {
                  const value = (s[mk] as number) ?? 0;
                  return (
                    <div key={s.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div
                        title={`S${i + 1} · ${format(new Date(s.date), "MMM dd, yyyy")} · ${s.variety} · ${value.toFixed(1)}${def.unit}`}
                        className="w-11 h-9 rounded-md flex items-center justify-center text-[10px] font-semibold text-white transition-transform duration-150 hover:scale-[1.08] hover:shadow-md"
                        style={{ backgroundColor: heatColor(value, min, max, def.higherIsBetter) }}
                      >
                        {value.toFixed(0)}
                      </div>
                      <span className="text-[9px] font-medium text-gray-400">S{i + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── grouped comparison (bar) ─────────────────────────── */

export function GroupedComparisonSection({
  title,
  buckets,
  metrics,
  yDomain,
}: {
  title: string;
  buckets: AggregateBucket[];
  metrics: MetricKey[];
  /** Forces a shared Y-axis range — e.g. so a Line A and Line B chart for the same metric read at the same scale. */
  yDomain?: [number, number];
}) {
  if (buckets.length < 2) return null;
  const chartData = buckets.map((b) => ({ name: b.key, ...b.avg }));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-rice-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={yDomain} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {metrics.map((mk) => {
                const def = metricDef(mk);
                return <Bar key={mk} dataKey={mk} name={def.label} fill={def.color} radius={[4, 4, 0, 0]} />;
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── scatter ─────────────────────────── */

export function ScatterPanel({ samples, title = "Sample weight vs. good rice %" }: { samples: FlatSample[]; title?: string }) {
  const data = samples.map((s) => ({ weight: s.weight, goodRice: s.goodRice, variety: s.variety }));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-rice-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis type="number" dataKey="weight" name="Weight" unit="g" tick={{ fontSize: 11 }} />
              <YAxis type="number" dataKey="goodRice" name="Good Rice" unit="%" tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={CHART_TOOLTIP_STYLE} />
              <Scatter data={data} fill="#0B4CAD" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── composition pie ─────────────────────────── */

export function CompositionPieChart({ samples, title = "Overall quality composition" }: { samples: FlatSample[]; title?: string }) {
  if (samples.length === 0) return null;
  const totals = samples.reduce(
    (acc, s) => {
      acc.goodRice += s.goodRice;
      acc.rejection += s.rejection;
      acc.foreignMatter += s.foreignMatter;
      return acc;
    },
    { goodRice: 0, rejection: 0, foreignMatter: 0 }
  );
  const data = [
    { name: "Good Rice", value: totals.goodRice / samples.length, color: "#0B4CAD" },
    { name: "Rejection", value: totals.rejection / samples.length, color: "#6366f1" },
    { name: "Brokens & FM", value: totals.foreignMatter / samples.length, color: "#f59e0b" },
  ];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-rice-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value" nameKey="name">
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, ""]} contentStyle={CHART_TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── variety radar ─────────────────────────── */

export function VarietyRadarChart({ buckets, title = "Variety quality profile" }: { buckets: AggregateBucket[]; title?: string }) {
  const top = buckets.slice(0, 5);
  if (top.length < 2) return null;

  const axisKeys: { key: MetricKey; label: string; invert?: boolean }[] = [
    { key: "goodRice", label: "Good Rice" },
    { key: "rejection", label: "Low Rejection", invert: true },
    { key: "foreignMatter", label: "Low Brokens/FM", invert: true },
  ];
  const radarData = axisKeys.map((axis) => {
    const row: Record<string, string | number> = { axis: axis.label };
    for (const b of top) {
      const raw = b.avg[axis.key];
      row[b.key] = axis.invert ? Math.max(0, 100 - raw) : raw;
    }
    return row;
  });
  const colors = ["#0B4CAD", "#eab308", "#10b981", "#f97316", "#6366f1"];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-rice-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
              {top.map((b, i) => (
                <Radar key={b.key} name={b.key} dataKey={b.key} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.25} />
              ))}
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── entity-to-entity comparison (machine or series) ─────────────────────────── */

/** Relative min–max colour scale within the values actually shown, so every metric (% or g) reads sensibly. */
function heatColor(value: number, min: number, max: number, higherIsBetter: boolean): string {
  const range = max - min || 1;
  let pct = ((value - min) / range) * 100;
  if (!higherIsBetter) pct = 100 - pct;
  pct = Math.max(0, Math.min(100, pct));
  const hue = (pct / 100) * 120; // 0 = red, 120 = green
  return `hsl(${hue}, 65%, 45%)`;
}

interface EntitySampleRow {
  entity: string;
  samples: FlatSample[];
}

function HeatLegend({ metric, min, max }: { metric: MetricDef; min: number; max: number }) {
  const lowLabel = metric.higherIsBetter ? "Lower" : "Higher";
  const highLabel = metric.higherIsBetter ? "Higher" : "Lower";
  return (
    <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-3">
      <span>
        {lowLabel} ({min.toFixed(1)}
        {metric.unit})
      </span>
      <span className="h-2 w-28 rounded-full" style={{ background: "linear-gradient(90deg, hsl(0,65%,45%), hsl(60,65%,45%), hsl(120,65%,45%))" }} />
      <span>
        {highLabel} ({max.toFixed(1)}
        {metric.unit})
      </span>
    </div>
  );
}

/** Entities × sample-sequence table for one metric — columns are "this entity's Nth sample", not a shared calendar date, so the date is only ever shown on hover. */
function EntityMetricHeatmap({ entityRows, metric }: { entityRows: EntitySampleRow[]; metric: MetricDef }) {
  const maxCols = Math.max(0, ...entityRows.map((r) => r.samples.length));
  if (maxCols === 0) return null;
  const values = entityRows.flatMap((r) => r.samples.map((s) => s[metric.key]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const cols = Array.from({ length: maxCols }, (_, i) => i);

  return (
    <div>
      <HeatLegend metric={metric} min={min} max={max} />
      <div className="inline-block min-w-full rounded-lg border border-gray-100 overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: `168px repeat(${maxCols}, minmax(46px, 1fr))` }}>
          <div className="bg-gray-50 border-b border-r border-gray-100" />
          {cols.map((i) => (
            <div key={i} className="text-[10px] text-gray-500 text-center py-1.5 font-semibold bg-gray-50 border-b border-gray-100">
              S{i + 1}
            </div>
          ))}
          {entityRows.map((row, rowIdx) => (
            <Fragment key={row.entity}>
              <div
                title={row.entity}
                className={`text-xs font-medium text-gray-700 py-1.5 px-2.5 truncate border-r border-gray-100 flex items-center ${
                  rowIdx % 2 === 1 ? "bg-gray-50/60" : "bg-white"
                }`}
              >
                {row.entity}
              </div>
              {cols.map((i) => {
                const s = row.samples[i];
                const value = s ? s[metric.key] : null;
                return (
                  <div
                    key={i}
                    className="m-[3px] rounded-md text-[10px] font-semibold flex items-center justify-center transition-transform duration-150 hover:scale-[1.08] hover:shadow-md"
                    style={{
                      backgroundColor: value != null ? heatColor(value, min, max, metric.higherIsBetter) : "#f3f4f6",
                      color: value != null ? "white" : "#d1d5db",
                      minHeight: 30,
                    }}
                    title={s ? `${row.entity} · Sample #${i + 1} · ${format(new Date(s.date), "MMM dd, yyyy")} · ${value?.toFixed(1)}${metric.unit}` : "No sample"}
                  >
                    {value != null ? value.toFixed(0) : "—"}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function EntityHighlightCard({ label, bucket, tone }: { label: string; bucket: AggregateBucket; tone: "green" | "red" }) {
  const toneClasses = tone === "green" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700";
  return (
    <Card className={`border ${toneClasses}`}>
      <CardContent className="p-4">
        <div className="text-xs font-medium opacity-80">{label}</div>
        <div className="text-lg font-bold">{bucket.key}</div>
        <div className="text-xs opacity-70">
          Good rice avg {bucket.avg.goodRice.toFixed(1)}% · {bucket.count} samples
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Generic "compare N entities" panel — used for both Machine-to-Machine and
 * Series-to-Series. Caller supplies pre-grouped buckets and a per-sample entity
 * key function (for the day heatmap); this component only renders.
 */
export function EntityComparisonPanel({
  entityLabel,
  buckets,
  samples,
  metrics,
  entityKeyFn,
}: {
  entityLabel: string;
  buckets: AggregateBucket[];
  samples: FlatSample[];
  metrics: MetricKey[];
  entityKeyFn: (s: FlatSample) => string | undefined;
}) {
  const [heatmapMetric, setHeatmapMetric] = useState<MetricKey>(metrics[0] ?? "goodRice");

  if (buckets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No {entityLabel.toLowerCase()} information available for these samples.</p>
      </div>
    );
  }

  const entityRows: EntitySampleRow[] = buckets.map((b) => ({
    entity: b.key,
    samples: samples.filter((s) => entityKeyFn(s) === b.key).sort((a, c) => new Date(a.date).getTime() - new Date(c.date).getTime()),
  }));
  const hasAnySamples = entityRows.some((r) => r.samples.length > 0);
  const activeHeatmapMetric = metrics.includes(heatmapMetric) ? heatmapMetric : (metrics[0] ?? "goodRice");

  const chartData = buckets.map((b) => ({ name: b.key, ...b.avg }));
  const best = buckets[0];
  const worst = buckets[buckets.length - 1];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <EntityHighlightCard label={`Best-performing ${entityLabel.toLowerCase()}`} bucket={best} tone="green" />
        <EntityHighlightCard label="Needs attention" bucket={worst} tone="red" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-rice-primary">{entityLabel} comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {metrics.map((mk) => {
                  const def = metricDef(mk);
                  return <Bar key={mk} dataKey={mk} name={def.label} fill={def.color} radius={[4, 4, 0, 0]} />;
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {hasAnySamples && (
        <Card>
          <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-sm font-semibold text-rice-primary">{entityLabel} × sample</CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {metrics.map((mk) => {
                const def = metricDef(mk);
                const isActive = mk === activeHeatmapMetric;
                return (
                  <button
                    key={mk}
                    type="button"
                    onClick={() => setHeatmapMetric(mk)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                      isActive ? "text-white border-transparent shadow-sm" : "text-gray-500 border-gray-200 hover:bg-gray-50"
                    }`}
                    style={isActive ? { backgroundColor: def.color } : undefined}
                  >
                    {def.label}
                    {def.demo && " · demo"}
                  </button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <EntityMetricHeatmap entityRows={entityRows} metric={metricDef(activeHeatmapMetric)} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
