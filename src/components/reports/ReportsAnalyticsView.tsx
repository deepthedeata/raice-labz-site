import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type AnalyticsDomain, type AnalyticsProcess, METRICS, flattenSamples } from "@/lib/reportsAnalytics";
import { ProcurementAnalyticsPanel } from "./ProcurementAnalyticsPanel";
import { ProductionAnalyticsPanel } from "./ProductionAnalyticsPanel";
import { MilledRiceAnalyticsPanel } from "./MilledRiceAnalyticsPanel";

/** Downloads the currently-filtered domain's flattened sample rows as CSV — client-side only, no backend involved. */
function exportSamplesCsv(domain: AnalyticsDomain, processes: AnalyticsProcess[]) {
  const samples = flattenSamples(processes);
  const identityCols = ["date", "variety", "process", "machineName", "sampleNumber"] as const;
  const metricCols = METRICS.map((m) => m.key);
  const header = [...identityCols, ...metricCols].join(",");
  const escapeCell = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = samples.map((s) =>
    [...identityCols.map((c) => escapeCell(s[c])), ...metricCols.map((c) => escapeCell(s[c]))].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${domain}-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface ReportsAnalyticsViewProps {
  processes: AnalyticsProcess[];
  selectedAnalysisTypes: string[];
  /** Full mill configuration (from /settings/rice-mill), so Production can list every configured line/machine, not just ones with data yet. */
  lineNames: string[];
  lineMachines: string[];
  millLines: { name: string; machines: string[] }[];
}

const DOMAIN_LABEL: Record<AnalyticsDomain, string> = {
  procurement: "Procurement",
  production: "Production",
  "milled-rice": "Milled Rice",
};

const DOMAIN_ORDER: AnalyticsDomain[] = ["procurement", "production", "milled-rice"];

/**
 * Only one domain can be analyzed at a time — independent of how many report
 * types are checked in the Reports filters above. Defaults to the first
 * domain that actually has matching data.
 */
export function ReportsAnalyticsView({ processes, selectedAnalysisTypes, lineNames, lineMachines, millLines }: ReportsAnalyticsViewProps) {
  const availableDomains = DOMAIN_ORDER.filter((d) => {
    if (!selectedAnalysisTypes.includes(d)) return false;
    if (processes.some((p) => p.domain === d)) return true;
    // Production can be browsed purely from the mill's configured lines/machines, even before any samples exist.
    if (d === "production" && (lineNames.length > 0 || lineMachines.length > 0)) return true;
    return false;
  });

  const [domainValue, setDomainValue] = useState<AnalyticsDomain | null>(null);
  const domain = (domainValue && availableDomains.includes(domainValue) ? domainValue : availableDomains[0]) ?? null;

  if (availableDomains.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No data available for selected filters.</p>
      </div>
    );
  }

  const domainProcesses = processes.filter((p) => p.domain === domain);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Analyzing:</span>
          <ToggleGroup type="single" value={domain ?? undefined} onValueChange={(v) => v && setDomainValue(v as AnalyticsDomain)}>
            {availableDomains.map((d) => (
              <ToggleGroupItem key={d} value={d} className="text-xs px-3">
                {DOMAIN_LABEL[d]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        {domain && domainProcesses.length > 0 && (
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => exportSamplesCsv(domain, domainProcesses)}>
            <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
          </Button>
        )}
      </div>

      {domain === "procurement" && <ProcurementAnalyticsPanel processes={domainProcesses} />}
      {domain === "production" && <ProductionAnalyticsPanel processes={domainProcesses} lineNames={lineNames} lineMachines={lineMachines} millLines={millLines} />}
      {domain === "milled-rice" && <MilledRiceAnalyticsPanel processes={domainProcesses} />}
    </div>
  );
}
