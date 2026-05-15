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

type LineConfig = { id: string; name: string; output: string; machines: string[] };

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

/** Normalize a line from API so machines is string[]. */
function normalizeLine(line: Record<string, unknown>): LineConfig {
  const machines = Array.isArray(line.machines) ? normalizeMachinesList(line.machines) : [];
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

  const fetchModbusStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/modbus_rtu/status');
      const data = await res.json();
      setModbusConnected(data.connected ?? false);
      setModbusPort(data.port ?? "");
      setModbusBaudrate(data.baudrate ?? 0);
      setModbusSlaveId(data.slave_id ?? 0);
      setModbusError(null);
    } catch {
      setModbusError("Cannot reach backend server");
      setModbusConnected(false);
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
      await fetchModbusStatus();
    } catch {
      toast({ title: "Disconnect Failed", description: "Cannot reach backend server", variant: "destructive" });
    } finally {
      setModbusLoading(false);
    }
  }, [toast, fetchModbusStatus]);

  const toggleDevice = useCallback(async (deviceName: string) => {
    setDeviceActionLoading(deviceName);
    try {
      const currentDevice = modbusDevices[deviceName];
      const isOn = currentDevice?.value != null && currentDevice.value > 0;
      const action = isOn ? "stop" : "start";
      const res = await fetch(`/api/modbus_rtu/device/${deviceName}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: data.message });
        await fetchDeviceStatuses();
      } else {
        const msg = data.message || `Failed to ${action} ${deviceName}`;
        const isSlaveFail = msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error");
        toast({
          title: isSlaveFail ? "Slave Not Responding" : "Device Control Failed",
          description: isSlaveFail ? `${msg} — check wiring and slave ID` : msg,
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Device Control Failed", description: "Cannot reach backend server", variant: "destructive" });
    } finally {
      setDeviceActionLoading(null);
    }
  }, [modbusDevices, toast, fetchDeviceStatuses]);

  const writeDeviceValue = useCallback(async (deviceName: string, value: number) => {
    try {
      const res = await fetch(`/api/modbus_rtu/device/${deviceName}/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      const data = await res.json();
      if (data.status === "success") {
        // Silently update — no toast for slider changes
        await fetchDeviceStatuses();
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
    }, 3000);

    return () => clearInterval(interval);
  }, [activeTab, fetchModbusStatus, fetchDeviceStatuses]);

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
      
      <div className="flex-1 overflow-auto p-6 space-y-6">

            {/* === Hardware and Line Info tabs removed for now === */}

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

            {false && <><TabsContent value="hardware" className="mt-6 space-y-6">

              {/* Error Banner */}
              {modbusError && (
                <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{modbusError}</span>
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { fetchModbusStatus(); fetchDeviceStatuses(); }}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Connection Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-rice-primary flex items-center space-x-2">
                    <Monitor className="w-5 h-5" />
                    <span>Modbus RTU Connection</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {modbusConnected ? (
                        <Wifi className="w-5 h-5 text-green-600" />
                      ) : (
                        <WifiOff className="w-5 h-5 text-gray-400" />
                      )}
                      <div>
                        <Label className="text-base font-medium">Connection Status</Label>
                        <p className="text-sm text-gray-600">
                          {modbusConnected
                            ? `Port: ${modbusPort} | Baud: ${modbusBaudrate} | Slave ID: ${modbusSlaveId}`
                            : "Not connected to Modbus RTU device"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        modbusConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {modbusConnected ? 'Connected' : 'Disconnected'}
                      </span>
                      <Button
                        onClick={modbusConnected ? disconnectModbus : connectModbus}
                        disabled={modbusLoading}
                        variant={modbusConnected ? "outline" : "default"}
                        size="sm"
                        className={!modbusConnected ? "bg-rice-primary hover:bg-rice-primary/90" : ""}
                      >
                        {modbusLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        {modbusConnected ? 'Disconnect' : 'Connect'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Device On/Off Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-rice-primary flex items-center space-x-2">
                    <ToggleLeft className="w-5 h-5" />
                    <span>Device Controls</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0 divide-y">
                  {([
                    { key: "led_on_off", icon: Lightbulb, color: "text-yellow-600", label: "LED Light", desc: "Main LED on/off control" },
                    { key: "led_strip_on_off", icon: Zap, color: "text-amber-500", label: "LED Strip", desc: "LED strip on/off control" },
                    { key: "conveyor_on_off", icon: Truck, color: "text-green-600", label: "Conveyor", desc: "Conveyor belt on/off control" },
                    { key: "vibrator_on_off", icon: Activity, color: "text-blue-600", label: "Vibrator", desc: "Vibrator on/off control" },
                    { key: "sensor_bypass", icon: SettingsIcon, color: "text-purple-600", label: "Sensor Bypass", desc: "Bypass the grain sensor" },
                    { key: "auto_start_stop", icon: Play, color: "text-rice-primary", label: "Auto Start/Stop", desc: "Automatic start/stop sequence" },
                  ] as const).map(({ key, icon: Icon, color, label, desc }) => {
                    const device = modbusDevices[key];
                    const isOn = device?.value != null && device.value > 0;
                    const isUnknown = !device || device.status === "UNKNOWN";
                    const isActionLoading = deviceActionLoading === key;

                    return (
                      <div key={key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-5 h-5 ${color}`} />
                          <div>
                            <Label className="text-base font-medium">{label}</Label>
                            <p className="text-sm text-gray-600">{desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            isUnknown
                              ? 'bg-yellow-100 text-yellow-700'
                              : isOn
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}>
                            {isUnknown ? 'No Response' : isOn ? 'ON' : 'OFF'}
                          </span>
                          {isActionLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                          ) : (
                            <Switch
                              checked={isOn}
                              onCheckedChange={() => toggleDevice(key)}
                              disabled={!modbusConnected}
                              className="data-[state=checked]:bg-rice-primary"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Speed / Value Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-rice-primary flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>Speed &amp; Level Controls</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {([
                    { key: "conveyor_rpm", label: "Conveyor RPM", unit: "RPM", min: 5, max: 75, icon: Truck, color: "text-green-600" },
                    { key: "vibrator_percent", label: "Vibrator", unit: "%", min: 1, max: 100, icon: Activity, color: "text-blue-600" },
                    { key: "led_bright_percent", label: "LED Brightness", unit: "%", min: 0, max: 100, icon: Lightbulb, color: "text-yellow-600" },
                    { key: "conveyor_semi_percent", label: "Conveyor Semi", unit: "%", min: 5, max: 75, icon: Truck, color: "text-emerald-600" },
                    { key: "vibrator_semi_percent", label: "Vibrator Semi", unit: "%", min: 1, max: 100, icon: Activity, color: "text-indigo-600" },
                  ] as const).map(({ key, label, unit, min, max, icon: Icon, color }, idx) => {
                    const device = modbusDevices[key];
                    const currentValue = device?.value ?? min;
                    const isUnknown = !device || device.status === "UNKNOWN";

                    return (
                      <div key={key} className={idx > 0 ? "border-t pt-6" : ""}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Icon className={`w-5 h-5 ${color}`} />
                            <Label className="text-base font-medium">{label}</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            {isUnknown ? (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">No Response</span>
                            ) : (
                              <span className="text-sm font-semibold text-gray-700">{currentValue} {unit}</span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Slider
                            value={[currentValue]}
                            onValueChange={(values) => handleSliderChange(key, values)}
                            min={min}
                            max={max}
                            step={1}
                            disabled={!modbusConnected}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{min} {unit}</span>
                            <span>{max} {unit}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Sensor Data (read-only) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-rice-primary flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>Sensor Data</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const sensor = modbusDevices["sensor_data"];
                    const isUnknown = !sensor || sensor.status === "UNKNOWN";
                    const isActive = sensor?.value != null && sensor.value > 0;
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <SettingsIcon className="w-5 h-5 text-cyan-600" />
                          <div>
                            <Label className="text-base font-medium">Grain Sensor</Label>
                            <p className="text-sm text-gray-600">Read-only sensor data from Modbus register</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          isUnknown
                            ? 'bg-yellow-100 text-yellow-700'
                            : isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          {isUnknown ? 'No Response' : isActive ? 'Active (1)' : 'Inactive (0)'}
                        </span>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Hardware Status Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-rice-primary flex items-center space-x-2">
                    <Monitor className="w-5 h-5" />
                    <span>Hardware Status Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(modbusDevices).map(([key, device]) => {
                      const isOn = device.value != null && device.value > 0;
                      const isUnknown = device.status === "UNKNOWN";
                      return (
                        <div key={key} className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 truncate">{device.name || key}</div>
                          <div className={`font-semibold text-sm ${
                            isUnknown ? 'text-yellow-600' : isOn ? 'text-green-600' : 'text-gray-400'
                          }`}>
                            {isUnknown ? 'No Response' : device.value != null ? `${device.value}` : 'OFF'}
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(modbusDevices).length === 0 && (
                      <div className="col-span-full text-center text-sm text-gray-500 py-4">
                        {modbusConnected ? "Loading device statuses..." : "Connect to Modbus RTU to see device statuses"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

            </TabsContent>

            <TabsContent value="line-info" className="mt-6 space-y-6">
              {/* Rice Mill Information Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-rice-primary flex items-center space-x-2">
                    <Building2 className="w-5 h-5" />
                    <span>Rice Mill Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Rice Mill Name */}
                    <div className="space-y-2">
                      <Label htmlFor="mill-name" className="text-sm font-medium">
                        Rice Mill Name
                      </Label>
                      <Input
                        id="mill-name"
                        value={millName}
                        onChange={(e) => setMillName(e.target.value)}
                        placeholder="Enter rice mill name"
                        className="w-full"
                      />
                    </div>

                    {/* Operator Name */}
                    <div className="space-y-2">
                      <Label htmlFor="operator-name" className="text-sm font-medium">
                        Operator Name
                      </Label>
                      <Input
                        id="operator-name"
                        value={operatorName}
                        onChange={(e) => setOperatorName(e.target.value)}
                        placeholder="Enter operator name"
                        className="w-full"
                      />
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-sm font-medium">
                        Location
                      </Label>
                      <Popover open={locationSearchOpen} onOpenChange={handleLocationOpenChange}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={locationSearchOpen}
                            className="w-full justify-between"
                          >
                            {location ? location : "Select or type location..."}
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
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleLocationCommit();
                                }
                              }}
                            />
                            <CommandList>
                              <CommandEmpty>No location found. Press Enter to use typed value.</CommandEmpty>
                              <CommandGroup>
                                {indianCities.map((city) => (
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
                              Press Enter to use "{locationSearchText || 'typed location'}".
                            </div>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Mill Region */}
                    <div className="space-y-2">
                      <Label htmlFor="mill-region" className="text-sm font-medium">
                        Mill Region
                      </Label>
                      <Select value={region} onValueChange={(val) => setRegion(val)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select region..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basmati">Basmati Region</SelectItem>
                          <SelectItem value="non-basmati">Non-Basmati Region</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Determines grain classification categories for analysis
                      </p>
                    </div>

                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4 border-t">
                    <Button 
                      onClick={handleSaveRiceMillInfo}
                      className="bg-rice-primary hover:bg-rice-primary/90"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Line Information Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-rice-primary flex items-center space-x-2">
                    <Factory className="w-5 h-5" />
                    <span>Line Information Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Series List */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Truck className="w-5 h-5 text-blue-600" />
                        <div>
                          <Label className="text-base font-medium">Machine Line</Label>
                          <p className="text-sm text-gray-600">Manage your machine series and configurations</p>
                        </div>
                      </div>
                      <Dialog open={isAddLineDialogOpen} onOpenChange={setIsAddLineDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="bg-rice-primary hover:bg-rice-primary/90">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Series
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Add New Production Series</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            {/* Series Name */}
                            <div className="space-y-2">
                              <Label htmlFor="new-line-name">Series Name</Label>
                              <Input
                                id="new-line-name"
                                value={newLineName}
                                onChange={(e) => setNewLineName(e.target.value)}
                                placeholder="Enter series name (e.g., Series-1, I-5 Series)"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAddLine();
                                  }
                                }}
                              />
                            </div>

                            {/* Series Output */}
                            <div className="space-y-2">
                              <Label htmlFor="new-line-output">Series Output (TPH)</Label>
                              <div className="flex items-center space-x-2">
                                <Input
                                  id="new-line-output"
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={newLineOutput}
                                  onChange={(e) => setNewLineOutput(e.target.value)}
                                  placeholder="10.0"
                                />
                                <span className="text-sm font-medium text-gray-600">TPH</span>
                              </div>
                            </div>

                            {/* Machine Selection */}
                            <div className="space-y-2">
                              <Label>Select Machines for this Line</Label>
                              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                                {availableMachines.length === 0 ? (
                                  <p className="text-sm text-gray-500 text-center py-4">
                                    No machines available. Please add machines first.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {availableMachines.map((machine, index) => (
                                      <div key={index} className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          id={`machine-${index}`}
                                          checked={newLineMachines.includes(machine)}
                                          onChange={() => toggleMachineForNewLine(machine)}
                                          className="w-4 h-4 text-rice-primary border-gray-300 rounded focus:ring-rice-primary"
                                        />
                                        <label htmlFor={`machine-${index}`} className="text-sm font-medium cursor-pointer">
                                          {machineDisplayName(machine)}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {newLineMachines.length > 0 && (
                                <p className="text-xs text-gray-500">
                                  {newLineMachines.length} machine(s) selected
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label>Add Machines (if not listed above)</Label>
                              <div className="flex flex-col gap-2">
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <Input
                                    value={newLineMachineInput}
                                    onChange={(e) => setNewLineMachineInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddCustomMachineToNewLine();
                                      }
                                    }}
                                    placeholder="Enter machine name"
                                    className="flex-1"
                                  />
                                  <Button
                                    type="button"
                                    onClick={handleAddCustomMachineToNewLine}
                                    disabled={!newLineMachineInput.trim()}
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add
                                  </Button>
                                </div>
                                {customMachinesForNewLine.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {customMachinesForNewLine.map((machine) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center gap-1 rounded-full bg-rice-primary/10 text-rice-primary px-3 py-1 text-xs font-medium"
                                      >
                                        {machineDisplayName(machine)}
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveMachineFromNewLine(typeof machine === "string" ? machine : machineDisplayName(machine as Record<string, unknown>))}
                                          className="text-rice-primary/80 hover:text-rice-primary"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <p className="text-xs text-gray-500">
                                  Machines added here become available globally after you create the line.
                                </p>
                              </div>
                            </div>

                            <div className="flex justify-end space-x-2 pt-4 border-t">
                              <Button variant="outline" onClick={() => setIsAddLineDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleAddLine} disabled={!newLineName.trim()}>
                                <Save className="w-4 h-4 mr-2" />
                                Create Series
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Series List */}
                    {lines.length > 0 ? (
                      <div className="space-y-3">
                        {lines.map((line, index) => (
                          <div
                            key={line.id}
                            onClick={() => setCurrentLineIndex(index)}
                            className={`p-4 border rounded-lg cursor-pointer transition-all ${
                              currentLineIndex === index 
                                ? 'border-rice-primary bg-rice-primary/5 shadow-md' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-semibold text-gray-900">{line.name}</h4>
                                  {currentLineIndex === index && (
                                    <span className="px-2 py-0.5 bg-rice-primary text-white rounded-full text-xs font-medium">
                                      Selected
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                                  <span>Output: <strong>{line.output} TPH</strong></span>
                                  <span>Machines: <strong>{line.machines.length}</strong></span>
                                </div>
                                {/* Machine names hidden from series cards */}
                                {/* {line.machines.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {line.machines.map((machine, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-1 bg-rice-primary/10 text-rice-primary rounded-full text-xs font-medium"
                                      >
                                        {machineDisplayName(machine)}
                                      </span>
                                    ))}
                                  </div>
                                )} */}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteLine(index);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Factory className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No production series configured</p>
                        <p className="text-sm">Add your first series to get started</p>
                      </div>
                    )}
                  </div>

                  {/* Machine Management */}
                  <div className="space-y-4 border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Package className="w-5 h-5 text-green-600" />
                        <div>
                          <Label className="text-base font-medium">
                            Machine Configuration
                            {lines.length > 0 && currentLineIndex >= 0 && currentLineIndex < lines.length && (
                              <span className="ml-2 text-sm font-normal text-gray-600">
                                - {lines[currentLineIndex].name}
                              </span>
                            )}
                          </Label>
                          <p className="text-sm text-gray-600">
                            {lines.length > 0 && currentLineIndex >= 0 
                              ? `Manage machines for the selected series`
                              : "Select a series to manage its machines"}
                          </p>
                        </div>
                      </div>
                      <Dialog open={isAddMachineDialogOpen} onOpenChange={handleAddMachineDialogOpenChange}>
                        <DialogTrigger asChild>
                          <Button 
                            className="bg-rice-primary hover:bg-rice-primary/90"
                            disabled={lines.length === 0 || currentLineIndex < 0}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Machine to Series
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>
                              Add Machine to {lines.length > 0 && currentLineIndex >= 0 ? lines[currentLineIndex].name : 'Series'}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Select Machines for this Series</Label>
                              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                                {selectableMachinesForCurrentSeries.length === 0 ? (
                                  <p className="text-sm text-gray-500 text-center py-4">
                                    All available machines are already part of this series. Add new machines below.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {selectableMachinesForCurrentSeries.map((machine, index) => (
                                      <div key={index} className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          id={`series-machine-${index}`}
                                          checked={selectedMachinesForSeries.includes(typeof machine === "string" ? machine : machineDisplayName(machine as Record<string, unknown>))}
                                          onChange={() => toggleMachineForSeriesDialog(typeof machine === "string" ? machine : machineDisplayName(machine as Record<string, unknown>))}
                                          className="w-4 h-4 text-rice-primary border-gray-300 rounded focus:ring-rice-primary"
                                        />
                                        <label htmlFor={`series-machine-${index}`} className="text-sm font-medium cursor-pointer">
                                          {machineDisplayName(machine)}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Add Machines (if not listed above)</Label>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Input
                                  value={machineDialogInput}
                                  onChange={(e) => setMachineDialogInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddCustomMachineToSeriesDialog();
                                    }
                                  }}
                                  placeholder="Enter machine name"
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  onClick={handleAddCustomMachineToSeriesDialog}
                                  disabled={!machineDialogInput.trim()}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add
                                </Button>
                              </div>
                              {customMachinesForSeries.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {customMachinesForSeries.map((machine, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 rounded-full bg-rice-primary/10 text-rice-primary px-3 py-1 text-xs font-medium"
                                    >
                                      {machineDisplayName(machine)}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMachineFromSeriesDialog(typeof machine === "string" ? machine : machineDisplayName(machine as Record<string, unknown>))}
                                        className="text-rice-primary/80 hover:text-rice-primary"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs text-gray-500">
                                Machines added here become available globally after you save.
                              </p>
                            </div>

                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => handleAddMachineDialogOpenChange(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleAddMachinesToSeries} disabled={selectedMachinesForSeries.length === 0}>
                                Add Machine{selectedMachinesForSeries.length > 1 ? 's' : ''}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Machine List */}
                    <div className="space-y-3">
                      {lines.length > 0 && currentLineIndex >= 0 ? (
                        <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                          {lines[currentLineIndex].machines.length > 0 ? (
                            lines[currentLineIndex].machines.map((machine, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 bg-rice-primary rounded-full"></div>
                                  <span className="font-medium text-gray-800">{machineDisplayName(machine)}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                              <p>No machines in this series</p>
                              <p className="text-sm">Click on "Add Machine" above to add machines to this series</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>No series selected</p>
                          <p className="text-sm">Select a series above to view its machines</p>
                        </div>
                      )}
                    </div>

                    {/* Machine Summary */}
                    {lines.length > 0 && currentLineIndex >= 0 && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3 text-gray-800">Series Summary</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-sm text-gray-600">Series Name</div>
                            <div className="font-semibold text-rice-primary text-lg">
                              {lines[currentLineIndex].name}
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-sm text-gray-600">Series Output</div>
                            <div className="font-semibold text-rice-primary text-lg">
                              {lines[currentLineIndex].output} TPH
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                            <div className="text-sm text-gray-600">Total Machines in Series</div>
                            <div className="font-semibold text-rice-primary text-lg">
                              {lines[currentLineIndex].machines.length}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Reports tab content commented out */}
            </TabsContent></>}

            {/* Mill Region selector */}
              <Card className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-rice-primary" />
                    <span className="text-base font-semibold text-rice-primary">Mill Region</span>
                  </div>
                  <RadioGroup
                    value={region}
                    onValueChange={(val) => {
                      setRegion(val);
                      localStorage.setItem('riceMill_region', val);
                      persistMillInformation({ region: val });
                    }}
                    className="flex items-center gap-4"
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

            {/* <TabsContent value="reports" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-rice-primary flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>{t('settings.reports')} Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Report generation and export settings will be available here.</p>
                </CardContent>
              </Card>
            </TabsContent> */}
      </div>
    </div>
  );
};

export default Settings; 