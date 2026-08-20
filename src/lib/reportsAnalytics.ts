/**
 * Pure aggregation/statistics helpers for the Data Reports "Analytics" view.
 * No React here — everything operates on plain arrays so it can be unit-tested
 * and reused by any chart component without re-deriving the same math.
 */

export type AnalyticsDomain = "procurement" | "production" | "milled-rice";

export type MetricKey = "goodRice" | "rejection" | "foreignMatter" | "weight" | "whitenessIndex";

/** Minimal per-sample shape every comparison level is built from. */
export interface AnalyticsSample {
  sampleNumber: number;
  weight: string | number;
  goodRice: number;
  rejection: number;
  foreignMatter: number;
}

/** Minimal per-record shape the Data Reports page already produces (`ProcessData`). */
export interface AnalyticsProcess {
  id: string;
  date: string;
  variety: string;
  process: string;
  samples: AnalyticsSample[];
  totalQuantity: number;
  overallGoodRice: number;
  overallRejection: number;
  overallForeignMatter: number;
  machineName?: string;
  binDryerNumber?: string;
  operatorName?: string;
  season?: string;
  /** 'tma' identifies a multi-machine production series run; everything else is a single-machine/mode record. */
  modeType?: string;
  domain: AnalyticsDomain;
}

export interface FlatSample {
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
  { key: "goodRice", label: "Good / Head Rice", unit: "%", color: "#0B4CAD", higherIsBetter: true },
  { key: "rejection", label: "Rejection", unit: "%", color: "#6366f1", higherIsBetter: false },
  { key: "foreignMatter", label: "Brokens & Foreign Matter", unit: "%", color: "#f59e0b", higherIsBetter: false },
  { key: "weight", label: "Sample Weight", unit: "g", color: "#10b981", higherIsBetter: true },
  { key: "whitenessIndex", label: "Whiteness Index", unit: "", color: "#ec4899", higherIsBetter: true, demo: true },
];

const METRIC_KEYS: MetricKey[] = ["goodRice", "rejection", "foreignMatter", "weight", "whitenessIndex"];

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
            },
          ];
    for (const s of samples) {
      const id = `${p.id}_s${s.sampleNumber}`;
      rows.push({
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
  return { goodRice: 0, rejection: 0, foreignMatter: 0, weight: 0, whitenessIndex: 0 };
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
      const values = rows.map((r) => r[metricKey]);
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

  const values = samples.map((s) => s[metricKey]);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  let best = samples[0];
  let worst = samples[0];
  for (const s of samples) {
    const isBetter = higherIsBetter ? s[metricKey] > best[metricKey] : s[metricKey] < best[metricKey];
    const isWorse = higherIsBetter ? s[metricKey] < worst[metricKey] : s[metricKey] > worst[metricKey];
    if (isBetter) best = s;
    if (isWorse) worst = s;
  }

  const abnormal = samples.length >= 5 ? samples.filter((s) => Math.abs(s[metricKey] - mean) > 1.5 * stdDev) : [];

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

/**
 * DEMO DATA — a full synthetic sample-to-sample history for a machine/series/entity that is
 * configured in the mill's machine database but hasn't produced any real samples yet in the
 * current filters. Seeded off `entityKey` so the same machine always gets the same stable demo
 * numbers across re-renders. Spans several recent days with 2-3 samples each, in plausible
 * quality ranges, so every chart (trend, control chart, composition, variety comparison) has
 * something real-shaped to render. Always paired with a visible "Demo data" badge in the UI.
 */
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
      const foreignMatter = Math.max(0.5, 100 - goodRice - rejection);
      rows.push({
        id: `${entityKey}_demo_s${counter}`,
        processId: `${entityKey}_demo_run_${d}`,
        date: date.toISOString(),
        variety: DEMO_VARIETIES[Math.floor(seededUnit(`${seed}_variety`) * DEMO_VARIETIES.length)],
        process: entityKey,
        machineName: domain === "production" ? entityKey : undefined,
        modeType: undefined,
        domain,
        sampleNumber: s + 1,
        goodRice: Math.round(goodRice * 10) / 10,
        rejection: Math.round(rejection * 10) / 10,
        foreignMatter: Math.round(foreignMatter * 10) / 10,
        weight: Math.round(380 + seededUnit(`${seed}_wt`) * 220),
        whitenessIndex: demoWhitenessIndex(seed),
      });
    }
  }
  return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
