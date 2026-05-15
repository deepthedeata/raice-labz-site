import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMachine, DEFAULT_MACHINE_OPTIONS } from "@/contexts/MachineContext";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, Loader2, ChevronDown, ChevronRight, FolderTree, Pencil, Database } from "lucide-react";
import { Switch } from "@/components/ui/switch";
/** Single machine entry in a series (supports optional number, label, and status).
 * status is persisted to DB via rice-mill settings for use in analysis/reporting. */
export type MachineEntry = {
  name: string;
  machineNumber?: string;
  customLabel?: string;
  status?: "active" | "inactive";
};

/** Normalize API value to MachineEntry (backend may send string or object) */
function toMachineEntry(m: string | MachineEntry): MachineEntry {
  if (typeof m === "string") return { name: m, status: "active" };
  return {
    name: m.name,
    machineNumber: m.machineNumber,
    customLabel: m.customLabel,
    status: m.status === "inactive" ? "inactive" : "active",
  };
}

/** Display machine name with first letter capital per word (not full caps) */
function formatMachineName(name: string): string {
  if (!name.trim()) return name;
  return name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Line/series configuration. machines are full entries (name + optional number/label). */
type LineConfig = { id: string; name: string; output: string; machines: MachineEntry[] };

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
  const [addBoxSeriesOutput, setAddBoxSeriesOutput] = useState("10.0");
  const [addBoxMachineNumber, setAddBoxMachineNumber] = useState("");
  const [addBoxCustomLabel, setAddBoxCustomLabel] = useState("");
  // "Others" dialog for custom machine name (same pattern as Variety in Grain Database)
  const [isMachineOtherDialogOpen, setIsMachineOtherDialogOpen] = useState(false);
  const [customMachineName, setCustomMachineName] = useState("");
  const [seriesDropdownOpen, setSeriesDropdownOpen] = useState(false);
  /** Which series are expanded in the classification tree (default: all open) */
  const [seriesTreeOpen, setSeriesTreeOpen] = useState<Record<string, boolean>>({});
  /** Machine table: edit dialog */
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<{ lineIndex: number; entryIndex: number } | null>(null);
  const [editForm, setEditForm] = useState({ name: "", seriesName: "", machineNumber: "", customLabel: "" });
  /** Machine table: remove confirmation */
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ lineIndex: number; entryIndex: number } | null>(null);
  /** Edit dialog: series name popover open */
  const [editSeriesPopoverOpen, setEditSeriesPopoverOpen] = useState(false);

  const availableMachines = machines.length > 0 ? machines : DEFAULT_MACHINE_OPTIONS;
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
    setAddBoxSeriesOutput(existing ? existing.output : "10.0");
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
  const handleCustomMachineSubmit = useCallback(() => {
    const name = customMachineName.trim();
    if (!name) return;
    if (!machines.includes(name)) {
      setMachines([...machines, name]);
    }
    if (editDialogOpen) {
      setEditForm((prev) => ({ ...prev, name }));
    } else {
      setAddBoxMachineValue(name);
    }
    setCustomMachineName("");
    setIsMachineOtherDialogOpen(false);
  }, [customMachineName, machines, setMachines, editDialogOpen]);

  /** Top addition box: add one machine entry (name, series, machine number, custom label) */
  const handleAddFromTopBox = useCallback(async () => {
    const machineName = (addBoxMachineValue || "").trim();
    if (!machineName) {
      toast({ title: "Invalid", description: "Select or enter a machine name.", variant: "destructive" });
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
        output: addBoxSeriesOutput.trim() || "10.0",
        machines: [],
      };
      targetLines = [...targetLines, newLine];
      lineIndex = targetLines.length - 1;
    }
    const targetLine = targetLines[lineIndex];
    const newEntry: MachineEntry = {
      name: machineName,
      machineNumber: addBoxMachineNumber.trim() || undefined,
      customLabel: addBoxCustomLabel.trim() || undefined,
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
    setAddBoxMachineNumber("");
    setAddBoxCustomLabel("");
    const saved = await persist(
      { lines: updatedLines, machines: updatedCatalog },
      { showToast: true, successMessage: "Machine entry added." }
    );
    if (!saved) {
      toast({ title: "Failed to sync", description: "Entry added locally but not saved to database.", variant: "destructive" });
    }
  }, [addBoxMachineValue, addBoxSeriesName, addBoxSeriesOutput, addBoxMachineNumber, addBoxCustomLabel, lines, machines, setMachines, persist, toast]);

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
        machineNumber: row.machineNumber ?? "",
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
      machineNumber: editForm.machineNumber.trim() || undefined,
      customLabel: editForm.customLabel.trim() || undefined,
      status: entry.status ?? "active",
    };
    const targetLineIndex = lines.findIndex((l) => l.name.trim().toLowerCase() === seriesName.toLowerCase());
    let updatedLines: LineConfig[];
    if (targetLineIndex === -1) {
      const newLine: LineConfig = {
        id: `line_${Date.now()}`,
        name: seriesName,
        output: "10.0",
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
                <Select value={addBoxMachineValue || "__none__"} onValueChange={handleAddBoxMachineChange}>
                  <SelectTrigger id="addbox-machine" className="w-full">
                    {addBoxMachineValue ? (
                      <span className="truncate">{formatMachineName(addBoxMachineValue)}</span>
                    ) : (
                      <SelectValue placeholder="Select machine" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select machine…</SelectItem>
                    {[
                      ...availableMachines,
                      ...(addBoxMachineValue && !availableMachines.includes(addBoxMachineValue) ? [addBoxMachineValue] : []),
                    ].map((name) => (
                      <SelectItem
                        key={name}
                        value={name}
                        onDelete={() => handleDeleteMachineName(name)}
                      >
                        {formatMachineName(name)}
                      </SelectItem>
                    ))}
                    <SelectItem value="others">Others</SelectItem>
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
                        onChange={(e) => setAddBoxSeriesName(e.target.value)}
                        onFocus={() => setSeriesDropdownOpen(true)}
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
                    step="0.1"
                    min="0"
                    value={addBoxSeriesOutput}
                    onChange={(e) => setAddBoxSeriesOutput(e.target.value)}
                    placeholder="10.0"
                    className="pr-14"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-gray-600">
                    TPH
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addbox-number">Machine number</Label>
                <Input
                  id="addbox-number"
                  type="text"
                  inputMode="text"
                  placeholder="Alphanumeric"
                  value={addBoxMachineNumber}
                  onChange={(e) => setAddBoxMachineNumber(e.target.value)}
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
              <CardTitle className="text-rice-primary flex items-center gap-2">
                <FolderTree className="w-5 h-5" />
                Series & Machine Classification
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Series and machine hierarchy from saved entries
              </p>
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
                      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 rounded-md hover:bg-gray-50 text-left font-medium text-gray-800">
                        {seriesTreeOpen[line.id] !== false ? (
                          <ChevronDown className="w-4 h-4 shrink-0 text-rice-primary" />
                        ) : (
                          <ChevronRight className="w-4 h-4 shrink-0 text-rice-primary" />
                        )}
                        <span>{line.name}</span>
                        <span className="text-gray-400 font-normal text-sm">
                          ({line.machines.length} machine{line.machines.length !== 1 ? "s" : ""})
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-6 pb-2">
                          {line.machines.length === 0 ? (
                            <p className="text-sm text-gray-500 pl-3">No machines in this series</p>
                          ) : (
                            <div className="flex flex-wrap gap-1 pl-3">
                              {line.machines.map((entry, idx) => (
                                <span
                                  key={`${line.id}-${idx}-${entry.name}`}
                                  className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600 border border-gray-200"
                                >
                                  {formatMachineName(entry.name)}
                                </span>
                              ))}
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
                      <th className="text-left p-3 font-semibold text-gray-700">Machine Number</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Series Name</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Custom Label</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Status</th>
                      <th className="text-right p-3 font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machineTableRows.map((row) => (
                      <tr key={`${row.lineIndex}-${row.entryIndex}`} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{formatMachineName(row.name)}</td>
                        <td className="p-3">{row.seriesOutput ?? "-"}</td>
                        <td className="p-3">{row.machineNumber ?? "-"}</td>
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
                    ))}
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
                  {availableMachines.map((m) => (
                    <SelectItem key={m} value={m}>
                      {formatMachineName(m)}
                    </SelectItem>
                  ))}
                  <SelectItem value="others">Others…</SelectItem>
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
              <Label>Machine number</Label>
              <Input
                value={editForm.machineNumber}
                onChange={(e) => setEditForm((prev) => ({ ...prev, machineNumber: e.target.value }))}
                placeholder="Alphanumeric"
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
