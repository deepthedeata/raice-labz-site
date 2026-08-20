import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  type AnalyticsProcess,
  type MetricKey,
  flattenSamples,
  groupByVariety,
  uniqueCount,
  mostFrequent,
  demoProcurementExtras,
} from "@/lib/reportsAnalytics";
import {
  MetricPicker,
  SampleTrendChart,
  GroupedComparisonSection,
  CompositionPieChart,
  VarietyRadarChart,
  ScatterPanel,
  InsightCard,
  DemoBadge,
  CHART_TOOLTIP_STYLE,
} from "./analyticsCharts";

export function ProcurementAnalyticsPanel({ processes }: { processes: AnalyticsProcess[] }) {
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(["goodRice", "rejection", "foreignMatter"]);

  const samples = useMemo(() => flattenSamples(processes), [processes]);
  const varietyBuckets = useMemo(() => groupByVariety(samples), [samples]);
  const uniqueVarieties = useMemo(() => uniqueCount(samples, (s) => s.variety), [samples]);
  const topVariety = useMemo(() => mostFrequent(samples, (s) => s.variety), [samples]);
  const totalQuantityKg = useMemo(() => samples.reduce((sum, s) => sum + s.weight, 0) / 1000, [samples]);

  const demoSeries = useMemo(() => samples.map((s) => ({ ...s, ...demoProcurementExtras(s.processId, s.date) })), [samples]);
  const uniqueMandi = useMemo(() => new Set(demoSeries.map((s) => s.mandi)).size, [demoSeries]);
  const uniqueVehicles = useMemo(() => new Set(demoSeries.map((s) => s.vehicleNumber)).size, [demoSeries]);

  const demoDayBuckets = useMemo(() => {
    const byDay = new Map<string, { price: number[]; moisture: number[] }>();
    for (const s of demoSeries) {
      const dayKey = new Date(s.date).toISOString().slice(0, 10);
      if (!byDay.has(dayKey)) byDay.set(dayKey, { price: [], moisture: [] });
      const bucket = byDay.get(dayKey) as { price: number[]; moisture: number[] };
      bucket.price.push(s.pricePerKg);
      bucket.moisture.push(s.moisturePct);
    }
    return [...byDay.entries()]
      .map(([day, v]) => ({
        day,
        dateLabel: format(new Date(day), "MMM dd"),
        avgPrice: v.price.reduce((a, b) => a + b, 0) / v.price.length,
        avgMoisture: v.moisture.reduce((a, b) => a + b, 0) / v.moisture.length,
      }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [demoSeries]);

  const avgPrice = demoDayBuckets.length > 0 ? demoDayBuckets.reduce((s, d) => s + d.avgPrice, 0) / demoDayBuckets.length : 0;
  const avgMoisture = demoDayBuckets.length > 0 ? demoDayBuckets.reduce((s, d) => s + d.avgMoisture, 0) / demoDayBuckets.length : 0;

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  if (samples.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No procurement samples match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-rice-primary">Sample-to-sample analytics</span>
        <MetricPicker active={activeMetrics} onToggle={toggleMetric} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <InsightCard label="Varieties procured" value={String(uniqueVarieties)} sublabel={`${samples.length} samples total`} />
        <InsightCard label="Most-sampled variety" value={topVariety?.value ?? "—"} sublabel={topVariety ? `${topVariety.count} samples` : undefined} />
        <InsightCard label="Paddy received" value={`${totalQuantityKg.toFixed(1)} kg`} sublabel="in selected range" />
        <InsightCard label="Varieties compared" value={String(varietyBuckets.length)} sublabel="in charts below" />
      </div>

      <SampleTrendChart samples={samples} metrics={activeMetrics} />

      <GroupedComparisonSection title="Variety comparison" buckets={varietyBuckets} metrics={activeMetrics} />
      <CompositionPieChart samples={samples} />
      <VarietyRadarChart buckets={varietyBuckets} />
      <ScatterPanel samples={samples} />

      <div className="pt-4 border-t">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-700">Mandi, vehicle, price &amp; moisture</h3>
          <DemoBadge />
          <span className="text-xs text-gray-400">— not tracked by the backend yet; shown as illustrative sample data</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <InsightCard label="Unique mandis" value={String(uniqueMandi)} demo />
          <InsightCard label="Unique vehicles" value={String(uniqueVehicles)} demo />
          <InsightCard label="Avg. paddy price" value={`₹${avgPrice.toFixed(2)}/kg`} demo />
          <InsightCard label="Avg. paddy moisture" value={`${avgMoisture.toFixed(1)}%`} demo />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DemoTrendChart title="Paddy price trend (₹/kg)" data={demoDayBuckets} dataKey="avgPrice" color="#16a34a" valuePrefix="₹" />
          <DemoTrendChart title="Paddy moisture trend (%)" data={demoDayBuckets} dataKey="avgMoisture" color="#0891b2" valueSuffix="%" />
        </div>
      </div>
    </div>
  );
}

function DemoTrendChart({
  title,
  data,
  dataKey,
  color,
  valuePrefix = "",
  valueSuffix = "",
}: {
  title: string;
  data: { dateLabel: string; avgPrice: number; avgMoisture: number }[];
  dataKey: "avgPrice" | "avgMoisture";
  color: string;
  valuePrefix?: string;
  valueSuffix?: string;
}) {
  return (
    <Card className="border-purple-200">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold text-rice-primary">{title}</CardTitle>
        <DemoBadge />
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${valuePrefix}${v.toFixed(2)}${valueSuffix}`, ""]} contentStyle={CHART_TOOLTIP_STYLE} />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
