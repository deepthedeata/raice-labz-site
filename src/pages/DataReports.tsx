
// import { useState, useEffect, useMemo } from "react";
// import { useNavigate } from "react-router-dom";
// import { PageHeader } from "@/components/PageHeader";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Input } from "@/components/ui/input";
// import { Download, Eye, FileText, Loader2, Filter, X } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";

// const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

// interface ReportItem {
//   modeId: string;
//   modeType: string;
//   variety: string;
//   process: string;
//   operator: string;
//   date: string;
//   time: string;
//   totalGrains: number;
//   weight: number;
//   machineName?: string;
//   season?: string;
//   samplingMethod?: string;
//   status: string;
// }

// // Map mode type prefix to display label and color
// const MODE_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
//   procurement: { label: "PROCUREMENT", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" },
//   production: { label: "PRODUCTION", color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
//   "milled-rice": { label: "MILLED RICE", color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30" },
//   individual: { label: "INDIVIDUAL", color: "text-purple-400", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30" },
//   batch: { label: "BATCH", color: "text-green-400", bgColor: "bg-green-500/10", borderColor: "border-green-500/30" },
//   "machine-wise": { label: "MACHINE", color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
//   tma: { label: "TMA", color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30" },
// };

// const DataReports = () => {
//   const navigate = useNavigate();
//   const { toast } = useToast();

//   // Filter state
//   const [analysisType, setAnalysisType] = useState<string>("all");
//   const [varietyFilter, setVarietyFilter] = useState<string>("all");
//   const [seasonFilter, setSeasonFilter] = useState<string>("all");
//   const [fromDate, setFromDate] = useState<string>("");
//   const [toDate, setToDate] = useState<string>("");

//   // Data state
//   const [allReports, setAllReports] = useState<ReportItem[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isGenerating, setIsGenerating] = useState<string | null>(null);

//   // Fetch all reports on mount and when date filters change
//   const fetchReports = async () => {
//     setIsLoading(true);
//     try {
//       // Default to last 30 days if no date specified
//       const now = new Date();
//       const defaultFrom = new Date(now);
//       defaultFrom.setDate(defaultFrom.getDate() - 30);

//       const from = fromDate || defaultFrom.toISOString().split('T')[0];
//       const to = toDate || now.toISOString().split('T')[0];

//       // Fetch from the grain-analysis endpoint with "individual" view mode to get all modes
//       const response = await fetch(`${BACKEND_URL}/api/raice_labz/analytics/grain-analysis`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           fromDate: from,
//           toDate: to,
//           viewMode: 'individual'
//         }),
//       });

//       if (!response.ok) throw new Error(`HTTP ${response.status}`);

//       const data = await response.json();
//       const apiData = data.data || [];

//       // Deduplicate by modeId and transform
//       const modeMap = new Map<string, ReportItem>();
//       apiData.forEach((item: any) => {
//         const modeId = item.modeId || 'unknown';
//         if (modeMap.has(modeId)) {
//           // Aggregate totalGrains for multi-trial modes
//           const existing = modeMap.get(modeId)!;
//           existing.totalGrains += item.totalGrains || 0;
//           return;
//         }

//         // Determine mode type from modeId prefix
//         let modeType = item.modeType || 'individual';
//         if (modeId.startsWith('PRT-')) modeType = 'procurement';
//         else if (modeId.startsWith('PROD-')) modeType = 'production';
//         else if (modeId.startsWith('MR-')) modeType = 'milled-rice';
//         else if (modeId.startsWith('IND-')) modeType = 'individual';
//         else if (modeId.startsWith('BAT-')) modeType = 'batch';
//         else if (modeId.startsWith('MACH-')) modeType = 'machine-wise';
//         else if (modeId.startsWith('tma-')) modeType = 'tma';

//         const dateObj = new Date(item.date || item.createdAt || now);

//         modeMap.set(modeId, {
//           modeId,
//           modeType,
//           variety: item.variety || 'Unknown',
//           process: item.process || 'Raw',
//           operator: item.operator || 'Unknown',
//           date: dateObj.toISOString().split('T')[0],
//           time: dateObj.toTimeString().slice(0, 5),
//           totalGrains: item.totalGrains || 0,
//           weight: item.weight || 0,
//           machineName: item.machineName,
//           season: item.season || '',
//           samplingMethod: item.samplingMethod || '',
//           status: item.status || 'completed',
//         });
//       });

//       // Sort by date descending
//       const reports = Array.from(modeMap.values()).sort(
//         (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
//       );

//       setAllReports(reports);
//     } catch (error) {
//       console.error('Error fetching reports:', error);
//       toast({
//         title: "Error",
//         description: "Failed to fetch reports data",
//         variant: "destructive",
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchReports();
//   }, []);

//   // Get unique values for filter dropdowns
//   const uniqueVarieties = useMemo(() => {
//     const varieties = new Set(allReports.map(r => r.variety));
//     return Array.from(varieties).sort();
//   }, [allReports]);

//   const uniqueSeasons = useMemo(() => {
//     const seasons = new Set(allReports.filter(r => r.season).map(r => r.season!));
//     return Array.from(seasons).sort();
//   }, [allReports]);

//   // Apply filters
//   const filteredReports = useMemo(() => {
//     return allReports.filter(report => {
//       if (analysisType !== "all" && report.modeType !== analysisType) return false;
//       if (varietyFilter !== "all" && report.variety !== varietyFilter) return false;
//       if (seasonFilter !== "all" && report.season !== seasonFilter) return false;
//       if (fromDate && report.date < fromDate) return false;
//       if (toDate && report.date > toDate) return false;
//       return true;
//     });
//   }, [allReports, analysisType, varietyFilter, seasonFilter, fromDate, toDate]);

//   const clearFilters = () => {
//     setAnalysisType("all");
//     setVarietyFilter("all");
//     setSeasonFilter("all");
//     setFromDate("");
//     setToDate("");
//   };

//   const handleApplyDateFilter = () => {
//     fetchReports();
//   };

//   const handleDownloadReport = async (modeId: string) => {
//     setIsGenerating(modeId);
//     try {
//       // Determine report type from modeId prefix
//       let reportType = 'individual';
//       if (modeId.startsWith('PRT-')) reportType = 'individual';
//       else if (modeId.startsWith('PROD-')) reportType = 'individual';
//       else if (modeId.startsWith('MR-')) reportType = 'individual';
//       else if (modeId.startsWith('BAT-')) reportType = 'batch';
//       else if (modeId.startsWith('MACH-')) reportType = 'machine';

//       const response = await fetch(`${BACKEND_URL}/api/generate-report`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ mode_id: modeId, report_type: reportType }),
//       });

//       if (response.ok) {
//         const blob = await response.blob();
//         const url = window.URL.createObjectURL(blob);
//         const a = document.createElement('a');
//         a.href = url;
//         const contentDisposition = response.headers.get('Content-Disposition');
//         let filename = `${modeId}_report.pdf`;
//         if (contentDisposition) {
//           const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
//           if (match?.[1]) filename = match[1].replace(/['"]/g, '');
//         }
//         a.download = filename;
//         document.body.appendChild(a);
//         a.click();
//         window.URL.revokeObjectURL(url);
//         document.body.removeChild(a);
//         toast({ title: "Report Downloaded", description: `Report for ${modeId} downloaded successfully.` });
//       } else {
//         const errorData = await response.json();
//         throw new Error(errorData.message || 'Failed to generate report');
//       }
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: error instanceof Error ? error.message : "Failed to generate report",
//         variant: "destructive",
//       });
//     } finally {
//       setIsGenerating(null);
//     }
//   };

//   const handleViewReport = (report: ReportItem) => {
//     const params = new URLSearchParams({
//       mode: 'Individual',
//       modeId: report.modeId,
//     });
//     navigate(`/mongodb-viewer?${params.toString()}`);
//   };

//   const getTypeConfig = (modeType: string) => {
//     return MODE_TYPE_CONFIG[modeType] || MODE_TYPE_CONFIG.individual;
//   };

//   const formatReportName = (report: ReportItem) => {
//     const typeLabel = getTypeConfig(report.modeType).label;
//     const variety = report.variety !== 'Unknown' ? ` — ${report.variety}` : '';
//     const machine = report.machineName ? ` (${report.machineName})` : '';
//     return `${typeLabel} Analysis${variety}${machine}`;
//   };

