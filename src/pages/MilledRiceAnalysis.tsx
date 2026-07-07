import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAnalysis } from "@/contexts/AnalysisContext";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
  Wheat,
  ClipboardList,
  Zap,
  BarChart3,
  CheckCircle,
  CheckCircle2,
  Circle,
  Star,
  Activity,
  MapPin,
  ChevronsUpDown,
  Settings,
  Play,
  Download,
} from "lucide-react";
import ProcurementLiveAnalysis from "./ProcurementLiveAnalysis";
import { buildReportFilename } from "@/lib/reportFilename";

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

const SAMPLING_POINTS = [
  "Silky 1",
  "Silky 2",
  "Silky 3",
  "Grader 1",
  "Grader 2",
  "Sortex 1",
  "Sortex 2",
  "Color Sorter",
  "Length Grader",
  "Destoner",
];

const BASMATI_ANNOTATIONS = [
  "Head", "Second One", "Tibar", "Dubar", "Mongra", "Mini Mongra", "Nakku", "Discoloured", "Chalky",
];

const NON_BASMATI_ANNOTATIONS = [
  "Head", "3/4 Broken", "1/2 Broken", "Tips", "Discoloured", "Chalky", "FRK",
];

// Quality indicator metrics (top row)
const BASMATI_QUALITY_INDICATORS = [
  { key: "wi", label: "WI", unit: "", border: "border-blue-200", bg: "bg-gradient-to-br from-blue-50 to-indigo-50", textColor: "text-blue-700" },
  { key: "translucency", label: "Translucency", unit: "%", border: "border-sky-200", bg: "bg-gradient-to-br from-sky-50 to-cyan-50", textColor: "text-sky-700" },
  { key: "dom", label: "DOM", unit: "", border: "border-violet-200", bg: "bg-gradient-to-br from-violet-50 to-purple-50", textColor: "text-violet-700" },
  { key: "don", label: "DON", unit: "%", border: "border-indigo-200", bg: "bg-gradient-to-br from-indigo-50 to-blue-50", textColor: "text-indigo-700" },
];

const NON_BASMATI_QUALITY_INDICATORS = [
  { key: "wi", label: "WI", unit: "", border: "border-blue-200", bg: "bg-gradient-to-br from-blue-50 to-indigo-50", textColor: "text-blue-700" },
  { key: "moisture", label: "Moisture", unit: "%", border: "border-sky-200", bg: "bg-gradient-to-br from-sky-50 to-cyan-50", textColor: "text-sky-700" },
];

// Main classification metrics (second row - with progress bars)
const BASMATI_CLASSIFICATION_METRICS = [
  { key: "headRice", label: "Head Rice", unit: "%", border: "border-blue-200", bg: "bg-gradient-to-br from-blue-50 to-indigo-50", textColor: "text-blue-700", barColor: "bg-blue-500" },
  { key: "totalBroken", label: "Broken Rice", unit: "%", border: "border-yellow-200", bg: "bg-gradient-to-br from-yellow-50 to-amber-50", textColor: "text-yellow-700", barColor: "bg-yellow-500" },
  { key: "chalky", label: "Chalky", unit: "%", border: "border-blue-300", bg: "bg-gradient-to-br from-blue-50 to-sky-50", textColor: "text-blue-600", barColor: "bg-blue-400" },
  { key: "discoloured", label: "Discoloured", unit: "%", border: "border-indigo-200", bg: "bg-gradient-to-br from-indigo-50 to-blue-50", textColor: "text-indigo-700", barColor: "bg-indigo-500" },
];

const NON_BASMATI_CLASSIFICATION_METRICS = [
  { key: "headRice", label: "Head Rice", unit: "%", border: "border-blue-200", bg: "bg-gradient-to-br from-blue-50 to-indigo-50", textColor: "text-blue-700", barColor: "bg-blue-500" },
  { key: "totalBroken", label: "Broken Rice", unit: "%", border: "border-yellow-200", bg: "bg-gradient-to-br from-yellow-50 to-amber-50", textColor: "text-yellow-700", barColor: "bg-yellow-500" },
  { key: "chalky", label: "Chalky", unit: "%", border: "border-blue-300", bg: "bg-gradient-to-br from-blue-50 to-sky-50", textColor: "text-blue-600", barColor: "bg-blue-400" },
  { key: "discoloured", label: "Discoloured", unit: "%", border: "border-indigo-200", bg: "bg-gradient-to-br from-indigo-50 to-blue-50", textColor: "text-indigo-700", barColor: "bg-indigo-500" },
];

// Detailed breakdown params (grid below)
const BASMATI_BREAKDOWN_PARAMS = [
  { key: "headRice", label: "Head Rice", unit: "%" },
  { key: "secondOne", label: "Second One", unit: "%" },
  { key: "tibar", label: "Tibar", unit: "%" },
  { key: "dubar", label: "Dubar", unit: "%" },
  { key: "miniDubar", label: "Mini Dubar", unit: "%" },
  { key: "mongra", label: "Mongra", unit: "%" },
  { key: "miniMongra", label: "Mini Mongra", unit: "%" },
  { key: "nakku", label: "Nakku", unit: "%" },
];

