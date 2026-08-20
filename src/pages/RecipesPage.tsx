import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Factory,
  Wheat,
  Plus,
  Search,
  Trash2,
  Play,
  Star,
  X,
} from "lucide-react";
import { TopBarIOS } from "@/components/ios/TopBarIOS";
import { Tile } from "@/components/ios/Tile";
import { SegmentedControl } from "@/components/ios/SegmentedControl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  useRecipes,
  Recipe,
  AnalysisMode,
  MODE_TO_PATH,
  MODE_LABEL,
} from "@/contexts/RecipesContext";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { VarietyThumbnail } from "@/components/ios/VarietyThumbnail";

type ModeFilter = "all" | AnalysisMode;

const MODE_ICON: Record<AnalysisMode, typeof ShoppingCart> = {
  procurement: ShoppingCart,
  production: Factory,
  "milled-rice": Wheat,
};

const MODE_COLOR: Record<AnalysisMode, string> = {
  procurement: "hsl(var(--ios-green))",
  production: "hsl(var(--accent))",
  "milled-rice": "hsl(var(--ios-orange))",
};

const RecipesPage = () => {
  const navigate = useNavigate();
  const { recipes, addRecipe, deleteRecipe, markUsed } = useRecipes();
  const sounds = useSoundEffects();

  const [filter, setFilter] = useState<ModeFilter>("all");
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Recipe>>({ mode: "procurement" });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recipes
      .filter((r) => filter === "all" || r.mode === filter)
      .filter(
        (r) =>
          !q ||
          r.name.toLowerCase().includes(q) ||
          (r.variety ?? "").toLowerCase().includes(q) ||
          (r.process ?? "").toLowerCase().includes(q) ||
          (r.notes ?? "").toLowerCase().includes(q),
      )
      .sort((a, b) => (b.useCount ?? 0) - (a.useCount ?? 0));
  }, [recipes, filter, search]);

  const launch = (recipe: Recipe) => {
    markUsed(recipe.id);
    sounds.play("start");
    navigate(`${MODE_TO_PATH[recipe.mode]}?recipe=${encodeURIComponent(recipe.id)}`);
  };

  const openEditor = () => {
    setDraft({ mode: "procurement", region: "non-basmati" });
    setEditorOpen(true);
  };

  const saveRecipe = () => {
    if (!draft.name?.trim() || !draft.mode) return;
    addRecipe({
      name: draft.name.trim(),
      mode: draft.mode,
      variety: draft.variety,
      process: draft.process,
      region: draft.region,
      samplingPoint: draft.samplingPoint,
      operator: draft.operator,
      millName: draft.millName,
      notes: draft.notes,
    });
    setEditorOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBarIOS title="Recipes" subtitle={`${recipes.length} saved preset${recipes.length === 1 ? "" : "s"}`} />

      <div className="px-6 py-6 max-w-[1200px] w-full mx-auto space-y-5">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 ios-surface border ios-hairline rounded-[10px] px-3 h-10 flex-1 min-w-[220px]">
            <Search className="w-4 h-4 ios-text-tertiary shrink-0" />
            <input
              type="text"
              placeholder="Search recipes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[14px] ios-text outline-none placeholder:ios-text-tertiary"
            />
          </div>
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as ModeFilter)}
            segments={[
              { value: "all", label: "All" },
              { value: "procurement", label: "Procurement" },
              { value: "production", label: "Production" },
              { value: "milled-rice", label: "Milled" },
            ]}
          />
          <button
            type="button"
            onClick={openEditor}
            className="h-10 px-4 rounded-[10px] flex items-center gap-2 text-[13px] font-semibold transition-transform duration-150 ios-spring hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "hsl(var(--accent))",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            <Plus className="w-4 h-4" />
            New recipe
          </button>
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <Tile className="text-center py-12">
            <div className="ios-text-tertiary text-[14px]">
              {search ? "No recipes match this search." : "No recipes yet — tap New recipe to create one."}
            </div>
          </Tile>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((recipe) => {
              const Icon = MODE_ICON[recipe.mode];
              const color = MODE_COLOR[recipe.mode];
              return (
                <Tile key={recipe.id} className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <VarietyThumbnail variety={recipe.variety ?? recipe.name} size={44} />
                      <div
                        className="w-7 h-7 rounded-[8px] flex items-center justify-center text-white shrink-0"
                        style={{ background: color }}
                        title={MODE_LABEL[recipe.mode]}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(recipe.useCount ?? 0) >= 5 && (
                        <Star className="w-3.5 h-3.5" style={{ color: "hsl(var(--ios-orange))", fill: "hsl(var(--ios-orange))" }} />
                      )}
                      <button
                        type="button"
                        onClick={() => deleteRecipe(recipe.id)}
                        className="ios-text-tertiary hover:ios-red transition-colors"
                        aria-label="Delete recipe"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold ios-text leading-tight">{recipe.name}</div>
                    <div className="text-[11px] uppercase tracking-wider ios-text-tertiary font-semibold mt-1">
                      {MODE_LABEL[recipe.mode]}
                      {recipe.region && ` · ${recipe.region === "basmati" ? "Basmati" : "Non-Basmati"}`}
                    </div>
                  </div>
                  <div className="text-[12px] ios-text-secondary space-y-0.5">
                    {recipe.variety && (
                      <div>
                        <span className="ios-text-tertiary">Variety: </span>
                        <span className="ios-text">{recipe.variety}</span>
                      </div>
                    )}
                    {recipe.process && (
                      <div>
                        <span className="ios-text-tertiary">Process: </span>
                        <span className="ios-text">{recipe.process}</span>
                      </div>
                    )}
                    {recipe.samplingPoint && (
                      <div>
                        <span className="ios-text-tertiary">Sampling: </span>
                        <span className="ios-text">{recipe.samplingPoint}</span>
                      </div>
                    )}
                    {recipe.operator && (
                      <div>
                        <span className="ios-text-tertiary">Operator: </span>
                        <span className="ios-text">{recipe.operator}</span>
                      </div>
                    )}
                  </div>
                  {recipe.notes && (
                    <div className="text-[12px] ios-text-tertiary border-t ios-hairline pt-2">
                      {recipe.notes}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t ios-hairline">
                    <div className="text-[11px] ios-text-tertiary">
                      {recipe.useCount ?? 0} run{recipe.useCount === 1 ? "" : "s"}
                    </div>
                    <button
                      type="button"
                      onClick={() => launch(recipe)}
                      className="rounded-[10px] px-3 py-1.5 flex items-center gap-1.5 text-[12px] font-semibold hover:scale-[1.04] active:scale-[0.96] transition-transform duration-150 ios-spring"
                      style={{
                        background: "hsl(var(--accent) / 0.12)",
                        color: "hsl(var(--accent))",
                      }}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Launch
                    </button>
                  </div>
                </Tile>
              );
            })}
          </div>
        )}

      </div>

      {/* Editor */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>New recipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FormRow label="Name">
              <Input
                value={draft.name ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Sona Masuri morning intake"
              />
            </FormRow>
            <FormRow label="Mode">
              <SegmentedControl
                value={draft.mode ?? "procurement"}
                onChange={(v) => setDraft((d) => ({ ...d, mode: v as AnalysisMode }))}
                segments={[
                  { value: "procurement", label: "Procurement" },
                  { value: "production", label: "Production" },
                  { value: "milled-rice", label: "Milled" },
                ]}
              />
            </FormRow>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Variety">
                <Input
                  value={draft.variety ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, variety: e.target.value }))}
                  placeholder="Sona masuri"
                />
              </FormRow>
              <FormRow label="Process">
                <Input
                  value={draft.process ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, process: e.target.value }))}
                  placeholder="Raw / Parboiled"
                />
              </FormRow>
            </div>
            <FormRow label="Region">
              <SegmentedControl
                value={draft.region ?? "non-basmati"}
                onChange={(v) => setDraft((d) => ({ ...d, region: v as "basmati" | "non-basmati" }))}
                segments={[
                  { value: "non-basmati", label: "Non-Basmati" },
                  { value: "basmati", label: "Basmati" },
                ]}
              />
            </FormRow>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Operator">
                <Input
                  value={draft.operator ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, operator: e.target.value }))}
                />
              </FormRow>
              <FormRow label="Mill / line">
                <Input
                  value={draft.millName ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, millName: e.target.value }))}
                />
              </FormRow>
            </div>
            <FormRow label="Sampling point">
              <Input
                value={draft.samplingPoint ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, samplingPoint: e.target.value }))}
                placeholder="After polishing / Bagging / Sortex outlet"
              />
            </FormRow>
            <FormRow label="Notes">
              <Input
                value={draft.notes ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              />
            </FormRow>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button onClick={saveRecipe} disabled={!draft.name?.trim()}>
              Save recipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wider ios-text-tertiary font-semibold">
        {label}
      </Label>
      {children}
    </div>
  );
}

export default RecipesPage;
