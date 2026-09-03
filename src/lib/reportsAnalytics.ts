/**
 * Pure aggregation/statistics helpers for the Data Reports "Analytics" view.
 * No React here — everything operates on plain arrays so it can be unit-tested
 * and reused by any chart component without re-deriving the same math.
 */

export type AnalyticsDomain = "procurement" | "production" | "milled-rice";

/** The 7 machine categories the APIT Analytics UI script defines for Production → Machine-wise. */
export type MachineType =
  | "Husker"
  | "Tray Separator"
  | "Whitener"
  | "Polisher / Silky Polisher"
  | "Thickness Grader"
  | "Length Grader"
  | "Color Sorter"
  | "Packing / Final Rice";

/** Derives a machine's type category from its display name (e.g. "Whitener 2" → "Whitener", "Tray Separator - Mix" → "Tray Separator"). */
export function machineTypeOf(name: string | undefined): MachineType | undefined {
  if (!name) return undefined;
  const base = name.split(" - ")[0].replace(/\s*\d+$/, "").trim().toLowerCase();
  if (base === "husker") return "Husker";
  if (base === "tray separator") return "Tray Separator";
  if (base === "whitener") return "Whitener";
  if (base === "silky" || base.includes("polisher")) return "Polisher / Silky Polisher";
  if (base === "thickness grader") return "Thickness Grader";
  if (base === "length grader") return "Length Grader";
  if (base === "color sorter" || base === "colour sorter") return "Color Sorter";
  if (base === "blend & pack" || base === "final rice" || base === "packing") return "Packing / Final Rice";
  return undefined;
}

/** True for machines whose brokens feed into the Entire Line "Total Broken" figure (Length Grader + Sifter, per the doc). */
export function countsTowardLineBroken(name: string | undefined): boolean {
  if (!name) return false;
  return machineTypeOf(name) === "Length Grader" || name.toLowerCase().includes("sifter");
}

export type MetricKey =
  | "goodRice"
  | "rejection"
  | "foreignMatter"
  | "weight"
  | "whitenessIndex"
  | "brokenPct"
  | "chalkyPct"
  | "shellingDegree"
  | "donValue"
  | "discoloured"
  | "branRemovalPct"
  | "thickRicePct"
  | "thinRicePct"
  | "paddyPctInRiceOutput"
  | "ricePctInPaddyOutput"
  | "gib"
  | "big"
  | "branQtyKg"
  | "huskQtyKg"
  | "brokenPctInHeadRiceOutput"
  | "headRicePctInBrokenOutput"
  | "pricePerKg"
  | "cookingLer"
  | "cookingVer"
  | "cookingTime"
  | "cookingCi"
  | "nutritionCarbs"
  | "nutritionProtein"
  | "nutritionFat"
  | "nutritionAsh"
  | "nutritionMicro";

/** Machine-type-specific parameter lists, exactly per the APIT Analytics UI script §5.1 (excludes the generic Variety/Process/Machine comparisons every type also gets). */
export const MACHINE_TYPE_METRICS: Record<MachineType, MetricKey[]> = {
  Husker: ["shellingDegree", "brokenPct"],
  "Tray Separator": ["paddyPctInRiceOutput", "ricePctInPaddyOutput"],
  Whitener: ["goodRice", "brokenPct", "whitenessIndex", "donValue", "branRemovalPct"],
  "Polisher / Silky Polisher": ["goodRice", "brokenPct", "discoloured", "chalkyPct", "whitenessIndex", "donValue", "branRemovalPct"],
  "Thickness Grader": ["thickRicePct", "thinRicePct"],
  "Length Grader": ["brokenPctInHeadRiceOutput", "headRicePctInBrokenOutput"],
  "Color Sorter": ["gib", "big", "chalkyPct"],
  "Packing / Final Rice": [
    "goodRice",
    "brokenPct",
    "discoloured",
    "chalkyPct",
    "whitenessIndex",
    "donValue",
    "branRemovalPct",
    "cookingLer",
    "cookingVer",
    "cookingTime",
    "cookingCi",
    "nutritionCarbs",
    "nutritionProtein",
    "nutritionFat",
    "nutritionAsh",
    "nutritionMicro",
  ],
};

/** Milled Rice Quality Analysis uses the same final-quality parameter set as Packing/Final Rice. */
export const MILLED_RICE_METRICS: MetricKey[] = MACHINE_TYPE_METRICS["Packing / Final Rice"];