const NON_BASMATI_BREAKDOWN_PARAMS = [
  { key: "threeQuarterBroken", label: "3/4 Broken", unit: "%" },
  { key: "halfBroken", label: "1/2 Broken", unit: "%" },
  { key: "tips", label: "Tips", unit: "%" },
  { key: "immature", label: "Immature", unit: "%" },
  { key: "foreignMatter", label: "Foreign Matter", unit: "%" },
  { key: "frkDetails", label: "FRK Details", unit: "" },
];

type StepId = "category" | "preparation" | "live" | "reports";
type CategoryType = "basmati" | "non-basmati" | "";

interface StepState {
  category: boolean;
  preparation: boolean;
  live: boolean;
  reports: boolean;
}

interface DimensionStat {
  mean: number | null;
  mode: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  std: number | null;
}

interface ShortStat {
  mean: number | null;
  median: number | null;
}

interface DimensionGroup {
  length_mm: DimensionStat;
  width_mm: DimensionStat;
  aspect_ratio: DimensionStat;
}

interface HeadRiceDimensionGroup {
  length_mm: ShortStat;
  width_mm: ShortStat;
  aspect_ratio: ShortStat;
}

interface TrialDimensionStats {
  trialNumber: number;
  grainCount: number;
  dimensions: DimensionGroup;
  headRiceDimensions: HeadRiceDimensionGroup;
  averageWhitenessIndex?: number;
}

interface DimensionStatsResponse {
  modeId: string;
  totalGrains: number;
  trialStats: Record<string, TrialDimensionStats>;
  overallStats: {
    grainCount: number;
    dimensions: DimensionGroup;
    headRiceDimensions: HeadRiceDimensionGroup;
    averageWhitenessIndex?: number;
  };
}

interface GrainMetrics {
  goodRice: {
    headRice: number; threeFourthHead: number; halfBrokens: number;
    quarterFineBrokens: number; tips: number;
    secondOne?: number; tibar?: number; dubar?: number;
    miniDubar?: number; mongra?: number; miniMongra?: number; nakku?: number;
  };
  rejections: { chalky?: number; discolored?: number; immature?: number; [k: string]: unknown };
  foreignMatter: { total?: number; [k: string]: unknown };
  totalGrains: number;
}

interface TrialData {
  trialId: string;
  trialNumber: number;
  sessionStatus: string;
  GrainMetrics?: GrainMetrics;
  qualityMetrics?: GrainMetrics;
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

function computeOutputParams(metrics: GrainMetrics, whitenessIndex?: number): OutputParams {
  const total = metrics.totalGrains || 1;
  const gr = metrics.goodRice || {} as GrainMetrics["goodRice"];
  const rej = metrics.rejections || {} as GrainMetrics["rejections"];
  const fm = metrics.foreignMatter || {} as GrainMetrics["foreignMatter"];
  const headRice = (gr.headRice || 0) + (gr.threeFourthHead || 0) + (gr.secondOne || 0) + (gr.tibar || 0);
  const broken = (gr.halfBrokens || 0) + (gr.quarterFineBrokens || 0) + (gr.tips || 0)
    + (gr.dubar || 0) + (gr.miniDubar || 0) + (gr.mongra || 0) + (gr.miniMongra || 0) + (gr.nakku || 0);
  return {
    headRicePct: +((headRice / total) * 100).toFixed(1),
    brokenRicePct: +((broken / total) * 100).toFixed(1),
    whitenessIndex: whitenessIndex || 0,
    discolouredPct: +(((rej.discolored as number || 0) / total) * 100).toFixed(1),
    immaturePct: +(((rej.immature as number || 0) / total) * 100).toFixed(1),
    chalkyPct: +(((rej.chalky as number || 0) / total) * 100).toFixed(1),
    foreignMatterPct: +(((fm.total as number || 0) / total) * 100).toFixed(1),
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
      headRice: avg(["goodRice", "headRice"]), threeFourthHead: avg(["goodRice", "threeFourthHead"]),
      halfBrokens: avg(["goodRice", "halfBrokens"]), quarterFineBrokens: avg(["goodRice", "quarterFineBrokens"]),
      tips: avg(["goodRice", "tips"]), secondOne: avg(["goodRice", "secondOne"]), tibar: avg(["goodRice", "tibar"]),
      dubar: avg(["goodRice", "dubar"]), miniDubar: avg(["goodRice", "miniDubar"]),
      mongra: avg(["goodRice", "mongra"]), miniMongra: avg(["goodRice", "miniMongra"]), nakku: avg(["goodRice", "nakku"]),
    },
    rejections: { chalky: avg(["rejections", "chalky"]), discolored: avg(["rejections", "discolored"]), immature: avg(["rejections", "immature"]) },
    foreignMatter: { total: avg(["foreignMatter", "total"]) },
    totalGrains: Math.round(completed.reduce((s, t) => s + (t.GrainMetrics?.totalGrains || 0), 0) / n),
  };
}

