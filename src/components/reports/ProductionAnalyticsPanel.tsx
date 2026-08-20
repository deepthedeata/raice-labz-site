import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  type AnalyticsProcess,
  type FlatSample,
  type MetricKey,
  flattenSamples,
  groupByKey,
  groupByVariety,
  generateDemoSamples,
} from "@/lib/reportsAnalytics";
import { MetricPicker, SampleTrendChart, GroupedComparisonSection, EntityComparisonPanel, DemoBadge } from "./analyticsCharts";

type Mode = "machine" | "series";

const ALL_VARIETIES = "__all__";
const COMPARE_ALL = "__compare_all__";

interface ProductionAnalyticsPanelProps {
  processes: AnalyticsProcess[];
  /** Every line/machine configured in the mill's settings, not just ones with samples in the current filters. */
  lineNames: string[];
  lineMachines: string[];
  /** Which machines belong to each line, so a selected series can show its own machine-to-machine breakdown. */
  millLines: { name: string; machines: string[] }[];
}

function matchesLine(sample: FlatSample, lineName: string): boolean {
  return sample.modeType === "tma" && !!sample.process && sample.process.toLowerCase().includes(lineName.toLowerCase());
}

function DemoNotice({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
      <DemoBadge />
      <span>{label} hasn&apos;t produced any real samples in the current filters yet — showing illustrative demo analytics instead.</span>
    </div>
  );
}