/** Minimal per-sample shape every comparison level is built from. */
export interface AnalyticsSample {
  sampleNumber: number;
  weight: string | number;
  goodRice: number;
  rejection: number;
  foreignMatter: number;
  brokenPct?: number;
  chalkyPct?: number;
}

/** Fields carried at the process/mode level (one value per record), not per individual sample. */
export interface AnalyticsProcessExtras {
  shellingDegree?: number;
  donValue?: number;
  discoloured?: number;
  branRemovalPct?: number;
  thickRicePct?: number;
  thinRicePct?: number;
  paddyPctInRiceOutput?: number;
  ricePctInPaddyOutput?: number;
  gib?: number;
  big?: number;
  branQtyKg?: number;
  huskQtyKg?: number;
  /** Length Grader — % of head rice wrongly ejected into the broken output; DEMO, no real backend field yet. */
  headRicePctInBrokenOutput?: number;
  pricePerKg?: number;
  cookingLer?: number;
  cookingVer?: number;
  cookingTime?: number;
  cookingCi?: number;
  nutritionCarbs?: number;
  nutritionProtein?: number;
  nutritionFat?: number;
  nutritionAsh?: number;
  nutritionMicro?: number;
}

/** Minimal per-record shape the Data Reports page already produces (`ProcessData`). */
export interface AnalyticsProcess extends AnalyticsProcessExtras {
  id: string;
  date: string;
  variety: string;
  process: string;
  samples: AnalyticsSample[];
  totalQuantity: number;
  overallGoodRice: number;
  overallRejection: number;
  overallForeignMatter: number;
  overallBrokenPct?: number;
  overallChalkyPct?: number;
  machineName?: string;
  binDryerNumber?: string;
  operatorName?: string;
  season?: string;
  /** 'tma' identifies a multi-machine production series run; everything else is a single-machine/mode record. */
  modeType?: string;
  domain: AnalyticsDomain;
}

/** Same fields as `AnalyticsProcessExtras`, but required (defaulted to 0 in `flattenSamples`) so every `MetricKey` indexes to a plain `number` on a `FlatSample`. */
export type RequiredProcessExtras = { [K in keyof AnalyticsProcessExtras]-?: number };

export interface FlatSample extends RequiredProcessExtras {
  id: string;
  processId: string;
  date: string;
  variety: string;
  process: string;
  machineName?: string;
  binDryerNumber?: string;
  modeType?: string;
  domain: AnalyticsDomain;
  sampleNumber: number;
  goodRice: number;
  rejection: number;
  foreignMatter: number;
  brokenPct: number;
  /** Length Grader — same value as `brokenPct`, exposed under a distinct label ("Broken % in Head Rice O/P") to pair with `headRicePctInBrokenOutput`. */
  brokenPctInHeadRiceOutput: number;
  chalkyPct: number;
  weight: number;
  /** DEMO — see demoWhitenessIndex() below; whiteness index only exists per-mode in the backend, not per-sample in bulk. */
  whitenessIndex: number;
}

export interface MetricDef {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
  /** Whether a larger value is a better outcome — flips best/worst framing for rejection & foreign matter. */
  higherIsBetter: boolean;
  /** True for metrics backed by demoProcurementExtras/demoWhitenessIndex rather than real backend data. */
  demo?: boolean;
}

