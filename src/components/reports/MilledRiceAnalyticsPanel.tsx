import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  type AnalyticsProcess,
  type MetricKey,
  MILLED_RICE_METRICS,
  flattenSamples,
  groupByVariety,
  groupByDay,
  uniqueCount,
  mostFrequent,
} from "@/lib/reportsAnalytics";
import {
  MetricPicker,
  SampleTrendChart,
  GroupedComparisonSection,
  CompositionPieChart,
  InsightCard,
  chalkyToneClass,
  VarietyProcessFilters,
  filterSamplesByVarietyProcess,
  ALL_VARIETIES,
  ALL_PROCESSES,
  GranularityToggle,
  type Granularity,
} from "./analyticsCharts";

export function MilledRiceAnalyticsPanel({ processes }: { processes: AnalyticsProcess[] }) {
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(["goodRice", "brokenPct", "chalkyPct", "whitenessIndex"]);
  const [compareEnabled, setCompareEnabled] = useState(false); // OFF by default per the APIT Analytics UI script §7
  const [varietyFilter, setVarietyFilter] = useState(ALL_VARIETIES);
  const [processFilter, setProcessFilter] = useState(ALL_PROCESSES);
  const [granularity, setGranularity] = useState<Granularity>("sample");

  const allSamples = useMemo(() => flattenSamples(processes), [processes]);
  const samples = useMemo(() => filterSamplesByVarietyProcess(allSamples, varietyFilter, processFilter), [allSamples, varietyFilter, processFilter]);
  const varietyBuckets = useMemo(() => groupByVariety(samples), [samples]);
  const dayBuckets = useMemo(() => groupByDay(samples), [samples]);
  const uniqueVarieties = useMemo(() => uniqueCount(samples, (s) => s.variety), [samples]);
  const topVariety = useMemo(() => mostFrequent(samples, (s) => s.variety), [samples]);
  const totalQuantityKg = useMemo(() => samples.reduce((sum, s) => sum + s.weight, 0) / 1000, [samples]);

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  if (allSamples.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No data available for selected filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-rice-primary">Final Milled Rice Quality</span>
          <VarietyProcessFilters samples={allSamples} variety={varietyFilter} onVarietyChange={setVarietyFilter} process={processFilter} onProcessChange={setProcessFilter} />
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <MetricPicker active={activeMetrics} onToggle={toggleMetric} available={MILLED_RICE_METRICS} />
        </div>
      </div>

      {samples.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No data available for selected filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <InsightCard label="Varieties milled" value={String(uniqueVarieties)} sublabel={`${samples.length} samples total`} />
            <InsightCard label="Most-sampled variety" value={topVariety?.value ?? "—"} sublabel={topVariety ? `${topVariety.count} samples` : undefined} />
            <InsightCard label="Finished rice produced" value={`${totalQuantityKg.toFixed(1)} kg`} sublabel="in selected range" />
            <InsightCard label="Varieties compared" value={String(varietyBuckets.length)} sublabel="in charts below" />
          </div>

          <GranularityToggle value={granularity} onChange={setGranularity} />
          <SampleTrendChart samples={samples} metrics={activeMetrics} granularity={granularity} />

          <label className="flex items-center gap-2 text-sm cursor-pointer select-none w-fit">
            <Checkbox checked={compareEnabled} onCheckedChange={(v) => setCompareEnabled(Boolean(v))} />
            <span className="font-medium text-gray-700">Compare</span>
            <span className="text-xs text-gray-400">— line/variety comparison is off by default; enable to compare</span>
          </label>

          {compareEnabled && <GroupedComparisonSection title="Variety comparison" buckets={varietyBuckets} metrics={activeMetrics} />}
          <CompositionPieChart samples={samples} />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-rice-primary">
                {granularity === "day" ? "Every day — averaged detail" : "Every sample — full detail"}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {granularity === "day" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs text-right">Samples</TableHead>
                      <TableHead className="text-xs text-right">Head Rice %</TableHead>
                      <TableHead className="text-xs text-right">Broken %</TableHead>
                      <TableHead className="text-xs text-right">Chalky %</TableHead>
                      <TableHead className="text-xs text-right">Discoloured %</TableHead>
                      <TableHead className="text-xs text-right">Whiteness Index</TableHead>
                      <TableHead className="text-xs text-right">DON</TableHead>
                      <TableHead className="text-xs text-right">Total Weight (g)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayBuckets.map((b) => (
                      <TableRow key={b.key}>
                        <TableCell className="text-xs">{format(new Date(b.key), "MMM dd, yyyy")}</TableCell>
                        <TableCell className="text-xs text-right">{b.count}</TableCell>
                        <TableCell className="text-xs text-right font-medium">{b.avg.goodRice.toFixed(1)}</TableCell>
                        <TableCell className="text-xs text-right">{b.avg.brokenPct.toFixed(1)}</TableCell>
                        <TableCell className={`text-xs text-right ${chalkyToneClass(b.avg.chalkyPct)}`}>{b.avg.chalkyPct.toFixed(1)}</TableCell>
                        <TableCell className="text-xs text-right">{b.avg.discoloured.toFixed(1)}</TableCell>
                        <TableCell className="text-xs text-right text-purple-500">{b.avg.whitenessIndex.toFixed(1)}</TableCell>
                        <TableCell className="text-xs text-right">{b.avg.donValue.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-right">{b.total.weight.toFixed(0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Variety</TableHead>
                      <TableHead className="text-xs">Process</TableHead>
                      <TableHead className="text-xs">Machine</TableHead>
                      <TableHead className="text-xs text-right">Sample #</TableHead>
                      <TableHead className="text-xs text-right">Head Rice %</TableHead>
                      <TableHead className="text-xs text-right">Broken %</TableHead>
                      <TableHead className="text-xs text-right">Chalky %</TableHead>
                      <TableHead className="text-xs text-right">Discoloured %</TableHead>
                      <TableHead className="text-xs text-right">Whiteness Index</TableHead>
                      <TableHead className="text-xs text-right">DON</TableHead>
                      <TableHead className="text-xs text-right">Weight (g)</TableHead>
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
                        <TableCell className="text-xs text-right">{s.brokenPct.toFixed(1)}</TableCell>
                        <TableCell className={`text-xs text-right ${chalkyToneClass(s.chalkyPct)}`}>{s.chalkyPct.toFixed(1)}</TableCell>
                        <TableCell className="text-xs text-right">{s.discoloured.toFixed(1)}</TableCell>
                        <TableCell className="text-xs text-right text-purple-500">{s.whitenessIndex.toFixed(1)}</TableCell>
                        <TableCell className="text-xs text-right">{s.donValue.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-right">{s.weight.toFixed(0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
