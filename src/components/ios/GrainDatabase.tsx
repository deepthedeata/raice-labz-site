import { useState, useEffect, useMemo, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Database, Plus, Save, Trash2, ChevronDown, ChevronUp, ChevronRight, Wheat, Pencil, FolderTree } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useGrainInfo } from "@/hooks/useGrainInfo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

/** localStorage keys for variety/process options (shared with TellUsAboutGrain) */
const STORAGE_KEY_VARIETIES = "grain_varieties_custom";
const STORAGE_KEY_PROCESSES = "grain_processes_custom";
const STORAGE_KEY_HIDDEN_VARIETIES = "grain_varieties_hidden";
const STORAGE_KEY_HIDDEN_PROCESSES = "grain_processes_hidden";

const VARIETY_BUILTIN: { value: string; label: string }[] = [
  { value: "ambemohar", label: "Ambemohar" },
  { value: "sona", label: "Sona" },
  { value: "adt", label: "ADT" },
  { value: "jsr", label: "JSR" },
  { value: "gobindobhog", label: "Gobindobhog" },
  { value: "hmt", label: "HMT" },
  { value: "indrayani", label: "Indrayani" },
  { value: "jeera-samba", label: "Jeera Samba" },
  { value: "rnr", label: "RNR" },
  { value: "mogra", label: "Mogra" },
  { value: "jaya", label: "Jaya" },
  { value: "matta", label: "Matta" },
  { value: "parmal", label: "Parmal" },
  { value: "ponni", label: "Ponni" },
  { value: "pusa-basmati", label: "Pusa Basmati" },
  { value: "sharbati", label: "Sharbati" },
  { value: "sona-masuri", label: "Sona Masuri" },
  { value: "kolam", label: "Kolam" },
  { value: "bpt", label: "BPT" },
  { value: "katarni", label: "Katarni" },
  { value: "mtu-1010", label: "MTU 1010" },
  { value: "ir-64", label: "IR 64" },
  { value: "rpn", label: "RPN" },
  { value: "ranjith", label: "Ranjith" },
  { value: "cauvery", label: "Cauvery" },
  { value: "baismutti", label: "Baismutti" },
  { value: "vnr", label: "VNR" },
  { value: "1509", label: "1509" },
  { value: "1121", label: "1121" },
];

const PROCESS_BUILTIN: { value: string; label: string }[] = [
  { value: "raw", label: "Raw" },
  { value: "double-boiled", label: "Double Boiled" },
  { value: "single-boiled", label: "Single Boiled" },
  { value: "half-boiled", label: "Half Boiled" },
  { value: "sap", label: "SAP" },
  { value: "super-parboiling", label: "Super Parboiling" },
];

const BASMATI_PROCESS_BUILTIN: { value: string; label: string }[] = [
  { value: "golden-sella", label: "Golden Sella" },
  { value: "white-sella", label: "White Sella" },
  { value: "lemon-sella", label: "Lemon Sella" },
  { value: "sw-sella", label: "SW Sella" },
  { value: "cream-steam", label: "Cream Steam" },
  { value: "lemon-steam", label: "Lemon Steam" },
  { value: "parboiled", label: "Parboiled" },
];

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "basmati", label: "Basmati" },
  { value: "non-basmati", label: "Non-Basmati" },
];

const GRAIN_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "long-grain", label: "Long grain" },
  { value: "medium-grain", label: "Medium Grain" },
  { value: "short-grain", label: "Short Grain" },
];

interface GrainEntry {
  _id?: string;
  variety: string;
  process: string;
  harvestSeason?: string;
  month?: string;
  category?: string;
  grainType?: string;
  MorphologicalProperties?: {
    length: { value: number; unit: string; description: string };
    breadth: { value: number; unit: string; description: string };
    weight: { value: number; unit: string; description: string };
    aspectRatio: { value: number; unit: string | null; description: string };
    hardness: { value: number; unit: string; description: string };
  };
  chemicalProperties?: {
    protein: { value: number; unit: string; description: string };
    carbohydrate: { value: number; unit: string; description: string };
    vitamin: { value: number; unit: string; description: string };
    mineral: { value: number; unit: string; description: string };
    lipids: { value: number; unit: string; description: string };
  };
  gmadProperties?: {
    gelatinization: { value: number; unit: string; description: string };
    moisture: { value: number; unit: string; description: string };
    age: { value: number; unit: string; description: string };
    density: { value: number; unit: string; description: string };
  };
  customProperties?: Array<{
    id: string;
    name: string;
    value: string;
    unit?: string;
  }>;
}

interface EditableProperties {
  geoProperties: {
    length: string;
    breadth: string;
    weight: string;
    aspectRatio: string;
    hardness: string;
  };
  chemicalProperties: {
    protein: string;
    carbohydrate: string;
    vitamin: string;
    mineral: string;
    lipids: string;
  };
  gmadProperties: {
    gelatinization: string;
    moisture: string;
    age: string;
    density: string;
  };
}

const emptyProperties: EditableProperties = {
  geoProperties: { length: "", breadth: "", weight: "", aspectRatio: "", hardness: "" },
  chemicalProperties: { protein: "", carbohydrate: "", vitamin: "", mineral: "", lipids: "" },
  gmadProperties: { gelatinization: "", moisture: "", age: "", density: "" },
};

/** Default property values for new grain (initial setup - same as TellUsAboutGrain) */
const DEFAULT_PROPERTY_VALUES: EditableProperties = {
  geoProperties: {
    length: "4.5",
    breadth: "2.3",
    weight: "22.5",
    aspectRatio: "2.4",
    hardness: "45",
  },
  chemicalProperties: {
    protein: "7.2",
    carbohydrate: "78.9",
    vitamin: "0.4",
    mineral: "1.3",
    lipids: "2.8",
  },
  gmadProperties: {
    gelatinization: "",
    moisture: "14.5",
    age: "6",
    density: "",
  },
};