export const METRICS: MetricDef[] = [
  { key: "goodRice", label: "Head Rice / Good Rice", unit: "%", color: "#0B4CAD", higherIsBetter: true },
  { key: "rejection", label: "Rejection", unit: "%", color: "#6366f1", higherIsBetter: false },
  { key: "foreignMatter", label: "Brokens & Foreign Matter", unit: "%", color: "#f59e0b", higherIsBetter: false },
  { key: "weight", label: "Sample Weight", unit: "g", color: "#10b981", higherIsBetter: true },
  { key: "whitenessIndex", label: "Whiteness Index", unit: "", color: "#ec4899", higherIsBetter: true, demo: true },
  { key: "brokenPct", label: "Broken", unit: "%", color: "#f97316", higherIsBetter: false },
  { key: "chalkyPct", label: "Chalky", unit: "%", color: "#eab308", higherIsBetter: false },
  { key: "shellingDegree", label: "Shelling Degree", unit: "%", color: "#0ea5e9", higherIsBetter: true },
  { key: "donValue", label: "DON", unit: "", color: "#dc2626", higherIsBetter: false },
  { key: "discoloured", label: "Discoloured", unit: "%", color: "#b45309", higherIsBetter: false },
  { key: "branRemovalPct", label: "Bran Removal", unit: "%", color: "#16a34a", higherIsBetter: true },
  { key: "thickRicePct", label: "Thick Rice %", unit: "%", color: "#7c3aed", higherIsBetter: true },
  { key: "thinRicePct", label: "Thin Rice %", unit: "%", color: "#a855f7", higherIsBetter: true },
  { key: "paddyPctInRiceOutput", label: "Paddy % in Rice Output", unit: "%", color: "#ef4444", higherIsBetter: false },
  { key: "ricePctInPaddyOutput", label: "Rice % in Paddy Output", unit: "%", color: "#f43f5e", higherIsBetter: false },
  { key: "gib", label: "Good-in-Bad (GIB)", unit: "%", color: "#059669", higherIsBetter: false },
  { key: "big", label: "Bad-in-Good (BIG)", unit: "%", color: "#f97316", higherIsBetter: false },
  { key: "branQtyKg", label: "Bran Production", unit: "kg", color: "#16a34a", higherIsBetter: true },
  { key: "huskQtyKg", label: "Husk Production", unit: "kg", color: "#65a30d", higherIsBetter: true },
  { key: "brokenPctInHeadRiceOutput", label: "Broken % in Head Rice O/P", unit: "%", color: "#f97316", higherIsBetter: false },
  { key: "headRicePctInBrokenOutput", label: "Head Rice % in Broken O/P", unit: "%", color: "#c026d3", higherIsBetter: false, demo: true },
  { key: "pricePerKg", label: "Paddy Price", unit: "₹/kg", color: "#0891b2", higherIsBetter: false },
  { key: "cookingLer", label: "Length Elongation Ratio (LER)", unit: "", color: "#0d9488", higherIsBetter: true },
  { key: "cookingVer", label: "Volume Expansion Ratio (VER)", unit: "", color: "#0f766e", higherIsBetter: true },
  { key: "cookingTime", label: "Cooking Time", unit: "min", color: "#134e4a", higherIsBetter: false },
  { key: "cookingCi", label: "Cooking Index (CI)", unit: "", color: "#115e59", higherIsBetter: true },
  { key: "nutritionCarbs", label: "Carbohydrates", unit: "%", color: "#ca8a04", higherIsBetter: true },
  { key: "nutritionProtein", label: "Protein", unit: "%", color: "#a16207", higherIsBetter: true },
  { key: "nutritionFat", label: "Fat", unit: "%", color: "#854d0e", higherIsBetter: true },
  { key: "nutritionAsh", label: "Ash", unit: "%", color: "#78350f", higherIsBetter: false },
  { key: "nutritionMicro", label: "Micronutrients", unit: "mg/100g", color: "#65350f", higherIsBetter: true },
];

const METRIC_KEYS: MetricKey[] = METRICS.map((m) => m.key);

const PROCESS_EXTRA_KEYS: (keyof AnalyticsProcessExtras)[] = [
  "shellingDegree",
  "donValue",
  "discoloured",
  "branRemovalPct",
  "thickRicePct",
  "thinRicePct",
  "paddyPctInRiceOutput",
  "ricePctInPaddyOutput",
  "gib",
  "big",
  "branQtyKg",
  "huskQtyKg",
  "headRicePctInBrokenOutput",
  "pricePerKg",
  "cookingLer",
  "cookingVer",
  "cookingTime",
  "cookingCi",
  "nutritionCarbs",
  "nutritionProtein",
  "nutritionFat",
  "nutritionAsh",
  "nutritionMicro",
];

