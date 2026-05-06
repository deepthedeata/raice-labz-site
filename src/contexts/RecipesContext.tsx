import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

const STORAGE_KEY = "raice-recipes";

export type AnalysisMode = "procurement" | "production" | "milled-rice";

export interface Recipe {
  id: string;
  name: string;
  mode: AnalysisMode;
  variety?: string;
  process?: string;
  region?: "basmati" | "non-basmati";
  samplingPoint?: string;
  operator?: string;
  millName?: string;
  notes?: string;
  /** unix ms */
  createdAt: number;
  /** unix ms — last time this recipe was used to start a run */
  lastUsedAt?: number;
  /** Times the recipe has been used to launch a run. */
  useCount?: number;
}

interface RecipesCtx {
  recipes: Recipe[];
  addRecipe: (r: Omit<Recipe, "id" | "createdAt" | "useCount">) => Recipe;
  updateRecipe: (id: string, patch: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  markUsed: (id: string) => void;
  getById: (id: string) => Recipe | undefined;
}

const RecipesContext = createContext<RecipesCtx | null>(null);

const seedRecipes: Recipe[] = [
  {
    id: "seed-1",
    name: "Sona Masuri · Procurement · Morning",
    mode: "procurement",
    variety: "sona masuri",
    process: "raw",
    region: "non-basmati",
    operator: "Operator A",
    millName: "Plant 2",
    notes: "Standard morning paddy intake check.",
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    useCount: 12,
  },
  {
    id: "seed-2",
    name: "Basmati 1121 · Milled Rice · Bagging",
    mode: "milled-rice",
    variety: "basmati 1121",
    process: "parboiled",
    region: "basmati",
    samplingPoint: "Bagging",
    operator: "Operator B",
    notes: "Final-stage check before sealing bags.",
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    useCount: 5,
  },
  {
    id: "seed-3",
    name: "Series A · Production sweep",
    mode: "production",
    variety: "sona masuri",
    process: "raw",
    region: "non-basmati",
    operator: "Operator A",
    notes: "Run after each shift change.",
    createdAt: Date.now() - 24 * 60 * 60 * 1000,
    useCount: 2,
  },
];

function loadFromStorage(): Recipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedRecipes;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Recipe[];
    return seedRecipes;
  } catch {
    return seedRecipes;
  }
}

function saveToStorage(recipes: Recipe[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  } catch {
    /* swallow — storage may be full */
  }
}

export function RecipesProvider({ children }: { children: ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(recipes);
  }, [recipes]);

  const addRecipe: RecipesCtx["addRecipe"] = useCallback((r) => {
    const recipe: Recipe = {
      ...r,
      id: `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      useCount: 0,
    };
    setRecipes((prev) => [recipe, ...prev]);
    return recipe;
  }, []);

  const updateRecipe: RecipesCtx["updateRecipe"] = useCallback((id, patch) => {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const deleteRecipe: RecipesCtx["deleteRecipe"] = useCallback((id) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const markUsed: RecipesCtx["markUsed"] = useCallback((id) => {
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, lastUsedAt: Date.now(), useCount: (r.useCount ?? 0) + 1 }
          : r,
      ),
    );
  }, []);

  const getById: RecipesCtx["getById"] = useCallback(
    (id) => recipes.find((r) => r.id === id),
    [recipes],
  );

  return (
    <RecipesContext.Provider
      value={{ recipes, addRecipe, updateRecipe, deleteRecipe, markUsed, getById }}
    >
      {children}
    </RecipesContext.Provider>
  );
}

export function useRecipes(): RecipesCtx {
  const ctx = useContext(RecipesContext);
  if (!ctx) throw new Error("useRecipes must be used inside <RecipesProvider>");
  return ctx;
}

export const MODE_TO_PATH: Record<AnalysisMode, string> = {
  procurement: "/procurement-analysis",
  production: "/production-analysis",
  "milled-rice": "/milled-rice-analysis",
};

export const MODE_LABEL: Record<AnalysisMode, string> = {
  procurement: "Procurement",
  production: "Production",
  "milled-rice": "Milled rice",
};
