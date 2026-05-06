import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { useMachine, DEFAULT_MACHINE_OPTIONS } from "@/contexts/MachineContext";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Monitor, FileText, Globe, Lightbulb, Package, Truck, Factory, Plus, Edit, Trash2, Save, Building2, User, MapPin, ChevronsUpDown, X, Wifi, WifiOff, Play, Activity, Zap, ToggleLeft, AlertTriangle, Loader2, RefreshCw, Ruler, RotateCcw } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type MachineEntryObj = { name: string; machineNumber?: string; machineModel?: string; customLabel?: string; status?: string };
type LineConfig = { id: string; name: string; output: string; machines: (string | MachineEntryObj)[] };

interface SegCategory {
  key: string;
  label: string;
  ratio: number;
  group: "headRice" | "brokens";
}

interface SegRegionConfig {
  categories: SegCategory[];
  thicknessThreshold?: number;
}

interface SegmentationConfig {
  basmati: SegRegionConfig;
  "non-basmati": SegRegionConfig;
}

const DEFAULT_SEGMENTATION_CONFIG: SegmentationConfig = {
  basmati: {
    categories: [
      { key: "head_rice", label: "Head Rice", ratio: 1.0, group: "headRice" },
      { key: "second_one", label: "Second One", ratio: 0.872, group: "headRice" },
      { key: "tibar", label: "Tibar", ratio: 0.748, group: "brokens" },
      { key: "dubar", label: "Dubar", ratio: 0.632, group: "brokens" },
      { key: "mini_dubar", label: "Mini Dubar", ratio: 0.536, group: "brokens" },
      { key: "mongra", label: "Mongra", ratio: 0.478, group: "brokens" },
      { key: "mini_mongra", label: "Mini Mongra", ratio: 0.418, group: "brokens" },
      { key: "nakku", label: "Nakku", ratio: 0.302, group: "brokens" },
    ],
    thicknessThreshold: 80,
  },
  "non-basmati": {
    categories: [
      { key: "head_rice", label: "Head Rice", ratio: 1.0, group: "headRice" },
      { key: "three_quarter_head_rice", label: "3/4 Head Rice", ratio: 0.75, group: "headRice" },
      { key: "broken", label: "1/2 Broken", ratio: 0.5, group: "brokens" },
      { key: "fine_broken", label: "1/4 Fine Broken", ratio: 0.25, group: "brokens" },
      { key: "tip", label: "Tip", ratio: 0.0, group: "brokens" },
    ],
    thicknessThreshold: 80,
  },
};

interface MillSettingsPayload {
  operatorName: string;
  location: string;
  riceMillName: string;
  region: string;
  lines: LineConfig[];
  currentLineIndex: number;
  lineOutput: string;
  machines: string[];
}

interface PersistOptions {
  showToast?: boolean;
  successMessage?: string;
}

/** API may return machine as string or { name, machineNumber?, status? }. Always render a string. */
function machineDisplayName(m: string | Record<string, unknown> | null | undefined): string {
  if (m == null) return "";
  if (typeof m === "string") return m;
  const o = m as Record<string, unknown>;
  return (o.name as string) ?? (o.machineNumber as string) ?? (o.customLabel as string) ?? "";
}

/** Normalize machines array from API (may be string[] or object[]) to string[] for Settings/LineConfig. */
function normalizeMachinesList(arr: unknown[]): string[] {
  return (arr || []).map((m) => (typeof m === "string" ? m : machineDisplayName(m as Record<string, unknown>))).filter(Boolean);
}

/** Normalize a line from API, preserving machine entry objects. */
function normalizeLine(line: Record<string, unknown>): LineConfig {
  const rawMachines = Array.isArray(line.machines) ? line.machines : [];
  const machines: (string | MachineEntryObj)[] = rawMachines.map((m: unknown) => {
    if (typeof m === "string") return m;
    if (m && typeof m === "object") return m as MachineEntryObj;
    return String(m);
  });
  return {
    id: (line.id as string) ?? "",
    name: (line.name as string) ?? "",
    output: (line.output as string) ?? "",
    machines,
  };
}