/** Flattens every process's samples into one row per sample, tagged with parent context. */
export function flattenSamples(processes: AnalyticsProcess[]): FlatSample[] {
  const rows: FlatSample[] = [];
  for (const p of processes) {
    const samples: AnalyticsSample[] =
      p.samples.length > 0
        ? p.samples
        : [
            {
              sampleNumber: 1,
              weight: p.totalQuantity || 0,
              goodRice: p.overallGoodRice,
              rejection: p.overallRejection,
              foreignMatter: p.overallForeignMatter,
              brokenPct: p.overallBrokenPct,
              chalkyPct: p.overallChalkyPct,
            },
          ];
    const extras = {} as RequiredProcessExtras;
    for (const k of PROCESS_EXTRA_KEYS) extras[k] = p[k] ?? 0;

    for (const s of samples) {
      const id = `${p.id}_s${s.sampleNumber}`;
      rows.push({
        ...extras,
        id,
        processId: p.id,
        date: p.date,
        variety: p.variety,
        process: p.process,
        machineName: p.machineName,
        binDryerNumber: p.binDryerNumber,
        modeType: p.modeType,
        domain: p.domain,
        sampleNumber: s.sampleNumber,
        goodRice: s.goodRice,
        rejection: s.rejection,
        foreignMatter: s.foreignMatter,
        brokenPct: s.brokenPct ?? p.overallBrokenPct ?? 0,
        brokenPctInHeadRiceOutput: s.brokenPct ?? p.overallBrokenPct ?? 0,
        chalkyPct: s.chalkyPct ?? p.overallChalkyPct ?? 0,
        weight: Number(s.weight) || 0,
        whitenessIndex: demoWhitenessIndex(id),
      });
    }
  }
  return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export interface AggregateBucket {
  key: string;
  count: number;
  avg: Record<MetricKey, number>;
  min: Record<MetricKey, number>;
  max: Record<MetricKey, number>;
  total: Record<MetricKey, number>;
}

function emptyStats(): Record<MetricKey, number> {
  const stats = {} as Record<MetricKey, number>;
  for (const k of METRIC_KEYS) stats[k] = 0;
  return stats;
}

/** Generic grouping — used directly for ad-hoc breakdowns (e.g. by process/batch) beyond the three named helpers below. */
export function groupByKey(samples: FlatSample[], keyFn: (s: FlatSample) => string): AggregateBucket[] {
  const buckets = new Map<string, FlatSample[]>();
  for (const s of samples) {
    const key = keyFn(s);
    const existing = buckets.get(key);
    if (existing) existing.push(s);
    else buckets.set(key, [s]);
  }
  return Array.from(buckets.entries()).map(([key, rows]) => {
    const avg = emptyStats();
    const min = emptyStats();
    const max = emptyStats();
    const total = emptyStats();
    for (const metricKey of METRIC_KEYS) {
      const values = rows.map((r) => (r[metricKey] as number | undefined) ?? 0);
      total[metricKey] = values.reduce((a, b) => a + b, 0);
      avg[metricKey] = values.length > 0 ? total[metricKey] / values.length : 0;
      min[metricKey] = values.length > 0 ? Math.min(...values) : 0;
      max[metricKey] = values.length > 0 ? Math.max(...values) : 0;
    }
    return { key, count: rows.length, avg, min, max, total };
  });
}

/** Day-bucketed aggregates (avg/min/max/total per metric), sorted chronologically. */
export function groupByDay(samples: FlatSample[]): AggregateBucket[] {
  return groupByKey(samples, (s) => {
    const d = new Date(s.date);
    return Number.isNaN(d.getTime()) ? s.date : d.toISOString().slice(0, 10);
  }).sort((a, b) => a.key.localeCompare(b.key));
}

/** Machine-bucketed aggregates, best (highest good rice) first. Samples without a machine are excluded. */
export function groupByMachine(samples: FlatSample[]): AggregateBucket[] {
  return groupByKey(
    samples.filter((s) => !!s.machineName),
    (s) => s.machineName as string
  ).sort((a, b) => b.avg.goodRice - a.avg.goodRice);
}

/** Variety-bucketed aggregates, best (highest good rice) first. */
export function groupByVariety(samples: FlatSample[]): AggregateBucket[] {
  return groupByKey(samples, (s) => s.variety).sort((a, b) => b.avg.goodRice - a.avg.goodRice);
}

/** Process-bucketed aggregates (e.g. Raw / Double-Boiled / Single-Boiled / SAP), best (highest good rice) first — pairs with groupByVariety for "Variety & Process Comparison" charts. */
export function groupByProcess(samples: FlatSample[]): AggregateBucket[] {
  return groupByKey(samples, (s) => s.process).sort((a, b) => b.avg.goodRice - a.avg.goodRice);
}

export interface Trend {
  direction: "up" | "down" | "flat";
  deltaPct: number;
}

/** Period-over-period change, e.g. today's average vs. yesterday's. */
export function computeTrend(current: number, previous: number): Trend {
  if (previous === 0) {
    if (current === 0) return { direction: "flat", deltaPct: 0 };
    return { direction: "up", deltaPct: 100 };
  }
  const deltaPct = ((current - previous) / previous) * 100;
  if (Math.abs(deltaPct) < 0.5) return { direction: "flat", deltaPct };
  return { direction: deltaPct > 0 ? "up" : "down", deltaPct };
}

/** Count of distinct values returned by keyFn (ignoring blanks). */
export function uniqueCount(samples: FlatSample[], keyFn: (s: FlatSample) => string | undefined): number {
  const set = new Set<string>();
  for (const s of samples) {
    const k = keyFn(s);
    if (k) set.add(k);
  }
  return set.size;
}

/** The most frequently occurring value returned by keyFn, with its occurrence count. */
export function mostFrequent(samples: FlatSample[], keyFn: (s: FlatSample) => string | undefined): { value: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const s of samples) {
    const k = keyFn(s);
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let best: { value: string; count: number } | null = null;
  for (const [value, count] of counts.entries()) {
    if (!best || count > best.count) best = { value, count };
  }
  return best;
}

export interface OutlierResult {
  best: FlatSample | null;
  worst: FlatSample | null;
  abnormal: FlatSample[];
  mean: number;
  stdDev: number;
}

/**
 * Best/worst/abnormal samples for a metric. "Abnormal" = more than 1.5 standard
 * deviations from the mean (skipped below 5 samples — not enough data to call
 * anything a genuine outlier rather than noise).
 */
export function computeOutliers(samples: FlatSample[], metricKey: MetricKey, higherIsBetter = true): OutlierResult {
  if (samples.length === 0) {
    return { best: null, worst: null, abnormal: [], mean: 0, stdDev: 0 };
  }

  const at = (s: FlatSample): number => (s[metricKey] as number | undefined) ?? 0;
  const values = samples.map(at);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  let best = samples[0];
  let worst = samples[0];
  for (const s of samples) {
    const isBetter = higherIsBetter ? at(s) > at(best) : at(s) < at(best);
    const isWorse = higherIsBetter ? at(s) < at(worst) : at(s) > at(worst);
    if (isBetter) best = s;
    if (isWorse) worst = s;
  }

  const abnormal = samples.length >= 5 ? samples.filter((s) => Math.abs(at(s) - mean) > 1.5 * stdDev) : [];

  return { best, worst, abnormal, mean, stdDev };
}

export interface BucketOutlierResult {
  best: AggregateBucket | null;
  worst: AggregateBucket | null;
  abnormal: AggregateBucket[];
  mean: number;
  stdDev: number;
}

/** Same as `computeOutliers`, but for day/variety/machine-bucketed aggregates (used by the day-wise trend view). */
export function computeBucketOutliers(buckets: AggregateBucket[], metricKey: MetricKey, higherIsBetter = true): BucketOutlierResult {
  if (buckets.length === 0) {
    return { best: null, worst: null, abnormal: [], mean: 0, stdDev: 0 };
  }

  const at = (b: AggregateBucket): number => b.avg[metricKey] ?? 0;
  const values = buckets.map(at);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  let best = buckets[0];
  let worst = buckets[0];
  for (const b of buckets) {
    const isBetter = higherIsBetter ? at(b) > at(best) : at(b) < at(best);
    const isWorse = higherIsBetter ? at(b) < at(worst) : at(b) > at(worst);
    if (isBetter) best = b;
    if (isWorse) worst = b;
  }

  const abnormal = buckets.length >= 5 ? buckets.filter((b) => Math.abs(at(b) - mean) > 1.5 * stdDev) : [];

  return { best, worst, abnormal, mean, stdDev };
}

/**
 * DEMO DATA — mandi, vehicle, purchase price and moisture are not present anywhere in the
 * data this app fetches or stores: the backend's grain-analysis/tma-analysis responses only
 * return variety/season/machine/operator/date and grain-quality counts, and procurement price
 * & moisture are only ever typed into a one-off cost-calculator form in the browser that never
 * reaches the backend. Per explicit user instruction these panels are shown anyway using
 * synthetic, deterministically-seeded (not `Math.random()`, so values stay stable across
 * re-renders) placeholder values — every UI panel built from this must carry a visible
 * "Demo data" badge so it's never mistaken for a real record.
 */
export interface DemoProcurementExtras {
  mandi: string;
  vehicleNumber: string;
  pricePerKg: number;
  moisturePct: number;
}

const DEMO_MANDI_NAMES = ["Karnal Mandi", "Kaithal Mandi", "Taraori Mandi", "Gharaunda Mandi", "Nissing Mandi", "Assandh Mandi"];

function seededUnit(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  }
  return ((hash >>> 0) % 10000) / 10000;
}