export function ProductionAnalyticsPanel({ processes, lineNames, lineMachines, millLines }: ProductionAnalyticsPanelProps) {
  const allSamples = useMemo(() => flattenSamples(processes), [processes]);
  const varietyOptions = useMemo(() => [...new Set(allSamples.map((s) => s.variety))].sort(), [allSamples]);

  const [varietyFilter, setVarietyFilter] = useState<string>(ALL_VARIETIES);
  const samples = useMemo(
    () => (varietyFilter === ALL_VARIETIES ? allSamples : allSamples.filter((s) => s.variety === varietyFilter)),
    [allSamples, varietyFilter]
  );

  const machineNames = useMemo(
    () => (lineMachines.length > 0 ? lineMachines : [...new Set(samples.map((s) => s.machineName).filter((m): m is string => !!m))]),
    [lineMachines, samples]
  );

  const [mode, setMode] = useState<Mode>("machine");
  const [machineValue, setMachineValue] = useState<string>(COMPARE_ALL);
  const [seriesValue, setSeriesValue] = useState<string>(COMPARE_ALL);
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(["goodRice", "rejection", "foreignMatter"]);

  const itemNames = mode === "machine" ? machineNames : lineNames;
  const rawItemValue = mode === "machine" ? machineValue : seriesValue;
  const effectiveItem = itemNames.length === 1 ? itemNames[0] : rawItemValue === COMPARE_ALL || itemNames.includes(rawItemValue) ? rawItemValue : COMPARE_ALL;
  const isCompareAll = effectiveItem === COMPARE_ALL;

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  // ---- single-item (machine or series) view ----
  const realScopedSamples = useMemo(() => {
    if (isCompareAll) return [];
    return mode === "machine" ? samples.filter((s) => s.machineName === effectiveItem) : samples.filter((s) => matchesLine(s, effectiveItem));
  }, [samples, mode, effectiveItem, isCompareAll]);

  const usingItemDemo = !isCompareAll && itemNames.length > 0 && realScopedSamples.length === 0;
  const scopedSamples = useMemo(
    () => (usingItemDemo ? generateDemoSamples(effectiveItem, "production") : realScopedSamples),
    [usingItemDemo, effectiveItem, realScopedSamples]
  );
  const varietyBuckets = useMemo(() => groupByVariety(scopedSamples), [scopedSamples]);

  // ---- compare-all machines view ----
  const realMachineBuckets = useMemo(
    () =>
      groupByKey(
        samples.filter((s) => machineNames.includes(s.machineName ?? "")),
        (s) => s.machineName as string
      ).sort((a, b) => b.avg.goodRice - a.avg.goodRice),
    [samples, machineNames]
  );
  const usingMachineDemo = machineNames.length > 0 && realMachineBuckets.length === 0;
  const machineSamplesForCompare = useMemo(
    () => (usingMachineDemo ? machineNames.flatMap((m) => generateDemoSamples(m, "production")) : samples),
    [usingMachineDemo, machineNames, samples]
  );
  const machineBuckets = useMemo(
    () =>
      usingMachineDemo
        ? groupByKey(machineSamplesForCompare, (s) => s.machineName as string).sort((a, b) => b.avg.goodRice - a.avg.goodRice)
        : realMachineBuckets,
    [usingMachineDemo, machineSamplesForCompare, realMachineBuckets]
  );

  // ---- compare-all series view ----
  const realLineBuckets = useMemo(
    () =>
      lineNames
        .map((name) => ({ name, rows: samples.filter((s) => matchesLine(s, name)) }))
        .filter((l) => l.rows.length > 0)
        .map(({ name, rows }) => groupByKey(rows, () => name)[0]),
    [samples, lineNames]
  );
  const usingSeriesDemo = lineNames.length > 0 && realLineBuckets.length === 0;
  const seriesSamplesForCompare = useMemo(
    () => (usingSeriesDemo ? lineNames.flatMap((name) => generateDemoSamples(name, "production")) : samples.filter((s) => s.modeType === "tma")),
    [usingSeriesDemo, lineNames, samples]
  );
  const lineBuckets = useMemo(
    () => (usingSeriesDemo ? groupByKey(seriesSamplesForCompare, (s) => s.process).sort((a, b) => b.avg.goodRice - a.avg.goodRice) : realLineBuckets),
    [usingSeriesDemo, seriesSamplesForCompare, realLineBuckets]
  );

  // ---- machine-to-machine breakdown within a selected series ----
  const selectedLineMachines = useMemo(() => {
    if (mode !== "series" || isCompareAll) return [] as string[];
    const configured = millLines.find((l) => l.name === effectiveItem)?.machines ?? [];
    return configured.length > 0 ? configured : machineNames;
  }, [mode, isCompareAll, effectiveItem, millLines, machineNames]);

  const withinSeriesUsingAnyDemo = useMemo(
    () => selectedLineMachines.some((m) => samples.filter((s) => s.machineName === m).length === 0),
    [selectedLineMachines, samples]
  );
  const withinSeriesSamples = useMemo(
    () =>
      selectedLineMachines.flatMap((m) => {
        const real = samples.filter((s) => s.machineName === m);
        return real.length > 0 ? real : generateDemoSamples(m, "production");
      }),
    [selectedLineMachines, samples]
  );
  const withinSeriesBuckets = useMemo(
    () => groupByKey(withinSeriesSamples, (s) => s.machineName as string).sort((a, b) => b.avg.goodRice - a.avg.goodRice),
    [withinSeriesSamples]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as Mode)}>
            <ToggleGroupItem value="machine" className="text-xs px-3">
              Single Machine
            </ToggleGroupItem>
            <ToggleGroupItem value="series" className="text-xs px-3">
              Series
            </ToggleGroupItem>
          </ToggleGroup>

          {itemNames.length > 1 && (
            <Select value={effectiveItem} onValueChange={mode === "machine" ? setMachineValue : setSeriesValue}>
              <SelectTrigger className="h-8 text-xs w-[240px]">
                <SelectValue placeholder={mode === "machine" ? "Choose a machine" : "Choose a series"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={COMPARE_ALL} className="text-xs font-semibold">
                  {mode === "machine" ? "All Machines (Compare)" : "All Series (Compare)"}
                </SelectItem>
                {itemNames.map((name) => {
                  const count = mode === "machine" ? samples.filter((s) => s.machineName === name).length : samples.filter((s) => matchesLine(s, name)).length;
                  return (
                    <SelectItem key={name} value={name} className="text-xs">
                      {count > 0 ? name : `${name} (demo)`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}

          {varietyOptions.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Variety:</span>
              <Select value={varietyFilter} onValueChange={setVarietyFilter}>
                <SelectTrigger className="h-8 text-xs w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VARIETIES} className="text-xs">
                    All varieties
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
        </div>
        <MetricPicker active={activeMetrics} onToggle={toggleMetric} />
      </div>

      {itemNames.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No {mode === "machine" ? "machines" : "series/lines"} are configured in the machine database yet.</p>
        </div>
      ) : isCompareAll ? (
        <>
          {mode === "machine" && usingMachineDemo && <DemoNotice label="None of the configured machines" />}
          {mode === "series" && usingSeriesDemo && <DemoNotice label="None of the configured series" />}
          {mode === "machine" ? (
            <EntityComparisonPanel entityLabel="Machine" buckets={machineBuckets} samples={machineSamplesForCompare} metrics={activeMetrics} entityKeyFn={(s) => s.machineName} />
          ) : (
            <EntityComparisonPanel
              entityLabel="Series"
              buckets={lineBuckets}
              samples={seriesSamplesForCompare}
              metrics={activeMetrics}
              entityKeyFn={usingSeriesDemo ? (s) => s.process : (s) => lineNames.find((n) => matchesLine(s, n))}
            />
          )}
        </>
      ) : (
        <>
          {usingItemDemo && <DemoNotice label={effectiveItem} />}
          <SampleTrendChart samples={scopedSamples} metrics={activeMetrics} />
          <GroupedComparisonSection title="Variety comparison" buckets={varietyBuckets} metrics={activeMetrics} />

          {mode === "series" && selectedLineMachines.length > 1 && (
            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-gray-700">Machine-to-machine within {effectiveItem}</h3>
                {withinSeriesUsingAnyDemo && <DemoBadge />}
              </div>
              {withinSeriesUsingAnyDemo && <DemoNotice label={`Some machines in ${effectiveItem}`} />}
              <EntityComparisonPanel entityLabel="Machine" buckets={withinSeriesBuckets} samples={withinSeriesSamples} metrics={activeMetrics} entityKeyFn={(s) => s.machineName} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
