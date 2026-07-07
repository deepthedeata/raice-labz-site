import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { getMachineImageSrc } from "@/lib/machineImages";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Factory,
  ClipboardList,
  Zap,
  BarChart3,
  CheckCircle,
  CheckCircle2,
  Circle,
  Wheat,
  Settings,
  MapPin,
  ChevronsUpDown,
  Layers,
  Loader2,
  LogOut,
  Activity,
  Download,
  Play,
  LayoutDashboard,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import ProcurementLiveAnalysis from "./ProcurementLiveAnalysis";
import { buildReportFilename } from "@/lib/reportFilename";
import { useAnalysis } from "@/contexts/AnalysisContext";

const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

const RICE_MILL_STORAGE_KEYS = {
  operatorName: "riceMill_operatorName",
  location: "riceMill_location",
  millName: "riceMill_millName",
} as const;

/* ── Whiteness Index classification helpers ────────────────────────── */
const DEFAULT_WI_GRADES = [
  { label: "Super White", color: "#f0f0f0", min: 36, max: 46 },
  { label: "White", color: "#e8e8e8", min: 32, max: 36 },
  { label: "Cream", color: "#f5f0e0", min: 28, max: 32 },
  { label: "Lemon", color: "#f0e68c", min: 25, max: 28 },
  { label: "Amber Yellow", color: "#d4a843", min: 22, max: 25 },
  { label: "Golden", color: "#c8960c", min: 18, max: 22 },
];

function getWiGradeLabel(wi: number): string {
  for (const g of DEFAULT_WI_GRADES) {
    if (wi >= g.min && wi < g.max) return g.label;
  }
  if (wi >= 46) return "Super White";
  if (wi < 18) return "Below Golden";
  return "\u2014";
}

function getWiGradeColor(wi: number): string {
  for (const g of DEFAULT_WI_GRADES) {
    if (wi >= g.min && wi < g.max) return g.color === "#f0f0f0" || g.color === "#e8e8e8" ? "#374151" : "#92400e";
  }
  return "#374151";
}

const INDIAN_CITIES = [
  "Bangalore, Karnataka", "Mumbai, Maharashtra", "Delhi, Delhi", "Chennai, Tamil Nadu",
  "Kolkata, West Bengal", "Hyderabad, Telangana", "Pune, Maharashtra", "Ahmedabad, Gujarat",
  "Jaipur, Rajasthan", "Surat, Gujarat", "Lucknow, Uttar Pradesh", "Kanpur, Uttar Pradesh",
  "Nagpur, Maharashtra", "Thiruvananthapuram, Kerala", "Bhopal, Madhya Pradesh", "Visakhapatnam, Andhra Pradesh",
  "Patna, Bihar", "Vadodara, Gujarat", "Ghaziabad, Uttar Pradesh", "Ludhiana, Punjab",
  "Agra, Uttar Pradesh", "Nashik, Maharashtra", "Faridabad, Haryana", "Meerut, Uttar Pradesh",
  "Rajkot, Gujarat", "Amritsar, Punjab", "Jodhpur, Rajasthan", "Indore, Madhya Pradesh",
  "Raipur, Chhattisgarh", "Kota, Rajasthan", "Madurai, Tamil Nadu", "Varanasi, Uttar Pradesh",
  "Bhubaneswar, Odisha", "Srinagar, Jammu and Kashmir", "Chandigarh, Chandigarh",
  "Coimbatore, Tamil Nadu", "Kochi, Kerala", "Mysore, Karnataka", "Guwahati, Assam",
  "Dehradun, Uttarakhand", "Ranchi, Jharkhand", "Jamshedpur, Jharkhand", "Tirupati, Andhra Pradesh",
];

const DEFAULT_MACHINES: string[] = [];

// ── Types for Step 3 (Insights & Reports) ──────────────────────────────
interface GrainMetrics {
  goodRice: {
    headRice: number;
    threeFourthHead: number;
    halfBrokens: number;
    quarterFineBrokens: number;
    tips: number;
    // Basmati region categories
    secondOne?: number;
    tibar?: number;
    dubar?: number;
    miniDubar?: number;
    mongra?: number;
    miniMongra?: number;
    nakku?: number;
    [key: string]: number | undefined;
  };
  rejections: {
    chalky: number;
    discolored: number;
    immature: number;
    [key: string]: number;
  };
  foreignMatter: {
    total: number;
    [key: string]: number;
  };
  totalGrains: number;
}

interface TrialData {
  trialId: string;
  trialNumber: number;
  sessionStatus: string;
  GrainMetrics: GrainMetrics;
}

interface DimensionStat {
  mean: number | null;
  mode: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  std: number | null;
}

interface DimensionGroup {
  length_mm: DimensionStat;
  width_mm: DimensionStat;
  aspect_ratio: DimensionStat;
}

interface TrialDimensionStats {
  trialNumber: number;
  grainCount: number;
  dimensions: DimensionGroup;
  headRiceDimensions: { length_mm: { mean: number | null; median: number | null }; width_mm: { mean: number | null; median: number | null }; aspect_ratio: { mean: number | null; median: number | null } };
  averageWhitenessIndex?: number;
}

interface DimensionStatsResponse {
  modeId: string;
  totalGrains: number;
  trialStats: Record<string, TrialDimensionStats>;
  overallStats: {
    grainCount: number;
    dimensions: DimensionGroup;
    headRiceDimensions: { length_mm: { mean: number | null; median: number | null }; width_mm: { mean: number | null; median: number | null }; aspect_ratio: { mean: number | null; median: number | null } };
    averageWhitenessIndex?: number;
  };
}

interface OutputParams {
  headRicePct: number;
  brokenRicePct: number;
  whitenessIndex: number;
  discolouredPct: number;
  immaturePct: number;
  chalkyPct: number;
  foreignMatterPct: number;
  totalGrains: number;
}

interface MachineReportData {
  machineName: string;
  machineIndex: number;
  status: string;
  trials: TrialData[];
  aggregatedMetrics: GrainMetrics;
}

interface DetailedSeriesReport {
  modeId: string;
  machines: MachineReportData[];
  overallAggregated: GrainMetrics;
}

// Segmentation config category groups (from mode document)
interface SegGroupConfig {
  headRiceKeys: string[];  // goodRice sub-keys in headRice group
  brokensKeys: string[];   // goodRice sub-keys in brokens group
}

// Config key -> GrainMetrics goodRice key mapping
const SEG_KEY_TO_METRICS: Record<string, string> = {
  head_rice: 'headRice',
  three_quarter_head_rice: 'threeFourthHead',
  broken: 'halfBrokens',
  fine_broken: 'quarterFineBrokens',
  tip: 'tips',
  second_one: 'secondOne',
  tibar: 'tibar',
  dubar: 'dubar',
  mini_dubar: 'miniDubar',
  mongra: 'mongra',
  mini_mongra: 'miniMongra',
  nakku: 'nakku',
};

function computeOutputParams(metrics: GrainMetrics, whitenessIndex?: number, segGroups?: SegGroupConfig | null): OutputParams {
  const total = metrics.totalGrains || 1;
  const gr = metrics.goodRice || {} as GrainMetrics["goodRice"];
  const rej = metrics.rejections || {} as GrainMetrics["rejections"];
  const fm = metrics.foreignMatter || {} as GrainMetrics["foreignMatter"];

  let headRice: number;
  let broken: number;

  if (segGroups && segGroups.headRiceKeys.length > 0) {
    // Use segmentationConfig groups
    headRice = segGroups.headRiceKeys.reduce((sum, k) => sum + (gr[k] || 0), 0);
    broken = segGroups.brokensKeys.reduce((sum, k) => sum + (gr[k] || 0), 0);
  } else {
    // Detect basmati keys presence to auto-select fallback
    const hasBasmati = (gr.secondOne || 0) + (gr.tibar || 0) + (gr.dubar || 0) + (gr.miniDubar || 0) + (gr.mongra || 0) + (gr.miniMongra || 0) + (gr.nakku || 0) > 0;
    if (hasBasmati) {
      // Basmati fallback
      headRice = (gr.headRice || 0) + (gr.secondOne || 0) + (gr.tibar || 0);
      broken = (gr.dubar || 0) + (gr.miniDubar || 0) + (gr.mongra || 0) + (gr.miniMongra || 0) + (gr.nakku || 0);
    } else {
      // Non-basmati fallback
      headRice = (gr.headRice || 0) + (gr.threeFourthHead || 0);
      broken = (gr.halfBrokens || 0) + (gr.quarterFineBrokens || 0) + (gr.tips || 0);
    }
  }

  return {
    headRicePct: +((headRice / total) * 100).toFixed(1),
    brokenRicePct: +((broken / total) * 100).toFixed(1),
    whitenessIndex: whitenessIndex || 0,
    discolouredPct: +(((rej.discolored || 0) / total) * 100).toFixed(1),
    immaturePct: +(((rej.immature || 0) / total) * 100).toFixed(1),
    chalkyPct: +(((rej.chalky || 0) / total) * 100).toFixed(1),
    foreignMatterPct: +(((fm.total || 0) / total) * 100).toFixed(1),
    totalGrains: metrics.totalGrains || 0,
  };
}

function averageMetrics(trials: TrialData[]): GrainMetrics {
  const completed = trials.filter((t) => t.sessionStatus === "completed" || t.GrainMetrics);
  if (completed.length === 0) {
    return { goodRice: { headRice: 0, threeFourthHead: 0, halfBrokens: 0, quarterFineBrokens: 0, tips: 0 }, rejections: { chalky: 0, discolored: 0, immature: 0 }, foreignMatter: { total: 0 }, totalGrains: 0 };
  }
  const n = completed.length;
  const avg = (key: string[]) => {
    const sum = completed.reduce((s, t) => {
      let val: unknown = t.GrainMetrics;
      for (const k of key) val = (val as Record<string, unknown>)?.[k] ?? 0;
      return s + (val as number);
    }, 0);
    return Math.round(sum / n);
  };
  return {
    goodRice: {
      headRice: avg(["goodRice", "headRice"]),
      threeFourthHead: avg(["goodRice", "threeFourthHead"]),
      halfBrokens: avg(["goodRice", "halfBrokens"]),
      quarterFineBrokens: avg(["goodRice", "quarterFineBrokens"]),
      tips: avg(["goodRice", "tips"]),
      // Basmati region categories (will be 0 for Non-Basmati data)
      secondOne: avg(["goodRice", "secondOne"]),
      tibar: avg(["goodRice", "tibar"]),
      dubar: avg(["goodRice", "dubar"]),
      miniDubar: avg(["goodRice", "miniDubar"]),
      mongra: avg(["goodRice", "mongra"]),
      miniMongra: avg(["goodRice", "miniMongra"]),
      nakku: avg(["goodRice", "nakku"]),
    },
    rejections: {
      chalky: avg(["rejections", "chalky"]),
      discolored: avg(["rejections", "discolored"]),
      immature: avg(["rejections", "immature"]),
    },
    foreignMatter: {
      total: avg(["foreignMatter", "total"]),
    },
    totalGrains: Math.round(completed.reduce((s, t) => s + (t.GrainMetrics?.totalGrains || 0), 0) / n),
  };
}

type LineConfig = { id: string; name: string; output: string; machines: string[] };

interface MachineAnalysis {
  machineName: string;
  machineIndex: number;
  machineId: string;
  analysis_ids: string[];
  trial_ids: string[];
}

type StepId = "preparation" | "live" | "reports";

interface StepState {
  preparation: boolean;
  live: boolean;
  reports: boolean;
}