//   const formatReportMeta = (report: ReportItem) => {
//     const parts = [
//       report.date,
//       report.time,
//       report.operator !== 'Unknown' ? `Operator: ${report.operator}` : null,
//       report.samplingMethod || null,
//       report.season || null,
//     ].filter(Boolean);
//     return parts.join(' | ');
//   };

//   return (
//     <div className="flex-1 flex flex-col overflow-hidden">
//       <PageHeader
//         title="Reports"
//         subtitle="View and export analysis reports"
//       />

//       <div className="flex-1 overflow-auto p-6">
//         <div className="max-w-6xl mx-auto space-y-4">

//           {/* Filter Bar */}
//           <Card>
//             <CardContent className="py-3 px-4">
//               <div className="flex flex-wrap items-center gap-3">
//                 <div className="flex items-center gap-2">
//                   <Filter className="w-4 h-4 text-muted-foreground" />
//                   <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filters:</span>
//                 </div>

//                 <Select value={analysisType} onValueChange={setAnalysisType}>
//                   <SelectTrigger className="w-[160px] h-8 text-xs">
//                     <SelectValue placeholder="All Analysis Types" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="all">All Analysis Types</SelectItem>
//                     <SelectItem value="procurement">Procurement</SelectItem>
//                     <SelectItem value="production">Production</SelectItem>
//                     <SelectItem value="milled-rice">Milled Rice</SelectItem>
//                     <SelectItem value="individual">Individual</SelectItem>
//                     <SelectItem value="batch">Batch</SelectItem>
//                     <SelectItem value="machine-wise">Machine Wise</SelectItem>
//                     <SelectItem value="tma">TMA</SelectItem>
//                   </SelectContent>
//                 </Select>

//                 <Select value={varietyFilter} onValueChange={setVarietyFilter}>
//                   <SelectTrigger className="w-[140px] h-8 text-xs">
//                     <SelectValue placeholder="All Varieties" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="all">All Varieties</SelectItem>
//                     {uniqueVarieties.map(v => (
//                       <SelectItem key={v} value={v}>{v}</SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>

//                 {uniqueSeasons.length > 0 && (
//                   <Select value={seasonFilter} onValueChange={setSeasonFilter}>
//                     <SelectTrigger className="w-[130px] h-8 text-xs">
//                       <SelectValue placeholder="All Seasons" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">All Seasons</SelectItem>
//                       {uniqueSeasons.map(s => (
//                         <SelectItem key={s} value={s}>{s}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 )}

//                 <Input
//                   type="date"
//                   value={fromDate}
//                   onChange={e => setFromDate(e.target.value)}
//                   className="w-[140px] h-8 text-xs"
//                   placeholder="From"
//                 />
//                 <Input
//                   type="date"
//                   value={toDate}
//                   onChange={e => setToDate(e.target.value)}
//                   className="w-[140px] h-8 text-xs"
//                   placeholder="To"
//                 />

//                 <Button size="sm" className="h-8 text-xs bg-rice-primary hover:bg-rice-primary/90" onClick={handleApplyDateFilter}>
//                   Apply
//                 </Button>
//                 <Button size="sm" variant="outline" className="h-8 text-xs" onClick={clearFilters}>
//                   <X className="w-3 h-3 mr-1" /> Clear
//                 </Button>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Count & Export Bar */}
//           <div className="flex items-center justify-between">
//             <span className="text-xs text-muted-foreground font-medium tracking-wider uppercase">
//               Showing {filteredReports.length} of {allReports.length} results
//             </span>
//             <div className="flex gap-2">
//               <Button size="sm" className="h-8 text-xs bg-rice-primary hover:bg-rice-primary/90" disabled>
//                 <Download className="w-3 h-3 mr-1" /> Export All (PDF)
//               </Button>
//               <Button size="sm" variant="outline" className="h-8 text-xs" disabled>
//                 <FileText className="w-3 h-3 mr-1" /> Export (Excel)
//               </Button>
//             </div>
//           </div>

//           {/* Report Cards List */}
//           {isLoading ? (
//             <div className="flex flex-col items-center justify-center py-16">
//               <Loader2 className="w-8 h-8 animate-spin text-rice-primary" />
//               <p className="mt-3 text-sm text-muted-foreground">Loading reports...</p>
//             </div>
//           ) : filteredReports.length === 0 ? (
//             <Card>
//               <CardContent className="py-12 text-center">
//                 <p className="text-muted-foreground">
//                   {allReports.length === 0
//                     ? "No reports found. Run some analysis sessions first."
//                     : "No reports match the selected filters."}
//                 </p>
//               </CardContent>
//             </Card>
//           ) : (
//             <div className="space-y-2">
//               {filteredReports.map(report => {
//                 const typeConfig = getTypeConfig(report.modeType);
//                 return (
//                   <Card key={report.modeId} className="hover:border-rice-primary/50 transition-colors cursor-pointer">
//                     <CardContent className="py-3 px-4">
//                       <div className="flex items-center gap-4">
//                         {/* Test ID */}
//                         <div className="min-w-[160px]">
//                           <span className="text-xs font-mono text-rice-primary font-medium">
//                             {report.modeId}
//                           </span>
//                         </div>

//                         {/* Name & Meta */}
//                         <div className="flex-1 min-w-0">
//                           <div className="text-sm font-semibold truncate">
//                             {formatReportName(report)}
//                           </div>
//                           <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
//                             {formatReportMeta(report)}
//                           </div>
//                         </div>

//                         {/* Grains count */}
//                         <div className="text-right min-w-[80px]">
//                           <div className="text-sm font-bold text-rice-primary">{report.totalGrains.toLocaleString()}</div>
//                           <div className="text-[10px] text-muted-foreground">grains</div>
//                         </div>

//                         {/* Type Badge */}
//                         <span className={`text-[10px] font-mono font-semibold px-2 py-1 rounded border tracking-wider ${typeConfig.color} ${typeConfig.bgColor} ${typeConfig.borderColor}`}>
//                           {typeConfig.label}
//                         </span>

//                         {/* Action Buttons */}
//                         <div className="flex gap-2">
//                           <Button
//                             size="sm"
//                             variant="outline"
//                             className="h-7 text-xs px-3"
//                             onClick={() => handleViewReport(report)}
//                           >
//                             <Eye className="w-3 h-3 mr-1" /> View
//                           </Button>
//                           <Button
//                             size="sm"
//                             className="h-7 text-xs px-3 bg-rice-primary hover:bg-rice-primary/90"
//                             onClick={() => handleDownloadReport(report.modeId)}
//                             disabled={isGenerating === report.modeId}
//                           >
//                             {isGenerating === report.modeId ? (
//                               <Loader2 className="w-3 h-3 mr-1 animate-spin" />
//                             ) : (
//                               <Download className="w-3 h-3 mr-1" />
//                             )}
//                             PDF
//                           </Button>
//                         </div>
//                       </div>
//                     </CardContent>
//                   </Card>
//                 );
//               })}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default DataReports;

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Download, Factory, Package, User, Settings, Microscope, Eye, X, ShoppingCart, Wheat, FileText, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { buildReportFilename } from "@/lib/reportFilename";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://192.168.0.143:5000';
const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

interface SampleData {
  sampleNumber: number;
  weight: string;
  goodRice: number;
  rejection: number;
  foreignMatter: number;
  completed: boolean;
}

interface GrainData {
  grainId: string;
  grainClass: string;
  grainMetrics: {
    length?: string;
    breadth?: string;
    grainArea?: string;
    chalkyArea?: string;
    whitenessIndex?: string;
    meanRed?: string;
    meanGreen?: string;
    meanBlue?: string;
  };
  grainImage: string;
  chalkyArea?: string;
}

interface ProcessData {
  id: string;
  name: string;
  date: string;
  sessionType: string;
  variety: string;
  process: string;
  samples: SampleData[];
  totalQuantity: number;
  overallGoodRice: number;
  overallRejection: number;
  overallForeignMatter: number;
  grainData?: GrainData[];
  machineName?: string;
  modeId?: string;
  binDryerNumber?: string;
  modeType?: string;
  operatorName?: string;
  analysisTime?: string;
  enableChalky?: boolean;
  season?: string;
}

