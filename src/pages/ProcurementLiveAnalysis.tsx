import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useGrain } from "@/contexts/GrainContext";
import { useMachine } from "@/contexts/MachineContext";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Camera, Save, Trash2, Play, Pause, Square, BarChart3, Percent, CheckCircle, Circle, Settings, AlertCircle, Loader2, Clock, ZoomIn, ZoomOut, Maximize, Minimize, Factory, RotateCcw, SkipForward } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ios/theme-provider";
import { LiveAnalysisHeroIOS } from "@/components/ios/LiveAnalysisHeroIOS";
import { LiveCameraDock } from "@/components/ios/live/LiveCameraDock";
import { LiveGiantRing, RingMetric } from "@/components/ios/live/LiveGiantRing";
import { LiveMiniRingStrip } from "@/components/ios/live/LiveMiniRingStrip";
import { LivePillControls } from "@/components/ios/live/LivePillControls";
import { LiveStatHeader } from "@/components/ios/live/LiveStatHeader";
import { LiveDetailedAccordion } from "@/components/ios/live/LiveDetailedAccordion";
import { MultiRingComposite, RingDef } from "@/components/ios/live/MultiRingComposite";
import { GrainWall } from "@/components/ios/live/GrainWall";
import { TopBarIOS } from "@/components/ios/TopBarIOS";
import io from 'socket.io-client';

// Backend API configuration
// const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://192.168.0.143:5000';
const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

interface LiveAnalysisProps {
  embedded?: boolean;
  analysisDataOverride?: any;
  onComplete?: () => void;
}

// Apple Watch-style ring gauge for iOS themes
const RingGaugeIOS = ({
  value, count, label, color, showPercent, disabled = false, maxValue = 100
}: {
  value: number; count: number; label: string; color: string;
  showPercent: boolean; disabled?: boolean; maxValue?: number;
}) => {
  const size = 110, sw = 9;
  const cx = size / 2, cy = size / 2;
  const r = (size - sw) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = disabled ? 0 : Math.min(Math.max(value / maxValue, 0), 1);
  const dashOffset = circumference * (1 - pct);
  const arcColor = disabled ? 'hsl(var(--ios-text-tertiary))' : color;
  const trackColor = 'hsl(var(--ios-separator))';
  const valueColor = disabled ? 'hsl(var(--ios-text-tertiary))' : 'hsl(var(--ios-text))';
  const labelColor = disabled ? 'hsl(var(--ios-text-tertiary))' : 'hsl(var(--ios-text-secondary))';
  const displayValue = disabled ? 'N/A' : (showPercent ? `${value.toFixed(1)}%` : count.toLocaleString());

  return (
    <div className="flex items-center justify-center w-full h-full min-h-0">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full max-w-[120px] max-h-[120px]" preserveAspectRatio="xMidYMid meet">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={sw} />
        <circle
          cx={cx} cy={cy} r={r} fill="none" stroke={arcColor} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.32, 0.72, 0, 1)" }}
        />
        <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="middle"
          fontSize="14" fontWeight="700" fill={valueColor}
          style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
          {displayValue}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle"
          fontSize="8" fill={labelColor} fontWeight="600"
          style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </text>
      </svg>
    </div>
  );
};

// Classic semi-circle speedometer gauge component
const SemiCircleGaugeClassic = ({
  value, count, label, color, showPercent, disabled = false, maxValue = 100
}: {
  value: number; count: number; label: string; color: string;
  showPercent: boolean; disabled?: boolean; maxValue?: number;
}) => {
  const cx = 60, cy = 64, r = 48;
  const sw = 10; // stroke width
  const pct = disabled ? 0 : Math.min(Math.max(value / maxValue, 0), 1);
  const endAngle = (1 - pct) * Math.PI;
  const endX = cx + r * Math.cos(endAngle);
  const endY = cy - r * Math.sin(endAngle);
  const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const valuePath = pct > 0.005
    ? `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`
    : '';
  const arcColor = disabled ? '#d1d5db' : color;
  const valueColor = disabled ? '#9ca3af' : (pct > 0.005 ? color : '#9ca3af');
  const displayValue = disabled ? 'N/A' : (showPercent ? `${value.toFixed(1)}%` : count.toLocaleString());

  // Tick marks at 0, 25, 50, 75, 100%
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => {
    const a = (1 - t) * Math.PI;
    const r1 = r + sw / 2 + 2;
    const r2 = r + sw / 2 + 6;
    return {
      x1: cx + r1 * Math.cos(a), y1: cy - r1 * Math.sin(a),
      x2: cx + r2 * Math.cos(a), y2: cy - r2 * Math.sin(a),
    };
  });

  // Needle from center to current angle
  const needleLen = r - sw / 2 - 4;
  const nx = cx + needleLen * Math.cos(endAngle);
  const ny = cy - needleLen * Math.sin(endAngle);

  return (
    <div className="flex items-center justify-center w-full h-full min-h-0 p-1">
      <svg viewBox="0 0 120 82" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Background arc */}
        <path d={bgPath} fill="none" stroke="#e5e7eb" strokeWidth={sw} strokeLinecap="round" />
        {/* Value arc */}
        {valuePath && (
          <path d={valuePath} fill="none" stroke={arcColor} strokeWidth={sw} strokeLinecap="round" />
        )}
        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={disabled ? '#d1d5db' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" />
        ))}
        {/* Needle */}
        {!disabled && (
          <>
            <line x1={cx} y1={cy} x2={nx.toFixed(2)} y2={ny.toFixed(2)}
              stroke={arcColor} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <circle cx={cx} cy={cy} r="3" fill={arcColor} />
          </>
        )}
        {/* Value text */}
        <text x="60" y="54" textAnchor="middle" dominantBaseline="middle"
          fontSize="13" fontWeight="bold" fill={valueColor}>
          {displayValue}
        </text>
        {/* Label */}
        <text x="60" y="76" textAnchor="middle" dominantBaseline="middle"
          fontSize="9" fill={disabled ? '#9ca3af' : '#6b7280'} fontWeight="500">
          {label}
        </text>
        {/* 0% and 100% end labels — only in percentage mode */}
        {showPercent && (
          <>
            <text x={cx - r - sw / 2 - 2} y={cy + 10} textAnchor="middle"
              fontSize="7" fill={disabled ? '#d1d5db' : '#9ca3af'}>0</text>
            <text x={cx + r + sw / 2 + 2} y={cy + 10} textAnchor="middle"
              fontSize="7" fill={disabled ? '#d1d5db' : '#9ca3af'}>100</text>
          </>
        )}
      </svg>
    </div>
  );
};

// Theme-aware gauge selector — same prop signature as before so callers don't change
const SemiCircleGauge = (props: {
  value: number; count: number; label: string; color: string;
  showPercent: boolean; disabled?: boolean; maxValue?: number;
}) => {
  const { isIOS } = useTheme();
  return isIOS ? <RingGaugeIOS {...props} /> : <SemiCircleGaugeClassic {...props} />;
};