/**
 * DEMO DATA — whiteness index is only ever stored per whole analysis session (via
 * `/grains/mode/{modeId}/statistics`), not per individual sample, and not at all in the bulk
 * list endpoint this Analytics view is built from. Rather than a session-level number repeated
 * across every sample in that session, this is a deterministically-seeded per-sample placeholder
 * in a plausible ~65-95 range, kept stable across re-renders by the same seeded-hash approach as
 * demoProcurementExtras. Always shown with a "Whiteness Index (demo)" label / demo badge.
 */
function demoWhitenessIndex(sampleId: string): number {
  const r = seededUnit(`${sampleId}_wi`);
  return Math.round((65 + r * 30) * 10) / 10;
}

export function demoProcurementExtras(processId: string, date: string): DemoProcurementExtras {
  const dayKey = new Date(date).toISOString().slice(0, 10);
  const dayDrift = seededUnit(dayKey); // same-day values drift together, mimicking a shared market rate
  const rMandi = seededUnit(`${processId}_mandi`);
  const rVehicle = seededUnit(`${processId}_vehicle`);
  const rPrice = seededUnit(`${processId}_price`);
  const rMoisture = seededUnit(`${processId}_moisture`);

  const vehicleLetters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const vehicleNumber = `HR${10 + Math.floor(rVehicle * 89)}${vehicleLetters[Math.floor(rVehicle * vehicleLetters.length)]}${
    vehicleLetters[Math.floor(rPrice * vehicleLetters.length)]
  }-${1000 + Math.floor(rVehicle * 9000)}`;

  return {
    mandi: DEMO_MANDI_NAMES[Math.floor(rMandi * DEMO_MANDI_NAMES.length)],
    vehicleNumber,
    pricePerKg: Math.round((19 + dayDrift * 4 + (rPrice - 0.5)) * 100) / 100,
    moisturePct: Math.round((12.5 + dayDrift * 2.5 + (rMoisture - 0.5) * 1.5) * 10) / 10,
  };
}