/** Variety-based gelatinization and density (same as TellUsAboutGrain) */
function getVarietyProperties(selectedVariety: string): { gelatinization: string; density: string } {
  const key = selectedVariety.toLowerCase().replace(/-/g, " ");
  const varietyData: Record<string, { gelatinization: string; density: string }> = {
    ambemohar: { gelatinization: "68", density: "1.42" },
    sona: { gelatinization: "72", density: "1.38" },
    adt: { gelatinization: "70", density: "1.40" },
    jsr: { gelatinization: "69", density: "1.41" },
    gobindobhog: { gelatinization: "71", density: "1.39" },
    hmt: { gelatinization: "73", density: "1.37" },
    indrayani: { gelatinization: "67", density: "1.43" },
    "jeera samba": { gelatinization: "74", density: "1.36" },
    rnr: { gelatinization: "66", density: "1.44" },
    mogra: { gelatinization: "75", density: "1.35" },
    jaya: { gelatinization: "69", density: "1.41" },
    matta: { gelatinization: "76", density: "1.34" },
    parmal: { gelatinization: "68", density: "1.42" },
    ponni: { gelatinization: "70", density: "1.40" },
    "pusa basmati": { gelatinization: "77", density: "1.33" },
    sharbati: { gelatinization: "71", density: "1.39" },
    "sona masuri": { gelatinization: "72", density: "1.38" },
    kolam: { gelatinization: "69", density: "1.41" },
    bpt: { gelatinization: "70", density: "1.40" },
    katarni: { gelatinization: "73", density: "1.37" },
    "mtu 1010": { gelatinization: "68", density: "1.42" },
    "ir 64": { gelatinization: "71", density: "1.39" },
    rpn: { gelatinization: "69", density: "1.41" },
    ranjith: { gelatinization: "72", density: "1.38" },
    cauvery: { gelatinization: "70", density: "1.40" },
    baismutti: { gelatinization: "74", density: "1.36" },
    vnr: { gelatinization: "67", density: "1.43" },
    "1509": { gelatinization: "75", density: "1.35" },
    "1121": { gelatinization: "76", density: "1.34" },
  };
  return varietyData[key] ?? { gelatinization: "65", density: "1.4" };
}

/** Process details form for parboiling-type processes (same as TellUsAboutGrain) */
interface ProcessDetailsFormProps {
  process: string;
  processDetails: Record<string, Record<string, string>>;
  setProcessDetails: (details: Record<string, Record<string, string>>) => void;
  onClose: () => void;
}

const PROCESS_DETAILS_CONFIGS: Record<string, Array<{ stage: string; parameter: string; unit: string; key: string }>> = {
  "double-boiled": [
    { stage: "Presteaming", parameter: "Type", unit: "Holding/Continuous", key: "presteaming_type" },
    { stage: "Presteaming", parameter: "Temperature", unit: "°C", key: "presteaming_temperature" },
    { stage: "Presteaming", parameter: "Steaming time (Holding)", unit: "mins", key: "presteaming_time" },
    { stage: "Soaking time", parameter: "Temperature", unit: "°C", key: "soaking_temperature" },
    { stage: "Soaking time", parameter: "Time", unit: "mins", key: "soaking_time" },
    { stage: "Final Steaming", parameter: "Type", unit: "Holding/Continuous", key: "final_steaming_type" },
    { stage: "Final Steaming", parameter: "Temperature", unit: "°C", key: "final_steaming_temperature" },
    { stage: "Final Steaming", parameter: "Steaming time (Holding)", unit: "mins", key: "final_steaming_time" },
    { stage: "Drying", parameter: "Time", unit: "mins", key: "drying_time" },
    { stage: "Drying", parameter: "Max temp", unit: "°C", key: "drying_max_temp" },
    { stage: "Drying", parameter: "Min temp", unit: "°C", key: "drying_min_temp" },
    { stage: "Drying", parameter: "Final Moisture", unit: "%", key: "drying_final_moisture" },
  ],
  "single-boiled": [
    { stage: "Soaking time", parameter: "Temperature", unit: "°C", key: "soaking_temperature" },
    { stage: "Soaking time", parameter: "Time", unit: "mins", key: "soaking_time" },
    { stage: "Final Steaming", parameter: "Type", unit: "Holding/Continuous", key: "final_steaming_type" },
    { stage: "Final Steaming", parameter: "Temperature", unit: "°C", key: "final_steaming_temperature" },
    { stage: "Final Steaming", parameter: "Steaming time (Holding)", unit: "mins", key: "final_steaming_time" },
    { stage: "Drying", parameter: "Time", unit: "mins", key: "drying_time" },
    { stage: "Drying", parameter: "Max temp", unit: "°C", key: "drying_max_temp" },
    { stage: "Drying", parameter: "Min temp", unit: "°C", key: "drying_min_temp" },
    { stage: "Drying", parameter: "Final Moisture", unit: "%", key: "drying_final_moisture" },
  ],
  "half-boiled": [
    { stage: "Soaking time", parameter: "Temperature", unit: "°C", key: "soaking_temperature" },
    { stage: "Soaking time", parameter: "Time", unit: "mins", key: "soaking_time" },
    { stage: "Final Steaming", parameter: "Type", unit: "Holding/Continuous", key: "final_steaming_type" },
    { stage: "Final Steaming", parameter: "Temperature", unit: "°C", key: "final_steaming_temperature" },
    { stage: "Final Steaming", parameter: "Steaming time (Holding)", unit: "mins", key: "final_steaming_time" },
    { stage: "Drying", parameter: "Time", unit: "mins", key: "drying_time" },
    { stage: "Drying", parameter: "Max temp", unit: "°C", key: "drying_max_temp" },
    { stage: "Drying", parameter: "Min temp", unit: "°C", key: "drying_min_temp" },
    { stage: "Drying", parameter: "Final Moisture", unit: "%", key: "drying_final_moisture" },
  ],
  sap: [
    { stage: "Presteaming", parameter: "Type", unit: "Holding/Continuous", key: "presteaming_type" },
    { stage: "Presteaming", parameter: "Temperature", unit: "°C", key: "presteaming_temperature" },
    { stage: "Presteaming", parameter: "Steaming time (Holding)", unit: "mins", key: "presteaming_time" },
    { stage: "Resting time", parameter: "Temperature", unit: "°C", key: "resting_temperature" },
    { stage: "Resting time", parameter: "Time", unit: "mins", key: "resting_time" },
    { stage: "Drying", parameter: "Time", unit: "mins", key: "drying_time" },
    { stage: "Drying", parameter: "Max temp", unit: "°C", key: "drying_max_temp" },
    { stage: "Drying", parameter: "Min temp", unit: "°C", key: "drying_min_temp" },
    { stage: "Drying", parameter: "Final Moisture", unit: "%", key: "drying_final_moisture" },
  ],
  "super-parboiling": [
    { stage: "Steaming", parameter: "Type", unit: "Holding/Continuous", key: "steaming_type" },
    { stage: "Steaming", parameter: "Temperature", unit: "°C", key: "steaming_temperature" },
    { stage: "Steaming", parameter: "Steaming time (Holding)", unit: "mins", key: "steaming_time" },
    { stage: "Resting time", parameter: "Temperature", unit: "°C", key: "resting_temperature" },
    { stage: "Resting time", parameter: "Time", unit: "mins", key: "resting_time" },
    { stage: "Soaking time", parameter: "Temperature", unit: "°C", key: "soaking_temperature" },
    { stage: "Soaking time", parameter: "Time", unit: "mins", key: "soaking_time" },
    { stage: "Final Steaming", parameter: "Type", unit: "Holding/Continuous", key: "final_steaming_type" },
    { stage: "Final Steaming", parameter: "Temperature", unit: "°C", key: "final_steaming_temperature" },
    { stage: "Final Steaming", parameter: "Steaming time (Holding)", unit: "mins", key: "final_steaming_time" },
    { stage: "Drying", parameter: "Time", unit: "mins", key: "drying_time" },
    { stage: "Drying", parameter: "Max temp", unit: "°C", key: "drying_max_temp" },
    { stage: "Drying", parameter: "Min temp", unit: "°C", key: "drying_min_temp" },
    { stage: "Drying", parameter: "Final Moisture", unit: "%", key: "drying_final_moisture" },
  ],
};

