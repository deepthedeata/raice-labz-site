import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMachine } from "@/contexts/MachineContext";
import { useToast } from "@/hooks/use-toast";
import { getMachineImageSrc } from "@/lib/machineImages";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, Loader2, ChevronDown, ChevronRight, FolderTree, Pencil, Database, GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
/** Single machine entry in a series (supports optional number, label, and status).
 * status is persisted to DB via rice-mill settings for use in analysis/reporting. */
export type MachineEntry = {
  name: string;
  machineNumber?: string;
  machineModel?: string;
  customLabel?: string;
  status?: "active" | "inactive";
};

/** Normalize API value to MachineEntry (backend may send string or object) */
function toMachineEntry(m: string | MachineEntry): MachineEntry {
  if (typeof m === "string") return { name: m, status: "active" };
  return {
    name: m.name,
    machineNumber: m.machineNumber,
    machineModel: m.machineModel,
    customLabel: m.customLabel,
    status: m.status === "inactive" ? "inactive" : "active",
  };
}

/** Display machine name with first letter capital per word (not full caps) */
function formatMachineName(name: string): string {
  if (!name.trim()) return name;
  return name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Predefined machine names for rice mill operations */
const MACHINE_NAME_OPTIONS = [
  "Husker",
  "Tray Separator - Mix",
  "Tray Separator - Rice O/P",
  "Tray Separator - Paddy O/P",
  "Whitener",
  "Silky",
  "Length Grader - Headrice O/P",
  "Length Grader - Broken O/P",
  "Thickness Grader - Thick Rice O/P",
  "Thickness Grader - Thin Rice O/P",
  "Sifter",
  "Color Sorter - Accepts",
  "Color Sorter - Rejects",
  "Blend & Pack",
  "Final Rice",
];

/** Line/series configuration. machines are full entries (name + optional number/label). */
type LineConfig = { id: string; name: string; output: string; machines: MachineEntry[]; status?: "active" | "inactive" };

/** Rice mill settings shape returned by GET /api/raice_labz/settings/rice-mill */
interface RiceMillSettings {
  operatorName: string;
  location: string;
  riceMillName: string;
  region: string;
  lines: LineConfig[];
  currentLineIndex: number;
  lineOutput: string;
  machines: string[];
}

const defaultSettings: RiceMillSettings = {
  operatorName: "",
  location: "",
  riceMillName: "",
  region: "non-basmati",
  lines: [],
  currentLineIndex: 0,
  lineOutput: "",
  machines: [],
};

const MachineDatabase = ({ embedded = false }: { embedded?: boolean }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { machines, setMachines } = useMachine();

  const [settings, setSettings] = useState<RiceMillSettings>(defaultSettings);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Top addition box (new machine entry: machine + series + number + label)
  const [addBoxMachineValue, setAddBoxMachineValue] = useState<string>("");
  const [addBoxSeriesName, setAddBoxSeriesName] = useState("");
  const [addBoxSeriesOutput, setAddBoxSeriesOutput] = useState("10");
  const [addBoxMachineNumber, setAddBoxMachineNumber] = useState("");
  const [addBoxMachineModel, setAddBoxMachineModel] = useState("");
  const [addBoxCustomLabel, setAddBoxCustomLabel] = useState("");

  // Add new line dialog
  const [isAddLineOpen, setIsAddLineOpen] = useState(false);
  const [newLineName, setNewLineName] = useState("");
  const [newLineOutput, setNewLineOutput] = useState("10");
  // "Others" dialog for custom machine name
  const [isMachineOtherDialogOpen, setIsMachineOtherDialogOpen] = useState(false);
  const [customMachineName, setCustomMachineName] = useState("");
  // User-added custom machine names (persisted via machines catalog)
  const customMachineNames = useMemo(
    () => machines.filter((m) => !MACHINE_NAME_OPTIONS.includes(m)),
    [machines]
  );
  const [seriesDropdownOpen, setSeriesDropdownOpen] = useState(false);
  /** Which series are expanded in the classification tree (default: all open) */
  const [seriesTreeOpen, setSeriesTreeOpen] = useState<Record<string, boolean>>({});
  /** Machine table: edit dialog */
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<{ lineIndex: number; entryIndex: number } | null>(null);
  const [editForm, setEditForm] = useState({ name: "", seriesName: "", machineModel: "", customLabel: "" });
  /** Machine table: remove confirmation */
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ lineIndex: number; entryIndex: number } | null>(null);
  /** Edit dialog: series name popover open */
  const [editSeriesPopoverOpen, setEditSeriesPopoverOpen] = useState(false);
  /** Drag-and-drop reorder state for machines within a series */
  const [dragState, setDragState] = useState<{ lineId: string; fromIdx: number } | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const lines = settings.lines;

  /** Flat list of machine entries for the table (one row per entry with series name and indices) */
  const machineTableRows = useMemo(
    () =>
      lines.flatMap((line, lineIndex) =>
        line.machines.map((entry, entryIndex) => ({
          lineIndex,
          entryIndex,
          name: entry.name,
          machineNumber: entry.machineNumber,
          machineModel: entry.machineModel,
          customLabel: entry.customLabel,
          status: entry.status ?? "active",
          seriesName: line.name,
          seriesOutput: line.output,
        }))
      ),
    [lines]
  );

  /** When series name changes: match existing series output or default to 10.0 for new series */
  useEffect(() => {
    const trimmed = addBoxSeriesName.trim().toLowerCase();
    const existing = lines.find((l) => l.name.trim().toLowerCase() === trimmed);
    setAddBoxSeriesOutput(existing ? existing.output : "10");
  }, [addBoxSeriesName, lines]);

  /** Fetch rice mill settings and sync machines to context */
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/raice_labz/settings/rice-mill");
      const data = await response.json();
      if (response.ok && data.status === "success" && data.settings) {
        const s = data.settings;
        const rawLines = Array.isArray(s.lines) ? s.lines : [];
        const next: RiceMillSettings = {
          operatorName: s.operatorName ?? "",
          location: s.location ?? "",
          riceMillName: s.riceMillName ?? "",
          lines: rawLines.map((line: { id?: string; name?: string; output?: string; machines?: (string | MachineEntry)[] }) => ({
            id: line.id ?? `line_${Date.now()}`,
            name: line.name ?? "",
            output: line.output ?? "10",
            machines: (line.machines ?? []).map(toMachineEntry),
          })),
          currentLineIndex: typeof s.currentLineIndex === "number" ? s.currentLineIndex : 0,
          lineOutput: typeof s.lineOutput === "string" ? s.lineOutput : "",
          machines: Array.isArray(s.machines) ? s.machines : [],
        };
        setSettings(next);
        setCurrentLineIndex(typeof next.currentLineIndex === "number" ? next.currentLineIndex : 0);
        if (next.machines.length > 0) {
          setMachines(next.machines);
        }
      }
    } catch (err) {
      console.error("Failed to fetch rice mill settings:", err);
      toast({
        title: "Error",
        description: "Failed to load machine database",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [setMachines, toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  /** Persist rice-mill settings (POST full payload). Overrides merged with current settings. */
  const persist = useCallback(
    async (
      overrides: Partial<{ lines: LineConfig[]; currentLineIndex: number; machines: string[] }>,
      options: { showToast?: boolean; successMessage?: string } = {}
    ) => {
      setSaving(true);
      try {
        const payload = {
          operatorName: settings.operatorName,
          location: settings.location,
          riceMillName: settings.riceMillName,
          region: settings.region ?? "non-basmati",
          lines: overrides.lines ?? settings.lines,
          currentLineIndex: overrides.currentLineIndex ?? currentLineIndex,
          lineOutput: settings.lineOutput,
          machines: overrides.machines ?? settings.machines,
        };
        const response = await fetch("/api/raice_labz/settings/rice-mill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok || data.status !== "success") {
          throw new Error(data.message || "Failed to save");
        }
        if (data.settings) {
          const s = data.settings;
          setSettings((prev) => ({
            ...prev,
            lines: Array.isArray(s.lines) ? s.lines : prev.lines,
            currentLineIndex: typeof s.currentLineIndex === "number" ? s.currentLineIndex : prev.currentLineIndex,
            machines: Array.isArray(s.machines) ? s.machines : prev.machines,
          }));
          if (typeof data.settings.currentLineIndex === "number") {
            setCurrentLineIndex(data.settings.currentLineIndex);
          }
          if (Array.isArray(data.settings.machines) && data.settings.machines.length > 0) {
            setMachines(data.settings.machines);
          }
        }
        if (options.showToast) {
          toast({
            title: "Saved",
            description: options.successMessage ?? "Settings saved to database.",
            duration: 3000,
          });
        }
        return true;
      } catch (err) {
        console.error("Failed to save:", err);
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to save",
          variant: "destructive",
        });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [settings, currentLineIndex, setMachines, toast]
  );

  /** Machine name dropdown: selecting "Others" opens dialog (like Variety in Grain Database) */
  const handleAddBoxMachineChange = useCallback((value: string) => {
    if (value === "others") {
      setIsMachineOtherDialogOpen(true);
    } else {
      setAddBoxMachineValue(value === "__none__" ? "" : value);
    }
  }, []);

  /** Delete machine name from catalog and from all series (like Variety delete in Grain Database) */
  const handleDeleteMachineName = useCallback(
    async (machineName: string) => {
      if (!machineName || machineName === "__none__" || machineName === "others") return;
      const updatedCatalog = machines.filter((m) => m !== machineName);
      if (updatedCatalog.length === machines.length) return;
      const updatedLines: LineConfig[] = lines.map((line) => ({
        ...line,
        machines: line.machines.filter((e) => e.name !== machineName),
      }));
      setMachines(updatedCatalog);
      if (addBoxMachineValue === machineName) setAddBoxMachineValue("");
      const saved = await persist(
        { lines: updatedLines, machines: updatedCatalog },
        { showToast: true, successMessage: `"${formatMachineName(machineName)}" has been removed from the list.` }
      );
      if (!saved) {
        toast({ title: "Delete failed", description: "Machine removed locally but not synced.", variant: "destructive" });
      }
    },
    [machines, lines, addBoxMachineValue, setMachines, persist, toast]
  );

  /** Dialog submit: set custom machine name and add to catalog if new (used by add form and edit dialog) */
  const handleCustomMachineSubmit = useCallback(async () => {
    const name = customMachineName.trim();
    if (!name) return;
    let updatedCatalog = machines;
    if (!machines.includes(name)) {
      updatedCatalog = [...machines, name];
      setMachines(updatedCatalog);
    }
    if (editDialogOpen) {
      setEditForm((prev) => ({ ...prev, name }));
    } else {
      setAddBoxMachineValue(name);
    }
    setCustomMachineName("");
    setIsMachineOtherDialogOpen(false);
    // Persist catalog so custom names survive page reload
    await persist({ machines: updatedCatalog }, { showToast: false });
  }, [customMachineName, machines, setMachines, editDialogOpen, persist]);

  /** Count how many times a base machine name appears within the target series (line only) */
  const getNextMachineNumber = useCallback((baseName: string, targetLine: LineConfig) => {
    let count = 0;
    for (const entry of targetLine.machines) {
      const entryName = typeof entry === 'string' ? entry : entry.name;
      if (entryName.toLowerCase() === baseName.toLowerCase()) {
        count++;
      }
    }
    return count + 1;
  }, []);

  /** Top addition box: add one machine entry (name, series, custom label) */
  const handleAddFromTopBox = useCallback(async () => {
    const machineName = (addBoxMachineValue || "").trim();
    if (!machineName) {
      toast({ title: "Invalid", description: "Select a machine name.", variant: "destructive" });
      return;
    }
    const seriesName = addBoxSeriesName.trim();
    if (!seriesName) {
      toast({ title: "Invalid", description: "Enter or select a series name.", variant: "destructive" });
      return;
    }
    let targetLines = [...lines];
    let lineIndex = targetLines.findIndex((l) => l.name.trim().toLowerCase() === seriesName.toLowerCase());
    if (lineIndex === -1) {
      const newLine: LineConfig = {
        id: `line_${Date.now()}`,
        name: seriesName,
        output: addBoxSeriesOutput.trim() || "10",
        machines: [],
      };
      targetLines = [...targetLines, newLine];
      lineIndex = targetLines.length - 1;
    }
    const targetLine = targetLines[lineIndex];
    // Auto-number: e.g. "Husker" → "1" if first husker in this series, "2" if second, etc.
    const autoNumber = String(getNextMachineNumber(machineName, targetLine));
    const newEntry: MachineEntry = {
      name: machineName,
      machineNumber: autoNumber,
      machineModel: addBoxMachineModel.trim() || "",
      customLabel: addBoxCustomLabel.trim() || "",
      status: "active",
    };
    const updatedLine: LineConfig = { ...targetLine, machines: [...targetLine.machines, newEntry] };
    const updatedLines = targetLines.map((l, i) => (i === lineIndex ? updatedLine : l));
    let updatedCatalog = machines;
    if (!machines.includes(machineName)) {
      updatedCatalog = [...machines, machineName];
      setMachines(updatedCatalog);
    }
    setAddBoxMachineValue("");
    setAddBoxSeriesName("");
    setAddBoxMachineModel("");
    setAddBoxCustomLabel("");
    const saved = await persist(
      { lines: updatedLines, machines: updatedCatalog },
      { showToast: true, successMessage: `${machineName} ${autoNumber} added to ${seriesName}.` }
    );
    if (!saved) {
      toast({ title: "Failed to sync", description: "Entry added locally but not saved to database.", variant: "destructive" });
    }
  }, [addBoxMachineValue, addBoxSeriesName, addBoxSeriesOutput, addBoxMachineModel, addBoxCustomLabel, lines, machines, setMachines, persist, toast, getNextMachineNumber]);

  /** Create a new empty series/line from the dialog. */
  const handleAddLine = useCallback(async () => {
    const name = newLineName.trim();
    if (!name) {
      toast({ title: "Invalid", description: "Enter a line / series name.", variant: "destructive" });
      return;
    }
    const exists = lines.some((l) => l.name.trim().toLowerCase() === name.toLowerCase());
    if (exists) {
      toast({ title: "Duplicate", description: `Line "${name}" already exists.`, variant: "destructive" });
      return;
    }
    const newLine: LineConfig = {
      id: `line_${Date.now()}`,
      name,
      output: newLineOutput.trim() || "10",
      machines: [],
    };
    const updatedLines = [...lines, newLine];
    const saved = await persist(
      { lines: updatedLines },
      { showToast: true, successMessage: `Line "${name}" added.` },
    );
    if (saved) {
      setIsAddLineOpen(false);
      setNewLineName("");
      setNewLineOutput("10");
    } else {
      toast({ title: "Failed to sync", description: "Line saved locally but not synced.", variant: "destructive" });
    }
  }, [newLineName, newLineOutput, lines, persist, toast]);

  /** Delete a line/series and all its machines from the classification tree. */
  const handleDeleteLine = useCallback(async (lineId: string) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;
    const machineCount = line.machines.length;
    const confirmMsg =
      machineCount > 0
        ? `Delete line "${line.name}" and its ${machineCount} machine${machineCount === 1 ? "" : "s"}?`
        : `Delete empty line "${line.name}"?`;
    if (!window.confirm(confirmMsg)) return;
    const updatedLines = lines.filter((l) => l.id !== lineId);
    const saved = await persist(
      { lines: updatedLines },
      { showToast: true, successMessage: `Line "${line.name}" removed.` },
    );
    if (!saved) {
      toast({ title: "Failed to sync", description: "Line removed locally but not synced.", variant: "destructive" });
    }
  }, [lines, persist, toast]);

  /** Toggle a line's active/inactive status. Defaults to 'active' if unset. */
  const handleLineStatusToggle = useCallback(async (lineId: string) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;
    const current = line.status ?? "active";
    const next = current === "active" ? "inactive" : "active";
    const updatedLines = lines.map((l) =>
      l.id === lineId ? { ...l, status: next } : l,
    );
    await persist(
      { lines: updatedLines },
      { showToast: true, successMessage: `Line "${line.name}" ${next === "active" ? "activated" : "deactivated"}.` },
    );
  }, [lines, persist]);

  /** Toggle status (active/inactive) for a machine entry in the table */
  const handleStatusToggle = useCallback(
    async (lineIndex: number, entryIndex: number) => {
      const line = lines[lineIndex];
      if (!line || entryIndex < 0 || entryIndex >= line.machines.length) return;
      const entry = line.machines[entryIndex];
      const newStatus = entry.status === "inactive" ? "active" : "inactive";
      const updatedMachines = line.machines.map((e, i) =>
        i === entryIndex ? { ...e, status: newStatus } : e
      );
      const updatedLines = lines.map((l, i) =>
        i === lineIndex ? { ...l, machines: updatedMachines } : l
      );
      setSettings((prev) => ({ ...prev, lines: updatedLines }));
      await persist({ lines: updatedLines }, { showToast: true, successMessage: "Status updated." });
    },
    [lines, persist]
  );

  /** Open edit dialog for a table row */
  const handleEditClick = useCallback(
    (row: (typeof machineTableRows)[number]) => {
      setEditingRow({ lineIndex: row.lineIndex, entryIndex: row.entryIndex });
      setEditForm({
        name: row.name,
        seriesName: row.seriesName,
        machineModel: row.machineModel ?? "",
        customLabel: row.customLabel ?? "",
      });
      setEditDialogOpen(true);
    },
    []
  );

  /** Save edited machine entry (update in place or move to another series) */
  const handleEditSave = useCallback(async () => {
    if (editingRow == null) return;
    const { lineIndex, entryIndex } = editingRow;
    const line = lines[lineIndex];
    if (!line || entryIndex < 0 || entryIndex >= line.machines.length) return;
    const entry = line.machines[entryIndex];
    const name = editForm.name.trim();
    const seriesName = editForm.seriesName.trim();
    if (!name || !seriesName) {
      toast({ title: "Invalid", description: "Machine name and series name are required.", variant: "destructive" });
      return;
    }
    const updatedEntry: MachineEntry = {
      name,
      machineNumber: entry.machineNumber,
      machineModel: editForm.machineModel.trim() || "",
      customLabel: editForm.customLabel.trim() || "",
      status: entry.status ?? "active",
    };
    const targetLineIndex = lines.findIndex((l) => l.name.trim().toLowerCase() === seriesName.toLowerCase());
    let updatedLines: LineConfig[];
    if (targetLineIndex === -1) {
      const newLine: LineConfig = {
        id: `line_${Date.now()}`,
        name: seriesName,
        output: "10",
        machines: [updatedEntry],
      };
      updatedLines = lines
        .map((l, i) =>
          i === lineIndex
            ? { ...l, machines: l.machines.filter((_, j) => j !== entryIndex) }
            : l
        )
        .filter((l) => l.machines.length > 0);
      updatedLines = [...updatedLines, newLine];
    } else if (targetLineIndex === lineIndex) {
      updatedLines = lines.map((l, i) =>
        i === lineIndex
          ? { ...l, machines: l.machines.map((e, j) => (j === entryIndex ? updatedEntry : e)) }
          : l
      );
    } else {
      updatedLines = lines.map((l, i) => {
        if (i === lineIndex) return { ...l, machines: l.machines.filter((_, j) => j !== entryIndex) };
        if (i === targetLineIndex) return { ...l, machines: [...l.machines, updatedEntry] };
        return l;
      });
    }
    let updatedCatalog = machines;
    if (!machines.includes(name)) {
      updatedCatalog = [...machines, name];
      setMachines(updatedCatalog);
    }
    setEditDialogOpen(false);
    setEditingRow(null);
    const saved = await persist(
      { lines: updatedLines, machines: updatedCatalog },
      { showToast: true, successMessage: "Machine entry updated." }
    );
    if (!saved) {
      toast({ title: "Failed to sync", description: "Changes may not be saved.", variant: "destructive" });
    }
  }, [editingRow, editForm, lines, machines, setMachines, persist, toast]);

  /** Open remove confirmation for a table row */
  const handleRemoveClick = useCallback((row: (typeof machineTableRows)[number]) => {
    setDeleteTarget({ lineIndex: row.lineIndex, entryIndex: row.entryIndex });
    setDeleteDialogOpen(true);
  }, []);

  /** Confirm remove: delete machine entry from series and persist */
  const handleRemoveConfirm = useCallback(async () => {
    if (deleteTarget == null) return;
    const { lineIndex, entryIndex } = deleteTarget;
    const line = lines[lineIndex];
    if (!line || entryIndex < 0 || entryIndex >= line.machines.length) return;
    const updatedMachines = line.machines.filter((_, i) => i !== entryIndex);
    const updatedLine = { ...line, machines: updatedMachines };
    const updatedLines =
      updatedMachines.length === 0
        ? lines.filter((_, i) => i !== lineIndex)
        : lines.map((l, i) => (i === lineIndex ? updatedLine : l));
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    const saved = await persist(
      { lines: updatedLines },
      { showToast: true, successMessage: "Machine entry removed." }
    );
    if (!saved) {
      toast({ title: "Failed to sync", description: "Removal may not be saved.", variant: "destructive" });
    }
  }, [deleteTarget, lines, persist, toast]);

  /** Reorder machines within a series via drag-and-drop */
  const handleDragStart = useCallback((lineId: string, fromIdx: number) => {
    setDragState({ lineId, fromIdx });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, overIdx: number) => {
    e.preventDefault();
    setDragOverIdx(overIdx);
  }, []);

  const handleDrop = useCallback(
    async (lineId: string, toIdx: number) => {
      if (!dragState || dragState.lineId !== lineId || dragState.fromIdx === toIdx) {
        setDragState(null);
        setDragOverIdx(null);
        return;
      }
      const lineIndex = lines.findIndex((l) => l.id === lineId);
      if (lineIndex === -1) return;
      const machines = [...lines[lineIndex].machines];
      const [moved] = machines.splice(dragState.fromIdx, 1);
      machines.splice(toIdx, 0, moved);
      const updatedLines = lines.map((l, i) => (i === lineIndex ? { ...l, machines } : l));
      setDragState(null);
      setDragOverIdx(null);
      await persist({ lines: updatedLines }, { showToast: false });
    },
    [dragState, lines, persist]
  );

  const handleDragEnd = useCallback(() => {
    setDragState(null);
    setDragOverIdx(null);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {!embedded && (
        <PageHeader
          title={t("nav.machineDatabase")}
          subtitle="View and manage mill machines"
        />
      )}

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left: Add machine */}
          <Card className="border-rice-primary/20 bg-rice-primary/5 flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-rice-primary flex items-center gap-2">
                <Plus className="h-5 w-5 text-rice-primary" />
                Add machine
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addbox-machine">Machine name <span className="text-rice-primary">*</span></Label>
                <Select
                  value={addBoxMachineValue || "__none__"}
                  onValueChange={(v) => {
                    if (v === "__others__") {
                      setIsMachineOtherDialogOpen(true);
                    } else {
                      setAddBoxMachineValue(v === "__none__" ? "" : v);
                    }
                  }}
                >
                  <SelectTrigger id="addbox-machine" className="w-full">
                    {addBoxMachineValue ? (
                      <span className="truncate">{addBoxMachineValue}</span>
                    ) : (
                      <SelectValue placeholder="Select machine" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select machine…</SelectItem>
                    {MACHINE_NAME_OPTIONS.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                    {customMachineNames.map((name) => (
                      <SelectItem key={name} value={name} onDelete={() => handleDeleteMachineName(name)}>
                        {name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__others__">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addbox-series">Series name <span className="text-rice-primary">*</span></Label>
                <Popover open={seriesDropdownOpen} onOpenChange={setSeriesDropdownOpen}>
                  <PopoverTrigger asChild>
                    <div className="w-full relative">
                      <Input
                        id="addbox-series"
                        placeholder="Select or type series name"
                        value={addBoxSeriesName}
                        onChange={(e) => { setAddBoxSeriesName(e.target.value); if (!seriesDropdownOpen) setSeriesDropdownOpen(true); }}
                        onClick={() => setSeriesDropdownOpen(true)}
                        className="pr-9"
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                    sideOffset={4}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <ul className="max-h-60 overflow-auto py-1">
                      {lines.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-muted-foreground">No series yet. Type a name to create one.</li>
                      ) : (
                        lines.map((line) => (
                          <li key={line.id}>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none"
                              onClick={() => {
                                setAddBoxSeriesName(line.name);
                                setSeriesDropdownOpen(false);
                              }}
                            >
                              {line.name}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addbox-series-output">Series output (TPH) <span className="text-rice-primary">*</span></Label>
                <div className="relative">
                  <Input
                    id="addbox-series-output"
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={addBoxSeriesOutput}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || (/^\d+$/.test(v) && Number(v) <= 100)) setAddBoxSeriesOutput(v);
                    }}
                    placeholder="10"
                    className="pr-14"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-gray-600">
                    TPH
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addbox-model">Machine Model</Label>
                <Input
                  id="addbox-model"
                  placeholder="e.g. APIT Whitener"
                  value={addBoxMachineModel}
                  onChange={(e) => setAddBoxMachineModel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addbox-label">Custom label (optional)</Label>
                <Input
                  id="addbox-label"
                  placeholder="Optional label"
                  value={addBoxCustomLabel}
                  onChange={(e) => setAddBoxCustomLabel(e.target.value)}
                />
              </div>
            </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleAddFromTopBox}
                  disabled={saving || !addBoxSeriesName.trim() || !addBoxMachineValue || addBoxMachineValue === "__none__"}
                  className="bg-rice-primary hover:bg-rice-primary/90"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add entry
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Right: Series & Machine classification tree */}
          <Card className="flex flex-col min-h-0">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-rice-primary flex items-center gap-2">
                    <FolderTree className="w-5 h-5" />
                    Series & Machine Classification
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Series and machine hierarchy from saved entries
                  </p>
                </div>
                <Dialog open={isAddLineOpen} onOpenChange={setIsAddLineOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-rice-primary hover:bg-rice-primary/90 shrink-0"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add line
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Add new line / series</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Line / series name
                        </label>
                        <Input
                          value={newLineName}
                          onChange={(e) => setNewLineName(e.target.value)}
                          placeholder="e.g. Line C - Export"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddLine();
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Output (TPH)
                        </label>
                        <Input
                          value={newLineOutput}
                          onChange={(e) => setNewLineOutput(e.target.value)}
                          placeholder="10"
                          inputMode="decimal"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setIsAddLineOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleAddLine}
                          disabled={saving || !newLineName.trim()}
                          className="bg-rice-primary hover:bg-rice-primary/90"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                          Create line
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-auto">
              {!loading && lines.length > 0 ? (
                <div className="space-y-1">
                  {lines.map((line) => (
                    <Collapsible
                      key={line.id}
                      open={seriesTreeOpen[line.id] !== false}
                      onOpenChange={(open) =>
                        setSeriesTreeOpen((prev) => ({ ...prev, [line.id]: open }))
                      }
                    >
                      <div className="flex items-center gap-1 group">
                        <CollapsibleTrigger
                          className={`flex items-center gap-2 flex-1 py-2 px-3 rounded-md hover:bg-gray-50 text-left font-medium min-w-0 ${
                            (line.status ?? "active") === "inactive" ? "opacity-50" : "text-gray-800"
                          }`}
                        >
                          {seriesTreeOpen[line.id] !== false ? (
                            <ChevronDown className="w-4 h-4 shrink-0 text-rice-primary" />
                          ) : (
                            <ChevronRight className="w-4 h-4 shrink-0 text-rice-primary" />
                          )}
                          <span className="truncate">{line.name}</span>
                          <span className="text-gray-400 font-normal text-sm shrink-0">
                            ({line.machines.length} machine{line.machines.length !== 1 ? "s" : ""})
                          </span>
                          {(line.status ?? "active") === "inactive" && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 shrink-0">
                              Inactive
                            </span>
                          )}
                        </CollapsibleTrigger>
                        <div
                          className="flex items-center gap-1 px-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Switch
                            checked={(line.status ?? "active") === "active"}
                            onCheckedChange={() => handleLineStatusToggle(line.id)}
                            aria-label={`${(line.status ?? "active") === "active" ? "Deactivate" : "Activate"} ${line.name}`}
                            title={`${(line.status ?? "active") === "active" ? "Deactivate" : "Activate"} line`}
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteLine(line.id)}
                            aria-label={`Delete line ${line.name}`}
                            title={`Delete line ${line.name}`}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <CollapsibleContent>
                        <div className="pl-6 pb-2">
                          {line.machines.length === 0 ? (
                            <p className="text-sm text-gray-500 pl-3">No machines in this series</p>
                          ) : (
                            <div className="flex flex-wrap gap-1 pl-3">
                              {line.machines.map((entry, idx) => {
                                const imageSrc = getMachineImageSrc(entry.name);
                                return (
                                  <span
                                    key={`${line.id}-${idx}-${entry.name}`}
                                    draggable
                                    onDragStart={() => handleDragStart(line.id, idx)}
                                    onDragOver={(e) => handleDragOver(e, idx)}
                                    onDrop={() => handleDrop(line.id, idx)}
                                    onDragEnd={handleDragEnd}
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] cursor-grab active:cursor-grabbing transition-all duration-150 ${
                                      dragState?.lineId === line.id && dragOverIdx === idx
                                        ? "border-rice-primary bg-rice-primary/10 border shadow-sm"
                                        : dragState?.lineId === line.id && dragState.fromIdx === idx
                                        ? "opacity-40 bg-gray-50 border border-gray-300 text-gray-600"
                                        : "bg-gray-50 border border-gray-200 text-gray-600 hover:border-gray-300"
                                    }`}
                                  >
                                    {imageSrc && (
                                      <img
                                        src={imageSrc}
                                        alt={entry.name}
                                        className="w-4 h-4 rounded-sm mr-1 object-cover"
                                      />
                                    )}
                                    {entry.name}{entry.machineNumber ? ` ${entry.machineNumber}` : ""}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-4">
                  {loading ? "Loading…" : "No series yet. Add entries using the form on the left."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Machine table: Machine Name, Model Series TPH, Machine Model, Series Name, Custom Label, Status, Action */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-rice-primary flex items-center gap-2">
              <Database className="w-5 h-5" />
              Machines
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              All machine entries with status and actions
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading…</div>
            ) : machineTableRows.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No machine entries yet. Add entries using the form above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-semibold text-gray-700">Machine Name</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Model Series TPH</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Machine Model</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Series Name</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Custom Label</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Status</th>
                      <th className="text-right p-3 font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machineTableRows.map((row) => {
                      const imageSrc = getMachineImageSrc(row.name);
                      return (
                        <tr key={`${row.lineIndex}-${row.entryIndex}`} className="border-b hover:bg-gray-50/80">
                          <td className="p-3 font-medium">
                            <div className="inline-flex items-center gap-2">
                              {imageSrc && (
                                <img
                                  src={imageSrc}
                                  alt={row.name}
                                  className="w-5 h-5 rounded-sm object-cover"
                                />
                              )}
                              <span>{row.name}{row.machineNumber ? ` ${row.machineNumber}` : ""}</span>
                            </div>
                          </td>
                          <td className="p-3">{row.seriesOutput ?? "-"}</td>
                        <td className="p-3">{row.machineModel ?? "-"}</td>
                        <td className="p-3">{row.seriesName}</td>
                        <td className="p-3">{row.customLabel ?? "-"}</td>
                        <td className="p-3">
                          <Switch
                            checked={row.status === "active"}
                            onCheckedChange={() => handleStatusToggle(row.lineIndex, row.entryIndex)}
                          />
                          <span className="ml-2 text-gray-600">{row.status === "active" ? "Active" : "Inactive"}</span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-600 hover:text-rice-primary hover:bg-rice-primary/10"
                              onClick={() => handleEditClick(row)}
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRemoveClick(row)}
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Custom machine name (Others) – same pattern as Variety in Grain Database */}
      <Dialog open={isMachineOtherDialogOpen} onOpenChange={setIsMachineOtherDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter custom machine name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="addbox-custom-machine">Machine name <span className="text-rice-primary">*</span></Label>
              <Input
                id="addbox-custom-machine"
                value={customMachineName}
                onChange={(e) => setCustomMachineName(e.target.value)}
                placeholder="Enter machine name"
                onKeyDown={(e) => e.key === "Enter" && handleCustomMachineSubmit()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsMachineOtherDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCustomMachineSubmit} className="bg-rice-primary hover:bg-rice-primary/90" disabled={!customMachineName.trim()}>
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit machine entry dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit machine entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Machine name <span className="text-rice-primary">*</span></Label>
              <Select
                value={editForm.name || "__none__"}
                onValueChange={(v) => {
                  if (v === "others") setIsMachineOtherDialogOpen(true);
                  else setEditForm((prev) => ({ ...prev, name: v === "__none__" ? "" : v }));
                }}
              >
                <SelectTrigger>
                  {editForm.name ? (
                    <span className="truncate">{formatMachineName(editForm.name)}</span>
                  ) : (
                    <SelectValue placeholder="Select machine" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select machine</SelectItem>
                  {MACHINE_NAME_OPTIONS.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                  {customMachineNames.map((name) => (
                    <SelectItem key={name} value={name} onDelete={() => handleDeleteMachineName(name)}>
                      {name}
                    </SelectItem>
                  ))}
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Series name <span className="text-rice-primary">*</span></Label>
              <p className="text-xs text-gray-500">Select another series or type a new one</p>
              <Popover open={editSeriesPopoverOpen} onOpenChange={setEditSeriesPopoverOpen}>
                <PopoverTrigger asChild>
                  <div className="w-full relative">
                    <Input
                      placeholder="Select or type series name"
                      value={editForm.seriesName}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, seriesName: e.target.value }))}
                      onFocus={() => setEditSeriesPopoverOpen(true)}
                      className="pr-9"
                    />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0 z-[100]"
                  align="start"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="max-h-48 overflow-auto">
                    {lines.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                        onClick={() => {
                          setEditForm((prev) => ({ ...prev, seriesName: l.name }));
                          setEditSeriesPopoverOpen(false);
                        }}
                      >
                        {l.name}
                      </button>
                    ))}
                    {lines.length === 0 && (
                      <p className="px-3 py-2 text-sm text-gray-500">Type a new series name above and Save to create it.</p>
                    )}
                    {lines.length > 0 && editForm.seriesName.trim() && !lines.some((l) => l.name.trim().toLowerCase() === editForm.seriesName.trim().toLowerCase()) && (
                      <p className="px-3 py-2 text-sm text-gray-500 border-t">New series: &quot;{editForm.seriesName}&quot; — Save to create.</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Machine Model</Label>
              <Input
                value={editForm.machineModel}
                onChange={(e) => setEditForm((prev) => ({ ...prev, machineModel: e.target.value }))}
                placeholder="e.g. APIT Whitener"
              />
            </div>
            <div className="space-y-2">
              <Label>Custom label (optional)</Label>
              <Input
                value={editForm.customLabel}
                onChange={(e) => setEditForm((prev) => ({ ...prev, customLabel: e.target.value }))}
                placeholder="Optional label"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleEditSave}
                className="bg-rice-primary hover:bg-rice-primary/90"
                disabled={!editForm.name.trim() || !editForm.seriesName.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove machine entry confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove machine entry</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            {deleteTarget != null && (() => {
              const line = lines[deleteTarget.lineIndex];
              const entry = line?.machines[deleteTarget.entryIndex];
              return entry
                ? `Are you sure you want to remove "${formatMachineName(entry.name)}" from "${line?.name}"? This action cannot be undone.`
                : "Remove this machine entry?";
            })()}
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveConfirm}>
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MachineDatabase;
