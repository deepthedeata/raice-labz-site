import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  type AnalyticsProcess,
  type FlatSample,
  type MetricKey,
  type MachineType,
  flattenSamples,
  groupByKey,
  groupByVariety,
  groupByProcess,
  generateDemoSamples,
  machineTypeOf,
  countsTowardLineBroken,
  MACHINE_TYPE_METRICS,
} from "@/lib/reportsAnalytics";
import {
  MetricPicker,
  SampleTrendChart,
  GroupedComparisonSection,
  EntityComparisonPanel,
  DemoBadge,
  InsightCard,
  VarietyProcessFilters,
  filterSamplesByVarietyProcess,
  ALL_VARIETIES,
  ALL_PROCESSES,
  GranularityToggle,
  type Granularity,
} from "./analyticsCharts";

type Mode = "machine" | "compare" | "series";

const COMPARE_ALL = "__compare_all__";

/** Mill-flow order for the "Husker → Packing" stage-wise trend in Entire Line mode. */
const MACHINE_TYPE_FLOW_ORDER: MachineType[] = [
  "Husker",
  "Tray Separator",
  "Whitener",
  "Polisher / Silky Polisher",
  "Thickness Grader",
  "Length Grader",
  "Color Sorter",
  "Packing / Final Rice",
];

/** Sections selectable under Comparative Analysis — every machine type EXCEPT Packing/Final Rice, which the doc never gives a machine-to-machine comparison bullet for (there's normally only one packing line). */
const COMPARABLE_SECTIONS: MachineType[] = MACHINE_TYPE_FLOW_ORDER.filter((t) => t !== "Packing / Final Rice");