const Settings = () => {
  const { language, setLanguage, t } = useLanguage();
  const { machines, lineOutput, setLineOutput, setMachines, updateMachine, deleteMachine } = useMachine();
  const { toast } = useToast();
  
  // Modbus RTU state
  const [activeTab, setActiveTab] = useState("line-info");
  const [modbusConnected, setModbusConnected] = useState(false);
  const [modbusLoading, setModbusLoading] = useState(false);
  const [modbusPort, setModbusPort] = useState("");
  const [modbusBaudrate, setModbusBaudrate] = useState(0);
  const [modbusSlaveId, setModbusSlaveId] = useState(0);
  const [modbusError, setModbusError] = useState<string | null>(null);
  const [modbusDevices, setModbusDevices] = useState<Record<string, { status: string; value: number | null; min: number; max: number; name: string }>>({});
  const [deviceActionLoading, setDeviceActionLoading] = useState<string | null>(null);
  const sliderTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [signalCounts, setSignalCounts] = useState({ tx: 0, rx_ok: 0, rx_err: 0 });

  // Rice Mill information states - with localStorage persistence
  const [millName, setMillName] = useState(() => {
    const saved = localStorage.getItem('riceMill_millName');
    return saved || "";
  });
  const [operatorName, setOperatorName] = useState(() => {
    const saved = localStorage.getItem('riceMill_operatorName');
    return saved || "";
  });
  const [location, setLocation] = useState(() => {
    const saved = localStorage.getItem('riceMill_location');
    return saved || "";
  });
  const [region, setRegion] = useState<string>(() => {
    const saved = localStorage.getItem('riceMill_region');
    return saved || "non-basmati";
  });
  const [locationSearchOpen, setLocationSearchOpen] = useState(false);
  const [locationSearchText, setLocationSearchText] = useState("");

  // Lines management state (safe parse to avoid blank page on corrupted localStorage)
  const [lines, setLines] = useState<LineConfig[]>(() => {
    try {
      const saved = localStorage.getItem('riceMill_lines');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [currentLineIndex, setCurrentLineIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('riceMill_currentLineIndex');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [isAddLineDialogOpen, setIsAddLineDialogOpen] = useState(false);
  const [newLineName, setNewLineName] = useState("");
  const [newLineOutput, setNewLineOutput] = useState("10.0");
  const [newLineMachines, setNewLineMachines] = useState<string[]>([]);
  const [newLineMachineInput, setNewLineMachineInput] = useState("");

  // Segmentation config state
  const [segConfig, setSegConfig] = useState<SegmentationConfig>(DEFAULT_SEGMENTATION_CONFIG);
  const [segLoading, setSegLoading] = useState(false);
  const [segSaving, setSegSaving] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newCategoryRatio, setNewCategoryRatio] = useState("");

  // Whiteness Index (Color Classification) config state
  const [wiConfig, setWiConfig] = useState<{ grades: { label: string; color: string; min: number; max: number }[] }>({
    grades: [
      { label: "Super White", color: "#f0f0f0", min: 36, max: 46 },
      { label: "White", color: "#e8e8e8", min: 32, max: 36 },
      { label: "Cream", color: "#f5f0e0", min: 28, max: 32 },
      { label: "Lemon", color: "#f0e68c", min: 25, max: 28 },
      { label: "Amber Yellow", color: "#d4a843", min: 22, max: 25 },
      { label: "Golden", color: "#c8960c", min: 18, max: 22 },
    ],
  });
  const [wiLoading, setWiLoading] = useState(false);
  const [wiSaving, setWiSaving] = useState(false);

  // Indian cities and states data
  const indianCities = [
    "Bangalore, Karnataka", "Mumbai, Maharashtra", "Delhi, Delhi", "Chennai, Tamil Nadu",
    "Kolkata, West Bengal", "Hyderabad, Telangana", "Pune, Maharashtra", "Ahmedabad, Gujarat",
    "Jaipur, Rajasthan", "Surat, Gujarat", "Lucknow, Uttar Pradesh", "Kanpur, Uttar Pradesh",
    "Nagpur, Maharashtra", "Thiruvananthapuram, Kerala", "Bhopal, Madhya Pradesh", "Visakhapatnam, Andhra Pradesh",
    "Patna, Bihar", "Vadodara, Gujarat", "Ghaziabad, Uttar Pradesh", "Ludhiana, Punjab",
    "Agra, Uttar Pradesh", "Nashik, Maharashtra", "Faridabad, Haryana", "Meerut, Uttar Pradesh",
    "Rajkot, Gujarat", "Amritsar, Punjab", "Jodhpur, Rajasthan", "Indore, Madhya Pradesh",
    "Raipur, Chhattisgarh", "Kota, Rajasthan", "Madurai, Tamil Nadu", "Varanasi, Uttar Pradesh",
    "Bhubaneswar, Odisha", "Srinagar, Jammu and Kashmir", "Amritsar, Punjab", "Chandigarh, Chandigarh",
    "Coimbatore, Tamil Nadu", "Kochi, Kerala", "Mysore, Karnataka", "Guwahati, Assam",
    "Dehradun, Uttarakhand", "Ranchi, Jharkhand", "Jamshedpur, Jharkhand", "Tirupati, Andhra Pradesh"
  ];

  // Machine management states
  const [isAddMachineDialogOpen, setIsAddMachineDialogOpen] = useState(false);
  const [isEditMachineDialogOpen, setIsEditMachineDialogOpen] = useState(false);
  const [editMachineIndex, setEditMachineIndex] = useState(-1);
  const [editMachineName, setEditMachineName] = useState("");
  const availableMachines = machines.length > 0 ? machines : DEFAULT_MACHINE_OPTIONS;
  const [selectedMachinesForSeries, setSelectedMachinesForSeries] = useState<string[]>([]);
  const [machineDialogInput, setMachineDialogInput] = useState("");
  const customMachinesForNewLine = newLineMachines.filter(machine => !availableMachines.includes(machine));
  useEffect(() => {
    setSelectedMachinesForSeries([]);
    setMachineDialogInput("");
  }, [currentLineIndex]);
  const currentSeries = lines.length > 0 && currentLineIndex >= 0 && currentLineIndex < lines.length ? lines[currentLineIndex] : null;
  const machinesAlreadyInCurrentSeries = currentSeries ? currentSeries.machines : [];
  const selectableMachinesForCurrentSeries = availableMachines.filter(machine => !machinesAlreadyInCurrentSeries.includes(machine));
  const customMachinesForSeries = selectedMachinesForSeries.filter(machine => !availableMachines.includes(machine));
  

  const syncLinesFromServer = useCallback((serverLines: unknown[] = [], serverCurrentLineIndex?: number) => {
    const raw = Array.isArray(serverLines) ? serverLines : [];
    const normalizedLines: LineConfig[] = raw.map((line) =>
      line && typeof line === "object" ? normalizeLine(line as Record<string, unknown>) : { id: "", name: "", output: "", machines: [] }
    ).filter((l) => l.id || l.name);
    setLines(normalizedLines);
    setCurrentLineIndex((prevIndex) => {
      if (normalizedLines.length === 0) {
        return 0;
      }
      const targetIndex = typeof serverCurrentLineIndex === 'number' ? serverCurrentLineIndex : prevIndex;
      return Math.min(Math.max(targetIndex, 0), normalizedLines.length - 1);
    });
  }, []);

  // Load rice mill settings from database on mount
  useEffect(() => {
    const loadRiceMillSettings = async () => {
      try {
        const response = await fetch('/api/raice_labz/settings/rice-mill');
        const data = await response.json();
        
        if (data.status === 'success' && data.settings) {
          if (data.settings.operatorName) {
            setOperatorName(data.settings.operatorName);
            localStorage.setItem('riceMill_operatorName', data.settings.operatorName);
          }
          if (data.settings.location) {
            setLocation(data.settings.location);
            localStorage.setItem('riceMill_location', data.settings.location);
          }
          if (data.settings.riceMillName) {
            setMillName(data.settings.riceMillName);
            localStorage.setItem('riceMill_millName', data.settings.riceMillName);
          }
          if (data.settings.region) {
            setRegion(data.settings.region);
            localStorage.setItem('riceMill_region', data.settings.region);
          }
          if (Array.isArray(data.settings.lines)) {
            syncLinesFromServer(data.settings.lines, data.settings.currentLineIndex);
          }
          if (typeof data.settings.lineOutput === 'string') {
            setLineOutput(data.settings.lineOutput);
          }
          if (Array.isArray(data.settings.machines) && data.settings.machines.length > 0) {
            setMachines(normalizeMachinesList(data.settings.machines));
          }
        }
      } catch (error) {
        console.error('Error loading settings from database:', error);
      }
    };
    
    loadRiceMillSettings();
  }, [syncLinesFromServer, setLineOutput, setMachines]);

  // Load segmentation config from database on mount
  useEffect(() => {
    const loadSegConfig = async () => {
      setSegLoading(true);
      try {
        const response = await fetch('/api/raice_labz/settings/segmentation-config');
        const data = await response.json();
        if (data.status === 'success' && data.config) {
          setSegConfig(data.config);
        }
      } catch (error) {
        console.error('Error loading segmentation config:', error);
      } finally {
        setSegLoading(false);
      }
    };
    loadSegConfig();
  }, []);

  // Load WI color classification config from database on mount
  useEffect(() => {
    const loadWiConfig = async () => {
      setWiLoading(true);
      try {
        const response = await fetch('/api/raice_labz/settings/wi-classification');
        const data = await response.json();
        if (data.status === 'success' && data.config?.grades) {
          setWiConfig(data.config);
        }
      } catch (error) {
        console.error('Error loading WI classification config:', error);
      } finally {
        setWiLoading(false);
      }
    };
    loadWiConfig();
  }, []);

  const activeRegionKey = region as "basmati" | "non-basmati";
  const activeCategories = segConfig[activeRegionKey]?.categories ?? [];

  const handleSegCategoryGroupChange = useCallback((index: number, group: "headRice" | "brokens") => {
    setSegConfig(prev => {
      const updated = { ...prev };
      const cats = [...(updated[activeRegionKey]?.categories ?? [])];
      cats[index] = { ...cats[index], group };
      updated[activeRegionKey] = { ...updated[activeRegionKey], categories: cats };
      return updated;
    });
  }, [activeRegionKey]);

  const handleSegCategoryLabelChange = useCallback((index: number, label: string) => {
    setSegConfig(prev => {
      const updated = { ...prev };
      const cats = [...(updated[activeRegionKey]?.categories ?? [])];
      cats[index] = { ...cats[index], label };
      updated[activeRegionKey] = { ...updated[activeRegionKey], categories: cats };
      return updated;
    });
  }, [activeRegionKey]);

  const handleSegCategoryRatioChange = useCallback((index: number, ratioStr: string) => {
    const ratio = parseFloat(ratioStr);
    if (isNaN(ratio)) return;
    setSegConfig(prev => {
      const updated = { ...prev };
      const cats = [...(updated[activeRegionKey]?.categories ?? [])];
      cats[index] = { ...cats[index], ratio: Math.max(0, Math.min(1, ratio)) };
      updated[activeRegionKey] = { ...updated[activeRegionKey], categories: cats };
      return updated;
    });
  }, [activeRegionKey]);

  const handleDeleteSegCategory = useCallback((index: number) => {
    setSegConfig(prev => {
      const updated = { ...prev };
      const cats = [...(updated[activeRegionKey]?.categories ?? [])];
      cats.splice(index, 1);
      updated[activeRegionKey] = { ...updated[activeRegionKey], categories: cats };
      return updated;
    });
  }, [activeRegionKey]);

  const handleAddSegCategory = useCallback(() => {
    if (!newCategoryLabel.trim()) return;
    const ratio = parseFloat(newCategoryRatio);
    if (isNaN(ratio) || ratio < 0 || ratio > 1) return;
    const key = newCategoryLabel.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    setSegConfig(prev => {
      const updated = { ...prev };
      const cats = [...(updated[activeRegionKey]?.categories ?? [])];
      cats.push({ key, label: newCategoryLabel.trim(), ratio, group: "brokens" });
      // Sort descending by ratio
      cats.sort((a, b) => b.ratio - a.ratio);
      updated[activeRegionKey] = { ...updated[activeRegionKey], categories: cats };
      return updated;
    });
    setNewCategoryLabel("");
    setNewCategoryRatio("");
  }, [activeRegionKey, newCategoryLabel, newCategoryRatio]);

  const handleResetSegDefaults = useCallback(() => {
    setSegConfig(prev => ({
      ...prev,
      [activeRegionKey]: DEFAULT_SEGMENTATION_CONFIG[activeRegionKey],
    }));
    toast({ title: "Reset to defaults", description: `${region === 'basmati' ? 'Basmati' : 'Non-Basmati'} segmentation reset to defaults.` });
  }, [activeRegionKey, region, toast]);

  const handleSaveSegConfig = useCallback(async () => {
    setSegSaving(true);
    try {
      const response = await fetch('/api/raice_labz/settings/segmentation-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(segConfig),
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Saved", description: "Segmentation configuration saved. Changes apply to future analyses." });
      } else {
        toast({ title: "Error", description: data.message || "Failed to save segmentation config", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error saving segmentation config:', error);
      toast({ title: "Error", description: "Failed to save segmentation config", variant: "destructive" });
    } finally {
      setSegSaving(false);
    }
  }, [segConfig, toast]);

  const handleWiGradeChange = useCallback((index: number, field: 'min' | 'max', value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    setWiConfig(prev => {
      const grades = [...prev.grades];
      grades[index] = { ...grades[index], [field]: num };
      return { grades };
    });
  }, []);

  const handleSaveWiConfig = useCallback(async () => {
    setWiSaving(true);
    try {
      const response = await fetch('/api/raice_labz/settings/wi-classification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wiConfig),
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Saved", description: "Color index classification saved." });
      } else {
        toast({ title: "Error", description: data.message || "Failed to save", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save WI config", variant: "destructive" });
    } finally {
      setWiSaving(false);
    }
  }, [wiConfig, toast]);

  const buildMillSettingsPayload = useCallback((overrides: Partial<MillSettingsPayload> = {}): MillSettingsPayload => ({
    operatorName: overrides.operatorName ?? operatorName,
    location: overrides.location ?? location,
    riceMillName: overrides.riceMillName ?? millName,
    region: overrides.region ?? region,
    lines: overrides.lines ?? lines,
    currentLineIndex: overrides.currentLineIndex ?? currentLineIndex,
    lineOutput: overrides.lineOutput ?? lineOutput,
    machines: overrides.machines ?? machines,
  }), [operatorName, location, millName, region, lines, currentLineIndex, lineOutput, machines]);

  const persistMillInformation = useCallback(async (overrides: Partial<MillSettingsPayload> = {}, options: PersistOptions = {}) => {
    try {
      const payload = buildMillSettingsPayload(overrides);
      const response = await fetch('/api/raice_labz/settings/rice-mill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Failed to save mill settings');
      }

      if (data.settings) {
        if (Array.isArray(data.settings.lines)) {
          syncLinesFromServer(data.settings.lines, data.settings.currentLineIndex);
        }
        if (typeof data.settings.lineOutput === 'string') {
          setLineOutput(data.settings.lineOutput);
        }
        if (Array.isArray(data.settings.machines) && data.settings.machines.length > 0) {
          setMachines(normalizeMachinesList(data.settings.machines));
        }
      }

      if (options.showToast) {
        toast({
          title: "Mill information saved",
          description: options.successMessage || "Settings saved to database successfully",
          duration: 3000,
        });
      }

      return true;
    } catch (error) {
      console.error('Error saving mill information:', error);
      if (options.showToast) {
        toast({
          title: "Failed to save mill information",
          description: error instanceof Error ? error.message : 'Unknown error',
          duration: 3000,
          variant: "destructive",
        });
      }
      return false;
    }
  }, [buildMillSettingsPayload, syncLinesFromServer, toast, setLineOutput, setMachines]);

  // ========== Modbus RTU API Helpers ==========

  const [modbusPortOpen, setModbusPortOpen] = useState(false);

  const fetchModbusStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/modbus_rtu/status');
      const data = await res.json();
      setModbusConnected(data.connected ?? false);
      setModbusPortOpen(data.port_open ?? false);
      setModbusPort(data.port ?? "");
      setModbusBaudrate(data.baudrate ?? 0);
      setModbusSlaveId(data.slave_id ?? 0);
      setModbusError(null);
    } catch {
      setModbusError("Cannot reach backend server");
      setModbusConnected(false);
      setModbusPortOpen(false);
    }
  }, []);

  const fetchDeviceStatuses = useCallback(async () => {
    try {
      const res = await fetch('/api/modbus_rtu/devices/status');
      const data = await res.json();
      if (data.status === "success" && data.devices) {
        setModbusDevices(data.devices);
        setModbusError(null);
      } else if (data.status === "error") {
        // Keep existing device data but mark error
        setModbusError(data.message || "Modbus RTU disconnected — device statuses unavailable");
      }
    } catch {
      setModbusError("Cannot reach backend server");
    }
  }, []);

  const connectModbus = useCallback(async () => {
    setModbusLoading(true);
    try {
      const res = await fetch('/api/modbus_rtu/connect');
      const data = await res.json();
      if (data.status === "success" || data.status === "info") {
        toast({ title: "Modbus RTU", description: data.message });
        await fetchModbusStatus();
        await fetchDeviceStatuses();
      } else {
        toast({ title: "Connection Failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection Failed", description: "Cannot reach backend server", variant: "destructive" });
    } finally {
      setModbusLoading(false);
    }
  }, [toast, fetchModbusStatus, fetchDeviceStatuses]);

  const disconnectModbus = useCallback(async () => {
    setModbusLoading(true);
    try {
      const res = await fetch('/api/modbus_rtu/disconnect');
      const data = await res.json();
      toast({ title: "Modbus RTU", description: data.message });
      // Immediately update local state — don't call fetchModbusStatus which would lazy-reconnect
      setModbusConnected(false);
      setModbusPortOpen(false);
      setModbusPort("");
      setModbusBaudrate(0);
      setModbusSlaveId(0);
      setModbusDevices({});
    } catch {
      toast({ title: "Disconnect Failed", description: "Cannot reach backend server", variant: "destructive" });
    } finally {
      setModbusLoading(false);
    }
  }, [toast]);

  const toggleDevice = useCallback(async (deviceName: string) => {
    setDeviceActionLoading(deviceName);
    try {
      const currentDevice = modbusDevices[deviceName];
      const isOn = currentDevice?.value != null && currentDevice.value > 0;
      const action = isOn ? "stop" : "start";
      const res = await fetch(`/api/modbus_rtu/device/${deviceName}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (data.status === "success") {
        // Optimistic update — flip the value locally immediately
        setModbusDevices(prev => ({
          ...prev,
          [deviceName]: {
            ...prev[deviceName],
            value: isOn ? 0 : (prev[deviceName]?.max ?? 1),
            status: isOn ? "OFF" : "ON",
          }
        }));
      } else {
        const msg = data.message || `Failed to ${action} ${deviceName}`;
        toast({
          title: "Device Control Failed",
          description: msg,
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Device Control Failed", description: "Cannot reach backend server", variant: "destructive" });
    } finally {
      setDeviceActionLoading(null);
    }
  }, [modbusDevices, toast]);

  const writeDeviceValue = useCallback(async (deviceName: string, value: number) => {
    try {
      const res = await fetch(`/api/modbus_rtu/device/${deviceName}/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      const data = await res.json();
      if (data.status === "success") {
        // Slider value already updated optimistically by handleSliderChange
      } else {
        const msg = data.message || `Failed to write to ${deviceName}`;
        toast({
          title: "Write Failed",
          description: msg.toLowerCase().includes("fail") ? `${msg} — check wiring and slave ID` : msg,
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Write Failed", description: "Cannot reach backend server", variant: "destructive" });
    }
  }, [toast, fetchDeviceStatuses]);

  const handleSliderChange = useCallback((deviceName: string, values: number[]) => {
    const value = values[0];
    // Update UI immediately
    setModbusDevices(prev => ({
      ...prev,
      [deviceName]: { ...prev[deviceName], value },
    }));
    // Debounce the API call
    if (sliderTimeoutRef.current[deviceName]) {
      clearTimeout(sliderTimeoutRef.current[deviceName]);
    }
    sliderTimeoutRef.current[deviceName] = setTimeout(() => {
      writeDeviceValue(deviceName, value);
    }, 400);
  }, [writeDeviceValue]);

  // Poll Modbus status when hardware tab is active
  useEffect(() => {
    if (activeTab !== "hardware") return;

    fetchModbusStatus();
    fetchDeviceStatuses();

    const interval = setInterval(() => {
      fetchModbusStatus();
      fetchDeviceStatuses();
    }, 10000);

    return () => clearInterval(interval);
  }, [activeTab, fetchModbusStatus, fetchDeviceStatuses]);

  // Poll signal counts when hardware tab is active
  useEffect(() => {
    if (activeTab !== "hardware") return;
    const poll = async () => {
      try {
        const res = await fetch('/api/modbus_rtu/signal-counts');
        if (res.ok) {
          const data = await res.json();
          setSignalCounts({ tx: data.tx ?? 0, rx_ok: data.rx_ok ?? 0, rx_err: data.rx_err ?? 0 });
        }
      } catch { /* ignore */ }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Auto-save lines to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('riceMill_lines', JSON.stringify(lines));
  }, [lines]);

  // Auto-save current line index to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('riceMill_currentLineIndex', currentLineIndex.toString());
  }, [currentLineIndex]);

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
  };

  const handleLocationOpenChange = useCallback((open: boolean) => {
    setLocationSearchOpen(open);
    if (open) {
      setLocationSearchText(location);
    }
  }, [location]);

  const handleLocationCommit = useCallback(() => {
    const trimmed = locationSearchText.trim();
    if (!trimmed) return;
    setLocation(trimmed);
    setLocationSearchOpen(false);
  }, [locationSearchText]);

  const handleAddMachineDialogOpenChange = useCallback((open: boolean) => {
    setIsAddMachineDialogOpen(open);
    if (!open) {
      setSelectedMachinesForSeries([]);
      setMachineDialogInput("");
    }
  }, []);

  const toggleMachineForSeriesDialog = useCallback((machineName: string) => {
    setSelectedMachinesForSeries((prev) =>
      prev.includes(machineName)
        ? prev.filter((m) => m !== machineName)
        : [...prev, machineName]
    );
  }, []);

  const handleAddCustomMachineToSeriesDialog = useCallback(() => {
    const trimmed = machineDialogInput.trim();
    if (!trimmed) return;
    setSelectedMachinesForSeries((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed]
    );
    setMachineDialogInput("");
  }, [machineDialogInput]);

  const handleRemoveMachineFromSeriesDialog = useCallback((machineName: string) => {
    setSelectedMachinesForSeries((prev) => prev.filter((m) => m !== machineName));
  }, []);

  const handleAddMachinesToSeries = useCallback(async () => {
    if (lines.length === 0 || currentLineIndex < 0) {
      return;
    }

    const selectedLine = lines[currentLineIndex];
    if (!selectedLine) {
      return;
    }

    const uniqueSelections = Array.from(
      new Set(selectedMachinesForSeries.map((machine) => machine.trim()).filter(Boolean))
    );

    if (uniqueSelections.length === 0) {
      toast({
        title: "No machines selected",
        description: "Select or add at least one machine to continue.",
        duration: 3000,
      });
      return;
    }

    const machinesToAdd = uniqueSelections.filter(
      (machine) => !selectedLine.machines.includes(machine)
    );

    if (machinesToAdd.length === 0) {
      toast({
        title: "All machines already added",
        description: "Select machines that are not already part of this series.",
        duration: 3000,
      });
      return;
    }

    let updatedMachineCatalog = machines;
    const newCatalogEntries = machinesToAdd.filter((machine) => !machines.includes(machine));
    if (newCatalogEntries.length > 0) {
      updatedMachineCatalog = [...machines, ...newCatalogEntries];
      setMachines(updatedMachineCatalog);
    }

    const updatedLine: LineConfig = {
      ...selectedLine,
      machines: [...selectedLine.machines, ...machinesToAdd]
    };
    const updatedLines = [...lines];
    updatedLines[currentLineIndex] = updatedLine;
    setLines(updatedLines);

    const saved = await persistMillInformation({
      lines: updatedLines,
      machines: updatedMachineCatalog
    });

    toast({
      title: saved ? "Machines Added" : "Machines Added Locally",
      description: saved
        ? `${machinesToAdd.length} machine(s) added to ${updatedLine.name}`
        : "Machines were added locally but failed to sync with the database.",
      duration: 3000,
      variant: saved ? undefined : "destructive",
    });

    setSelectedMachinesForSeries([]);
    setMachineDialogInput("");
    setIsAddMachineDialogOpen(false);
  }, [currentLineIndex, lines, machines, persistMillInformation, selectedMachinesForSeries, setMachines, toast]);

  const handleEditMachine = (index: number) => {
    setEditMachineIndex(index);
    setEditMachineName(machines[index]);
    setIsEditMachineDialogOpen(true);
  };

  const handleUpdateMachine = useCallback(async () => {
    const trimmedName = editMachineName.trim();
    if (!trimmedName || editMachineIndex < 0) {
      return;
    }

    const updatedMachines = machines.map((machine, index) =>
      index === editMachineIndex ? trimmedName : machine
    );

    updateMachine(editMachineIndex, trimmedName);
    setEditMachineName("");
    setEditMachineIndex(-1);
    setIsEditMachineDialogOpen(false);

    const saved = await persistMillInformation({
      machines: updatedMachines
    });

    if (!saved) {
      toast({
        title: "Failed to update machine in database",
        description: "Changes saved locally. Please try again.",
        duration: 3000,
        variant: "destructive",
      });
    }
  }, [editMachineIndex, editMachineName, machines, persistMillInformation, toast, updateMachine]);

  const handleDeleteMachine = useCallback(async (index: number) => {
    if (index < 0 || index >= machines.length) {
      return;
    }

    const updatedMachines = machines.filter((_, i) => i !== index);
    deleteMachine(index);

    const saved = await persistMillInformation({
      machines: updatedMachines
    });

    if (!saved) {
      toast({
        title: "Failed to delete machine in database",
        description: "Machine removed locally but not synced. Please retry.",
        duration: 3000,
        variant: "destructive",
      });
    }
  }, [deleteMachine, machines, persistMillInformation, toast]);

  const handleSaveRiceMillInfo = useCallback(async () => {
    localStorage.setItem('riceMill_millName', millName);
    localStorage.setItem('riceMill_operatorName', operatorName);
    localStorage.setItem('riceMill_location', location);
    localStorage.setItem('riceMill_region', region);

    await persistMillInformation({}, { showToast: true });
  }, [millName, operatorName, location, region, persistMillInformation]);

  // Line management handlers
  const handleAddLine = useCallback(async () => {
    if (!newLineName.trim()) {
      return;
    }

    const trimmedMachines = Array.from(new Set(newLineMachines.map(machine => machine.trim()).filter(Boolean)));
    const newLine: LineConfig = {
      id: `line_${Date.now()}`,
      name: newLineName,
      output: newLineOutput,
      machines: trimmedMachines
    };

    const updatedLines = [...lines, newLine];
    const shouldSelectNewLine = lines.length === 0;
    const machinesToAdd = trimmedMachines.filter(machine => !machines.includes(machine));
    const updatedMachineCatalog = machinesToAdd.length > 0 ? [...machines, ...machinesToAdd] : machines;

    setLines(updatedLines);
    if (shouldSelectNewLine) {
      setCurrentLineIndex(0);
    }
    if (machinesToAdd.length > 0) {
      setMachines(updatedMachineCatalog);
    }

    const saved = await persistMillInformation({
      lines: updatedLines,
      currentLineIndex: shouldSelectNewLine ? 0 : currentLineIndex,
      machines: updatedMachineCatalog
    });

    setNewLineName("");
    setNewLineOutput("10.0");
    setNewLineMachines([]);
    setNewLineMachineInput("");
    setIsAddLineDialogOpen(false);

    toast({
      title: saved ? "Line Added" : "Line Added Locally",
      description: saved
        ? `${newLineName} has been added successfully.`
        : `${newLineName} was added locally but failed to sync with the database.`,
      duration: 3000,
      variant: saved ? undefined : "destructive",
    });
  }, [currentLineIndex, lines, machines, newLineMachines, newLineName, newLineOutput, persistMillInformation, setMachines, toast]);

  const handleDeleteLine = useCallback(async (index: number) => {
    const updatedLines = lines.filter((_, i) => i !== index);
    const nextIndex = updatedLines.length === 0 ? 0 : Math.min(currentLineIndex, updatedLines.length - 1);

    setLines(updatedLines);
    setCurrentLineIndex(nextIndex);

    const saved = await persistMillInformation({
      lines: updatedLines,
      currentLineIndex: nextIndex
    });

    toast({
      title: saved ? "Line Deleted" : "Line Deletion Pending",
      description: saved
        ? "Line has been removed successfully."
        : "Line removed locally but failed to sync with the database.",
      duration: 3000,
      variant: saved ? undefined : "destructive",
    });
  }, [currentLineIndex, lines, persistMillInformation, toast]);

  const toggleMachineForNewLine = (machineName: string) => {
    if (newLineMachines.includes(machineName)) {
      setNewLineMachines(newLineMachines.filter(m => m !== machineName));
    } else {
      setNewLineMachines([...newLineMachines, machineName]);
    }
  };

  const handleAddCustomMachineToNewLine = useCallback(() => {
    const trimmedName = newLineMachineInput.trim();
    if (!trimmedName) {
      return;
    }
    if (!newLineMachines.includes(trimmedName)) {
      setNewLineMachines(prev => [...prev, trimmedName]);
    }
    setNewLineMachineInput("");
  }, [newLineMachineInput, newLineMachines]);

  const handleRemoveMachineFromNewLine = useCallback((machineName: string) => {
    setNewLineMachines(prev => prev.filter(m => machineDisplayName(m as string | Record<string, unknown>) !== machineName));
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader 
        title={t('nav.settings')} 
        subtitle="Configure application settings and preferences"
      />
      
      <div className="flex-1 overflow-hidden px-6 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="line-info" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Mill Region & Configuration
            </TabsTrigger>
            <TabsTrigger value="hardware" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Hardware
            </TabsTrigger>
          </TabsList>

          <TabsContent value="line-info" className="flex-1 overflow-auto mt-2 space-y-6 pb-6">

            {/* <TabsContent value="language" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-rice-primary flex items-center space-x-2">
                    <Globe className="w-5 h-5" />
                    <span>{t('settings.language')} Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="language-select" className="text-base font-medium">
                      Select Application Language
                    </Label>
                    <Select value={language} onValueChange={handleLanguageChange}>
                      <SelectTrigger className="w-full max-w-xs">
                        <SelectValue placeholder="Choose language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="kn">ಕನ್ನಡ (Kannada)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-600">
                      {language === 'en' 
                        ? 'Changes will be applied immediately across the entire application.'
                        : 'ಬದಲಾವಣೆಗಳು ಇಡೀ ಅಪ್ಲಿಕೇಶನ್‌ನಲ್ಲಿ ತಕ್ಷಣವೇ ಅನ್ವಯಿಸಲ್ಪಡುತ್ತವೆ.'
                      }
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Current Language: {language === 'en' ? 'English' : 'ಕನ್ನಡ'}</h4>
                    <p className="text-sm text-gray-600">
                      {language === 'en' 
                        ? 'All text throughout the application will be displayed in the selected language.'
                        : 'ಅಪ್ಲಿಕೇಶನ್‌ನ ಎಲ್ಲಾ ಪಠ್ಯವು ಆಯ್ಕೆಮಾಡಿದ ಭಾಷೆಯಲ್ಲಿ ಪ್ರದರ್ಶಿಸಲ್ಪಡುತ್ತದೆ.'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent> */}


            {/* Mill Region & Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-rice-primary flex items-center space-x-2">
                    <Building2 className="w-5 h-5" />
                    <span>Mill Region & Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="settings-mill-name">Rice Mill</Label>
                      <Input
                        id="settings-mill-name"
                        placeholder="Enter rice mill name"
                        value={millName}
                        onChange={(e) => {
                          setMillName(e.target.value);
                          localStorage.setItem('riceMill_millName', e.target.value);
                        }}
                        onBlur={() => persistMillInformation({})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="settings-operator">Machine/Lab Incharge</Label>
                      <Input
                        id="settings-operator"
                        placeholder="Enter incharge name"
                        value={operatorName}
                        onChange={(e) => {
                          setOperatorName(e.target.value);
                          localStorage.setItem('riceMill_operatorName', e.target.value);
                        }}
                        onBlur={() => persistMillInformation({})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="settings-location">Location</Label>
                      <Input
                        id="settings-location"
                        placeholder="Enter location"
                        value={location}
                        onChange={(e) => {
                          setLocation(e.target.value);
                          localStorage.setItem('riceMill_location', e.target.value);
                        }}
                        onBlur={() => persistMillInformation({})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mill Region</Label>
                      <RadioGroup
                        value={region}
                        onValueChange={(val) => {
                          setRegion(val);
                          localStorage.setItem('riceMill_region', val);
                          persistMillInformation({ region: val });
                        }}
                        className="flex items-center gap-4 h-10"
                      >
                        <div className="flex items-center gap-1.5">
                          <RadioGroupItem value="basmati" id="region-basmati" />
                          <Label htmlFor="region-basmati" className="text-sm font-medium cursor-pointer">Basmati</Label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <RadioGroupItem value="non-basmati" id="region-non-basmati" />
                          <Label htmlFor="region-non-basmati" className="text-sm font-medium cursor-pointer">Non-Basmati</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </CardContent>
              </Card>

            {/* Two-column layout: Segmentation + Color Index */}
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
              {/* Segmentation content */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-rice-primary flex items-center space-x-2">
                    <Ruler className="w-5 h-5" />
                    <span>Segmentation Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {segLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      <span>Loading segmentation config...</span>
                    </div>
                  ) : (
                    <>
                      {/* Category table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 font-medium" style={{ width: '30%' }}>Class</th>
                              <th className="text-left py-2 px-3 font-medium" style={{ width: '20%' }}>Ratio</th>
                              <th className="text-center py-2 px-3 font-medium" style={{ width: '18%' }}>Head Rice</th>
                              <th className="text-center py-2 px-3 font-medium" style={{ width: '18%' }}>Brokens</th>
                              <th className="text-center py-2 px-3 font-medium" style={{ width: '14%' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeCategories.map((cat, idx) => (
                              <tr key={cat.key + idx} className="border-b hover:bg-muted/50">
                                <td className="py-2 px-3">
                                  <Input
                                    value={cat.label}
                                    onChange={(e) => handleSegCategoryLabelChange(idx, e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <Input
                                    type="number"
                                    value={cat.ratio}
                                    onChange={(e) => handleSegCategoryRatioChange(idx, e.target.value)}
                                    min={0}
                                    max={1}
                                    step={0.001}
                                    className="h-8 text-sm w-24"
                                  />
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <RadioGroup
                                    value={cat.group}
                                    onValueChange={(val) => handleSegCategoryGroupChange(idx, val as "headRice" | "brokens")}
                                    className="flex justify-center"
                                  >
                                    <RadioGroupItem value="headRice" aria-label={`${cat.label} → Head Rice`} />
                                  </RadioGroup>
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <RadioGroup
                                    value={cat.group}
                                    onValueChange={(val) => handleSegCategoryGroupChange(idx, val as "headRice" | "brokens")}
                                    className="flex justify-center"
                                  >
                                    <RadioGroupItem value="brokens" aria-label={`${cat.label} → Brokens`} />
                                  </RadioGroup>
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteSegCategory(idx)}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    disabled={activeCategories.length <= 2}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Add new category */}
                      <div className="flex items-end gap-3 pt-2">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Class Name</Label>
                          <Input
                            placeholder="e.g. Monimongra"
                            value={newCategoryLabel}
                            onChange={(e) => setNewCategoryLabel(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="w-28 space-y-1">
                          <Label className="text-xs">Ratio (0–1)</Label>
                          <Input
                            type="number"
                            placeholder="0.5"
                            value={newCategoryRatio}
                            onChange={(e) => setNewCategoryRatio(e.target.value)}
                            min={0}
                            max={1}
                            step={0.001}
                            className="h-8 text-sm"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddSegCategory}
                          disabled={!newCategoryLabel.trim() || !newCategoryRatio}
                          className="h-8"
                        >
                          <Plus className="w-4 h-4 mr-1" /> Add
                        </Button>
                      </div>

                      {/* Thickness Grader Threshold */}
                      <div className="mt-6 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700">Thickness Threshold (%)</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              Grains with width &ge; this % of the variety&apos;s reference breadth are &quot;Thick Rice&quot;. Used by Thickness Grader machines.
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="1"
                              min="1"
                              max="100"
                              className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                              value={segConfig[activeRegionKey]?.thicknessThreshold ?? 80}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val > 0 && val <= 100) {
                                  setSegConfig((prev) => ({
                                    ...prev,
                                    [activeRegionKey]: {
                                      ...prev[activeRegionKey],
                                      thicknessThreshold: val,
                                    },
                                  }));
                                }
                              }}
                            />
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-between pt-4 border-t">
                        <Button variant="outline" size="sm" onClick={handleResetSegDefaults}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Reset to Defaults
                        </Button>
                        <Button onClick={handleSaveSegConfig} disabled={segSaving}>
                          {segSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Save Configuration
                        </Button>
                      </div>

                    </>
                  )}
                </CardContent>
              </Card>
              </div>

              {/* Color Index Classification (Whiteness Index) */}
              <div className="col-span-1">
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-rice-primary flex items-center space-x-2 text-base">
                      <Lightbulb className="w-5 h-5" />
                      <span>Color Index (WI)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {wiLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        <span className="text-sm">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-1.5 px-2 font-medium text-xs">Color Grade</th>
                              <th className="text-center py-1.5 px-2 font-medium text-xs w-16">Min</th>
                              <th className="text-center py-1.5 px-2 font-medium text-xs w-16">Max</th>
                            </tr>
                          </thead>
                          <tbody>
                            {wiConfig.grades.map((grade, idx) => (
                              <tr key={grade.label + idx} className="border-b hover:bg-muted/50">
                                <td className="py-1.5 px-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: grade.color }} />
                                    <span className="text-sm">{grade.label}</span>
                                  </div>
                                </td>
                                <td className="py-1.5 px-2">
                                  <Input
                                    type="number"
                                    value={grade.min}
                                    onChange={(e) => handleWiGradeChange(idx, 'min', e.target.value)}
                                    className="h-7 text-xs text-center w-16"
                                  />
                                </td>
                                <td className="py-1.5 px-2">
                                  <Input
                                    type="number"
                                    value={grade.max}
                                    onChange={(e) => handleWiGradeChange(idx, 'max', e.target.value)}
                                    className="h-7 text-xs text-center w-16"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="flex justify-end pt-2">
                          <Button size="sm" onClick={handleSaveWiConfig} disabled={wiSaving}>
                            {wiSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                            Save
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                {/* Moisture Content Ranges - Coming Soon */}
                <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50/80 p-4 opacity-50 pointer-events-none">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-400">Moisture Content Ranges</span>
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">Coming Soon</span>
                  </div>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1.5 px-2 font-medium text-xs text-gray-400">Stage</th>
                        <th className="text-center py-1.5 px-2 font-medium text-xs text-gray-400 w-16">Min %</th>
                        <th className="text-center py-1.5 px-2 font-medium text-xs text-gray-400 w-16">Max %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Procurement", min: 10, max: 14 },
                        { label: "Milled Rice", min: 12, max: 13 },
                      ].map((g) => (
                        <tr key={g.label} className="border-b border-gray-100 last:border-b-0">
                          <td className="py-1.5 px-2 text-gray-400">{g.label}</td>
                          <td className="py-1.5 px-2">
                            <Input disabled value={g.min} className="h-7 text-xs text-center w-16 bg-gray-100 text-gray-400" />
                          </td>
                          <td className="py-1.5 px-2">
                            <Input disabled value={g.max} className="h-7 text-xs text-center w-16 bg-gray-100 text-gray-400" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                </Card>
              </div>
            </div>

          </TabsContent>

          {/* Hardware tab - Modbus RTU controls */}
          <TabsContent value="hardware" className="flex-1 overflow-auto mt-2 space-y-4 pb-6">

            {/* Error Banner */}
            {modbusError && (
              <div className="flex items-center gap-3 p-3 bg-rice-secondary/10 border border-rice-secondary/30 rounded-lg text-rice-primary">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{modbusError}</span>
                <Button variant="ghost" size="sm" className="ml-auto h-7 w-7 p-0" onClick={() => { fetchModbusStatus(); fetchDeviceStatuses(); }}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* Connection + Signal Monitor side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Connection Status Card */}
              <Card className={`border flex items-center ${
                modbusConnected ? 'border-rice-primary/30 bg-rice-primary/5'
                : modbusPortOpen ? 'border-rice-secondary/40 bg-rice-secondary/5'
                : 'border-gray-200'
              }`}>
                <CardContent className="py-3 px-4 w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        modbusConnected ? 'bg-rice-primary/10'
                        : modbusPortOpen ? 'bg-rice-secondary/20'
                        : 'bg-gray-100'
                      }`}>
                        {modbusConnected ? (
                          <Wifi className="w-4 h-4 text-rice-primary" />
                        ) : modbusPortOpen ? (
                          <Wifi className="w-4 h-4 text-rice-secondary" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Label className="text-base font-bold tracking-tight">Grain Analyzer</Label>
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                            modbusConnected ? 'bg-rice-primary/10 text-rice-primary'
                            : modbusPortOpen ? 'bg-rice-secondary/20 text-rice-primary'
                            : 'bg-gray-100 text-gray-400'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              modbusConnected ? 'bg-rice-primary animate-pulse'
                              : modbusPortOpen ? 'bg-rice-secondary'
                              : 'bg-gray-400'
                            }`} />
                            {modbusConnected ? 'Connected' : modbusPortOpen ? 'Machine Off' : 'Disconnected'}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {modbusConnected
                            ? "System connected and ready"
                            : modbusPortOpen
                              ? "Connection open, machine not responding"
                              : "No active connection"}
                        </p>
                        {/* Connection metadata hidden per UX request (port/baud/slave details). */}
                        {/*
                        <p className="text-xs text-gray-500 mt-0.5">
                          {modbusConnected
                            ? `${modbusPort} · ${modbusBaudrate} baud · Slave ${modbusSlaveId}`
                            : modbusPortOpen
                              ? `${modbusPort} open — machine not responding`
                              : "No active connection"}
                        </p>
                        */}
                      </div>
                    </div>
                    <Button
                      onClick={(modbusConnected || modbusPortOpen) ? disconnectModbus : connectModbus}
                      disabled={modbusLoading}
                      size="sm"
                      className={(modbusConnected || modbusPortOpen)
                        ? "bg-white border border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300 h-8 text-xs"
                        : "bg-rice-primary hover:bg-rice-primary/90 h-8 text-xs"
                      }
                      variant={(modbusConnected || modbusPortOpen) ? "outline" : "default"}
                    >
                      {modbusLoading && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
                      {(modbusConnected || modbusPortOpen) ? 'Disconnect' : 'Connect'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Signal Counts — TX / Valid RX / Errors */}
              <Card className="border border-rice-primary/30 bg-rice-primary/5">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="w-4 h-4 text-rice-primary" />
                    <Label className="text-sm font-semibold text-rice-primary">Signal Monitor</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-xl font-bold text-rice-primary font-mono">{signalCounts.tx}</div>
                      <div className="text-[10px] text-rice-primary/60 uppercase font-medium">Polls (TX)</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-xl font-bold text-rice-primary font-mono">{signalCounts.rx_ok}</div>
                      <div className="text-[10px] text-rice-primary/60 uppercase font-medium">Valid (RX)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Speed Controls — always visible to set before starting */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b bg-gray-50/50">
                <CardTitle className="text-rice-primary flex items-center space-x-2 text-sm">
                  <Ruler className="w-4 h-4" />
                  <span>Speed Controls</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {([
                  { key: "conveyor_speed", icon: Truck, label: "Conveyor Speed", min: 5, max: 75, unit: "RPM" },
                  { key: "vibrator", icon: Activity, label: "Vibrator Intensity", min: 0, max: 100, unit: "%" },
                ] as const).map(({ key, icon: Icon, label, min, max, unit }) => {
                  const device = modbusDevices[key];
                  const currentValue = device?.value ?? min;
                  const machineOn = (modbusDevices["auto_start_stop"]?.value ?? 0) > 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-2">
                          <Icon className="w-4 h-4 text-rice-primary" />
                          <Label className="text-sm font-medium">{label}</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={min}
                            max={max}
                            value={currentValue}
                            disabled={!modbusConnected}
                            onChange={(e) => {
                              const raw = parseInt(e.target.value, 10);
                              if (isNaN(raw)) return;
                              const clamped = Math.max(min, Math.min(max, raw));
                              handleSliderChange(key, [clamped]);
                            }}
                            className="w-14 text-right text-sm font-bold text-rice-primary border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-rice-primary/40 disabled:opacity-50"
                          />
                          <span className="text-xs text-gray-400">{unit}</span>
                        </div>
                      </div>
                      <Slider
                        value={[currentValue]}
                        onValueChange={(values) => {
                          handleSliderChange(key, values);
                          if (machineOn) {
                            // Live-write to register if machine is running
                          }
                        }}
                        min={min}
                        max={max}
                        step={1}
                        disabled={!modbusConnected}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                        <span>{min} {unit}</span>
                        <span>{max} {unit}</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Machine & Light Controls */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b bg-gray-50/50">
                <CardTitle className="text-rice-primary flex items-center space-x-2 text-sm">
                  <Zap className="w-4 h-4" />
                  <span>Device Controls</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Machine Start/Stop — uses /machine/start with conveyor+vibrator values */}
                {(() => {
                  const machineDevice = modbusDevices["auto_start_stop"];
                  const machineOn = machineDevice?.value != null && machineDevice.value > 0;
                  const isUnknown = !machineDevice || machineDevice.status === "UNKNOWN";
                  const isMachineLoading = deviceActionLoading === "machine";

                  const handleMachineToggle = async () => {
                    setDeviceActionLoading("machine");
                    try {
                      const conveyorVal = modbusDevices["conveyor_speed"]?.value ?? 5;
                      const vibratorVal = modbusDevices["vibrator"]?.value ?? 50;
                      const url = machineOn
                        ? '/api/modbus_rtu/machine/stop'
                        : '/api/modbus_rtu/machine/start';
                      const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ conveyor_speed: conveyorVal, vibrator: vibratorVal }),
                      });
                      const data = await res.json();
                      if (data.status === "success") {
                        // Optimistic update
                        setModbusDevices(prev => ({
                          ...prev,
                          auto_start_stop: { ...prev["auto_start_stop"], value: machineOn ? 0 : 1, status: machineOn ? "OFF" : "ON" },
                          ...(machineOn ? {} : {
                            conveyor_speed: { ...prev["conveyor_speed"], value: conveyorVal, status: "ON" },
                            vibrator: { ...prev["vibrator"], value: vibratorVal, status: "ON" },
                            led_on_off: { ...prev["led_on_off"], value: 1, status: "ON" },
                          }),
                        }));
                      } else {
                        toast({ title: "Machine Control Failed", description: data.message, variant: "destructive" });
                      }
                    } catch {
                      toast({ title: "Machine Control Failed", description: "Cannot reach backend", variant: "destructive" });
                    } finally {
                      setDeviceActionLoading(null);
                    }
                  };

                  return (
                    <div className={`flex items-center justify-between px-4 py-3 border-b transition-colors ${machineOn ? 'bg-rice-primary/5' : ''}`}>
                      <div className="flex items-center space-x-3">
                        <Factory className={`w-4 h-4 transition-colors ${machineOn ? 'text-rice-primary' : 'text-gray-300'}`} />
                        <div>
                          <span className="text-sm font-semibold">Machine</span>
                          {isUnknown && <span className="text-[10px] text-rice-secondary ml-2">no response</span>}
                          {machineOn && !isUnknown && <span className="text-[10px] text-rice-primary ml-2">Running</span>}
                        </div>
                      </div>
                      {isMachineLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rice-primary" />
                      ) : (
                        <Button
                          size="sm"
                          onClick={handleMachineToggle}
                          disabled={!modbusConnected}
                          className={`h-7 px-5 text-xs font-semibold rounded-full transition-all ${
                            machineOn
                              ? 'bg-red-500 hover:bg-red-600 text-white'
                              : 'bg-rice-primary hover:bg-rice-primary/90 text-white'
                          }`}
                        >
                          {machineOn ? 'Stop' : 'Start'}
                        </Button>
                      )}
                    </div>
                  );
                })()}

                {/* Light — independent toggle */}
                {(() => {
                  const lightDevice = modbusDevices["led_on_off"];
                  const lightOn = lightDevice?.value != null && lightDevice.value > 0;
                  const isUnknown = !lightDevice || lightDevice.status === "UNKNOWN";
                  const isLightLoading = deviceActionLoading === "led_on_off";

                  return (
                    <div className={`flex items-center justify-between px-4 py-3 transition-colors ${lightOn ? 'bg-rice-secondary/10' : ''}`}>
                      <div className="flex items-center space-x-3">
                        <Lightbulb className={`w-4 h-4 transition-colors ${lightOn ? 'text-rice-secondary' : 'text-gray-300'}`} />
                        <div>
                          <span className="text-sm font-medium">Light</span>
                          {isUnknown && <span className="text-[10px] text-rice-secondary ml-2">no response</span>}
                        </div>
                      </div>
                      {isLightLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rice-primary" />
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => toggleDevice("led_on_off")}
                          disabled={!modbusConnected}
                          className={`h-7 px-4 text-xs font-semibold rounded-full transition-all ${
                            lightOn
                              ? 'bg-red-500 hover:bg-red-600 text-white'
                              : 'bg-rice-primary hover:bg-rice-primary/90 text-white'
                          }`}
                        >
                          {lightOn ? 'Stop' : 'Start'}
                        </Button>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings; 