const DataReports = () => {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  const [selectedAnalysisTypes, setSelectedAnalysisTypes] = useState<string[]>(["procurement", "production", "milled-rice"]);
  const [selectedVarieties, setSelectedVarieties] = useState<string[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [machineFilter, setMachineFilter] = useState("all");
  const [productionMode, setProductionMode] = useState<"all" | "series" | "single">("all");
  const [filterOptions, setFilterOptions] = useState<{ varieties: string[]; seasons: string[]; machines: string[] }>({ varieties: [], seasons: [], machines: [] });
  const [lineMachines, setLineMachines] = useState<string[]>([]);
  const [lineNames, setLineNames] = useState<string[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [detailedChalkyProcessIds, setDetailedChalkyProcessIds] = useState<Set<string>>(new Set());
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // API Functions

  const fetchProcessData = async () => {
    if (!fromDate || !toDate) return [];
    
    setIsLoadingData(true);
    try {
      // Format dates as YYYY-MM-DD to ensure proper date range handling
      const fromDateStr = format(fromDate, 'yyyy-MM-dd');
      const toDateStr = format(toDate, 'yyyy-MM-dd');
      
      if (selectedAnalysisTypes.length === 0) {
        return [];
      }

      const selectedAnalysisType = selectedAnalysisTypes.length === 1 ? selectedAnalysisTypes[0] : 'all';
      const wantsProduction = selectedAnalysisTypes.includes('production');
      const wantsNonProduction = selectedAnalysisTypes.some((type) => type !== 'production');

      // Map the active analysis selection to the backend viewMode
      const getViewMode = () => {
        switch (selectedAnalysisType) {
          case 'procurement': return 'individual';
          case 'production': return 'machine-wise';
          case 'milled-rice': return 'individual';
          case 'all': return 'individual';
          default: return 'individual';
        }
      };

      console.log('🔍 [FRONTEND DEBUG] Date range:', {
        fromDate: fromDateStr,
        toDate: toDateStr,
        fromDateObj: fromDate,
        toDateObj: toDate,
        selectedAnalysisTypes,
        selectedAnalysisType,
        fromDateISO: fromDate.toISOString(),
        toDateISO: toDate.toISOString()
      });

      // Parse the unified machineFilter: "all", "series:Line 1", or "machine:Husker 1"
      const isSeries = machineFilter.startsWith('series:');
      const isMachine = machineFilter.startsWith('machine:');
      const filterValue = isSeries ? machineFilter.slice(7) : isMachine ? machineFilter.slice(8) : '';

      const baseParams: any = {
        fromDate: fromDateStr,
        toDate: toDateStr,
      };
      if (selectedAnalysisTypes.length === 1 && selectedAnalysisType !== 'all') {
        baseParams.analysisType = selectedAnalysisType;
      }
      // For single-machine filter, pass machineName to grain-analysis
      if (isMachine) baseParams.machineName = filterValue;

      // Determine which endpoints to fetch based on selected analysis types
      const fetchGrainAnalysis = selectedAnalysisTypes.length > 0 && (wantsNonProduction || !isSeries);
      const fetchTmaAnalysis = selectedAnalysisTypes.length > 0 && wantsProduction && !isMachine;

      const fetches: Promise<any[]>[] = [];

      // grain-analysis endpoint (single machine production, procurement, milled-rice, etc.)
      if (fetchGrainAnalysis) {
        const requestBody: any = { ...baseParams, viewMode: getViewMode() };
        if (selectedVarieties.length > 0) requestBody.varieties = selectedVarieties;
        if (selectedSeasons.length > 0) requestBody.seasons = selectedSeasons;
        fetches.push(
          fetch(`${BACKEND_URL}/api/raice_labz/analytics/grain-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }).then(async (r) => {
            if (!r.ok) return [];
            const d = await r.json();
            return (d.data || []).map((item: any) => ({ ...item, _source: 'grain-analysis' }));
          }).catch(() => [])
        );
      }

      // tma-analysis endpoint (production series)
      if (fetchTmaAnalysis) {
        const tmaBody: any = { fromDate: fromDateStr, toDate: toDateStr };
        // For machine filter, pass as selectedMachine to TMA endpoint
        if (isMachine) tmaBody.selectedMachine = filterValue;
        // For series filter, pass as series name
        if (isSeries) tmaBody.seriesName = filterValue;
        // Pass variety/season filters so backend can restrict to matching modes
        if (selectedVarieties.length > 0) tmaBody.varieties = selectedVarieties;
        if (selectedSeasons.length > 0) tmaBody.seasons = selectedSeasons;
        fetches.push(
          fetch(`${BACKEND_URL}/api/raice_labz/analytics/tma-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tmaBody),
          }).then(async (r) => {
            if (!r.ok) return [];
            const d = await r.json();
            // Only keep PROD- prefixed entries (production series), tag as tma source
            return (d.data || [])
              .filter((item: any) => {
                const id = item.modeId || item.tmaId || '';
                return id.startsWith('PROD-');
              })
              .map((item: any) => ({ ...item, modeType: 'tma', _source: 'tma-analysis' }));
          }).catch(() => [])
        );
      }

      const results = await Promise.all(fetches);
      const merged = results.flat();

      console.log('🔍 [FRONTEND DEBUG] API Response:', {
        grainAnalysisCount: results[0]?.length || 0,
        tmaAnalysisCount: results[1]?.length || 0,
        mergedCount: merged.length,
        sampleData: merged[0] || null,
      });

      return merged;
    } catch (error) {
      console.error('Error fetching process data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch process data",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoadingData(false);
    }
  };

  const getFilenameReportType = (modeId: string, analysisTypeValue: string, modeType?: string): string => {
    if (analysisTypeValue === "procurement") return "procurement";
    if (analysisTypeValue === "milled-rice") return "milled-rice";
    if (analysisTypeValue === "production") return modeType === "tma" ? "tma" : "production";

    if (modeType === "tma") return "tma";
    if (modeId.startsWith("PRT-")) return "procurement";
    if (modeId.startsWith("PROD-")) return "production";
    if (modeId.startsWith("MR-")) return "milled-rice";
    return "procurement";
  };

  const handleDownloadReport = async (process: ProcessData) => {
    setIsGenerating(true);
    try {
      const { id: processId, name: processName } = process;
      // Extract modeId from processId - the processId contains the modeId
      // Format: modeId_index_date, so we take the first part before the first underscore
      const modeId = processId.split('_')[0]; // Extract the first part before underscore
      
      // Find the process data to check its modeType (series vs single machine)
      const processEntry = currentProcesses.find((p) => p.id === processId);
      const entryModeType = processEntry?.modeType || process.modeType || '';

      // Map process row to report_type for download
      const processType = entryModeType === 'tma'
        ? 'production'
        : (entryModeType || getAnalysisTypeFromModeId(modeId));

      let reportType = 'individual';
      if (entryModeType === 'tma') {
        reportType = 'tma';
      } else if (processType === 'production') {
        reportType = 'production';
      } else if (processType === 'procurement') {
        reportType = 'procurement';
      } else if (processType === 'milled-rice') {
        reportType = 'milled-rice';
      }

      const requestBody: Record<string, any> = {
        mode_id: modeId,
        report_type: reportType,
      };
      if (detailedChalkyProcessIds.has(processId)) {
        requestBody.include_detailed_chalky = true;
      }

      console.log('🔍 [FRONTEND DEBUG] Downloading report:', {
        processId,
        modeId,
        reportType,
        requestBody
      });

      const response = await fetch(`${BACKEND_URL}/api/generate-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const contentDisposition = response.headers.get("Content-Disposition");
        const filenameReportType = getFilenameReportType(modeId, processType, entryModeType);
        const filename = buildReportFilename({
          modeId,
          reportType: filenameReportType,
          variety: process.variety,
          process: process.process,
          contentDisposition,
          fallbackExtension: ".pdf",
        });
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Report Generated",
          description: `${getReportTypeConfig(processType).label} report for ${processName} has been downloaded successfully.`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Debug function to test API directly
  const testApiDirectly = async () => {
    try {
      console.log('🔍 [FRONTEND DEBUG] Testing API directly...');
      const response = await fetch(`${BACKEND_URL}/api/raice_labz/analytics/debug`);
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [FRONTEND DEBUG] Debug API Response:', data);
      }
    } catch (error) {
      console.error('🔍 [FRONTEND DEBUG] Debug API Error:', error);
    }
  };

  // Effects
  useEffect(() => {
    testApiDirectly(); // Test API on component mount
    // Fetch filter options on mount
    const fetchFilterOptions = async () => {
      try {
        // Varieties from grain_info, seasons/machines from analytics filter-options
        const [varietiesRes, optionsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/raice_labz/grain-info/varieties`),
          fetch(`${BACKEND_URL}/api/raice_labz/analytics/filter-options`),
        ]);
        const varieties = varietiesRes.ok ? (await varietiesRes.json()).varieties || [] : [];
        const options = optionsRes.ok ? await optionsRes.json() : {};
        setFilterOptions({
          varieties,
          seasons: options.seasons || [],
          machines: options.machines || [],
        });
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };
    fetchFilterOptions();

    // Fetch mill lines to get machines for production filter
    const fetchMillLines = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/raice_labz/settings/rice-mill`);
        if (response.ok) {
          const data = await response.json();
          const lines = data?.settings?.lines;
          if (Array.isArray(lines)) {
            const allMachines: string[] = [];
            const allLineNames: string[] = [];
            lines.forEach((line: { name?: string; machines?: (string | { name?: string; machineNumber?: string })[] }) => {
              if (line.name) allLineNames.push(line.name);
              if (Array.isArray(line.machines)) {
                line.machines.forEach((m) => {
                  let displayName: string;
                  if (typeof m === 'string') {
                    displayName = m;
                  } else {
                    const base = m?.name || '';
                    displayName = m?.machineNumber ? `${base} ${m.machineNumber}` : base;
                  }
                  if (displayName && !allMachines.includes(displayName)) allMachines.push(displayName);
                });
              }
            });
            setLineMachines(allMachines);
            setLineNames(allLineNames);
          }
        }
      } catch (error) {
        console.error('Error fetching mill lines:', error);
      }
    };
    fetchMillLines();
  }, []);

  // // Sample grain data
  // const sampleGrainData: GrainData[] = [
  //   {
  //     grainId: "IND-7289-081025-A_21",
  //     grainClass: "paddy",
  //     grainMetrics: {},
  //     grainImage: "/placeholder.svg",
  //     chalkyArea: "No data available"
  //   },
  //   {
  //     grainId: "IND-7289-081025-A_19",
  //     grainClass: "paddy",
  //     grainMetrics: {},
  //     grainImage: "/placeholder.svg",
  //     chalkyArea: "No data available"
  //   },
  //   {
  //     grainId: "IND-7289-081025-A_18",
  //     grainClass: "paddy",
  //     grainMetrics: {},
  //     grainImage: "/placeholder.svg",
  //     chalkyArea: "No data available"
  //   },
  //   {
  //     grainId: "IND-7289-081025-A_16",
  //     grainClass: "paddy",
  //     grainMetrics: {},
  //     grainImage: "/placeholder.svg",
  //     chalkyArea: "No data available"
  //   },
  //   {
  //     grainId: "IND-7289-081025-A_14",
  //     grainClass: "headrice",
  //     grainMetrics: {
  //       length: "5.63mm",
  //       breadth: "1.68mm",
  //       grainArea: "3216px²",
  //       chalkyArea: "596px²",
  //       whitenessIndex: "38.70",
  //       meanRed: "100.37",
  //       meanGreen: "97.31",
  //       meanBlue: "92.54"
  //     },
  //     grainImage: "/placeholder.svg",
  //     chalkyArea: "/placeholder.svg"
  //   },
  //   {
  //     grainId: "IND-7289-081025-A_13",
  //     grainClass: "paddy",
  //     grainMetrics: {},
  //     grainImage: "/placeholder.svg",
  //     chalkyArea: "No data available"
  //   },
  //   {
  //     grainId: "IND-7289-081025-A_12",
  //     grainClass: "headrice",
  //     grainMetrics: {
  //       length: "4.27mm",
  //       breadth: "1.91mm",
  //       grainArea: "6150px²"
  //     },
  //     grainImage: "/placeholder.svg",
  //     chalkyArea: "/placeholder.svg"
  //   }
  // ];
  
  // // Sample data for individual sessions
  // const individualSessions: ProcessData[] = [
  //   {
  //     id: "IND001",
  //     name: "Individual Session #001",
  //     date: "2024-11-15",
  //     sessionType: "individual",
  //     variety: "BASMATI",
  //     process: "Raw",
  //     samples: [
  //       { sampleNumber: 1, weight: "2.5", goodRice: 94.2, rejection: 4.1, foreignMatter: 0.3, completed: true },
  //       { sampleNumber: 2, weight: "2.3", goodRice: 93.8, rejection: 4.5, foreignMatter: 0.4, completed: true },
  //       { sampleNumber: 3, weight: "2.7", goodRice: 95.1, rejection: 3.8, foreignMatter: 0.2, completed: true }
  //     ],
  //     totalQuantity: 7.5,
  //     overallGoodRice: 94.4,
  //     overallRejection: 4.1,
  //     overallForeignMatter: 0.3,
  //     grainData: sampleGrainData
  //   },
  //   {
  //     id: "IND002",
  //     name: "Individual Session #002",
  //     date: "2024-12-20",
  //     sessionType: "individual",
  //     variety: "JASMINE",
  //     process: "Parboiled",
  //     samples: [
  //       { sampleNumber: 1, weight: "2.1", goodRice: 92.5, rejection: 5.2, foreignMatter: 0.5, completed: true },
  //       { sampleNumber: 2, weight: "2.4", goodRice: 91.8, rejection: 5.8, foreignMatter: 0.6, completed: true },
  //       { sampleNumber: 3, weight: "2.2", goodRice: 93.2, rejection: 4.9, foreignMatter: 0.4, completed: true }
  //     ],
  //     totalQuantity: 6.7,
  //     overallGoodRice: 92.5,
  //     overallRejection: 5.3,
  //     overallForeignMatter: 0.5,
  //     grainData: sampleGrainData
  //   }
  // ];

  // // Sample data for batch sessions
  // const batchSessions: ProcessData[] = [
  //   {
  //     id: "BAT001",
  //     name: "Batch #2024-001",
  //     date: "2024-10-25",
  //     sessionType: "batch",
  //     variety: "BASMATI",
  //     process: "Raw",
  //     samples: [
  //       { sampleNumber: 1, weight: "5.0", goodRice: 95.1, rejection: 3.2, foreignMatter: 0.1, completed: true },
  //       { sampleNumber: 2, weight: "4.8", goodRice: 94.8, rejection: 3.5, foreignMatter: 0.2, completed: true },
  //       { sampleNumber: 3, weight: "5.2", goodRice: 95.4, rejection: 2.9, foreignMatter: 0.1, completed: true }
  //     ],
  //     totalQuantity: 15.0,
  //     overallGoodRice: 95.1,
  //     overallRejection: 3.2,
  //     overallForeignMatter: 0.1,
  //     grainData: sampleGrainData
  //   },
  //   {
  //     id: "BAT002",
  //     name: "Batch #2024-002",
  //     date: "2024-12-08",
  //     sessionType: "batch",
  //     variety: "LONG_GRAIN",
  //     process: "Parboiled",
  //     samples: [
  //       { sampleNumber: 1, weight: "4.9", goodRice: 93.7, rejection: 4.8, foreignMatter: 0.4, completed: true },
  //       { sampleNumber: 2, weight: "5.1", goodRice: 93.2, rejection: 5.1, foreignMatter: 0.5, completed: true },
  //       { sampleNumber: 3, weight: "4.7", goodRice: 94.1, rejection: 4.5, foreignMatter: 0.3, completed: true }
  //     ],
  //     totalQuantity: 14.7,
  //     overallGoodRice: 93.7,
  //     overallRejection: 4.8,
  //     overallForeignMatter: 0.4,
  //     grainData: sampleGrainData
  //   }
  // ];

  // // Sample data for machine wise sessions
  // const machineWiseSessions: ProcessData[] = [
  //   {
  //     id: "MAC001",
  //     name: "Stone Sort I",
  //     date: "2025-01-10",
  //     sessionType: "machine",
  //     variety: "BASMATI",
  //     process: "Raw",
  //     samples: [
  //       { sampleNumber: 1, weight: "3.2", goodRice: 94.2, rejection: 3.8, foreignMatter: 0.2, completed: true },
  //       { sampleNumber: 2, weight: "3.0", goodRice: 93.8, rejection: 4.1, foreignMatter: 0.3, completed: true },
  //       { sampleNumber: 3, weight: "3.4", goodRice: 94.6, rejection: 3.5, foreignMatter: 0.2, completed: true }
  //     ],
  //     totalQuantity: 9.6,
  //     overallGoodRice: 94.2,
  //     overallRejection: 3.8,
  //     overallForeignMatter: 0.2,
  //     grainData: sampleGrainData
  //   },
  //   {
  //     id: "MAC002",
  //     name: "Paddy Sort I",
  //     date: "2025-02-05",
  //     sessionType: "machine",
  //     variety: "JASMINE",
  //     process: "Parboiled",
  //     samples: [
  //       { sampleNumber: 1, weight: "2.8", goodRice: 91.9, rejection: 6.2, foreignMatter: 0.7, completed: true },
  //       { sampleNumber: 2, weight: "3.1", goodRice: 92.3, rejection: 5.9, foreignMatter: 0.6, completed: true },
  //       { sampleNumber: 3, weight: "2.9", goodRice: 91.5, rejection: 6.5, foreignMatter: 0.8, completed: true }
  //     ],
  //     totalQuantity: 8.8,
  //     overallGoodRice: 91.9,
  //     overallRejection: 6.2,
  //     overallForeignMatter: 0.7,
  //     grainData: sampleGrainData
  //   }
  // ];

  // // Sample data for TMA sessions
  // const tmaSessions: ProcessData[] = [
  //   {
  //     id: "TMA001",
  //     name: "TMA Analysis - Complete Mill Run",
  //     date: "2025-01-22",
  //     sessionType: "tma",
  //     variety: "BASMATI",
  //     process: "Raw",
  //     samples: [
  //       { sampleNumber: 1, weight: "10.0", goodRice: 96.3, rejection: 2.9, foreignMatter: 0.2, completed: true },
  //       { sampleNumber: 2, weight: "9.8", goodRice: 95.9, rejection: 3.2, foreignMatter: 0.3, completed: true },
  //       { sampleNumber: 3, weight: "10.2", goodRice: 96.7, rejection: 2.6, foreignMatter: 0.1, completed: true }
  //     ],
  //     totalQuantity: 30.0,
  //     overallGoodRice: 96.3,
  //     overallRejection: 2.9,
  //     overallForeignMatter: 0.2,
  //     grainData: sampleGrainData
  //   },
  //   {
  //     id: "TMA002",
  //     name: "TMA Analysis - Multi-Machine Setup",
  //     date: "2025-03-12",
  //     sessionType: "tma",
  //     variety: "LONG_GRAIN",
  //     process: "Parboiled",
  //     samples: [
  //       { sampleNumber: 1, weight: "9.5", goodRice: 92.4, rejection: 5.5, foreignMatter: 0.6, completed: true },
  //       { sampleNumber: 2, weight: "10.1", goodRice: 92.8, rejection: 5.2, foreignMatter: 0.5, completed: true },
  //       { sampleNumber: 3, weight: "9.7", goodRice: 92.1, rejection: 5.8, foreignMatter: 0.7, completed: true }
  //     ],
  //     totalQuantity: 29.3,
  //     overallGoodRice: 92.4,
  //     overallRejection: 5.5,
  //     overallForeignMatter: 0.6,
  //     grainData: sampleGrainData
  //   }
  // ];

  // State for storing fetched process data
  const [processData, setProcessData] = useState<any[]>([]);

  // Transform API data to ProcessData format
  const transformApiDataToProcessData = (apiData: any[]): ProcessData[] => {
    console.log('🔍 [FRONTEND DEBUG] Transforming API data:', {
      apiDataLength: apiData.length,
      sampleApiData: apiData[0] || null
    });
    
    // Group by modeId to prevent duplicates
    // Multiple records with same modeId should be aggregated into one session
    const modeIdMap = new Map();
    
    apiData.forEach((item) => {
      const modeId = item.modeId || item.tmaId || 'unknown';
      
      if (!modeIdMap.has(modeId)) {
        // First occurrence of this modeId - initialize with first item
        const totalGrains = item.totalGrains || 0;
        const accepted = item.accepted || 0;
        const rejected = item.rejected || 0;
        // Use foreignMatter field from API (calculated from grains collection by GrainClass)
        // Fallback to brokens + chalky for backward compatibility
        const foreignMatter = item.foreignMatter !== undefined 
          ? item.foreignMatter 
          : (item.brokens || 0) + (item.chalky || 0);
        
        // Calculate percentages for this trailId
        const goodRicePct = totalGrains > 0 ? (accepted / totalGrains) * 100 : 0;
        const rejectionPct = totalGrains > 0 ? (rejected / totalGrains) * 100 : 0;
        const foreignMatterPct = totalGrains > 0 ? (foreignMatter / totalGrains) * 100 : 0;
        
        modeIdMap.set(modeId, {
          ...item,
          // Store individual percentages and count for averaging
          percentages: [
            {
              goodRice: goodRicePct,
              rejection: rejectionPct,
              foreignMatter: foreignMatterPct,
            }
          ],
          trialCount: 1,
          // Preserve binDryerNumber for batch mode
          binDryerNumber: item.binDryerNumber || undefined
        });
      } else {
        // Duplicate modeId - calculate percentages for this trial and add to list
        const existing = modeIdMap.get(modeId);
        const totalGrains = item.totalGrains || 0;
        const accepted = item.accepted || 0;
        const rejected = item.rejected || 0;
        // Use foreignMatter field from API (calculated from grains collection by GrainClass)
        // Fallback to brokens + chalky for backward compatibility
        const foreignMatter = item.foreignMatter !== undefined 
          ? item.foreignMatter 
          : (item.brokens || 0) + (item.chalky || 0);
        
        // Calculate percentages for this trailId
        const goodRicePct = totalGrains > 0 ? (accepted / totalGrains) * 100 : 0;
        const rejectionPct = totalGrains > 0 ? (rejected / totalGrains) * 100 : 0;
        const foreignMatterPct = totalGrains > 0 ? (foreignMatter / totalGrains) * 100 : 0;
        
        // Add to percentages list
        existing.percentages.push({
          goodRice: goodRicePct,
          rejection: rejectionPct,
          foreignMatter: foreignMatterPct,
        });
        existing.trialCount++;
        
        // Still aggregate raw counts for total weight display
        existing.totalGrains = (existing.totalGrains || 0) + (item.totalGrains || 0);
        existing.weight = (existing.weight || 0) + (item.weight || 0);
        
        // Update date if this item's date is more recent
        if (item.date && existing.date && item.date > existing.date) {
          existing.date = item.date;
        }
        
        // Preserve binDryerNumber if it exists and wasn't set before
        if (item.binDryerNumber && !existing.binDryerNumber) {
          existing.binDryerNumber = item.binDryerNumber;
        }
      }
    });
    
    let processedData = Array.from(modeIdMap.values());
    // Sort by date descending (newest first) so report order is correct
    processedData = processedData.sort((a, b) => {
      const timeA = new Date(a.date || 0).getTime();
      const timeB = new Date(b.date || 0).getTime();
      return timeB - timeA; // newest first
    });
    console.log('🔍 [FRONTEND DEBUG] After deduplication and sort:', {
      originalCount: apiData.length,
      deduplicatedCount: processedData.length
    });
    
    return processedData.map((item, index) => {
      console.log(`🔍 [FRONTEND DEBUG] Processing item ${index}:`, {
        originalDate: item.date,
        modeId: item.modeId,
        machineName: item.machineName,
        totalGrains: item.totalGrains,
        accepted: item.accepted,
        rejected: item.rejected,
        brokens: item.brokens,
        chalky: item.chalky,
        weight: item.weight,
        fullItem: item
      });
      
      // Debug: Log all available fields in the item to see what's actually there
      console.log(`🔍 [FRONTEND DEBUG] All fields in item ${index}:`, Object.keys(item));
      console.log(`🔍 [FRONTEND DEBUG] Item ${index} values:`, item);
      
      // Calculate percentages using the alternative approach: average of individual percentages
      let goodRicePercentage = 0;
      let rejectionPercentage = 0;
      let foreignMatterPercentage = 0;
      
      if (item.percentages && item.percentages.length > 0) {
        // Average the percentages across all trailIds
        const sumGoodRice = item.percentages.reduce((sum, p) => sum + p.goodRice, 0);
        const sumRejection = item.percentages.reduce((sum, p) => sum + p.rejection, 0);
        const sumForeignMatter = item.percentages.reduce((sum, p) => sum + p.foreignMatter, 0);
        const count = item.percentages.length;
        
        goodRicePercentage = sumGoodRice / count;
        rejectionPercentage = sumRejection / count;
        foreignMatterPercentage = sumForeignMatter / count;
        
        console.log(`🔍 [FRONTEND DEBUG] Averaged percentages across ${count} trials:`, {
          goodRicePercentage,
          rejectionPercentage,
          foreignMatterPercentage,
          individualPercentages: item.percentages
        });
      } else {
        // Fallback to aggregated calculation if percentages array doesn't exist
        const totalGrains = item.totalGrains || 0;
        const accepted = item.accepted || 0;
        const rejected = item.rejected || 0;
        // Use foreignMatter field from API (calculated from grains collection by GrainClass)
        // Fallback to brokens + chalky for backward compatibility
        const foreignMatter = item.foreignMatter !== undefined 
          ? item.foreignMatter 
          : (item.brokens || 0) + (item.chalky || 0);
        
        goodRicePercentage = totalGrains > 0 ? (accepted / totalGrains) * 100 : 0;
        rejectionPercentage = totalGrains > 0 ? (rejected / totalGrains) * 100 : 0;
        foreignMatterPercentage = totalGrains > 0 ? (foreignMatter / totalGrains) * 100 : 0;
      }
      
      console.log(`🔍 [FRONTEND DEBUG] Final calculated percentages for item ${index}:`, {
        goodRicePercentage,
        rejectionPercentage,
        foreignMatterPercentage,
        totalGrains: item.totalGrains,
        weight: item.weight,
        trials: item.trials
      });
      
      // Create sample data based on trials (Sample 1, 2, 3)
      // Production series may have many trialIds (one per machine×sample).
      // Group by actual sample number (last digit of trialNumber) so we show
      // at most 3 sample cards, not hundreds.
      const samples: SampleData[] = [];

      if (item.trials && item.trials.length > 0) {
        // Group trials by sample number (trialNumber).
        // For production series: trialId = modeId_M{machineIdx}_{sampleNum}
        // trialNumber is parsed from the last segment, so multiple machines
        // with the same sampleNum share the same trialNumber.
        const sampleBuckets = new Map<number, { accepted: number; rejected: number; foreignMatter: number; totalGrains: number; weight: number }>();

        for (const trial of item.trials) {
          const sampleNum = trial.trialNumber || 1;
          const existing = sampleBuckets.get(sampleNum);
          if (existing) {
            existing.accepted += trial.accepted || 0;
            existing.rejected += trial.rejected || 0;
            existing.foreignMatter += trial.foreignMatter || 0;
            existing.totalGrains += trial.totalGrains || 0;
            existing.weight += trial.weight || 0;
          } else {
            sampleBuckets.set(sampleNum, {
              accepted: trial.accepted || 0,
              rejected: trial.rejected || 0,
              foreignMatter: trial.foreignMatter || 0,
              totalGrains: trial.totalGrains || 0,
              weight: trial.weight || 0,
            });
          }
        }

        // Sort by sample number and create sample cards
        const sortedBuckets = [...sampleBuckets.entries()].sort((a, b) => a[0] - b[0]);

        sortedBuckets.forEach(([sampleNum, trial]) => {
          const trialTotalGrains = trial.totalGrains || 0;
          const trialAccepted = trial.accepted || 0;
          const trialRejected = trial.rejected || 0;
          const trialForeignMatter = trial.foreignMatter || 0;

          // Calculate percentages for this sample bucket
          const trialGoodRicePct = trialTotalGrains > 0 ? (trialAccepted / trialTotalGrains) * 100 : 0;
          const trialRejectionPct = trialTotalGrains > 0 ? (trialRejected / trialTotalGrains) * 100 : 0;
          const trialForeignMatterPct = trialTotalGrains > 0 ? (trialForeignMatter / trialTotalGrains) * 100 : 0;

          let finalWeight = trial.weight || 0;
          if (finalWeight === 0 && item.weight && sortedBuckets.length > 0) {
            finalWeight = item.weight / sortedBuckets.length;
          }
          
          samples.push({
            sampleNumber: sampleNum,
            weight: finalWeight > 0 ? finalWeight.toString() : '0',
            goodRice: trialGoodRicePct,
            rejection: trialRejectionPct,
            foreignMatter: trialForeignMatterPct,
            completed: true
          });
        });
      }
      
      // If no trial data, create single sample with overall percentages
      if (samples.length === 0) {
        samples.push({
          sampleNumber: 1,
          weight: (item.weight || item.totalGrains || 0).toString(),
          goodRice: goodRicePercentage,
          rejection: rejectionPercentage,
          foreignMatter: foreignMatterPercentage,
          completed: true
        });
      }

      return {
        id: `${item.modeId || item.tmaId || 'process'}_${index}_${item.date || 'unknown'}`,
        name: `${item.modeId || 'Process'}`,
        // Keep full date string for correct sort; display uses format(process.date) which handles both ISO and date-only
        date: item.date || new Date().toISOString(),
        sessionType: item.modeType === 'tma' ? 'production' : (item.modeType || getAnalysisTypeFromModeId(item.modeId || item.tmaId || '')),
        variety: item.variety ? item.variety.toUpperCase() : 'UNKNOWN',
        process: item.process || 'Raw', // Use process from API response, default to 'Raw' if not available
        samples,
        totalQuantity: item.weight,
        overallGoodRice: goodRicePercentage,
        overallRejection: rejectionPercentage,
        overallForeignMatter: foreignMatterPercentage,
        // grainData: sampleGrainData, // Using sample grain data for now
        machineName: item.machineName || undefined,
        binDryerNumber: item.binDryerNumber || undefined,
        modeType: item.modeType || undefined,
        operatorName: item.operatorName || undefined,
        analysisTime: item.analysisTime || undefined,
        enableChalky: item.enableChalky !== undefined ? item.enableChalky : true,
        season: item.season || undefined,
      };
    }).map((transformedItem, index) => {
      console.log(`🔍 [FRONTEND DEBUG] Transformed item ${index}:`, {
        id: transformedItem.id,
        name: transformedItem.name,
        date: transformedItem.date,
        originalApiDate: apiData[index]?.date
      });
      return transformedItem;
    });
  };

  // Update process data when API data changes
  useEffect(() => {
    const fetchAndTransformData = async () => {
      if (fromDate && toDate) {
        const apiData = await fetchProcessData();
        const transformedData = transformApiDataToProcessData(apiData);
        setProcessData(transformedData);
      }
    };
    
    fetchAndTransformData();
  }, [fromDate, toDate, selectedAnalysisTypes, selectedVarieties, selectedSeasons, machineFilter, productionMode]);

  // Show most recent report first: sort by date descending (newest first)
  const currentProcesses = useMemo(() => {
    return [...processData].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
      if (Number.isNaN(timeA)) return 1;
      if (Number.isNaN(timeB)) return -1;
      // Descending: larger date (more recent) first
      return timeB - timeA;
    });
  }, [processData]);

  const filteredProcesses = useMemo(() => {
    const selectedTypes = selectedAnalysisTypes;

    return currentProcesses.filter((process) => {
      if (selectedVarieties.length > 0 && !selectedVarieties.includes(process.variety)) {
        return false;
      }
      if (selectedSeasons.length > 0) {
        if (!process.season || !selectedSeasons.includes(process.season)) {
          return false;
        }
      }

      if (machineFilter !== 'all') {
        if (machineFilter.startsWith('series:')) {
          const selectedSeries = machineFilter.slice(7);
          if (!process.process.toLowerCase().includes(selectedSeries.toLowerCase())) {
            return false;
          }
        } else if (machineFilter.startsWith('machine:')) {
          const selectedMachine = machineFilter.slice(8);
          if (process.machineName !== selectedMachine) {
            return false;
          }
        }
      }

      const processType = process.modeType === 'tma' ? 'production' : (process.modeType || getAnalysisTypeFromModeId(process.id.split('_')[0]));
      if (!selectedTypes.includes(processType)) {
        return false;
      }

      return true;
    });
  }, [currentProcesses, selectedAnalysisTypes, selectedVarieties, selectedSeasons, machineFilter]);


  // Commented out quality status functionality
  // const getQualityStatus = (goodRice: number) => {
  //   if (goodRice >= 95) return { status: "Excellent", color: "text-green-600" };
  //   if (goodRice >= 90) return { status: "Good", color: "text-blue-600" };
  //   if (goodRice >= 85) return { status: "Average", color: "text-yellow-600" };
  //   return { status: "Poor", color: "text-red-600" };
  // };

  const selectedAnalysisType = selectedAnalysisTypes.length === 1 ? selectedAnalysisTypes[0] : 'all';

  const getReportTypeConfig = (type: string) => {
    switch (type) {
      case "procurement":
        return { icon: ShoppingCart, label: "Procurement Reports", description: "Procurement analysis reports", color: "text-emerald-600" };
      case "production":
        return { icon: Factory, label: "Production Reports", description: "Production analysis reports", color: "text-blue-600" };
      case "milled-rice":
        return { icon: Wheat, label: "Milled Rice Reports", description: "Milled rice quality reports", color: "text-amber-600" };
      case "all":
        return { icon: FileText, label: "All Reports", description: "All analysis reports", color: "text-gray-600" };
      default:
        return { icon: FileText, label: "All Reports", description: "All analysis reports", color: "text-gray-600" };
    }
  };

  const getSelectedReportSummary = () => {
    if (selectedAnalysisTypes.length === 0) {
      return { icon: FileText, label: "No Reports Selected", description: "Select at least one report type to view sessions.", color: "text-gray-600" };
    }
    if (selectedAnalysisTypes.length === 1) {
      return getReportTypeConfig(selectedAnalysisType);
    }
    return { icon: FileText, label: "Selected Reports", description: "Reports matching the selected categories.", color: "text-gray-600" };
  };

  // Determine analysis type from modeId prefix
  const getAnalysisTypeFromModeId = (modeId: string): string => {
    if (modeId.startsWith('PRT-')) return 'procurement';
    if (modeId.startsWith('PROD-')) return 'production';
    if (modeId.startsWith('MR-')) return 'milled-rice';
    if (modeId.startsWith('BAT-')) return 'procurement';
    if (modeId.startsWith('MACH-')) return 'production';
    if (modeId.startsWith('IND-')) return 'procurement';
    return 'procurement';
  };

  // Get the badge config for a process card based on modeId
  const getAnalysisBadge = (modeId: string, modeType?: string) => {
    const resolvedType = modeType === 'tma' ? 'production' : (modeType || getAnalysisTypeFromModeId(modeId));
    switch (resolvedType) {
      case 'procurement':
        return { label: 'Procurement', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', borderColor: 'border-emerald-200' };
      case 'production':
        return { label: 'Production', bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200' };
      case 'milled-rice':
        return { label: 'Milled Rice', bgColor: 'bg-amber-50', textColor: 'text-amber-700', borderColor: 'border-amber-200' };
      default:
        return { label: 'Analysis', bgColor: 'bg-gray-50', textColor: 'text-gray-700', borderColor: 'border-gray-200' };
    }
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setIsImageDialogOpen(true);
  };

  const handleViewDetailedGrains = (process: ProcessData) => {
    // Extract modeId and tmaId from the process ID
    const processIdParts = process.id.split('_');
    const modeId = processIdParts[0];
    const tmaId = processIdParts.length > 1 ? processIdParts[1] : undefined;
    
    // Map process to navigation mode
    const getModeFromProcess = () => {
      const isTma = process.modeType === 'tma';
      if (isTma) return 'TMA';
      if (modeId.startsWith('PROD-')) return 'Machine-wise';
      if (modeId.startsWith('MACH-')) return 'Machine-wise';
      if (modeId.startsWith('BAT-')) return 'Batch';
      return 'Individual';
    };

    const mode = getModeFromProcess();
    
    // Create URL parameters for navigation - only include essential parameters
    const params = new URLSearchParams({
      mode: mode,
      modeId: modeId,
    });
    
    // Add tmaId if it exists
    if (tmaId && (mode === 'TMA' || modeId.startsWith('tma-'))) {
      params.append('tmaId', tmaId);
    }
    
    // Navigate to GrainsViewer with parameters
    navigate(`/mongodb-viewer?${params.toString()}`);
  };

  const GrainDataDialog = ({ grainData }: { grainData: GrainData[] }) => (
    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-rice-primary">Detailed Grain Data</DialogTitle>
      </DialogHeader>
      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grain ID</TableHead>
              <TableHead>Grain Class</TableHead>
              <TableHead>Grain metrics</TableHead>
              <TableHead>Grain Image</TableHead>
              <TableHead>Chalky area (image)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grainData.map((grain) => (
              <TableRow key={grain.grainId}>
                <TableCell className="font-medium">{grain.grainId}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    grain.grainClass === 'headrice' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {grain.grainClass}
                  </span>
                </TableCell>
                <TableCell>
                  {Object.keys(grain.grainMetrics).length > 0 ? (
                    <div className="space-y-1 text-sm">
                      {grain.grainMetrics.length && (
                        <div>Length: <span className="font-semibold">{grain.grainMetrics.length}</span></div>
                      )}
                      {grain.grainMetrics.breadth && (
                        <div>Breadth: <span className="font-semibold">{grain.grainMetrics.breadth}</span></div>
                      )}
                      {grain.grainMetrics.grainArea && (
                        <div>Grain Area: <span className="font-semibold">{grain.grainMetrics.grainArea}</span></div>
                      )}
                      {grain.grainMetrics.chalkyArea && (
                        <div>Chalky Area: <span className="font-semibold">{grain.grainMetrics.chalkyArea}</span></div>
                      )}
                      {grain.grainMetrics.whitenessIndex && (
                        <div>Whiteness Index: <span className="font-semibold">{grain.grainMetrics.whitenessIndex}</span></div>
                      )}
                      {grain.grainMetrics.meanRed && (
                        <div>Mean Red: <span className="font-semibold">{grain.grainMetrics.meanRed}</span></div>
                      )}
                      {grain.grainMetrics.meanGreen && (
                        <div>Mean Green: <span className="font-semibold">{grain.grainMetrics.meanGreen}</span></div>
                      )}
                      {grain.grainMetrics.meanBlue && (
                        <div>Mean Blue: <span className="font-semibold">{grain.grainMetrics.meanBlue}</span></div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">No data available</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="relative">
                    <img 
                      src={grain.grainImage} 
                      alt={`Grain ${grain.grainId}`}
                      className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleImageClick(grain.grainImage)}
                    />
                    <button
                      onClick={() => handleImageClick(grain.grainImage)}
                      className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70 transition-all"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                  </div>
                </TableCell>
                <TableCell>
                  {grain.chalkyArea && grain.chalkyArea !== "No data available" ? (
                    <div className="relative">
                      <img 
                        src={grain.chalkyArea} 
                        alt={`Chalky area for ${grain.grainId}`}
                        className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleImageClick(grain.chalkyArea!)}
                      />
                      <button
                        onClick={() => handleImageClick(grain.chalkyArea!)}
                        className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70 transition-all"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">No data available</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DialogContent>
  );

  const ImageViewDialog = () => (
    <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Full Image View</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsImageDialogOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        {selectedImageUrl && (
          <div className="flex justify-center">
            <img 
              src={selectedImageUrl} 
              alt="Full view"
              className="max-w-full max-h-[70vh] object-contain rounded border"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader 
        title="Data Reports" 
        subtitle="Generate and download process-specific quality reports"
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Filters Section */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-rice-primary">
                <Filter className="w-5 h-5" />
                <span>Report Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Date Range */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-medium">From Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !fromDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {fromDate ? format(fromDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={fromDate}
                          onSelect={(date) => {
                            setFromDate(date);
                            if (toDate && date && toDate < date) {
                              setToDate(undefined);
                            }
                          }}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-medium">To Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !toDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {toDate ? format(toDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={toDate}
                          onSelect={setToDate}
                          initialFocus
                          disabled={(date) => fromDate ? date < fromDate : false}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Report Type — multi-select cards */}
                <div className="lg:col-span-2">
                  <Label className="font-medium mb-4 block">Report Type</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { value: 'procurement', label: 'Procurement', description: 'Procurement analysis reports', icon: ShoppingCart, color: 'text-emerald-600' },
                      { value: 'production', label: 'Production', description: 'Production analysis reports', icon: Factory, color: 'text-blue-600' },
                      { value: 'milled-rice', label: 'Milled Rice Quality', description: 'Milled rice quality reports', icon: Wheat, color: 'text-amber-600' },
                    ].map((item) => (
                      <label
                        key={item.value}
                        className={cn(
                          'flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors',
                          selectedAnalysisTypes.includes(item.value)
                            ? 'border-rice-primary bg-rice-primary/10'
                            : 'border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        <Checkbox
                          checked={selectedAnalysisTypes.includes(item.value)}
                          onCheckedChange={(checked) => {
                            const isChecked = Boolean(checked);
                            setSelectedAnalysisTypes((prev) => {
                              if (isChecked) {
                                return [...new Set([...prev, item.value])];
                              }
                              return prev.filter((type) => type !== item.value);
                            });
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <item.icon className={`w-5 h-5 ${item.color}`} />
                            <div className="font-semibold">{item.label}</div>
                          </div>
                          <div className="text-sm text-gray-600">{item.description}</div>
                        </div>
                      </label>
                    ))}

                    <div className="flex items-center space-x-3 p-4 border rounded-lg border-dashed opacity-50 pointer-events-none">
                      <div className="w-5 h-5 rounded-full border border-gray-300 bg-gray-100" />
                      <div>
                        <div className="font-semibold text-gray-400">Cooked Rice Quality</div>
                        <div className="text-sm text-gray-400">Coming Soon</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Filters: Variety + Season + Production Type/Machine (production only) + Clear */}
              <div className={`grid grid-cols-1 md:grid-cols-2 ${selectedAnalysisTypes.includes('production') ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4 mt-6 pt-4 border-t`}>
                <div className="space-y-2">
                  <Label className="font-medium text-sm">Variety</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-between text-left",
                          selectedVarieties.length === 0 && "text-muted-foreground"
                        )}
                      >
                        <span>
                          {selectedVarieties.length === 0
                            ? "All Varieties"
                            : `${selectedVarieties.length} selected`}
                        </span>
                        <span className="text-xs text-gray-400">▼</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full max-w-sm p-3">
                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Select varieties</div>
                        {filterOptions.varieties.map((v) => (
                          <label key={v} className="flex items-center gap-2 cursor-pointer text-sm">
                            <Checkbox
                              checked={selectedVarieties.includes(v)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedVarieties((prev) => [...prev, v]);
                                } else {
                                  setSelectedVarieties((prev) => prev.filter((item) => item !== v));
                                }
                              }}
                            />
                            <span>{v}</span>
                          </label>
                        ))}
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedVarieties([])}
                          >
                            Clear
                          </Button>
                          <span className="text-xs text-gray-500">Tap to select multiple</span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium text-sm">Season</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-between text-left",
                          selectedSeasons.length === 0 && "text-muted-foreground"
                        )}
                      >
                        <span>
                          {selectedSeasons.length === 0
                            ? "All Seasons"
                            : `${selectedSeasons.length} selected`}
                        </span>
                        <span className="text-xs text-gray-400">▼</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full max-w-sm p-3">
                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Select seasons</div>
                        {filterOptions.seasons.map((s) => (
                          <label key={s} className="flex items-center gap-2 cursor-pointer text-sm">
                            <Checkbox
                              checked={selectedSeasons.includes(s)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedSeasons((prev) => [...prev, s]);
                                } else {
                                  setSelectedSeasons((prev) => prev.filter((item) => item !== s));
                                }
                              }}
                            />
                            <span>{s}</span>
                          </label>
                        ))}
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSeasons([])}
                          >
                            Clear
                          </Button>
                          <span className="text-xs text-gray-500">Tap to select multiple</span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {selectedAnalysisTypes.includes('production') && (
                <div className="space-y-2">
                  <Label className="font-medium text-sm">Machine / Series</Label>
                  <Select
                    value={machineFilter}
                    onValueChange={(val) => {
                      setMachineFilter(val);
                      if (val === 'all') setProductionMode('all');
                      else if (val.startsWith('series:')) setProductionMode('series');
                      else setProductionMode('all'); // machine filter searches both series and single
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {lineNames.length > 0 && (
                        <>
                          <SelectItem value="__series_header" disabled className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Series</SelectItem>
                          {lineNames.map((name) => (
                            <SelectItem key={`series:${name}`} value={`series:${name}`}>{name}</SelectItem>
                          ))}
                        </>
                      )}
                      {lineMachines.length > 0 && (
                        <>
                          <SelectItem value="__machine_header" disabled className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Machines</SelectItem>
                          {lineMachines.map((m) => (
                            <SelectItem key={`machine:${m}`} value={`machine:${m}`}>{m}</SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                )}

                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-red-600 h-8 px-2"
                    onClick={() => {
                      setSelectedAnalysisTypes(["procurement", "production", "milled-rice"]);
                      setSelectedVarieties([]);
                      setSelectedSeasons([]);
                      setMachineFilter("all");
                      setProductionMode("all");
                      setFromDate(undefined);
                      setToDate(undefined);
                    }}
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Process List */}
          <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-rice-primary">
                {(() => {
                  const summary = getSelectedReportSummary();
                  const IconComponent = summary.icon;
                  return (
                    <>
                      <IconComponent className="w-6 h-6" />
                      <span>{summary.label}</span>
                    </>
                  );
                })()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {!fromDate || !toDate ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Please select both From and To dates to view available data</p>
                  </div>
                ) : isLoadingData ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rice-primary mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading process data...</p>
                  </div>
                ) : filteredProcesses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {selectedAnalysisTypes.length === 0 ? (
                      <p>No report types selected. Please choose at least one report type to view sessions.</p>
                    ) : fromDate && toDate ? (
                      <p>No reports found for the selected filters and date range ({format(fromDate, "MMM dd, yyyy")} - {format(toDate, "MMM dd, yyyy")}).</p>
                    ) : (
                      <p>No reports available. Select a date range to view sessions.</p>
                    )}
                  </div>
                ) : (
                  filteredProcesses.map((process) => {
                    // Commented out quality status
                    // const qualityInfo = getQualityStatus(process.overallGoodRice);
                    return (
                    <div key={process.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white overflow-hidden">
                      <div className="flex flex-col space-y-4">
                        {/* Header Section */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-xl">{process.name}</h3>
                              {(() => {
                                const badge = getAnalysisBadge(process.id.split('_')[0]);
                                return (
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badge.textColor} ${badge.bgColor} ${badge.borderColor}`}>
                                    {badge.label}
                                  </span>
                                );
                              })()}
                              {process.modeType === 'tma' && (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold border text-purple-700 bg-purple-50 border-purple-200">
                                  Series
                                </span>
                              )}
                              {process.id.split('_')[0].startsWith('PROD-') && process.modeType !== 'tma' && (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold border text-indigo-700 bg-indigo-50 border-indigo-200">
                                  Single Machine
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              <span>Date: {format(new Date(process.date), "PPP")}</span>
                              {process.analysisTime && (
                                <span>Time: <span className="font-semibold">{process.analysisTime}</span></span>
                              )}
                              {process.operatorName && (
                                <span>Operator: <span className="font-semibold">{process.operatorName}</span></span>
                              )}
                              {process.machineName && (
                                <span>Machine: <span className="font-semibold">{process.machineName}</span></span>
                              )}
                              {process.binDryerNumber && (
                                <span>Bin/Dryer Number: <span className="font-semibold">{process.binDryerNumber}</span></span>
                              )}
                              <span>Variety: {process.variety}</span>
                              <span>Process: {process.process}</span>
                              <span>Total Weight: {process.totalQuantity}g</span>
                            </div>
                          </div>
                          
                          <div className="lg:ml-6 flex flex-col gap-2">
                            {process.enableChalky && (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={detailedChalkyProcessIds.has(process.id)}
                                  onChange={(e) => {
                                    setDetailedChalkyProcessIds(prev => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(process.id);
                                      else next.delete(process.id);
                                      return next;
                                    });
                                  }}
                                  className="accent-rice-primary w-4 h-4"
                                />
                                <span className="text-sm text-gray-700">Detailed Chalky Classification</span>
                              </label>
                            )}
                            <div className="flex flex-row gap-2">
                            <Button
                              onClick={() => handleDownloadReport(process)}
                              disabled={isGenerating}
                              className="bg-rice-primary hover:bg-rice-primary/90 text-white px-6 py-2 disabled:opacity-50"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              {isGenerating ? 'Generating...' : 'Download Report'}
                            </Button>
                            <Button
                              variant="outline"
                              className="border-rice-primary text-rice-primary hover:bg-rice-primary hover:text-white px-6 py-2"
                              onClick={() => handleViewDetailedGrains(process)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Detailed Grain Data
                            </Button>
                            </div>
                          </div>
                        </div>

                        {/* Overall Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-green-50 p-4 rounded-lg">
                            <div className="text-green-600 font-semibold">Overall Rice</div>
                            <div className="text-2xl font-bold text-green-700">{process.overallGoodRice.toFixed(1)}%</div>
                          </div>
                          <div className="bg-red-50 p-4 rounded-lg">
                            <div className="text-red-600 font-semibold">Overall Rejection</div>
                            <div className="text-2xl font-bold text-red-700">{process.overallRejection.toFixed(1)}%</div>
                          </div>
                          <div className="bg-yellow-50 p-4 rounded-lg">
                            <div className="text-yellow-600 font-semibold">Overall Foreign Matter</div>
                            <div className="text-2xl font-bold text-yellow-700">{process.overallForeignMatter.toFixed(1)}%</div>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Image View Dialog */}
      <ImageViewDialog />
    </div>
  );
};

export default DataReports;