const ProcurementLiveAnalysis = ({ embedded = false, analysisDataOverride, onComplete }: LiveAnalysisProps = {}) => {
  // Keep onComplete in a ref so setTimeout always calls the latest version
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const location = useLocation();
  const navigate = useNavigate();
  const { grainFormData, updateGrainFormData, isAnalysisRunning, setIsAnalysisRunning, isGrainFormComplete } = useGrain();
  const { machines: contextMachines } = useMachine();
  const { setHasStartedAnalysis } = useAnalysis();
  const { toast } = useToast();
  const { isClassic: isClassicTheme } = useTheme();
  const [iosFeaturedRingIdx, setIosFeaturedRingIdx] = useState<number>(0);

  // Read analysis parameters from sessionStorage (set by setup pages)
  const analysisParams = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('analysis_params') || '{}');
    } catch { return {}; }
  }, []);
  const chalkyEnabled = analysisParams.enableChalky !== false;
  const discoloredEnabled = analysisParams.enableDiscolored !== false;

  // Get analysis data from props if embedded, otherwise from location.state
  const analysisData = analysisDataOverride || (location.state as any);
  
  // Debug logging
  console.log('🔍 LiveAnalysis Debug Info:');
  console.log('📊 analysisData from location.state:', analysisData);
  console.log('📊 grainFormData from context:', grainFormData);
  console.log('📊 analysisData?.analysisType:', analysisData?.analysisType);
  console.log('📊 grainFormData?.enableTam:', grainFormData?.enableTam);

  // Check if this is TMA analysis
  const isTmaAnalysis = analysisData?.analysisType === "tma";
  // 🔧 FIXED: Safely get machines array with proper fallback
  const machines = isTmaAnalysis ? (Array.isArray(analysisData?.machines) ? analysisData.machines : (Array.isArray(contextMachines) ? contextMachines : [])) : [];
  
  // Check if this is TMA analysis - prioritize location.state over context
  const isTmaEnabled = () => {
    console.log('🔍 isTmaEnabled result:', isTmaAnalysis);
    return isTmaAnalysis;
  };
  
  // Total number of samples (defaults to 3, but can be overridden)
  const totalSamplesCount = analysisData?.noOfSamples ? parseInt(analysisData.noOfSamples, 10) : 3;
  const sampleArray = Array.from({ length: totalSamplesCount }, (_, i) => i + 1);
  
  // Debug logging for machines and series info
  console.log('🔍 TMA Machines from TellUsAboutGrain:', machines);
  console.log('🔍 Analysis Data:', analysisData);
  console.log('🔍 Selected Series:', analysisData?.series);
  console.log('🔍 Machines Count:', machines.length);
  console.log('🔍 Machines List:', machines);
  
  // TMA Analysis state
  const [currentMachineIndex, setCurrentMachineIndex] = useState(0);
  const [completedMachines, setCompletedMachines] = useState<string[]>([]);
  // 🔧 FIXED: Safely access machines[0] with proper array check
  const [accordionValue, setAccordionValue] = useState<string>((Array.isArray(machines) && machines.length > 0) ? machines[0] : "");
  const [tmaProcessingStarted, setTmaProcessingStarted] = useState(false); // Track if TMA processing pipeline is already started
  const [trialTransitionDelay, setTrialTransitionDelay] = useState(false); // Track if trial transition is in progress
  // Sample progression state (per machine for TMA, global for others)
  const [currentSample, setCurrentSample] = useState(1);
  const [completedSamples, setCompletedSamples] = useState<number[]>([]);
  const [isSampleStopped, setIsSampleStopped] = useState(false);
  const [allAnalysisDone, setAllAnalysisDone] = useState(false);
  const transitionTriggeredRef = useRef(false);
  
  // Analysis state
  const [isLoading, setIsLoading] = useState(false);
  const [operationType, setOperationType] = useState<'starting' | 'stopping' | null>(null);
  const [showPercentage, setShowPercentage] = useState(true);
  // Real-time chart data points (time-series for live graph)
  const [chartData, setChartData] = useState<{ time: string; headRice: number; broken: number; chalky: number; rejections: number }[]>([]);
  const chartStartTimeRef = useRef<number>(0);
  // Live gauge values for speedometer display
  const [gaugeValues, setGaugeValues] = useState({ headRice: 0, broken: 0, chalky: 0, rejections: 0 });
  const [gaugeCounts, setGaugeCounts] = useState({ headRice: 0, broken: 0, chalky: 0, rejections: 0 });
  const [error, setError] = useState<string | null>(null);
  const [realTimeStats, setRealTimeStats] = useState<any>(null);
  const [socket, setSocket] = useState<any>(null);
  const [wsConnected, setWsConnected] = useState(false);
  
  // NEW: Add state for real-time update tracking
  const [lastMetricsUpdate, setLastMetricsUpdate] = useState<Date | null>(null);
  const [metricsUpdateCount, setMetricsUpdateCount] = useState(0);
  const [configStatus, setConfigStatus] = useState<{
    status: string;
    grain_type?: string;
    variety?: string;
    process?: string;
    testing?: string;
    timestamp?: string;
  } | null>(null);
  const [currentBatch, setCurrentBatch] = useState<any>(null);
  
  // WebRTC state
  const [webrtcPeerConnection, setWebrtcPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [webrtcVideoRef, setWebrtcVideoRef] = useState<HTMLVideoElement | null>(null);
  const [webrtcConnected, setWebrtcConnected] = useState(false);
  const [webrtcError, setWebrtcError] = useState<string | null>(null);
  const dummyVideoCleanupRef = useRef<(() => void) | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoZoom, setVideoZoom] = useState(1); // Zoom level: 1 = 100%, 2 = 200%, etc.

  // Add new state for shutdown status
  const [shutdownStatus, setShutdownStatus] = useState<{
    status: 'idle' | 'processing_remaining_messages' | 'finalizing_database' | 'completed';
    message: string;
    timestamp: string;
  } | null>(null);

  // Production Series derived values
  const seriesName = analysisData?.isProductionSeries
    ? (sessionStorage.getItem('production_series_name') || 'Series')
    : '';
  const seriesMachinesList: string[] = analysisData?.isProductionSeries
    ? (analysisData?.seriesMachines || JSON.parse(sessionStorage.getItem('production_series_machines') || '[]'))
    : [];
  const currentSeriesMachineIndex = seriesMachinesList.indexOf(
    machines[currentMachineIndex] || analysisData?.machineName || ''
  );


  // Real-time camera & detection metrics from WebSocket
  const [cameraFps, setCameraFps] = useState<number>(0);
  const [detectionsPerFrame, setDetectionsPerFrame] = useState<number>(0);
  const [cameraActive, setCameraActive] = useState<boolean | null>(null); // null = unknown/standby

  // Container readiness state - always true since DL Streamer runs locally (no Docker)
  const [isContainerReady, setIsContainerReady] = useState(true);

  // Pause/Resume state
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);

  // Mill region state (basmati vs non-basmati)
  const [millRegion, setMillRegion] = useState<string>('non-basmati');
  // Ref keeps the latest region accessible inside stale socket-handler closures
  const millRegionRef = useRef<string>('non-basmati');
  useEffect(() => { millRegionRef.current = millRegion; }, [millRegion]);

  // Segmentation config: which sub-categories are headRice vs brokens
  const [segConfig, setSegConfig] = useState<Record<string, { key: string; group: "headRice" | "brokens" }[]> | null>(null);
  const segConfigRef = useRef(segConfig);

  // Map segmentation config keys to goodRice metric field names
  const segKeyToMetricField: Record<string, keyof typeof initialMetrics.goodRice> = {
    head_rice: 'headRice',
    second_one: 'secondOne',
    tibar: 'tibar',
    dubar: 'dubar',
    mini_dubar: 'miniDubar',
    mongra: 'mongra',
    mini_mongra: 'miniMongra',
    nakku: 'nakku',
    three_quarter_head_rice: 'threeFourthHead',
    broken: 'halfBrokens',
    fine_broken: 'quarterFineBrokens',
    tip: 'tips',
  };

  // Timer state for analysis duration
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [timerShouldRun, setTimerShouldRun] = useState(false); // Track if timer should be running (includes initialization + analysis + stopping)

  // Reset per-machine state when switching machines in series mode
  useEffect(() => {
    // Don't reset state if all analysis is done — prevents UI glitch when parent updates props after completion
    if (allAnalysisDone) return;
    if (analysisDataOverride?.isSeriesMode && analysisDataOverride?.machineName) {
      setCurrentSample(1);
      setCompletedSamples([]);
      setIsAnalysisRunning(false);
      setError(null);
      setShutdownStatus(null);
      // For production series using TMA flow, reset processing flag so pipeline restarts for new machine
      if (analysisDataOverride?.isProductionSeries) {
        setTmaProcessingStarted(false);
      }
      console.log('🔄 Reset state for new series machine:', analysisDataOverride.machineName);
    }
  }, [analysisDataOverride?.machineName, allAnalysisDone]);

  // Ref to track the current analysis state for WebSocket callbacks
  const isAnalysisRunningRef = useRef(isAnalysisRunning);
  useEffect(() => {
    isAnalysisRunningRef.current = isAnalysisRunning;
  }, [isAnalysisRunning]);

  // Keep isPausedRef in sync with isPaused state
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Fetch mill region on mount
  useEffect(() => {
    const fetchRegion = async () => {
      try {
        const response = await fetch('/api/raice_labz/settings/region');
        const data = await response.json();
        if (data.status === 'success' && data.region) {
          setMillRegion(data.region);
        }
      } catch (err) {
        console.warn('Failed to fetch mill region, defaulting to non-basmati');
      }
    };
    const fetchSegConfig = async () => {
      try {
        const response = await fetch('/api/raice_labz/settings/segmentation-config');
        const data = await response.json();
        if (data.status === 'success' && data.config) {
          setSegConfig(data.config);
          segConfigRef.current = data.config;
        }
      } catch (err) {
        console.warn('Failed to fetch segmentation config');
      }
    };
    fetchRegion();
    fetchSegConfig();
  }, []);

  // Track last known segmentation counts as fallback when backend sends empty data
  const lastKnownSegmentationRef = useRef({
    headrice: 0,
    threefourthhead: 0,
    halfbrokens: 0,
    quarterfinebrokens: 0,
    tips: 0,
    secondone: 0,
    tibar: 0,
    dubar: 0,
    minidubar: 0,
    mongra: 0,
    minimongra: 0,
    nakku: 0
  });

  // Zero metrics structure - all values start at 0
  const zeroMetrics = {
    goodRice: {
      headRice: 0,
      threeFourthHead: 0,
      halfBrokens: 0,
      quarterFineBrokens: 0,
      tips: 0,
      // Basmati categories
      secondOne: 0,
      tibar: 0,
      dubar: 0,
      miniDubar: 0,
      mongra: 0,
      miniMongra: 0,
      nakku: 0
    },
    rejections: {
      harvest: {
        chalkyBellyCore: 0,
        yellow: 0,
        black: 0,
        immatureGreen: 0,
        peckyGrains: 0,
        discolored: 0
      },
      process: {
        chalkyWhole: 0,
        blackTips: 0,
        burnt: 0,
        spot: 0,
        discoloration: 0
      }
    },
    foreignMatter: {
      organic: {
        red: 0,
        husk: 0,
        paddy: 0,
        chaff: 0,
        straw: 0,
        sticks: 0,
        brownRice: 0
      },
      inorganic: {
        stones: 0,
        mud: 0,
        thread: 0,
        plastic: 0,
        metals: 0,
        glass: 0,
        paper: 0,
        cardboard: 0
      }
    },
    qualityIndices: {
      whitenessIndex: 0,
      slenderRatio: 0,
      glossyIndex: 0,
      branPercentage: 0,
      degreeOfMilling: 0,
      degreeOfNutrition: 0
    }
  };

  // Calculate totals for each category - MOVED UP to be available before use
  const calculateTotals = (metricsData: typeof initialMetrics) => {
    // 🔧 FIXED: Only count active metrics (matching detailed metrics display)
    // Good Rice: All values are active (headRice, threeFourthHead, halfBrokens, quarterFineBrokens, tips)
    let goodRiceTotal = 0;
    for (const val of Object.values(metricsData.goodRice)) {
      goodRiceTotal += val;
    }
    
    // Rejections: Only count active metrics
    // Active: chalkyBellyCore, yellow, immatureGreen, peckyGrains, discolored (all from harvest)
    // Commented out: black (harvest), blackTips, burnt, spot, discoloration (process)
    let rejectionsTotal = 0;
    rejectionsTotal += metricsData.rejections.harvest.chalkyBellyCore || 0;
    rejectionsTotal += metricsData.rejections.harvest.yellow || 0;
    rejectionsTotal += metricsData.rejections.harvest.immatureGreen || 0;
    rejectionsTotal += metricsData.rejections.harvest.peckyGrains || 0;
    rejectionsTotal += metricsData.rejections.harvest.discolored || 0;
    
    // Foreign Matter: Only count active metrics
    // Active organic: red, husk, paddy, chaff, straw, brownRice
    // Commented out organic: sticks
    // Active inorganic: stones, plastic, metals, glass, paper, cardboard
    // Commented out inorganic: mud, thread
    let foreignMatterTotal = 0;
    foreignMatterTotal += metricsData.foreignMatter.organic.red || 0;
    foreignMatterTotal += metricsData.foreignMatter.organic.husk || 0;
    foreignMatterTotal += metricsData.foreignMatter.organic.paddy || 0;
    foreignMatterTotal += metricsData.foreignMatter.organic.chaff || 0;
    foreignMatterTotal += metricsData.foreignMatter.organic.straw || 0;
    foreignMatterTotal += metricsData.foreignMatter.organic.brownRice || 0;
    foreignMatterTotal += metricsData.foreignMatter.inorganic.stones || 0;
    foreignMatterTotal += metricsData.foreignMatter.inorganic.plastic || 0;
    foreignMatterTotal += metricsData.foreignMatter.inorganic.metals || 0;
    foreignMatterTotal += metricsData.foreignMatter.inorganic.glass || 0;
    foreignMatterTotal += metricsData.foreignMatter.inorganic.paper || 0;
    foreignMatterTotal += metricsData.foreignMatter.inorganic.cardboard || 0;
    
    const grandTotal = goodRiceTotal + rejectionsTotal + foreignMatterTotal;
    
    return {
      goodRice: goodRiceTotal,
      rejections: rejectionsTotal,
      foreignMatter: foreignMatterTotal,
      total: grandTotal
    };
  };

  // Function to normalize metrics to sum to 100%
  const normalizeMetrics = (metrics: typeof zeroMetrics) => {
    // 🔧 FIXED: Only include active metrics when calculating normalization factor
    // (matching detailed metrics display - excluding commented-out metrics)
    const allValues: number[] = [];
    
    // Add good rice values (all are active)
    Object.values(metrics.goodRice).forEach(val => allValues.push(val));
    
    // Add active rejection values only
    // Active: chalkyBellyCore, yellow, immatureGreen, peckyGrains, discolored (all from harvest)
    // Commented out: black (harvest), blackTips, burnt, spot, discoloration (process)
    allValues.push(metrics.rejections.harvest.chalkyBellyCore || 0);
    allValues.push(metrics.rejections.harvest.yellow || 0);
    allValues.push(metrics.rejections.harvest.immatureGreen || 0);
    allValues.push(metrics.rejections.harvest.peckyGrains || 0);
    allValues.push(metrics.rejections.harvest.discolored || 0);
    
    // Add active foreign matter values only
    // Active organic: red, husk, paddy, chaff, straw, brownRice
    // Commented out organic: sticks
    // Active inorganic: stones, plastic, metals, glass, paper, cardboard
    // Commented out inorganic: mud, thread
    allValues.push(metrics.foreignMatter.organic.red || 0);
    allValues.push(metrics.foreignMatter.organic.husk || 0);
    allValues.push(metrics.foreignMatter.organic.paddy || 0);
    allValues.push(metrics.foreignMatter.organic.chaff || 0);
    allValues.push(metrics.foreignMatter.organic.straw || 0);
    allValues.push(metrics.foreignMatter.organic.brownRice || 0);
    allValues.push(metrics.foreignMatter.inorganic.stones || 0);
    allValues.push(metrics.foreignMatter.inorganic.plastic || 0);
    allValues.push(metrics.foreignMatter.inorganic.metals || 0);
    allValues.push(metrics.foreignMatter.inorganic.glass || 0);
    allValues.push(metrics.foreignMatter.inorganic.paper || 0);
    allValues.push(metrics.foreignMatter.inorganic.cardboard || 0);
    
    const totalSum = allValues.reduce((sum, val) => sum + val, 0);
    const normalizationFactor = totalSum > 0 ? 100 / totalSum : 0;
    
    const normalized = {
      goodRice: {
        headRice: metrics.goodRice.headRice * normalizationFactor,
        threeFourthHead: metrics.goodRice.threeFourthHead * normalizationFactor,
        halfBrokens: metrics.goodRice.halfBrokens * normalizationFactor,
        quarterFineBrokens: metrics.goodRice.quarterFineBrokens * normalizationFactor,
        tips: metrics.goodRice.tips * normalizationFactor,
        secondOne: (metrics.goodRice.secondOne || 0) * normalizationFactor,
        tibar: (metrics.goodRice.tibar || 0) * normalizationFactor,
        dubar: (metrics.goodRice.dubar || 0) * normalizationFactor,
        miniDubar: (metrics.goodRice.miniDubar || 0) * normalizationFactor,
        mongra: (metrics.goodRice.mongra || 0) * normalizationFactor,
        miniMongra: (metrics.goodRice.miniMongra || 0) * normalizationFactor,
        nakku: (metrics.goodRice.nakku || 0) * normalizationFactor,
      },
      rejections: {
        harvest: {
          chalkyBellyCore: metrics.rejections.harvest.chalkyBellyCore * normalizationFactor,
          yellow: metrics.rejections.harvest.yellow * normalizationFactor,
          black: metrics.rejections.harvest.black * normalizationFactor,
          immatureGreen: metrics.rejections.harvest.immatureGreen * normalizationFactor,
          peckyGrains: metrics.rejections.harvest.peckyGrains * normalizationFactor,
          discolored: metrics.rejections.harvest.discolored * normalizationFactor
        },
        process: {
          chalkyWhole: metrics.rejections.process.chalkyWhole * normalizationFactor,
          blackTips: metrics.rejections.process.blackTips * normalizationFactor,
          burnt: metrics.rejections.process.burnt * normalizationFactor,
          spot: metrics.rejections.process.spot * normalizationFactor,
          discoloration: metrics.rejections.process.discoloration * normalizationFactor
        }
      }, 
      foreignMatter: {
        organic: {
          red: metrics.foreignMatter.organic.red * normalizationFactor,
          husk: metrics.foreignMatter.organic.husk * normalizationFactor,
          paddy: metrics.foreignMatter.organic.paddy * normalizationFactor,
          chaff: metrics.foreignMatter.organic.chaff * normalizationFactor,
          straw: metrics.foreignMatter.organic.straw * normalizationFactor,
          sticks: metrics.foreignMatter.organic.sticks * normalizationFactor,
          brownRice: metrics.foreignMatter.organic.brownRice * normalizationFactor
        },
        inorganic: {
          stones: metrics.foreignMatter.inorganic.stones * normalizationFactor,
          mud: metrics.foreignMatter.inorganic.mud * normalizationFactor,
          thread: metrics.foreignMatter.inorganic.thread * normalizationFactor,
          plastic: metrics.foreignMatter.inorganic.plastic * normalizationFactor,
          metals: metrics.foreignMatter.inorganic.metals * normalizationFactor,
          glass: metrics.foreignMatter.inorganic.glass * normalizationFactor,
          paper: metrics.foreignMatter.inorganic.paper * normalizationFactor,
          cardboard: metrics.foreignMatter.inorganic.cardboard * normalizationFactor
        }
      },
      qualityIndices: {
        whitenessIndex: metrics.qualityIndices.whitenessIndex,
        slenderRatio: metrics.qualityIndices.slenderRatio || 0,
        glossyIndex: metrics.qualityIndices.glossyIndex,
        branPercentage: metrics.qualityIndices.branPercentage,
        degreeOfMilling: metrics.qualityIndices.degreeOfMilling,
        degreeOfNutrition: metrics.qualityIndices.degreeOfNutrition
      }
    };
    
    return normalized;
  };

  // Initialize with zero metrics instead of template data
  const initialMetrics = zeroMetrics;
  
  // Zero counts structure - all values start at 0
  const zeroCounts = {
    goodRice: {
      headRice: 0,
      threeFourthHead: 0,
      halfBrokens: 0,
      quarterFineBrokens: 0,
      tips: 0,
      // Basmati categories
      secondOne: 0,
      tibar: 0,
      dubar: 0,
      miniDubar: 0,
      mongra: 0,
      miniMongra: 0,
      nakku: 0
    },
    rejections: {
      harvest: {
        chalkyBellyCore: 0,
        yellow: 0,
        black: 0,
        immatureGreen: 0,
        peckyGrains: 0,
        discolored: 0
      },
      process: {
        chalkyWhole: 0,
        blackTips: 0,
        burnt: 0,
        spot: 0,
        discoloration: 0
      }
    },
    foreignMatter: {
      organic: {
        red: 0,
        husk: 0,
        paddy: 0,
        chaff: 0,
        straw: 0,
        sticks: 0,
        brownRice: 0
      },
      inorganic: {
        stones: 0,
        mud: 0,
        thread: 0,
        plastic: 0,
        metals: 0,
        glass: 0,
        paper: 0,
        cardboard: 0
      }
    },
    qualityIndices: {
      whitenessIndex: 0,
      slenderRatio: 0,
      glossyIndex: 0,
      branPercentage: 0,
      degreeOfMilling: 0,
      degreeOfNutrition: 0
    }
  };
  
  const [metrics, setMetrics] = useState(initialMetrics);
  const [actualCounts, setActualCounts] = useState(zeroCounts);
  
  // 🔧 NEW: Ref to track current metrics to prevent zero flicker
  const currentMetricsRef = useRef<typeof initialMetrics>(initialMetrics);
  // 🔧 NEW: Ref to track current counts to prevent zero flicker during toggle
  const currentCountsRef = useRef<typeof zeroCounts>(zeroCounts);
  // 🔧 NEW: Preserved metrics after stop - keep until Complete Sample is clicked
  const preservedMetricsAfterStopRef = useRef<typeof initialMetrics | null>(null);
  const preservedCountsAfterStopRef = useRef<typeof zeroCounts | null>(null);
  
  // 🔧 NEW: Keep currentMetricsRef and currentCountsRef in sync with state to prevent zero flicker
  // MOVED HERE: After metrics is defined to prevent ReferenceError
  useEffect(() => {
    const totals = calculateTotals(metrics);
    if (totals.total > 0) {
      currentMetricsRef.current = metrics;
    }
  }, [metrics]);
  
  // 🔧 NEW: Keep currentCountsRef in sync with actualCounts state
  useEffect(() => {
    const totals = calculateTotals(convertCountsToRawMetrics(actualCounts));
    if (totals.total > 0) {
      currentCountsRef.current = actualCounts;
    }
  }, [actualCounts]);

  // 🔧 OPTIMIZED: Debounced metrics update to prevent excessive state changes
  const debouncedSetMetrics = useRef<NodeJS.Timeout | null>(null);
  const lastNonZeroMetrics = useRef<typeof initialMetrics | null>(null); // Track last non-zero metrics to prevent zero flicker
  
  const updateMetricsDebounced = (newMetrics: typeof initialMetrics) => {
    if (debouncedSetMetrics.current) {
      clearTimeout(debouncedSetMetrics.current);
    }
    
    // 🔧 FIXED: Track last non-zero metrics to prevent zero metrics from overwriting valid data
    const totals = calculateTotals(newMetrics);
    if (totals.total > 0) {
      lastNonZeroMetrics.current = newMetrics;
    }
    
    debouncedSetMetrics.current = setTimeout(() => {
      // 🔧 FIXED: If new metrics are zero but we have non-zero metrics, use the non-zero ones
      // This prevents flickering when rapid updates include zero metrics
      const totals = calculateTotals(newMetrics);
      const finalMetrics = (totals.total === 0 && lastNonZeroMetrics.current && isAnalysisRunningRef.current) 
        ? lastNonZeroMetrics.current 
        : newMetrics;
      
      // 🔧 FIXED: Update ref before setting state to prevent race conditions
      currentMetricsRef.current = finalMetrics;
      setMetrics(finalMetrics);
      // NEW: Track metrics updates for real-time indicator
      setLastMetricsUpdate(new Date());
      setMetricsUpdateCount(prev => prev + 1);
      debouncedSetMetrics.current = null;
    }, 16); // 🔧 FIXED: Reduced to 16ms (~60fps) for smooth, real-time updates
  };

  // Helper function to convert counts to raw metrics format for normalization
  const convertCountsToRawMetrics = (counts: typeof actualCounts) => {
    return {
      goodRice: {
        headRice: counts.goodRice?.headRice || 0,
        threeFourthHead: counts.goodRice?.threeFourthHead || 0,
        halfBrokens: counts.goodRice?.halfBrokens || 0,
        quarterFineBrokens: counts.goodRice?.quarterFineBrokens || 0,
        tips: counts.goodRice?.tips || 0,
        secondOne: counts.goodRice?.secondOne || 0,
        tibar: counts.goodRice?.tibar || 0,
        dubar: counts.goodRice?.dubar || 0,
        miniDubar: counts.goodRice?.miniDubar || 0,
        mongra: counts.goodRice?.mongra || 0,
        miniMongra: counts.goodRice?.miniMongra || 0,
        nakku: counts.goodRice?.nakku || 0,
      },
      rejections: {
        harvest: {
          chalkyBellyCore: counts.rejections?.harvest?.chalkyBellyCore || 0,
          yellow: counts.rejections?.harvest?.yellow || 0,
          black: counts.rejections?.harvest?.black || 0,
          immatureGreen: counts.rejections?.harvest?.immatureGreen || 0,
          peckyGrains: counts.rejections?.harvest?.peckyGrains || 0,
          discolored: counts.rejections?.harvest?.discolored || 0
        },
        process: {
          chalkyWhole: counts.rejections?.process?.chalkyWhole || 0,
          blackTips: counts.rejections?.process?.blackTips || 0,
          burnt: counts.rejections?.process?.burnt || 0,
          spot: counts.rejections?.process?.spot || 0,
          discoloration: counts.rejections?.process?.discoloration || 0
        }
      },
      foreignMatter: {
        organic: {
          red: counts.foreignMatter?.organic?.red || 0,
          husk: counts.foreignMatter?.organic?.husk || 0,
          paddy: counts.foreignMatter?.organic?.paddy || 0,
          chaff: counts.foreignMatter?.organic?.chaff || 0,
          straw: counts.foreignMatter?.organic?.straw || 0,
          sticks: counts.foreignMatter?.organic?.sticks || 0,
          brownRice: counts.foreignMatter?.organic?.brownRice || 0
        },
        inorganic: {
          stones: counts.foreignMatter?.inorganic?.stones || 0,
          mud: counts.foreignMatter?.inorganic?.mud || 0,
          thread: counts.foreignMatter?.inorganic?.thread || 0,
          plastic: counts.foreignMatter?.inorganic?.plastic || 0,
          metals: counts.foreignMatter?.inorganic?.metals || 0,
          glass: counts.foreignMatter?.inorganic?.glass || 0,
          paper: counts.foreignMatter?.inorganic?.paper || 0,
          cardboard: counts.foreignMatter?.inorganic?.cardboard || 0
        }
      },
      qualityIndices: {
        whitenessIndex: counts.qualityIndices?.whitenessIndex || 0,
        slenderRatio: counts.qualityIndices?.slenderRatio || 0,
        glossyIndex: counts.qualityIndices?.glossyIndex || 0,
        branPercentage: counts.qualityIndices?.branPercentage || 0,
        degreeOfMilling: counts.qualityIndices?.degreeOfMilling || 0,
        degreeOfNutrition: counts.qualityIndices?.degreeOfNutrition || 0
      }
    };
  };

  // Function to convert backend statistics to frontend metrics format
  const convertBackendStatsToMetrics = (backendStats: any, qualityIndices?: any, isResetSignal?: boolean, currentCounts?: typeof actualCounts, isAnalysisRunning?: boolean) => {
    console.log('🔍 🔍 convertBackendStatsToMetrics CALLED with:', backendStats);
    console.log('🔍 🔍 Call stack:', new Error().stack);
    
    // 🔧 FIXED: Handle the actual backend data structure
    if (!backendStats || !backendStats.goodrice || !backendStats.defective || !backendStats.foreign) {
      console.log('🔍 ❌ Early return: Invalid backend stats structure');
      console.log('🔍 ❌ Backend stats keys:', Object.keys(backendStats || {}));
      // 🔧 NEW: Preserve current counts during active analysis even if backend structure is invalid
      if (isAnalysisRunning && currentCounts) {
        console.log('🔍 🔄 Preserving current counts during active analysis (invalid backend structure)');
        // 🔧 FIXED: Calculate metrics from preserved counts so percentage view works correctly
        const preservedRawMetrics = convertCountsToRawMetrics(currentCounts);
        // 🔧 FIX: Preserve quality indices — use backend data if available, else fall back to what currentCounts already carries
        preservedRawMetrics.qualityIndices.whitenessIndex = qualityIndices?.whitenessIndex || currentCounts.qualityIndices?.whitenessIndex || 0;
        preservedRawMetrics.qualityIndices.slenderRatio = qualityIndices?.slenderRatio || currentCounts.qualityIndices?.slenderRatio || 0;
        const preservedMetrics = normalizeMetrics(preservedRawMetrics);
        return { metrics: preservedMetrics, counts: currentCounts, preserveCounts: true };
      }
      return { metrics: zeroMetrics, counts: {
        goodRice: { headRice: 0, threeFourthHead: 0, halfBrokens: 0, quarterFineBrokens: 0, tips: 0, secondOne: 0, tibar: 0, dubar: 0, miniDubar: 0, mongra: 0, miniMongra: 0, nakku: 0 },
        rejections: { harvest: {}, process: {} },
        foreignMatter: { organic: {}, inorganic: {} }
      }};
    }
    
    const goodRiceData = backendStats.goodrice;
    const defectiveData = backendStats.defective;
    const foreignData = backendStats.foreign;
    
    console.log('🔍 🔍 Backend data structure:');
    console.log('  📊 Good Rice:', goodRiceData);
    console.log('  📊 Defective:', defectiveData);
    console.log('  📊 Foreign:', foreignData);
    
    // Get total counts from backend
    const goodRiceTotal = goodRiceData.total || 0;
    const defectiveTotal = defectiveData.total || 0;
    const foreignTotal = foreignData.total || 0;
    const grandTotal = backendStats.total || 0;
    
    console.log('🔍 EXTRACTED TOTALS FROM BACKEND:');
    console.log('  📊 Good Rice Total:', goodRiceTotal);
    console.log('  📊 Defective Total:', defectiveTotal);
    console.log('  📊 Foreign Total:', foreignTotal);
    console.log('  📊 Grand Total:', grandTotal);
    
    // 🔧 FIXED: Only honor reset signal when analysis is NOT running
    // During active analysis, tracking state resets may occur but we should preserve counts
    if (isResetSignal) {
      if (isAnalysisRunning && currentCounts) {
        console.log('🔍 🔄 Reset signal received during active analysis - preserving current counts');
        // 🔧 FIXED: Calculate metrics from preserved counts so percentage view works correctly
        const preservedRawMetrics = convertCountsToRawMetrics(currentCounts);
        // 🔧 FIX: Preserve quality indices through the reset signal
        preservedRawMetrics.qualityIndices.whitenessIndex = qualityIndices?.whitenessIndex || currentCounts.qualityIndices?.whitenessIndex || 0;
        preservedRawMetrics.qualityIndices.slenderRatio = qualityIndices?.slenderRatio || currentCounts.qualityIndices?.slenderRatio || 0;
        const preservedMetrics = normalizeMetrics(preservedRawMetrics);
        return { metrics: preservedMetrics, counts: currentCounts, preserveCounts: true };
      } else {
        console.log('🔍 🔄 Reset signal detected (analysis not running) - returning zero metrics');
        return { metrics: zeroMetrics, counts: {
          goodRice: { headRice: 0, threeFourthHead: 0, halfBrokens: 0, quarterFineBrokens: 0, tips: 0, secondOne: 0, tibar: 0, dubar: 0, miniDubar: 0, mongra: 0, miniMongra: 0, nakku: 0 },
          rejections: { harvest: {}, process: {} },
          foreignMatter: { organic: {}, inorganic: {} }
        }};
      }
    }
    
    // 🔧 FIXED: During active analysis, preserve current counts when grandTotal is 0
    // Only reset to zeros when analysis is not running (new sample starting)
    if (grandTotal === 0) {
      if (isAnalysisRunning && currentCounts) {
        console.log('🔍 🔄 Preserving current counts during active analysis (grandTotal === 0)');
        // 🔧 FIXED: Calculate metrics from preserved counts so percentage view works correctly
        const preservedRawMetrics = convertCountsToRawMetrics(currentCounts);
        // 🔧 FIX: Preserve quality indices — backend still sends cached qualityIndices even on empty frames
        preservedRawMetrics.qualityIndices.whitenessIndex = qualityIndices?.whitenessIndex || currentCounts.qualityIndices?.whitenessIndex || 0;
        preservedRawMetrics.qualityIndices.slenderRatio = qualityIndices?.slenderRatio || currentCounts.qualityIndices?.slenderRatio || 0;
        const preservedMetrics = normalizeMetrics(preservedRawMetrics);
        return { metrics: preservedMetrics, counts: currentCounts, preserveCounts: true };
      } else {
        console.log('🔍 ⚠️ No objects detected yet, returning zero metrics (analysis not running)');
        return { metrics: zeroMetrics, counts: {
          goodRice: { headRice: 0, threeFourthHead: 0, halfBrokens: 0, quarterFineBrokens: 0, tips: 0, secondOne: 0, tibar: 0, dubar: 0, miniDubar: 0, mongra: 0, miniMongra: 0, nakku: 0 },
          rejections: { harvest: {}, process: {} },
          foreignMatter: { organic: {}, inorganic: {} }
        }};
      }
    }
    
    // 🔧 FIXED: Use actual segmentation data from backend if available
    const segmentationData = goodRiceData.segmentation || {};
    console.log('🔍 🔍 Segmentation data from backend:', segmentationData);
    
    // 🔧 FIXED: Use actual defective details from backend
    const defectiveDetails = defectiveData.details || {};
    console.log('🔍 🔍 Defective details from backend:', defectiveDetails);
    
    // 🔧 FIXED: Use actual foreign matter details from backend
    const foreignDetails = foreignData.details || {};
    console.log('🔍 🔍 Foreign matter details from backend:', foreignDetails);
    
    // 🔧 FIXED: Use backend counts directly (backend already does peak tracking)
    // The backend sends actual counts from grain_tracker.counters which are the source of truth
    const goodRiceUniqueCount = goodRiceData.total || 0;
    
    let goodRiceCounts;
    // Check if backend sent valid segmentation data (non-empty object with at least one non-zero value)
    const hasValidSegmentationData = segmentationData && 
      Object.keys(segmentationData).length > 0 &&
      Object.values(segmentationData).some((count: any) => (count || 0) > 0);
    
    if (hasValidSegmentationData) {
      // Use backend segmentation counts directly (backend already handles peak tracking)
      goodRiceCounts = {
        headRice: Math.round(segmentationData.headrice || 0),
        threeFourthHead: Math.round(segmentationData.threefourthhead || 0),
        halfBrokens: Math.round(segmentationData.halfbrokens || 0),
        quarterFineBrokens: Math.round(segmentationData.quarterfinebrokens || 0),
        tips: Math.round(segmentationData.tips || 0),
        secondOne: Math.round(segmentationData.secondone || 0),
        tibar: Math.round(segmentationData.tibar || 0),
        dubar: Math.round(segmentationData.dubar || 0),
        miniDubar: Math.round(segmentationData.minidubar || 0),
        mongra: Math.round(segmentationData.mongra || 0),
        miniMongra: Math.round(segmentationData.minimongra || 0),
        nakku: Math.round(segmentationData.nakku || 0),
      };

      // Update last known values for future fallback (only if counts are non-zero)
      // 🔧 FIXED: Don't update fallback if all counts are zero (indicates reset/new trial)
      const segTotal = goodRiceCounts.headRice + goodRiceCounts.threeFourthHead +
                       goodRiceCounts.halfBrokens + goodRiceCounts.quarterFineBrokens +
                       goodRiceCounts.tips +
                       goodRiceCounts.secondOne + goodRiceCounts.tibar + goodRiceCounts.dubar +
                       goodRiceCounts.miniDubar + goodRiceCounts.mongra + goodRiceCounts.miniMongra + goodRiceCounts.nakku;

      if (segTotal > 0) {
        lastKnownSegmentationRef.current = {
          headrice: goodRiceCounts.headRice,
          threefourthhead: goodRiceCounts.threeFourthHead,
          halfbrokens: goodRiceCounts.halfBrokens,
          quarterfinebrokens: goodRiceCounts.quarterFineBrokens,
          tips: goodRiceCounts.tips,
          secondone: goodRiceCounts.secondOne,
          tibar: goodRiceCounts.tibar,
          dubar: goodRiceCounts.dubar,
          minidubar: goodRiceCounts.miniDubar,
          mongra: goodRiceCounts.mongra,
          minimongra: goodRiceCounts.miniMongra,
          nakku: goodRiceCounts.nakku
        };
      }
      
      console.log('🔍 🔍 Using backend segmentation counts directly:', {
        backendSegmentation: goodRiceCounts,
        segTotal,
        uniqueCount: goodRiceUniqueCount
      });
    } else {
      // 🔧 FIXED: Backend sent empty/missing segmentation data
      // If grandTotal is 0 (new trial starting with empty Kafka messages), use zeros
      // Otherwise, use last known values as fallback (only during active analysis with temporary empty data)
      if (grandTotal === 0) {
        // New trial starting with empty Kafka messages - use zeros, don't use fallback
        goodRiceCounts = {
          headRice: 0,
          threeFourthHead: 0,
          halfBrokens: 0,
          quarterFineBrokens: 0,
          tips: 0,
          secondOne: 0,
          tibar: 0,
          dubar: 0,
          miniDubar: 0,
          mongra: 0,
          miniMongra: 0,
          nakku: 0
        };

        // 🔧 NEW: Reset fallback values when new trial starts with empty messages
        lastKnownSegmentationRef.current = {
          headrice: 0,
          threefourthhead: 0,
          halfbrokens: 0,
          quarterfinebrokens: 0,
          tips: 0,
          secondone: 0,
          tibar: 0,
          dubar: 0,
          minidubar: 0,
          mongra: 0,
          minimongra: 0,
          nakku: 0
        };
        
        console.log('🔍 🔍 New trial with empty Kafka messages - using zeros (no fallback):', {
          grandTotal,
          backendSent: segmentationData
        });
      } else {
        // Temporary empty data during active analysis - use last known values as fallback
        goodRiceCounts = {
          headRice: lastKnownSegmentationRef.current.headrice,
          threeFourthHead: lastKnownSegmentationRef.current.threefourthhead,
          halfBrokens: lastKnownSegmentationRef.current.halfbrokens,
          quarterFineBrokens: lastKnownSegmentationRef.current.quarterfinebrokens,
          tips: lastKnownSegmentationRef.current.tips,
          secondOne: lastKnownSegmentationRef.current.secondone,
          tibar: lastKnownSegmentationRef.current.tibar,
          dubar: lastKnownSegmentationRef.current.dubar,
          miniDubar: lastKnownSegmentationRef.current.minidubar,
          mongra: lastKnownSegmentationRef.current.mongra,
          miniMongra: lastKnownSegmentationRef.current.minimongra,
          nakku: lastKnownSegmentationRef.current.nakku
        };
        
        console.log('🔍 🔍 No valid segmentation data from backend - using last known values (temporary fallback):', {
          lastKnown: goodRiceCounts,
          uniqueCount: goodRiceUniqueCount,
          backendSent: segmentationData
        });
      }
    }
    
    // 🔧 FIXED: Map backend defective details to frontend rejections structure
    const harvestRejectionCounts = {
      chalkyBellyCore: defectiveDetails.chalky || 0,
      yellow: defectiveDetails.yellow || 0,
      black: defectiveDetails.black || 0,
      immatureGreen: defectiveDetails.immature || 0,
      peckyGrains: defectiveDetails.peckygrains || 0,
      discolored: defectiveDetails.discolored || 0
    };
    
    const processRejectionCounts = {
      chalkyWhole: 0, // Chalky is already counted under chalkyBellyCore in harvest - do NOT double-count
      blackTips: defectiveDetails.blacktips || 0,
      burnt: defectiveDetails.burnt || 0,
      spot: defectiveDetails.spot || 0,
      discoloration: 0 // Discolored is already counted in harvest - do NOT double-count
    };
    
    // 🔧 FIXED: Map backend foreign matter details to frontend structure
    const organicForeignCounts = {
      red: foreignDetails.red || 0,
      husk: foreignDetails.husk || 0,
      paddy: foreignDetails.paddy || 0,
      chaff: foreignDetails.chaff || 0,
      straw: foreignDetails.straw || 0,
      sticks: foreignDetails.sticks || 0,
      brownRice: foreignDetails.brownrice || 0
    };
    
    const inorganicForeignCounts = {
      stones: foreignDetails.stones || 0,
      mud: foreignDetails.mud || 0,
      thread: foreignDetails.thread || 0,
      plastic: foreignDetails.plastic || 0,
      metals: foreignDetails.metals || 0,
      glass: foreignDetails.glass || 0,
      paper: foreignDetails.paper || 0,
      cardboard: foreignDetails.cardboard || 0
    };
    
    // 🔧 FIXED: Build raw metrics structure first, then normalize
    const rawMetrics = {
      goodRice: {
        headRice: goodRiceCounts.headRice,
        threeFourthHead: goodRiceCounts.threeFourthHead,
        halfBrokens: goodRiceCounts.halfBrokens,
        quarterFineBrokens: goodRiceCounts.quarterFineBrokens,
        tips: goodRiceCounts.tips,
        secondOne: goodRiceCounts.secondOne || 0,
        tibar: goodRiceCounts.tibar || 0,
        dubar: goodRiceCounts.dubar || 0,
        miniDubar: goodRiceCounts.miniDubar || 0,
        mongra: goodRiceCounts.mongra || 0,
        miniMongra: goodRiceCounts.miniMongra || 0,
        nakku: goodRiceCounts.nakku || 0,
      },
      rejections: {
        harvest: {
          chalkyBellyCore: harvestRejectionCounts.chalkyBellyCore,
          yellow: harvestRejectionCounts.yellow,
          black: harvestRejectionCounts.black,
          immatureGreen: harvestRejectionCounts.immatureGreen,
          peckyGrains: harvestRejectionCounts.peckyGrains,
          discolored: harvestRejectionCounts.discolored
        },
        process: {
          chalkyWhole: processRejectionCounts.chalkyWhole,
          blackTips: processRejectionCounts.blackTips,
          burnt: processRejectionCounts.burnt,
          spot: processRejectionCounts.spot,
          discoloration: processRejectionCounts.discoloration
        }
      },
      foreignMatter: {
        organic: {
          red: organicForeignCounts.red,
          husk: organicForeignCounts.husk,
          paddy: organicForeignCounts.paddy,
          chaff: organicForeignCounts.chaff,
          straw: organicForeignCounts.straw,
          sticks: organicForeignCounts.sticks,
          brownRice: organicForeignCounts.brownRice
        },
        inorganic: {
          stones: inorganicForeignCounts.stones,
          mud: inorganicForeignCounts.mud,
          thread: inorganicForeignCounts.thread,
          plastic: inorganicForeignCounts.plastic,
          metals: inorganicForeignCounts.metals,
          glass: inorganicForeignCounts.glass,
          paper: inorganicForeignCounts.paper,
          cardboard: inorganicForeignCounts.cardboard
        }
      },
      qualityIndices: {
        whitenessIndex: qualityIndices?.whitenessIndex || 0,
        slenderRatio: qualityIndices?.slenderRatio || 0,
        glossyIndex: 0,
        branPercentage: 0,
        degreeOfMilling: 0,
        degreeOfNutrition: 0
      }
    };
    
    // 🔧 DEBUG: Log the raw metrics before normalization
    console.log('🔍 RAW METRICS BEFORE NORMALIZATION:');
    console.log('  📊 Good Rice:', rawMetrics.goodRice);
    console.log('  📊 Harvest Rejections:', rawMetrics.rejections.harvest);
    console.log('  📊 Process Rejections:', rawMetrics.rejections.process);
    console.log('  📊 Organic Foreign Matter:', rawMetrics.foreignMatter.organic);
    console.log('  📊 Inorganic Foreign Matter:', rawMetrics.foreignMatter.inorganic);
    
    // 🔧 NEW: Build the complete counts structure
    const rawCounts = {
      goodRice: goodRiceCounts,
      rejections: {
        harvest: harvestRejectionCounts,
        process: processRejectionCounts
      },
      foreignMatter: {
        organic: organicForeignCounts,
        inorganic: inorganicForeignCounts
      },
      // 🔧 FIX: Include qualityIndices so actualCounts carries them into preserve-path rebuilds
      qualityIndices: {
        whitenessIndex: qualityIndices?.whitenessIndex || 0,
        slenderRatio: qualityIndices?.slenderRatio || 0,
        glossyIndex: 0,
        branPercentage: 0,
        degreeOfMilling: 0,
        degreeOfNutrition: 0
      }
    };
    
    // 🔧 DEBUG: Log the raw counts
    console.log('🔍 RAW COUNTS FROM BACKEND:');
    console.log('  📊 Good Rice Counts:', rawCounts.goodRice);
    console.log('  📊 Harvest Rejection Counts:', rawCounts.rejections.harvest);
    console.log('  📊 Process Rejection Counts:', rawCounts.rejections.process);
    console.log('  📊 Organic Foreign Counts:', rawCounts.foreignMatter.organic);
    console.log('  📊 Inorganic Foreign Counts:', rawCounts.foreignMatter.inorganic);
    
    // 🔧 FIX: Normalize the raw metrics to ensure they sum to 100%
    console.log('🔍 🔍 About to call normalizeMetrics...');
    const normalizedMetrics = normalizeMetrics(rawMetrics);
    
    // 🔧 DEBUG: Log the normalized metrics
    console.log('🔍 NORMALIZED METRICS AFTER NORMALIZATION:');
    console.log('  📊 Good Rice:', normalizedMetrics.goodRice);
    console.log('  📊 Rejections:', normalizedMetrics.rejections);
    console.log('  📊 Foreign Matter:', normalizedMetrics.foreignMatter);
    
    console.log('🔍 🔍 Returning normalized metrics:', normalizedMetrics);
    console.log('🔍 🔍 Returning raw counts:', rawCounts);
    return { metrics: normalizedMetrics, counts: rawCounts };
  };

  // Convert database metrics to frontend format (support both quality_metrics and GrainMetrics for parity with backend)
  const convertDatabaseMetricsToFrontend = (dbMetrics: any) => {
    const qualityMetrics = dbMetrics?.quality_metrics ?? dbMetrics?.GrainMetrics;
    if (!dbMetrics || !qualityMetrics) {
      return { metrics: zeroMetrics, counts: actualCounts };
    }
    const goodRice = qualityMetrics.goodRice || {};
    const rejections = qualityMetrics.rejections || {};
    const foreignMatter = qualityMetrics.foreignMatter || {};

    // Calculate total for percentage conversion
    const totalGoodRice = goodRice.total || 0;
    const totalRejections = rejections.total || 0;
    const totalForeignMatter = foreignMatter.total || 0;
    const grandTotal = totalGoodRice + totalRejections + totalForeignMatter;

    if (grandTotal === 0) {
      return { metrics: zeroMetrics, counts: actualCounts };
    }

    // Convert counts to percentages
    const convertToPercentage = (count: number) => (count / grandTotal) * 100;

    // Map database structure to frontend structure
    const rawMetrics = {
      goodRice: {
        headRice: convertToPercentage(goodRice.headRice || 0),
        threeFourthHead: convertToPercentage(goodRice.threeFourthHead || 0),
        halfBrokens: convertToPercentage(goodRice.halfBrokens || 0),
        quarterFineBrokens: convertToPercentage(goodRice.quarterFineBrokens || 0),
        tips: convertToPercentage(goodRice.tips || 0),
        secondOne: convertToPercentage(goodRice.secondOne || 0),
        tibar: convertToPercentage(goodRice.tibar || 0),
        dubar: convertToPercentage(goodRice.dubar || 0),
        miniDubar: convertToPercentage(goodRice.miniDubar || 0),
        mongra: convertToPercentage(goodRice.mongra || 0),
        miniMongra: convertToPercentage(goodRice.miniMongra || 0),
        nakku: convertToPercentage(goodRice.nakku || 0),
      },
      rejections: {
        harvest: {
          chalkyBellyCore: convertToPercentage(rejections.chalky || 0),
          yellow: convertToPercentage(rejections.yellow || 0),
          black: convertToPercentage(rejections.black || 0),
          immatureGreen: convertToPercentage(rejections.immature || 0),
          peckyGrains: convertToPercentage(rejections.peckygrains || 0),
          discolored: convertToPercentage(rejections.discolored || 0)
        },
        process: {
          chalkyWhole: convertToPercentage(rejections.chalky || 0), // Same as chalkyBellyCore
          blackTips: convertToPercentage(rejections.blacktips || 0),
          burnt: convertToPercentage(rejections.burnt || 0),
          spot: convertToPercentage(rejections.spot || 0),
          discoloration: convertToPercentage(rejections.discolored || 0) // Same as discolored
        }
      },
      foreignMatter: {
        organic: {
          red: convertToPercentage(foreignMatter.red || 0),
          husk: convertToPercentage(foreignMatter.husk || 0),
          paddy: convertToPercentage(foreignMatter.paddy || 0),
          chaff: convertToPercentage(foreignMatter.chaff || 0),
          straw: convertToPercentage(foreignMatter.straw || 0),
          sticks: convertToPercentage(foreignMatter.sticks || 0),
          brownRice: convertToPercentage(foreignMatter.brownrice || 0)
        },
        inorganic: {
          stones: convertToPercentage(foreignMatter.stones || 0),
          mud: convertToPercentage(foreignMatter.mud || 0),
          thread: convertToPercentage(foreignMatter.thread || 0),
          plastic: convertToPercentage(foreignMatter.plastic || 0),
          metals: convertToPercentage(foreignMatter.metals || 0),
          glass: convertToPercentage(foreignMatter.glass || 0),
          paper: convertToPercentage(foreignMatter.paper || 0),
          cardboard: convertToPercentage(foreignMatter.cardboard || 0)
        }
      },
      qualityIndices: {
        whitenessIndex: qualityMetrics.whitenessIndex || 0,
        slenderRatio: qualityMetrics.slenderRatio || 0,
        glossyIndex: qualityMetrics.glossyIndex || 0,
        branPercentage: qualityMetrics.branPercentage || 0,
        degreeOfMilling: qualityMetrics.degreeOfMilling || 0,
        degreeOfNutrition: qualityMetrics.degreeOfNutrition || 0
      }
    };

    // Normalize to ensure total = 100%
    const normalizedMetrics = normalizeMetrics(rawMetrics);
    
    // Build counts structure (same as rawMetrics but without percentage conversion)
    const rawCounts = {
      goodRice: {
        headRice: goodRice.headRice || 0,
        threeFourthHead: goodRice.threeFourthHead || 0,
        halfBrokens: goodRice.halfBrokens || 0,
        quarterFineBrokens: goodRice.quarterFineBrokens || 0,
        tips: goodRice.tips || 0,
        secondOne: goodRice.secondOne || 0,
        tibar: goodRice.tibar || 0,
        dubar: goodRice.dubar || 0,
        miniDubar: goodRice.miniDubar || 0,
        mongra: goodRice.mongra || 0,
        miniMongra: goodRice.miniMongra || 0,
        nakku: goodRice.nakku || 0,
      },
      rejections: {
        harvest: {
          chalkyBellyCore: rejections.chalky || 0,
          yellow: rejections.yellow || 0,
          black: rejections.black || 0,
          immatureGreen: rejections.immature || 0,
          peckyGrains: rejections.peckygrains || 0,
          discolored: rejections.discolored || 0
        },
        process: {
          chalkyWhole: rejections.chalky || 0,
          blackTips: rejections.blacktips || 0,
          burnt: rejections.burnt || 0,
          spot: rejections.spot || 0,
          discoloration: rejections.discolored || 0
        }
      },
      foreignMatter: {
        organic: {
          red: foreignMatter.red || 0,
          husk: foreignMatter.husk || 0,
          paddy: foreignMatter.paddy || 0,
          chaff: foreignMatter.chaff || 0,
          straw: foreignMatter.straw || 0,
          sticks: foreignMatter.sticks || 0,
          brownRice: foreignMatter.brownrice || 0
        },
        inorganic: {
          stones: foreignMatter.stones || 0,
          mud: foreignMatter.mud || 0,
          thread: foreignMatter.thread || 0,
          plastic: foreignMatter.plastic || 0,
          metals: foreignMatter.metals || 0,
          glass: foreignMatter.glass || 0,
          paper: foreignMatter.paper || 0,
          cardboard: foreignMatter.cardboard || 0
        }
      }
    };
    
    return { metrics: normalizedMetrics, counts: rawCounts };
  };

  // calculateTotals function moved up (above normalizeMetrics) to prevent hoisting issues

  // Calculate totals from metrics
  const totals = calculateTotals(metrics);
  const isStartLoading = operationType === 'starting';
  const isStopLoading = operationType === 'stopping';

  // Hide brownrice from foreign matter for procurement and production machines where brownrice is segmented
  const currentMachineName = (machines[currentMachineIndex] || analysisData?.machineName || '').toLowerCase();
  const hideBrownRice = analysisData?.analysisType === 'procurement'
    || ['tray separator', 'tsep', 'paddy sort', 'husker', 'shell', 'whitener', 'white', 'silky', 'polisher', 'bright', 'color sorter', 'colour sorter', 'sortex', 'intel vision', 'length grader', 'length sort', 'sifter', 'sift', 'shifter', 'blend', 'pack', 'thickness grader', 'thickthin', 'thick thin', 'final rice', 'final'].some(k => currentMachineName.includes(k));

  // Helper function to build metrics array (defined before useMemo)
  const buildMetricsArray = (displayMetrics: typeof initialMetrics, displayCounts: typeof zeroCounts) => {
    return [
      // Rice - region-dependent breakdown
      ...(millRegion === 'basmati' ? [
        { category: 'Rice', name: 'Head Rice', value: displayMetrics.goodRice.headRice, count: displayCounts.goodRice.headRice, color: 'bg-green-600', textColor: 'text-green-700' },
        { category: 'Rice', name: 'Second One', value: displayMetrics.goodRice.secondOne || 0, count: displayCounts.goodRice.secondOne || 0, color: 'bg-green-500', textColor: 'text-green-700' },
        { category: 'Rice', name: 'Tibar', value: displayMetrics.goodRice.tibar || 0, count: displayCounts.goodRice.tibar || 0, color: 'bg-green-400', textColor: 'text-green-700' },
        { category: 'Rice', name: 'Dubar', value: displayMetrics.goodRice.dubar || 0, count: displayCounts.goodRice.dubar || 0, color: 'bg-green-400', textColor: 'text-green-700' },
        { category: 'Rice', name: 'Mini Dubar', value: displayMetrics.goodRice.miniDubar || 0, count: displayCounts.goodRice.miniDubar || 0, color: 'bg-green-300', textColor: 'text-green-700' },
        { category: 'Rice', name: 'Mongra', value: displayMetrics.goodRice.mongra || 0, count: displayCounts.goodRice.mongra || 0, color: 'bg-green-300', textColor: 'text-green-700' },
        { category: 'Rice', name: 'Mini Mongra', value: displayMetrics.goodRice.miniMongra || 0, count: displayCounts.goodRice.miniMongra || 0, color: 'bg-green-200', textColor: 'text-green-700' },
        { category: 'Rice', name: 'Nakku', value: displayMetrics.goodRice.nakku || 0, count: displayCounts.goodRice.nakku || 0, color: 'bg-green-100', textColor: 'text-green-700' },
      ] : [
        { category: 'Rice', name: '1 - 3/4 Head Rice', value: displayMetrics.goodRice.headRice + displayMetrics.goodRice.threeFourthHead, count: displayCounts.goodRice.headRice + displayCounts.goodRice.threeFourthHead, color: 'bg-green-500', textColor: 'text-green-700' },
        { category: 'Rice', name: '3/4 - 1/2 Half Brokens', value: displayMetrics.goodRice.halfBrokens, count: displayCounts.goodRice.halfBrokens, color: 'bg-green-400', textColor: 'text-green-700' },
        { category: 'Rice', name: '1/2 - 1/4 Fine Brokens', value: displayMetrics.goodRice.quarterFineBrokens, count: displayCounts.goodRice.quarterFineBrokens, color: 'bg-green-300', textColor: 'text-green-700' },
        { category: 'Rice', name: '< 1/4 Tips', value: displayMetrics.goodRice.tips, count: displayCounts.goodRice.tips, color: 'bg-green-200', textColor: 'text-green-700' },
      ]),

      // Rejections (flattened - no harvest/process subdivisions)
      { category: 'Rejections', name: chalkyEnabled ? 'Chalky' : 'Chalky — not selected', value: chalkyEnabled ? displayMetrics.rejections.harvest.chalkyBellyCore : 0, count: chalkyEnabled ? displayCounts.rejections.harvest.chalkyBellyCore : 0, color: chalkyEnabled ? 'bg-red-500' : 'bg-gray-300', textColor: chalkyEnabled ? 'text-red-700' : 'text-gray-400' },
      { category: 'Rejections', name: 'Immature (Green)', value: displayMetrics.rejections.harvest.immatureGreen, count: displayCounts.rejections.harvest.immatureGreen, color: 'bg-red-500', textColor: 'text-red-700' },
      { category: 'Rejections', name: discoloredEnabled ? 'Discolored' : 'Discolored — not selected', value: discoloredEnabled ? displayMetrics.rejections.harvest.discolored : 0, count: discoloredEnabled ? displayCounts.rejections.harvest.discolored : 0, color: discoloredEnabled ? 'bg-red-500' : 'bg-gray-300', textColor: discoloredEnabled ? 'text-red-700' : 'text-gray-400' },
      { category: 'Rejections', name: 'Yellow', value: displayMetrics.rejections.harvest.yellow, count: displayCounts.rejections.harvest.yellow, color: 'bg-gray-300', textColor: 'text-gray-400' },
      { category: 'Rejections', name: 'Pecky grains', value: displayMetrics.rejections.harvest.peckyGrains, count: displayCounts.rejections.harvest.peckyGrains, color: 'bg-gray-300', textColor: 'text-gray-400' },
      // { category: 'Rejections', name: 'Black Tips', value: metrics.rejections.process.blackTips, count: actualCounts.rejections.process.blackTips, color: 'bg-red-400', textColor: 'text-red-700' },
      // { category: 'Rejections', name: 'Burnt', value: metrics.rejections.process.burnt, count: actualCounts.rejections.process.burnt, color: 'bg-red-300', textColor: 'text-red-700' },
      // { category: 'Rejections', name: 'Spot', value: metrics.rejections.process.spot, count: actualCounts.rejections.process.spot, color: 'bg-red-200', textColor: 'text-red-700' },
      // { category: 'Rejections', name: 'Discoloration', value: metrics.rejections.process.discoloration, count: actualCounts.rejections.process.discoloration, color: 'bg-pink-100', textColor: 'text-pink-700' },
      
      // Foreign Matter — Red, Husk, Paddy active; rest grayed out
      { category: 'Foreign Matter', name: 'Red', value: displayMetrics.foreignMatter.organic.red, count: displayCounts.foreignMatter.organic.red, color: 'bg-orange-500', textColor: 'text-orange-700' },
      { category: 'Foreign Matter', name: 'Husk', value: displayMetrics.foreignMatter.organic.husk, count: displayCounts.foreignMatter.organic.husk, color: 'bg-orange-400', textColor: 'text-orange-700' },
      { category: 'Foreign Matter', name: 'Paddy', value: displayMetrics.foreignMatter.organic.paddy, count: displayCounts.foreignMatter.organic.paddy, color: 'bg-orange-300', textColor: 'text-orange-700' },
      { category: 'Foreign Matter', name: 'Chaff', value: displayMetrics.foreignMatter.organic.chaff, count: displayCounts.foreignMatter.organic.chaff, color: 'bg-gray-300', textColor: 'text-gray-400' },
      { category: 'Foreign Matter', name: 'Straw', value: displayMetrics.foreignMatter.organic.straw, count: displayCounts.foreignMatter.organic.straw, color: 'bg-gray-300', textColor: 'text-gray-400' },
      ...(!hideBrownRice ? [{ category: 'Foreign Matter', name: 'Brown rice', value: displayMetrics.foreignMatter.organic.brownRice, count: displayCounts.foreignMatter.organic.brownRice, color: 'bg-gray-300', textColor: 'text-gray-400' }] : []),
      { category: 'Foreign Matter', name: 'Stones', value: displayMetrics.foreignMatter.inorganic.stones, count: displayCounts.foreignMatter.inorganic.stones, color: 'bg-gray-300', textColor: 'text-gray-400' },
      { category: 'Foreign Matter', name: 'Plastic', value: displayMetrics.foreignMatter.inorganic.plastic, count: displayCounts.foreignMatter.inorganic.plastic, color: 'bg-gray-300', textColor: 'text-gray-400' },
      { category: 'Foreign Matter', name: 'Metals', value: displayMetrics.foreignMatter.inorganic.metals, count: displayCounts.foreignMatter.inorganic.metals, color: 'bg-gray-300', textColor: 'text-gray-400' },
      { category: 'Foreign Matter', name: 'Glass', value: displayMetrics.foreignMatter.inorganic.glass, count: displayCounts.foreignMatter.inorganic.glass, color: 'bg-gray-300', textColor: 'text-gray-400' },
      { category: 'Foreign Matter', name: 'Paper', value: displayMetrics.foreignMatter.inorganic.paper, count: displayCounts.foreignMatter.inorganic.paper, color: 'bg-gray-300', textColor: 'text-gray-400' },
      { category: 'Foreign Matter', name: 'Cardboard', value: displayMetrics.foreignMatter.inorganic.cardboard, count: displayCounts.foreignMatter.inorganic.cardboard, color: 'bg-gray-300', textColor: 'text-gray-400' },
      
      // Quality & Indices (these don't have counts, they're calculated indices)
      { category: 'Quality & Indices', name: 'Whiteness Index', value: displayMetrics.qualityIndices.whitenessIndex, count: 0, color: 'bg-blue-500', textColor: 'text-blue-700', isIndex: true },
      { category: 'Quality & Indices', name: 'Slender Ratio', value: displayMetrics.qualityIndices.slenderRatio, count: 0, color: 'bg-blue-400', textColor: 'text-blue-700', isIndex: true },
      // { category: 'Quality & Indices', name: 'Glossy Index', value: displayMetrics.qualityIndices.glossyIndex, count: 0, color: 'bg-blue-400', textColor: 'text-blue-700', isIndex: true },
      // { category: 'Quality & Indices', name: 'DOM (Degree of Milling)', value: displayMetrics.qualityIndices.degreeOfMilling, count: 0, color: 'bg-blue-200', textColor: 'text-blue-700', isIndex: true },
      // { category: 'Quality & Indices', name: 'DON (Degree of Nutrition)', value: displayMetrics.qualityIndices.degreeOfNutrition, count: 0, color: 'bg-blue-100', textColor: 'text-blue-700', isIndex: true },
    ];
  };

  // Create flat array of all metrics with their properties
  // 🔧 FIXED: Use preserved metrics after stop until Complete Sample is clicked
  const getAllMetrics = useMemo(() => {
    // 🔧 FIXED: If analysis is stopped and we have preserved metrics, always use them
    const hasPreservedMetrics = preservedMetricsAfterStopRef.current !== null;
    if (!isAnalysisRunning && hasPreservedMetrics) {
      // After stop, always use preserved metrics until Complete Sample is clicked
      const displayMetrics = preservedMetricsAfterStopRef.current;
      const displayCounts = preservedCountsAfterStopRef.current || actualCounts;
      return buildMetricsArray(displayMetrics, displayCounts);
    }
    
    // During analysis: Use ref values if state is zero but refs have non-zero values (prevents flicker during toggle)
    const metricsTotal = calculateTotals(metrics).total;
    const refMetricsTotal = calculateTotals(currentMetricsRef.current).total;
    const countsTotal = calculateTotals(convertCountsToRawMetrics(actualCounts)).total;
    const refCountsTotal = calculateTotals(convertCountsToRawMetrics(currentCountsRef.current)).total;
    
    // Use refs if state is zero but refs have values (prevents flicker during toggle)
    const displayMetrics = (metricsTotal === 0 && refMetricsTotal > 0 && isAnalysisRunning) 
      ? currentMetricsRef.current 
      : metrics;
    const displayCounts = (countsTotal === 0 && refCountsTotal > 0 && isAnalysisRunning)
      ? currentCountsRef.current
      : actualCounts;
    
    return buildMetricsArray(displayMetrics, displayCounts);
  }, [metrics, actualCounts, isAnalysisRunning, millRegion]); // 🔧 FIXED: Recalculate when metrics/counts change or analysis state changes

  // MetricBar Component
  const MetricBar = ({ metric }: { metric: any }) => {
    // For quality indices, use value directly (they're averages, not percentages)
    const displayValue = metric.isIndex ? metric.value : (showPercentage ? metric.value : metric.count);
    const maxValue = metric.isIndex ? 100 : (showPercentage ? 50 : 500); // Max for visual scaling
    const progressValue = (displayValue / maxValue) * 100;

    // Format display text based on metric type
    let displayText: string;
    if (metric.isIndex) {
      // Quality indices: show as decimal number (no % symbol)
      displayText = displayValue > 0 ? displayValue.toFixed(2) : '0.00';
    } else if (showPercentage) {
      displayText = `${displayValue.toFixed(displayValue < 1 ? 2 : 1)}%`;
    } else {
      displayText = Math.round(displayValue).toString();
    }

    return (
      <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
        <div className="flex justify-between items-center mb-2 sm:mb-3 lg:mb-4">
          <span className={`text-xs sm:text-sm lg:text-base font-medium ${metric.textColor}`}>{metric.name}</span>
          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3">
            {/* NEW: Real-time update indicator */}
            {isAnalysisRunning && lastMetricsUpdate && (
              <div className="flex items-center space-x-1">
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 lg:w-2 lg:h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm lg:text-base text-green-600">Live</span>
              </div>
            )}
            <span className={`text-xs sm:text-sm lg:text-base font-bold ${metric.textColor}`}>
              {displayText}
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2.5 lg:h-3">
          <div 
            className={`rounded-full ${metric.color} transition-all duration-500 ease-in-out ${isAnalysisRunning ? 'animate-pulse' : ''}`}
            style={{ 
              width: `${Math.min(progressValue, 100)}%`,
              height: '100%'
            }}
          ></div>
        </div>
      </div>
    );
  };

  // WebRTC functions
  const startDummyCameraFeed = () => {
    // Clean previous dummy stream before starting a new one
    if (dummyVideoCleanupRef.current) {
      dummyVideoCleanupRef.current();
      dummyVideoCleanupRef.current = null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setWebrtcError('Unable to initialize dummy camera canvas');
      return;
    }

    const themes = [
      { bg: '#0f172a', grain: '#f8e5b0', accent: '#22d3ee', box: '#34d399' },
      { bg: '#111827', grain: '#f5deb3', accent: '#60a5fa', box: '#f59e0b' },
      { bg: '#1f2937', grain: '#f5e6c9', accent: '#a3e635', box: '#38bdf8' },
    ];
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const grains = Array.from({ length: 220 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: 0.6 + Math.random() * 1.6,
      vy: -0.25 + Math.random() * 0.5,
      r: 1.6 + Math.random() * 2.8,
      o: 0.55 + Math.random() * 0.4,
    }));

    let frame = 0;
    let rafId = 0;

    const draw = () => {
      frame += 1;
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Conveyor belt strip
      ctx.fillStyle = '#2b3440';
      ctx.fillRect(0, canvas.height * 0.58, canvas.width, canvas.height * 0.26);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      for (let x = 0; x < canvas.width; x += 52) {
        ctx.beginPath();
        ctx.moveTo(x + ((frame * 2) % 52), canvas.height * 0.58);
        ctx.lineTo(x + ((frame * 2) % 52), canvas.height * 0.84);
        ctx.stroke();
      }

      grains.forEach((g) => {
        g.x += g.vx;
        g.y += g.vy;
        if (g.x > canvas.width + 10) g.x = -10;
        if (g.y < canvas.height * 0.6) g.y = canvas.height * (0.6 + Math.random() * 0.22);
        if (g.y > canvas.height * 0.84) g.y = canvas.height * (0.6 + Math.random() * 0.22);

        ctx.globalAlpha = g.o;
        ctx.fillStyle = theme.grain;
        ctx.beginPath();
        ctx.ellipse(g.x, g.y, g.r * 1.35, g.r, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // "Detection boxes"
      ctx.strokeStyle = theme.box;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const boxX = 120 + i * 260 + (frame % 38);
        const boxY = 390 + ((i % 2) * 35);
        ctx.strokeRect(boxX, boxY, 140, 72);
      }

      // HUD label
      ctx.fillStyle = theme.accent;
      ctx.font = '600 22px monospace';
      ctx.fillText('RAICE LABZ | DEMO ANALYSIS', 34, 42);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '500 17px monospace';
      ctx.fillText(`Live Grain Scan  |  ${new Date().toLocaleTimeString()}`, 34, 72);

      rafId = requestAnimationFrame(draw);
    };

    draw();
    const stream = canvas.captureStream(24);

    const attachStream = (videoElement: HTMLVideoElement) => {
      videoElement.srcObject = stream;
      videoElement.muted = true;
      videoElement.playsInline = true;
      videoElement.autoplay = true;
      videoElement.play().catch(() => {});
      setWebrtcConnected(true);
      setWebrtcError(null);
    };

    if (webrtcVideoRef) {
      attachStream(webrtcVideoRef);
    } else {
      (window as any).pendingWebRTCStream = attachStream;
    }

    dummyVideoCleanupRef.current = () => {
      cancelAnimationFrame(rafId);
      stream.getTracks().forEach((t) => t.stop());
      if ((window as any).pendingWebRTCStream === attachStream) {
        (window as any).pendingWebRTCStream = null;
      }
    };
  };

  const initializeWebRTC = async () => {
    if ((window as any).__DUMMY_MODE__) {
      startDummyCameraFeed();
      return;
    }
    try {
      console.log('🔌 Initializing WebRTC connection...');
      setWebrtcError(null);
      
      const pc = new RTCPeerConnection({
        iceServers: [],
        iceCandidatePoolSize: 0,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });
      
      setWebrtcPeerConnection(pc);
      
      // Handle incoming tracks
      pc.ontrack = (event) => {
        console.log('📹 WebRTC track received:', event);
        // Store the stream for when video ref becomes available
        const stream = event.streams[0];
        if (stream) {
          console.log('📹 Stream available, connecting to video element...');
          // Function to connect stream to video element
          const connectStreamToVideo = (videoElement: HTMLVideoElement) => {
            videoElement.srcObject = stream;
            setWebrtcConnected(true);
            console.log('✅ WebRTC video connected successfully');
            
            // Add event listeners for debugging
            videoElement.addEventListener('loadedmetadata', () => {
              console.log(`📹 Video metadata loaded: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
              
              // 🔧 NEW: Dynamically adjust container aspect ratio to match video stream
              const videoContainer = document.getElementById('video-container');
              if (videoContainer && videoElement.videoWidth && videoElement.videoHeight) {
                const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
                videoContainer.style.aspectRatio = aspectRatio.toString();
                console.log(`📹 Set container aspect ratio to: ${aspectRatio} (${videoElement.videoWidth}x${videoElement.videoHeight})`);
                
                // Also update any placeholder states to match the same aspect ratio
                const placeholderStates = videoContainer.querySelectorAll('[data-placeholder]');
                placeholderStates.forEach(state => {
                  (state as HTMLElement).style.aspectRatio = aspectRatio.toString();
                });
              }
            });
            
            videoElement.addEventListener('canplay', () => {
              // Try to play the video
              videoElement.play().then(() => {
                console.log('📹 Video started playing successfully');
              }).catch((error) => {
                console.log(`📹 Failed to play video: ${error.message}`);
              });
            });
            
            videoElement.addEventListener('error', (e) => {
              console.log(`📹 Video element error: ${e}`);
              console.log(`📹 Video error details: Error=${videoElement.error}, NetworkState=${videoElement.networkState}, ReadyState=${videoElement.readyState}`);
            });
            
            // Try to play immediately (canplay listener above also triggers play)
            videoElement.play().then(() => {
              console.log('📹 Video auto-play successful');
            }).catch((error) => {
              console.log(`📹 Auto-play failed (normal): ${error.message}`);
            });
          };
          
          // If video ref is already available, connect immediately
          if (webrtcVideoRef) {
            connectStreamToVideo(webrtcVideoRef);
          } else {
            // Store the connection function to be called when video ref is set
            (window as any).pendingWebRTCStream = connectStreamToVideo;
          }
        }
      };
      
      // Handle connection state changes
      pc.oniceconnectionstatechange = () => {
        console.log(`🔌 ICE Connection State: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'connected') {
          setWebrtcConnected(true);
          console.log('✅ WebRTC ICE connection established');
        } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          setWebrtcConnected(false);
          console.log(`❌ WebRTC ICE connection ${pc.iceConnectionState}`);
        }
      };
      
      pc.onconnectionstatechange = () => {
        console.log(`🔌 Connection State: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
          setWebrtcConnected(true);
          console.log('✅ WebRTC connection established');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setWebrtcConnected(false);
          console.log(`❌ WebRTC connection ${pc.connectionState}`);
        }
      };
      
      // Create and send offer
      console.log('🔌 Creating WebRTC offer...');
      const offer = await pc.createOffer({ offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      
      console.log('🔌 Sending WebRTC offer to backend...');
      const response = await fetch(`${BACKEND_URL}/api/webrtc/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sdp: pc.localDescription.sdp,
          type: pc.localDescription.type,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const answer = await response.json();
      console.log('🔌 Received WebRTC answer from backend:', answer);
      
      // Check if there's an error in the response
      if (answer.error) {
        throw new Error(`Server error: ${answer.error}`);
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('✅ WebRTC offer/answer exchange completed');
      
      // Set up video element for low latency
      if (webrtcVideoRef) {
        webrtcVideoRef.muted = true;
        webrtcVideoRef.playsInline = true;
        webrtcVideoRef.autoplay = true;
        webrtcVideoRef.controls = false;
        
        // Optimize for live streaming
        webrtcVideoRef.addEventListener('loadedmetadata', () => {
          console.log(`📹 Video metadata loaded: ${webrtcVideoRef.videoWidth}x${webrtcVideoRef.videoHeight}`);
          
          // 🔧 NEW: Dynamically adjust container aspect ratio to match video stream
          const videoContainer = document.getElementById('video-container');
          if (videoContainer && webrtcVideoRef.videoWidth && webrtcVideoRef.videoHeight) {
            const aspectRatio = webrtcVideoRef.videoWidth / webrtcVideoRef.videoHeight;
            videoContainer.style.aspectRatio = aspectRatio.toString();
            console.log(`📹 Set container aspect ratio to: ${aspectRatio} (${webrtcVideoRef.videoWidth}x${webrtcVideoRef.videoHeight})`);
            
            // Also update any placeholder states to match the same aspect ratio
            const placeholderStates = videoContainer.querySelectorAll('[data-placeholder]');
            placeholderStates.forEach(state => {
              (state as HTMLElement).style.aspectRatio = aspectRatio.toString();
            });
          }
        });
        
        // Ensure video plays smoothly
        webrtcVideoRef.addEventListener('canplay', () => {
          console.log('📹 Video can play - attempting to start playback');
          webrtcVideoRef.play().catch(error => {
            console.log(`📹 Auto-play failed (normal): ${error.message}`);
          });
        });
      }
    } catch (error) {
      console.error('❌ WebRTC initialization failed:', error);
      setWebrtcError(error instanceof Error ? error.message : 'WebRTC connection failed');
      setWebrtcConnected(false);
      
      // 🔧 FIXED: No auto-retry to match LiveAnalysis_connection.tsx approach
    }
  };

  const cleanupWebRTC = () => {
    console.log('🧹 Cleaning up WebRTC connection...');
    if (dummyVideoCleanupRef.current) {
      dummyVideoCleanupRef.current();
      dummyVideoCleanupRef.current = null;
    }
    if (webrtcPeerConnection) {
      webrtcPeerConnection.close();
      setWebrtcPeerConnection(null);
      setWebrtcConnected(false);
      // Clear any pending stream
      (window as any).pendingWebRTCStream = null;
      console.log('✅ WebRTC connection cleaned up');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      const videoContainer = document.getElementById('video-container');
      if (videoContainer) {
        videoContainer.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch((err) => {
          console.error('Error attempting to enable fullscreen:', err);
        });
      }
    } else {
      // Exit fullscreen
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  // Video zoom controls
  const zoomIn = () => {
    setVideoZoom(prev => Math.min(prev + 0.25, 3)); // Max 3x zoom
  };

  const zoomOut = () => {
    setVideoZoom(prev => Math.max(prev - 0.25, 1)); // Min 1x (normal)
  };

  const resetZoom = () => {
    setVideoZoom(1);
  };

  // WebSocket functions - removed duplicate connectWebSocket function

  const disconnectWebSocket = () => {
    if (socket) {
      console.log('🔌 Disconnecting WebSocket...');
      socket.disconnect();
      setSocket(null);
      setWsConnected(false);
    }
  };



  // API function to check configuration status
  const checkConfigStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/config/current`);
      if (response.ok) {
        const status = await response.json();
        setConfigStatus(status);
        console.log('⚙️ Config status:', status);
      }
    } catch (error) {
      console.error('❌ Failed to get config status:', error);
    }
  };

  // API function to get current batch from database
  const fetchCurrentBatch = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/db/current-batch`);
      if (!response.ok) {
        console.error('❌ Failed to fetch current batch:', response.status);
        return;
      }
      const data = await response.json();
      if (data.status === 'success') {
        setCurrentBatch(data.batch);
        console.log('📦 Current batch:', data.batch);
      } else {
        console.log('📦 No active batch or error:', data.message);
      }
    } catch (error) {
      console.error('❌ Error fetching current batch:', error);
    }
  };

  // Lightweight camera hardware check (runs on mount, before analysis starts)
  const checkCameraHardware = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/camera/check`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setCameraActive(data.available === true);
      }
    } catch {
      // Backend unreachable — leave as null (standby)
    }
  };

  // API function to check if analysis is currently running on backend
  const checkAnalysisStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Analysis status from backend:', data);

        // Extract camera status if available
        if (data.camera_status) {
          setCameraActive(data.camera_status.active);
        }

        // Sync the global state with backend status
        const backendIsRunning = data.is_processing || data.status === 'running';
        if (backendIsRunning !== isAnalysisRunning) {
          console.log(`🔄 Syncing analysis state: ${isAnalysisRunning} → ${backendIsRunning}`);
          setIsAnalysisRunning(backendIsRunning);
          
          // If backend is running, request current stats to restore metrics
          // Use a timeout to ensure socket is ready
          if (backendIsRunning) {
            console.log('🔄 Backend is running - will request statistics once socket is ready');
            setTimeout(() => {
              if (socket) {
                console.log('🔄 Requesting current statistics to restore metrics');
                socket.emit('request_stats');
              }
            }, 1000); // Wait 1 second for socket to be ready
          }
        }
        
        return data;
      }
    } catch (error) {
      console.error('❌ Failed to check analysis status:', error);
    }
  };

  // API function to start analysis (for Individual, Batch, Machine-wise modes)
  const startAnalysis = async () => {
    console.log('🚀 Starting analysis - calling backend API...');
    
    try {
      setError(null);
      
      // First, check if there's a pending analysis config in storage
      // This should be checked FIRST before looking for existing modeId
      const pendingConfigStr = sessionStorage.getItem('pending_analysis_config');
      
      if (pendingConfigStr) {
        console.log('📝 Found pending analysis config in sessionStorage');
        const pendingConfig = JSON.parse(pendingConfigStr);
        console.log('📝 Pending config:', {
          analysisType: pendingConfig.analysisType,
          endpoint: pendingConfig.endpoint,
          requestBody: pendingConfig.requestBody
        });
        
        // Create documents using the stored configuration
        console.log('📝 Creating documents at:', pendingConfig.endpoint);
        const createResponse = await fetch(pendingConfig.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingConfig.requestBody)
        });
        
        console.log('📝 Create response status:', createResponse.status);
        
        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          let errorMessage = 'Failed to create analysis documents';
          try { const errorData = JSON.parse(errorText); console.error('❌ Failed to create documents:', errorData); errorMessage = errorData.message || errorMessage; } catch { console.error('❌ Failed to create documents (non-JSON response):', errorText.substring(0, 200)); }
          throw new Error(errorMessage);
        }
        
        const createResult = await createResponse.json();
        console.log('✅ Documents created successfully:', createResult);

        const modeId = createResult.modeId;

        // Store modeId for future reference
        sessionStorage.setItem('mode_id', modeId);
        if (pendingConfig.analysisType === 'tma') {
          sessionStorage.setItem('tma_mode_id', modeId);
        }
        // Persist modeId on analysisData for ALL types so subsequent trials can find it
        if (analysisData) {
          analysisData.modeId = modeId;
        }

        // Store series mode info if applicable
        if (createResult.isSeriesMode && createResult.machineAnalyses) {
          sessionStorage.setItem('production_series_mode_id', modeId);
          sessionStorage.setItem(
            'production_machine_analyses',
            JSON.stringify(createResult.machineAnalyses)
          );
          console.log('✅ Series mode: stored machineAnalyses for', createResult.machineAnalyses.length, 'machines');
        }

        // Clear the pending config after successful creation
        sessionStorage.removeItem('pending_analysis_config');

        console.log('✅ Documents created with modeId:', modeId);

        // Continue with starting analysis using the newly created modeId
        await startAnalysisWithModeId(modeId);
      } else {
        // No pending config - check for existing modeId
        // Priority: sessionStorage (set during mode creation) > analysisData > currentBatch (may be stale from a previous session)
        const modeId = sessionStorage.getItem('mode_id') ||
                       sessionStorage.getItem('tma_mode_id') ||
                       analysisData?.modeId ||
                       grainFormData?.customId ||
                       currentBatch?.modeId ||
                       null;
        
        if (!modeId || modeId === 'default') {
          throw new Error('No analysis configuration found. Please return to Tell Us About Grain page.');
        }
        
        console.log('✅ Using existing modeId:', modeId);
        await startAnalysisWithModeId(modeId);
      }
      
    } catch (error) {
      console.error('❌ Error starting analysis:', error);
      setError(error instanceof Error ? error.message : 'Failed to start analysis');
      setIsAnalysisRunning(false);
    }
  };
  
  // Helper function to start analysis with an existing modeId
  const startAnalysisWithModeId = async (modeId: string) => {
    console.log('✅ Starting analysis with modeId:', modeId);
    console.log('✅ Current sample:', currentSample);

    // Start WebRTC immediately — don't wait for backend API calls.
    // DirectVideoTrack sends black frames until the first annotated frame
    // arrives, so the connection is established while the pipeline warms up.
    initializeWebRTC();

    // 🔧 FIXED: Clear preserved metrics when starting new analysis
    preservedMetricsAfterStopRef.current = null;
    preservedCountsAfterStopRef.current = null;
    
    // 🔧 NEW: Reset metrics and counts to 0 when starting a new sample analysis
    // This ensures fresh start for each sample
    console.log('🔄 Resetting metrics and counts to zero for new sample analysis');
    setMetrics(initialMetrics);
    setActualCounts(zeroCounts);
    lastKnownSegmentationRef.current = {
      headrice: 0,
      threefourthhead: 0,
      halfbrokens: 0,
      quarterfinebrokens: 0,
      tips: 0,
      secondone: 0,
      tibar: 0,
      dubar: 0,
      minidubar: 0,
      mongra: 0,
      minimongra: 0,
      nakku: 0
    };
    lastNonZeroMetrics.current = null; // Reset last non-zero metrics
    currentMetricsRef.current = initialMetrics; // Reset current metrics ref
    currentCountsRef.current = zeroCounts; // Reset current counts ref
    
    // Step 0: Ensure input configuration is set (required by /api/start)
    // For procurement analysis, the GrainContext sendDataToBackend is not called,
    // so we need to POST a minimal input config here.
    console.log('🔧 Step 0: Ensuring input configuration is set...');
    try {
      const configCheckRes = await fetch(`${BACKEND_URL}/api/config/current`);
      const configCheck = await configCheckRes.json();
      if (configCheck?.status === 'not_configured') {
        console.log('⚙️ Input config not set - sending minimal config for procurement...');
        const inputConfig = {
          metadata: {
            timestamp: new Date().toISOString(),
            user_id: 'procurement_user',
            session_id: `procurement_${Date.now()}`,
          },
          grain_information: {
            grain_type: 'rice',
            variety: analysisData?.variety || 'unknown',
            process: analysisData?.process || 'unknown',
          },
          testing_details: {
            testing_option: 'individual',
            sampling_technique: 'random',
            batch: '1',
            machine: '',
          },
        };
        const configRes = await fetch(`${BACKEND_URL}/api/input/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inputConfig),
        });
        if (!configRes.ok) {
          const errData = await configRes.json();
          console.error('⚠️ Failed to set input config:', errData);
          throw new Error(errData.message || 'Failed to set input configuration');
        }
        console.log('✅ Input configuration set for procurement analysis');
      }
    } catch (configErr) {
      console.error('⚠️ Error checking/setting input config:', configErr);
      throw configErr;
    }

    // Step 1: Activate the trial-specific grain_analysis document FIRST
    // IMPORTANT: This must happen BEFORE /api/start so that _find_session_document()
    // picks up the correct trial (avoids race condition where stale trial N-1 is still active)
    console.log('🔧 Step 1: Activating trial-specific analysis document...');
    const trialResponse = await fetch(`${BACKEND_URL}/api/raice_labz/analysis/mode/${modeId}/start-trial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trialNumber: currentSample,
        chalkyThreshold: parseFloat(sessionStorage.getItem('chalky_threshold') || '20') || 20,
        analysisParameters: JSON.parse(sessionStorage.getItem('analysis_params') || '{"enableChalky":true,"enableDiscolored":true,"chalkyThreshold":20}'),
        ...(analysisData?.machineIndex !== undefined && analysisData?.machineIndex !== null
          ? { machineIndex: analysisData.machineIndex }
          : {}),
      })
    });

    console.log('📡 Trial response received - Status:', trialResponse.status);

    if (!trialResponse.ok) {
      const errorText = await trialResponse.text();
      let errorMessage = `HTTP error! status: ${trialResponse.status}`;
      try { errorMessage = JSON.parse(errorText).message || errorMessage; } catch {}
      throw new Error(errorMessage);
    }

    const trialData = await trialResponse.json();
    console.log('✅ Trial analysis document activated:', trialData);

    // Step 2: Start the core analysis infrastructure (Docker, streaming, camera, etc.)
    // Now _find_session_document() will correctly find the trial activated in Step 1
    console.log('🔧 Step 2: Starting core analysis infrastructure...');
    const startResponse = await fetch(`${BACKEND_URL}/api/start`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Start response received - Status:', startResponse.status);

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      let errorMessage = `HTTP error! status: ${startResponse.status}`;
      try { errorMessage = JSON.parse(errorText).message || errorMessage; } catch {}
      throw new Error(errorMessage);
    }

    const startData = await startResponse.json();
    console.log('✅ Core analysis infrastructure started:', startData);
    
    setIsAnalysisRunning(true);
    setHasStartedAnalysis(true);
    setChartData([]);
    chartStartTimeRef.current = 0;
    setGaugeValues({ headRice: 0, broken: 0, chalky: 0, rejections: 0 });
    setGaugeCounts({ headRice: 0, broken: 0, chalky: 0, rejections: 0 });
    console.log("✅ Analysis started successfully");
  };


  // Helper utilities for trial/sample completion messaging
  const getTotalTrialCount = () => {
    return analysisData?.totalSamples ||
           analysisData?.sampleCount ||
           analysisData?.trials ||
           3;
  };

  const getTrialDisplayLabel = () => {
    if (analysisData?.analysisType === "individual" ||
        analysisData?.analysisType === "batch" ||
        analysisData?.analysisType === "machine-wise") {
      return "Trial";
    }
    return "Sample";
  };

  const showTrialCompletionToast = (completedNumber: number, totalOverride?: number) => {
    if (!completedNumber) {
      return;
    }

    const totalTrials = totalOverride || getTotalTrialCount();
    const label = getTrialDisplayLabel();
    const pluralLabel = `${label}${label.endsWith('s') ? '' : 's'}`;
    const allTrialsCompleted = completedNumber >= totalTrials;

    toast({
      title: allTrialsCompleted ? "Analysis Completed" : `${label} ${completedNumber} Completed`,
      description: allTrialsCompleted
        ? `All ${totalTrials} ${pluralLabel.toLowerCase()} completed for this mode`
        : `Ready for ${label.toLowerCase()} ${Math.min(completedNumber + 1, totalTrials)}`,
    });
  };

  // API function to stop analysis (for Individual, Batch, Machine-wise modes)
  const stopAnalysis = async () => {
    console.log('🛑 Stopping analysis - calling backend API...');
    const stoppedSampleNumber = currentSample;
    
    try {
      // Set shutdown status immediately
      setShutdownStatus({
        status: 'processing_remaining_messages',
        message: 'Processing remaining messages and updating database...',
        timestamp: new Date().toISOString()
      });
      
      // 🔧 FIXED: Preserve metrics BEFORE setting isAnalysisRunning to false
      // Keep them displayed until Complete Sample is clicked
      const currentMetricsSnapshot = { ...metrics };
      const currentCountsSnapshot = { ...actualCounts };
      preservedMetricsAfterStopRef.current = currentMetricsSnapshot;
      preservedCountsAfterStopRef.current = currentCountsSnapshot;
      
      // Update refs to ensure they have the latest values
      currentMetricsRef.current = currentMetricsSnapshot;
      currentCountsRef.current = currentCountsSnapshot;
      
      // 🔧 FIXED: Update state with preserved metrics to ensure UI shows them immediately
      setMetrics(currentMetricsSnapshot);
      setActualCounts(currentCountsSnapshot);
      
      // 🔧 FIXED: Don't set isAnalysisRunning to false yet - keep timer running until stop process completes
      setError(null);
      
      // 🔧 FIXED: Metrics and counts preserved - will remain visible until Complete Sample is clicked
      console.log("✅ UI updated - timer continues until stop process completes");
      console.log("✅ Metrics and counts preserved - will remain visible until Complete Sample is clicked");
      
      // Get mode ID from various sources (sessionStorage first — set during mode creation, always correct)
      const modeId = sessionStorage.getItem('mode_id') ||
                    sessionStorage.getItem('tma_mode_id') ||
                    analysisData?.modeId ||
                    grainFormData?.customId ||
                    currentBatch?.modeId ||
                    'default';
      
      // Prepare current metrics for the trial
      const currentMetrics = {
        goodRice: {
          headRice: actualCounts.goodRice.headRice,
          threeFourthHead: actualCounts.goodRice.threeFourthHead,
          halfBrokens: actualCounts.goodRice.halfBrokens,
          quarterFineBrokens: actualCounts.goodRice.quarterFineBrokens,
          tips: actualCounts.goodRice.tips,
          secondOne: actualCounts.goodRice.secondOne || 0,
          tibar: actualCounts.goodRice.tibar || 0,
          dubar: actualCounts.goodRice.dubar || 0,
          miniDubar: actualCounts.goodRice.miniDubar || 0,
          mongra: actualCounts.goodRice.mongra || 0,
          miniMongra: actualCounts.goodRice.miniMongra || 0,
          nakku: actualCounts.goodRice.nakku || 0,
          total: actualCounts.goodRice.headRice + actualCounts.goodRice.threeFourthHead +
                 actualCounts.goodRice.halfBrokens + actualCounts.goodRice.quarterFineBrokens +
                 actualCounts.goodRice.tips +
                 (actualCounts.goodRice.secondOne || 0) + (actualCounts.goodRice.tibar || 0) +
                 (actualCounts.goodRice.dubar || 0) + (actualCounts.goodRice.miniDubar || 0) +
                 (actualCounts.goodRice.mongra || 0) + (actualCounts.goodRice.miniMongra || 0) +
                 (actualCounts.goodRice.nakku || 0)
        },
        rejections: {
          harvest: {
            chalkyBellyCore: actualCounts.rejections.harvest.chalkyBellyCore,
            yellow: actualCounts.rejections.harvest.yellow,
            black: actualCounts.rejections.harvest.black,
            immatureGreen: actualCounts.rejections.harvest.immatureGreen,
            peckyGrains: actualCounts.rejections.harvest.peckyGrains,
            discolored: actualCounts.rejections.harvest.discolored
          },
          process: {
            chalkyWhole: actualCounts.rejections.process.chalkyWhole,
            blackTips: actualCounts.rejections.process.blackTips,
            burnt: actualCounts.rejections.process.burnt,
            spot: actualCounts.rejections.process.spot,
            discoloration: actualCounts.rejections.process.discoloration
          }
        },
        foreignMatter: {
          organic: {
            red: actualCounts.foreignMatter.organic.red,
            husk: actualCounts.foreignMatter.organic.husk,
            paddy: actualCounts.foreignMatter.organic.paddy,
            chaff: actualCounts.foreignMatter.organic.chaff,
            straw: actualCounts.foreignMatter.organic.straw,
            sticks: actualCounts.foreignMatter.organic.sticks,
            brownRice: actualCounts.foreignMatter.organic.brownRice
          },
          inorganic: {
            stones: actualCounts.foreignMatter.inorganic.stones,
            mud: actualCounts.foreignMatter.inorganic.mud,
            thread: actualCounts.foreignMatter.inorganic.thread,
            plastic: actualCounts.foreignMatter.inorganic.plastic,
            metals: actualCounts.foreignMatter.inorganic.metals,
            glass: actualCounts.foreignMatter.inorganic.glass,
            paper: actualCounts.foreignMatter.inorganic.paper,
            cardboard: actualCounts.foreignMatter.inorganic.cardboard
          }
        }
      };
      
      // Step 1: Stop the trial-specific grain_analysis document update
      console.log('🔧 Step 1: Stopping trial-specific analysis...');
      const trialResponse = await fetch(`${BACKEND_URL}/api/raice_labz/analysis/mode/${modeId}/stop-trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trialNumber: currentSample,
          grainMetrics: currentMetrics,
          weight: analysisData?.sampleWeight || '50',
          sampleSizeMode: analysisData?.sampleSizeMode || 'weight',
          ...(analysisData?.machineIndex !== undefined && analysisData?.machineIndex !== null
            ? { machineIndex: analysisData.machineIndex }
            : {}),
        })
      });

      console.log('📡 Trial stop response received - Status:', trialResponse.status);
      
      if (!trialResponse.ok) {
        const errorData = await trialResponse.json();
        throw new Error(errorData.message || `HTTP error! status: ${trialResponse.status}`);
      }

      const trialData = await trialResponse.json();
      // Backend wraps result inside 'data' key
      const trialResult = trialData.data || trialData;
      console.log('✅ Trial analysis response received:', trialResult);

      // Check if backend is processing with delay (sessionStatus lives inside data)
      if (trialResult.sessionStatus === 'stopping') {
        console.log('🕐 Backend is processing with delay - showing processing message');

        // Show processing message
        toast({
          title: "Analysis Processing",
          description: "Processing grain analysis data...",
          duration: 20000, // Show for 20 seconds
        });

        // Set a timeout to check the current trial status after the backend flush window
        setTimeout(async () => {
          try {
            const currentTrialResponse = await fetch(`${BACKEND_URL}/api/raice_labz/analysis/mode/${modeId}/current-trial`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            });

            if (currentTrialResponse.ok) {
              const currentTrialData = await currentTrialResponse.json();
              const currentTrialResult = currentTrialData.data || currentTrialData;
              console.log('📊 Current trial status after delay:', currentTrialResult);

              // If there's a next trial with higher number, backend has advanced
              if (currentTrialResult.trialNumber && currentTrialResult.trialNumber > stoppedSampleNumber) {
                console.log(`🔄 Backend advanced to trial ${currentTrialResult.trialNumber}`);
                toast({
                  title: "Trial Transition Complete",
                  description: `Ready for Trial ${currentTrialResult.trialNumber}`,
                });
              } else {
                console.log(`✅ All trials completed for mode: ${modeId}`);
                showTrialCompletionToast(stoppedSampleNumber);
              }
            }
          } catch (error) {
            console.error('Error checking current trial after delay:', error);
          }
        }, 22000); // 22-second delay (slightly after backend's 20s flush + 1s activation)

      } else {
        // Handle immediate response
        if (trialResult.nextTrialActivated) {
          console.log(`🔄 Automatic trial transition: ${trialResult.nextTrialActivated}`);
          setCurrentSample(trialResult.nextTrialActivated);
          toast({
            title: "Trial Transition Complete",
            description: `Automatically switched to Trial ${trialResult.nextTrialActivated}`,
          });
        } else {
          // Show completion toast (appropriate for the completed trial, not "all done")
          showTrialCompletionToast(stoppedSampleNumber);
        }
      }
      
      // Step 2: Stop the core analysis infrastructure (Docker, streaming, camera, etc.)
      console.log('🔧 Step 2: Stopping core analysis infrastructure...');
      const stopResponse = await fetch(`${BACKEND_URL}/api/stop`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Stop response received - Status:', stopResponse.status);
      
      if (!stopResponse.ok) {
        const errorData = await stopResponse.json();
        throw new Error(errorData.message || `HTTP error! status: ${stopResponse.status}`);
      }

      const stopData = await stopResponse.json();
      console.log('✅ Core analysis infrastructure stopped:', stopData);
      
      // 🔧 FIXED: Metrics and counts are preserved in preservedMetricsAfterStopRef
      // They will remain visible until Complete Sample is clicked
      console.log('✅ Analysis stopped - metrics and counts preserved for display until Complete Sample');
      
      // 🔧 FIXED: Set isAnalysisRunning to false AFTER all stop operations complete
      // This stops the timer when the stop process is fully finished
      setTimerShouldRun(false); // Stop the timer
      setIsPaused(false); // Reset pause state on stop
      setCameraFps(0); // Reset camera FPS
      setDetectionsPerFrame(0); // Reset detections per frame
      setIsAnalysisRunning(false); // This triggers WebRTC cleanup and stops the timer
      setHasStartedAnalysis(false);

      // Show Restart/Complete buttons instead of auto-completing
      setIsSampleStopped(true);

    } catch (error) {
      console.error('❌ Error stopping analysis:', error);
      setError(error instanceof Error ? error.message : 'Failed to stop analysis');
      setShutdownStatus(null); // Clear shutdown status on error
      // Also set isAnalysisRunning to false on error so timer stops
      setTimerShouldRun(false); // Stop the timer
      setIsPaused(false); // Reset pause state on stop
      setCameraFps(0); // Reset camera FPS
      setDetectionsPerFrame(0); // Reset detections per frame
      setIsAnalysisRunning(false);
      setHasStartedAnalysis(false);
    }
  };

  // TMA Analysis functions
  // API function to start TMA analysis for a specific machine
  const startTmaMachineAnalysis = async (machine: string, trialNumber: number) => {
    // Start WebRTC early — runs in parallel with backend API calls.
    initializeWebRTC();

    try {
      // Check for pending config first - if it exists, we need to create a new mode
      const pendingConfigStr = sessionStorage.getItem('pending_analysis_config');
      let tmaModeId: string | null = null;

      if (!pendingConfigStr) {
          // No pending config = mode already created, use existing modeId
          tmaModeId = analysisData?.modeId ||
                      grainFormData?.customId ||
                      sessionStorage.getItem('tma_mode_id') ||
                      null;
      }

      // If no modeId exists, check for pending TMA config
      if (!tmaModeId || tmaModeId === 'default') {
        
        if (pendingConfigStr) {
          const pendingConfig = JSON.parse(pendingConfigStr);
          
          if (pendingConfig.analysisType === 'tma') {
            console.log('📝 Creating TMA documents from pending config...');
            
            const createResponse = await fetch(pendingConfig.endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(pendingConfig.requestBody)
            });
            
            if (!createResponse.ok) {
              const errorText = await createResponse.text();
              let errorMessage = 'Failed to create TMA documents';
              try { errorMessage = JSON.parse(errorText).message || errorMessage; } catch {}
              throw new Error(errorMessage);
            }
            
            const createResult = await createResponse.json();
            tmaModeId = createResult.modeId;
            
            sessionStorage.setItem('tma_mode_id', tmaModeId);
            // For production series, also store under production_series_mode_id
            if (pendingConfig.isProductionSeries) {
              sessionStorage.setItem('production_series_mode_id', tmaModeId);
            }
            sessionStorage.removeItem('pending_analysis_config');

            // Update analysisData
            if (analysisData) {
              analysisData.modeId = tmaModeId;
            }

            console.log('✅ TMA documents created with modeId:', tmaModeId);
          } else {
            throw new Error('Pending config is not for TMA analysis');
          }
        } else {
          throw new Error('No TMA analysis configuration found. Please return to Tell Us About Grain page.');
        }
      }
      
      const sessionId = `${tmaModeId}-${machine}`;
      console.log(`🔍 Starting Tma analysis for machine: "${machine}"`);
      console.log(`🔍 Tma ModeID: "${tmaModeId}"`);
      console.log(`🔍 Generated SessionID: "${sessionId}"`);
      
      // 🔧 FIXED: Only start TMA processing pipeline once, then reuse for subsequent trials
      let processingResult = { status: 'reused' }; // Default value for reused pipeline

      if (!tmaProcessingStarted) {
        // Ensure input configuration is set before starting TMA pipeline
        console.log('🔧 Step 0: Ensuring input configuration is set for TMA...');
        try {
          const configCheckRes = await fetch(`${BACKEND_URL}/api/config/current`);
          const configCheck = await configCheckRes.json();
          if (configCheck?.status === 'not_configured') {
            console.log('⚙️ Input config not set - sending config for TMA/production series...');
            const inputConfig = {
              metadata: {
                timestamp: new Date().toISOString(),
                user_id: 'production_user',
                session_id: `tma_${Date.now()}`,
              },
              grain_information: {
                grain_type: 'rice',
                variety: analysisData?.variety || sessionStorage.getItem('production_variety') || 'unknown',
                process: analysisData?.process || sessionStorage.getItem('production_process') || 'unknown',
              },
              testing_details: {
                testing_option: 'tma',
                sampling_technique: 'random',
                batch: '1',
                machine: machine || '',
              },
            };
            const configRes = await fetch(`${BACKEND_URL}/api/input/config`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(inputConfig),
            });
            if (!configRes.ok) {
              const errData = await configRes.json();
              console.error('⚠️ Failed to set input config for TMA:', errData);
              throw new Error(errData.message || 'Failed to set input configuration');
            }
            console.log('✅ Input configuration set for TMA analysis');
          }
        } catch (configErr) {
          console.error('⚠️ Error checking/setting input config for TMA:', configErr);
          throw configErr;
        }

        console.log(`🚀 Step 1: Starting TMA processing pipeline (camera, streaming, DeepStream Docker)...`);
        const processingResponse = await fetch(`${BACKEND_URL}/api/tma/start`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!processingResponse.ok) {
          const errorText = await processingResponse.text();
          let errorMessage = `Failed to start TMA processing pipeline: ${processingResponse.status}`;
          try { errorMessage = JSON.parse(errorText).message || errorMessage; } catch {}
          throw new Error(errorMessage);
        }

        processingResult = await processingResponse.json();
        console.log(`✅ TMA processing pipeline started:`, processingResult);

        setTmaProcessingStarted(true); // Mark that processing pipeline is started
        setHasStartedAnalysis(true);
      } else {
        console.log(`ℹ️ TMA processing pipeline already started - reusing for trial ${trialNumber}`);
      }
      
      // 🔧 FIXED: Then call the TMA trial-specific endpoint to start the specific trial
      console.log(`🚀 Step 2: Starting TMA trial analysis...`);
      if (!machine) {
        throw new Error('No machine selected for TMA analysis. Please select a machine before starting.');
      }
      const response = await fetch(`${BACKEND_URL}/api/raice_labz/tma/mode/${tmaModeId}/start-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineName: machine,
          trialNumber: trialNumber,
          sampleWeight: analysisData?.sampleWeight || '50',
          sampleSizeMode: analysisData?.sampleSizeMode || 'weight',
          chalkyThreshold: parseFloat(sessionStorage.getItem('chalky_threshold') || '20') || 20,
          analysisParameters: JSON.parse(sessionStorage.getItem('analysis_params') || '{"enableChalky":true,"enableDiscolored":true,"chalkyThreshold":20}')
        })
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        // 🔧 FIXED: Set analysis running after both processing pipeline and machine session are started
        console.log(`✅ TMA machine analysis session started successfully`);
        setIsAnalysisRunning(true);
        setError(null);
        console.log(`✅ Started TMA analysis for ${machine}, trial ${trialNumber}`);
        console.log(`✅ Processing pipeline status: ${processingResult.status}`);
        console.log(`✅ Machine session status: ${result.status}`);
        return result;
      } else {
        throw new Error(result.message || 'Failed to start Tma machine analysis session');
      }
    } catch (error) {
      console.error(`❌ Failed to start TMA analysis for ${machine}:`, error);
      setError(error instanceof Error ? error.message : 'Failed to start TMA analysis');
      throw error;
    }
  };

  // API function to stop TMA analysis for a specific machine
  const stopTmaMachineAnalysis = async (machine: string, trialNumber: number, handleAutomaticTransitions: boolean = true) => {
    try {
      const tmaModeId = analysisData?.modeId || 
                        grainFormData?.customId || 
                        sessionStorage.getItem('tma_mode_id') ||
                        'default';
      const sessionId = `${tmaModeId}-${machine}`;
      
      // 🔧 FIXED: Preserve metrics BEFORE setting isAnalysisRunning to false (same as regular stop)
      const currentMetricsSnapshot = { ...metrics };
      const currentCountsSnapshot = { ...actualCounts };
      preservedMetricsAfterStopRef.current = currentMetricsSnapshot;
      preservedCountsAfterStopRef.current = currentCountsSnapshot;
      
      // Update refs to ensure they have the latest values
      currentMetricsRef.current = currentMetricsSnapshot;
      currentCountsRef.current = currentCountsSnapshot;
      
      // 🔧 FIXED: Update state with preserved metrics to ensure UI shows them immediately
      setMetrics(currentMetricsSnapshot);
      setActualCounts(currentCountsSnapshot);
      
      const currentMetrics = {
        goodRice: {
          headRice: actualCounts.goodRice.headRice,
          threeFourthHead: actualCounts.goodRice.threeFourthHead,
          halfBrokens: actualCounts.goodRice.halfBrokens,
          quarterFineBrokens: actualCounts.goodRice.quarterFineBrokens,
          tips: actualCounts.goodRice.tips,
          secondOne: actualCounts.goodRice.secondOne || 0,
          tibar: actualCounts.goodRice.tibar || 0,
          dubar: actualCounts.goodRice.dubar || 0,
          miniDubar: actualCounts.goodRice.miniDubar || 0,
          mongra: actualCounts.goodRice.mongra || 0,
          miniMongra: actualCounts.goodRice.miniMongra || 0,
          nakku: actualCounts.goodRice.nakku || 0,
          total: actualCounts.goodRice.headRice + actualCounts.goodRice.threeFourthHead +
                 actualCounts.goodRice.halfBrokens + actualCounts.goodRice.quarterFineBrokens +
                 actualCounts.goodRice.tips +
                 (actualCounts.goodRice.secondOne || 0) + (actualCounts.goodRice.tibar || 0) +
                 (actualCounts.goodRice.dubar || 0) + (actualCounts.goodRice.miniDubar || 0) +
                 (actualCounts.goodRice.mongra || 0) + (actualCounts.goodRice.miniMongra || 0) +
                 (actualCounts.goodRice.nakku || 0)
        },
        rejections: {
          harvest: {
            chalkyBellyCore: actualCounts.rejections.harvest.chalkyBellyCore,
            yellow: actualCounts.rejections.harvest.yellow,
            black: actualCounts.rejections.harvest.black,
            immatureGreen: actualCounts.rejections.harvest.immatureGreen,
            peckyGrains: actualCounts.rejections.harvest.peckyGrains,
            discolored: actualCounts.rejections.harvest.discolored
          },
          process: {
            chalkyWhole: actualCounts.rejections.process.chalkyWhole,
            blackTips: actualCounts.rejections.process.blackTips,
            burnt: actualCounts.rejections.process.burnt,
            spot: actualCounts.rejections.process.spot,
            discoloration: actualCounts.rejections.process.discoloration
          }
        },
        foreignMatter: {
          organic: {
            red: actualCounts.foreignMatter.organic.red,
            husk: actualCounts.foreignMatter.organic.husk,
            paddy: actualCounts.foreignMatter.organic.paddy,
            chaff: actualCounts.foreignMatter.organic.chaff,
            straw: actualCounts.foreignMatter.organic.straw,
            sticks: actualCounts.foreignMatter.organic.sticks,
            brownRice: actualCounts.foreignMatter.organic.brownRice
          },
          inorganic: {
            stones: actualCounts.foreignMatter.inorganic.stones,
            mud: actualCounts.foreignMatter.inorganic.mud,
            thread: actualCounts.foreignMatter.inorganic.thread,
            plastic: actualCounts.foreignMatter.inorganic.plastic,
            metals: actualCounts.foreignMatter.inorganic.metals,
            glass: actualCounts.foreignMatter.inorganic.glass,
            paper: actualCounts.foreignMatter.inorganic.paper,
            cardboard: actualCounts.foreignMatter.inorganic.cardboard
          }
        }
      };
      
      // 🔧 FIXED: First stop the TMA trial analysis
      console.log(`🛑 Step 1: Stopping TMA trial analysis...`);
      const response = await fetch(`${BACKEND_URL}/api/raice_labz/tma/mode/${tmaModeId}/stop-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineName: machine,
          trialNumber: trialNumber,
          grainMetrics: currentMetrics
        })
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        console.log(`✅ TMA machine analysis session stopped successfully`);
        
        // Check if there's automatic machine transition (only if handleAutomaticTransitions is true)
        if (handleAutomaticTransitions) {
          // 🔧 DELAY FIX: Set transition delay state and show delay message
          setTrialTransitionDelay(true);
          
          toast({
            title: "Analysis Processing",
            description: "Processing grain analysis data...",
            duration: 20000, // Show for 20 seconds
          });
          
          // Set a timeout to clear the delay state after 20 seconds (matching backend delay)
          setTimeout(() => {
            setTrialTransitionDelay(false);
            
            // Check if there are automatic transitions
            if (result.nextMachineActivated) {
              console.log(`🔄 Automatic machine transition: ${result.nextMachineActivated}`);
              toast({
                title: "Machine Transition Complete",
                description: `Automatically switched to ${result.nextMachineActivated} - Trial 1`,
              });
            } else if (result.nextTrialActivated) {
              console.log(`🔄 Automatic trial transition: ${result.nextTrialActivated}`);
              toast({
                title: "Trial Transition Complete",
                description: `Automatically switched to Trial ${result.nextTrialActivated}`,
              });
            } else {
              console.log(`✅ All trials completed for machine: ${machine}`);
              toast({
                title: "Machine Completed",
                description: `All trials completed for ${machine}`,
              });
            }
          }, 20000); // 20-second delay (matching backend)
        } else {
          console.log(`✅ TMA analysis stopped without automatic transitions (manual progression mode)`);
        }
        
        // 🔧 FIXED: Only stop TMA processing pipeline when all trials are completed
        if (!result.nextTrialActivated && !result.nextMachineActivated) {
          console.log(`🛑 Step 2: All trials completed - stopping TMA processing pipeline...`);
          try {
            const stopProcessingResponse = await fetch(`${BACKEND_URL}/api/tma/stop`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });

            if (stopProcessingResponse.ok) {
              const stopResult = await stopProcessingResponse.json();
              console.log(`✅ TMA processing pipeline stopped:`, stopResult);
              setTmaProcessingStarted(false); // Reset the flag when all trials are completed
              setHasStartedAnalysis(false);
            } else {
              console.warn(`⚠️ TMA processing pipeline stop returned: ${stopProcessingResponse.status}`);
            }
          } catch (stopError) {
            console.warn(`⚠️ Could not stop TMA processing pipeline: ${stopError}`);
            // Don't fail the request if processing pipeline stop fails
          }
        } else {
          console.log(`ℹ️ More trials remaining - keeping TMA processing pipeline running`);
        }

        // 🔧 FIXED: Set analysis running to false after both machine session and processing pipeline are stopped
        setTimerShouldRun(false); // Stop the timer
        setIsPaused(false); // Reset pause state on stop
        setCameraFps(0); // Reset camera FPS
        setDetectionsPerFrame(0); // Reset detections per frame
        setIsAnalysisRunning(false); // This triggers WebRTC cleanup
        setError(null);

        // Show Restart/Complete buttons instead of auto-completing
        setIsSampleStopped(true);

        // 🔧 FIXED: Metrics and counts are preserved in preservedMetricsAfterStopRef
        // They will remain visible until Complete Sample is clicked
        console.log('✅ TMA analysis stopped - metrics and counts preserved for display until Complete Sample');

        console.log(`✅ Stopped Tma analysis for ${machine}, trial ${trialNumber}`);
        return result;
      } else {
        throw new Error(result.message || 'Failed to stop TMA analysis');
      }
    } catch (error) {
      console.error(`❌ Failed to stop tma analysis for ${machine}:`, error);
      setError(error instanceof Error ? error.message : 'Failed to stop tma analysis');
      // Also set isAnalysisRunning to false on error so timer stops
      setTimerShouldRun(false); // Stop the timer
      setIsPaused(false); // Reset pause state on stop
      setIsAnalysisRunning(false);
      throw error;
    }
  };

  const canStartAnalysis = () => {
    return true;
  };

  const getValidationMessage = (): string | null => {
    return null;
  };

  // Pause/Resume toggle handler
  const togglePause = async () => {
    try {
      const endpoint = isPaused ? '/api/resume' : '/api/pause';
      const res = await fetch(`${BACKEND_URL}${endpoint}`, { method: 'POST' });
      if (res.ok) {
        setIsPaused(!isPaused);
      } else {
        console.error('Failed to toggle pause, status:', res.status);
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  };

  const handleStartStop = async () => {
    try {
      console.log('handleStartStop called: isAnalysisRunning=', isAnalysisRunning, 'canStartAnalysis=', canStartAnalysis());
      
      if (isAnalysisRunning) {
        console.log('Stopping analysis...');
        setOperationType('stopping');
        if (isTmaEnabled()) {
          const currentMachine = machines[currentMachineIndex];
          await stopTmaMachineAnalysis(currentMachine, currentSample);
        } else {
          await stopAnalysis();
        }
      } else {
        if (!isGrainDetailsFilled) {
          console.warn('Cannot start analysis - grain details not filled');
          setError('Please fill in the grain details before starting analysis');
          return;
        }
        if (!canStartAnalysis()) {
          console.warn('Cannot start analysis - no weight entered for current sample');
          setError('Please enter a weight for the current sample before starting analysis');
          return;
        }
        console.log('Starting analysis...');
        // 🔧 FIXED: Start timer immediately when button is clicked (before async operations)
        // This includes initialization time + analysis time + stopping time
        setElapsedTime(0); // Reset to 0 when starting
        setTimerShouldRun(true); // Mark that timer should be running - useEffect will start it
        setOperationType('starting');
        if (isTmaEnabled()) {
          const currentMachine = machines[currentMachineIndex];
          await startTmaMachineAnalysis(currentMachine, currentSample);
        } else {
          await startAnalysis();
        }
      }
    } catch (error) {
      console.error('Error in handleStartStop:', error);
      setError(`Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // If error occurs during start, stop the timer
      if (!isAnalysisRunning) {
        setTimerShouldRun(false);
      }
    } finally {
      setOperationType(null);
    }
  };

  const handleRestartSample = async () => {
    try {
      const modeId = sessionStorage.getItem('mode_id') ||
                     sessionStorage.getItem('tma_mode_id') ||
                     sessionStorage.getItem('production_series_mode_id') ||
                     analysisData?.modeId;
      if (!modeId) {
        toast({ title: "Error", description: "No mode ID found for restart.", variant: "destructive" });
        return;
      }

      const currentMachine = machines[currentMachineIndex] || analysisData?.machineName || '';
      const response = await fetch(`${BACKEND_URL}/api/raice_labz/analysis/mode/${modeId}/restart-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trialNumber: currentSample,
          ...(analysisData?.machineIndex !== undefined ? { machineIndex: analysisData.machineIndex } : {}),
          ...(currentMachine ? { machineName: currentMachine } : {}),
        })
      });

      if (!response.ok) throw new Error('Failed to restart sample');

      // Ensure mode_id stays in sessionStorage after restart
      if (!sessionStorage.getItem('mode_id')) {
        sessionStorage.setItem('mode_id', modeId);
      }

      // Reset frontend state
      preservedMetricsAfterStopRef.current = null;
      preservedCountsAfterStopRef.current = null;
      setMetrics(initialMetrics);
      setActualCounts(zeroCounts);
      lastKnownSegmentationRef.current = {
        headrice: 0, threefourthhead: 0, halfbrokens: 0, quarterfinebrokens: 0, tips: 0,
        secondone: 0, tibar: 0, dubar: 0, minidubar: 0, mongra: 0, minimongra: 0, nakku: 0
      };
      lastNonZeroMetrics.current = null;
      currentMetricsRef.current = initialMetrics;
      setChartData([]);
      chartStartTimeRef.current = 0;
      setGaugeValues({ headRice: 0, broken: 0, chalky: 0, rejections: 0 });
      setGaugeCounts({ headRice: 0, broken: 0, chalky: 0, rejections: 0 });
      setElapsedTime(0);
      setIsSampleStopped(false);

      toast({ title: "Sample Restarted", description: `Sample ${currentSample} has been reset. Click Start Analysis to begin.` });
    } catch (error) {
      toast({ title: "Restart Failed", description: error instanceof Error ? error.message : 'Failed to restart sample', variant: "destructive" });
    }
  };

  const handleCompleteSample = () => {
    setIsSampleStopped(false);
    // Allow manual sample/trial transitions for all modes including individual, batch, machine-wise
    // This enables the user to click "Complete Sample" to move from trial 1 → trial 2 → trial 3
    console.log(`Completing sample ${currentSample} for ${analysisData?.analysisType || 'unknown'} mode`);

    if (isAnalysisRunning) {
      // 🔧 FIXED: Only set global analysis state
      setIsAnalysisRunning(false); // This triggers WebRTC cleanup
    }
    
    setCompletedSamples(prev => [...prev, currentSample]);
    
    // 🔧 FIXED: Clear preserved metrics when completing sample - this resets UI to 0
    preservedMetricsAfterStopRef.current = null;
    preservedCountsAfterStopRef.current = null;
    
    // 🔧 FIXED: Reset metrics, counts, and refs when completing sample
    // This ensures clean state for the next sample
    lastKnownSegmentationRef.current = {
      headrice: 0,
      threefourthhead: 0,
      halfbrokens: 0,
      quarterfinebrokens: 0,
      tips: 0,
      secondone: 0,
      tibar: 0,
      dubar: 0,
      minidubar: 0,
      mongra: 0,
      minimongra: 0,
      nakku: 0
    };
    lastNonZeroMetrics.current = null; // Reset last non-zero metrics
    currentMetricsRef.current = initialMetrics; // Reset current metrics ref
    currentCountsRef.current = zeroCounts; // Reset current counts ref
    console.log('🔄 Reset all metrics, counts, and refs after completing sample');
    
    // Reset metrics and weight for the next sample
    setMetrics(initialMetrics);
    setActualCounts(zeroCounts);

    // Reset speedometer gauges and chart for the next sample
    setGaugeValues({ headRice: 0, broken: 0, chalky: 0, rejections: 0 });
    setGaugeCounts({ headRice: 0, broken: 0, chalky: 0, rejections: 0 });
    setChartData([]);
    chartStartTimeRef.current = 0;

    // Reset timer for the next sample
    setElapsedTime(0);

    if (currentSample < totalSamplesCount) {
      setCurrentSample(prev => prev + 1);
    } else {
      console.log("All samples completed for regular analysis.");

      // For non-TMA modes, auto-transition to reports after all samples
      if (!isTmaEnabled()) {
        setAllAnalysisDone(true);
        toast({ title: "All Samples Completed", description: "Proceeding to Insights & Reports..." });
      }

      // For TMA, mark the current machine as completed when all samples are done
      if (isTmaEnabled()) {
        const currentMachine = machines[currentMachineIndex];
        console.log(`🎯 TMA: All ${totalSamplesCount} samples completed for machine: ${currentMachine}`);
        
        // Mark machine as completed
        const alreadyCompleted = completedMachines.includes(currentMachine);
        const newCompletedMachines = alreadyCompleted ? completedMachines : [...completedMachines, currentMachine];
        setCompletedMachines(newCompletedMachines);

        // Check if all machines are now done
        const isLastMachine = newCompletedMachines.length >= machines.length || currentMachineIndex >= machines.length - 1;
        console.log(`🔍 Machine completion check: completed=${newCompletedMachines.length}, total=${machines.length}, currentIdx=${currentMachineIndex}, isLast=${isLastMachine}`);
        if (isLastMachine) {
          console.log("🎉 All machines completed! Auto-transitioning to reports...");
          setAllAnalysisDone(true);
          toast({
            title: "All Machines Completed",
            description: "Proceeding to Insights & Reports...",
          });
        } else {
          const nextMachineIndex = currentMachineIndex + 1;
          const nextMachine = machines[nextMachineIndex];
          console.log(`🔄 Moving to next machine: ${nextMachine}`);

          setCurrentMachineIndex(nextMachineIndex);
          setAccordionValue(nextMachine);
          setCurrentSample(1);
          setCompletedSamples([]);

          toast({
            title: "Machine Transition",
            description: `Moving to ${nextMachine} - Sample 1`,
          });
        }
      }
    }
  };


  /** Skip the current sample — marks it as skipped and advances */
  useEffect(() => {
    if (!allAnalysisDone || transitionTriggeredRef.current) return;
    const transitionTimeout = window.setTimeout(() => {
      console.log("🔄 Auto-transition to Insights & Reports triggered by completion state");
      transitionTriggeredRef.current = true;
      onCompleteRef.current?.();
    }, 300);

    return () => window.clearTimeout(transitionTimeout);
  }, [allAnalysisDone]);

  useEffect(() => {
    if (!allAnalysisDone) {
      transitionTriggeredRef.current = false;
    }
  }, [allAnalysisDone]);

  const handleSkipSample = async () => {
    console.log(`⏭️ Skipping sample ${currentSample}`);

    // If analysis is running, stop it first
    if (isAnalysisRunning) {
      setIsAnalysisRunning(false);
      setTimerShouldRun(false);
    }

    // Mark the trial as invalid in the backend
    const modeId = sessionStorage.getItem('mode_id') ||
                   sessionStorage.getItem('tma_mode_id') ||
                   sessionStorage.getItem('production_series_mode_id') ||
                   analysisData?.modeId;
    if (modeId) {
      try {
        const currentMachine = machines[currentMachineIndex] || analysisData?.machineName || '';
        await fetch(`${BACKEND_URL}/api/raice_labz/analysis/mode/${modeId}/skip-trial`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trialNumber: currentSample,
            ...(currentMachine ? { machineName: currentMachine } : {}),
          })
        });
      } catch (e) {
        console.warn('Failed to mark skipped sample:', e);
      }
    }

    // Clear state and advance — reuse handleCompleteSample logic
    setIsSampleStopped(false);
    preservedMetricsAfterStopRef.current = null;
    preservedCountsAfterStopRef.current = null;
    setMetrics(initialMetrics);
    setActualCounts(zeroCounts);
    setElapsedTime(0);
    setChartData([]);
    chartStartTimeRef.current = 0;
    setGaugeValues({ headRice: 0, broken: 0, chalky: 0, rejections: 0 });
    setGaugeCounts({ headRice: 0, broken: 0, chalky: 0, rejections: 0 });

    // Mark as completed and advance
    setCompletedSamples(prev => [...prev, currentSample]);

    if (currentSample < totalSamplesCount) {
      setCurrentSample(prev => prev + 1);
      toast({ title: "Sample Skipped", description: `Sample ${currentSample} skipped. Ready for sample ${currentSample + 1}.` });
    } else {
      // Last sample skipped — same as completing last sample
      if (isTmaEnabled()) {
        const currentMachine = machines[currentMachineIndex];
        setCompletedMachines(prev => prev.includes(currentMachine) ? prev : [...prev, currentMachine]);

        if (currentMachineIndex < machines.length - 1) {
          const nextMachine = machines[currentMachineIndex + 1];
          setCurrentMachineIndex(prev => prev + 1);
          setAccordionValue(nextMachine);
          setCurrentSample(1);
          setCompletedSamples([]);
          toast({ title: "Machine Skipped", description: `Moving to ${nextMachine} - Sample 1` });
        } else {
          setAllAnalysisDone(true);
          toast({ title: "All Machines Done", description: "Proceeding to Insights & Reports..." });
        }
      }
    }
  };

  const handleCompleteMachine = () => {
    const currentMachine = machines[currentMachineIndex];
    setCompletedMachines(prev => [...prev, currentMachine]);
    
    setCurrentSample(1);
    setCompletedSamples([]);
    
    if (currentMachineIndex < machines.length - 1) {
      setCurrentMachineIndex(prev => prev + 1);
      setAccordionValue(machines[currentMachineIndex + 1]);
    } else {
      console.log("All machines completed for TMA analysis.");
    }
    
    console.log(`Machine ${currentMachine} analysis completed. Moving to next machine.`);
  };


  // Check status on component mount and when analysis starts
  useEffect(() => {
    checkConfigStatus();
    fetchCurrentBatch();

    // Check status periodically
    const statusInterval = setInterval(() => {
      checkConfigStatus();
      fetchCurrentBatch();
    }, 5000);
    return () => clearInterval(statusInterval);
  }, []);

  // Listen for fullscreen changes and keyboard events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch((err) => {
          console.error('Error attempting to exit fullscreen:', err);
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Update status when analysis state changes
  useEffect(() => {
    if (isAnalysisRunning) {
      checkConfigStatus();
    }
  }, [isAnalysisRunning]);

  // WebRTC cleanup when analysis stops.
  // Initialization is triggered early in startAnalysisWithModeId() so it
  // runs in parallel with backend API calls — not after they complete.
  useEffect(() => {
    if (!isAnalysisRunning) {
      console.log('Analysis stopped - cleaning up WebRTC...');
      cleanupWebRTC();
    }
  }, [isAnalysisRunning]);

  // Timer logic - start/stop based on timerShouldRun state
  useEffect(() => {
    console.log('⏱️ Timer useEffect triggered, timerShouldRun:', timerShouldRun);
    if (timerShouldRun) {
      // Timer should be running - ensure it's running
      if (!timerIntervalRef.current) {
        console.log('⏱️ Starting timer interval...');
        timerIntervalRef.current = setInterval(() => {
          // Skip incrementing when paused
          if (isPausedRef.current) return;
          setElapsedTime(prev => {
            const newTime = prev + 1;
            if (newTime % 10 === 0) {
              console.log('⏱️ Timer tick:', newTime);
            }
            return newTime;
          });
        }, 1000); // Update every second
        console.log('⏱️ Timer started via useEffect, interval ID:', timerIntervalRef.current);
      } else {
        console.log('⏱️ Timer already running, interval ID:', timerIntervalRef.current);
      }
    } else {
      // Timer should not be running - stop it
      if (timerIntervalRef.current) {
        console.log('⏱️ Stopping timer, interval ID:', timerIntervalRef.current);
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        console.log('⏱️ Timer stopped via useEffect');
      } else {
        console.log('⏱️ Timer not running, nothing to stop');
      }
    }

    // Cleanup on unmount
    return () => {
      if (timerIntervalRef.current) {
        console.log('⏱️ Cleanup: clearing timer interval');
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timerShouldRun]); // Watch timerShouldRun state

  // Format elapsed time to MM:SS or HH:MM:SS
  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Check analysis status on component mount to sync with backend
  useEffect(() => {
    console.log('🔍 LiveAnalysis component mounted');
    
    // Detect if this is a page refresh vs navigation
    const isPageRefreshDetected = !sessionStorage.getItem('app_navigation_state');
    
    if (isPageRefreshDetected) {
      // Page refresh - backend analysis has been stopped by App component
      console.log('🔄 Page refresh detected - resetting all states to initial values');
      setIsPaused(false);           // Reset pause state
      setIsAnalysisRunning(false);  // Button shows "Start Analysis"
      setMetrics(initialMetrics);      // Quality Summary shows all zeros
      setRealTimeStats(null);       // Clear any debug data
      setError(null);               // Clear any errors
      
      // Mark that the app has been navigated to (not refreshed)
      sessionStorage.setItem('app_navigation_state', 'navigated');
      
      // Don't sync with backend on page refresh - it has been stopped
      checkCameraHardware(); // Still check camera hardware on refresh
    } else {
      // Navigation from other pages - sync with backend status
      console.log('🔄 Navigation detected - syncing with backend status');
      checkCameraHardware(); // Check camera hardware availability
      checkAnalysisStatus(); // Sync with backend
      
      // 🔧 OPTIMIZED: Don't fetch database metrics on mount
      // Real-time Socket.IO updates will provide live data when analysis starts
      console.log('📊 Navigation detected - will rely on real-time Socket.IO updates for metrics');
    }
    
    // Cleanup function: Reset analysis state when leaving the page
    return () => {
      console.log('🔄 LiveAnalysis component unmounting - preserving analysis state');
      // DON'T reset isAnalysisRunning here - let it persist for navigation
      
      // 🔧 OPTIMIZED: Clean up debounced metrics update on unmount
      if (debouncedSetMetrics.current) {
        clearTimeout(debouncedSetMetrics.current);
      }
    };
  }, []); // Run on component mount regardless of configuration

  // Clear page refresh flag only when analysis starts, not automatically
  useEffect(() => {
    if (isAnalysisRunning) {
      // Clear the page refresh flag when user starts analysis
      console.log('🔄 Analysis started - clearing page refresh flag to allow metric updates');
      
      // 🔧 OPTIMIZED: Only fetch database metrics when analysis is running
      // Real-time Socket.IO updates will provide live data
      console.log('📊 Analysis started - will rely on real-time Socket.IO updates for metrics');
    }
  }, [isAnalysisRunning]);

  // Enhanced WebSocket connection and statistics handling - Fixed to prevent multiple connections
  useEffect(() => {
    // 🔧 FIXED: Only create WebSocket connection once on component mount
    // Don't recreate on isAnalysisRunning changes to prevent connection conflicts
    const connectionDelay = setTimeout(() => {
      const newSocket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'], // Allow fallback to polling
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 10000,
        forceNew: true,
        upgrade: true,
        rememberUpgrade: false
      });

      setSocket(newSocket);

      // 🔧 OPTIMIZED: Reduced frequency and added debouncing for stats requests
      let statsInterval: NodeJS.Timeout;
      let lastStatsUpdate = 0;
      const STATS_UPDATE_THRESHOLD = 50; // 🔧 FIXED: Reduced to 50ms for smoother, more frequent updates
      
      newSocket.on('connect', () => {
        console.log('✅ WebSocket connected successfully to:', BACKEND_URL);
        setWsConnected(true);
        setError(null); // Clear any connection errors
        
        // 🔧 OPTIMIZED: Request current statistics once on connection
        console.log('🔄 Requesting current statistics on connection...');
        newSocket.emit('request_stats');
        
        // 🔧 NEW: Test if backend responds to statistics requests
        setTimeout(() => {
          console.log('🔍 🔍 Testing statistics request after 2 seconds...');
          newSocket.emit('request_stats');
        }, 2000);
        
        // 🔧 FIXED: Request stats more frequently for smoother updates (every 1 second during active analysis)
        statsInterval = setInterval(() => {
          if (isAnalysisRunningRef.current) { // Use ref instead of state to avoid dependency
            console.log('🔄 Periodic stats request for continuous updates...');
            newSocket.emit('request_stats');
          }
        }, 1000); // 🔧 FIXED: Request stats every 1 second for smoother updates
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        console.error('❌ Failed to connect to:', BACKEND_URL);
        console.log('🔄 Will retry connection automatically...');
        setWsConnected(false);
        setError(`WebSocket connection failed: ${error.message}. Retrying...`);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('🔌 WebSocket disconnected. Reason:', reason);
        setWsConnected(false);
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          console.log('🔄 Server disconnected, attempting to reconnect...');
          newSocket.connect();
        }
        setError('WebSocket disconnected. Attempting to reconnect...');
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
        setWsConnected(true);
        setError(null); // Clear any connection errors
        // Request stats after reconnection
        newSocket.emit('request_stats');
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('❌ WebSocket reconnection error:', error);
        setWsConnected(false);
        setError(`Reconnection failed: ${error.message}`);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('❌ WebSocket reconnection failed after all attempts');
        setWsConnected(false);
        setError('WebSocket reconnection failed. Please refresh the page.');
      });

      // 🔧 OPTIMIZED: Enhanced real-time statistics handling with debouncing
      newSocket.on('statistics_update', (data) => {
        const now = Date.now();
        
        // 🔧 OPTIMIZED: Debounce rapid updates to prevent excessive re-renders
        if (now - lastStatsUpdate < STATS_UPDATE_THRESHOLD) {
          console.log('📊 ⏸️ Skipping rapid update (debounced)');
          return;
        }
        
        console.log('📊 🎯 RECEIVED REAL-TIME STATISTICS:', data);
        console.log('📊 🎯 Data type:', typeof data);
        console.log('📊 🎯 Data keys:', Object.keys(data || {}));
        
        // 🔧 FIXED: Extract the correct data structure from backend
        const backendStats = data?.total_unique_objects;
        if (!backendStats) {
          console.log('📊 ⏸️ No total_unique_objects in data');
          console.log('📊 ⏸️ Full data received:', data);
          return;
        }

        // Extract real-time camera & detection metrics
        if (data?.cameraFps !== undefined) setCameraFps(data.cameraFps);
        if (data?.detectionsPerFrame !== undefined) setDetectionsPerFrame(data.detectionsPerFrame);
        if (data?.cameraActive !== undefined) setCameraActive(data.cameraActive);

        // Update mill region from backend if provided
        if (data.region && data.region !== millRegion) {
          setMillRegion(data.region);
        }
        
        // 🔧 NEW: If this is a reset signal, reset lastKnownSegmentationRef
        if (data._isReset === true) {
          console.log('🔄 Reset signal received from backend - clearing lastKnownSegmentationRef');
          lastKnownSegmentationRef.current = {
            headrice: 0,
            threefourthhead: 0,
            halfbrokens: 0,
            quarterfinebrokens: 0,
            tips: 0,
            secondone: 0,
            tibar: 0,
            dubar: 0,
            minidubar: 0,
            mongra: 0,
            minimongra: 0,
            nakku: 0
          };
        }
        
        console.log('📊 Total objects in data:', backendStats.total || 0);
        
        // 🔧 OPTIMIZED: Only log detailed breakdown in development mode or when debugging
        if (import.meta.env.DEV) {
          console.log('🔍 BACKEND DATA BREAKDOWN:');
          console.log('  📈 Good Rice:', backendStats.goodrice?.total || 0, '- Details:', backendStats.goodrice?.details);
          console.log('  📈 Good Rice Segmentation:', backendStats.goodrice?.segmentation);
          console.log('  📈 Defective:', backendStats.defective?.total || 0, '- Details:', backendStats.defective?.details);
          console.log('  📈 Foreign:', backendStats.foreign?.total || 0, '- Details:', backendStats.foreign?.details);
          console.log('  📈 Grand Total:', backendStats.total || 0);
        }
        
        // 🔧 OPTIMIZED: Only update realTimeStats when needed for debugging
        if (import.meta.env.DEV) {
          setRealTimeStats(data);
        }
        
        // 🔧 OPTIMIZED: Efficient metrics update with validation
        // 🔧 NEW: Always update metrics, even if total is 0 (to handle reset signals and new trial starts)
        // This ensures UI shows zeros when Kafka messages are empty (new trial starting)
        console.log('📊 ✅ UPDATING METRICS IN REAL-TIME from Socket.IO');
        // Extract quality indices from the full data object
        const qualityIndices = data?.qualityIndices || {};
        const isResetSignal = data?._isReset === true;
        const isCurrentlyRunning = isAnalysisRunningRef.current;
        console.log('🔬 [QUALITY_INDICES] Received quality indices from backend:', qualityIndices);
        console.log('🔄 [RESET_SIGNAL] Is reset signal:', isResetSignal);
        console.log('🔄 [ANALYSIS_RUNNING] Is analysis running:', isCurrentlyRunning);
        // 🔧 FIXED: Pass current counts and analysis status to preserve counts during active analysis
        const result = convertBackendStatsToMetrics(backendStats, qualityIndices, isResetSignal, actualCounts, isCurrentlyRunning);
        const newMetrics = (result as any).metrics || result;
        const newCounts = (result as any).counts || actualCounts;
        const preserveCounts = (result as any).preserveCounts === true;
        
        // 🔧 FIXED: If analysis is stopped and we have preserved metrics, ignore all WebSocket updates
        // Keep the preserved metrics until Complete Sample is clicked
        const hasPreservedMetrics = preservedMetricsAfterStopRef.current !== null;
        if (!isCurrentlyRunning && hasPreservedMetrics) {
          console.log('🔍 🔄 Ignoring WebSocket update after stop - using preserved metrics until Complete Sample');
          // Ensure state shows preserved metrics
          if (calculateTotals(metrics).total === 0) {
            setMetrics(preservedMetricsAfterStopRef.current);
            setActualCounts(preservedCountsAfterStopRef.current || actualCounts);
          }
          return; // Don't process this update
        }
        
        // 🔧 OPTIMIZED: Only update if metrics actually changed
        console.log('🔍 FINAL METRICS BEING SET TO STATE:', newMetrics);
        console.log('🔍 FINAL COUNTS BEING SET TO STATE:', newCounts);
        console.log('🔍 PRESERVE COUNTS FLAG:', preserveCounts);
        
        // 🔧 FIXED: When preserving counts, update metrics immediately (no debounce) to prevent flickering
        // This ensures preserved metrics are shown instantly, preventing 0% flicker
        if (preserveCounts) {
          // Clear any pending debounced update to prevent zero metrics from overwriting preserved metrics
          if (debouncedSetMetrics.current) {
            clearTimeout(debouncedSetMetrics.current);
            debouncedSetMetrics.current = null;
          }
          
          // 🔧 FIXED: Check if preserved metrics are actually non-zero, otherwise use last non-zero metrics or current metrics
          const totals = calculateTotals(newMetrics);
          let finalMetrics = newMetrics;
          
          // If preserved metrics are zero but we have non-zero metrics, use the non-zero ones
          if (totals.total === 0 && isCurrentlyRunning) {
            // Try last non-zero metrics first
            if (lastNonZeroMetrics.current) {
              finalMetrics = lastNonZeroMetrics.current;
              console.log('🔍 🔄 Preserved metrics are zero, using last non-zero metrics to prevent flickering');
            } else if (calculateTotals(currentMetricsRef.current).total > 0) {
              // Fallback to current metrics if they're non-zero
              finalMetrics = currentMetricsRef.current;
              console.log('🔍 🔄 Preserved metrics are zero, using current metrics to prevent flickering');
            }
          } else if (totals.total > 0) {
            // Update last non-zero metrics reference
            lastNonZeroMetrics.current = newMetrics;
          }
          
          // 🔧 FIXED: Update ref before setting state to prevent race conditions
          currentMetricsRef.current = finalMetrics;
          // Update metrics immediately when preserving to prevent flickering
          setMetrics(finalMetrics);
          setLastMetricsUpdate(new Date());
          setMetricsUpdateCount(prev => prev + 1);
          console.log('🔍 🔄 Updated metrics immediately (preserving counts) to prevent flickering');
        } else {
          // Normal debounced update for regular updates
          updateMetricsDebounced(newMetrics);
        }
        
        // 🔧 FIXED: Only update counts if not preserving (preserveCounts flag prevents unnecessary state updates)
        if (!preserveCounts) {
          setActualCounts(newCounts);
        } else {
          console.log('🔍 🔄 Skipping setActualCounts - preserving existing counts during active analysis');
        }
        
        lastStatsUpdate = now;

        // Push data point for real-time chart
        if (isCurrentlyRunning) {
          const chartMetrics = preserveCounts ? finalMetrics || newMetrics : newMetrics;
          if (chartMetrics) {
            const regionKey = (data.region || millRegionRef.current) as 'basmati' | 'non-basmati';
            const cats = segConfigRef.current?.[regionKey]?.categories || [];
            const hrKeys = (cats as any[]).filter((c: any) => c.group === 'headRice').map((c: any) => segKeyToMetricField[c.key]).filter(Boolean);
            const brKeys = (cats as any[]).filter((c: any) => c.group === 'brokens').map((c: any) => segKeyToMetricField[c.key]).filter(Boolean);
            const hrFallback = regionKey === 'basmati' ? ['headRice', 'secondOne', 'tibar'] : ['headRice', 'threeFourthHead'];
            const brFallback = regionKey === 'basmati' ? ['dubar', 'miniDubar', 'mongra', 'miniMongra', 'nakku'] : ['halfBrokens', 'quarterFineBrokens', 'tips'];
            const hrF = hrKeys.length > 0 ? hrKeys : hrFallback;
            const brF = brKeys.length > 0 ? brKeys : brFallback;
            const hr = hrF.reduce((s: number, k: string) => s + ((chartMetrics.goodRice as any)[k] || 0), 0);
            const br = brF.reduce((s: number, k: string) => s + ((chartMetrics.goodRice as any)[k] || 0), 0);
            const ch = chartMetrics.rejections.harvest.chalkyBellyCore || 0;
            const rj = (chartMetrics.rejections.harvest.yellow || 0) +
              (chartMetrics.rejections.harvest.immatureGreen || 0) +
              (chartMetrics.rejections.harvest.peckyGrains || 0) +
              (chartMetrics.rejections.harvest.discolored || 0);
            if (!chartStartTimeRef.current) chartStartTimeRef.current = now;
            const elapsed = Math.round((now - chartStartTimeRef.current) / 1000);
            const mins = Math.floor(elapsed / 60);
            const secs = elapsed % 60;
            const timeLabel = `${mins}:${String(secs).padStart(2, '0')}`;
            setChartData(prev => {
              const next = [...prev, { time: timeLabel, headRice: +hr.toFixed(1), broken: +br.toFixed(1), chalky: +ch.toFixed(1), rejections: +rj.toFixed(1) }];
              return next.length > 120 ? next.slice(-120) : next;
            });
            // Update live gauge values
            setGaugeValues({ headRice: +hr.toFixed(1), broken: +br.toFixed(1), chalky: +ch.toFixed(1), rejections: +rj.toFixed(1) });
            const gCounts = preserveCounts ? currentCountsRef.current : newCounts;
            const hrCount = hrF.reduce((s: number, k: string) => s + ((gCounts.goodRice as any)[k] || 0), 0);
            const brCount = brF.reduce((s: number, k: string) => s + ((gCounts.goodRice as any)[k] || 0), 0);
            const chCount = gCounts.rejections?.harvest?.chalkyBellyCore || 0;
            const rjCount = (gCounts.rejections?.harvest?.yellow || 0) +
              (gCounts.rejections?.harvest?.immatureGreen || 0) +
              (gCounts.rejections?.harvest?.peckyGrains || 0) +
              (gCounts.rejections?.harvest?.discolored || 0);
            setGaugeCounts({ headRice: hrCount, broken: brCount, chalky: chCount, rejections: rjCount });
          }
        }

        // 🔧 OPTIMIZED: Only log totals in development mode
        if (import.meta.env.DEV) {
          const totals = calculateTotals(newMetrics);
          console.log('📊 REAL-TIME METRICS UPDATED:');
          console.log('  📈 Good Rice Total:', totals.goodRice.toFixed(1) + '%');
          console.log('  📈 Rejections Total:', totals.rejections.toFixed(1) + '%');
          console.log('  📈 Foreign Matter Total:', totals.foreignMatter.toFixed(1) + '%');
          console.log('  📈 Grand Total:', totals.total.toFixed(1) + '%');
          
          // 🔧 NEW: Log when reset signal is received
          if (data._isReset === true) {
            console.log('🔄 Reset signal processed - metrics should be zeros');
          }
        }
        
        // 🔧 NEW: Show a message when no data is available yet (only if analysis is running)
        if (backendStats.total === 0 && isAnalysisRunningRef.current) {
          console.log('📊 ⏸️ Analysis is running but no objects detected yet');
          console.log('📊 ⏸️ This is normal - objects will appear as they are detected');
        }
      });

      // Listen for configuration status
      newSocket.on('config_status', (data) => {
        console.log('⚙️ Config status update:', data);
        setConfigStatus(data);
      });

      // Listen for batch updates
      newSocket.on('batch_update', (data) => {
        console.log('📦 Batch update:', data);
        setCurrentBatch(data);
      });

      // Listen for connection status
      newSocket.on('connection_status', (data) => {
        console.log('🔗 Connection status:', data);
        if (data.status === 'disconnected') {
          setWsConnected(false);
          // Clean up WebRTC connection
          cleanupWebRTC();
        }
      });

      // 🔧 NEW: Listen for any response to request_stats
      newSocket.on('stats_response', (data) => {
        console.log('📊 📊 Received stats_response event:', data);
      });
      
      newSocket.on('stats_update', (data) => {
        console.log('📊 📊 Received stats_update event:', data);
      });
      
      newSocket.on('statistics', (data) => {
        console.log('📊 📊 Received statistics event:', data);
      });

      // Add shutdown status listener in the WebSocket useEffect
      newSocket.on('shutdown_status', (data) => {
        console.log('🛑 Shutdown status update:', data);
        setShutdownStatus(data);
        
        // If shutdown is completed, reset the status
        if (data.status === 'completed') {
          setTimeout(() => {
            setShutdownStatus(null);
            console.log('✅ Shutdown complete');
          }, 5000); // Clear status after 5 seconds (longer since it's less intrusive)
        }
      });

      // Listen for device config missing notifications
      newSocket.on('device_config_missing', (data) => {
        console.warn('⚠️ Device config missing:', data);
        toast({
          title: "Device Configuration Missing",
          description: data.message || `New machine - No configuration set up - using fallback (Device: ${data.device_id})`,
          variant: "destructive",
          duration: 5000,
        });
      });

      // Pause/Resume listeners from backend
      newSocket.on('processing_paused', () => {
        console.log('⏸️ Processing paused by backend');
        setIsPaused(true);
      });

      newSocket.on('processing_resumed', () => {
        console.log('▶️ Processing resumed by backend');
        setIsPaused(false);
      });

      return () => {
        // 🔧 FIX: Remove all socket listeners before closing to prevent accumulation
        if (newSocket) {
          newSocket.off('connect');
          newSocket.off('connect_error');
          newSocket.off('disconnect');
          newSocket.off('reconnect');
          newSocket.off('reconnect_error');
          newSocket.off('reconnect_failed');
          newSocket.off('statistics_update');
          newSocket.off('video_status');
          newSocket.off('config_status');
          newSocket.off('batch_update');
          newSocket.off('connection_status');
          newSocket.off('stats_response');
          newSocket.off('stats_update');
          newSocket.off('statistics');
          newSocket.off('shutdown_status');
          newSocket.off('device_config_missing');
          newSocket.off('processing_paused');
          newSocket.off('processing_resumed');
          newSocket.close();
        }
        if (statsInterval) {
          clearInterval(statsInterval);
        }
        // 🔧 OPTIMIZED: Clean up debounced metrics update
        if (debouncedSetMetrics.current) {
          clearTimeout(debouncedSetMetrics.current);
        }
        // Clean up WebRTC connection
        cleanupWebRTC();
      };
    }, 2000); // Wait 2 seconds for backend to be ready

    // Cleanup function
    return () => {
      clearTimeout(connectionDelay);
    };
  }, []); // 🔧 FIXED: Empty dependency array - only run once on mount

  // Check if grain details have been filled
  // Show popup only if no analysisData AND grainFormData is mostly empty
  const hasAnalysisData = !!analysisData;
  const hasSomeGrainData = !!(
    grainFormData?.variety && grainFormData?.variety.trim() !== "" &&
    grainFormData?.process && grainFormData?.process.trim() !== ""
  );
  
  // Only show popup if user hasn't passed analysis data AND doesn't have variety/process filled
  const isGrainDetailsFilled = hasAnalysisData || hasSomeGrainData;
  const canStartCurrentSample = canStartAnalysis();

  /* ─────────────────────────────────────────────────────────────────────
     iOS-themed structural layout. Renders only when not on Classic theme.
     Reads all state via closure — handlers are the same as the classic
     path so play/pause/stop/skip/complete behave identically.
  ───────────────────────────────────────────────────────────────────── */
  if (!isClassicTheme) {
    const wi = metrics.qualityIndices?.whitenessIndex ?? 0;
    const totalGrainsValue = calculateTotals(metrics).total;
    const ringMetrics: RingMetric[] = [
      {
        key: "wi",
        label: "Whiteness",
        value: wi,
        count: 0,
        unit: "WI",
        max: 50,
        tokenVar: "--accent",
      },
      {
        key: "head",
        label: "Head rice",
        value: gaugeValues.headRice,
        count: gaugeCounts.headRice,
        unit: showPercentage ? "%" : "grains",
        max: 100,
        tokenVar: "--grain-head",
      },
      {
        key: "broken",
        label: "Broken",
        value: gaugeValues.broken,
        count: gaugeCounts.broken,
        unit: showPercentage ? "%" : "grains",
        max: 100,
        tokenVar: "--grain-broken",
      },
      {
        key: "chalky",
        label: "Chalky",
        value: gaugeValues.chalky,
        count: gaugeCounts.chalky,
        unit: showPercentage ? "%" : "grains",
        max: 100,
        tokenVar: "--grain-chalky",
      },
      {
        key: "rejections",
        label: "Rejections",
        value: gaugeValues.rejections,
        count: gaugeCounts.rejections,
        unit: showPercentage ? "%" : "grains",
        max: 100,
        tokenVar: "--grain-rejection",
      },
      {
        key: "dom",
        label: "DOM",
        value: metrics.qualityIndices?.degreeOfMilling ?? 0,
        count: 0,
        unit: "%",
        max: 100,
        tokenVar: "--ios-orange",
      },
      {
        key: "don",
        label: "DON",
        value: metrics.qualityIndices?.degreeOfNutrition ?? 0,
        count: 0,
        unit: "%",
        max: 100,
        tokenVar: "--ios-green",
      },
    ];

    const showRunControls = isGrainDetailsFilled || isAnalysisRunning;
    const showCompleteButton = !isAnalysisRunning && (allAnalysisDone || (isSampleStopped && !completedSamples.includes(currentSample)));

    // Three rings for the Apple-Health-style composite — outer→inner:
    // Whiteness, Head rice, Total grains progress (toward arbitrary 5000).
    const composite: RingDef[] = [
      {
        key: "head",
        label: "Head rice",
        value: gaugeValues.headRice,
        max: 100,
        tokenVar: "--grain-head",
        unit: "%",
        subtitle: "Target ≥ 80%",
      },
      {
        key: "broken",
        label: "Broken",
        value: gaugeValues.broken,
        max: 100,
        tokenVar: "--grain-broken",
        unit: "%",
        subtitle: `${(gaugeCounts.broken ?? 0).toLocaleString()} grains`,
      },
      {
        key: "chalky",
        label: "Chalky",
        value: gaugeValues.chalky,
        max: 100,
        tokenVar: "--grain-chalky",
        unit: "%",
        subtitle: `${(gaugeCounts.chalky ?? 0).toLocaleString()} grains`,
      },
      {
        key: "rejections",
        label: "Rejections",
        value: gaugeValues.rejections,
        max: 100,
        tokenVar: "--grain-rejection",
        unit: "%",
        subtitle: `${(gaugeCounts.rejections ?? 0).toLocaleString()} grains`,
      },
    ];

    // Class counts for the grain wall — fed from gauge counters
    const wallCounts = {
      good: gaugeCounts.headRice ?? 0,
      broken: gaugeCounts.broken ?? 0,
      chalky: gaugeCounts.chalky ?? 0,
      rejection: gaugeCounts.rejections ?? 0,
    };

    return (
      <div className={embedded ? "w-full" : "flex-1 flex flex-col overflow-hidden ios-canvas"}>
        {!embedded && (
          <TopBarIOS
            title="Live Analysis"
            subtitle={
              grainFormData?.variety
                ? `${grainFormData.variety}${grainFormData?.process ? ` · ${grainFormData.process}` : ""}`
                : "Real-time rice grain quality analysis"
            }
          />
        )}

        <div className={embedded ? "w-full p-4 sm:p-6 space-y-6" : "flex-1 overflow-auto p-6 space-y-6"}>
          {/* Banners */}
          {!isGrainDetailsFilled && (
            <div
              className="rounded-[14px] border ios-hairline px-4 py-3 flex items-center gap-3"
              style={{ background: "hsl(var(--accent) / 0.08)", color: "hsl(var(--accent))" }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <div className="text-[13px] font-medium">
                Grain details not filled — go back and complete the setup before starting.
              </div>
            </div>
          )}
          {error && (
            <div
              className="rounded-[14px] border ios-hairline px-4 py-3 flex items-center gap-3"
              style={{ background: "hsl(var(--ios-red) / 0.08)", color: "hsl(var(--ios-red))" }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <div className="text-[13px] font-medium">{error}</div>
            </div>
          )}

          {/* Sample / Trial progress — clearly visible counter so user can
              see incrementing after each Complete Sample. */}
          <div className="flex items-center justify-between gap-4 flex-wrap rounded-[18px] border ios-hairline ios-raised px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="text-[11px] uppercase tracking-[0.18em] font-semibold ios-text-tertiary">
                {getTrialDisplayLabel()}
              </div>
              <div className="text-[28px] font-bold ios-text leading-none tabular tracking-tight">
                {currentSample}
                <span className="text-[16px] font-semibold ios-text-secondary"> / {totalSamplesCount}</span>
              </div>
              {completedSamples.includes(currentSample) && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--ios-green) / 0.15)", color: "hsl(var(--ios-green))" }}>
                  Completed
                </span>
              )}
              {isAnalysisRunning && !isPaused && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))" }}>
                  Analyzing
                </span>
              )}
              {isSampleStopped && !isAnalysisRunning && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--ios-orange) / 0.15)", color: "hsl(var(--ios-orange))" }}>
                  Stopped — Complete to advance
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalSamplesCount }).map((_, i) => {
                const num = i + 1;
                const done = completedSamples.includes(num);
                const current = num === currentSample;
                return (
                  <span
                    key={num}
                    className="w-2.5 h-2.5 rounded-full transition-colors"
                    style={{
                      background: done
                        ? "hsl(var(--ios-green))"
                        : current
                          ? "hsl(var(--accent))"
                          : "hsl(var(--ios-separator))",
                    }}
                    title={`${getTrialDisplayLabel()} ${num}${done ? " — completed" : current ? " — current" : ""}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Identity strip */}
          <LiveStatHeader
            modeId={grainFormData?.customId}
            variety={grainFormData?.variety}
            process={grainFormData?.process}
            isRunning={isAnalysisRunning}
            isPaused={isPaused}
            totalGrains={totalGrainsValue}
            elapsedSec={elapsedTime}
          />

          {isSampleStopped && !isAnalysisRunning && !completedSamples.includes(currentSample) && (
            <div className="rounded-[18px] border ios-hairline p-4 bg-yellow-50 text-amber-900 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold">Sample stopped</p>
                  <p className="text-sm text-amber-900/80">Click Complete Sample to save this trial and continue to the next sample, or Restart Sample to try again.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleCompleteSample} className="bg-rice-primary text-white">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Sample
                </Button>
                <Button onClick={handleRestartSample} className="bg-yellow-500 text-white hover:bg-yellow-600">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restart Sample
                </Button>
              </div>
            </div>
          )}

          {allAnalysisDone && !isAnalysisRunning && (
            <div className="rounded-[18px] border ios-hairline p-4 bg-emerald-50 text-emerald-900 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">All analysis complete</p>
                <p className="text-sm text-emerald-900/80">Results are ready. Tap the Proceed button below to go to Insights & Reports.</p>
              </div>
            </div>
          )}

          {/* Controls bar — top of page, sticky under the topbar so it stays reachable while scrolling */}
          <div
            className="ios-surface border ios-hairline rounded-[18px] p-4 sticky top-2 z-20"
            style={{ backdropFilter: "blur(12px)" }}
          >
            <LivePillControls
              isRunning={isAnalysisRunning}
              isPaused={isPaused}
              isLoading={isLoading}
              operationType={operationType}
              canStart={canStartCurrentSample && isGrainDetailsFilled}
              canStop={isAnalysisRunning}
              canPause={isAnalysisRunning}
              showPercent={showPercentage}
              showRestart={isAnalysisRunning}
              showSkip={isAnalysisRunning}
              showComplete={showCompleteButton}
              onStartStop={handleStartStop}
              onTogglePause={togglePause}
              onRestart={handleRestartSample}
              onSkip={handleSkipSample}
              onComplete={() => {
                if (allAnalysisDone) {
                  transitionTriggeredRef.current = true;
                  onCompleteRef.current?.();
                } else {
                  handleCompleteSample();
                }
              }}
              onTogglePercent={() => setShowPercentage((p) => !p)}
            />
          </div>

          {/* Hero row: camera + grain wall | multi-ring composite */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="space-y-5">
              <LiveCameraDock
                videoRef={setWebrtcVideoRef}
                webrtcConnected={webrtcConnected}
                webrtcError={webrtcError}
                cameraFps={cameraFps}
                detectionsPerFrame={detectionsPerFrame}
                isFullscreen={isFullscreen}
                videoZoom={videoZoom}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onZoomReset={resetZoom}
                onFullscreenToggle={toggleFullscreen}
              />
              {/* Bühler-style scrolling grain wall */}
              <GrainWall counts={wallCounts} />
            </div>

            <div className="ios-surface border ios-hairline rounded-[18px] p-5 flex flex-col items-center gap-6">
              {/* Apple Health-style 3-ring composite */}
              <MultiRingComposite rings={composite} initialFeatured={0} />

              {/* Tap-to-feature mini ring strip for all 7 metrics */}
              <div className="w-full">
                <div className="text-[10px] uppercase tracking-[0.16em] font-semibold ios-text-tertiary mb-2 text-center">
                  All metrics
                </div>
                <LiveMiniRingStrip
                  metrics={ringMetrics}
                  activeIndex={iosFeaturedRingIdx}
                  onSelect={setIosFeaturedRingIdx}
                  showPercent={showPercentage}
                />
              </div>
            </div>
          </div>

          {/* Detailed metrics */}
          <LiveDetailedAccordion metrics={getAllMetrics} showPercent={showPercentage} />
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "w-full" : "flex-1 flex flex-col overflow-hidden"}>
      {!embedded && (
        <PageHeader
          title="Live Detection & Analysis"
          subtitle="Real-time rice grain quality analysis"
        />
      )}

      {/* iOS-only summary banner — additive, returns null on classic theme */}
      <LiveAnalysisHeroIOS
        isRunning={isAnalysisRunning}
        isPaused={isPaused}
        totalGrains={calculateTotals(metrics).total}
        whitenessIndex={metrics.qualityIndices?.whitenessIndex}
        headRicePercent={gaugeValues.headRice}
        brokenPercent={gaugeValues.broken}
        cameraFps={cameraFps}
        detectionsPerFrame={detectionsPerFrame}
        webrtcConnected={webrtcConnected}
        socketConnected={wsConnected}
      />

      <div className={embedded ? "w-full" : "flex-1 overflow-auto p-6"}>
        <div className={embedded ? "w-full space-y-6" : "max-w-7xl mx-auto space-y-6"}>
          {/* Show small popup message if grain details are not filled */}
          {!isGrainDetailsFilled && (
            <div className="bg-blue-50 border-l-4 border-rice-primary p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-rice-primary" />
                  <p className="text-blue-800 text-sm font-medium">
                    Please fill in the grain details before starting live analysis.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/tell-us-about-grain')}
                  size="sm"
                  className="bg-rice-primary hover:bg-rice-primary/90 text-white"
                >
                  Fill Grain Details
                </Button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
                </div>
            </div>
          )}

          {/* TMA No Machines Warning */}
          {isTmaAnalysis && machines.length === 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-yellow-800 font-medium">
                      No machines found for the selected series
                    </p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Please ensure you've selected a series with configured machines in Tell Us About Grain page.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate('/tell-us-about-grain')}
                  size="sm"
                  variant="outline"
                  className="border-yellow-500 text-yellow-700 hover:bg-yellow-100"
                >
                  Go Back
                </Button>
              </div>
            </div>
          )}


          {/* Sample Information - Moved to Top - Only show if grain details are filled and it's TMA */}
          {isGrainDetailsFilled && isTmaEnabled() && !analysisData?.isProductionSeries && (
              <Card className="animate-fade-in">
                <CardHeader>
              <CardTitle className="text-rice-primary">
                {isTmaEnabled()
                  ? `${machines[currentMachineIndex] || analysisData?.machineName || 'Machine'} — ${analysisData?.isProductionSeries ? 'Trial' : 'Sample'} ${currentSample} Information`
                  : `Sample ${currentSample} Information`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-600">Sample ID:</span>
                  <p className="font-medium">
                    {(() => {
                      // Check if documents have been created yet
                      // If there's a pending config, documents haven't been created, so show "-"
                      const pendingConfigStr = sessionStorage.getItem('pending_analysis_config');
                      
                      if (pendingConfigStr) {
                        // Documents not created yet - show "-" instead of old modeId
                        console.log('🔍 Sample ID: Documents not created yet, showing "-"');
                        return '-';
                      }
                      
                      // Documents have been created - try multiple sources for modeID
                      const modeId = sessionStorage.getItem('mode_id') ||
                                    sessionStorage.getItem('tma_mode_id') ||
                                    analysisData?.modeId ||
                                    grainFormData?.customId ||
                                    currentBatch?.modeId ||
                                    null;
                      
                      console.log('🔍 Sample ID Debug:');
                      console.log('  - analysisData?.modeId:', analysisData?.modeId);
                      console.log('  - grainFormData?.customId:', grainFormData?.customId);
                      console.log('  - currentBatch?.modeId:', currentBatch?.modeId);
                      console.log('  - sessionStorage tma_mode_id:', sessionStorage.getItem('tma_mode_id'));
                      console.log('  - sessionStorage mode_id:', sessionStorage.getItem('mode_id'));
                      console.log('  - Final modeId:', modeId);
                      console.log('  - isTmaEnabled():', isTmaEnabled());
                      console.log('  - currentSample:', currentSample);
                      
                      // If no modeId found, show "-" instead of "default"
                      return modeId || '-';
                    })()}
                  </p>
                          </div>
                {isTmaEnabled() && (
                  <div>
                    <span className="font-semibold text-gray-600">Machine:</span>
                    <p className="font-medium">{machines[currentMachineIndex]}</p>
                        </div>
                )}
                <div>
                  <span className="font-semibold text-gray-600">Weight:</span>
                  <p className="font-medium">
                    {analysisData?.sampleWeight ? `${analysisData.sampleWeight} g` : 'Not entered'}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">Status:</span>
                  <p className={`font-medium ${
                    completedSamples.includes(currentSample) ? 'text-rice-secondary' : 
                    isAnalysisRunning ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {completedSamples.includes(currentSample) ? 'Completed' : 
                     isAnalysisRunning ? 'Analyzing' : 'Pending'}
                  </p>
                              </div>
                <div>
                  <span className="font-semibold text-gray-600">Variety:</span>
                  <p className="font-medium">{analysisData?.variety?.toUpperCase() || grainFormData?.variety?.toUpperCase() || 'BASMATI'}</p>
                            </div>
                <div>
                  <span className="font-semibold text-gray-600">Process:</span>
                  <p className="font-medium">{analysisData?.process || grainFormData?.process || 'Raw'}</p>
                                </div>
                              </div>

              {/* Progress Summary */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-gray-600">
                    {isTmaEnabled() ? 'Current Machine Progress:' : 'Overall Progress:'}
                                    </span>
                  <div className="flex space-x-4">
                    {sampleArray.map((num) => (
                      <div key={num} className="flex items-center space-x-1">
                        <span className={`text-xs ${
                          completedSamples.includes(num) ? 'text-rice-secondary' : 
                          num === currentSample ? 'text-rice-primary' : 'text-gray-400'
                        }`}>
                          {analysisData?.isProductionSeries ? 'T' : 'S'}{num}
                        </span>
                        {completedSamples.includes(num) ? (
                          <CheckCircle className="w-3 h-3 text-rice-secondary" />
                        ) : num === currentSample ? (
                          <Circle className="w-3 h-3 text-rice-primary" />
                        ) : (
                          <Circle className="w-3 h-3 text-gray-300" />
                        )}
                  </div>
                                ))}
                              </div>
                                    </div>
                
                {isTmaEnabled() && (
                  <div className="flex justify-between items-center text-sm mt-2">
                    <span className="font-semibold text-gray-600">Machine Progress:</span>
                    <div className="flex space-x-2">
                      {machines.map((machine: string, index: number) => (
                        <div key={machine} className="flex items-center space-x-1">
                          <span className={`text-xs ${
                            completedMachines.includes(machine) ? 'text-rice-secondary' : 
                            index === currentMachineIndex ? 'text-rice-primary' : 'text-gray-400'
                          }`}>
                            {machine.split(' ')[0]}
                          </span>
                          {completedMachines.includes(machine) ? (
                            <CheckCircle className="w-3 h-3 text-rice-secondary" />
                          ) : index === currentMachineIndex ? (
                            <Circle className="w-3 h-3 text-rice-primary" />
                          ) : (
                            <Circle className="w-3 h-3 text-gray-300" />
                          )}
                            </div>
                      ))}
                                  </div>
                                    </div>
                        )}
                                  </div>
                                </CardContent>
                              </Card>
          )}

          {/* Top Section: Progression */}
          <div className="w-full space-y-6">
            {/* Progression (Full width) */}
            <div className="w-full space-y-6">
              {/* Conditional Rendering: TMA Analysis vs Regular Analysis */}
              {isTmaEnabled() ? (
            analysisData?.isProductionSeries ? (
              /* Production Series - Machine Bar + Sample Analysis Progression */
              <Card className="animate-fade-in">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <CardTitle className="text-rice-primary">Sample Analysis Progression</CardTitle>
                    {/* Machine Tabs - showing all machines in series */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {seriesMachinesList.map((machine: string, index: number) => {
                        const isCompleted = index < currentSeriesMachineIndex;
                        const isCurrent = index === currentSeriesMachineIndex;
                        return (
                          <div
                            key={machine}
                            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                              isCurrent
                                ? 'bg-rice-primary text-white'
                                : isCompleted
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-200 text-gray-500'
                            }`}
                          >
                            {machine}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Sample Information & Progress Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg text-sm border border-gray-100">
                      <div>
                        <span className="font-semibold text-gray-600 block mb-1">Sample ID</span>
                        <span className="font-medium">
                          {(() => {
                            const pendingConfigStr = sessionStorage.getItem('pending_analysis_config');
                            if (pendingConfigStr) return '-';
                            const modeId = sessionStorage.getItem('mode_id') || analysisData?.modeId || grainFormData?.customId || currentBatch?.modeId || null;
                            return modeId || '-';
                          })()}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-600 block mb-1">Variety & Process</span>
                        <span className="font-medium">
                          {analysisData?.variety?.toUpperCase() || grainFormData?.variety?.toUpperCase() || 'BASMATI'} · {analysisData?.process || grainFormData?.process || 'Raw'}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-600 block mb-1">Weight</span>
                        <span className="font-medium">
                          {analysisData?.sampleWeight ? `${analysisData.sampleWeight} g` : 'Not entered'}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-600 block mb-1">Progress ({completedSamples.length}/{totalSamplesCount})</span>
                        <Progress value={(completedSamples.length / totalSamplesCount) * 100} className="h-2 mt-2" />
                      </div>
                    </div>

                    {/* Sample Steps - Tab Style Navigation */}
                    <div className="flex border-b border-gray-200 overflow-x-auto">
                      {sampleArray.map((sampleNum) => {
                        const isCompleted = completedSamples.includes(sampleNum);
                        const isCurrent = currentSample === sampleNum;

                        return (
                          <div
                            key={sampleNum}
                            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 flex items-center space-x-2 whitespace-nowrap ${
                              isCurrent
                                ? 'border-rice-primary text-rice-primary bg-rice-secondary/30'
                                : isCompleted
                                  ? 'border-transparent text-rice-secondary bg-rice-secondary/10'
                                  : 'border-transparent text-gray-400 opacity-60'
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle className="w-4 h-4 text-rice-secondary" />
                            ) : (
                              <Circle className={`w-4 h-4 ${isCurrent ? 'text-rice-primary' : 'text-gray-400'}`} />
                            )}
                            <span>Sample {sampleNum}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Analysis Controls */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pt-4 mt-4 border-t">
                      <div className="flex items-center space-x-4 flex-wrap">
                        <Button
                          onClick={handleStartStop}
                          disabled={(isStartLoading || isStopLoading) || (!isContainerReady && !isAnalysisRunning) || (!isGrainDetailsFilled || (!canStartCurrentSample && !isAnalysisRunning)) || (!isAnalysisRunning && completedSamples.length >= totalSamplesCount) || isSampleStopped}
                          className={`${
                            isAnalysisRunning
                              ? 'bg-rice-secondary hover:bg-rice-secondary/90 text-rice-primary'
                              : (!isAnalysisRunning && completedSamples.length >= totalSamplesCount)
                                ? 'bg-gray-400 text-white cursor-not-allowed'
                              : (isContainerReady && isGrainDetailsFilled && canStartCurrentSample)
                                ? 'bg-rice-primary hover:bg-rice-primary/90 text-white'
                                : 'bg-gray-400 text-white cursor-not-allowed'
                          } px-6 py-3 font-semibold`}
                        >
                          {isStartLoading ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Initializing...
                            </>
                          ) : isStopLoading ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Stopping...
                            </>
                          ) : isAnalysisRunning ? (
                            <>
                              <Square className="w-5 h-5 mr-2" />
                              Stop Analysis
                            </>
                          ) : (!isAnalysisRunning && completedSamples.length >= totalSamplesCount) ? (
                            <>
                              <CheckCircle className="w-5 h-5 mr-2" />
                              All Samples Done
                            </>
                          ) : !isContainerReady ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Setting Up...
                            </>
                          ) : (
                            <>
                              <Play className="w-5 h-5 mr-2" />
                              Start Analysis
                            </>
                          )}
                        </Button>
                        {/* Pause/Resume Button */}
                        {isAnalysisRunning && !isStopLoading && (
                          <Button
                            onClick={togglePause}
                            className={`${
                              isPaused
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            } px-6 py-3 font-semibold`}
                          >
                            {isPaused ? (
                              <>
                                <Play className="w-5 h-5 mr-2" />
                                Resume
                              </>
                            ) : (
                              <>
                                <Pause className="w-5 h-5 mr-2" />
                                Pause
                              </>
                            )}
                          </Button>
                        )}
                        {isSampleStopped && !isAnalysisRunning && !completedSamples.includes(currentSample) && (
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={handleRestartSample}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Restart Sample
                            </Button>
                            <Button
                              onClick={handleCompleteSample}
                              className="bg-rice-primary hover:bg-rice-primary/90 text-white font-semibold"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Complete Sample
                            </Button>
                          </div>
                        )}
                        {!isAnalysisRunning && !isSampleStopped && !completedSamples.includes(currentSample) && completedSamples.length < totalSamplesCount && (
                          <Button
                            onClick={handleSkipSample}
                            variant="outline"
                            className="text-gray-600 hover:text-gray-800 font-semibold"
                          >
                            <SkipForward className="w-4 h-4 mr-2" />
                            Skip
                          </Button>
                        )}
                        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                          isPaused && isAnalysisRunning ? 'bg-amber-100' :
                          isAnalysisRunning ? 'bg-blue-100' :
                          !isContainerReady ? 'bg-yellow-100' :
                          (!canStartCurrentSample && !completedSamples.includes(currentSample)) ? 'bg-red-50' : 'bg-gray-100'
                        }`}>
                          <div className={`w-3 h-3 rounded-full ${
                            isPaused && isAnalysisRunning ? 'bg-amber-500' :
                            isAnalysisRunning ? 'bg-blue-500 animate-pulse' :
                            !isContainerReady ? 'bg-yellow-500 animate-pulse' :
                            (!canStartCurrentSample && !completedSamples.includes(currentSample)) ? 'bg-red-400' : 'bg-gray-500'
                          }`}></div>
                          <span className={`text-sm font-medium ${
                            isPaused && isAnalysisRunning ? 'text-amber-700' :
                            isAnalysisRunning ? 'text-blue-700' :
                            !isContainerReady ? 'text-yellow-700' :
                            (!canStartCurrentSample && !completedSamples.includes(currentSample) && isContainerReady) ? 'text-red-600' : ''
                          }`}>
                            {isPaused && isAnalysisRunning ? `Paused - Sample ${currentSample}` :
                             isAnalysisRunning ? `Analyzing Sample ${currentSample}` :
                             !isContainerReady ? 'Initializing...' :
                             (!canStartCurrentSample && !completedSamples.includes(currentSample)) ? 'Invalid parameters' : 'Ready'}
                          </span>
                        </div>

                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 sm:mt-0">
                        {/* Metric Toggle */}
                        <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 bg-gray-50 p-2 sm:p-3 lg:p-4 rounded-lg">
                          <BarChart3 className={`w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ${!showPercentage ? 'text-rice-primary' : 'text-gray-400'}`} />
                          <Switch
                            checked={showPercentage}
                            onCheckedChange={setShowPercentage}
                            className="scale-90 sm:scale-100 lg:scale-110"
                          />
                          <Percent className={`w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ${showPercentage ? 'text-rice-primary' : 'text-gray-400'}`} />
                          <span className="text-xs sm:text-sm lg:text-base font-medium text-gray-700">
                            {showPercentage ? 'Percentage' : 'Count'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Machine Complete Status */}
                    {completedSamples.length === totalSamplesCount && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <div>
                            <span className="text-green-700 font-semibold block">Machine Analysis Complete</span>
                            <p className="text-xs text-green-600">All {totalSamplesCount} trial(s) for {machines[currentMachineIndex] || analysisData?.machineName} finished.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
            /* Original TMA Analysis - Machine Accordion (for non-production TMA) */
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-rice-primary">
                  <Settings className="w-6 h-6" />
                  <span>TMA Analysis - Machine Progression</span>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Complete {totalSamplesCount} samples for each machine - Machine {currentMachineIndex + 1} of {machines.length}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Overall Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium text-gray-600">
                      <span>Overall Progress</span>
                      <span>{completedMachines.length}/{machines.length} Machines Complete</span>
                    </div>
                    <Progress value={(completedMachines.length / machines.length) * 100} className="h-3" />
                  </div>

                  {/* Machine Accordion */}
                  <Accordion 
                    type="single" 
                    value={accordionValue} 
                    onValueChange={setAccordionValue}
                    className="w-full"
                  >
                    {machines.map((machine: string, index: number) => {
                      const isCompleted = completedMachines.includes(machine);
                      const isCurrent = index === currentMachineIndex;
                      // Machine is accessible if:
                      // 1. It's a completed machine, OR
                      // 2. It's the current machine, OR
                      // 3. It's the next machine in sequence (for progression)
                      const isAccessible = isCompleted || isCurrent || index === currentMachineIndex + 1;
                      
                      return (
                        <AccordionItem 
                          key={machine} 
                          value={machine}
                          className={`border rounded-lg mb-2 ${
                            isCompleted ? 'border-green-500 bg-green-50' : 
                            isCurrent ? 'border-rice-primary bg-rice-secondary' : 
                            'border-gray-200'
                          }`}
                        >
                          <AccordionTrigger 
                            className={`px-4 hover:no-underline ${
                              !isAccessible ? 'cursor-not-allowed opacity-60' : ''
                            }`}
                            disabled={!isAccessible}
                          >
                            <div className="flex items-center space-x-3">
                              {isCompleted ? (
                                <CheckCircle className="w-5 h-5 text-rice-secondary" />
                              ) : isCurrent ? (
                                <Circle className="w-5 h-5 text-rice-primary" />
                              ) : (
                                <Circle className="w-5 h-5 text-gray-400" />
                              )}
                              <span className={`font-semibold ${
                                isCompleted ? 'text-rice-secondary' : 
                                isCurrent ? 'text-rice-primary' : 'text-gray-600'
                              }`}>
                                {machine}
                              </span>
                              {isCompleted && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                  Completed
                                </span>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            {isCurrent && (
                              <div className="space-y-6">
                                {/* Sample Progress for Current Machine */}
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm font-medium text-gray-600">
                                    <span>Sample Progress</span>
                                    <span>{completedSamples.length}/{totalSamplesCount} Samples Complete</span>
                                  </div>
                                  <Progress value={(completedSamples.length / totalSamplesCount) * 100} className="h-2" />
                                </div>

                                {/* Sample Steps - Professional Compact UI */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {sampleArray.map((sampleNum) => {
                                    const isCompleted = completedSamples.includes(sampleNum);
                                    const isCurrent = currentSample === sampleNum;
                                    const isAccessible = sampleNum <= currentSample;

                                    return (
                                      <div
                                        key={sampleNum}
                                        className={`p-3 rounded-lg border transition-all duration-200 ${
                                          isCompleted
                                            ? 'border-green-400 bg-green-50'
                                            : isCurrent
                                              ? 'border-rice-primary bg-rice-secondary'
                                              : isAccessible
                                                ? 'border-gray-300 bg-gray-50'
                                                : 'border-gray-200 bg-gray-100 opacity-60'
                                        }`}
                                      >
                                        {/* Sample Header */}
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-2">
                                            {isCompleted ? (
                                              <CheckCircle className="w-4 h-4 text-rice-secondary" />
                                            ) : (
                                              <Circle className={`w-4 h-4 ${isCurrent ? 'text-rice-primary' : 'text-gray-400'}`} />
                                            )}
                                            <span className={`text-sm font-semibold ${
                                              isCompleted ? 'text-rice-secondary' : isCurrent ? 'text-rice-primary' : 'text-gray-600'
                                            }`}>
                                              Sample {sampleNum}
                                            </span>
                                          </div>
                                          {isCompleted && (
                                            <span className="text-xs text-rice-secondary font-medium">
                                              {analysisData?.sampleWeight || '50'} g
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Analysis Controls */}
                                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-4 flex-wrap">
                      <Button
                        onClick={handleStartStop}
                        disabled={(isStartLoading || isStopLoading) || (!isContainerReady && !isAnalysisRunning) || (!isGrainDetailsFilled || (!canStartCurrentSample && !isAnalysisRunning)) || (!isAnalysisRunning && completedSamples.length >= totalSamplesCount) || isSampleStopped}
                        className={`${
                          isAnalysisRunning
                            ? 'bg-rice-secondary hover:bg-rice-secondary/90 text-rice-primary'
                            : (!isAnalysisRunning && completedSamples.length >= totalSamplesCount)
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                            : (isContainerReady && isGrainDetailsFilled && canStartCurrentSample)
                              ? 'bg-rice-primary hover:bg-rice-primary/90 text-white'
                              : 'bg-gray-400 text-white cursor-not-allowed'
                        } px-4 py-2 font-semibold`}
                      >
                        {isStartLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Initializing...
                          </>
                        ) : isStopLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Stopping...
                          </>
                        ) : isAnalysisRunning ? (
                          <>
                            <Square className="w-4 h-4 mr-2" />
                            Stop
                          </>
                        ) : (!isAnalysisRunning && completedSamples.length >= totalSamplesCount) ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Done
                          </>
                        ) : !isContainerReady ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Setting Up...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Start
                          </>
                        )}
                      </Button>
                      {/* Pause/Resume Button - only visible when analysis is running */}
                      {isAnalysisRunning && !isStopLoading && (
                        <Button
                          onClick={togglePause}
                          className={`${
                            isPaused
                              ? 'bg-green-500 hover:bg-green-600 text-white'
                              : 'bg-amber-500 hover:bg-amber-600 text-white'
                          } px-4 py-2 font-semibold`}
                        >
                          {isPaused ? (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Resume
                            </>
                          ) : (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              Pause
                            </>
                          )}
                        </Button>
                      )}
                      {isSampleStopped && !isAnalysisRunning && !completedSamples.includes(currentSample) && (
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={handleRestartSample}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restart Sample
                          </Button>
                          <Button
                            onClick={handleCompleteSample}
                            className="bg-rice-primary hover:bg-rice-primary/90 text-white font-semibold"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Complete Sample
                          </Button>
                        </div>
                      )}
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                    isPaused && isAnalysisRunning ? 'bg-amber-100' :
                    isAnalysisRunning ? 'bg-blue-100' :
                    !isContainerReady ? 'bg-yellow-100' :
                    (!canStartCurrentSample && !completedSamples.includes(currentSample)) ? 'bg-red-50' : 'bg-gray-100'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      isPaused && isAnalysisRunning ? 'bg-amber-500' :
                      isAnalysisRunning ? 'bg-blue-500 animate-pulse' :
                      !isContainerReady ? 'bg-yellow-500 animate-pulse' :
                      (!canStartCurrentSample && !completedSamples.includes(currentSample)) ? 'bg-red-400' : 'bg-gray-500'
                    }`}></div>
                    <span className={`text-xs font-medium ${
                      isPaused && isAnalysisRunning ? 'text-amber-700' :
                      isAnalysisRunning ? 'text-blue-700' :
                      !isContainerReady ? 'text-yellow-700' :
                      (!canStartCurrentSample && !completedSamples.includes(currentSample) && isContainerReady) ? 'text-red-600' : ''
                    }`}>
                      {isPaused && isAnalysisRunning ? `Paused - ${machine} - Sample ${currentSample}` :
                       isAnalysisRunning ? `Analyzing ${machine} - Sample ${currentSample}` :
                       !isContainerReady ? 'Initializing...' :
                       (!canStartCurrentSample && !completedSamples.includes(currentSample)) ? 'Invalid parameters' : 'Ready'}
                    </span>
                  </div>

              </div>

                                  {/* Metric Toggle */}
                    <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 bg-gray-50 p-2 sm:p-3 lg:p-4 rounded-lg">
                                    <BarChart3 className={`w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ${!showPercentage ? 'text-rice-primary' : 'text-gray-400'}`} />
                      <Switch 
                        checked={showPercentage}
                        onCheckedChange={setShowPercentage}
                        className="scale-90 sm:scale-100 lg:scale-110"
                      />
                                    <Percent className={`w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ${showPercentage ? 'text-rice-primary' : 'text-gray-400'}`} />
                                    <span className="text-xs sm:text-sm lg:text-base font-medium text-gray-700">
                                      {showPercentage ? 'Percentage' : 'Count'}
                      </span>
                    </div>
                                </div>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
                {/* Proceed to Reports - shown after all machines complete */}
                {allAnalysisDone && (
                  <div className="p-4">
                    <Button
                      onClick={() => onCompleteRef.current?.()}
                      className="w-full bg-rice-primary text-white hover:bg-rice-primary/90 font-semibold text-base py-6 shadow-md animate-pulse"
                      size="lg"
                    >
                      All Machines Complete - Proceed to Insights & Reports
                    </Button>
                  </div>
                )}
                </CardContent>
              </Card>
            )
          ) : (
            /* Regular Analysis - Sample Progression */
                  <Card className="animate-fade-in">
                    <CardHeader>
                <CardTitle className="text-rice-primary">Sample Analysis Progression</CardTitle>
                {/* <p className="text-sm text-gray-600">Complete samples in sequence - Sample {currentSample} of {totalSamplesCount}</p> */}
                    </CardHeader>
                    <CardContent>
                <div className="space-y-6">
                  {/* Unified Sample Information & Progress */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg text-sm border border-gray-100">
                    <div>
                      <span className="font-semibold text-gray-600 block mb-1">Sample ID</span>
                      <span className="font-medium">
                        {(() => {
                          const pendingConfigStr = sessionStorage.getItem('pending_analysis_config');
                          if (pendingConfigStr) return '-';
                          const modeId = sessionStorage.getItem('mode_id') || analysisData?.modeId || grainFormData?.customId || currentBatch?.modeId || null;
                          return modeId || '-';
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600 block mb-1">Variety & Process</span>
                      <span className="font-medium">
                        {analysisData?.variety?.toUpperCase() || grainFormData?.variety?.toUpperCase() || 'BASMATI'} · {analysisData?.process || grainFormData?.process || 'Raw'}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600 block mb-1">Weight</span>
                      <span className="font-medium">
                        {analysisData?.sampleWeight ? `${analysisData.sampleWeight} g` : 'Not entered'}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600 block mb-1">Progress ({completedSamples.length}/{totalSamplesCount})</span>
                      <Progress value={(completedSamples.length / totalSamplesCount) * 100} className="h-2 mt-2" />
                    </div>
                  </div>
                        
                  {/* Sample Steps - Professional Compact UI */}
                  <div className="flex border-b border-gray-200 overflow-x-auto">
                    {sampleArray.map((sampleNum) => {
                      const isCompleted = completedSamples.includes(sampleNum);
                      const isCurrent = currentSample === sampleNum;
                      
                      return (
                        <div
                          key={sampleNum}
                          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 flex items-center space-x-2 whitespace-nowrap ${
                            isCurrent
                              ? 'border-rice-primary text-rice-primary bg-rice-secondary/30'
                              : isCompleted
                                ? 'border-transparent text-rice-secondary bg-rice-secondary/10'
                                : 'border-transparent text-gray-400 opacity-60'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 text-rice-secondary" />
                          ) : (
                            <Circle className={`w-4 h-4 ${isCurrent ? 'text-rice-primary' : 'text-gray-400'}`} />
                          )}
                          <span>Sample {sampleNum}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Analysis Controls for Current Sample */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pt-4 mt-4 border-t">
                    <div className="flex items-center space-x-4 flex-wrap">
                      <Button
                        onClick={handleStartStop}
                        disabled={(isStartLoading || isStopLoading) || (!isContainerReady && !isAnalysisRunning) || (!isGrainDetailsFilled || (!canStartCurrentSample && !isAnalysisRunning)) || (!isAnalysisRunning && completedSamples.length >= totalSamplesCount) || isSampleStopped}
                        className={`${
                          isAnalysisRunning
                            ? 'bg-rice-secondary hover:bg-rice-secondary/90 text-rice-primary'
                            : (!isAnalysisRunning && completedSamples.length >= totalSamplesCount)
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                            : (isContainerReady && isGrainDetailsFilled && canStartCurrentSample)
                              ? 'bg-rice-primary hover:bg-rice-primary/90 text-white'
                              : 'bg-gray-400 text-white cursor-not-allowed'
                        } px-6 py-3 font-semibold`}
                      >
                        {isStartLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Initializing...
                          </>
                        ) : isStopLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Stopping...
                          </>
                        ) : isAnalysisRunning ? (
                          <>
                            <Square className="w-5 h-5 mr-2" />
                            Stop Analysis
                          </>
                        ) : (!isAnalysisRunning && completedSamples.length >= totalSamplesCount) ? (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            All Samples Done
                          </>
                        ) : !isContainerReady ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Setting Up...
                          </>
                        ) : (
                          <>
                            <Play className="w-5 h-5 mr-2" />
                            Start Analysis
                          </>
                        )}
                      </Button>
                      {/* Pause/Resume Button - only visible when analysis is running */}
                      {isAnalysisRunning && !isStopLoading && (
                        <Button
                          onClick={togglePause}
                          className={`${
                            isPaused
                              ? 'bg-green-500 hover:bg-green-600 text-white'
                              : 'bg-amber-500 hover:bg-amber-600 text-white'
                          } px-6 py-3 font-semibold`}
                        >
                          {isPaused ? (
                            <>
                              <Play className="w-5 h-5 mr-2" />
                              Resume
                            </>
                          ) : (
                            <>
                              <Pause className="w-5 h-5 mr-2" />
                              Pause
                            </>
                          )}
                        </Button>
                      )}
                      {isSampleStopped && !isAnalysisRunning && !completedSamples.includes(currentSample) && (
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={handleRestartSample}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restart Sample
                          </Button>
                          <Button
                            onClick={handleCompleteSample}
                            className="bg-rice-primary hover:bg-rice-primary/90 text-white font-semibold"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Complete Sample
                          </Button>
                        </div>
                      )}
                      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                        isPaused && isAnalysisRunning ? 'bg-amber-100' :
                        isAnalysisRunning ? 'bg-blue-100' :
                        !isContainerReady ? 'bg-yellow-100' :
                        (!canStartCurrentSample && !completedSamples.includes(currentSample)) ? 'bg-red-50' : 'bg-gray-100'
                      }`}>
                        <div className={`w-3 h-3 rounded-full ${
                          isPaused && isAnalysisRunning ? 'bg-amber-500' :
                          isAnalysisRunning ? 'bg-blue-500 animate-pulse' :
                          !isContainerReady ? 'bg-yellow-500 animate-pulse' :
                          (!canStartCurrentSample && !completedSamples.includes(currentSample)) ? 'bg-red-400' : 'bg-gray-500'
                        }`}></div>
                        <span className={`text-sm font-medium ${
                          isPaused && isAnalysisRunning ? 'text-amber-700' :
                          isAnalysisRunning ? 'text-blue-700' :
                          !isContainerReady ? 'text-yellow-700' :
                          (!canStartCurrentSample && !completedSamples.includes(currentSample) && isContainerReady) ? 'text-red-600' : ''
                        }`}>
                          {isPaused && isAnalysisRunning ? `Paused - Sample ${currentSample}` :
                           isAnalysisRunning ? `Analyzing Sample ${currentSample}` :
                           !isContainerReady ? 'Initializing...' :
                           (!canStartCurrentSample && !completedSamples.includes(currentSample)) ? 'Invalid parameters' : 'Ready'}
                        </span>
                      </div>

                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 sm:mt-0">
                      {/* Metric Toggle */}
                      <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 bg-gray-50 p-2 sm:p-3 lg:p-4 rounded-lg">
                        <BarChart3 className={`w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ${!showPercentage ? 'text-rice-primary' : 'text-gray-400'}`} />
                        <Switch 
                          checked={showPercentage}
                          onCheckedChange={setShowPercentage}
                          className="scale-90 sm:scale-100 lg:scale-110"
                        />
                        <Percent className={`w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ${showPercentage ? 'text-rice-primary' : 'text-gray-400'}`} />
                        <span className="text-xs sm:text-sm lg:text-base font-medium text-gray-700">
                          {showPercentage ? 'Percentage' : 'Count'}
                        </span>
                      </div>

                      {/* Proceed to Insights & Reports Button */}
                      {((!isTmaEnabled() && completedSamples.length >= totalSamplesCount) || allAnalysisDone) && (
                        <Button
                          onClick={() => onCompleteRef.current?.()}
                          className="bg-rice-primary text-white hover:bg-rice-primary/90 font-semibold shadow-md animate-pulse"
                        >
                          {allAnalysisDone ? 'All Machines Complete - Proceed to Reports' : 'All Trials Complete - Proceed to Reports'}
                        </Button>
                      )}
                    </div>
                  </div>
                  </div>
                </CardContent>
              </Card>
          )}
            </div>

          </div>

          {/* Main Analysis Area */}
          <div className="space-y-6">
            {/* Camera Feed Section with Timer */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch w-full">
              {/* Camera Feed Card - 2/3 width */}
              <div className="lg:col-span-2 min-w-0 flex">
                <Card className="animate-fade-in flex-1 flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-rice-primary">
                      <Camera className="w-6 h-6" />
                      <span>Live Camera Feed</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="relative flex-1">
                      {/* WebRTC Video Element */}
                      <div
                        id="video-container"
                        className={`bg-gray-900 rounded-lg relative overflow-hidden ${
                          isFullscreen
                            ? 'fixed inset-0 z-50 w-screen h-screen rounded-none'
                            : 'w-full mx-auto h-full'
                        }`}
                        style={{
                          aspectRatio: 'auto',
                          minHeight: '280px'
                        }}
                      >
                      {webrtcConnected ? (
                        // WebRTC video stream with zoom support
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{
                            overflow: videoZoom > 1 ? 'auto' : 'hidden',
                            maxHeight: isFullscreen ? '100vh' : '720px'
                          }}
                        >
                          <video
                            ref={(ref) => {
                              setWebrtcVideoRef(ref);
                              // If there's a pending stream, connect it now
                              if (ref && (window as any).pendingWebRTCStream) {
                                (window as any).pendingWebRTCStream(ref);
                                (window as any).pendingWebRTCStream = null;
                              }
                            }}
                            autoPlay
                            playsInline
                            muted
                            className="bg-black transition-transform duration-200 ease-out"
                            style={{
                              width: '100%',
                              height: 'auto',
                              transform: `scale(${videoZoom})`,
                              transformOrigin: 'center center',
                              cursor: videoZoom > 1 ? 'move' : 'default'
                            }}
                            onLoadedData={() => {
                              console.log('WebRTC video stream loaded successfully');
                            }}
                            onError={(e) => {
                              console.log(`WebRTC video stream error: ${e}`);
                            }}
                          />
                        </div>
                      ) : webrtcError ? (
                        // Error state
                        <div className="w-full bg-gradient-to-br from-red-800 to-red-900 flex items-center justify-center rounded-lg" style={{ aspectRatio: '4/3', minHeight: '420px' }} data-placeholder>
                          <div className="text-center text-white">
                            <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 mx-auto mb-3 sm:mb-4 lg:mb-6 opacity-50" />
                            <p className="text-base sm:text-lg lg:text-xl xl:text-2xl font-medium">
                              WebRTC Connection Error
                            </p>
                            <p className="text-sm sm:text-base lg:text-lg xl:text-xl opacity-75 mt-2">
                              {webrtcError}
                            </p>
                            <Button
                              onClick={initializeWebRTC}
                              variant="outline"
                              className="text-white border-white hover:bg-white hover:text-gray-900 mt-4"
                            >
                              Retry Connection
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Placeholder when WebRTC is connecting
                        <div className="w-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center rounded-lg" style={{ aspectRatio: '4/3', minHeight: '420px' }} data-placeholder>
                          <div className="text-center text-white">
                            <Camera className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 mx-auto mb-3 sm:mb-4 lg:mb-6 opacity-50" />
                            <p className="text-base sm:text-lg lg:text-xl xl:text-2xl font-medium">
                              {isAnalysisRunning ? 'Connecting to WebRTC Stream...' : 'Waiting for Analysis to Start...'}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* WebRTC Connection Status Indicator */}
                      <div className="absolute top-2 sm:top-3 lg:top-4 right-2 sm:right-3 lg:right-4">
                        <div className={`w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 rounded-full ${
                          webrtcConnected ? 'bg-green-500' : webrtcError ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></div>
                      </div>

                      {/* WebRTC Stream Indicator */}
                      {webrtcConnected && (
                        <div className="absolute top-2 sm:top-3 lg:top-4 right-6 sm:right-8 lg:right-10 bg-blue-500 text-white px-2 sm:px-3 lg:px-4 py-1 sm:py-2 rounded text-xs sm:text-sm lg:text-base font-semibold">
                          WebRTC Live
                        </div>
                      )}

                      {/* Video Zoom Controls */}
                      {webrtcConnected && (
                        <div className="absolute bottom-2 sm:bottom-3 lg:bottom-4 right-2 sm:right-3 lg:right-4 flex items-center gap-1 sm:gap-2 bg-black/60 rounded-lg p-1 sm:p-2">
                          {/* Zoom Out */}
                          <button
                            onClick={zoomOut}
                            disabled={videoZoom <= 1}
                            className="p-1 sm:p-2 rounded hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Zoom Out"
                          >
                            <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </button>

                          {/* Zoom Level Indicator */}
                          <span className="text-white text-xs sm:text-sm font-medium min-w-[3rem] text-center">
                            {Math.round(videoZoom * 100)}%
                          </span>

                          {/* Zoom In */}
                          <button
                            onClick={zoomIn}
                            disabled={videoZoom >= 3}
                            className="p-1 sm:p-2 rounded hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Zoom In"
                          >
                            <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </button>

                          {/* Reset Zoom (only show when zoomed) */}
                          {videoZoom !== 1 && (
                            <button
                              onClick={resetZoom}
                              className="p-1 sm:p-2 rounded hover:bg-white/20 transition-colors ml-1"
                              title="Reset Zoom"
                            >
                              <span className="text-white text-xs sm:text-sm font-medium">Reset</span>
                            </button>
                          )}

                          {/* Divider */}
                          <div className="w-px h-4 sm:h-5 bg-white/30 mx-1"></div>

                          {/* Fullscreen Toggle */}
                          <button
                            onClick={toggleFullscreen}
                            className="p-1 sm:p-2 rounded hover:bg-white/20 transition-colors"
                            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                          >
                            {isFullscreen ? (
                              <Minimize className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            ) : (
                              <Maximize className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Side: Device Status & Summaries (1/3 width) */}
            <div className="lg:col-span-1 min-w-0 flex flex-col gap-4">
              {/* Grain Analyzer Status */}
              <Card className="animate-fade-in shrink-0 shadow-md w-full border-l-4 border-l-rice-primary">
                <CardHeader className="pt-4 pb-2">
                  <CardTitle className="flex items-center space-x-2 text-rice-primary text-sm">
                    <Settings className="w-4 h-4" />
                    <span>Grain Analyzer Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <span className="font-semibold text-gray-600">Camera</span>
                      {cameraActive === true ? (
                        <span className="font-medium text-green-600 flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          Active
                        </span>
                      ) : cameraActive === false ? (
                        <span className="font-medium text-red-600 flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          Inactive
                        </span>
                      ) : webrtcConnected ? (
                        <span className="font-medium text-green-600 flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          Active
                        </span>
                      ) : webrtcError ? (
                        <span className="font-medium text-red-600 flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          Error
                        </span>
                      ) : (
                        <span className="font-medium text-gray-600 flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                          Standby
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <span className="font-semibold text-gray-600">Grains Per Frame</span>
                      <span className="font-medium">
                        {isAnalysisRunning ? detectionsPerFrame : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-600">Elapsed</span>
                      <span className="font-medium text-rice-primary font-mono">{formatElapsedTime(elapsedTime)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Live Score Gauges */}
              <Card className="animate-fade-in shadow-lg w-full flex-1 min-h-0 flex flex-col">
                <CardContent className="p-2 flex-1 min-h-0 flex flex-col">
                  <div className="grid grid-cols-2 grid-rows-2 flex-1 min-h-0 h-full gap-1">
                    <SemiCircleGauge value={gaugeValues.headRice} count={gaugeCounts.headRice} label="Head Rice" color="#3B82F6" showPercent={showPercentage} />
                    <SemiCircleGauge value={gaugeValues.broken} count={gaugeCounts.broken} label="Brokens" color="#06B6D4" showPercent={showPercentage} />
                    <SemiCircleGauge value={gaugeValues.chalky} count={gaugeCounts.chalky} label="Chalky" color="#F59E0B" showPercent={showPercentage} disabled={!chalkyEnabled} />
                    <SemiCircleGauge value={gaugeValues.rejections} count={gaugeCounts.rejections} label="Rejections" color="#EF4444" showPercent={showPercentage} />
                  </div>
                </CardContent>
              </Card>

                {/* Controls Card - Only for TMA (non-production-series) */}
                {isTmaEnabled() && !analysisData?.isProductionSeries && (
                  <Card className={`animate-fade-in shrink-0 ${
                    completedSamples.length >= totalSamplesCount
                      ? 'border-2 border-green-400 shadow-lg shadow-green-100'
                      : ''
                  }`} style={{ animationDelay: "200ms" }}>
                    <CardHeader>
                      <CardTitle className="text-rice-primary flex items-center justify-between">
                        <span>{machines[currentMachineIndex] || analysisData?.machineName || 'Machine'}</span>
                        <span className="text-sm font-normal text-muted-foreground">
                          Trial {currentSample} of {totalSamplesCount}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Trial Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {sampleArray.map((sampleNum) => {
                              const isCompleted = completedSamples.includes(sampleNum);
                              const isCurrent = currentSample === sampleNum && !isCompleted;
                              return (
                                <div key={sampleNum} className="flex items-center gap-1 flex-1">
                                  <div className={`h-2 flex-1 rounded-full transition-all ${
                                    isCompleted
                                      ? 'bg-green-500'
                                      : isCurrent
                                        ? 'bg-rice-primary animate-pulse'
                                        : 'bg-gray-200'
                                  }`} />
                                  <span className={`text-xs font-medium ${
                                    isCompleted ? 'text-green-600' : isCurrent ? 'text-rice-primary' : 'text-gray-400'
                                  }`}>T{sampleNum}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Machine Complete Banner + Action Button */}
                        {completedSamples.length >= totalSamplesCount && (
                          <div className="space-y-3">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
                              <div className="text-blue-700 font-bold text-lg mb-1">
                                Machine Analysis Complete
                              </div>
                              <p className="text-sm text-blue-600">
                                All {totalSamplesCount} trial(s) for <strong>{machines[currentMachineIndex] || analysisData?.machineName}</strong> finished successfully.
                              </p>
                            </div>
                            {allAnalysisDone && (
                              <Button
                                onClick={() => onCompleteRef.current?.()}
                                className="w-full bg-rice-primary text-white hover:bg-rice-primary/90 font-semibold text-base py-6 shadow-md animate-pulse"
                                size="lg"
                              >
                                Proceed to Insights & Reports
                              </Button>
                            )}
                            {analysisData?.isProductionSeries && !allAnalysisDone && (
                              <Button
                                onClick={() => onCompleteRef.current?.()}
                                className="w-full bg-rice-primary text-white hover:bg-rice-primary/90 font-semibold text-base py-6 shadow-md"
                                size="lg"
                              >
                                Complete Machine & Continue Series
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Status while trials are in progress */}
                        {completedSamples.length < totalSamplesCount && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-700 font-medium">
                              {isAnalysisRunning
                                ? `Analyzing trial ${currentSample} of ${totalSamplesCount}...`
                                : completedSamples.length === 0
                                  ? `Ready to start trial 1 of ${totalSamplesCount}`
                                  : `Trial ${completedSamples.length} complete. Start trial ${currentSample} to continue.`
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Shutdown Status Indicator - removed per user request */}

            {/* Detailed Metrics with Accordion */}
            <div>
              <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
                <CardHeader>
                  <CardTitle className="text-rice-primary">Detailed Metrics - Individual Components</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {`Real-time trend analysis of grain classification over time`}
                  </p>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" defaultValue={["good-rice", "rejections", "foreign-matter", "quality-indices"]} className="w-full">
                      {/* Rice Accordion */}
                      <AccordionItem value="good-rice" className="border rounded-lg mb-2">
                        <AccordionTrigger className="px-4 hover:no-underline">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-lg font-semibold text-green-700">
                              Rice ({totals.goodRice.toFixed(1)}%)
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {getAllMetrics.filter(m => m.category === 'Rice').map((metric, idx) => (
                              <MetricBar key={`good-${idx}`} metric={metric} />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Rejections Accordion */}
                      <AccordionItem value="rejections" className="border rounded-lg mb-2">
                        <AccordionTrigger className="px-4 hover:no-underline">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-lg font-semibold text-red-700">
                              Rejections ({totals.rejections.toFixed(1)}%)
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {getAllMetrics.filter(m => m.category === 'Rejections').map((metric, idx) => (
                              <MetricBar key={`rejections-${idx}`} metric={metric} />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Foreign Matter Accordion */}
                      <AccordionItem value="foreign-matter" className="border rounded-lg mb-2">
                        <AccordionTrigger className="px-4 hover:no-underline">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                            <span className="text-lg font-semibold text-orange-700">
                              Foreign Matter ({totals.foreignMatter.toFixed(1)}%)
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {getAllMetrics.filter(m => m.category === 'Foreign Matter').map((metric, idx) => (
                              <MetricBar key={`foreign-${idx}`} metric={metric} />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Quality & Indices Accordion */}
                      <AccordionItem value="quality-indices" className="border rounded-lg mb-2">
                        <AccordionTrigger className="px-4 hover:no-underline">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-lg font-semibold text-blue-700">
                              Quality & Indices
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {getAllMetrics.filter(m => m.category === 'Quality & Indices').map((metric, idx) => (
                              <MetricBar key={`quality-${idx}`} metric={metric} />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcurementLiveAnalysis;
