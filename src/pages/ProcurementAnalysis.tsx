import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Activity, BarChart3, CheckCircle2, MapPin, ChevronsUpDown, Wheat, Download, Play, LayoutDashboard } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

import ProcurementLiveAnalysis from "./ProcurementLiveAnalysis";

type StepId = "preparation" | "live" | "reports";

interface StepState {
  preparation: boolean;
  live: boolean;
  reports: boolean;
}

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

/** Same localStorage keys and API shape as Settings.tsx rice mill information */
const RICE_MILL_STORAGE_KEYS = {
  operatorName: "riceMill_operatorName",
  location: "riceMill_location",
  millName: "riceMill_millName",
} as const;

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

interface DistributionData {
  lengthHistogram: { bin: string; count: number }[];
  bisGrading: { grade: string; count: number; percentage: number }[];
  classCounts: { name: string; count: number }[];
  uniformity: { cv: number | null; mean?: number; std?: number; label: string };
  trialSummary: { trial: number | string; totalGrains: number; headRicePct: number }[];
}

// Computed output parameters from GrainMetrics (standard mode)
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

// Segmentation config category groups (from mode document)
interface SegGroupConfig {
  headRiceKeys: string[];
  brokensKeys: string[];
}

const SEG_KEY_TO_METRICS: Record<string, string> = {
  head_rice: 'headRice', three_quarter_head_rice: 'threeFourthHead',
  broken: 'halfBrokens', fine_broken: 'quarterFineBrokens', tip: 'tips',
  second_one: 'secondOne', tibar: 'tibar', dubar: 'dubar',
  mini_dubar: 'miniDubar', mongra: 'mongra', mini_mongra: 'miniMongra', nakku: 'nakku',
};