const DEMO_VARIETIES = ["Sona Masoori", "Basmati 1121", "IR64", "Ponni", "Basmati 1509"];
const DEMO_PROCESSES = ["Raw", "Double-Boiled", "Single-Boiled", "SAP"];

/**
 * DEMO DATA — a full synthetic sample-to-sample history for a machine/series/entity that is
 * configured in the mill's machine database but hasn't produced any real samples yet in the
 * current filters. Seeded off `entityKey` so the same machine always gets the same stable demo
 * numbers across re-renders. Spans several recent days with 2-3 samples each, in plausible
 * quality ranges, so every chart (trend, control chart, composition, variety comparison) has
 * something real-shaped to render. Always paired with a visible "Demo data" badge in the UI.
 */
/** Deterministic placeholder values for every machine-type-specific/economics field, for the same "not configured yet" demo fallback as the rest of this block. */
function demoExtraFields(seed: string): RequiredProcessExtras {
  return {
    shellingDegree: Math.round((80 + seededUnit(`${seed}_shell`) * 15) * 10) / 10,
    donValue: Math.round((0.5 + seededUnit(`${seed}_don`) * 4.5) * 100) / 100,
    discoloured: Math.round((0.3 + seededUnit(`${seed}_disc`) * 2.5) * 10) / 10,
    branRemovalPct: Math.round((5 + seededUnit(`${seed}_branrem`) * 4) * 10) / 10,
    thickRicePct: Math.round((3 + seededUnit(`${seed}_thick`) * 6) * 10) / 10,
    thinRicePct: Math.round((2 + seededUnit(`${seed}_thin`) * 5) * 10) / 10,
    paddyPctInRiceOutput: Math.round((0.5 + seededUnit(`${seed}_paddyout`) * 2) * 10) / 10,
    ricePctInPaddyOutput: Math.round((1 + seededUnit(`${seed}_riceout`) * 3) * 10) / 10,
    gib: Math.round((0.2 + seededUnit(`${seed}_gib`) * 1.5) * 10) / 10,
    big: Math.round((0.3 + seededUnit(`${seed}_big`) * 2) * 10) / 10,
    branQtyKg: Math.round((0.02 + seededUnit(`${seed}_bran`) * 0.03) * 1000) / 1000,
    huskQtyKg: Math.round((0.05 + seededUnit(`${seed}_husk`) * 0.05) * 1000) / 1000,
    headRicePctInBrokenOutput: Math.round((0.3 + seededUnit(`${seed}_hrinbrk`) * 1.5) * 10) / 10,
    pricePerKg: Math.round((19 + seededUnit(`${seed}_price`) * 4) * 100) / 100,
    cookingLer: Math.round((1.5 + seededUnit(`${seed}_ler`) * 0.7) * 100) / 100,
    cookingVer: Math.round((3.5 + seededUnit(`${seed}_ver`) * 1) * 100) / 100,
    cookingTime: Math.round((12 + seededUnit(`${seed}_ctime`) * 8) * 10) / 10,
    cookingCi: Math.round((0.6 + seededUnit(`${seed}_ci`) * 0.3) * 100) / 100,
    nutritionCarbs: Math.round((75 + seededUnit(`${seed}_carbs`) * 5) * 10) / 10,
    nutritionProtein: Math.round((6.5 + seededUnit(`${seed}_protein`) * 2) * 10) / 10,
    nutritionFat: Math.round((0.5 + seededUnit(`${seed}_fat`) * 1) * 10) / 10,
    nutritionAsh: Math.round((0.5 + seededUnit(`${seed}_ash`) * 0.7) * 10) / 10,
    nutritionMicro: Math.round((1.5 + seededUnit(`${seed}_micro`) * 2) * 100) / 100,
  };
}

