import { useEffect, useMemo, useState } from "react";
import {
  Filter,
  Calendar,
  Download,
  X,
  Wheat,
  Factory,
  ShoppingCart,
  CookingPot,
  ArrowRight,
} from "lucide-react";
import { TopBarIOS } from "@/components/ios/TopBarIOS";
import { Tile } from "@/components/ios/Tile";
import { StatusDot } from "@/components/ios/StatusDot";
import { VarietyThumbnail } from "@/components/ios/VarietyThumbnail";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

interface ReportRow {
  modeId?: string;
  modeType?: string;
  variety?: string;
  date?: string;
  timestamp?: string;
  machine?: string;
  totalGrains?: number;
  headRice?: number;
  broken?: number;
  whitenessIndex?: number;
  grainLength?: number;
  status?: string;
  [k: string]: any;
}

type AnalysisFilter = "all" | "procurement" | "production" | "milled-rice";

const todayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};
const daysAgoISO = (n: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const formatVariety = (v: string | undefined) => {
  if (!v) return "—";
  const s = v.trim();
  if (s.length === 3) return s.toUpperCase();
  return s
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/** Whiteness Index → grade letter & colour. */
const wiGrade = (wi: number | undefined) => {
  if (wi == null || isNaN(wi)) return null;
  if (wi >= 45) return { letter: "A", color: "hsl(var(--ios-green))", label: "Premium" };
  if (wi >= 40) return { letter: "B", color: "hsl(var(--accent))", label: "Standard" };
  if (wi >= 35) return { letter: "C", color: "hsl(var(--ios-orange))", label: "Acceptable" };
  return { letter: "D", color: "hsl(var(--ios-red))", label: "Reject" };
};

/** Map a mode's source to a colour + icon for the leading badge. */
const modeMeta = (modeType?: string, modeId?: string) => {
  const id = (modeId ?? "").toUpperCase();
  if (id.startsWith("PROC")) return { icon: ShoppingCart, label: "Procurement", color: "hsl(var(--ios-green))" };
  if (id.startsWith("PROD")) return { icon: Factory, label: "Production", color: "hsl(var(--accent))" };
  if (id.startsWith("MILL") || id.startsWith("MR")) return { icon: Wheat, label: "Milled rice", color: "hsl(var(--ios-orange))" };
  if (modeType?.toLowerCase().includes("tma")) return { icon: Factory, label: "Production", color: "hsl(var(--accent))" };
  return { icon: Wheat, label: modeType ?? "Run", color: "hsl(var(--ios-text-tertiary))" };
};

const DataReportsIOS = () => {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<AnalysisFilter>("all");
  const [fromDate, setFromDate] = useState(daysAgoISO(30));
  const [toDate, setToDate] = useState(todayISO());
  const [variety, setVariety] = useState<string>("all");
  const [season, setSeason] = useState<string>("all");
  const [varieties, setVarieties] = useState<string[]>([]);
  const [selected, setSelected] = useState<ReportRow | null>(null);

  // Load grain varieties for the filter dropdown
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${BACKEND_URL}/api/raice_labz/grain-info/varieties`);
        if (r.ok) {
          const d = await r.json();
          const list = Array.isArray(d?.varieties) ? d.varieties : [];
          const names = list
            .map((v: any) => (typeof v === "string" ? v : v?.name))
            .filter(Boolean) as string[];
          setVarieties(Array.from(new Set(names)).sort());
        }
      } catch {
        /* swallow — dropdown stays empty, "All varieties" still works */
      }
    })();
  }, []);

  const clearFilters = () => {
    setFromDate(daysAgoISO(30));
    setToDate(todayISO());
    setFilter("all");
    setVariety("all");
    setSeason("all");
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/raice_labz/analytics/grain-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDate,
          viewMode: "individual",
          analysisType: filter === "all" ? "all" : filter,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        const data: ReportRow[] = (d.data || []).map((item: any) => ({ ...item }));
        // Deduplicate by modeId — backend can return per-batch rows
        const seen = new Set<string>();
        const deduped = data.filter((row) => {
          const id = row.modeId ?? "";
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        setRows(deduped);
      } else {
        setRows([]);
      }
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, filter]);

  const visible = useMemo(() => {
    return rows.filter((row) => {
      if (variety !== "all") {
        const rv = (row.variety ?? "").trim().toLowerCase();
        if (rv !== variety.toLowerCase()) return false;
      }
      if (season !== "all") {
        const rs = (row.season ?? "").toString().toLowerCase();
        if (rs !== season.toLowerCase()) return false;
      }
      return true;
    });
  }, [rows, variety, season]);

  // Group by date for section headers
  const grouped = useMemo(() => {
    const groups: Record<string, ReportRow[]> = {};
    visible.forEach((row) => {
      const ts = row.date || row.timestamp || "";
      const key = ts ? ts.slice(0, 10) : "—";
      (groups[key] ??= []).push(row);
    });
    return Object.entries(groups).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [visible]);

  return (
    <div className="flex flex-col min-h-screen">
      <TopBarIOS title="Reports" subtitle={`${visible.length} run${visible.length === 1 ? "" : "s"}`} />

      <div className="px-6 py-6 max-w-[1300px] w-full mx-auto space-y-5">
        {/* Report Filters card */}
        <Tile>
          <div className="flex items-center gap-2 mb-5">
            <Filter className="w-4 h-4 ios-text-secondary" />
            <h2 className="text-[15px] font-semibold ios-text">Report Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">
            {/* Dates column */}
            <div className="space-y-4">
              <FormRow label="From Date">
                <DateInput value={fromDate} onChange={setFromDate} />
              </FormRow>
              <FormRow label="To Date">
                <DateInput value={toDate} onChange={setToDate} />
              </FormRow>
            </div>

            {/* Report Type cards */}
            <div className="space-y-2">
              <div className="text-[12px] font-semibold ios-text-secondary tracking-wide uppercase">
                Report Type
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <ReportTypeCard
                  active={filter === "procurement"}
                  onClick={() => setFilter(filter === "procurement" ? "all" : "procurement")}
                  icon={<ShoppingCart className="w-4 h-4" />}
                  color="hsl(var(--ios-green))"
                  title="Procurement"
                  subtitle="Procurement analysis reports"
                />
                <ReportTypeCard
                  active={filter === "production"}
                  onClick={() => setFilter(filter === "production" ? "all" : "production")}
                  icon={<Factory className="w-4 h-4" />}
                  color="hsl(var(--accent))"
                  title="Production"
                  subtitle="Production analysis reports"
                />
                <ReportTypeCard
                  active={filter === "milled-rice"}
                  onClick={() => setFilter(filter === "milled-rice" ? "all" : "milled-rice")}
                  icon={<Wheat className="w-4 h-4" />}
                  color="hsl(var(--ios-orange))"
                  title="Milled Rice Quality"
                  subtitle="Milled rice quality reports"
                />
                <ReportTypeCard
                  active={false}
                  disabled
                  onClick={() => undefined}
                  icon={<CookingPot className="w-4 h-4" />}
                  color="hsl(var(--ios-text-tertiary))"
                  title="Cooked Rice Quality"
                  subtitle="Coming Soon"
                />
              </div>
            </div>
          </div>

          {/* Variety + Season + Clear */}
          <div className="border-t ios-hairline mt-5 pt-5 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
            <FormRow label="Variety">
              <SelectInput
                value={variety}
                onChange={setVariety}
                options={[
                  { value: "all", label: "All Varieties" },
                  ...varieties.map((v) => ({ value: v, label: formatVariety(v) })),
                ]}
                ariaLabel="Variety filter"
              />
            </FormRow>
            <FormRow label="Season">
              <SelectInput
                value={season}
                onChange={setSeason}
                options={[
                  { value: "all", label: "All Seasons" },
                  { value: "kharif", label: "Kharif" },
                  { value: "rabi", label: "Rabi" },
                ]}
                ariaLabel="Season filter"
              />
            </FormRow>
            <button
              type="button"
              onClick={clearFilters}
              className="h-10 px-4 rounded-[10px] flex items-center gap-2 text-[13px] font-semibold border ios-hairline ios-raised hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150 ios-spring"
              style={{ color: "hsl(var(--ios-text))" }}
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>
        </Tile>

        {/* Photo-roll body */}
        {loading ? (
          <Tile className="text-center py-16">
            <div className="ios-text-tertiary text-[14px]">Loading reports…</div>
          </Tile>
        ) : visible.length === 0 ? (
          <Tile className="text-center py-16">
            <Calendar className="w-8 h-8 mx-auto mb-3 ios-text-tertiary" />
            <div className="text-[15px] font-semibold ios-text">No reports in range</div>
            <div className="text-[13px] ios-text-tertiary mt-1">
              Try widening the date range or clearing the filter.
            </div>
          </Tile>
        ) : (
          <div className="space-y-6">
            {grouped.map(([dateKey, group]) => (
              <section key={dateKey}>
                <div className="px-1 mb-3 text-[12px] font-semibold uppercase tracking-wider ios-text-tertiary flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  {prettyDate(dateKey)}
                  <span className="ios-text-tertiary font-normal normal-case tracking-normal">
                    · {group.length} run{group.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.map((row, i) => (
                    <ReportCard key={row.modeId ?? i} row={row} onClick={() => setSelected(row)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-[15px] font-semibold ios-text">
                {formatVariety(selected?.variety)}
              </span>
              <span className="text-[11px] font-mono ios-text-tertiary">{selected?.modeId}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && <ReportDetail row={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ───── helpers ───── */

function ReportCard({ row, onClick }: { row: ReportRow; onClick: () => void }) {
  const meta = modeMeta(row.modeType, row.modeId);
  const Icon = meta.icon;
  const grade = wiGrade(row.whitenessIndex);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "ios-surface border ios-hairline rounded-[16px] p-0 overflow-hidden text-left",
        "hover:scale-[1.012] active:scale-[0.99] transition-transform duration-150 ios-spring",
        "flex flex-col",
      )}
    >
      {/* Hero strip — uses meta colour as a mood band */}
      <div
        className="h-24 relative flex items-end p-3"
        style={{
          background: `linear-gradient(135deg, ${meta.color} 0%, ${meta.color} 60%, hsl(var(--ios-raised)) 140%)`,
        }}
      >
        <div className="absolute top-3 left-3">
          <VarietyThumbnail variety={row.variety} size={44} />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div
            className="w-8 h-8 rounded-[8px] flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.18)", color: "white" }}
          >
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white">
            {meta.label}
          </span>
        </div>
        {grade && (
          <div
            className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center font-bold text-[14px]"
            style={{
              background: "rgba(255,255,255,0.95)",
              color: grade.color,
            }}
            title={`${grade.label} (WI ${row.whitenessIndex?.toFixed(1)})`}
          >
            {grade.letter}
          </div>
        )}
        <StatusDot variant="online" size={6} className="absolute bottom-3 right-3" />
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="text-[15px] font-semibold ios-text leading-tight">
          {formatVariety(row.variety)}
        </div>
        <div className="text-[11px] font-mono ios-text-tertiary">{row.modeId ?? "—"}</div>
        <div className="grid grid-cols-3 gap-2 mt-1">
          <MicroStat label="Head" value={row.headRice} unit="%" />
          <MicroStat label="Broken" value={row.broken} unit="%" />
          <MicroStat label="WI" value={row.whitenessIndex} unit="" />
        </div>
        <div className="mt-2 text-[11px] ios-text-tertiary flex items-center justify-between">
          <span>{row.machine ? row.machine : "—"}</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </button>
  );
}

function MicroStat({ label, value, unit }: { label: string; value: number | undefined; unit: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-semibold ios-text-tertiary">
        {label}
      </div>
      <div className="text-[14px] font-semibold ios-text tabular leading-tight">
        {value != null && !isNaN(value) ? value.toFixed(1) : "—"}
        {unit && <span className="text-[10px] ios-text-tertiary ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}

function ReportDetail({ row }: { row: ReportRow }) {
  const meta = modeMeta(row.modeType, row.modeId);
  const grade = wiGrade(row.whitenessIndex);
  return (
    <div className="space-y-4">
      <div
        className="rounded-[14px] p-5 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}99)` }}
      >
        <div className="text-[12px] uppercase tracking-wider opacity-80 font-semibold">
          {meta.label}
        </div>
        <div className="text-[28px] font-bold mt-1 tabular tracking-tight">
          {formatVariety(row.variety)}
        </div>
        <div className="text-[12px] opacity-80 mt-1 font-mono">{row.modeId}</div>
        {grade && (
          <div className="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center font-bold text-[18px] bg-white" style={{ color: grade.color }}>
            {grade.letter}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DetailRow label="Head rice" value={row.headRice} unit="%" />
        <DetailRow label="Broken" value={row.broken} unit="%" />
        <DetailRow label="Whiteness Index" value={row.whitenessIndex} unit="" />
        <DetailRow label="Grain length" value={row.grainLength} unit="mm" />
        <DetailRow label="Total grains" value={row.totalGrains} unit="" decimals={0} />
        <DetailRow label="Machine" value={row.machine ?? "—"} unit="" raw />
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t ios-hairline">
        <button
          type="button"
          className="h-10 px-4 rounded-[10px] flex items-center gap-2 text-[13px] font-semibold border ios-hairline ios-raised hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150 ios-spring"
          style={{ color: "hsl(var(--ios-text))" }}
          onClick={() => window.print()}
        >
          <Download className="w-4 h-4" /> Download
        </button>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  unit,
  decimals = 1,
  raw,
}: {
  label: string;
  value: any;
  unit: string;
  decimals?: number;
  raw?: boolean;
}) {
  let display: string;
  if (raw) display = String(value ?? "—");
  else if (value == null || isNaN(Number(value))) display = "—";
  else display = Number(value).toFixed(decimals);
  return (
    <div className="ios-raised rounded-[12px] p-3 border ios-hairline">
      <div className="text-[10px] uppercase tracking-wider font-semibold ios-text-tertiary">
        {label}
      </div>
      <div className="text-[20px] font-bold ios-text tabular leading-none mt-1.5">
        {display}
        {unit && <span className="text-[12px] ios-text-tertiary font-medium ml-1">{unit}</span>}
      </div>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wider ios-text-tertiary font-semibold">
        {label}
      </div>
      {children}
    </div>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Date"
      title="Date"
      className="w-full h-10 px-3 rounded-[10px] border ios-hairline ios-raised text-[14px] ios-text outline-none"
    />
  );
}

function ReportTypeCard({
  active,
  disabled,
  onClick,
  icon,
  color,
  title,
  subtitle,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-3 rounded-[12px] border px-3 py-3 text-left transition-all duration-150 ios-spring",
        "hover:scale-[1.01] active:scale-[0.99]",
        active
          ? "ring-2"
          : "border-[hsl(var(--ios-separator))] hover:border-[hsl(var(--accent)/0.4)]",
        disabled && "opacity-50 cursor-not-allowed hover:scale-100",
      )}
      style={{
        background: active ? `${color.replace(")", " / 0.06)")}` : "hsl(var(--ios-surface))",
        boxShadow: active ? `0 0 0 2px ${color} inset` : undefined,
      }}
    >
      <span
        className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center border-2 shrink-0",
        )}
        style={{
          borderColor: active ? color : "hsl(var(--ios-separator))",
          background: active ? color : "transparent",
        }}
      >
        {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
      </span>
      <span
        className="w-8 h-8 rounded-[8px] flex items-center justify-center text-white shrink-0"
        style={{ background: color }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold ios-text leading-tight truncate">
          {title}
        </span>
        <span className="block text-[11px] ios-text-tertiary truncate">{subtitle}</span>
      </span>
    </button>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

function SelectInput({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  ariaLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="w-full h-10 px-3 rounded-[10px] border ios-hairline ios-raised text-[14px] ios-text outline-none cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function PresetChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border ios-hairline ios-raised px-3 py-1.5 text-[12px] font-semibold ios-text hover:scale-[1.04] active:scale-[0.96] transition-transform duration-150 ios-spring"
    >
      {label}
    </button>
  );
}

function prettyDate(iso: string): string {
  if (iso === "—") return "Unknown date";
  try {
    const d = new Date(iso);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const target = new Date(d); target.setHours(0, 0, 0, 0);
    if (target.getTime() === today.getTime()) return "Today";
    if (target.getTime() === yesterday.getTime()) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

/* X icon used by sheet close button */
export { X };

export default DataReportsIOS;
