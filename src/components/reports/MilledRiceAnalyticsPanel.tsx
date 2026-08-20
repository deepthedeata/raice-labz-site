import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  type AnalyticsProcess,
  type MetricKey,
  flattenSamples,
  groupByVariety,
  uniqueCount,
  mostFrequent,
} from "@/lib/reportsAnalytics";
import { MetricPicker, SampleTrendChart, GroupedComparisonSection, CompositionPieChart, InsightCard } from "./analyticsCharts";

export function MilledRiceAnalyticsPanel({ processes }: { processes: AnalyticsProcess[] }) {
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(["goodRice", "rejection", "foreignMatter"]);

  const samples = useMemo(() => flattenSamples(processes), [processes]);
  const varietyBuckets = useMemo(() => groupByVariety(samples), [samples]);
  const uniqueVarieties = useMemo(() => uniqueCount(samples, (s) => s.variety), [samples]);
  const topVariety = useMemo(() => mostFrequent(samples, (s) => s.variety), [samples]);
  const totalQuantityKg = useMemo(() => samples.reduce((sum, s) => sum + s.weight, 0) / 1000, [samples]);

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  if (samples.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No milled rice samples match the current filters.</p>
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
        <InsightCard label="Varieties milled" value={String(uniqueVarieties)} sublabel={`${samples.length} samples total`} />
        <InsightCard label="Most-sampled variety" value={topVariety?.value ?? "—"} sublabel={topVariety ? `${topVariety.count} samples` : undefined} />
        <InsightCard label="Finished rice produced" value={`${totalQuantityKg.toFixed(1)} kg`} sublabel="in selected range" />
        <InsightCard label="Varieties compared" value={String(varietyBuckets.length)} sublabel="in charts below" />
      </div>

      <SampleTrendChart samples={samples} metrics={activeMetrics} />

      <GroupedComparisonSection title="Variety comparison" buckets={varietyBuckets} metrics={activeMetrics} />
      <CompositionPieChart samples={samples} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-rice-primary">Every sample — full detail</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Variety</TableHead>
                <TableHead className="text-xs">Process</TableHead>
                <TableHead className="text-xs">Machine</TableHead>
                <TableHead className="text-xs text-right">Sample #</TableHead>
                <TableHead className="text-xs text-right">Good Rice %</TableHead>
                <TableHead className="text-xs text-right">Rejection %</TableHead>
                <TableHead className="text-xs text-right">Brokens &amp; FM %</TableHead>
                <TableHead className="text-xs text-right">Weight (g)</TableHead>
                <TableHead className="text-xs text-right">Whiteness Index (demo)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {samples.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">{format(new Date(s.date), "MMM dd, yyyy")}</TableCell>
                  <TableCell className="text-xs">{s.variety}</TableCell>
                  <TableCell className="text-xs">{s.process}</TableCell>
                  <TableCell className="text-xs">{s.machineName ?? "—"}</TableCell>
                  <TableCell className="text-xs text-right">{s.sampleNumber}</TableCell>
                  <TableCell className="text-xs text-right font-medium">{s.goodRice.toFixed(1)}</TableCell>
                  <TableCell className="text-xs text-right">{s.rejection.toFixed(1)}</TableCell>
                  <TableCell className="text-xs text-right">{s.foreignMatter.toFixed(1)}</TableCell>
                  <TableCell className="text-xs text-right">{s.weight.toFixed(0)}</TableCell>
                  <TableCell className="text-xs text-right text-purple-500">{s.whitenessIndex.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