export function generateDemoSamples(entityKey: string, domain: AnalyticsDomain, days = 5): FlatSample[] {
  const rows: FlatSample[] = [];
  const today = new Date();
  let counter = 0;
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const samplesThatDay = 2 + Math.floor(seededUnit(`${entityKey}_daycount_${d}`) * 2); // 2-3 per day
    for (let s = 0; s < samplesThatDay; s++) {
      counter += 1;
      const seed = `${entityKey}_demo_${d}_${s}`;
      const goodRice = 76 + seededUnit(`${seed}_good`) * 17; // ~76-93%
      const rejection = 2 + seededUnit(`${seed}_rej`) * 6; // ~2-8%
      const brokenPct = 2 + seededUnit(`${seed}_brk`) * 4;
      const chalkyPct = 1 + seededUnit(`${seed}_chk`) * 4;
      const foreignMatter = Math.max(0.5, 100 - goodRice - rejection);
      rows.push({
        ...demoExtraFields(seed),
        id: `${entityKey}_demo_s${counter}`,
        processId: `${entityKey}_demo_run_${d}`,
        date: date.toISOString(),
        variety: DEMO_VARIETIES[Math.floor(seededUnit(`${seed}_variety`) * DEMO_VARIETIES.length)],
        process: DEMO_PROCESSES[Math.floor(seededUnit(`${seed}_process`) * DEMO_PROCESSES.length)],
        machineName: domain === "production" ? entityKey : undefined,
        modeType: undefined,
        domain,
        sampleNumber: s + 1,
        goodRice: Math.round(goodRice * 10) / 10,
        rejection: Math.round(rejection * 10) / 10,
        foreignMatter: Math.round(foreignMatter * 10) / 10,
        brokenPct: Math.round(brokenPct * 10) / 10,
        brokenPctInHeadRiceOutput: Math.round(brokenPct * 10) / 10,
        chalkyPct: Math.round(chalkyPct * 10) / 10,
        weight: Math.round(380 + seededUnit(`${seed}_wt`) * 220),
        whitenessIndex: demoWhitenessIndex(seed),
      });
    }
  }
  return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// ============================================================
// Procurement Economics — cost ledger (localStorage) + P/L calc
// ============================================================

const COST_LEDGER_STORAGE_KEY = "raice_labz_procurement_cost_entries_v1";

export interface CostEntry {
  id: string;
  /** ISO yyyy-MM-dd — the period this cost applies to. */
  date: string;
  description: string;
  amountInr: number;
}

export function getCostEntries(): CostEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COST_LEDGER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCostEntries(entries: CostEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COST_LEDGER_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage unavailable (private mode, quota) — cost entry is simply not persisted this session.
  }
}

export function addCostEntry(entry: Omit<CostEntry, "id">): CostEntry[] {
  const entries = getCostEntries();
  const withNew = [...entries, { ...entry, id: `cost_${Date.now()}_${Math.round(Math.random() * 1e6)}` }];
  saveCostEntries(withNew);
  return withNew;
}