function computeOutputParams(metrics: GrainMetrics, whitenessIndex?: number, segGroups?: SegGroupConfig | null): OutputParams {
  const total = metrics.totalGrains || 1;
  const gr = metrics.goodRice || {} as GrainMetrics["goodRice"];
  const rej = metrics.rejections || {} as GrainMetrics["rejections"];
  const fm = metrics.foreignMatter || {} as GrainMetrics["foreignMatter"];

  let headRice: number;
  let broken: number;

  if (segGroups && segGroups.headRiceKeys.length > 0) {
    headRice = segGroups.headRiceKeys.reduce((sum, k) => sum + ((gr as any)[k] || 0), 0);
    broken = segGroups.brokensKeys.reduce((sum, k) => sum + ((gr as any)[k] || 0), 0);
  } else {
    headRice = (gr.headRice || 0) + (gr.threeFourthHead || 0);
    broken = (gr.halfBrokens || 0) + (gr.quarterFineBrokens || 0) + (gr.tips || 0);
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

const ProcurementAnalysis = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState<StepId>("preparation");
  const [completedSteps, setCompletedSteps] = useState<StepState>({
    preparation: false,
    live: false,
    reports: false,
  });

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
  const [samplingMethod, setSamplingMethod] = useState("");
  const [sampleWeight, setSampleWeight] = useState("");
  const [freeWeightInput, setFreeWeightInput] = useState("");

  // Chalky Threshold
  const [chalkyThreshold, setChalkyThreshold] = useState("20");

  // ID Generation
  const [idGeneration, setIdGeneration] = useState<'auto' | 'custom'>('auto');
  const [customId, setCustomId] = useState("");

  // ── Step 3: Insights & Reports state ──────────────────────────────────
  const [reportTrials, setReportTrials] = useState<TrialData[]>([]);
  const [dimensionStats, setDimensionStats] = useState<DimensionStatsResponse | null>(null);
  const [segGroups, setSegGroups] = useState<SegGroupConfig | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [activeSampleTab, setActiveSampleTab] = useState<string>("1");
  const [trialVideos, setTrialVideos] = useState<Record<string, boolean>>({});
  const [showReplay, setShowReplay] = useState(false);
  const [distributionData, setDistributionData] = useState<DistributionData | null>(null);

  const handleIdGenerationChange = (value: 'auto' | 'custom') => {
    setIdGeneration(value);
    if (value === 'auto') {
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
      console.error("ProcurementAnalysis persist rice mill:", err);
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
      } catch (e) {
        if (!cancelled) console.error("Failed to fetch rice mill settings:", e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

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
        if (data.status === "success" && Array.isArray(data.processes)) {
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
          setProcessesForVariety([]);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to fetch processes for variety:", e);
          setProcessesForVariety([]);
        }
      } finally {
        if (!cancelled) setProcessesLoading(false);
      }
    };
    loadProcesses();
    return () => { cancelled = true; };
  }, [variety]);

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

  // Load month options whenever variety, process, and harvest season are set (including when season is auto-filled)
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

  // Sync selected values to title-case from API options so display is never lowercase
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

  const handleStepChange = (step: StepId) => {
    if (step === "live" && !completedSteps.preparation) return;
    if (step === "reports" && !completedSteps.live) return;
    setActiveStep(step);
  };

  const markStepComplete = async (step: StepId) => {
    if (step === "preparation") {
      // Validate custom ID if custom generation is selected
      if (idGeneration === 'custom' && (!customId || customId.length !== 4)) {
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

        const resolvedWeight = sampleWeight === "free weight" ? freeWeightInput : sampleWeight.replace(" grams", "");
        const existingModeId = sessionStorage.getItem("mode_id");

        // If a mode_id already exists, this is sample 2+ — reuse it, don't create new mode
        if (existingModeId) {
          // Just update chalky threshold and sample weight for next sample
          sessionStorage.setItem("chalky_threshold", chalkyThreshold);
          sessionStorage.setItem("procurement_sample_weight", resolvedWeight);
          sessionStorage.removeItem("pending_analysis_config");
          console.log("📝 Reusing existing modeId for next sample:", existingModeId);
        } else {
          // Build the request body for the procurement-analysis endpoint
          const requestBody = {
            modeType: 'procurement',
            variety,
            process,
            harvestSeason,
            month,
            riceMill: riceMill.trim(),
            operatorName: operatorName.trim(),
            location: location.trim(),
            testDate: currentDate,
            testTime: currentTime,
            samplingMethod,
            noOfSamples,
            sampleWeight: resolvedWeight,
            chalkyThreshold: parseFloat(chalkyThreshold) || 20,
            idGeneration,
            customId: idGeneration === 'custom' ? customId : null,
          };

          const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

          // Store pending analysis config in sessionStorage (same pattern as TellUsAboutGrain)
          const pendingConfig = {
            analysisType: 'procurement',
            endpoint: `${BACKEND_URL}/api/raice_labz/modes/procurement-analysis`,
            requestBody,
          };
          sessionStorage.setItem('pending_analysis_config', JSON.stringify(pendingConfig));

        // Also store individual fields for easy access
        sessionStorage.setItem('analysis_type', 'procurement');
        sessionStorage.setItem('procurement_variety', variety);
        sessionStorage.setItem('procurement_process', process);
        sessionStorage.setItem('procurement_harvest_season', harvestSeason);
        sessionStorage.setItem('procurement_month', month);
        sessionStorage.setItem('procurement_rice_mill', riceMill.trim());
        sessionStorage.setItem('procurement_operator', operatorName.trim());
        sessionStorage.setItem('procurement_location', location.trim());
        sessionStorage.setItem('procurement_date', currentDate);
        sessionStorage.setItem('procurement_time', currentTime);
        sessionStorage.setItem('procurement_sampling_method', samplingMethod);
        sessionStorage.setItem('procurement_no_of_samples', noOfSamples);
        sessionStorage.setItem('procurement_sample_weight', resolvedWeight);
        sessionStorage.setItem('chalky_threshold', chalkyThreshold);
        sessionStorage.setItem('procurement_id_generation', idGeneration);
        if (idGeneration === 'custom') {
          sessionStorage.setItem('procurement_custom_id', customId);
        }

        console.log('📝 Stored procurement analysis config in sessionStorage');
        console.log('📝 Pending config:', JSON.stringify(pendingConfig, null, 2));
        } // end else (first sample — create new mode)
      } catch (err) {
        console.error('❌ Failed to prepare procurement analysis config:', err);
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
      ...(step === "preparation" ? { live: prev.live } : null),
      ...(step === "live" ? { reports: prev.reports } : null),
    }));

    if (step === "preparation") {
      setActiveStep("live");
    } else if (step === "live") {
      setActiveStep("reports");
    }
  };

  // ── Fetch trial data and dimension stats when reports tab activates ────
  useEffect(() => {
    if (activeStep !== "reports") return;
    const modeId = sessionStorage.getItem("mode_id");
    if (!modeId) return;

    let cancelled = false;
    setReportLoading(true);

    const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

    const fetchData = async () => {
      try {
        const [trialsRes, statsRes, distRes, modeRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/raice_labz/analysis/mode/${modeId}/trials`),
          fetch(`${BACKEND_URL}/api/raice_labz/grains/mode/${modeId}/statistics`),
          fetch(`${BACKEND_URL}/api/raice_labz/grains/mode/${modeId}/distribution`),
          fetch(`${BACKEND_URL}/api/raice_labz/modes/${modeId}`),
        ]);
        if (cancelled) return;

        // Extract segmentationConfig groups
        try {
          if (modeRes.ok) {
            const modeJson = await modeRes.json();
            const modeDoc = modeJson.status === "success" ? modeJson.data : modeJson;
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
        } catch (e) { console.warn("Failed to parse mode segConfig:", e); }

        const trialsJson = await trialsRes.json();
        if (trialsJson.status === "success" && trialsJson.data?.trials) {
          setReportTrials(trialsJson.data.trials as TrialData[]);
        }

        const statsJson = await statsRes.json();
        if (statsJson.status === "success" && statsJson.data) {
          setDimensionStats(statsJson.data as DimensionStatsResponse);
        }

        const distJson = await distRes.json();
        if (distJson.status === "success" && distJson.data) {
          setDistributionData(distJson.data as DistributionData);
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
      } catch (err) {
        if (!cancelled) console.error("Failed to fetch report data:", err);
      } finally {
        if (!cancelled) setReportLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [activeStep]);

  // Derive the current sample's output params and dimension stats
  const sampleCount = parseInt(noOfSamples, 10) || 1;

  const currentOutputParams: OutputParams | null = useMemo(() => {
    if (reportTrials.length === 0) return null;
    if (activeSampleTab === "average") {
      const whiteness = dimensionStats?.overallStats?.averageWhitenessIndex;
      return computeOutputParams(averageMetrics(reportTrials), whiteness, segGroups);
    }
    const idx = parseInt(activeSampleTab, 10) - 1;
    const trial = reportTrials[idx];
    if (!trial?.GrainMetrics) return null;
    const trialKey = activeSampleTab;
    const whiteness = dimensionStats?.trialStats[trialKey]?.averageWhitenessIndex;
    return computeOutputParams(trial.GrainMetrics, whiteness, segGroups);
  }, [reportTrials, activeSampleTab, dimensionStats, segGroups]);

  const currentDimStats = useMemo(() => {
    if (!dimensionStats) return null;
    if (activeSampleTab === "average") return dimensionStats.overallStats;
    const trialKey = activeSampleTab;
    return dimensionStats.trialStats[trialKey] ?? dimensionStats.overallStats;
  }, [dimensionStats, activeSampleTab]);

  const totalGrainsScanned = useMemo(() => {
    return reportTrials.reduce((sum, t) => sum + ((t.GrainMetrics?.totalGrains) || 0), 0);
  }, [reportTrials]);

  const resolvedSampleWeight = sampleWeight === "free weight" ? freeWeightInput : sampleWeight.replace(" grams", "");

  // Derive whether current tab has a video (hide on "average" tab)
  const isAverageTab = activeSampleTab === "average";
  const currentTrialForVideo = isAverageTab ? "" : activeSampleTab;
  const videoExists = !isAverageTab && Object.keys(trialVideos).length > 0;
  const currentVideoTrial = trialVideos[currentTrialForVideo] ? currentTrialForVideo : Object.keys(trialVideos)[0];

  const handleGenerateReport = async () => {
    const modeId = sessionStorage.getItem("mode_id");
    if (!modeId) {
      toast({ title: "No mode ID found", description: "Cannot generate report without a mode ID.", variant: "destructive" });
      return;
    }
    setReportGenerating(true);
    try {
      const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;
      const res = await fetch(`${BACKEND_URL}/api/generate-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode_id: modeId, report_type: "procurement" }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Report generation failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${modeId}.pdf`;
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

  const allCompleted = completedSteps.preparation && completedSteps.live && completedSteps.reports;

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
    samplingMethod.trim() !== "" &&
    sampleWeight.trim() !== "" &&
    (sampleWeight !== "free weight" || freeWeightInput.trim() !== "");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Procurement Analysis"
        subtitle="Guide your team from test preparation to live analysis and final insights."
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Tabs value={activeStep} onValueChange={(v) => handleStepChange(v as StepId)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="preparation" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                <span>Test Preparation</span>
                {completedSteps.preparation && (
                  <CheckCircle2 className="w-3 h-3 text-rice-primary ml-1" />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="live"
                disabled={!completedSteps.preparation}
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

            <TabsContent value="preparation" className="mt-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <Card className="h-full">
                <CardHeader>
                    <CardTitle className="text-rice-primary flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-rice-primary" />
                      Test Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-gray-700">
                    <div className="space-y-1">
                      <Label htmlFor="rice-mill">Rice Mill <span className="text-rice-primary">*</span></Label>
                      <Input
                        id="rice-mill"
                        value={riceMill}
                        onChange={(e) => setRiceMill(e.target.value)}
                        placeholder="Enter rice mill name"
                        className="w-full"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="operator-name">Operator Name <span className="text-rice-primary">*</span></Label>
                        <Input
                          id="operator-name"
                          value={operatorName}
                          onChange={(e) => setOperatorName(e.target.value)}
                          placeholder="Enter operator name"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="location">Location <span className="text-rice-primary">*</span></Label>
                        <Popover open={locationSearchOpen} onOpenChange={handleLocationOpenChange}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={locationSearchOpen}
                              className="w-full justify-between font-normal"
                            >
                              {location || "Select or type location..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput
                                placeholder="Search or type location..."
                                value={locationSearchText}
                                onValueChange={setLocationSearchText}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleLocationCommit();
                                  }
                                }}
                              />
                              <CommandList>
                                <CommandEmpty>No location found. Press Enter to use typed value.</CommandEmpty>
                                <CommandGroup>
                                  {INDIAN_CITIES.map((city) => (
                                    <CommandItem
                                      key={city}
                                      value={city}
                                      onSelect={(currentValue) => {
                                        setLocation(currentValue);
                                        setLocationSearchText(currentValue);
                                        setLocationSearchOpen(false);
                                      }}
                                    >
                                      <MapPin className="mr-2 h-4 w-4" />
                                      {city}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                              <div className="border-t px-3 py-2 text-xs text-gray-500">
                                Press Enter to use &quot;{locationSearchText || 'typed location'}&quot;.
                              </div>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="test-date">Date (IST) <span className="text-rice-primary">*</span></Label>
                        <Input
                          id="test-date"
                          value={currentDate}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="test-time">Time (IST) <span className="text-rice-primary">*</span></Label>
                        <Input
                          id="test-time"
                          value={currentTime}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

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
                        <Label htmlFor="grain-no-samples">No. of Samples (1–3) <span className="text-rice-primary">*</span></Label>
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
                          placeholder="1–3"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="grain-sampling-method">Sampling Method <span className="text-rice-primary">*</span></Label>
                        <Select
                          value={samplingMethod || ""}
                          onValueChange={setSamplingMethod}
                        >
                          <SelectTrigger id="grain-sampling-method">
                            <SelectValue placeholder="Select sampling method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="handmilled">Hand milled</SelectItem>
                            <SelectItem value="machine milled">Machine milled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Sample weight <span className="text-rice-primary">*</span></Label>
                        <div className="flex flex-wrap items-center gap-4">
                          <RadioGroup
                            value={sampleWeight}
                            onValueChange={(v) => {
                              setSampleWeight(v);
                              if (v !== "free weight") setFreeWeightInput("");
                            }}
                            className="flex flex-row flex-wrap items-center gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="50 grams" id="sample-weight-50" />
                              <Label htmlFor="sample-weight-50" className="cursor-pointer font-normal">
                                50 grams
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="100 grams" id="sample-weight-100" />
                              <Label htmlFor="sample-weight-100" className="cursor-pointer font-normal">
                                100 grams
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="free weight" id="sample-weight-free" />
                              <Label htmlFor="sample-weight-free" className="cursor-pointer font-normal">
                                Free weight
                              </Label>
                            </div>
                          </RadioGroup>
                          {sampleWeight === "free weight" && (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={1}
                                step={1}
                                placeholder="Enter weight"
                                value={freeWeightInput}
                                onChange={(e) => setFreeWeightInput(e.target.value)}
                                className="w-28"
                              />
                              <span className="text-sm text-muted-foreground">grams</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Chalky Threshold + Mode ID — two equal halves */}
                      <div className="md:col-span-2 pt-3 border-t mt-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium shrink-0">Chalky Threshold</Label>
                            <div className="relative">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={chalkyThreshold}
                                onChange={(e) => setChalkyThreshold(e.target.value)}
                                className="w-20 h-7 text-xs pr-7"
                                placeholder="20"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium shrink-0">Mode ID</Label>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant={idGeneration === "auto" ? "default" : "outline"}
                                onClick={() => handleIdGenerationChange("auto")}
                                className={`h-7 text-xs px-3 ${idGeneration === "auto" ? "bg-rice-primary hover:bg-rice-primary/90" : ""}`}
                              >
                                Auto
                              </Button>
                              <Button
                                size="sm"
                                variant={idGeneration === "custom" ? "default" : "outline"}
                                onClick={() => handleIdGenerationChange("custom")}
                                className={`h-7 text-xs px-3 ${idGeneration === "custom" ? "bg-rice-primary hover:bg-rice-primary/90" : ""}`}
                              >
                                Custom
                              </Button>
                            </div>
                            {idGeneration === "custom" && (
                              <Input
                                type="number"
                                value={customId}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || /^\d{1,4}$/.test(value)) {
                                    setCustomId(value);
                                  }
                                }}
                                placeholder="4-digit ID"
                                maxLength={4}
                                className="w-28 h-7 text-xs"
                              />
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
                    disabled={idGeneration === 'custom' && (!customId || customId.length !== 4)}
                  >
                    Continue to Live Analysis
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="live" className="mt-2">
              <ProcurementLiveAnalysis
                embedded={true}
                analysisDataOverride={{
                  analysisType: "procurement",
                  variety: variety,
                  process: process,
                  noOfSamples: noOfSamples,
                  sampleWeight: sampleWeight === "free weight" ? freeWeightInput : sampleWeight.replace(" grams", "")
                }}
                onComplete={() => markStepComplete("live")}
              />
            </TabsContent>

            <TabsContent value="reports" className="mt-2 space-y-4">
              {/* ── Session Replay ────────────────────────────────────── */}
              {videoExists && (
                <Card>
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
                              onClick={() => setActiveSampleTab(tNum)}
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
                        src={`${window.location.protocol}//${window.location.hostname}:5000/api/raice_labz/sessions/video/${sessionStorage.getItem("mode_id")}?trial=${currentVideoTrial || "1"}`}
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

              {/* ── Sample Tabs ───────────────────────────────────────── */}
              <div className="flex items-center gap-2 flex-wrap">
                {Array.from({ length: sampleCount }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    onClick={() => setActiveSampleTab(String(num))}
                    className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                      activeSampleTab === String(num)
                        ? "border-rice-primary text-rice-primary bg-white"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Sample {num}
                  </button>
                ))}
                {sampleCount > 1 && (
                  <button
                    onClick={() => setActiveSampleTab("average")}
                    className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                      activeSampleTab === "average"
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

              {reportLoading ? (
                <div className="flex items-center justify-center py-20 text-gray-500 text-sm">Loading report data...</div>
              ) : (
                <>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-stretch">
                  {/* ── Left Column: Main Content ──────────────────────── */}
                  <div className="space-y-4">
                    {/* Quality Metrics Card */}
                    <Card className="shadow-sm">
                      <CardHeader className="pb-3 bg-gradient-to-r from-rice-primary/5 to-rice-secondary/5 border-b">
                        <CardTitle className="text-rice-primary text-base flex items-center gap-2">
                          <BarChart3 className="w-5 h-5" />
                          Quality Metrics Overview
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-5">
                      {currentOutputParams ? (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { label: "Head Rice", value: currentOutputParams.headRicePct, unit: "%", border: "border-green-200", bg: "bg-gradient-to-br from-green-50 to-emerald-50", textColor: "text-green-700", barColor: "bg-green-500" },
                              { label: "Broken Rice", value: currentOutputParams.brokenRicePct, unit: "%", border: "border-amber-200", bg: "bg-gradient-to-br from-amber-50 to-yellow-50", textColor: "text-amber-700", barColor: "bg-amber-500" },
                              { label: "Chalky", value: currentOutputParams.chalkyPct, unit: "%", border: "border-orange-200", bg: "bg-gradient-to-br from-orange-50 to-amber-50", textColor: "text-orange-700", barColor: "bg-orange-500" },
                              { label: "Foreign Matter", value: currentOutputParams.foreignMatterPct, unit: "%", border: "border-red-200", bg: "bg-gradient-to-br from-red-50 to-rose-50", textColor: "text-red-700", barColor: "bg-red-500" },
                            ].map((metric) => (
                              <div
                                key={metric.label}
                                className={`group rounded-xl border ${metric.border} ${metric.bg} p-3.5 hover:shadow-lg hover:scale-[1.03] transition-all duration-300 cursor-default`}
                              >
                                <p className="text-[11px] font-medium text-gray-500 group-hover:text-gray-700 transition-colors duration-300">{metric.label}</p>
                                <p className={`text-2xl font-bold ${metric.textColor} mt-1`}>
                                  {metric.value}<span className="text-sm font-normal ml-0.5 text-gray-400">{metric.unit}</span>
                                </p>
                                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${metric.barColor} transition-all duration-700`} style={{ width: `${Math.min(metric.value as number, 100)}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Additional metrics row */}
                          <div className="grid grid-cols-3 gap-3 mt-3">
                            {[
                              { label: "Discoloured", value: currentOutputParams.discolouredPct, unit: "%", border: "border-purple-200", bg: "bg-gradient-to-br from-purple-50 to-violet-50", textColor: "text-purple-700" },
                              { label: "Immature", value: currentOutputParams.immaturePct, unit: "%", border: "border-teal-200", bg: "bg-gradient-to-br from-teal-50 to-cyan-50", textColor: "text-teal-700" },
                              { label: "Total Grains", value: currentOutputParams.totalGrains, unit: "", border: "border-gray-200", bg: "bg-gradient-to-br from-gray-50 to-slate-50", textColor: "text-gray-800", isCount: true },
                            ].map((metric) => (
                              <div key={metric.label} className={`group rounded-xl border ${metric.border} ${metric.bg} p-3 hover:shadow-md transition-all duration-300 cursor-default`}>
                                <p className="text-[11px] font-medium text-gray-500">{metric.label}</p>
                                <p className={`text-xl font-bold ${metric.textColor} mt-1`}>
                                  {(metric as any).isCount ? (metric.value as number).toLocaleString() : metric.value}
                                  {metric.unit && <span className="text-sm font-normal ml-0.5 text-gray-400">{metric.unit}</span>}
                                </p>
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
                                        { name: "Head Rice", value: currentOutputParams.headRicePct, color: "#22c55e" },
                                        { name: "Broken Rice", value: currentOutputParams.brokenRicePct, color: "#f59e0b" },
                                        { name: "Rejections", value: currentOutputParams.chalkyPct + currentOutputParams.discolouredPct + currentOutputParams.immaturePct, color: "#f97316" },
                                        { name: "Foreign Matter", value: currentOutputParams.foreignMatterPct, color: "#ef4444" },
                                      ].filter(d => d.value > 0)}
                                      cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value" animationDuration={800}
                                    >
                                      {[
                                        { name: "Head Rice", value: currentOutputParams.headRicePct, color: "#22c55e" },
                                        { name: "Broken Rice", value: currentOutputParams.brokenRicePct, color: "#f59e0b" },
                                        { name: "Rejections", value: currentOutputParams.chalkyPct + currentOutputParams.discolouredPct + currentOutputParams.immaturePct, color: "#f97316" },
                                        { name: "Foreign Matter", value: currentOutputParams.foreignMatterPct, color: "#ef4444" },
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
                                  { label: "Head Rice", value: currentOutputParams.headRicePct, color: "#22c55e", desc: "Full & 3/4 head grains, secondOne, tibar" },
                                  { label: "Broken Rice", value: currentOutputParams.brokenRicePct, color: "#f59e0b", desc: "Half, quarter, fine brokens, tips, dubar, mongra, nakku" },
                                  { label: "Rejections", value: +(currentOutputParams.chalkyPct + currentOutputParams.discolouredPct + currentOutputParams.immaturePct).toFixed(1), color: "#f97316", desc: "Chalky, discolored, immature" },
                                  { label: "Foreign Matter", value: currentOutputParams.foreignMatterPct, color: "#ef4444", desc: "Non-rice material" },
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
                        <p className="text-sm text-gray-400 py-4 text-center">No metrics available for this sample</p>
                      )}
                      </CardContent>
                    </Card>

                  </div>

                  {/* ── Right Column: Sidebar ──────────────────── */}
                  <div className="flex flex-col gap-3">
                    {/* Test Information Panel */}
                    <Card className="shadow-sm">
                      <CardHeader className="pb-3 bg-gradient-to-r from-rice-primary/5 to-rice-secondary/5 border-b">
                        <CardTitle className="text-sm font-semibold text-gray-700">Test Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3.5 text-sm pt-4">
                        {[
                          { label: "Test Id", value: sessionStorage.getItem("mode_id") || "—" },
                          { label: "Operator", value: operatorName || "—" },
                          { label: "Date", value: currentDate || "—" },
                          { label: "Variety", value: variety || "—" },
                          { label: "Process", value: process || "—" },
                          { label: "Grains Scanned", value: totalGrainsScanned.toLocaleString() },
                          { label: "Sample Weight", value: resolvedSampleWeight ? `${resolvedSampleWeight}g` : "—" },
                          { label: "Sampling Method", value: samplingMethod || "—" },
                        ].map((item) => (
                          <div key={item.label} className="flex justify-between items-baseline py-0.5">
                            <span className="text-gray-500 text-xs font-medium">{item.label}</span>
                            <span className="font-medium text-gray-800 text-right max-w-[180px] truncate text-sm">{item.value}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Actions Panel */}
                    <Card className="flex-1 flex flex-col">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-700">Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2.5 flex-1">
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
                          onClick={() => videoExists ? setShowReplay(true) : setActiveStep("live")}
                        >
                          <Play className="w-4 h-4 rotate-180" />
                          Replay Vision
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => navigate("/")}
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard
                        </Button>

                        {allCompleted && (
                          <p className="flex items-center gap-2 text-xs text-rice-primary pt-1">
                            <CheckCircle2 className="w-4 h-4" />
                            All stages completed.
                          </p>
                        )}
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
                      const dimSource = currentDimStats!;
                      const dims = dimSource.dimensions;
                      const hrDims = dimSource.headRiceDimensions;
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
      </div>
    </div>
  );
};

export default ProcurementAnalysis;

