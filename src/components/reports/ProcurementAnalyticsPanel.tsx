import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2 } from "lucide-react";
import {
  type AnalyticsProcess,
  type MetricKey,
  type CostEntry,
  type FlatSample,
  flattenSamples,
  groupByVariety,
  getCostEntries,
  addCostEntry,
  removeCostEntry,
  computeEconomics,
} from "@/lib/reportsAnalytics";
import {
  SampleTrendChart,
  GroupedComparisonSection,
  InsightCard,
  CHART_TOOLTIP_STYLE,
  VarietyProcessFilters,
  filterSamplesByVarietyProcess,
  ALL_VARIETIES,
  ALL_PROCESSES,
  GranularityToggle,
  type Granularity,
} from "./analyticsCharts";

type Section = "quality" | "economics";

/** Exactly the four Quality metrics the APIT Analytics UI script §4.1 calls for — no picker, no extras. */
const QUALITY_METRICS: MetricKey[] = ["goodRice", "brokenPct", "branQtyKg", "huskQtyKg"];

const avg = (rows: FlatSample[], key: keyof FlatSample) => (rows.length > 0 ? rows.reduce((s, r) => s + (r[key] as number), 0) / rows.length : 0);
const sum = (rows: FlatSample[], key: keyof FlatSample) => rows.reduce((s, r) => s + (r[key] as number), 0);

