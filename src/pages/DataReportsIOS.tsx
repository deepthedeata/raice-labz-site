import { useEffect, useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  Calendar,
  Download,
  X,
  Wheat,
  Factory,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";
import { TopBarIOS } from "@/components/ios/TopBarIOS";
import { Tile } from "@/components/ios/Tile";
import { SegmentedControl } from "@/components/ios/SegmentedControl";
import { StatusDot } from "@/components/ios/StatusDot";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(daysAgoISO(30));
  const [toDate, setToDate] = useState(todayISO());
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<ReportRow | null>(null);

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
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!q) return true;
      const haystack = [row.modeId, row.variety, row.machine, row.modeType].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);

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
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 ios-surface border ios-hairline rounded-[10px] px-3 h-10 flex-1 min-w-[220px]">
            <Search className="w-4 h-4 ios-text-tertiary shrink-0" />
            <input
              type="text"
              placeholder="Search by ID, variety, machine…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[14px] ios-text outline-none placeholder:ios-text-tertiary"
            />
          </div>
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as AnalysisFilter)}
            segments={[
              { value: "all", label: "All" },
              { value: "procurement", label: "Procurement" },
              { value: "production", label: "Production" },
              { value: "milled-rice", label: "Milled" },
            ]}
          />
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="h-10 px-4 rounded-[10px] flex items-center gap-2 text-[13px] font-semibold border ios-hairline ios-raised hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150 ios-spring"
                style={{ color: "hsl(var(--ios-text))" }}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Date range
              </button>
            </SheetTrigger>
            <SheetContent side="top" className="h-auto max-h-[60vh]">
              <SheetHeader>
                <SheetTitle>Filter reports</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <FormRow label="From">
                  <DateInput value={fromDate} onChange={setFromDate} />
                </FormRow>
                <FormRow label="To">
                  <DateInput value={toDate} onChange={setToDate} />
                </FormRow>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <PresetChip label="Today" onClick={() => { setFromDate(todayISO()); setToDate(todayISO()); }} />
                <PresetChip label="Last 7 days" onClick={() => { setFromDate(daysAgoISO(7)); setToDate(todayISO()); }} />
                <PresetChip label="Last 30 days" onClick={() => { setFromDate(daysAgoISO(30)); setToDate(todayISO()); }} />
                <PresetChip label="Last 90 days" onClick={() => { setFromDate(daysAgoISO(90)); setToDate(todayISO()); }} />
              </div>
            </SheetContent>
          </Sheet>
        </div>

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
