import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type AnalyticsDomain, type AnalyticsProcess } from "@/lib/reportsAnalytics";
import { ProcurementAnalyticsPanel } from "./ProcurementAnalyticsPanel";
import { ProductionAnalyticsPanel } from "./ProductionAnalyticsPanel";
import { MilledRiceAnalyticsPanel } from "./MilledRiceAnalyticsPanel";

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
        <p>No data available for analytics with the current filters.</p>
      </div>
    );
  }

  const domainProcesses = processes.filter((p) => p.domain === domain);

  return (
    <div className="space-y-4">
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

      {domain === "procurement" && <ProcurementAnalyticsPanel processes={domainProcesses} />}
      {domain === "production" && <ProductionAnalyticsPanel processes={domainProcesses} lineNames={lineNames} lineMachines={lineMachines} millLines={millLines} />}
      {domain === "milled-rice" && <MilledRiceAnalyticsPanel processes={domainProcesses} />}
    </div>
  );
}