export function ProcurementAnalyticsPanel({ processes }: { processes: AnalyticsProcess[] }) {
  const [section, setSection] = useState<Section>("quality");
  const [varietyFilter, setVarietyFilter] = useState(ALL_VARIETIES);
  const [processFilter, setProcessFilter] = useState(ALL_PROCESSES);
  const [granularity, setGranularity] = useState<Granularity>("sample");

  const allSamples = useMemo(() => flattenSamples(processes), [processes]);
  const samples = useMemo(() => filterSamplesByVarietyProcess(allSamples, varietyFilter, processFilter), [allSamples, varietyFilter, processFilter]);
  const varietyBuckets = useMemo(() => groupByVariety(samples), [samples]);

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
        <ToggleGroup type="single" value={section} onValueChange={(v) => v && setSection(v as Section)}>
          <ToggleGroupItem value="quality" className="text-xs px-3">
            Quality
          </ToggleGroupItem>
          <ToggleGroupItem value="economics" className="text-xs px-3">
            Economics
          </ToggleGroupItem>
        </ToggleGroup>
        <VarietyProcessFilters samples={allSamples} variety={varietyFilter} onVarietyChange={setVarietyFilter} process={processFilter} onProcessChange={setProcessFilter} />
      </div>

      {samples.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No data available for selected filters.</p>
        </div>
      ) : section === "quality" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <InsightCard label="Head Rice Yield" value={`${avg(samples, "goodRice").toFixed(1)}%`} sublabel="avg over period" />
            <InsightCard label="Broken" value={`${avg(samples, "brokenPct").toFixed(1)}%`} sublabel="avg over period" />
            <InsightCard label="Bran Production" value={`${sum(samples, "branQtyKg").toFixed(2)} kg`} sublabel="total over period" />
            <InsightCard label="Husk Production" value={`${sum(samples, "huskQtyKg").toFixed(2)} kg`} sublabel="total over period" />
          </div>

          <GranularityToggle value={granularity} onChange={setGranularity} />
          <SampleTrendChart samples={samples} metrics={QUALITY_METRICS} title="Head Rice Yield / Broken / Bran / Husk Trend" granularity={granularity} />

          <GroupedComparisonSection title="Variety Comparison" buckets={varietyBuckets} metrics={QUALITY_METRICS} />

          {varietyBuckets.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-rice-primary">Variety Comparison — table</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Variety</TableHead>
                      <TableHead className="text-xs text-right">Samples</TableHead>
                      <TableHead className="text-xs text-right">Head Rice Yield %</TableHead>
                      <TableHead className="text-xs text-right">Broken %</TableHead>
                      <TableHead className="text-xs text-right">Bran Production (kg)</TableHead>
                      <TableHead className="text-xs text-right">Husk Production (kg)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {varietyBuckets.map((b) => (
                      <TableRow key={b.key}>
                        <TableCell className="text-xs font-medium">{b.key}</TableCell>
                        <TableCell className="text-xs text-right">{b.count}</TableCell>
                        <TableCell className="text-xs text-right">{b.avg.goodRice.toFixed(1)}</TableCell>
                        <TableCell className="text-xs text-right">{b.avg.brokenPct.toFixed(1)}</TableCell>
                        <TableCell className="text-xs text-right">{b.total.branQtyKg.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-right">{b.total.huskQtyKg.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <EconomicsSection samples={samples} />
      )}
    </div>
  );
}

function EconomicsSection({ samples }: { samples: FlatSample[] }) {
  const [costEntries, setCostEntries] = useState<CostEntry[]>(() => getCostEntries());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [costDate, setCostDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [costDescription, setCostDescription] = useState("");
  const [costAmount, setCostAmount] = useState("");

  const economics = useMemo(() => computeEconomics(samples, costEntries), [samples, costEntries]);

  const handleAddCost = () => {
    const amount = Number(costAmount);
    if (!costDate || !costDescription.trim() || !Number.isFinite(amount) || amount <= 0) return;
    setCostEntries(addCostEntry({ date: costDate, description: costDescription.trim(), amountInr: amount }));
    setCostDescription("");
    setCostAmount("");
    setDialogOpen(false);
  };

  const handleRemoveCost = (id: string) => {
    setCostEntries(removeCostEntry(id));
  };

  const inr = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const RevenueTrendTile = ({ title, dataKey, color }: { title: string; dataKey: "branRevenue" | "huskRevenue" | "headRiceRevenue" | "brokenRevenue"; color: string }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-rice-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={economics.byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`₹${v.toFixed(0)}`, title]} contentStyle={CHART_TOOLTIP_STYLE} />
              <Line type="monotone" dataKey={dataKey} name={title} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm font-semibold text-rice-primary">Procurement Economics</span>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs bg-rice-primary hover:bg-rice-primary/90">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Costs / Miscellaneous Costs
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add procurement cost</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={costDate} onChange={(e) => setCostDate(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input
                  placeholder="e.g. Transport, labour, weighing charges"
                  value={costDescription}
                  onChange={(e) => setCostDescription(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Amount (₹)</Label>
                <Input type="number" min={0} value={costAmount} onChange={(e) => setCostAmount(e.target.value)} className="h-9 text-sm" />
              </div>
              <Button className="w-full bg-rice-primary hover:bg-rice-primary/90" onClick={handleAddCost}>
                Save cost
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <InsightCard label="Total Paddy Cost" value={inr(economics.totalPaddyCost)} sublabel="paddy price × quantity" />
        <InsightCard label="Total Revenue" value={inr(economics.totalRevenue)} sublabel="bran + husk + head rice + broken" />
        <InsightCard label="Total Additional Costs" value={inr(economics.totalAdditionalCosts)} sublabel={`${costEntries.length} entries`} />
        <InsightCard
          label="Estimated Profit / Loss"
          value={`${economics.estimatedPL >= 0 ? "+" : ""}${inr(economics.estimatedPL)}`}
          sublabel="Estimated — not final accounting data"
        />
      </div>

      {economics.byDay.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No data available for selected filters.</p>
        </div>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-rice-primary">Paddy Price Trend (₹/kg)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={economics.byDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`₹${v.toFixed(2)}`, "Price"]} contentStyle={CHART_TOOLTIP_STYLE} />
                    <Line type="monotone" dataKey="avgPricePerKg" name="Paddy Price" stroke="#0891b2" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RevenueTrendTile title="Bran Revenue" dataKey="branRevenue" color="#16a34a" />
            <RevenueTrendTile title="Husk Revenue" dataKey="huskRevenue" color="#65a30d" />
            <RevenueTrendTile title="Head Rice Revenue" dataKey="headRiceRevenue" color="#0B4CAD" />
            <RevenueTrendTile title="Broken Revenue" dataKey="brokenRevenue" color="#f97316" />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-rice-primary">Estimated Profit / Loss Margin Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={economics.byDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`₹${v.toFixed(0)}`, "Estimated P/L"]} contentStyle={CHART_TOOLTIP_STYLE} />
                    <Line type="monotone" dataKey="estimatedPL" name="Estimated P/L" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-rice-primary">Costs — Additional / Miscellaneous</CardTitle>
        </CardHeader>
        <CardContent>
          {costEntries.length === 0 ? (
            <p className="text-sm text-gray-500">No additional costs added yet.</p>
          ) : (
            <div className="space-y-2">
              {[...costEntries].sort((a, b) => b.date.localeCompare(a.date)).map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div>
                    <span className="font-medium">{c.date}</span> — {c.description}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{inr(c.amountInr)}</span>
                    <button onClick={() => handleRemoveCost(c.id)} className="text-gray-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