const BASMATI_PROCESSES = ["Golden Sella", "White Sella", "Lemon Sella", "SW Sella", "Cream Steam", "Lemon Steam", "Parboiled"];

const ProductionAnalysis = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setSeriesExecutionLocked, hasStartedAnalysis } = useAnalysis();
  const [category, setCategory] = useState<"basmati" | "non-basmati">("non-basmati");
  const categoryLabel = category === "basmati" ? "Basmati" : "Non-Basmati";
  const [activeStep, setActiveStep] = useState<StepId>("preparation");
  const [completedSteps, setCompletedSteps] = useState<StepState>({
    preparation: false,
    live: false,
    reports: false,
  });

  // Series / Line selection
  const [lines, setLines] = useState<LineConfig[]>([]);
  const [selectedSeries, setSelectedSeries] = useState(""); // "" = No Series
  const [completedSeries, setCompletedSeries] = useState<string[]>([]);
  const [quitSeries, setQuitSeries] = useState<string[]>([]);
  const [completedSeriesLoading, setCompletedSeriesLoading] = useState(false);

  // Series execution state
  const [isSeriesMode, setIsSeriesMode] = useState(false);
  const [seriesModeId, setSeriesModeId] = useState("");
  const [machineAnalyses, setMachineAnalyses] = useState<MachineAnalysis[]>([]);
  const [completedSeriesMachines, setCompletedSeriesMachines] = useState<string[]>([]);
  const [seriesReportData, setSeriesReportData] = useState<any>(null);

  const [showPostMachineDialog, setShowPostMachineDialog] = useState(false);
  const [justCompletedMachine, setJustCompletedMachine] = useState("");
  const [seriesWasQuit, setSeriesWasQuit] = useState(false);
  const [quittingSeries, setQuittingSeries] = useState(false);

  // Reports data
  const [seriesReport, setSeriesReport] = useState<any>(null);
  const [detailedReport, setDetailedReport] = useState<DetailedSeriesReport | null>(null);
  const [reportTrials, setReportTrials] = useState<TrialData[]>([]);
  const [dimensionStats, setDimensionStats] = useState<DimensionStatsResponse | null>(null);
  const [segGroups, setSegGroups] = useState<SegGroupConfig | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [activeMachineTab, setActiveMachineTab] = useState<string>("0");
  const [activeTrialTab, setActiveTrialTab] = useState<string>("average");
  const [trialVideos, setTrialVideos] = useState<Record<string, boolean>>({});
  const [machineVideos, setMachineVideos] = useState<Record<string, Record<string, boolean>>>({});
  const [showReplay, setShowReplay] = useState(false);

  // Machine selection
  const [machines, setMachines] = useState<string[]>(DEFAULT_MACHINES);
  const [selectedMachine, setSelectedMachine] = useState("");
  const [machinesLoading, setMachinesLoading] = useState(false);

  // Derived: machines filtered by selected series
  const displayedMachines = selectedSeries
    ? (lines.find((l) => l.name === selectedSeries)?.machines ?? [])
    : machines;

  const [millRegion] = useState<string>(() => localStorage.getItem("riceMill_region") ?? "non-basmati");

  // Test info (same as Procurement)
  const [operatorName, setOperatorName] = useState(
    () => localStorage.getItem(RICE_MILL_STORAGE_KEYS.operatorName) ?? ""
  );
  const [riceMill, setRiceMill] = useState(
    () => localStorage.getItem(RICE_MILL_STORAGE_KEYS.millName) ?? ""
  );
  const [location, setLocation] = useState(
    () => localStorage.getItem(RICE_MILL_STORAGE_KEYS.location) ?? ""
  );
  const [locationSearchOpen, setLocationSearchOpen] = useState(false);
  const [locationSearchText, setLocationSearchText] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [saving, setSaving] = useState(false);

  // Grain Information
  const [variety, setVariety] = useState("");
  const [varietiesFromDb, setVarietiesFromDb] = useState<string[]>([]);
  const [varietiesLoading, setVarietiesLoading] = useState(false);
  const [process, setProcess] = useState("");
  const [processesForVariety, setProcessesForVariety] = useState<string[]>([]);
  const [processesLoading, setProcessesLoading] = useState(false);
  const [harvestSeason, setHarvestSeason] = useState("");
  const [harvestSeasonsFromDb, setHarvestSeasonsFromDb] = useState<string[]>([]);
  const [harvestSeasonsLoading, setHarvestSeasonsLoading] = useState(false);
  const [month, setMonth] = useState("");
  const [monthsFromDb, setMonthsFromDb] = useState<string[]>([]);
  const [monthsLoading, setMonthsLoading] = useState(false);
  const [noOfSamples, setNoOfSamples] = useState("1");
  const [samplingMethod, setSamplingMethod] = useState("");
  const [sampleMode, setSampleMode] = useState<"weight" | "count">(() => {
    const storedMode = sessionStorage.getItem("production_sample_size_mode");
    return storedMode === "count" ? "count" : "weight";
  });
  const [sampleWeight, setSampleWeight] = useState(() => {
    const storedMode = sessionStorage.getItem("production_sample_size_mode");
    const storedWeight = sessionStorage.getItem("production_sample_weight");
    if (storedWeight && storedWeight.trim()) {
      return storedMode === "count" ? `${storedWeight} grains` : `${storedWeight} grams`;
    }
    return "50 grams";
  });
  const [freeWeightInput, setFreeWeightInput] = useState("");

  // Analysis Parameters — chalky defaults based on series mode
  const [enableChalky, setEnableChalky] = useState(false);
  const [enableDiscolored, setEnableDiscolored] = useState(true);
  const [chalkyThreshold, setChalkyThreshold] = useState("20");
  const [includeDetailedChalky, setIncludeDetailedChalky] = useState(false);

  // ID Generation
  const [idGeneration, setIdGeneration] = useState<"auto" | "custom">("auto");
  const [customId, setCustomId] = useState("");

  const handleSeriesChange = (value: string) => {
    const seriesName = value === "__no_series__" ? "" : value;
    setSelectedSeries(seriesName);
    setIsSeriesMode(seriesName !== "");
    setEnableChalky(seriesName !== ""); // Series/TMA: chalky ON, single machine: OFF
    // Reset all series execution state for fresh start
    setCompletedSeriesMachines([]);
    setSeriesModeId("");
    setMachineAnalyses([]);
    setSeriesWasQuit(false);
    setShowPostMachineDialog(false);
    setJustCompletedMachine("");
    // Clear stored series mode id so a new mode gets created
    sessionStorage.removeItem("production_series_mode_id");
    sessionStorage.removeItem("production_machine_analyses");

    // In series mode, auto-set the first machine; in single mode, clear selection
    if (seriesName) {
      const seriesLine = lines.find((l) => l.name === seriesName);
      const firstMachine = seriesLine?.machines?.[0] || "";
      setSelectedMachine(firstMachine);
    } else {
      setSelectedMachine("");
    }
  };

  const handleIdGenerationChange = (value: "auto" | "custom") => {
    setIdGeneration(value);
    if (value === "auto") {
      setCustomId("");
    }
  };

  const handleLocationOpenChange = useCallback((open: boolean) => {
    setLocationSearchOpen(open);
    if (open) setLocationSearchText(location);
  }, [location]);

  const handleLocationCommit = useCallback(() => {
    const trimmed = locationSearchText.trim();
    if (!trimmed) return;
    setLocation(trimmed);
    setLocationSearchOpen(false);
  }, [locationSearchText]);

  // Set date and time on mount
  useEffect(() => {
    const now = new Date();
    const dateFormatter = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Kolkata",
    });
    const timeFormatter = new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Kolkata",
    });
    setCurrentDate(dateFormatter.format(now));
    setCurrentTime(timeFormatter.format(now));

    // Clear stale mode_id from previous analyses on fresh mount
    // This ensures sample 1 of a new analysis always creates a new mode
    // mode_id is re-set during step 1 (ProcurementLiveAnalysis) when the mode is created
    sessionStorage.removeItem("mode_id");
    sessionStorage.removeItem("pending_analysis_config");
  }, []);

  // Load machines + lines from rice-mill settings
  useEffect(() => {
    let cancelled = false;
    const loadMachines = async () => {
      setMachinesLoading(true);
      try {
        const response = await fetch("/api/raice_labz/settings/rice-mill");
        if (cancelled || !response.ok) return;
        const data = await response.json();
        if (cancelled || data.status !== "success" || !data.settings) return;
        const s = data.settings;
        // Store lines for series selection
        const normalizedLines: LineConfig[] = [];
        if (Array.isArray(s.lines)) {
          for (const l of s.lines) {
            if (!l || (!l.id && !l.name)) continue;
            normalizedLines.push({
              id: l.id ?? "",
              name: l.name ?? "",
              output: l.output ?? "",
              machines: Array.isArray(l.machines)
                ? l.machines.map((m: any) => {
                    if (typeof m === "string") return m;
                    const name = m?.name ?? String(m);
                    const num = m?.machineNumber;
                    return num ? `${name} ${num}` : name;
                  })
                : [],
            });
          }
          setLines(normalizedLines);
        }

        // Build machine list: only from series lines (machines configured in the mill)
        const allMachines = new Set<string>();
        for (const line of normalizedLines) {
          for (const m of line.machines) {
            if (m) allMachines.add(m);
          }
        }
        if (allMachines.size > 0) {
          setMachines(Array.from(allMachines));
        }
        if (s.operatorName) {
          setOperatorName(s.operatorName);
          localStorage.setItem(RICE_MILL_STORAGE_KEYS.operatorName, s.operatorName);
        }
        if (s.riceMillName) {
          setRiceMill(s.riceMillName);
          localStorage.setItem(RICE_MILL_STORAGE_KEYS.millName, s.riceMillName);
        }
        if (s.location) {
          setLocation(s.location);
          localStorage.setItem(RICE_MILL_STORAGE_KEYS.location, s.location);
        }
        const region = s.region || "non-basmati";
        setCategory(region as "basmati" | "non-basmati");
      } catch (e) {
        if (!cancelled) console.error("Failed to fetch rice mill settings:", e);
      } finally {
        if (!cancelled) setMachinesLoading(false);
      }
    };
    loadMachines();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load completed series (to disable already-processed series)
  useEffect(() => {
    let cancelled = false;
    const loadCompletedSeries = async () => {
      setCompletedSeriesLoading(true);
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/raice_labz/modes/production/completed-series`
        );
        if (cancelled || !response.ok) return;
        const data = await response.json();
        if (data.status === "success") {
          if (Array.isArray(data.completedSeries)) setCompletedSeries(data.completedSeries);
          if (Array.isArray(data.quitSeries)) setQuitSeries(data.quitSeries);
        }
      } catch (e) {
        if (!cancelled) console.error("Failed to fetch completed series:", e);
      } finally {
        if (!cancelled) setCompletedSeriesLoading(false);
      }
    };
    loadCompletedSeries();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load varieties from DB
  useEffect(() => {
    let cancelled = false;
    const loadVarieties = async () => {
      setVarietiesLoading(true);
      try {
        const response = await fetch("/api/raice_labz/grain-info/varieties");
        if (cancelled) return;
        const data = await response.json();
        if (data.status === "success" && Array.isArray(data.varieties)) {
          setVarietiesFromDb(data.varieties);
          setVariety((prev) => {
            if (!prev?.trim()) return prev;
            const match = data.varieties.find(
              (v: string) => v.toLowerCase() === prev.trim().toLowerCase()
            );
            return match ?? prev;
          });
        }
      } catch (e) {
        if (!cancelled) console.error("Failed to fetch varieties:", e);
      } finally {
        if (!cancelled) setVarietiesLoading(false);
      }
    };
    loadVarieties();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load processes when variety changes
  useEffect(() => {
    if (!variety.trim()) {
      setProcessesForVariety([]);
      setProcess("");
      return;
    }
    let cancelled = false;
    setProcess("");
    setProcessesLoading(true);
    const loadProcesses = async () => {
      try {
        const response = await fetch(
          `/api/raice_labz/grain-info/variety/${encodeURIComponent(variety)}/processes`
        );
        if (cancelled) return;
        const data = await response.json();
        if (data.status === "success" && Array.isArray(data.processes) && data.processes.length > 0) {
          setProcessesForVariety(data.processes);
          if (data.processes.length === 1) {
            setProcess(data.processes[0]);
          } else {
            setProcess((prev) => {
              if (!prev?.trim()) return prev;
              const match = data.processes.find(
                (p: string) => p.toLowerCase() === prev.trim().toLowerCase()
              );
              return match ?? prev;
            });
          }
        } else {
          setProcessesForVariety(millRegion === "basmati" ? BASMATI_PROCESSES : []);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to fetch processes for variety:", e);
          setProcessesForVariety(millRegion === "basmati" ? BASMATI_PROCESSES : []);
        }
      } finally {
        if (!cancelled) setProcessesLoading(false);
      }
    };
    loadProcesses();
    return () => {
      cancelled = true;
    };
  }, [variety, millRegion]);

  // Load harvest seasons when variety + process change
  useEffect(() => {
    if (!variety.trim() || !process.trim()) {
      setHarvestSeasonsFromDb([]);
      setHarvestSeason("");
      return;
    }
    let cancelled = false;
    setHarvestSeason("");
    setHarvestSeasonsLoading(true);
    const loadHarvestSeasons = async () => {
      try {
        const response = await fetch(
          `/api/raice_labz/grain-info/variety/${encodeURIComponent(variety)}/process/${encodeURIComponent(process)}/harvest-seasons`
        );
        if (cancelled) return;
        const data = await response.json();
        if (data.status === "success" && Array.isArray(data.harvestSeasons)) {
          setHarvestSeasonsFromDb(data.harvestSeasons);
          if (data.harvestSeasons.length === 1) {
            setHarvestSeason(data.harvestSeasons[0]);
          } else {
            setHarvestSeason((prev) => {
              if (!prev?.trim()) return prev;
              const match = data.harvestSeasons.find(
                (s: string) => s.toLowerCase() === prev.trim().toLowerCase()
              );
              return match ?? prev;
            });
          }
        } else {
          setHarvestSeasonsFromDb([]);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to fetch harvest seasons:", e);
          setHarvestSeasonsFromDb([]);
        }
      } finally {
        if (!cancelled) setHarvestSeasonsLoading(false);
      }
    };
    loadHarvestSeasons();
    return () => {
      cancelled = true;
    };
  }, [variety, process]);

  // Load months when variety + process + harvestSeason change
  useEffect(() => {
    if (!variety.trim() || !process.trim() || !harvestSeason.trim()) {
      setMonthsFromDb([]);
      setMonth("");
      return;
    }
    let cancelled = false;
    setMonth("");
    setMonthsLoading(true);
    const loadMonths = async () => {
      try {
        const url = `/api/raice_labz/grain-info/variety/${encodeURIComponent(variety)}/process/${encodeURIComponent(process)}/harvest-season/${encodeURIComponent(harvestSeason)}/months`;
        const response = await fetch(url);
        if (cancelled) return;
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (!cancelled) console.error("Months API error:", response.status, data);
          setMonthsFromDb([]);
          return;
        }
        if (data.status === "success" && Array.isArray(data.months)) {
          setMonthsFromDb(data.months);
          if (data.months.length === 1) {
            setMonth(data.months[0]);
          } else {
            setMonth((prev) => {
              if (!prev?.trim()) return prev;
              const match = data.months.find(
                (m: string) => m.toLowerCase() === prev.trim().toLowerCase()
              );
              return match ?? prev;
            });
          }
        } else {
          setMonthsFromDb([]);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to fetch months:", e);
          setMonthsFromDb([]);
        }
      } finally {
        if (!cancelled) setMonthsLoading(false);
      }
    };
    loadMonths();
    return () => {
      cancelled = true;
    };
  }, [variety, process, harvestSeason]);

  // Sync selected values to title-case from API options
  useEffect(() => {
    if (varietiesFromDb.length > 0 && variety?.trim()) {
      const match = varietiesFromDb.find(
        (v) => v.toLowerCase() === variety.trim().toLowerCase()
      );
      if (match && match !== variety) setVariety(match);
    }
  }, [varietiesFromDb, variety]);
  useEffect(() => {
    if (processesForVariety.length > 0 && process?.trim()) {
      const match = processesForVariety.find(
        (p) => p.toLowerCase() === process.trim().toLowerCase()
      );
      if (match && match !== process) setProcess(match);
    }
  }, [processesForVariety, process]);
  useEffect(() => {
    if (harvestSeasonsFromDb.length > 0 && harvestSeason?.trim()) {
      const match = harvestSeasonsFromDb.find(
        (s) => s.toLowerCase() === harvestSeason.trim().toLowerCase()
      );
      if (match && match !== harvestSeason) setHarvestSeason(match);
    }
  }, [harvestSeasonsFromDb, harvestSeason]);
  useEffect(() => {
    if (monthsFromDb.length > 0 && month?.trim()) {
      const match = monthsFromDb.find(
        (m) => m.toLowerCase() === month.trim().toLowerCase()
      );
      if (match && match !== month) setMonth(match);
    }
  }, [monthsFromDb, month]);

  // Fetch report data when reports tab is active (with retry for metrics flush delay)
  const reportPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (activeStep !== "reports") return;
    const modeId = seriesModeId || sessionStorage.getItem("production_series_mode_id") || sessionStorage.getItem("mode_id");
    if (!modeId) return;

    let cancelled = false;
    let retryCount = 0;
    const MAX_RETRIES = 6; // 6 retries x 5s = 30s max wait for metrics flush
    const RETRY_INTERVAL = 5000;

    const fetchData = async (isRetry = false) => {
      if (!isRetry) setReportLoading(true);
      try {
        // Fetch mode segmentationConfig for headRice/brokens grouping
        try {
          const modeRes = await fetch(`${BACKEND_URL}/api/raice_labz/modes/${modeId}`);
          if (!cancelled && modeRes.ok) {
            const modeJson = await modeRes.json();
            const modeDoc = modeJson.status === "success" ? (modeJson.data || modeJson.mode) : modeJson;
            const cats = modeDoc?.segmentationConfig?.categories || [];
            if (Array.isArray(cats) && cats.length > 0) {
              const hrKeys: string[] = [];
              const brKeys: string[] = [];
              for (const c of cats) {
                const metricsKey = SEG_KEY_TO_METRICS[c.key] || c.key?.replace(/_/g, '');
                if (metricsKey) {
                  if (c.group === 'headRice') hrKeys.push(metricsKey);
                  else if (c.group === 'brokens') brKeys.push(metricsKey);
                }
              }
              if (hrKeys.length > 0 || brKeys.length > 0) {
                setSegGroups({ headRiceKeys: hrKeys, brokensKeys: brKeys });
              }
            }
          }
        } catch (e) {
          console.warn("Failed to fetch mode segmentationConfig:", e);
        }

        if (isSeriesMode) {
          // Series mode: fetch detailed report (per-machine per-trial) + dimension stats
          const [detailedRes, statsRes] = await Promise.all([
            fetch(`${BACKEND_URL}/api/raice_labz/modes/${modeId}/series-detailed-report`),
            fetch(`${BACKEND_URL}/api/raice_labz/grains/mode/${modeId}/statistics`),
          ]);
          if (cancelled) return;

          const detailedJson = await detailedRes.json();
          if (detailedJson.status === "success") {
            setDetailedReport(detailedJson as DetailedSeriesReport);
            setSeriesReport(detailedJson);

            // Check if any completed machine still has 0 totalGrains (metrics not yet flushed)
            const machines = detailedJson.machines as MachineReportData[];
            const hasUnflushedMetrics = machines.some(
              (m) => m.status !== "pending" && m.trials.length > 0 &&
                m.trials.some((t) => t.sessionStatus !== "pending" && (t.GrainMetrics?.totalGrains || 0) === 0)
            );

            if (hasUnflushedMetrics && retryCount < MAX_RETRIES && !cancelled) {
              retryCount++;
              console.log(`Report data has unflushed metrics, retrying in ${RETRY_INTERVAL / 1000}s (attempt ${retryCount}/${MAX_RETRIES})...`);
              reportPollRef.current = setTimeout(() => {
                if (!cancelled) fetchData(true);
              }, RETRY_INTERVAL);
              // Don't clear loading on retry — keep showing data while refreshing
              if (!isRetry) setReportLoading(false);
              return;
            }
          }

          const statsJson = await statsRes.json();
          if (statsJson.status === "success" && statsJson.data) {
            setDimensionStats(statsJson.data as DimensionStatsResponse);
          }
        } else {
          // Single machine mode: fetch trials + dimension stats (like procurement)
          const [trialsRes, statsRes] = await Promise.all([
            fetch(`${BACKEND_URL}/api/raice_labz/analysis/mode/${modeId}/trials`),
            fetch(`${BACKEND_URL}/api/raice_labz/grains/mode/${modeId}/statistics`),
          ]);
          if (cancelled) return;

          const trialsJson = await trialsRes.json();
          if (trialsJson.status === "success" && trialsJson.data?.trials) {
            const trials = trialsJson.data.trials as TrialData[];
            setReportTrials(trials);

            // Check for unflushed metrics in single-machine mode too
            const hasUnflushed = trials.some(
              (t) => t.sessionStatus !== "pending" && (t.GrainMetrics?.totalGrains || 0) === 0
            );
            if (hasUnflushed && retryCount < MAX_RETRIES && !cancelled) {
              retryCount++;
              console.log(`Trial data has unflushed metrics, retrying in ${RETRY_INTERVAL / 1000}s (attempt ${retryCount}/${MAX_RETRIES})...`);
              reportPollRef.current = setTimeout(() => {
                if (!cancelled) fetchData(true);
              }, RETRY_INTERVAL);
              if (!isRetry) setReportLoading(false);
              return;
            }
          }

          const statsJson = await statsRes.json();
          if (statsJson.status === "success" && statsJson.data) {
            setDimensionStats(statsJson.data as DimensionStatsResponse);
          }
        }

        // Check for replay videos
        try {
          if (isSeriesMode) {
            // For series mode, fetch per-machine video availability
            const videoRes = await fetch(`${BACKEND_URL}/api/raice_labz/sessions/video/${modeId}/machines`);
            if (!cancelled) {
              const videoJson = await videoRes.json();
              if (videoJson.machines) {
                const machineVids: Record<string, Record<string, boolean>> = {};
                for (const [machineName, trials] of Object.entries(videoJson.machines as Record<string, Record<string, { exists: boolean }>>)) {
                  machineVids[machineName] = {};
                  for (const [tNum, info] of Object.entries(trials)) {
                    if (info.exists) machineVids[machineName][tNum] = true;
                  }
                }
                setMachineVideos(machineVids);
              }
            }
          } else {
            const videoRes = await fetch(`${BACKEND_URL}/api/raice_labz/sessions/video/${modeId}/exists`);
            if (!cancelled) {
              const videoJson = await videoRes.json();
              if (videoJson.trials) {
                const available: Record<string, boolean> = {};
                for (const [tNum, info] of Object.entries(videoJson.trials)) {
                  if ((info as { exists: boolean }).exists) available[tNum] = true;
                }
                setTrialVideos(available);
              }
            }
          }
        } catch {
          // Video check is non-critical
        }
      } catch (err) {
        if (!cancelled) console.error("Failed to fetch report data:", err);
      } finally {
        if (!cancelled) setReportLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
      if (reportPollRef.current) clearTimeout(reportPollRef.current);
    };
  }, [activeStep, seriesModeId, isSeriesMode]);

  const allSeriesMachinesDone = isSeriesMode
    && displayedMachines.length > 0
    && displayedMachines.every((m) => completedSeriesMachines.includes(m));

  // Determine if a series execution is actively in progress (locks navigation)
  const isSeriesExecutionActive = isSeriesMode
    && seriesModeId !== ""
    && !allSeriesMachinesDone
    && !seriesWasQuit;

  // Sync series execution lock to global context (controls sidebar navigation)
  useEffect(() => {
    setSeriesExecutionLocked(isSeriesExecutionActive);
    return () => setSeriesExecutionLocked(false);
  }, [isSeriesExecutionActive, setSeriesExecutionLocked]);

  const handleStepChange = (step: StepId) => {
    if (hasStartedAnalysis && activeStep === "live" && step !== "live") return;
    if (step === "live" && !completedSteps.preparation) return;
    if (step === "reports" && !completedSteps.live) return;
    // During active series execution, block navigation to reports
    if (step === "reports" && isSeriesExecutionActive) return;
    setActiveStep(step);
  };

  const markStepComplete = async (step: StepId) => {
    if (step === "preparation") {
      // Validate custom ID if custom generation is selected
      if (idGeneration === "custom" && (!customId || customId.length !== 4)) {
        toast({
          title: "Invalid Custom ID",
          description: "Please enter a 4-digit number for custom ID",
          variant: "destructive",
        });
        return;
      }

      try {
        const resolvedWeight =
          sampleWeight === "free weight"
            ? freeWeightInput
            : sampleWeight.replace(" grams", "");

        // Only create new mode docs for the FIRST machine in series, or for non-series mode (first sample only)
        const isFirstSeriesMachine = !seriesModeId;
        const existingModeId = sessionStorage.getItem("mode_id");
        // For non-series mode: if a mode_id already exists, this is sample 2+ — reuse it
        const isSubsequentSample = !isSeriesMode && !!existingModeId;

        if (isSubsequentSample) {
          // Sample 2+: don't create new mode, don't clear mode_id
          // Just update chalky threshold and sample weight in sessionStorage
          sessionStorage.setItem("chalky_threshold", chalkyThreshold);
          sessionStorage.setItem("analysis_params", JSON.stringify({ enableChalky, enableDiscolored, chalkyThreshold: enableChalky ? parseFloat(chalkyThreshold) || 20 : null }));
          sessionStorage.setItem("production_sample_weight", resolvedWeight);
          sessionStorage.setItem("production_sample_size_mode", sampleMode);
          // Remove any stale pending config so ProcurementLiveAnalysis uses existing mode_id
          sessionStorage.removeItem("pending_analysis_config");
          console.log("📝 Reusing existing modeId for next sample:", existingModeId);
        } else if (!isSeriesMode || isFirstSeriesMachine) {
          // Build the request body for the production-analysis endpoint
          const seriesMachinesList = isSeriesMode ? displayedMachines : [];
          const requestBody: Record<string, any> = {
            modeType: "production",
            idGeneration,
            customId: idGeneration === "custom" ? customId : null,
            variety,
            process,
            harvestSeason,
            month,
            operatorName: operatorName.trim(),
            noOfSamples,
            sampleWeight: resolvedWeight,
            sampleSizeMode: sampleMode,
            samplingMethod,
            chalkyThreshold: enableChalky ? parseFloat(chalkyThreshold) || 20 : null,
            analysisParameters: { enableChalky, enableDiscolored, chalkyThreshold: enableChalky ? parseFloat(chalkyThreshold) || 20 : null },
            series: selectedSeries || "",
            isSeriesMode,
            ...(isSeriesMode
              ? { seriesMachines: seriesMachinesList, machine: null }
              : { machine: { machineName: selectedMachine } }),
          };

          // Store pending analysis config in sessionStorage
          // Series mode uses TMA processing flow (stored in tma collection)
          const pendingConfig = {
            analysisType: isSeriesMode ? "tma" : "production",
            endpoint: `${BACKEND_URL}/api/raice_labz/modes/production-analysis`,
            requestBody,
            isSeriesMode,
            isProductionSeries: isSeriesMode,
            seriesMachines: seriesMachinesList,
            ...(isSeriesMode ? { machines: seriesMachinesList } : {}),
          };
          // Clear stale modeIds from previous analysis runs
          sessionStorage.removeItem("production_series_mode_id");
          sessionStorage.removeItem("production_machine_analyses");
          sessionStorage.removeItem("tma_mode_id");
          sessionStorage.removeItem("mode_id");

          sessionStorage.setItem(
            "pending_analysis_config",
            JSON.stringify(pendingConfig)
          );

          // Also store individual fields for easy access
          sessionStorage.setItem("analysis_type", "production");
          sessionStorage.setItem("production_variety", variety);
          sessionStorage.setItem("production_process", process);
          sessionStorage.setItem("production_harvest_season", harvestSeason);
          sessionStorage.setItem("production_month", month);
          sessionStorage.setItem("production_operator", operatorName.trim());
          sessionStorage.setItem(
            "production_machine",
            isSeriesMode ? seriesMachinesList[0] ?? "" : selectedMachine
          );
          sessionStorage.setItem("production_no_of_samples", noOfSamples);
          sessionStorage.setItem("production_sample_weight", resolvedWeight);
          sessionStorage.setItem("production_sample_size_mode", sampleMode);
          sessionStorage.setItem("production_sampling_method", samplingMethod);
          sessionStorage.setItem("chalky_threshold", chalkyThreshold);
          sessionStorage.setItem("analysis_params", JSON.stringify({ enableChalky, enableDiscolored, chalkyThreshold: enableChalky ? parseFloat(chalkyThreshold) || 20 : null }));
          sessionStorage.setItem("production_id_generation", idGeneration);
          sessionStorage.setItem("production_is_series_mode", String(isSeriesMode));
          if (isSeriesMode) {
            sessionStorage.setItem(
              "production_series_machines",
              JSON.stringify(seriesMachinesList)
            );
            sessionStorage.setItem("production_series_name", selectedSeries);
          }
          if (idGeneration === "custom") {
            sessionStorage.setItem("production_custom_id", customId);
          }

          console.log(
            "Stored production analysis config in sessionStorage"
          );
          console.log(
            "Pending config:",
            JSON.stringify(pendingConfig, null, 2)
          );
        } else {
          // Machine 2+ in series: store just the current machine override info
          const activeMachine = currentSeriesMachine;
          sessionStorage.setItem("production_current_machine", JSON.stringify({
            machineName: activeMachine,
            machineIndex: displayedMachines.indexOf(activeMachine),
          }));
          // Update the machine field for ProcurementLiveAnalysis
          sessionStorage.setItem("production_machine", activeMachine);
          // Also sync selectedMachine state for display
          setSelectedMachine(activeMachine);
        }
      } catch (err) {
        console.error(
          "Failed to prepare production analysis config:",
          err
        );
        toast({
          title: "Failed to prepare analysis",
          description:
            err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
        return;
      }
    }

    setCompletedSteps((prev) => ({
      ...prev,
      [step]: true,
      ...(step === "preparation" ? { live: prev.live } : null),
      ...(step === "live" ? { reports: prev.reports } : null),
    }));

    if (step === "preparation") {
      setActiveStep("live");
    } else if (step === "live") {
      setActiveStep("reports");
    }
  };

  const allCompleted =
    completedSteps.preparation && completedSteps.live && completedSteps.reports;

  // In series mode, the current machine is always determined by sequence — no user selection needed
  const currentSeriesMachine = isSeriesMode
    ? displayedMachines[completedSeriesMachines.length] || ""
    : "";

  const machineSelected = isSeriesMode
    ? displayedMachines.length > 0  // series selected = machines are determined
    : selectedMachine.trim() !== "";

  const isPreparationComplete =
    machineSelected &&
    operatorName.trim() !== "" &&
    variety.trim() !== "" &&
    process.trim() !== "" &&
    harvestSeason.trim() !== "" &&
    noOfSamples.trim() !== "" &&
    sampleWeight.trim() !== "" &&
    (sampleWeight !== "free weight" && sampleWeight !== "free count" || freeWeightInput.trim() !== "");

  const resolvedSampleWeight = (sampleWeight === "free weight" || sampleWeight === "free count") ? freeWeightInput : sampleWeight.replace(/ grams| grains/g, "");

  // ── Derived report values for Series Mode ──────────────────────────────
  const currentMachineData: MachineReportData | null = useMemo(() => {
    if (!detailedReport?.machines) return null;
    if (activeMachineTab === "all") return null;
    return detailedReport.machines[parseInt(activeMachineTab, 10)] ?? null;
  }, [detailedReport, activeMachineTab]);

  const currentReportMetrics: GrainMetrics | null = useMemo(() => {
    if (isSeriesMode) {
      if (!detailedReport) return null;
      if (activeMachineTab === "all") {
        return detailedReport.overallAggregated;
      }
      const machine = currentMachineData;
      if (!machine) return null;
      if (activeTrialTab === "average") {
        return machine.aggregatedMetrics;
      }
      const trialIdx = parseInt(activeTrialTab, 10) - 1;
      const trial = machine.trials[trialIdx];
      return trial?.GrainMetrics ?? null;
    } else {
      // Single machine mode
      if (reportTrials.length === 0) return null;
      if (activeTrialTab === "average") {
        return averageMetrics(reportTrials);
      }
      const idx = parseInt(activeTrialTab, 10) - 1;
      return reportTrials[idx]?.GrainMetrics ?? null;
    }
  }, [isSeriesMode, detailedReport, activeMachineTab, activeTrialTab, currentMachineData, reportTrials]);

  const currentOutputParams: OutputParams | null = useMemo(() => {
    if (!currentReportMetrics) return null;
    // Use per-trial whiteness when a specific sample is selected, else overall
    let whiteness = dimensionStats?.overallStats?.averageWhitenessIndex;
    if (activeTrialTab !== "average" && dimensionStats?.trialStats) {
      const trialStat = dimensionStats.trialStats[activeTrialTab];
      if (trialStat?.averageWhitenessIndex != null) {
        whiteness = trialStat.averageWhitenessIndex;
      }
    }
    return computeOutputParams(currentReportMetrics, whiteness, segGroups);
  }, [currentReportMetrics, dimensionStats, activeTrialTab, segGroups]);

  const currentDimStats = useMemo(() => {
    if (!dimensionStats) return null;
    // Use per-trial dimension stats when a specific sample is selected
    if (activeTrialTab !== "average" && dimensionStats.trialStats) {
      const trialStat = dimensionStats.trialStats[activeTrialTab];
      if (trialStat) return trialStat;
    }
    return dimensionStats.overallStats;
  }, [dimensionStats, activeTrialTab]);

  const totalGrainsScanned = useMemo(() => {
    if (isSeriesMode && detailedReport) {
      return detailedReport.overallAggregated?.totalGrains || 0;
    }
    return reportTrials.reduce((sum, t) => sum + ((t.GrainMetrics?.totalGrains) || 0), 0);
  }, [isSeriesMode, detailedReport, reportTrials]);

  // Bar chart data: classification breakdown for current view
  const classificationBarData = useMemo(() => {
    if (!currentReportMetrics) return [];
    const total = currentReportMetrics.totalGrains || 1;
    const gr = currentReportMetrics.goodRice || {} as GrainMetrics["goodRice"];
    const rej = currentReportMetrics.rejections || {} as GrainMetrics["rejections"];
    const fm = currentReportMetrics.foreignMatter || {} as GrainMetrics["foreignMatter"];

    const bars: { name: string; value: number; fill: string }[] = [];
    const addBar = (name: string, count: number, fill: string) => {
      const pct = +((count / total) * 100).toFixed(2);
      if (pct > 0) bars.push({ name, value: pct, fill });
    };

    // Good rice sub-classes (green shades)
    addBar("Head Rice", gr.headRice || 0, "#22c55e");
    addBar("3/4 Head", gr.threeFourthHead || 0, "#4ade80");
    addBar("Half Brokens", gr.halfBrokens || 0, "#86efac");
    addBar("Quarter/Fine", gr.quarterFineBrokens || 0, "#bbf7d0");
    addBar("Tips", gr.tips || 0, "#dcfce7");
    // Basmati region sub-classes (teal shades)
    addBar("Second One", gr.secondOne || 0, "#14b8a6");
    addBar("Tibar", gr.tibar || 0, "#2dd4bf");
    addBar("Dubar", gr.dubar || 0, "#5eead4");
    addBar("Mini Dubar", gr.miniDubar || 0, "#99f6e4");
    addBar("Mongra", gr.mongra || 0, "#a7f3d0");
    addBar("Mini Mongra", gr.miniMongra || 0, "#c6f7e0");
    addBar("Nakku", gr.nakku || 0, "#d1fae5");

    // Rejections (amber/orange shades)
    addBar("Chalky", rej.chalky || 0, "#f59e0b");
    addBar("Discolored", rej.discolored || 0, "#f97316");
    addBar("Immature", rej.immature || 0, "#fb923c");

    // Foreign matter (red)
    addBar("Foreign Matter", fm.total || 0, "#ef4444");

    return bars;
  }, [currentReportMetrics]);

  const sampleCount = parseInt(noOfSamples, 10) || 1;

  const handleGenerateReport = async () => {
    const modeId = seriesModeId || sessionStorage.getItem("production_series_mode_id") || sessionStorage.getItem("mode_id");
    if (!modeId) {
      toast({ title: "No mode ID found", description: "Cannot generate report without a mode ID.", variant: "destructive" });
      return;
    }
    setReportGenerating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/generate-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode_id: modeId, report_type: isSeriesMode ? "tma" : "production", include_detailed_chalky: includeDetailedChalky }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Report generation failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const contentDisposition = res.headers.get("Content-Disposition");
      const filename = buildReportFilename({
        modeId,
        reportType: isSeriesMode ? "tma" : "production",
        variety,
        process,
        contentDisposition,
        fallbackExtension: ".pdf",
      });
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Report downloaded", description: "PDF report saved successfully." });
    } catch (err) {
      console.error("Report generation error:", err);
      toast({ title: "Report generation failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setReportGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Production Analysis"
        subtitle="Machine-wise quality analysis from test setup to live vision and final reports."
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Tabs
          value={activeStep}
          onValueChange={(v) => handleStepChange(v as StepId)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preparation" disabled={activeStep === "reports"} className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              <span>Test Preparation</span>
              {completedSteps.preparation && (
                <CheckCircle2 className="w-3 h-3 text-rice-primary ml-1" />
              )}
            </TabsTrigger>
            <TabsTrigger
              value="live"
              disabled={!completedSteps.preparation || activeStep === "reports"}
              className="flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              <span>Live Analysis</span>
              {completedSteps.live && (
                <CheckCircle2 className="w-3 h-3 text-rice-primary ml-1" />
              )}
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              disabled={!completedSteps.live || isSeriesExecutionActive}
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Insights &amp; Reports</span>
              {completedSteps.reports && (
                <CheckCircle2 className="w-3 h-3 text-rice-primary ml-1" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* Step 1: Select Machine + Test Setup */}
          <TabsContent value="preparation" className="mt-2">
            {/* Category Banner */}
            <div className="flex items-center justify-between rounded-lg px-4 py-2 mb-6 bg-rice-primary/5 border border-rice-primary/20">
              <div className="flex items-center gap-2">
                <Wheat className="w-5 h-5 text-rice-primary" />
                <span className="font-semibold text-sm text-rice-primary">
                  Category: {categoryLabel}
                </span>
              </div>
            </div>

            {/* Series + Machine Selection - Single Card */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-rice-primary flex items-center gap-2">
                  <Layers className="w-5 h-5 text-rice-primary" />
                  Select Series & Machine
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Series Selection */}
                  <div className="lg:w-1/3 space-y-3">
                    <Label className="text-sm font-medium text-gray-700">Series (Line) <span className="text-rice-primary">*</span></Label>
                    <Select
                      value={selectedSeries || "__no_series__"}
                      onValueChange={handleSeriesChange}
                      disabled={isSeriesExecutionActive}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a series or choose No Series" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__no_series__">No Series (single machine)</SelectItem>
                        {lines.map((line) => (
                          <SelectItem
                            key={line.id || line.name}
                            value={line.name}
                          >
                            {line.name}
                            {line.machines.length > 0 && ` (${line.machines.length} machines)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {lines.length === 0 && !machinesLoading && (
                      <p className="text-xs text-amber-600">
                        No lines/series configured. Add them in Settings &gt; Line Info.
                      </p>
                    )}
                  </div>

                  {/* Machine Selection / Sequence */}
                  <div className="flex-1 space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      {isSeriesMode ? "Machine Sequence" : "Select Machine"}
                    </Label>
                    {isSeriesMode ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {displayedMachines.map((machine, idx) => {
                            const machineName =
                              typeof machine === "string"
                                ? machine
                                : (machine as any).machineName || String(machine);
                            const imageSrc = getMachineImageSrc(machineName);
                            const isDone = completedSeriesMachines.includes(machineName);
                            const isCurrent = idx === completedSeriesMachines.length;
                            return (
                              <div key={machineName} className="flex items-center gap-2">
                                <div
                                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 ${
                                    isDone
                                      ? "bg-green-100 text-green-700"
                                      : isCurrent
                                        ? "bg-rice-primary text-white shadow-sm"
                                        : "bg-gray-200 text-gray-500"
                                  }`}
                                >
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/80">
                                    {imageSrc ? (
                                      <img
                                        src={imageSrc}
                                        alt={machineName}
                                        className="w-4 h-4 object-cover rounded-full"
                                      />
                                    ) : (
                                      <Factory className="w-3 h-3" />
                                    )}
                                  </span>
                                  {isDone && <CheckCircle2 className="w-3 h-3" />}
                                  {isCurrent && <Zap className="w-3 h-3" />}
                                  {machineName}
                                </div>
                                {idx < displayedMachines.length - 1 && (
                                  <div className={`w-4 h-0.5 ${isDone ? "bg-green-400" : "bg-gray-200"}`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <>
                        {machinesLoading ? (
                          <p className="text-sm text-muted-foreground">Loading machines...</p>
                        ) : displayedMachines.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No machines available.</p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {displayedMachines.map((machine, idx) => {
                              const machineName =
                                typeof machine === "string"
                                  ? machine
                                  : (machine as any).machineName || String(machine);
                              const isSelected = selectedMachine === machineName;
                              return (
                                <button
                                  key={machineName}
                                  onClick={() => setSelectedMachine(machineName)}
                                  title={machineName}
                                  className={`group relative w-full rounded-xl border p-3 text-left transition-all duration-150 hover:scale-[1.02] active:scale-[0.99] ${
                                    isSelected
                                      ? "bg-rice-primary border-rice-primary text-white shadow-md ring-2 ring-rice-primary/30"
                                      : "bg-white border-gray-200 text-gray-700 hover:border-rice-primary/40 hover:shadow-sm"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div
                                      className={`w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center ${
                                        isSelected
                                          ? "bg-white/20 text-white"
                                          : "bg-rice-primary/10 text-rice-primary"
                                      }`}
                                    >
                                      {getMachineImageSrc(machineName) ? (
                                        <img
                                          src={getMachineImageSrc(machineName) || undefined}
                                          alt={machineName}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <Factory className="w-4 h-4" />
                                      )}
                                    </div>
                                    <span
                                      className={`text-[10px] font-bold tabular ${
                                        isSelected ? "text-white/80" : "text-gray-400"
                                      }`}
                                    >
                                      {String(idx + 1).padStart(2, "0")}
                                    </span>
                                  </div>
                                  <div
                                    className={`text-xs font-semibold leading-tight line-clamp-2 min-h-[2rem] ${
                                      isSelected ? "text-white" : "text-gray-800"
                                    }`}
                                  >
                                    {machineName}
                                  </div>
                                  {isSelected && (
                                    <div className="absolute top-2 right-2">
                                      <CheckCircle2 className="w-4 h-4 text-white" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {selectedMachine && (
                          <div className="p-2.5 bg-rice-primary/5 border border-rice-primary/20 rounded-lg flex items-center gap-2">
                            <Factory className="w-4 h-4 text-rice-primary" />
                            <span className="text-sm font-medium text-rice-primary">
                              Selected: {selectedMachine}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 items-stretch">
              {/* Grain Information Card */}
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-rice-primary flex items-center gap-2">
                    <Wheat className="w-5 h-5 text-rice-primary" />
                    Grain Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="prod-variety">
                        Variety <span className="text-rice-primary">*</span>
                      </Label>
                      <Select
                        value={variety || ""}
                        onValueChange={(v) => {
                          setVariety(v);
                          setProcess("");
                        }}
                        disabled={varietiesLoading}
                      >
                        <SelectTrigger id="prod-variety">
                          <SelectValue
                            placeholder={
                              varietiesLoading
                                ? "Loading varieties..."
                                : varietiesFromDb.length === 0
                                  ? "No varieties in database"
                                  : "Select variety"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {varietiesFromDb.map((v) => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {varietiesFromDb.length === 0 && !varietiesLoading && (
                        <p className="text-xs text-amber-600">
                          Add varieties in Grain Database first; only DB
                          varieties appear here.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="prod-process">
                        Process <span className="text-rice-primary">*</span>
                      </Label>
                      <Select
                        value={process || ""}
                        onValueChange={(v) => {
                          setProcess(v);
                          setHarvestSeason("");
                        }}
                        disabled={!variety || processesLoading}
                      >
                        <SelectTrigger id="prod-process">
                          <SelectValue
                            placeholder={
                              !variety
                                ? "Select variety first"
                                : processesLoading
                                  ? "Loading processes..."
                                  : processesForVariety.length === 0
                                    ? "No processes for this variety"
                                    : "Select process"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {processesForVariety.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {variety &&
                        processesForVariety.length === 0 &&
                        !processesLoading && (
                          <p className="text-xs text-amber-600">
                            No processes in database for this variety. Add in
                            Grain Database.
                          </p>
                        )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="prod-harvest-season">
                        Harvest Season{" "}
                        <span className="text-rice-primary">*</span>
                      </Label>
                      <Select
                        value={harvestSeason || ""}
                        onValueChange={(v) => {
                          setHarvestSeason(v);
                          setMonth("");
                        }}
                        disabled={
                          !variety || !process || harvestSeasonsLoading
                        }
                      >
                        <SelectTrigger id="prod-harvest-season">
                          <SelectValue
                            placeholder={
                              !variety || !process
                                ? "Select variety and process first"
                                : harvestSeasonsLoading
                                  ? "Loading harvest seasons..."
                                  : harvestSeasonsFromDb.length === 0
                                    ? "No harvest seasons for this combination"
                                    : "Select harvest season"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {harvestSeasonsFromDb.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {variety &&
                        process &&
                        harvestSeasonsFromDb.length === 0 &&
                        !harvestSeasonsLoading && (
                          <p className="text-xs text-amber-600">
                            No harvest seasons in database for this variety +
                            process. Add in Grain Database.
                          </p>
                        )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="prod-month">Month (optional)</Label>
                      <Select
                        value={month || ""}
                        onValueChange={setMonth}
                        disabled={
                          !variety ||
                          !process ||
                          !harvestSeason ||
                          monthsLoading
                        }
                      >
                        <SelectTrigger id="prod-month">
                          <SelectValue
                            placeholder={
                              !variety || !process || !harvestSeason
                                ? "Select harvest season first"
                                : monthsLoading
                                  ? "Loading months..."
                                  : monthsFromDb.length === 0
                                    ? "No months for this combination"
                                    : "Select month (optional)"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {monthsFromDb.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {variety &&
                        process &&
                        harvestSeason &&
                        monthsFromDb.length === 0 &&
                        !monthsLoading && (
                          <p className="text-xs text-amber-600">
                            No months in database for this combination. Add in
                            Grain Database.
                          </p>
                        )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="prod-no-samples">
                        No. of Samples (1-3){" "}
                        <span className="text-rice-primary">*</span>
                      </Label>
                      <Input
                        id="prod-no-samples"
                        type="number"
                        min={1}
                        max={3}
                        value={noOfSamples}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "") {
                            setNoOfSamples("");
                            return;
                          }
                          const n = parseInt(v, 10);
                          if (!Number.isNaN(n)) {
                            setNoOfSamples(
                              String(Math.min(3, Math.max(1, n)))
                            );
                          }
                        }}
                        placeholder="1-3"
                      />
                    </div>
                    {/* Sample Size + Parameters to Analyse — side by side */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Sample Size <span className="text-rice-primary">*</span></Label>
                        <div className="flex items-center gap-2 flex-wrap">
                          <RadioGroup
                            value={sampleMode}
                            onValueChange={(v: "weight" | "count") => { setSampleMode(v); setSampleWeight(v === "weight" ? "50 grams" : "1000 grains"); setFreeWeightInput(""); }}
                            className="flex items-center gap-2"
                          >
                            <div className="flex items-center gap-1.5">
                              <RadioGroupItem value="weight" id="prod-sample-mode-weight" />
                              <Label htmlFor="prod-sample-mode-weight" className="cursor-pointer font-normal text-sm">By Weight</Label>
                              {sampleMode === "weight" && (
                                <>
                                  <Select value={sampleWeight} onValueChange={(v) => { setSampleWeight(v); if (v !== "free weight") setFreeWeightInput(""); }}>
                                    <SelectTrigger className="w-28 h-7 text-xs ml-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="10 grams">10 grams</SelectItem>
                                      <SelectItem value="20 grams">20 grams</SelectItem>
                                      <SelectItem value="50 grams">50 grams</SelectItem>
                                      <SelectItem value="100 grams">100 grams</SelectItem>
                                      <SelectItem value="free weight">Free weight</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {sampleWeight === "free weight" && (
                                    <div className="flex items-center gap-1">
                                      <Input type="number" min={1} max={150} step={1} placeholder="Max 150" value={freeWeightInput} onChange={(e) => { const v = e.target.value; if (v === "" || (Number(v) >= 0 && Number(v) <= 150)) setFreeWeightInput(v); }} className="w-24 h-7 text-xs" />
                                      <span className="text-xs text-muted-foreground">g</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <RadioGroupItem value="count" id="prod-sample-mode-count" />
                              <Label htmlFor="prod-sample-mode-count" className="cursor-pointer font-normal text-sm">By Count</Label>
                              {sampleMode === "count" && (
                                <>
                                  <Select value={sampleWeight} onValueChange={(v) => { setSampleWeight(v); if (v !== "free count") setFreeWeightInput(""); }}>
                                    <SelectTrigger className="w-28 h-7 text-xs ml-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="1000 grains">1000 grains</SelectItem>
                                      <SelectItem value="2000 grains">2000 grains</SelectItem>
                                      <SelectItem value="2500 grains">2500 grains</SelectItem>
                                      <SelectItem value="5000 grains">5000 grains</SelectItem>
                                      <SelectItem value="free count">Free count</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {sampleWeight === "free count" && (
                                    <div className="flex items-center gap-1">
                                      <Input type="number" min={1} max={5000} step={1} placeholder="Max 5000" value={freeWeightInput} onChange={(e) => { const v = e.target.value; if (v === "" || (Number(v) >= 0 && Number(v) <= 5000)) setFreeWeightInput(v); }} className="w-24 h-7 text-xs" />
                                      <span className="text-xs text-muted-foreground">grains</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="font-medium">Parameters to Analyse</Label>
                        <div className="flex flex-wrap items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={enableChalky} onChange={(e) => setEnableChalky(e.target.checked)} className="accent-rice-primary w-4 h-4" />
                            <span className="text-sm">Chalky</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={enableDiscolored} onChange={(e) => setEnableDiscolored(e.target.checked)} className="accent-rice-primary w-4 h-4" />
                            <span className="text-sm">Discolored</span>
                          </label>
                          {enableChalky && (
                            <div className="flex items-center gap-2 ml-2">
                              <Label className="text-sm text-gray-600 whitespace-nowrap">Chalky Threshold</Label>
                              <div className="relative w-20">
                                <Input type="number" min={0} max={100} step={1} value={chalkyThreshold} onChange={(e) => setChalkyThreshold(e.target.value)} className="pr-7 h-8 text-sm" placeholder="20" />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {isPreparationComplete && !allSeriesMachinesDone && (
              <div className="mt-6 flex justify-center">
                <Button
                  className="bg-rice-primary hover:bg-rice-primary/90 px-8"
                  onClick={() => markStepComplete("preparation")}
                  disabled={
                    idGeneration === "custom" &&
                    (!customId || customId.length !== 4)
                  }
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {isSeriesMode
                    ? completedSeriesMachines.length > 0
                      ? `Continue — Analyze ${currentSeriesMachine}`
                      : `Start Series — ${displayedMachines.length} machines`
                    : "Launch Vision System"}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Step 2: Vision Feed */}
          <TabsContent value="live" className="mt-2">
            <ProcurementLiveAnalysis
              embedded={true}
              analysisDataOverride={{
                analysisType: isSeriesMode ? "tma" : "production",
                variety: variety,
                process: process,
                noOfSamples: parseInt(noOfSamples),
                sampleWeight:
                  sampleWeight === "free weight"
                    ? freeWeightInput
                    : sampleWeight.replace(" grams", ""),
                sampleSizeMode: sampleMode,
                machineName: isSeriesMode ? (selectedMachine || currentSeriesMachine) : selectedMachine,
                isSeriesMode,
                isProductionSeries: isSeriesMode,
                seriesMachines: isSeriesMode ? displayedMachines : undefined,
                modeId: seriesModeId || undefined,
                ...(isSeriesMode
                  ? { machines: displayedMachines }
                  : { machineIndex: undefined }),
              }}
              onComplete={() => {
                if (!isSeriesMode) {
                  markStepComplete("live");
                  return;
                }

                // Series mode: the child calls onComplete only when ALL machines are done
                // OR when a single machine is done and needs parent to advance
                const justCompleted = selectedMachine || currentSeriesMachine;

                // Fire advance-machine API (non-blocking)
                const modeId = sessionStorage.getItem("production_series_mode_id") || seriesModeId;
                if (modeId && justCompleted) {
                  fetch(`${BACKEND_URL}/api/raice_labz/modes/${modeId}/advance-machine`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ machineName: justCompleted, machineIndex: displayedMachines.indexOf(justCompleted) }),
                  }).catch(() => {});
                }

                // The child manages machine transitions internally.
                // By the time onComplete is called for the last machine, ALL machines are done.
                // Mark all machines as completed and go to reports.
                setCompletedSeriesMachines([...displayedMachines]);
                toast({ title: "Series Complete", description: "Loading reports...", duration: 3000 });
                markStepComplete("live");
              }}
            />
          </TabsContent>

          {/* Step 3: Results & Reports */}
          <TabsContent value="reports" className="mt-2 space-y-4">
            {/* ── Session Replay ────────────────────────────────────── */}
            {(() => {
              const modeId = seriesModeId || sessionStorage.getItem("production_series_mode_id") || sessionStorage.getItem("mode_id");
              // Determine if current view has a video
              let hasVideoForCurrentView = false;
              let videoUrl = "";
              if (isSeriesMode && activeMachineTab !== "all" && currentMachineData) {
                const machineVids = machineVideos[currentMachineData.machineName] || {};
                if (activeTrialTab === "average") {
                  // Show first available trial video for this machine
                  const firstVid = Object.keys(machineVids).sort()[0];
                  if (firstVid) {
                    hasVideoForCurrentView = true;
                    videoUrl = `${BACKEND_URL}/api/raice_labz/sessions/video/${modeId}?trial=${firstVid}&machine=${encodeURIComponent(currentMachineData.machineName)}`;
                  }
                } else {
                  hasVideoForCurrentView = !!machineVids[activeTrialTab];
                  videoUrl = `${BACKEND_URL}/api/raice_labz/sessions/video/${modeId}?trial=${activeTrialTab}&machine=${encodeURIComponent(currentMachineData.machineName)}`;
                }
              } else if (!isSeriesMode) {
                const isAvgTab = activeTrialTab === "average";
                if (!isAvgTab && trialVideos[activeTrialTab]) {
                  hasVideoForCurrentView = true;
                  videoUrl = `${BACKEND_URL}/api/raice_labz/sessions/video/${modeId}?trial=${activeTrialTab}`;
                } else if (isAvgTab && Object.keys(trialVideos).length > 0) {
                  const firstVid = Object.keys(trialVideos).sort()[0];
                  hasVideoForCurrentView = true;
                  videoUrl = `${BACKEND_URL}/api/raice_labz/sessions/video/${modeId}?trial=${firstVid}`;
                }
              }

              if (!hasVideoForCurrentView) return null;
              return (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-rice-primary text-base flex items-center gap-2">
                        <Play className="w-5 h-5" />
                        Session Replay
                        {isSeriesMode && currentMachineData && (
                          <span className="text-xs font-normal text-gray-500 ml-1">
                            — {currentMachineData.machineName}
                            {activeTrialTab !== "average" && `, Trial ${activeTrialTab}`}
                          </span>
                        )}
                      </CardTitle>
                      <Button size="sm" variant="outline" onClick={() => setShowReplay(!showReplay)}>
                        {showReplay ? "Hide" : "Show"} Replay
                      </Button>
                    </div>
                  </CardHeader>
                  {showReplay && (
                    <CardContent>
                      {/* Trial video selector for current machine (series mode) */}
                      {isSeriesMode && currentMachineData && Object.keys(machineVideos[currentMachineData.machineName] || {}).length > 1 && (
                        <div className="flex gap-2 mb-3">
                          {Object.keys(machineVideos[currentMachineData.machineName] || {}).sort().map((tNum) => (
                            <button
                              key={tNum}
                              onClick={() => setActiveTrialTab(tNum)}
                              className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
                                activeTrialTab === tNum
                                  ? "border-rice-primary bg-rice-primary/10 text-rice-primary"
                                  : "border-gray-200 text-gray-500 hover:border-gray-400"
                              }`}
                            >
                              Sample {tNum}
                            </button>
                          ))}
                        </div>
                      )}
                      <video
                        key={videoUrl}
                        controls
                        preload="metadata"
                        className="w-full rounded-lg max-h-[400px] bg-black"
                        src={videoUrl}
                      >
                        Your browser does not support video playback.
                      </video>
                      <p className="text-[10px] text-muted-foreground mt-2 text-center">
                        First playback may take a few seconds while the video is prepared.
                      </p>
                    </CardContent>
                  )}
                </Card>
              );
            })()}

            {/* ── Machine Tabs (series mode) or Trial Tabs (single mode) ── */}
            {isSeriesMode && detailedReport?.machines ? (
              <>
                {/* Machine tabs */}
                <div className="flex items-center gap-2 flex-wrap">
                  {detailedReport.machines.map((machine, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setActiveMachineTab(String(idx)); setActiveTrialTab("average"); }}
                      className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                        activeMachineTab === String(idx)
                          ? "border-rice-primary text-rice-primary bg-white"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <Factory className="w-3.5 h-3.5 inline mr-1.5" />
                      {machine.machineName}
                    </button>
                  ))}
                  <button
                    onClick={() => { setActiveMachineTab("all"); setActiveTrialTab("average"); }}
                    className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                      activeMachineTab === "all"
                        ? "border-rice-primary text-rice-primary bg-white"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 inline mr-1.5" />
                    All Machines
                  </button>
                  <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Vision Scan Complete
                  </span>
                </div>

                {/* Trial sub-tabs (under each machine, not for "all") */}
                {activeMachineTab !== "all" && currentMachineData && (
                  <div className="flex items-center gap-2 flex-wrap pl-2 border-l-2 border-rice-primary/30">
                    {currentMachineData.trials.map((trial, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveTrialTab(String(trial.trialNumber))}
                        className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                          activeTrialTab === String(trial.trialNumber)
                            ? "border-rice-primary bg-rice-primary/10 text-rice-primary"
                            : "border-gray-200 text-gray-500 hover:border-gray-400"
                        }`}
                      >
                        Sample {trial.trialNumber}
                      </button>
                    ))}
                    {currentMachineData.trials.length > 1 && (
                      <button
                        onClick={() => setActiveTrialTab("average")}
                        className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                          activeTrialTab === "average"
                            ? "border-rice-primary bg-rice-primary/10 text-rice-primary"
                            : "border-gray-200 text-gray-500 hover:border-gray-400"
                        }`}
                      >
                        Average
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : !isSeriesMode ? (
              /* Single machine mode: trial tabs like procurement */
              <div className="flex items-center gap-2 flex-wrap">
                {Array.from({ length: sampleCount }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    onClick={() => setActiveTrialTab(String(num))}
                    className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                      activeTrialTab === String(num)
                        ? "border-rice-primary text-rice-primary bg-white"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Sample {num}
                  </button>
                ))}
                {sampleCount > 1 && (
                  <button
                    onClick={() => setActiveTrialTab("average")}
                    className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                      activeTrialTab === "average"
                        ? "border-rice-primary text-rice-primary bg-white"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Average
                  </button>
                )}
                <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Vision Scan Complete
                </span>
              </div>
            ) : null}

            {reportLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading report data...
              </div>
            ) : (
              <>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-stretch">
                {/* ── Left Column: Main Content ──────────────────────── */}
                <div className="space-y-4 h-full flex flex-col">
                  {/* Quality Metrics Card */}
                  <Card className="shadow-sm flex-1">
                    <CardHeader className="pb-3 bg-gradient-to-r from-rice-primary/5 to-rice-secondary/5 border-b">
                      <CardTitle className="text-rice-primary text-base flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Production Metrics Overview
                        {isSeriesMode && activeMachineTab !== "all" && currentMachineData && (
                          <span className="text-xs font-normal text-gray-500 ml-2">— {currentMachineData.machineName}</span>
                        )}
                        {isSeriesMode && activeMachineTab === "all" && (
                          <span className="text-xs font-normal text-gray-500 ml-2">— All Machines (Aggregated)</span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5">
                      {currentOutputParams ? (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { label: "Headrice", value: currentOutputParams.headRicePct, unit: "%", border: "border-blue-200", bg: "bg-gradient-to-br from-blue-50 to-indigo-50", textColor: "text-blue-700", barColor: "bg-blue-500" },
                              { label: "Brokens", value: currentOutputParams.brokenRicePct, unit: "%", border: "border-yellow-200", bg: "bg-gradient-to-br from-yellow-50 to-amber-50", textColor: "text-yellow-700", barColor: "bg-yellow-500" },
                              { label: "Chalky", value: currentOutputParams.chalkyPct, unit: "%", border: "border-blue-300", bg: "bg-gradient-to-br from-blue-50 to-sky-50", textColor: "text-blue-600", barColor: "bg-blue-400" },
                              { label: "Discolored", value: currentOutputParams.discolouredPct, unit: "%", border: "border-indigo-200", bg: "bg-gradient-to-br from-indigo-50 to-blue-50", textColor: "text-indigo-700", barColor: "bg-indigo-500" },
                              { label: "Rejections", value: +(currentOutputParams.chalkyPct + currentOutputParams.discolouredPct + currentOutputParams.immaturePct).toFixed(1), unit: "%", border: "border-purple-200", bg: "bg-gradient-to-br from-purple-50 to-indigo-50", textColor: "text-purple-700", barColor: "bg-purple-500" },
                              { label: "Foreignmatter", value: currentOutputParams.foreignMatterPct, unit: "%", border: "border-yellow-300", bg: "bg-gradient-to-br from-amber-50 to-yellow-50", textColor: "text-amber-700", barColor: "bg-amber-500" },
                              { label: "Immature", value: currentOutputParams.immaturePct, unit: "%", border: "border-sky-200", bg: "bg-gradient-to-br from-sky-50 to-blue-50", textColor: "text-sky-700", barColor: "bg-sky-500" },
                              { label: "Total grains", value: currentOutputParams.totalGrains, unit: "", border: "border-gray-200", bg: "bg-gradient-to-br from-gray-50 to-slate-50", textColor: "text-gray-800", barColor: "bg-gray-500", isCount: true },
                            ].map((metric: { label: string; value: number; unit: string; border: string; bg: string; textColor: string; barColor: string; isCount?: boolean }) => (
                              <div
                                key={metric.label}
                                className={`group rounded-xl border ${metric.border} ${metric.bg} p-3.5 hover:shadow-lg hover:scale-[1.03] transition-all duration-300 cursor-default`}
                              >
                                <p className="text-[11px] font-medium text-gray-500 group-hover:text-gray-700 transition-colors duration-300">{metric.label}</p>
                                <p className={`text-2xl font-bold ${metric.textColor} mt-1`}>
                                  {metric.isCount ? metric.value.toLocaleString() : metric.value}
                                  {metric.unit && <span className="text-sm font-normal ml-0.5 text-gray-400">{metric.unit}</span>}
                                </p>
                                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${metric.barColor} transition-all duration-700`} style={{ width: `${metric.isCount ? 100 : Math.min(metric.value, 100)}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Whiteness Index Classification */}
                          {currentOutputParams.whitenessIndex > 0 && (
                            <div className="mt-3">
                              <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-[11px] font-medium text-gray-500">Whiteness Index</p>
                                    <p className="text-2xl font-bold text-blue-700 mt-1">
                                      {currentOutputParams.whitenessIndex.toFixed(1)}
                                      <span className="text-sm font-normal ml-1 text-gray-400">WI</span>
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[11px] font-medium text-gray-500">Color Grade</p>
                                    <p className="text-lg font-semibold mt-1" style={{ color: getWiGradeColor(currentOutputParams.whitenessIndex) }}>
                                      {getWiGradeLabel(currentOutputParams.whitenessIndex)}
                                    </p>
                                  </div>
                                  <div className="flex gap-1.5">
                                    {[
                                      { label: "SW", color: "#f0f0f0", min: 36, max: 46 },
                                      { label: "W", color: "#e8e8e8", min: 32, max: 36 },
                                      { label: "C", color: "#f5f0e0", min: 28, max: 32 },
                                      { label: "L", color: "#f0e68c", min: 25, max: 28 },
                                      { label: "AY", color: "#d4a843", min: 22, max: 25 },
                                      { label: "G", color: "#c8960c", min: 18, max: 22 },
                                    ].map((g) => (
                                      <div
                                        key={g.label}
                                        className={`flex flex-col items-center px-2 py-1 rounded text-[9px] ${
                                          currentOutputParams.whitenessIndex >= g.min && currentOutputParams.whitenessIndex < g.max
                                            ? 'ring-2 ring-blue-500 ring-offset-1'
                                            : 'opacity-50'
                                        }`}
                                        style={{ backgroundColor: g.color }}
                                      >
                                        <span className="font-bold text-gray-700">{g.label}</span>
                                        <span className="text-gray-500">{g.min}–{g.max}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Donut Chart: Rice vs Rejections vs Foreign Matter */}
                          <div className="mt-6 border-t pt-5">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Quality Breakdown</h4>
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                              <div className="w-full sm:w-1/2 h-[220px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={[
                                        { name: "Head Rice", value: currentOutputParams.headRicePct, color: "#0B4CAD" },
                                        { name: "Broken Rice", value: currentOutputParams.brokenRicePct, color: "#eab308" },
                                        { name: "Rejections", value: currentOutputParams.chalkyPct + currentOutputParams.discolouredPct + currentOutputParams.immaturePct, color: "#6366f1" },
                                        { name: "Foreign Matter", value: currentOutputParams.foreignMatterPct, color: "#f59e0b" },
                                      ].filter(d => d.value > 0)}
                                      cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value" animationDuration={800}
                                    >
                                      {[
                                        { name: "Head Rice", value: currentOutputParams.headRicePct, color: "#0B4CAD" },
                                        { name: "Broken Rice", value: currentOutputParams.brokenRicePct, color: "#eab308" },
                                        { name: "Rejections", value: currentOutputParams.chalkyPct + currentOutputParams.discolouredPct + currentOutputParams.immaturePct, color: "#6366f1" },
                                        { name: "Foreign Matter", value: currentOutputParams.foreignMatterPct, color: "#f59e0b" },
                                      ].filter(d => d.value > 0).map((entry, idx) => (
                                        <Cell key={idx} fill={entry.color} stroke="white" strokeWidth={2} />
                                      ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => [`${value}%`, ""]} contentStyle={{ borderRadius: "8px", fontSize: "12px", border: "1px solid #e5e7eb" }} />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="w-full sm:w-1/2 space-y-2">
                                {[
                                  { label: "Head Rice", value: currentOutputParams.headRicePct, color: "#0B4CAD", desc: "Full & 3/4 head grains, secondOne, tibar" },
                                  { label: "Broken Rice", value: currentOutputParams.brokenRicePct, color: "#eab308", desc: "Half, quarter, fine brokens, tips, dubar, mongra, nakku" },
                                  { label: "Rejections", value: +(currentOutputParams.chalkyPct + currentOutputParams.discolouredPct + currentOutputParams.immaturePct).toFixed(1), color: "#6366f1", desc: "Chalky, discolored, immature" },
                                  { label: "Foreign Matter", value: currentOutputParams.foreignMatterPct, color: "#f59e0b", desc: "Non-rice material" },
                                ].map((item) => (
                                  <div key={item.label} className="flex items-center gap-3 group hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors duration-200">
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-baseline">
                                        <span className="text-sm font-medium text-gray-700">{item.label}</span>
                                        <span className="text-sm font-bold text-gray-900">{item.value}%</span>
                                      </div>
                                      <p className="text-[10px] text-gray-400">{item.desc}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 py-4 text-center">No metrics available for this selection</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Machine Comparison Summary (series mode, "all" tab) */}
                  {isSeriesMode && activeMachineTab === "all" && detailedReport?.machines && (
                    <Card className="shadow-sm">
                      <CardHeader className="pb-3 bg-gradient-to-r from-rice-primary/5 to-rice-secondary/5 border-b">
                        <CardTitle className="text-rice-primary text-base flex items-center gap-2">
                          <Layers className="w-5 h-5" />
                          Machine Comparison — {selectedSeries}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="overflow-x-auto pt-0">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gradient-to-r from-gray-50 to-white border-b">
                              <th className="text-left py-2.5 px-3 font-semibold text-gray-600">Machine</th>
                              <th className="text-right py-2.5 px-3 font-semibold text-gray-600">Total</th>
                              <th className="text-right py-2.5 px-3 font-semibold text-blue-600">Head Rice %</th>
                              <th className="text-right py-2.5 px-3 font-semibold text-yellow-600">Broken %</th>
                              <th className="text-right py-2.5 px-3 font-semibold text-blue-500">Chalky %</th>
                              <th className="text-right py-2.5 px-3 font-semibold text-amber-600">FM %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailedReport.machines.map((machine, idx) => {
                              const params = computeOutputParams(machine.aggregatedMetrics, undefined, segGroups);
                              return (
                                <tr
                                  key={idx}
                                  className="border-b last:border-0 hover:bg-rice-primary/5 transition-colors cursor-pointer"
                                  onClick={() => { setActiveMachineTab(String(idx)); setActiveTrialTab("average"); }}
                                >
                                  <td className="py-2.5 px-3 font-medium text-gray-800">
                                    <Factory className="w-3.5 h-3.5 inline mr-1.5 text-rice-primary" />
                                    {machine.machineName}
                                  </td>
                                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">{(machine.aggregatedMetrics?.totalGrains || 0).toLocaleString()}</td>
                                  <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-blue-700">{params.headRicePct}%</td>
                                  <td className="py-2.5 px-3 text-right tabular-nums text-yellow-700">{params.brokenRicePct}%</td>
                                  <td className="py-2.5 px-3 text-right tabular-nums text-blue-600">{params.chalkyPct}%</td>
                                  <td className="py-2.5 px-3 text-right tabular-nums text-amber-700">{params.foreignMatterPct}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* ── Right Column: Sidebar ──────────────────── */}
                <div className="flex flex-col gap-3 h-full">
                  {/* Test Information Panel */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3 bg-gradient-to-r from-rice-primary/5 to-rice-secondary/5 border-b">
                      <CardTitle className="text-sm font-semibold text-gray-700">Test Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3.5 text-sm pt-4">
                      {[
                        { label: "Test Id", value: seriesModeId || sessionStorage.getItem("production_series_mode_id") || sessionStorage.getItem("mode_id") || "—" },
                        { label: "Operator", value: operatorName || "—" },
                        { label: "Date", value: currentDate || "—" },
                        { label: "Series", value: selectedSeries || "No Series" },
                        ...(isSeriesMode && activeMachineTab !== "all" && currentMachineData
                          ? [{ label: "Machine", value: currentMachineData.machineName }]
                          : !isSeriesMode ? [{ label: "Machine", value: selectedMachine || "—" }] : []),
                        { label: "Variety", value: variety || "—" },
                        { label: "Process", value: process || "—" },
                        { label: "Grains Scanned", value: totalGrainsScanned.toLocaleString() },
                        { label: sampleMode === "count" ? "Sample Count" : "Sample Weight", value: resolvedSampleWeight ? (sampleMode === "count" ? resolvedSampleWeight : `${resolvedSampleWeight}g`) : "—" },
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between items-baseline py-0.5">
                          <span className="text-gray-500 text-xs font-medium">{item.label}</span>
                          <span className="font-medium text-gray-800 text-right max-w-[180px] truncate text-sm">{item.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Actions Panel */}
                  <Card className="flex-1 flex flex-col min-h-0">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-gray-700">Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5 flex-1">
                      {enableChalky && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={includeDetailedChalky} onChange={(e) => setIncludeDetailedChalky(e.target.checked)} className="accent-rice-primary w-4 h-4" />
                          <span className="text-sm text-gray-700">Download Detailed Chalky Classification</span>
                        </label>
                      )}
                      <Button
                        className="w-full bg-rice-primary hover:bg-rice-primary/90 gap-2"
                        onClick={handleGenerateReport}
                        disabled={reportGenerating}
                      >
                        <Download className="w-4 h-4" />
                        {reportGenerating ? "Generating..." : "Generate Report"}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => setShowReplay(true)}
                      >
                        <Play className="w-4 h-4 rotate-180" />
                        Replay Vision
                      </Button>
                      <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/")}>
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Button>
                    </CardContent>
                  </Card>

                </div>
              </div>

              {/* Dimension Analysis Card — full width */}
              <Card className="shadow-sm mt-6">
                <CardHeader className="pb-3 bg-gradient-to-r from-rice-primary/5 to-rice-secondary/5 border-b">
                  <CardTitle className="text-rice-primary text-base flex items-center gap-2">
                    <Wheat className="w-5 h-5" />
                    Dimension Analysis (Rice)
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto pt-0">
                  {currentDimStats?.dimensions ? (() => {
                    const dims = currentDimStats.dimensions;
                    const hrDims = currentDimStats.headRiceDimensions;
                    const fmt = (v: number | null | undefined) => v != null ? v.toFixed(2) : "—";
                    const rows: { label: string; length: string; width: string; ratio: string; highlight?: boolean }[] = [
                      { label: "Mean", length: fmt(dims.length_mm.mean), width: fmt(dims.width_mm.mean), ratio: fmt(dims.aspect_ratio.mean) },
                      { label: "Mode", length: fmt(dims.length_mm.mode), width: fmt(dims.width_mm.mode), ratio: fmt(dims.aspect_ratio.mode) },
                      { label: "Median", length: fmt(dims.length_mm.median), width: fmt(dims.width_mm.median), ratio: fmt(dims.aspect_ratio.median) },
                      { label: "Min", length: fmt(dims.length_mm.min), width: fmt(dims.width_mm.min), ratio: fmt(dims.aspect_ratio.min) },
                      { label: "Max", length: fmt(dims.length_mm.max), width: fmt(dims.width_mm.max), ratio: fmt(dims.aspect_ratio.max) },
                      { label: "Head Rice (Mean)", length: fmt(hrDims?.length_mm?.mean), width: fmt(hrDims?.width_mm?.mean), ratio: fmt(hrDims?.aspect_ratio?.mean), highlight: true },
                    ];
                    return (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-50 to-white border-b">
                            <th className="text-left py-2.5 px-3 font-semibold text-gray-600">Metric</th>
                            <th className="text-right py-2.5 px-3 font-semibold text-gray-600">Length (mm)</th>
                            <th className="text-right py-2.5 px-3 font-semibold text-gray-600">Width (mm)</th>
                            <th className="text-right py-2.5 px-3 font-semibold text-gray-600">Aspect Ratio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr key={row.label} className={`border-b last:border-0 hover:bg-gradient-to-r hover:from-rice-primary/5 hover:to-rice-secondary/5 transition-colors duration-200 ${row.highlight ? "bg-rice-primary/10 font-semibold border-t-2 border-t-rice-primary/20" : ""}`}>
                              <td className="py-2.5 px-3 text-gray-700">{row.label}</td>
                              <td className="py-2.5 px-3 text-right tabular-nums font-mono text-gray-800">{row.length}</td>
                              <td className="py-2.5 px-3 text-right tabular-nums font-mono text-gray-800">{row.width}</td>
                              <td className="py-2.5 px-3 text-right tabular-nums font-mono text-gray-800">{row.ratio}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })() : (
                    <p className="text-sm text-gray-400 py-4 text-center">No dimension statistics available</p>
                  )}
                </CardContent>
              </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Post-Machine Decision Dialog (Series Mode) */}
        <Dialog open={showPostMachineDialog} onOpenChange={() => {}}>
          <DialogContent
            className="sm:max-w-lg"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-6 h-6 text-green-600" />
                Machine Complete
              </DialogTitle>
            </DialogHeader>

            {/* Completion summary */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-800 font-semibold text-center text-base">
                {justCompletedMachine}
              </p>
              <p className="text-green-600 text-center text-sm mt-1">
                All {noOfSamples} trial(s) completed successfully
              </p>
            </div>

            {/* Machine sequence progress */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center font-medium uppercase tracking-wide">
                Series Progress — &quot;{selectedSeries}&quot;
              </p>
              <div className="space-y-2">
                {displayedMachines.map((m, idx) => {
                  const done = completedSeriesMachines.includes(m);
                  const isNext = idx === completedSeriesMachines.length;
                  return (
                    <div
                      key={m}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        done
                          ? "bg-green-50 border border-green-200"
                          : isNext
                            ? "bg-blue-50 border-2 border-blue-400 shadow-sm"
                            : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        done
                          ? "bg-green-500 text-white"
                          : isNext
                            ? "bg-blue-500 text-white animate-pulse"
                            : "bg-gray-300 text-gray-600"
                      }`}>
                        {done ? "\u2713" : idx + 1}
                      </div>
                      <span className={`text-sm font-medium flex-1 ${
                        done ? "text-green-700" : isNext ? "text-blue-700" : "text-gray-500"
                      }`}>
                        {m}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        done
                          ? "bg-green-100 text-green-700"
                          : isNext
                            ? "bg-blue-100 text-blue-700 font-semibold"
                            : "bg-gray-100 text-gray-500"
                      }`}>
                        {done ? "Done" : isNext ? "Next" : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              {(() => {
                const remaining = displayedMachines.filter(
                  (m) => !completedSeriesMachines.includes(m)
                );
                const nextMachine = remaining[0] || "";
                return (
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-base shadow-md"
                    size="lg"
                    onClick={() => {
                      setShowPostMachineDialog(false);
                      setSelectedMachine(nextMachine);
                      setActiveStep("preparation");
                      toast({
                        title: `Proceeding to ${nextMachine}`,
                        description: `${remaining.length} of ${displayedMachines.length} machine(s) remaining.`,
                        duration: 3000,
                      });
                    }}
                  >
                    <Factory className="w-5 h-5 mr-2" />
                    Start Next Machine — {nextMachine}
                  </Button>
                );
              })()}
              <Button
                variant="ghost"
                className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 text-sm"
                disabled={quittingSeries}
                onClick={async () => {
                  const modeId = seriesModeId || sessionStorage.getItem("production_series_mode_id");
                  if (modeId) {
                    setQuittingSeries(true);
                    try {
                      const res = await fetch(
                        `${BACKEND_URL}/api/raice_labz/modes/${modeId}/quit-series`,
                        { method: "POST" }
                      );
                      const data = await res.json();
                      if (data.status === "success") {
                        setSeriesWasQuit(true);
                        setShowPostMachineDialog(false);
                        markStepComplete("live");
                        toast({
                          title: "Series Quit",
                          description: "Partial results saved. You can restart this series later.",
                          duration: 4000,
                        });
                      } else {
                        toast({
                          title: "Error",
                          description: data.message || "Failed to quit series",
                          variant: "destructive",
                        });
                      }
                    } catch (err) {
                      toast({
                        title: "Error",
                        description: "Failed to quit series. Please try again.",
                        variant: "destructive",
                      });
                    } finally {
                      setQuittingSeries(false);
                    }
                  }
                }}
              >
                <LogOut className="w-4 h-4 mr-1" />
                {quittingSeries ? "Quitting..." : "Quit Series Early"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ProductionAnalysis;