const BASMATI_PROCESSES = ["Golden Sella", "White Sella", "Lemon Sella", "SW Sella", "Cream Steam", "Lemon Steam", "Parboiled"];

const MilledRiceAnalysis = () => {
  const { toast } = useToast();
  const { hasStartedAnalysis } = useAnalysis();
  const [activeStep, setActiveStep] = useState<StepId>("preparation");
  const [completedSteps, setCompletedSteps] = useState<StepState>({
    category: true,
    preparation: false,
    live: false,
    reports: false,
  });

  const [millRegion] = useState<string>(() => localStorage.getItem("riceMill_region") ?? "non-basmati");
  // Category is now driven by mill region from Settings (no manual selection)
  const [category, setCategory] = useState<CategoryType>("non-basmati");

  // Test Information (left card)
  const [operatorName, setOperatorName] = useState(() => localStorage.getItem(RICE_MILL_STORAGE_KEYS.operatorName) ?? "");
  const [riceMill, setRiceMill] = useState(() => localStorage.getItem(RICE_MILL_STORAGE_KEYS.millName) ?? "");
  const [location, setLocation] = useState(() => localStorage.getItem(RICE_MILL_STORAGE_KEYS.location) ?? "");
  const [locationSearchOpen, setLocationSearchOpen] = useState(false);
  const [locationSearchText, setLocationSearchText] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [saving, setSaving] = useState(false);

  // Grain Information (right card)
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
  const [sampleMode, setSampleMode] = useState<"weight" | "count">("weight");
  const [sampleWeight, setSampleWeight] = useState("50 grams");
  const [freeWeightInput, setFreeWeightInput] = useState("");

  // Analysis Parameters
  const [enableChalky, setEnableChalky] = useState(true);
  const [enableDiscolored, setEnableDiscolored] = useState(true);
  const [chalkyThreshold, setChalkyThreshold] = useState("20");
  const [includeDetailedChalky, setIncludeDetailedChalky] = useState(false);

  // ID Generation
  const [idGeneration, setIdGeneration] = useState<"auto" | "custom">("auto");
  const [customId, setCustomId] = useState("");

  // Reports tab state
  const [activeReportSample, setActiveReportSample] = useState("sample-1");
  const [dimensionStats, setDimensionStats] = useState<DimensionStatsResponse | null>(null);
  const [reportTrials, setReportTrials] = useState<TrialData[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [trialVideos, setTrialVideos] = useState<Record<string, boolean>>({});
  const [showReplay, setShowReplay] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);

  // Fetch trial data and dimension stats when entering reports step
  useEffect(() => {
    if (activeStep !== "reports") return;
    const modeId = sessionStorage.getItem("mode_id");
    if (!modeId) return;

    let cancelled = false;
    setReportLoading(true);
    const fetchData = async () => {
      try {
        const [trialsRes, statsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/raice_labz/analysis/mode/${modeId}/trials`),
          fetch(`${BACKEND_URL}/api/raice_labz/grains/mode/${modeId}/statistics`),
        ]);
        if (cancelled) return;

        const trialsJson = await trialsRes.json();
        if (trialsJson.status === "success" && trialsJson.data?.trials) {
          setReportTrials(trialsJson.data.trials as TrialData[]);
        }

        const statsJson = await statsRes.json();
        if (statsJson.status === "success" && statsJson.data) {
          setDimensionStats(statsJson.data as DimensionStatsResponse);
        }

        // Check which trials have replay videos
        try {
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
        } catch {
          // Video check is non-critical; ignore errors
        }
      } catch (e) {
        console.error("Error fetching report data:", e);
      } finally {
        if (!cancelled) setReportLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [activeStep]);

  const currentDimStats = useMemo(() => {
    if (!dimensionStats) return null;
    if (activeReportSample === "average") return dimensionStats.overallStats;
    const trialKey = activeReportSample.replace("sample-", "");
    return dimensionStats.trialStats[trialKey] ?? dimensionStats.overallStats;
  }, [dimensionStats, activeReportSample]);

  const currentOutputParams: OutputParams | null = useMemo(() => {
    if (reportTrials.length === 0) return null;
    if (activeReportSample === "average") {
      const whiteness = dimensionStats?.overallStats?.averageWhitenessIndex;
      return computeOutputParams(averageMetrics(reportTrials), whiteness);
    }
    const idx = parseInt(activeReportSample.replace("sample-", ""), 10) - 1;
    const trial = reportTrials[idx];
    if (!trial?.GrainMetrics) return null;
    const trialKey = activeReportSample.replace("sample-", "");
    const whiteness = dimensionStats?.trialStats[trialKey]?.averageWhitenessIndex;
    return computeOutputParams(trial.GrainMetrics, whiteness);
  }, [reportTrials, activeReportSample, dimensionStats]);

  // Derive whether current tab has a video (hide on "average" tab)
  const isAverageTab = activeReportSample === "average";
  const currentTrialForVideo = isAverageTab ? "" : activeReportSample.replace("sample-", "");
  const videoExists = !isAverageTab && Object.keys(trialVideos).length > 0;
  const currentVideoTrial = trialVideos[currentTrialForVideo] ? currentTrialForVideo : Object.keys(trialVideos)[0];

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

  const persistRiceMillInfo = useCallback(async (options: { showToast?: boolean } = {}) => {
    setSaving(true);
    try {
      const getRes = await fetch("/api/raice_labz/settings/rice-mill");
      const getData = await getRes.json();
      const current = getRes.ok && getData.status === "success" && getData.settings ? getData.settings : {};
      const payload = {
        operatorName: (operatorName.trim() || current.operatorName) ?? "",
        location: (location.trim() || current.location) ?? "",
        riceMillName: (riceMill.trim() || current.riceMillName) ?? "",
        region: current.region ?? "non-basmati",
        lines: current.lines ?? [],
        currentLineIndex: current.currentLineIndex ?? 0,
        lineOutput: current.lineOutput ?? "",
        machines: current.machines ?? [],
      };
      const response = await fetch("/api/raice_labz/settings/rice-mill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to save mill settings");
      }
      localStorage.setItem(RICE_MILL_STORAGE_KEYS.operatorName, operatorName.trim());
      localStorage.setItem(RICE_MILL_STORAGE_KEYS.location, location.trim());
      localStorage.setItem(RICE_MILL_STORAGE_KEYS.millName, riceMill.trim());
      if (options.showToast) {
        toast({
          title: "Mill information saved",
          description: "Settings saved to database successfully",
          duration: 3000,
        });
      }
      return true;
    } catch (err) {
      console.error("MilledRiceAnalysis persist rice mill:", err);
      if (options.showToast) {
        toast({
          title: "Failed to save mill information",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
          duration: 3000,
        });
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [operatorName, riceMill, location, toast]);

  // Date/time initialization
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
    sessionStorage.removeItem("mode_id");
    sessionStorage.removeItem("pending_analysis_config");
  }, []);

  // Load rice mill settings from backend
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/raice_labz/settings/rice-mill");
        if (cancelled || !response.ok) return;
        const data = await response.json();
        if (cancelled || data.status !== "success" || !data.settings) return;
        const s = data.settings;
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
        // Set category from mill region (configured in Settings page)
        const region = s.region || "non-basmati";
        setCategory(region as CategoryType);
      } catch (e) {
        if (!cancelled) console.error("Failed to fetch rice mill settings:", e);
      }
    };
    load();
    return () => { cancelled = true; };
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
            const match = data.varieties.find((v: string) => v.toLowerCase() === prev.trim().toLowerCase());
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
    return () => { cancelled = true; };
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
              const match = data.processes.find((p: string) => p.toLowerCase() === prev.trim().toLowerCase());
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
    return () => { cancelled = true; };
  }, [variety, millRegion]);

  // Load harvest seasons when variety + process changes
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
              const match = data.harvestSeasons.find((s: string) => s.toLowerCase() === prev.trim().toLowerCase());
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
    return () => { cancelled = true; };
  }, [variety, process]);

  // Load months when variety + process + harvest season changes
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
              const match = data.months.find((m: string) => m.toLowerCase() === prev.trim().toLowerCase());
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
    return () => { cancelled = true; };
  }, [variety, process, harvestSeason]);

  // Sync selected values to title-case from API options
  useEffect(() => {
    if (varietiesFromDb.length > 0 && variety?.trim()) {
      const match = varietiesFromDb.find((v) => v.toLowerCase() === variety.trim().toLowerCase());
      if (match && match !== variety) setVariety(match);
    }
  }, [varietiesFromDb, variety]);
  useEffect(() => {
    if (processesForVariety.length > 0 && process?.trim()) {
      const match = processesForVariety.find((p) => p.toLowerCase() === process.trim().toLowerCase());
      if (match && match !== process) setProcess(match);
    }
  }, [processesForVariety, process]);
  useEffect(() => {
    if (harvestSeasonsFromDb.length > 0 && harvestSeason?.trim()) {
      const match = harvestSeasonsFromDb.find((s) => s.toLowerCase() === harvestSeason.trim().toLowerCase());
      if (match && match !== harvestSeason) setHarvestSeason(match);
    }
  }, [harvestSeasonsFromDb, harvestSeason]);
  useEffect(() => {
    if (monthsFromDb.length > 0 && month?.trim()) {
      const match = monthsFromDb.find((m) => m.toLowerCase() === month.trim().toLowerCase());
      if (match && match !== month) setMonth(match);
    }
  }, [monthsFromDb, month]);

  const handleGenerateReport = async () => {
    const modeId = sessionStorage.getItem("mode_id");
    if (!modeId) {
      toast({ title: "No mode ID found", description: "Cannot generate report without a mode ID.", variant: "destructive" });
      return;
    }
    setReportGenerating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/generate-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode_id: modeId, report_type: "milled-rice", include_detailed_chalky: includeDetailedChalky }),
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
        reportType: "milled-rice",
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
      toast({ title: "Report downloaded", description: "Milled Rice report saved successfully." });
    } catch (err) {
      console.error("Report generation error:", err);
      toast({ title: "Report generation failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setReportGenerating(false);
    }
  };

  const handleStepChange = (step: StepId) => {
    if (hasStartedAnalysis && activeStep === "live" && step !== "live") return;
    if (step === "preparation" && !completedSteps.category) return;
    if (step === "live" && !completedSteps.preparation) return;
    if (step === "reports" && !completedSteps.live) return;
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
        // Persist rice mill info first
        await persistRiceMillInfo();

        const resolvedWeight = (sampleWeight === "free weight" || sampleWeight === "free count") ? freeWeightInput : sampleWeight.replace(/ grams| grains/g, "");
        const existingModeId = sessionStorage.getItem("mode_id");

        // If a mode_id already exists, this is sample 2+ — reuse it, don't create new mode
        if (existingModeId) {
          sessionStorage.setItem("chalky_threshold", chalkyThreshold);
          sessionStorage.setItem("analysis_params", JSON.stringify({ enableChalky, enableDiscolored, chalkyThreshold: enableChalky ? parseFloat(chalkyThreshold) || 20 : null }));
          sessionStorage.setItem("milled_rice_sample_weight", resolvedWeight);
          sessionStorage.removeItem("pending_analysis_config");
          console.log("📝 Reusing existing modeId for next sample:", existingModeId);
        } else {
        // Build the request body for the milled-rice-analysis endpoint
        const requestBody = {
          modeType: "milled-rice",
          idGeneration,
          customId: idGeneration === "custom" ? customId : null,
          variety,
          process,
          harvestSeason,
          month,
          operatorName: operatorName.trim(),
          riceMill: riceMill.trim(),
          location: location.trim(),
          testDate: currentDate,
          testTime: currentTime,
          category,
          noOfSamples,
          sampleWeight: resolvedWeight,
          sampleSizeMode: sampleMode,
          chalkyThreshold: enableChalky ? parseFloat(chalkyThreshold) || 20 : null,
          analysisParameters: { enableChalky, enableDiscolored, chalkyThreshold: enableChalky ? parseFloat(chalkyThreshold) || 20 : null },
        };

        // Store pending analysis config in sessionStorage (same pattern as ProcurementAnalysis)
        const pendingConfig = {
          analysisType: "milled-rice",
          endpoint: `${BACKEND_URL}/api/raice_labz/modes/milled-rice-analysis`,
          requestBody,
        };
        sessionStorage.setItem("pending_analysis_config", JSON.stringify(pendingConfig));

        // Also store individual fields for easy access
        sessionStorage.setItem("analysis_type", "milled-rice");
        sessionStorage.setItem("milled_rice_variety", variety);
        sessionStorage.setItem("milled_rice_process", process);
        sessionStorage.setItem("milled_rice_harvest_season", harvestSeason);
        sessionStorage.setItem("milled_rice_month", month);
        sessionStorage.setItem("milled_rice_rice_mill", riceMill.trim());
        sessionStorage.setItem("milled_rice_operator", operatorName.trim());
        sessionStorage.setItem("milled_rice_location", location.trim());
        sessionStorage.setItem("milled_rice_date", currentDate);
        sessionStorage.setItem("milled_rice_time", currentTime);
        sessionStorage.setItem("milled_rice_category", category);
        sessionStorage.setItem("milled_rice_no_of_samples", noOfSamples);
        sessionStorage.setItem("milled_rice_sample_weight", resolvedWeight);
        sessionStorage.setItem("chalky_threshold", chalkyThreshold);
        sessionStorage.setItem("analysis_params", JSON.stringify({ enableChalky, enableDiscolored, chalkyThreshold: enableChalky ? parseFloat(chalkyThreshold) || 20 : null }));
        sessionStorage.setItem("milled_rice_id_generation", idGeneration);
        if (idGeneration === "custom") {
          sessionStorage.setItem("milled_rice_custom_id", customId);
        }

        console.log("Stored milled-rice analysis config in sessionStorage");
        console.log("Pending config:", JSON.stringify(pendingConfig, null, 2));
        } // end else (first sample — create new mode)
      } catch (err) {
        console.error("Failed to prepare milled-rice analysis config:", err);
        toast({
          title: "Failed to prepare analysis",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
        return;
      }
    }

    setCompletedSteps((prev) => ({
      ...prev,
      [step]: true,
      ...(step === "category" ? {} : null),
      ...(step === "preparation" ? { live: prev.live } : null),
      ...(step === "live" ? { reports: prev.reports } : null),
    }));

    if (step === "preparation") {
      setActiveStep("live");
    } else if (step === "live") {
      setActiveStep("reports");
    }
  };

  const allCompleted = completedSteps.category && completedSteps.preparation && completedSteps.live && completedSteps.reports;

  const isPreparationComplete =
    riceMill.trim() !== "" &&
    operatorName.trim() !== "" &&
    location.trim() !== "" &&
    currentDate !== "" &&
    currentTime !== "" &&
    variety.trim() !== "" &&
    process.trim() !== "" &&
    harvestSeason.trim() !== "" &&
    noOfSamples.trim() !== "" &&
    sampleWeight.trim() !== "" &&
    (sampleWeight !== "free weight" && sampleWeight !== "free count" || freeWeightInput.trim() !== "");

  const categoryLabel = category === "basmati" ? "Basmati" : category === "non-basmati" ? "Non-Basmati" : "";
  const categoryColor = category === "basmati" ? "green" : "amber";

  const qualityIndicators = category === "basmati" ? BASMATI_QUALITY_INDICATORS : NON_BASMATI_QUALITY_INDICATORS;
  const classificationMetrics = category === "basmati" ? BASMATI_CLASSIFICATION_METRICS : NON_BASMATI_CLASSIFICATION_METRICS;
  const breakdownParams = category === "basmati" ? BASMATI_BREAKDOWN_PARAMS : NON_BASMATI_BREAKDOWN_PARAMS;
  const sampleCount = parseInt(noOfSamples, 10) || 1;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Milled Rice Quality Analysis"
        subtitle="Analyze milled rice quality with category-specific parameters and annotations."
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Tabs value={activeStep} onValueChange={(v) => handleStepChange(v as StepId)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger
              value="preparation"
              disabled={activeStep === "reports"}
              className="flex items-center gap-2"
            >
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
              {completedSteps.live && <CheckCircle2 className="w-3 h-3 text-rice-primary ml-1" />}
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              disabled={!completedSteps.live}
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Insights &amp; Reports</span>
              {completedSteps.reports && <CheckCircle2 className="w-3 h-3 text-rice-primary ml-1" />}
            </TabsTrigger>
          </TabsList>

          {/* ─── Step 1: Test Preparation ─── */}
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
                      <Label htmlFor="grain-variety">Variety <span className="text-rice-primary">*</span></Label>
                      <Select
                        value={variety || ""}
                        onValueChange={(v) => {
                          setVariety(v);
                          setProcess("");
                        }}
                        disabled={varietiesLoading}
                      >
                        <SelectTrigger id="grain-variety">
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
                          Add varieties in Grain Database first; only DB varieties appear here.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="grain-process">Process <span className="text-rice-primary">*</span></Label>
                      <Select
                        value={process || ""}
                        onValueChange={(v) => {
                          setProcess(v);
                          setHarvestSeason("");
                        }}
                        disabled={!variety || processesLoading}
                      >
                        <SelectTrigger id="grain-process">
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
                      {variety && processesForVariety.length === 0 && !processesLoading && (
                        <p className="text-xs text-amber-600">
                          No processes in database for this variety. Add in Grain Database.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="grain-harvest-season">Harvest Season <span className="text-rice-primary">*</span></Label>
                      <Select
                        value={harvestSeason || ""}
                        onValueChange={(v) => {
                          setHarvestSeason(v);
                          setMonth("");
                        }}
                        disabled={!variety || !process || harvestSeasonsLoading}
                      >
                        <SelectTrigger id="grain-harvest-season">
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
                      {variety && process && harvestSeasonsFromDb.length === 0 && !harvestSeasonsLoading && (
                        <p className="text-xs text-amber-600">
                          No harvest seasons in database for this variety + process. Add in Grain Database.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="grain-month">Month (optional)</Label>
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
                        <SelectTrigger id="grain-month">
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
                            No months in database for this combination. Add in Grain Database.
                          </p>
                        )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="grain-no-samples">No. of Samples (1-3) <span className="text-rice-primary">*</span></Label>
                      <Input
                        id="grain-no-samples"
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
                            setNoOfSamples(String(Math.min(3, Math.max(1, n))));
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
                              <RadioGroupItem value="weight" id="mr-sample-mode-weight" />
                              <Label htmlFor="mr-sample-mode-weight" className="cursor-pointer font-normal text-sm">By Weight</Label>
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
                              <RadioGroupItem value="count" id="mr-sample-mode-count" />
                              <Label htmlFor="mr-sample-mode-count" className="cursor-pointer font-normal text-sm">By Count</Label>
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

            {isPreparationComplete && (
              <div className="mt-6 flex justify-center">
                <Button
                  className="bg-rice-primary hover:bg-rice-primary/90 px-8"
                  onClick={() => markStepComplete("preparation")}
                  disabled={idGeneration === "custom" && (!customId || customId.length !== 4)}
                >
                  Launch Vision System
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ─── Step 3: Vision Feed ─── */}
          <TabsContent value="live" className="mt-2">
            {/* Category scanning banner */}
            <div className="flex items-center justify-center rounded-lg px-4 py-3 mb-4 bg-rice-primary/5 border border-rice-primary/20">
              <Zap className="w-5 h-5 mr-2 text-rice-primary" />
              <span className="font-semibold text-sm tracking-wide uppercase text-rice-primary">
                Scanning Milled Rice - {categoryLabel} Mode
              </span>
            </div>

            <ProcurementLiveAnalysis
              embedded={true}
              analysisDataOverride={{
                analysisType: "milled-rice",
                variety,
                process,
                noOfSamples: parseInt(noOfSamples, 10),
                sampleWeight: (sampleWeight === "free weight" || sampleWeight === "free count") ? freeWeightInput : sampleWeight.replace(/ grams| grains/g, ""),
                sampleSizeMode: sampleMode,
                category,
              }}
              onComplete={() => markStepComplete("live")}
            />
          </TabsContent>

          {/* ─── Step 3: Insights & Reports ─── */}
          <TabsContent value="reports" className="mt-2 space-y-4">
            {/* ── Session Replay ────────────────────────────────────── */}
            {videoExists && (
              <Card id="mr-session-replay">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-rice-primary text-base flex items-center gap-2">
                      <Play className="w-5 h-5" />
                      Session Replay
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowReplay(!showReplay)}
                    >
                      {showReplay ? "Hide" : "Show"} Replay
                    </Button>
                  </div>
                </CardHeader>
                {showReplay && (
                  <CardContent>
                    {/* Per-trial video tabs */}
                    {Object.keys(trialVideos).length > 1 && (
                      <div className="flex gap-2 mb-3">
                        {Object.keys(trialVideos).sort().map((tNum) => (
                          <button
                            key={tNum}
                            onClick={() => setActiveReportSample(`sample-${tNum}`)}
                            className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
                              currentTrialForVideo === tNum
                                ? "border-rice-primary bg-rice-primary/10 text-rice-primary"
                                : "border-gray-200 text-gray-500 hover:border-gray-400"
                            }`}
                          >
                            Trial {tNum}
                          </button>
                        ))}
                      </div>
                    )}
                    <video
                      key={currentVideoTrial}
                      controls
                      preload="metadata"
                      className="w-full rounded-lg max-h-[400px] bg-black"
                      src={`${BACKEND_URL}/api/raice_labz/sessions/video/${sessionStorage.getItem("mode_id")}?trial=${currentVideoTrial || "1"}`}
                    >
                      Your browser does not support video playback.
                    </video>
                    <p className="text-[10px] text-muted-foreground mt-2 text-center">
                      First playback may take a few seconds while the video is prepared.
                    </p>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Category-colored completion banner */}
            <div
              className={`flex items-center justify-center rounded-lg px-4 py-3 ${
                category === "basmati"
                  ? "bg-blue-50 border border-blue-200"
                  : "bg-yellow-50 border border-yellow-200"
              }`}
            >
              <CheckCircle
                className={`w-5 h-5 mr-2 ${
                  category === "basmati" ? "text-blue-600" : "text-yellow-600"
                }`}
              />
              <span
                className={`font-semibold text-sm ${
                  category === "basmati" ? "text-blue-700" : "text-yellow-700"
                }`}
              >
                Milled Rice Analysis Complete - {categoryLabel}
              </span>
            </div>

            {/* Sample Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              {Array.from({ length: sampleCount }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => setActiveReportSample(`sample-${num}`)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                    activeReportSample === `sample-${num}`
                      ? "border-rice-primary text-rice-primary bg-white"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Sample {num}
                </button>
              ))}
              {sampleCount > 1 && (
                <button
                  onClick={() => setActiveReportSample("average")}
                  className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                    activeReportSample === "average"
                      ? "border-rice-primary text-rice-primary bg-white"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Average
                </button>
              )}
              <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Vision Scan Complete
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-stretch">
              {/* ── Left Column: Main Content ──────────────────────── */}
              <div className="space-y-4 h-full flex flex-col">
                {/* Quality Metrics Card */}
                <Card className="shadow-sm flex-1">
                  <CardHeader className="pb-3 bg-gradient-to-r from-rice-primary/5 to-rice-secondary/5 border-b">
                    <CardTitle className="text-rice-primary text-base flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Quality Metrics Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {currentOutputParams ? [
                        { label: "Headrice", value: currentOutputParams.headRicePct, unit: "%", border: "border-blue-200", bg: "bg-gradient-to-br from-blue-50 to-indigo-50", textColor: "text-blue-700", barColor: "bg-blue-500" },
                        { label: "Brokens", value: currentOutputParams.brokenRicePct, unit: "%", border: "border-yellow-200", bg: "bg-gradient-to-br from-yellow-50 to-amber-50", textColor: "text-yellow-700", barColor: "bg-yellow-500" },
                        { label: "Chalky", value: currentOutputParams.chalkyPct, unit: "%", border: "border-blue-300", bg: "bg-gradient-to-br from-blue-50 to-sky-50", textColor: "text-blue-600", barColor: "bg-blue-400" },
                        { label: "Discolored", value: currentOutputParams.discolouredPct, unit: "%", border: "border-indigo-200", bg: "bg-gradient-to-br from-indigo-50 to-blue-50", textColor: "text-indigo-700", barColor: "bg-indigo-500" },
                        { label: "Rejections", value: +(currentOutputParams.chalkyPct + currentOutputParams.discolouredPct + currentOutputParams.immaturePct).toFixed(1), unit: "%", border: "border-purple-200", bg: "bg-gradient-to-br from-purple-50 to-indigo-50", textColor: "text-purple-700", barColor: "bg-purple-500" },
                        { label: "Foreignmatter", value: currentOutputParams.foreignMatterPct, unit: "%", border: "border-yellow-300", bg: "bg-gradient-to-br from-amber-50 to-yellow-50", textColor: "text-amber-700", barColor: "bg-amber-500" },
                        { label: "Immature", value: currentOutputParams.immaturePct, unit: "%", border: "border-sky-200", bg: "bg-gradient-to-br from-sky-50 to-blue-50", textColor: "text-sky-700", barColor: "bg-sky-500" },
                        { label: "Total grains", value: currentOutputParams.totalGrains, unit: "", border: "border-gray-200", bg: "bg-gradient-to-br from-gray-50 to-slate-50", textColor: "text-gray-800", barColor: "bg-gray-500", isCount: true },
                      ].map((metric) => (
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
                      )) : (
                        <p className="text-sm text-gray-400 py-4 text-center col-span-4">No metrics available for this sample</p>
                      )}
                    </div>

                    {/* Detailed Breakdown */}
                    <div className="mt-5 border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        {category === "basmati" ? "Basmati Breakdown" : "Grain Breakdown"}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {breakdownParams.map((param) => {
                          // Resolve breakdown value from current trial's GrainMetrics
                          let val: number | string = "--";
                          if (currentOutputParams) {
                            const total = currentOutputParams.totalGrains || 1;
                            const bdKeyMap: Record<string, string[]> = {
                              headRice: ["goodRice", "headRice"],
                              secondOne: ["goodRice", "secondOne"], tibar: ["goodRice", "tibar"],
                              dubar: ["goodRice", "dubar"], miniDubar: ["goodRice", "miniDubar"], mongra: ["goodRice", "mongra"],
                              miniMongra: ["goodRice", "miniMongra"], nakku: ["goodRice", "nakku"],
                              threeQuarterBroken: ["goodRice", "threeFourthHead"],
                              halfBroken: ["goodRice", "halfBrokens"], tips: ["goodRice", "tips"],
                              immature: ["rejections", "immature"], foreignMatter: ["foreignMatter", "total"],
                            };
                            const path = bdKeyMap[param.key];
                            if (path) {
                              const idx = activeReportSample === "average" ? -1 : parseInt(activeReportSample.replace("sample-", ""), 10) - 1;
                              const metrics = idx < 0 ? averageMetrics(reportTrials) : reportTrials[idx]?.GrainMetrics;
                              if (metrics) {
                                let raw: unknown = metrics;
                                for (const k of path) raw = (raw as Record<string, unknown>)?.[k] ?? 0;
                                val = +(((raw as number) / total) * 100).toFixed(1);
                              }
                            }
                          }
                          return (
                          <div
                            key={param.key}
                            className={`rounded-lg border p-3 text-center ${
                              category === "basmati"
                                ? "border-blue-100 bg-blue-50/50"
                                : "border-yellow-100 bg-yellow-50/50"
                            }`}
                          >
                            <p className="text-xs text-gray-500 mb-1">{param.label}</p>
                            <p className="text-lg font-semibold text-gray-800">
                              {val}{param.unit && <span className="text-sm font-normal ml-0.5 text-gray-400">{param.unit}</span>}
                            </p>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Whiteness Index Classification */}
                <Card className="shadow-sm">
                  <CardContent className="pt-4 pb-4">
                    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-medium text-gray-500">Whiteness Index</p>
                          <p className="text-2xl font-bold text-blue-700 mt-1">
                            {currentOutputParams?.whitenessIndex ?? "--"}<span className="text-sm font-normal ml-1 text-gray-400">WI</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-medium text-gray-500">Color Grade</p>
                          <p className="text-lg font-semibold mt-1" style={{ color: getWiGradeColor(currentOutputParams?.whitenessIndex || 0) }}>
                            {currentOutputParams?.whitenessIndex ? getWiGradeLabel(currentOutputParams.whitenessIndex) : "--"}
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
                              className="flex flex-col items-center px-2 py-1 rounded text-[9px] opacity-50"
                              style={{ backgroundColor: g.color }}
                            >
                              <span className="font-bold text-gray-700">{g.label}</span>
                              <span className="text-gray-500">{g.min}–{g.max}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

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
                      { label: "Test Id", value: sessionStorage.getItem("mode_id") || "\u2014" },
                      { label: "Operator", value: operatorName || "\u2014" },
                      { label: "Date", value: currentDate || "\u2014" },
                      { label: "Category", value: categoryLabel || "\u2014" },
                      { label: "Variety", value: variety || "\u2014" },
                      { label: "Process", value: process || "\u2014" },
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
                      className="w-full gap-2 bg-rice-primary hover:bg-rice-primary/90"
                      onClick={handleGenerateReport}
                      disabled={reportGenerating}
                    >
                      <Download className="w-4 h-4" />
                      {reportGenerating ? "Generating..." : "Download Report"}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      disabled={!videoExists}
                      onClick={() => {
                        setShowReplay(true);
                        // Scroll to the replay card at the top of reports
                        document.getElementById("mr-session-replay")?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      <Activity className="w-4 h-4" />
                      Replay Vision
                    </Button>
                    <Button variant="outline" className="w-full gap-2">
                      <BarChart3 className="w-4 h-4" />
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MilledRiceAnalysis;