/** Friendlier section names for the Comparative Analysis picker, mapped 1:1 onto the machine-type taxonomy. */
const SECTION_LABELS: Record<MachineType, string> = {
  Husker: "Dehusking",
  "Tray Separator": "Separation",
  Whitener: "Whitening",
  "Polisher / Silky Polisher": "Polishing",
  "Thickness Grader": "Thickness Grading",
  "Length Grader": "Length Grading",
  "Color Sorter": "Color Sorting",
  "Packing / Final Rice": "Packing",
};

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

  const [varietyFilter, setVarietyFilter] = useState<string>(ALL_VARIETIES);
  const [processFilter, setProcessFilter] = useState<string>(ALL_PROCESSES);
  const samples = useMemo(
    () => filterSamplesByVarietyProcess(allSamples, varietyFilter, processFilter),
    [allSamples, varietyFilter, processFilter]
  );

  const machineNames = useMemo(
    () => (lineMachines.length > 0 ? lineMachines : [...new Set(samples.map((s) => s.machineName).filter((m): m is string => !!m))]),
    [lineMachines, samples]
  );

  const [mode, setMode] = useState<Mode>("machine");
  const [granularity, setGranularity] = useState<Granularity>("sample");
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(["goodRice", "brokenPct", "chalkyPct"]);

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  // ==================== MACHINE-WISE (single machine drill-down) ====================
  const machineTypesPresent = useMemo(
    () => MACHINE_TYPE_FLOW_ORDER.filter((t) => machineNames.some((m) => machineTypeOf(m) === t)),
    [machineNames]
  );
  const [machineType, setMachineType] = useState<string>("");
  // No "all types" escape hatch — the doc requires a machine type to always be selected, so the parameter list is always scoped to it.
  const effectiveMachineType = (machineTypesPresent.includes(machineType as MachineType) ? machineType : machineTypesPresent[0]) as MachineType | undefined;
  const machineNamesOfType = useMemo(
    () => (effectiveMachineType ? machineNames.filter((m) => machineTypeOf(m) === effectiveMachineType) : []),
    [machineNames, effectiveMachineType]
  );
  const [machineValue, setMachineValue] = useState<string>("");
  const effectiveMachine = machineNamesOfType.includes(machineValue) ? machineValue : (machineNamesOfType[0] ?? "");
  const machineTypeMetrics = effectiveMachineType ? MACHINE_TYPE_METRICS[effectiveMachineType] : undefined;

  const realMachineTrendSamples = useMemo(
    () => (effectiveMachine ? samples.filter((s) => s.machineName === effectiveMachine) : []),
    [samples, effectiveMachine]
  );
  const usingMachineTrendDemo = !!effectiveMachine && realMachineTrendSamples.length === 0;
  const machineTrendSamples = useMemo(
    () => (usingMachineTrendDemo ? generateDemoSamples(effectiveMachine, "production") : realMachineTrendSamples),
    [usingMachineTrendDemo, effectiveMachine, realMachineTrendSamples]
  );
  const machineVarietyBuckets = useMemo(() => groupByVariety(machineTrendSamples), [machineTrendSamples]);
  const machineProcessBuckets = useMemo(() => groupByProcess(machineTrendSamples), [machineTrendSamples]);

  // ==================== COMPARATIVE ANALYSIS (by section) ====================
  const sectionsPresent = useMemo(() => COMPARABLE_SECTIONS.filter((t) => machineNames.some((m) => machineTypeOf(m) === t)), [machineNames]);
  const [section, setSection] = useState<string>("");
  const effectiveSection = (sectionsPresent.includes(section as MachineType) ? section : sectionsPresent[0]) as MachineType | undefined;
  /** Every machine that belongs to the selected section, regardless of what the user has chosen to include in the comparison. */
  const sectionMachines = useMemo(() => (effectiveSection ? machineNames.filter((m) => machineTypeOf(m) === effectiveSection) : []), [machineNames, effectiveSection]);
  const sectionMetrics = effectiveSection ? MACHINE_TYPE_METRICS[effectiveSection] : undefined;

  /** Which of `sectionMachines` the user has picked to compare — empty means "all of them" (the default). */
  const [includedMachines, setIncludedMachines] = useState<string[]>([]);
  const chosenSectionMachines = includedMachines.length > 0 ? sectionMachines.filter((m) => includedMachines.includes(m)) : sectionMachines;
  const toggleSectionMachine = (m: string) => {
    setIncludedMachines((prev) => {
      const base = prev.length > 0 ? prev : sectionMachines;
      const next = base.includes(m) ? base.filter((x) => x !== m) : [...base, m];
      return next.length > 0 ? next : base; // always keep at least one machine selected
    });
  };

  const realSectionBuckets = useMemo(
    () =>
      groupByKey(
        samples.filter((s) => chosenSectionMachines.includes(s.machineName ?? "")),
        (s) => s.machineName as string
      ).sort((a, b) => b.avg.goodRice - a.avg.goodRice),
    [samples, chosenSectionMachines]
  );
  const usingSectionDemo = chosenSectionMachines.length > 0 && realSectionBuckets.length === 0;
  const sectionSamplesForCompare = useMemo(
    () => (usingSectionDemo ? chosenSectionMachines.flatMap((m) => generateDemoSamples(m, "production")) : samples.filter((s) => chosenSectionMachines.includes(s.machineName ?? ""))),
    [usingSectionDemo, chosenSectionMachines, samples]
  );
  const sectionBuckets = useMemo(
    () =>
      usingSectionDemo
        ? groupByKey(sectionSamplesForCompare, (s) => s.machineName as string).sort((a, b) => b.avg.goodRice - a.avg.goodRice)
        : realSectionBuckets,
    [usingSectionDemo, sectionSamplesForCompare, realSectionBuckets]
  );
  const sectionVarietyBuckets = useMemo(() => groupByVariety(sectionSamplesForCompare), [sectionSamplesForCompare]);
  const sectionProcessBuckets = useMemo(() => groupByProcess(sectionSamplesForCompare), [sectionSamplesForCompare]);

  // ==================== ENTIRE LINE ====================
  const [seriesValue, setSeriesValue] = useState<string>(COMPARE_ALL);
  const effectiveLine = lineNames.length === 1 ? lineNames[0] : seriesValue === COMPARE_ALL || lineNames.includes(seriesValue) ? seriesValue : COMPARE_ALL;

  const realLineTrendSamples = useMemo(
    () => (effectiveLine === COMPARE_ALL ? [] : samples.filter((s) => matchesLine(s, effectiveLine))),
    [samples, effectiveLine]
  );
  const usingLineTrendDemo = effectiveLine !== COMPARE_ALL && realLineTrendSamples.length === 0;
  const lineTrendSamples = useMemo(
    () => (usingLineTrendDemo ? generateDemoSamples(effectiveLine, "production") : realLineTrendSamples),
    [usingLineTrendDemo, effectiveLine, realLineTrendSamples]
  );
  const lineVarietyBuckets = useMemo(() => groupByVariety(lineTrendSamples), [lineTrendSamples]);
  const lineProcessBuckets = useMemo(() => groupByProcess(lineTrendSamples), [lineTrendSamples]);

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
    () => (usingSeriesDemo ? groupByKey(seriesSamplesForCompare, (s) => s.machineName as string).sort((a, b) => b.avg.goodRice - a.avg.goodRice) : realLineBuckets),
    [usingSeriesDemo, seriesSamplesForCompare, realLineBuckets]
  );

  // ---- machine-to-machine breakdown within a selected series ("Husker → Packing" stage trend) ----
  const selectedLineMachines = useMemo(() => {
    if (effectiveLine === COMPARE_ALL) return [] as string[];
    const configured = millLines.find((l) => l.name === effectiveLine)?.machines ?? [];
    const pool = configured.length > 0 ? configured : machineNames;
    return [...pool].sort((a, b) => {
      const ia = MACHINE_TYPE_FLOW_ORDER.indexOf(machineTypeOf(a) as MachineType);
      const ib = MACHINE_TYPE_FLOW_ORDER.indexOf(machineTypeOf(b) as MachineType);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [effectiveLine, millLines, machineNames]);

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
  const withinSeriesBuckets = useMemo(() => {
    const byName = groupByKey(withinSeriesSamples, (s) => s.machineName as string);
    return selectedLineMachines.map((name) => byName.find((b) => b.key === name)).filter((b): b is NonNullable<typeof b> => !!b);
  }, [withinSeriesSamples, selectedLineMachines]);

  // ---- Entire Line KPI trio (doc §6): sourced from the specific machine types the script names ----
  const lineKpis = useMemo(() => {
    const packingSamples = samples.filter((s) => machineTypeOf(s.machineName) === "Packing / Final Rice");
    const brokenSamples = samples.filter((s) => countsTowardLineBroken(s.machineName));
    const colorSorterSamples = samples.filter((s) => machineTypeOf(s.machineName) === "Color Sorter");
    const avg = (rows: FlatSample[], key: keyof FlatSample) =>
      rows.length > 0 ? rows.reduce((sum, r) => sum + (r[key] as number), 0) / rows.length : null;
    return {
      headRiceYield: avg(packingSamples, "goodRice"),
      totalBroken: avg(brokenSamples, "brokenPct"),
      totalDiscoloured: avg(colorSorterSamples, "discoloured"),
    };
  }, [samples]);

  const displayMetrics =
    mode === "machine" && machineTypeMetrics
      ? activeMetrics.filter((m) => machineTypeMetrics.includes(m))
      : mode === "compare" && sectionMetrics
        ? activeMetrics.filter((m) => sectionMetrics.includes(m))
        : activeMetrics;
  const pickerAvailable = mode === "machine" ? machineTypeMetrics : mode === "compare" ? sectionMetrics : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => {
              if (!v) return;
              const next = v as Mode;
              setMode(next);
              if (next === "machine") {
                setActiveMetrics(effectiveMachineType ? MACHINE_TYPE_METRICS[effectiveMachineType] : ["goodRice", "brokenPct", "chalkyPct"]);
              } else if (next === "compare") {
                setActiveMetrics(effectiveSection ? MACHINE_TYPE_METRICS[effectiveSection] : ["goodRice", "brokenPct", "chalkyPct"]);
              } else {
                setActiveMetrics(["goodRice", "brokenPct", "chalkyPct"]);
              }
            }}
          >
            <ToggleGroupItem value="machine" className="text-xs px-3">
              Machine-wise
            </ToggleGroupItem>
            <ToggleGroupItem value="compare" className="text-xs px-3">
              Comparative Analysis
            </ToggleGroupItem>
            <ToggleGroupItem value="series" className="text-xs px-3">
              Entire Line
            </ToggleGroupItem>
          </ToggleGroup>

          {mode === "machine" && machineTypesPresent.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Machine type:</span>
                <Select
                  value={effectiveMachineType ?? ""}
                  onValueChange={(v) => {
                    setMachineType(v);
                    setMachineValue("");
                    setActiveMetrics(MACHINE_TYPE_METRICS[v as MachineType]);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs w-[200px]">
                    <SelectValue placeholder="Choose machine type" />
                  </SelectTrigger>
                  <SelectContent>
                    {machineTypesPresent.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {machineNamesOfType.length > 1 && (
                <Select value={effectiveMachine} onValueChange={setMachineValue}>
                  <SelectTrigger className="h-8 text-xs w-[220px]">
                    <SelectValue placeholder="Choose a machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {machineNamesOfType.map((name) => {
                      const count = samples.filter((s) => s.machineName === name).length;
                      return (
                        <SelectItem key={name} value={name} className="text-xs">
                          {count > 0 ? name : `${name} (demo)`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </>
          )}

          {mode === "compare" && sectionsPresent.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Section:</span>
              <Select
                value={effectiveSection ?? ""}
                onValueChange={(v) => {
                  setSection(v);
                  setIncludedMachines([]);
                  setActiveMetrics(MACHINE_TYPE_METRICS[v as MachineType]);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[200px]">
                  <SelectValue placeholder="Choose a section" />
                </SelectTrigger>
                <SelectContent>
                  {sectionsPresent.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {SECTION_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "series" && lineNames.length > 1 && (
            <Select value={effectiveLine} onValueChange={setSeriesValue}>
              <SelectTrigger className="h-8 text-xs w-[240px]">
                <SelectValue placeholder="Choose a series" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={COMPARE_ALL} className="text-xs font-semibold">
                  All Series (Compare)
                </SelectItem>
                {lineNames.map((name) => {
                  const count = samples.filter((s) => matchesLine(s, name)).length;
                  return (
                    <SelectItem key={name} value={name} className="text-xs">
                      {count > 0 ? name : `${name} (demo)`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}

          <VarietyProcessFilters samples={allSamples} variety={varietyFilter} onVarietyChange={setVarietyFilter} process={processFilter} onProcessChange={setProcessFilter} />
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {mode !== "compare" && <GranularityToggle value={granularity} onChange={setGranularity} />}
          <MetricPicker active={displayMetrics} onToggle={toggleMetric} available={pickerAvailable} />
        </div>
      </div>

      {mode === "machine" && (
        machineNamesOfType.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No machines are configured in the machine database yet.</p>
          </div>
        ) : (
          <>
            {usingMachineTrendDemo && <DemoNotice label={effectiveMachine} />}
            <SampleTrendChart samples={machineTrendSamples} metrics={displayMetrics} granularity={granularity} />
            <GroupedComparisonSection title="Variety comparison" buckets={machineVarietyBuckets} metrics={displayMetrics} />
            <GroupedComparisonSection title="Process comparison" buckets={machineProcessBuckets} metrics={displayMetrics} />
          </>
        )
      )}

      {mode === "compare" && (
        sectionsPresent.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No comparable machine sections are configured in the machine database yet.</p>
          </div>
        ) : (
          <>
            {sectionMachines.length > 1 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Machines to compare:</span>
                {sectionMachines.map((m) => (
                  <label key={m} className="flex items-center gap-1.5 cursor-pointer select-none">
                    <Checkbox checked={chosenSectionMachines.includes(m)} onCheckedChange={() => toggleSectionMachine(m)} />
                    <span>{m}</span>
                  </label>
                ))}
              </div>
            )}
            {usingSectionDemo && <DemoNotice label={`None of the configured ${SECTION_LABELS[effectiveSection as MachineType].toLowerCase()} machines`} />}
            <EntityComparisonPanel entityLabel="Machine" buckets={sectionBuckets} samples={sectionSamplesForCompare} metrics={displayMetrics} entityKeyFn={(s) => s.machineName} />
            <GroupedComparisonSection title="Variety comparison" buckets={sectionVarietyBuckets} metrics={displayMetrics} />
            <GroupedComparisonSection title="Process comparison" buckets={sectionProcessBuckets} metrics={displayMetrics} />
          </>
        )
      )}

      {mode === "series" && (
        lineNames.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No series/lines are configured in the machine database yet.</p>
          </div>
        ) : effectiveLine === COMPARE_ALL ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <InsightCard
                label="Total Head Rice Yield"
                value={lineKpis.headRiceYield != null ? `${lineKpis.headRiceYield.toFixed(1)}%` : "—"}
                sublabel="from final packing rice result"
              />
              <InsightCard
                label="Total Broken"
                value={lineKpis.totalBroken != null ? `${lineKpis.totalBroken.toFixed(1)}%` : "—"}
                sublabel="Length Grader + Sifter"
              />
              <InsightCard
                label="Total Discoloured"
                value={lineKpis.totalDiscoloured != null ? `${lineKpis.totalDiscoloured.toFixed(1)}%` : "—"}
                sublabel="Color Sorter rejects"
              />
            </div>
            {usingSeriesDemo && <DemoNotice label="None of the configured series" />}
            <EntityComparisonPanel
              entityLabel="Line"
              buckets={lineBuckets}
              samples={seriesSamplesForCompare}
              metrics={displayMetrics}
              entityKeyFn={usingSeriesDemo ? (s) => s.machineName : (s) => lineNames.find((n) => matchesLine(s, n))}
            />
          </>
        ) : (
          <>
            {usingLineTrendDemo && <DemoNotice label={effectiveLine} />}
            <SampleTrendChart samples={lineTrendSamples} metrics={displayMetrics} granularity={granularity} />
            <GroupedComparisonSection title="Variety comparison" buckets={lineVarietyBuckets} metrics={displayMetrics} />
            <GroupedComparisonSection title="Process comparison" buckets={lineProcessBuckets} metrics={displayMetrics} />

            {selectedLineMachines.length > 1 && (
              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-700">Husker → Packing stage-wise trend ({effectiveLine})</h3>
                  {withinSeriesUsingAnyDemo && <DemoBadge />}
                </div>
                {withinSeriesUsingAnyDemo && <DemoNotice label={`Some machines in ${effectiveLine}`} />}
                <EntityComparisonPanel entityLabel="Machine" buckets={withinSeriesBuckets} samples={withinSeriesSamples} metrics={displayMetrics} entityKeyFn={(s) => s.machineName} />
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
