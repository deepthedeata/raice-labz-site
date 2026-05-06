import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricRow {
  category: string;
  name: string;
  value: number;
  count: number;
  isIndex?: boolean;
}

interface Props {
  metrics: MetricRow[];
  showPercent: boolean;
  className?: string;
}

const SECTIONS = ["Rice", "Rejections", "Foreign Matter", "Quality & Indices"];

const SECTION_LABEL: Record<string, string> = {
  Rice: "Good rice",
  Rejections: "Rejections",
  "Foreign Matter": "Foreign matter",
  "Quality & Indices": "Quality & indices",
};

const SECTION_COLOR: Record<string, string> = {
  Rice: "hsl(var(--ios-green))",
  Rejections: "hsl(var(--ios-red))",
  "Foreign Matter": "hsl(var(--ios-orange))",
  "Quality & Indices": "hsl(var(--accent))",
};

/**
 * iOS-styled grouped collapsible breakdown of every detailed metric.
 * One section per category with a chevron header + thin progress bars.
 */
export function LiveDetailedAccordion({ metrics, showPercent, className }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    "Good Rice": true,
    Rejections: false,
    "Foreign Matter": false,
    "Quality & Indices": false,
  });

  const toggle = (s: string) => setOpen((prev) => ({ ...prev, [s]: !prev[s] }));

  return (
    <div className={cn("space-y-3", className)}>
      {SECTIONS.map((section) => {
        const rows = metrics.filter((m) => m.category === section);
        if (rows.length === 0) return null;
        const isOpen = !!open[section];
        const color = SECTION_COLOR[section] ?? "hsl(var(--accent))";
        const sectionTotal = rows.reduce((acc, r) => acc + (r.count ?? 0), 0);

        return (
          <div
            key={section}
            className="ios-surface border ios-hairline rounded-[14px] overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(section)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:ios-raised transition-colors duration-150"
              aria-expanded={isOpen ? "true" : "false"}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: color }}
              />
              <span className="flex-1 text-left text-[14px] font-semibold ios-text">
                {SECTION_LABEL[section] ?? section}
              </span>
              <span className="text-[12px] ios-text-tertiary tabular">
                {sectionTotal.toLocaleString()} {sectionTotal === 1 ? "grain" : "grains"}
              </span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 ios-text-tertiary transition-transform duration-200 ios-spring",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            {isOpen && (
              <ul className="divide-y ios-hairline">
                {rows.map((row) => (
                  <DetailRow key={row.name} row={row} color={color} showPercent={showPercent} />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DetailRow({ row, color, showPercent }: { row: MetricRow; color: string; showPercent: boolean }) {
  const v = Number(row.value) || 0;
  const max = row.isIndex ? 50 : 100;
  const pct = Math.max(0, Math.min(1, v / max));
  return (
    <li className="px-4 py-2.5 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] ios-text leading-tight font-medium truncate">{row.name}</div>
        <div className="mt-1 h-1 rounded-full ios-separator overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ios-spring"
            style={{ width: `${pct * 100}%`, background: color }}
          />
        </div>
      </div>
      <div className="shrink-0 text-right" style={{ minWidth: 64 }}>
        <div className="text-[14px] font-bold ios-text tabular leading-none">
          {showPercent ? `${v.toFixed(1)}%` : (row.count ?? 0).toLocaleString()}
        </div>
      </div>
    </li>
  );
}