export function removeCostEntry(id: string): CostEntry[] {
  const remaining = getCostEntries().filter((e) => e.id !== id);
  saveCostEntries(remaining);
  return remaining;
}

/** Fixed by-product sale rates (₹/kg) used to turn mock bran/husk quantities into illustrative revenue. */
const BRAN_PRICE_PER_KG = 15;
const HUSK_PRICE_PER_KG = 3;
const HEAD_RICE_PRICE_PER_KG = 35;
const BROKEN_PRICE_PER_KG = 25;

export interface EconomicsDayPoint {
  day: string;
  dateLabel: string;
  avgPricePerKg: number;
  paddyCost: number;
  branRevenue: number;
  huskRevenue: number;
  headRiceRevenue: number;
  brokenRevenue: number;
  totalRevenue: number;
  additionalCosts: number;
  estimatedPL: number;
}

export interface EconomicsSummary {
  totalPaddyCost: number;
  totalRevenue: number;
  totalAdditionalCosts: number;
  estimatedPL: number;
  byDay: EconomicsDayPoint[];
}

/** Computes paddy cost, by-product revenue, and estimated P/L per day from procurement samples plus user-entered cost entries. */
export function computeEconomics(samples: FlatSample[], costEntries: CostEntry[]): EconomicsSummary {
  const byDay = new Map<string, { samples: FlatSample[] }>();
  for (const s of samples) {
    const dayKey = new Date(s.date).toISOString().slice(0, 10);
    const bucket = byDay.get(dayKey);
    if (bucket) bucket.samples.push(s);
    else byDay.set(dayKey, { samples: [s] });
  }

  const costsByDay = new Map<string, number>();
  for (const c of costEntries) {
    costsByDay.set(c.date, (costsByDay.get(c.date) ?? 0) + c.amountInr);
  }
  // Days that only have a manual cost entry (no samples that day) still need a row.
  for (const day of costsByDay.keys()) {
    if (!byDay.has(day)) byDay.set(day, { samples: [] });
  }

  const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const points: EconomicsDayPoint[] = days.map(([day, { samples: daySamples }]) => {
    const weightKg = daySamples.reduce((sum, s) => sum + s.weight, 0) / 1000;
    const avgPricePerKg = daySamples.length > 0 ? daySamples.reduce((sum, s) => sum + s.pricePerKg, 0) / daySamples.length : 0;
    const branKg = daySamples.reduce((sum, s) => sum + s.branQtyKg, 0);
    const huskKg = daySamples.reduce((sum, s) => sum + s.huskQtyKg, 0);
    const headRiceKg = weightKg * (daySamples.length > 0 ? daySamples.reduce((sum, s) => sum + s.goodRice, 0) / daySamples.length / 100 : 0);
    const brokenKg = weightKg * (daySamples.length > 0 ? daySamples.reduce((sum, s) => sum + s.brokenPct, 0) / daySamples.length / 100 : 0);

    const paddyCost = weightKg * avgPricePerKg;
    const branRevenue = branKg * BRAN_PRICE_PER_KG;
    const huskRevenue = huskKg * HUSK_PRICE_PER_KG;
    const headRiceRevenue = headRiceKg * HEAD_RICE_PRICE_PER_KG;
    const brokenRevenue = brokenKg * BROKEN_PRICE_PER_KG;
    const totalRevenue = branRevenue + huskRevenue + headRiceRevenue + brokenRevenue;
    const additionalCosts = costsByDay.get(day) ?? 0;
    const estimatedPL = totalRevenue - paddyCost - additionalCosts;

    return {
      day,
      dateLabel: day,
      avgPricePerKg,
      paddyCost,
      branRevenue,
      huskRevenue,
      headRiceRevenue,
      brokenRevenue,
      totalRevenue,
      additionalCosts,
      estimatedPL,
    };
  });

  const totalPaddyCost = points.reduce((s, p) => s + p.paddyCost, 0);
  const totalRevenue = points.reduce((s, p) => s + p.totalRevenue, 0);
  const totalAdditionalCosts = points.reduce((s, p) => s + p.additionalCosts, 0);

  return {
    totalPaddyCost,
    totalRevenue,
    totalAdditionalCosts,
    estimatedPL: totalRevenue - totalPaddyCost - totalAdditionalCosts,
    byDay: points,
  };
}

// ============================================================
// Chalky threshold — fixed default, not user-editable
// ============================================================

export const DEFAULT_CHALKY_THRESHOLD_PCT = 20; // matches mockApi's createModeData() default