function ProcessDetailsForm({ process, processDetails, setProcessDetails, onClose }: ProcessDetailsFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>(processDetails[process] ?? {});

  const currentConfig = PROCESS_DETAILS_CONFIGS[process] ?? [];

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setProcessDetails((prev) => ({ ...prev, [process]: formData }));
    onClose();
  };

  const groupedByStage = currentConfig.reduce(
    (acc, item) => {
      if (!acc[item.stage]) acc[item.stage] = [];
      acc[item.stage].push(item);
      return acc;
    },
    {} as Record<string, typeof currentConfig>
  );

  return (
    <div className="space-y-6">
      {Object.entries(groupedByStage).map(([stageName, stageItems]) => (
        <div key={stageName} className="space-y-4">
          <h3 className="text-lg font-semibold text-rice-primary border-b border-gray-200 pb-2">{stageName}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stageItems.map((item) => (
              <div key={item.key} className="space-y-2">
                <Label htmlFor={item.key} className="font-medium">
                  {item.parameter} ({item.unit})
                </Label>
                {item.unit === "Holding/Continuous" ? (
                  <Select value={formData[item.key] ?? ""} onValueChange={(value) => handleInputChange(item.key, value)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="holding">Holding</SelectItem>
                      <SelectItem value="continuous">Continuous</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={item.key}
                    type={item.unit === "%" || item.unit.includes("°") || item.unit === "mins" ? "number" : "text"}
                    value={formData[item.key] ?? ""}
                    onChange={(e) => handleInputChange(item.key, e.target.value)}
                    placeholder={`Enter ${item.parameter.toLowerCase()}`}
                    className="h-10"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} className="bg-rice-primary hover:bg-rice-primary/90">Save Details</Button>
      </div>
    </div>
  );
}

function mapEntryToEditable(entry: GrainEntry): EditableProperties {
  return {
    geoProperties: {
      length: entry.MorphologicalProperties?.length?.value?.toString() || "",
      breadth: entry.MorphologicalProperties?.breadth?.value?.toString() || "",
      weight: entry.MorphologicalProperties?.weight?.value?.toString() || "",
      aspectRatio: entry.MorphologicalProperties?.aspectRatio?.value?.toString() || "",
      hardness: entry.MorphologicalProperties?.hardness?.value?.toString() || "",
    },
    chemicalProperties: {
      protein: entry.chemicalProperties?.protein?.value?.toString() || "",
      carbohydrate: entry.chemicalProperties?.carbohydrate?.value?.toString() || "",
      vitamin: entry.chemicalProperties?.vitamin?.value?.toString() || "",
      mineral: entry.chemicalProperties?.mineral?.value?.toString() || "",
      lipids: entry.chemicalProperties?.lipids?.value?.toString() || "",
    },
    gmadProperties: {
      gelatinization: entry.gmadProperties?.gelatinization?.value?.toString() || "",
      moisture: entry.gmadProperties?.moisture?.value?.toString() || "",
      age: entry.gmadProperties?.age?.value?.toString() || "",
      density: entry.gmadProperties?.density?.value?.toString() || "",
    },
  };
}

const GrainDatabase = ({ embedded = false }: { embedded?: boolean }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { saveGrainInfo, updateGrainInfo, checkGrainInfoExists, error: grainInfoError } = useGrainInfo();

  const [millRegion] = useState<string>(() => localStorage.getItem("riceMill_region") ?? "non-basmati");

  const [allEntries, setAllEntries] = useState<GrainEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [duplicateHighlightIndex, setDuplicateHighlightIndex] = useState<number | null>(null);
  /** Only true after duplicate check has run and found no duplicate; prevents optional section flashing on before check completes */
  const [showOptionalAddSection, setShowOptionalAddSection] = useState(false);
  const addSectionRef = useRef<HTMLDivElement>(null);
  const [editProps, setEditProps] = useState<EditableProperties>(emptyProperties);
  const [searchQuery, setSearchQuery] = useState("");

  // Expandable add-grain section (no dialog)
  const [addSectionExpanded, setAddSectionExpanded] = useState(true);
  const [newCategory, setNewCategory] = useState("");
  const [newGrainType, setNewGrainType] = useState("");
  const [newVariety, setNewVariety] = useState("");
  const [newProcess, setNewProcess] = useState("");
  const [newHarvestSeason, setNewHarvestSeason] = useState("");
  const [newMonth, setNewMonth] = useState("");
  // Optional properties for new entry (morphological only)
  const [newEntryProps, setNewEntryProps] = useState<EditableProperties>(emptyProperties);
  // Process details for add form (same as TellUsAboutGrain - double-boiled, single-boiled, etc.)
  const [newProcessDetails, setNewProcessDetails] = useState<Record<string, Record<string, string>>>({});
  const [isNewProcessDetailsDialogOpen, setIsNewProcessDetailsDialogOpen] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GrainEntry | null>(null);

  /** Which categories are expanded in the Grain Classification tree (default: all open) */
  const [classificationOpen, setClassificationOpen] = useState<Record<string, boolean>>({});

  // Variety/Process "Others" dialogs and custom lists (same structure as TellUsAboutGrain)
  const [isVarietyDialogOpen, setIsVarietyDialogOpen] = useState(false);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [customVariety, setCustomVariety] = useState("");
  const [customProcess, setCustomProcess] = useState("");
  const [savedCustomVarieties, setSavedCustomVarieties] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_VARIETIES);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error("Error loading saved varieties:", e);
    }
    return [];
  });
  const [savedCustomProcesses, setSavedCustomProcesses] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PROCESSES);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error("Error loading saved processes:", e);
    }
    return [];
  });
  const [hiddenVarieties, setHiddenVarieties] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HIDDEN_VARIETIES);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error("Error loading hidden varieties:", e);
    }
    return [];
  });
  const [hiddenProcesses, setHiddenProcesses] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HIDDEN_PROCESSES);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error("Error loading hidden processes:", e);
    }
    return [];
  });

  // Sorted options: built-in (minus hidden) + custom, alphabetical, "Others" last (same as TellUsAboutGrain)
  const varietyOptionsSorted = useMemo(() => {
    const hiddenValues = new Set(hiddenVarieties.map((v) => v.toLowerCase()));
    const builtInFiltered = VARIETY_BUILTIN.filter((v) => !hiddenValues.has(v.value.toLowerCase()));
    const builtInValues = new Set(VARIETY_BUILTIN.map((o) => o.value.toLowerCase()));
    const customOnly = savedCustomVarieties
      .map((s) => s.trim())
      .filter((name) => name && !builtInValues.has(name.toLowerCase()) && !hiddenValues.has(name.toLowerCase()))
      .map((name) => ({ value: name, label: name }));
    const combined = [...builtInFiltered, ...customOnly];
    combined.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    combined.push({ value: "others", label: "Others" });
    return combined;
  }, [savedCustomVarieties, hiddenVarieties]);

  const processOptionsSorted = useMemo(() => {
    const baseList = millRegion === "basmati" ? BASMATI_PROCESS_BUILTIN : PROCESS_BUILTIN;
    const hiddenValues = new Set(hiddenProcesses.map((p) => p.toLowerCase()));
    const builtInFiltered = baseList.filter((p) => !hiddenValues.has(p.value.toLowerCase()));
    const builtInValues = new Set(baseList.map((o) => o.value.toLowerCase()));
    const customOnly = savedCustomProcesses
      .map((s) => s.trim())
      .filter((name) => name && !builtInValues.has(name.toLowerCase()) && !hiddenValues.has(name.toLowerCase()))
      .map((name) => ({ value: name, label: name }));
    const combined = [...builtInFiltered, ...customOnly];
    combined.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    combined.push({ value: "others", label: "Others" });
    return combined;
  }, [savedCustomProcesses, hiddenProcesses, millRegion]);

  const fetchAllEntries = async () => {
    setLoadingEntries(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/raice_labz/grain-info`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === "success") {
          setAllEntries(data.grain_info_list ?? data.grain_info ?? []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch grain entries:", err);
      toast({ title: "Error", description: "Failed to load grain database", variant: "destructive" });
    } finally {
      setLoadingEntries(false);
    }
  };

  useEffect(() => {
    fetchAllEntries();
  }, []);

  // Clear month when harvest season changes (same behaviour as TellUsAboutGrain)
  useEffect(() => {
    setNewMonth("");
  }, [newHarvestSeason]);

  // Initial setup: when add section expands, fill optional morphological properties from config
  useEffect(() => {
    if (!addSectionExpanded) return;
    setNewEntryProps((prev) => ({
      ...prev,
      geoProperties: DEFAULT_PROPERTY_VALUES.geoProperties,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSectionExpanded]);

  const handleSelectEntry = (index: number) => {
    setSelectedIndex(index);
    setEditProps(mapEntryToEditable(allEntries[index]));
    setDuplicateHighlightIndex(null);
  };

  const handleDeselectEntry = () => {
    setSelectedIndex(null);
    setEditProps(emptyProperties);
    setDuplicateHighlightIndex(null);
  };

  const updateGeoProp = (key: string, value: string) => {
    setEditProps((prev) => {
      const updated = { ...prev.geoProperties, [key]: value };
      if (key === "length" || key === "breadth") {
        const l = parseFloat(key === "length" ? value : updated.length);
        const b = parseFloat(key === "breadth" ? value : updated.breadth);
        updated.aspectRatio = l > 0 && b > 0 ? (l / b).toFixed(2) : "";
      }
      return { ...prev, geoProperties: updated };
    });
  };

  const updateChemProp = (key: string, value: string) => {
    setEditProps((prev) => ({
      ...prev,
      chemicalProperties: { ...prev.chemicalProperties, [key]: value },
    }));
  };

  const updateGmadProp = (key: string, value: string) => {
    setEditProps((prev) => ({
      ...prev,
      gmadProperties: { ...prev.gmadProperties, [key]: value },
    }));
  };

  // Updater for new-entry optional properties (morphological only)
  const updateNewGeoProp = (key: string, value: string) => {
    setNewEntryProps((prev) => {
      const updated = { ...prev.geoProperties, [key]: value };
      if (key === "length" || key === "breadth") {
        const l = parseFloat(key === "length" ? value : updated.length);
        const b = parseFloat(key === "breadth" ? value : updated.breadth);
        updated.aspectRatio = l > 0 && b > 0 ? (l / b).toFixed(2) : "";
      }
      return { ...prev, geoProperties: updated };
    });
  };

  const handleSave = async () => {
    if (selectedIndex === null) return;
    const entry = allEntries[selectedIndex];

    try {
      const payload = {
        variety: entry.variety,
        process: entry.process,
        harvestSeason: entry.harvestSeason,
        month: entry.month,
        category: entry.category,
        grainType: entry.grainType,
        geoProperties: editProps.geoProperties,
        chemicalProperties: editProps.chemicalProperties,
        gmadProperties: editProps.gmadProperties,
      };

      const success = await updateGrainInfo(entry.variety, entry.process, payload, entry.harvestSeason);
      if (success) {
        toast({ title: "Success", description: "Grain info updated successfully" });
        await fetchAllEntries();
        handleDeselectEntry();
      } else {
        toast({
          title: "Error",
          description: grainInfoError ?? "Failed to update grain info. Check console for details.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred while saving grain info",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleAddNew = async () => {
    if (!newCategory || !newGrainType || !newVariety || !newProcess || !newHarvestSeason) {
      toast({
        title: "Error",
        description: "Category, Grain Type, Variety, Process and Harvest Season are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const exists = await checkGrainInfoExists(
        newVariety,
        newProcess,
        newHarvestSeason,
        newCategory,
        newGrainType
      );

      if (exists) {
        // Highlight existing entry and show toast, but do NOT save/update (match by category + grainType + variety + process + harvestSeason)
        const matchIndex = allEntries.findIndex((e) => {
          const cat = (e.category || "").toLowerCase();
          const gt = (e.grainType || "").toLowerCase();
          const es = (e.harvestSeason || "").toLowerCase();
          const ns = (newHarvestSeason || "").toLowerCase();
          return (
            cat === newCategory.toLowerCase() &&
            gt === newGrainType.toLowerCase() &&
            e.variety === newVariety &&
            e.process === newProcess &&
            es === ns
          );
        });

        if (matchIndex !== -1) {
          setDuplicateHighlightIndex(matchIndex);
        }

        toast({
          title: "Already in database",
          description: "This variety is already saved to the Grain Database.",
        });
        return;
      }

      const grainInfoData = {
        variety: newVariety,
        process: newProcess,
        harvestSeason: newHarvestSeason,
        month: newMonth || undefined,
        category: String(newCategory ?? ""),
        grainType: String(newGrainType ?? ""),
        geoProperties: newEntryProps.geoProperties,
        ...(newProcessDetails[newProcess] && Object.keys(newProcessDetails[newProcess]).length > 0
          ? { processDetails: newProcessDetails[newProcess] }
          : {}),
      };

      const success = await saveGrainInfo(grainInfoData);
      if (success) {
        toast({
          title: "Success",
          description: "✅ Variety successfully saved to the Grain Database.",
        });
        setNewCategory("");
        setNewGrainType("");
        setNewVariety("");
        setNewProcess("");
        setNewHarvestSeason("");
        setNewMonth("");
        setNewEntryProps(emptyProperties);
        setNewProcessDetails({});
        setDuplicateHighlightIndex(null);
        setShowOptionalAddSection(false);
        await fetchAllEntries();
      } else {
        toast({
          title: "Error",
          description: grainInfoError ?? "Failed to save grain info. Check console for details.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred while saving grain info",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // When Category + Grain Type + Variety + Process are filled, check if this combination already exists.
  // Optional section is only shown after check completes with no duplicate (avoids flash).
  // Effect runs only when primary form fields change so the debounce timer can complete.
  useEffect(() => {
    if (!newCategory || !newGrainType || !newVariety || !newProcess) {
      setDuplicateHighlightIndex(null);
      setShowOptionalAddSection(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const exists = await checkGrainInfoExists(
          newVariety,
          newProcess,
          newHarvestSeason || undefined,
          newCategory,
          newGrainType
        );
        if (cancelled) return;
        if (!exists) {
          setDuplicateHighlightIndex(null);
          setShowOptionalAddSection(true);
          return;
        }

        // Find matching entry in the table to highlight (same uniqueness: category + grainType + variety + process + harvestSeason)
        const matchIndex = allEntries.findIndex((e) => {
          const cat = (e.category || "").toLowerCase();
          const gt = (e.grainType || "").toLowerCase();
          const es = (e.harvestSeason || "").toLowerCase();
          const ns = (newHarvestSeason || "").toLowerCase();
          return (
            cat === newCategory.toLowerCase() &&
            gt === newGrainType.toLowerCase() &&
            e.variety === newVariety &&
            e.process === newProcess &&
            es === ns
          );
        });

        if (matchIndex !== -1) {
          setDuplicateHighlightIndex(matchIndex);
          setShowOptionalAddSection(false);
          toast({
            title: "Already in database",
            description: "This variety is already saved to the Grain Database.",
          });
        } else {
          setDuplicateHighlightIndex(null);
          setShowOptionalAddSection(true);
        }
      } catch (err) {
        console.error("Error during duplicate check:", err);
        setShowOptionalAddSection(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    newCategory,
    newGrainType,
    newVariety,
    newProcess,
    newHarvestSeason,
  ]);

  /** Clear add form and duplicate highlight (used on cancel and when clicking outside while duplicate is highlighted) */
  const clearAddFormAndHighlight = () => {
    setNewCategory("");
    setNewGrainType("");
    setNewVariety("");
    setNewProcess("");
    setNewHarvestSeason("");
    setNewMonth("");
    setNewEntryProps(emptyProperties);
    setNewProcessDetails({});
    setDuplicateHighlightIndex(null);
    setShowOptionalAddSection(false);
  };

  const handleCancelAdd = () => {
    setAddSectionExpanded(false);
    clearAddFormAndHighlight();
  };

  // When duplicate row is highlighted, clicking outside the add-grain section clears the form and highlight
  useEffect(() => {
    if (duplicateHighlightIndex === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (addSectionRef.current?.contains(e.target as Node)) return;
      clearAddFormAndHighlight();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [duplicateHighlightIndex]);

  // Variety/Process change: "Others" opens dialog; otherwise set value (same as TellUsAboutGrain)
  const handleNewVarietyChange = (value: string) => {
    if (value === "others") {
      setIsVarietyDialogOpen(true);
    } else {
      setNewVariety(value);
    }
  };

  const handleNewProcessChange = (value: string) => {
    if (value === "others") {
      setIsProcessDialogOpen(true);
    } else {
      setNewProcess(value);
    }
  };

  const handleCustomVarietySubmit = () => {
    const varietyValue = customVariety.trim();
    if (!varietyValue) return;
    const alreadySaved = savedCustomVarieties.some(
      (v) => v.trim().toLowerCase() === varietyValue.toLowerCase()
    );
    if (!alreadySaved) {
      const next = [...savedCustomVarieties, varietyValue];
      setSavedCustomVarieties(next);
      try {
        localStorage.setItem(STORAGE_KEY_VARIETIES, JSON.stringify(next));
      } catch (e) {
        console.error("Error saving custom varieties:", e);
      }
    }
    setNewVariety(varietyValue);
    setCustomVariety("");
    setIsVarietyDialogOpen(false);
  };

  const handleCustomProcessSubmit = () => {
    const processValue = customProcess.trim();
    if (!processValue) return;
    const alreadySaved = savedCustomProcesses.some(
      (p) => p.trim().toLowerCase() === processValue.toLowerCase()
    );
    if (!alreadySaved) {
      const next = [...savedCustomProcesses, processValue];
      setSavedCustomProcesses(next);
      try {
        localStorage.setItem(STORAGE_KEY_PROCESSES, JSON.stringify(next));
      } catch (e) {
        console.error("Error saving custom processes:", e);
      }
    }
    setNewProcess(processValue);
    setCustomProcess("");
    setIsProcessDialogOpen(false);
  };

  const handleDeleteVariety = (varietyValue: string) => {
    if (varietyValue === "others") return;
    const builtInValues = new Set(VARIETY_BUILTIN.map((o) => o.value.toLowerCase()));
    const isCustom = !builtInValues.has(varietyValue.toLowerCase());
    if (isCustom) {
      const updated = savedCustomVarieties.filter(
        (v) => v.trim().toLowerCase() !== varietyValue.toLowerCase()
      );
      setSavedCustomVarieties(updated);
      const updatedHidden = hiddenVarieties.filter((v) => v.toLowerCase() !== varietyValue.toLowerCase());
      if (updatedHidden.length !== hiddenVarieties.length) {
        setHiddenVarieties(updatedHidden);
        try {
          localStorage.setItem(STORAGE_KEY_HIDDEN_VARIETIES, JSON.stringify(updatedHidden));
        } catch (e) {
          console.error("Error saving hidden varieties:", e);
        }
      }
      try {
        localStorage.setItem(STORAGE_KEY_VARIETIES, JSON.stringify(updated));
      } catch (e) {
        console.error("Error saving custom varieties:", e);
      }
      toast({ title: "Variety Deleted", description: `"${varietyValue}" has been permanently removed from the list` });
    } else {
      const alreadyHidden = hiddenVarieties.some((v) => v.toLowerCase() === varietyValue.toLowerCase());
      if (!alreadyHidden) {
        const updated = [...hiddenVarieties, varietyValue];
        setHiddenVarieties(updated);
        try {
          localStorage.setItem(STORAGE_KEY_HIDDEN_VARIETIES, JSON.stringify(updated));
        } catch (e) {
          console.error("Error saving hidden varieties:", e);
        }
        toast({ title: "Variety Deleted", description: `"${varietyValue}" has been permanently removed from the list` });
      }
    }
    if (newVariety === varietyValue) setNewVariety("");
  };

  const handleDeleteProcess = (processValue: string) => {
    if (processValue === "others") return;
    const activeProcessList = millRegion === "basmati" ? BASMATI_PROCESS_BUILTIN : PROCESS_BUILTIN;
    const builtInValues = new Set(activeProcessList.map((o) => o.value.toLowerCase()));
    const isCustom = !builtInValues.has(processValue.toLowerCase());
    if (isCustom) {
      const updated = savedCustomProcesses.filter(
        (p) => p.trim().toLowerCase() !== processValue.toLowerCase()
      );
      setSavedCustomProcesses(updated);
      const updatedHidden = hiddenProcesses.filter((p) => p.toLowerCase() !== processValue.toLowerCase());
      if (updatedHidden.length !== hiddenProcesses.length) {
        setHiddenProcesses(updatedHidden);
        try {
          localStorage.setItem(STORAGE_KEY_HIDDEN_PROCESSES, JSON.stringify(updatedHidden));
        } catch (e) {
          console.error("Error saving hidden processes:", e);
        }
      }
      try {
        localStorage.setItem(STORAGE_KEY_PROCESSES, JSON.stringify(updated));
      } catch (e) {
        console.error("Error saving custom processes:", e);
      }
      toast({ title: "Process Deleted", description: `"${processValue}" has been permanently removed from the list` });
    } else {
      const alreadyHidden = hiddenProcesses.some((p) => p.toLowerCase() === processValue.toLowerCase());
      if (!alreadyHidden) {
        const updated = [...hiddenProcesses, processValue];
        setHiddenProcesses(updated);
        try {
          localStorage.setItem(STORAGE_KEY_HIDDEN_PROCESSES, JSON.stringify(updated));
        } catch (e) {
          console.error("Error saving hidden processes:", e);
        }
        toast({ title: "Process Deleted", description: `"${processValue}" has been permanently removed from the list` });
      }
    }
    if (newProcess === processValue) setNewProcess("");
  };

  const handleDeleteClick = (entry: GrainEntry) => {
    setDeleteTarget(entry);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      let url = `${BACKEND_URL}/api/raice_labz/grain-info/variety/${encodeURIComponent(deleteTarget.variety)}/process/${encodeURIComponent(deleteTarget.process)}`;
      if (deleteTarget.harvestSeason) {
        url += `/season/${encodeURIComponent(deleteTarget.harvestSeason)}`;
      }

      const response = await fetch(url, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Deleted", description: "Grain entry deleted successfully" });
        if (selectedIndex !== null && allEntries[selectedIndex] === deleteTarget) {
          handleDeselectEntry();
        }
        await fetchAllEntries();
      } else {
        toast({ title: "Error", description: "Failed to delete grain entry", variant: "destructive" });
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast({ title: "Error", description: "Failed to delete grain entry", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const filteredEntries = allEntries.filter((entry) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.variety?.toLowerCase().includes(q) ||
      entry.process?.toLowerCase().includes(q) ||
      entry.harvestSeason?.toLowerCase().includes(q) ||
      entry.category?.toLowerCase().includes(q) ||
      entry.grainType?.toLowerCase().includes(q)
    );
  });

  /** Format category/grainType for display (e.g. "basmati" -> "Basmati") */
  const formatLabel = (value: string | undefined) => {
    if (!value || !String(value).trim()) return "-";
    return String(value)
      .trim()
      .split(/\s+/)
      .map((word) =>
        word.length <= 3
          ? word.toUpperCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join(" ");
  };

  const getVarietyLabel = (value: string) => {
    const found = VARIETY_BUILTIN.find((v) => v.value === value);
    return found ? found.label : value;
  };

  const getProcessLabel = (value: string) => {
    const allProcessOptions = [...PROCESS_BUILTIN, ...BASMATI_PROCESS_BUILTIN];
    const found = allProcessOptions.find((p) => p.value === value);
    return found ? found.label : value;
  };

  /** Grain classification tree: Category → Grain Type → entries */
  const classificationTree = useMemo(() => {
    const byCategory = new Map<string, Map<string, GrainEntry[]>>();
    for (const entry of allEntries) {
      const cat = (entry.category?.trim() || "Unspecified").toLowerCase();
      const gt = (entry.grainType?.trim() || "Unspecified").toLowerCase();
      if (!byCategory.has(cat)) byCategory.set(cat, new Map());
      const byType = byCategory.get(cat)!;
      if (!byType.has(gt)) byType.set(gt, []);
      byType.get(gt)!.push(entry);
    }
    const categories = Array.from(byCategory.keys()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return categories.map((category) => ({
      category,
      grainTypes: (() => {
        const typeMap = byCategory.get(category)!;
        const types = Array.from(typeMap.keys()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
        return types.map((grainType) => ({ grainType, entries: typeMap.get(grainType)! }));
      })(),
    }));
  }, [allEntries]);

  const isPrimaryComplete =
    addSectionExpanded &&
    !!newCategory &&
    !!newGrainType &&
    !!newVariety &&
    !!newProcess &&
    !!newHarvestSeason;

  return (
    <div className="flex flex-col h-full">
      {!embedded && (
        <PageHeader title={t("nav.grainDatabase")} subtitle="View and manage grain information entries" />
      )}

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Add grain */}
        <div ref={addSectionRef}>
        <Card className="overflow-hidden shadow-sm border border-gray-200/80">
            <button
            type="button"
            onClick={() => setAddSectionExpanded((v) => !v)}
            className={`group w-full flex items-center justify-between px-5 py-4 text-left transition-all duration-200 rounded-t-lg border-0 ${
              addSectionExpanded
                ? "bg-rice-primary/10 border-l-4 border-l-rice-primary"
                : "hover:bg-gray-50/80"
            }`}
            aria-expanded={addSectionExpanded}
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-rice-primary/15 text-rice-primary">
                <Plus className="w-5 h-5" />
              </span>
              <span className="text-lg font-medium text-gray-800">Add grain</span>
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-transform duration-200 group-hover:bg-gray-200">
              {addSectionExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </span>
          </button>
          {addSectionExpanded && (
          <CardContent className="pt-6 pb-6 border-t border-gray-100">
              <CardTitle className="text-rice-primary flex items-center gap-2 mb-6">
                <Wheat className="w-5 h-5 text-rice-primary" />
                Primary Classification
              </CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Category <span className="text-rice-primary">*</span></Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category">
                        {newCategory ? CATEGORY_OPTIONS.find((c) => c.value === newCategory)?.label ?? newCategory : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Grain Type <span className="text-rice-primary">*</span></Label>
                  <Select value={newGrainType} onValueChange={setNewGrainType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select grain type">
                        {newGrainType ? GRAIN_TYPE_OPTIONS.find((g) => g.value === newGrainType)?.label ?? newGrainType : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {GRAIN_TYPE_OPTIONS.map((g) => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Variety <span className="text-rice-primary">*</span></Label>
                  <Select value={newVariety} onValueChange={handleNewVarietyChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select variety">
                        {newVariety
                          ? varietyOptionsSorted.find((o) => o.value === newVariety)?.label ?? newVariety
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {varietyOptionsSorted.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          onDelete={opt.value !== "others" ? () => handleDeleteVariety(opt.value) : undefined}
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Process <span className="text-rice-primary">*</span></Label>
                  <Select value={newProcess} onValueChange={handleNewProcessChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select process">
                        {newProcess
                          ? processOptionsSorted.find((o) => o.value === newProcess)?.label ?? newProcess
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {processOptionsSorted.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          onDelete={opt.value !== "others" ? () => handleDeleteProcess(opt.value) : undefined}
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newProcess &&
                    ["double-boiled", "single-boiled", "half-boiled", "sap", "super-parboiling"].includes(newProcess) && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsNewProcessDetailsDialogOpen(true)}
                        className="w-full mt-2 border-rice-primary text-rice-primary hover:bg-rice-primary hover:text-white"
                      >
                        Add Process Details (Optional)
                      </Button>
                    )}
                </div>
                <div className="space-y-2">
                  <Label>Harvest Season <span className="text-rice-primary">*</span></Label>
                  <Select value={newHarvestSeason} onValueChange={setNewHarvestSeason}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select harvest season" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rabi">Rabi</SelectItem>
                      <SelectItem value="kharif">Kharif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Month (optional)</Label>
                  <Select
                    value={newMonth}
                    onValueChange={setNewMonth}
                    disabled={!newHarvestSeason}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={newHarvestSeason ? "Select month" : "Select season first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {newHarvestSeason === "kharif" && (
                        <>
                          <SelectItem value="september">September</SelectItem>
                          <SelectItem value="october">October</SelectItem>
                          <SelectItem value="november">November</SelectItem>
                          <SelectItem value="december">December</SelectItem>
                        </>
                      )}
                      {newHarvestSeason === "rabi" && (
                        <>
                          <SelectItem value="march">March</SelectItem>
                          <SelectItem value="april">April</SelectItem>
                          <SelectItem value="may">May</SelectItem>
                          <SelectItem value="june">June</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isPrimaryComplete && showOptionalAddSection && (
                <>
                  <div className="mt-6 pt-6 border-t">
                    <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-rice-primary">Morphological Properties</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="add-length" className="font-medium">{t("knowGrains.length")}</Label>
                              <Input id="add-length" type="number" placeholder="5.5" value={newEntryProps.geoProperties.length} onChange={(e) => updateNewGeoProp("length", e.target.value)} className="h-12" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="add-breadth" className="font-medium">{t("knowGrains.breadth")}</Label>
                              <Input id="add-breadth" type="number" placeholder="2.3" value={newEntryProps.geoProperties.breadth} onChange={(e) => updateNewGeoProp("breadth", e.target.value)} className="h-12" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="add-weight" className="font-medium">{t("knowGrains.weight")}</Label>
                              <Input id="add-weight" type="number" placeholder="22.5" value={newEntryProps.geoProperties.weight} onChange={(e) => updateNewGeoProp("weight", e.target.value)} className="h-12" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="add-aspectRatio" className="font-medium">{t("knowGrains.aspectRatio")}</Label>
                              <Input id="add-aspectRatio" type="number" placeholder="Auto" value={newEntryProps.geoProperties.aspectRatio} readOnly className="h-12 bg-gray-50" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="add-hardness" className="font-medium">{t("knowGrains.hardness")}</Label>
                              <Input id="add-hardness" type="number" placeholder="45" value={newEntryProps.geoProperties.hardness} onChange={(e) => updateNewGeoProp("hardness", e.target.value)} className="h-12" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={handleCancelAdd}>Cancel</Button>
                <Button onClick={handleAddNew} className="bg-rice-primary hover:bg-rice-primary/90">Save Variety</Button>
              </div>
            </>
              )}
            </CardContent>
          )}
        </Card>
        </div>

        {/* Varieties + Grain Classification side by side on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Varieties table - takes 2/3 width */}
          <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-rice-primary flex items-center gap-2">
              <Database className="w-5 h-5" />
              Varieties ({filteredEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEntries ? (
              <div className="text-center py-8 text-gray-500">Loading entries...</div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? "No varieties match your search" : "No varieties yet. Click 'Add grain' above to add one."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-semibold text-gray-700">Variety</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Category</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Grain Type</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Process</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Season</th>
                      <th className="text-right p-3 font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry, idx) => {
                      const realIndex = allEntries.indexOf(entry);
                      const isSelected = selectedIndex === realIndex;
                      const isDuplicate = duplicateHighlightIndex === realIndex;
                      return (
                        <tr
                          key={`${entry.variety}-${entry.process}-${entry.harvestSeason || ""}-${idx}`}
                          className={`border-b transition-colors ${
                            isSelected
                              ? "bg-rice-primary/10 border-rice-primary"
                              : isDuplicate
                              ? "bg-yellow-50 border-yellow-300"
                              : "hover:bg-blue-50 hover:text-blue-900"
                          }`}
                        >
                          <td className="p-3 font-medium">{formatLabel(getVarietyLabel(entry.variety))}</td>
                          <td className="p-3">{formatLabel(entry.category)}</td>
                          <td className="p-3">{formatLabel(entry.grainType)}</td>
                          <td className="p-3">{formatLabel(getProcessLabel(entry.process))}</td>
                          <td className="p-3">{entry.harvestSeason ? formatLabel(entry.harvestSeason) : "-"}</td>
                          <td className="p-3 text-right">
                            <span className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-600 hover:text-rice-primary hover:bg-rice-primary/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  isSelected ? handleDeselectEntry() : handleSelectEntry(realIndex);
                                }}
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(entry);
                                }}
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
          </Card>

          {/* Grain Classification tree - takes 1/3 width */}
          {!loadingEntries && classificationTree.length > 0 && (
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-rice-primary flex items-center gap-2">
                  <FolderTree className="w-5 h-5" />
                  Grain Classification
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Basmati and Non-Basmati rice varieties by grain type
                </p>
              </CardHeader>
              <CardContent>
                {(() => {
                  const basmatiGroups = classificationTree.filter(
                    (group) => group.category.toLowerCase() === "basmati"
                  );
                  const otherGroups = classificationTree.filter(
                    (group) => group.category.toLowerCase() !== "basmati"
                  );

                  const renderGroup = (
                    category: string,
                    grainTypes: { grainType: string; entries: GrainEntry[] }[]
                  ) => (
                    <Collapsible
                      key={category}
                      open={classificationOpen[category] !== false}
                      onOpenChange={(open) =>
                        setClassificationOpen((prev) => ({ ...prev, [category]: open }))
                      }
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 rounded-md hover:bg-gray-50 text-left font-medium text-gray-800">
                        {classificationOpen[category] !== false ? (
                          <ChevronDown className="w-4 h-4 shrink-0 text-rice-primary" />
                        ) : (
                          <ChevronRight className="w-4 h-4 shrink-0 text-rice-primary" />
                        )}
                        <span>{formatLabel(category)}</span>
                        <span className="text-gray-400 font-normal text-sm">
                          ({new Set(grainTypes.flatMap((g) => g.entries.map((e) => e.variety))).size} varieties)
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-6 pb-2 space-y-2">
                          {grainTypes.map(({ grainType, entries }) => {
                            const varietyNames = Array.from(
                              new Set(
                                entries.map((e) => formatLabel(getVarietyLabel(e.variety)))
                              )
                            ).sort((a, b) =>
                              a.localeCompare(b, undefined, { sensitivity: "base" })
                            );

                            return (
                              <div key={grainType} className="space-y-1 border-l-2 border-gray-200 pl-3">
                                <div className="flex items-center gap-2">
                                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="font-medium text-gray-700">
                                    {formatLabel(grainType)}
                                  </span>
                                  <span className="text-gray-500 text-xs">
                                    ({new Set(entries.map((e) => e.variety)).size})
                                  </span>
                                </div>
                                {varietyNames.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pl-5">
                                    {varietyNames.map((name) => (
                                      <span
                                        key={name}
                                        className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600 border border-gray-200"
                                      >
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );

                  return (
                    <div className="space-y-1">
                      {basmatiGroups.map(({ category, grainTypes }) =>
                        renderGroup(category, grainTypes)
                      )}
                      {otherGroups.map(({ category, grainTypes }) =>
                        renderGroup(category, grainTypes)
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>

      </div>

      {/* Edit variety properties – popup when Edit is clicked on a row */}
      <Dialog
        open={selectedIndex !== null}
        onOpenChange={(open) => {
          if (!open) handleDeselectEntry();
        }}
      >
        <DialogContent className="sm:max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-rice-primary">
              {selectedIndex !== null && (
                <>
                  Edit: {getVarietyLabel(allEntries[selectedIndex].variety)} – {getProcessLabel(allEntries[selectedIndex].process)}
                  {allEntries[selectedIndex].harvestSeason && ` (${allEntries[selectedIndex].harvestSeason})`}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedIndex !== null && (
            <div className="pt-4">
              {/* Morphological Properties */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-rice-primary">Morphological Properties</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="db-length" className="font-medium">{t("knowGrains.length")}</Label>
                      <Input id="db-length" type="number" placeholder="5.5" value={editProps.geoProperties.length} onChange={(e) => updateGeoProp("length", e.target.value)} className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="db-breadth" className="font-medium">{t("knowGrains.breadth")}</Label>
                      <Input id="db-breadth" type="number" placeholder="2.3" value={editProps.geoProperties.breadth} onChange={(e) => updateGeoProp("breadth", e.target.value)} className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="db-weight" className="font-medium">{t("knowGrains.weight")}</Label>
                      <Input id="db-weight" type="number" placeholder="22.5" value={editProps.geoProperties.weight} onChange={(e) => updateGeoProp("weight", e.target.value)} className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="db-aspectRatio" className="font-medium">{t("knowGrains.aspectRatio")}</Label>
                      <Input id="db-aspectRatio" type="number" placeholder="Auto" value={editProps.geoProperties.aspectRatio} readOnly className="h-12 bg-gray-50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="db-hardness" className="font-medium">{t("knowGrains.hardness")}</Label>
                      <Input id="db-hardness" type="number" placeholder="45" value={editProps.geoProperties.hardness} onChange={(e) => updateGeoProp("hardness", e.target.value)} className="h-12" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Nutritional and GMAD properties hidden — only morphological properties shown in edit */}
            </div>
          )}
          {selectedIndex !== null && (
            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <Button variant="outline" onClick={handleDeselectEntry}>Cancel</Button>
              <Button onClick={handleSave} className="bg-rice-primary hover:bg-rice-primary/90">
                <Save className="w-4 h-4 mr-1" />
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom Variety Dialog (same as TellUsAboutGrain) */}
      <Dialog open={isVarietyDialogOpen} onOpenChange={setIsVarietyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Custom Variety</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="grain-db-custom-variety">Variety Name</Label>
              <Input
                id="grain-db-custom-variety"
                value={customVariety}
                onChange={(e) => setCustomVariety(e.target.value)}
                placeholder="Enter variety name"
                onKeyDown={(e) => e.key === "Enter" && handleCustomVarietySubmit()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsVarietyDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCustomVarietySubmit} className="bg-rice-primary hover:bg-rice-primary/90">Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Process Dialog (same as TellUsAboutGrain) */}
      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Custom Process</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="grain-db-custom-process">Process Name</Label>
              <Input
                id="grain-db-custom-process"
                value={customProcess}
                onChange={(e) => setCustomProcess(e.target.value)}
                placeholder="Enter process name"
                onKeyDown={(e) => e.key === "Enter" && handleCustomProcessSubmit()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsProcessDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCustomProcessSubmit} className="bg-rice-primary hover:bg-rice-primary/90">Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Process Details Dialog (same as TellUsAboutGrain) */}
      <Dialog open={isNewProcessDetailsDialogOpen} onOpenChange={setIsNewProcessDetailsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {newProcess
                ? `${newProcess.charAt(0).toUpperCase() + newProcess.slice(1).replace(/-/g, " ")} Process Details`
                : "Process Details"}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-4">
            {newProcess && PROCESS_DETAILS_CONFIGS[newProcess] && (
              <ProcessDetailsForm
                process={newProcess}
                processDetails={newProcessDetails}
                setProcessDetails={setNewProcessDetails}
                onClose={() => setIsNewProcessDetailsDialogOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Grain Entry</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {deleteTarget && getVarietyLabel(deleteTarget.variety)} - {deleteTarget && getProcessLabel(deleteTarget.process)}
              </span>
              ? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GrainDatabase;
