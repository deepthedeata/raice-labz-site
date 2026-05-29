import { useEffect, useState, useCallback } from "react";
import { RiceStrip } from "@/components/ios/RiceStrip";
import { THEME_META, ThemeMode } from "@/components/ios/theme-provider";

interface LoadingPageProps {
  onLoadingComplete: () => void;
}

const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

type CheckStatus = "pending" | "running" | "success" | "warning" | "error";

interface SystemCheck {
  id: string;
  label: string;
  critical: boolean;
  status: CheckStatus;
  message?: string;
}

const INITIAL_CHECKS: SystemCheck[] = [
  { id: "database", label: "Database Connection", critical: true, status: "pending" },
  { id: "graindb", label: "Grain Database", critical: false, status: "pending" },
  { id: "models", label: "Analysis Engine", critical: true, status: "pending" },
  { id: "camera", label: "Camera Hardware", critical: false, status: "pending" },
  { id: "hardware", label: "Hardware Control", critical: false, status: "pending" },
];

/** Read persisted theme + apply data-theme attribute early so the loading
 *  splash already matches the theme the user picked last session. */
function readTheme(): ThemeMode {
  try {
    const t = localStorage.getItem("raice-theme");
    if (!t || !THEME_META[t as ThemeMode]) return "apple";
    return t as ThemeMode;
  } catch {
    return "apple";
  }
}

const LoadingPage: React.FC<LoadingPageProps> = ({ onLoadingComplete }) => {
  const [progress, setProgress] = useState(0);
  const [checks, setChecks] = useState<SystemCheck[]>(INITIAL_CHECKS);
  const [allDone, setAllDone] = useState(false);
  const [canEnter, setCanEnter] = useState(false);
  const [theme] = useState<string>(() => {
    const t = readTheme();
    // Apply early so the splash itself adopts the theme tokens.
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", t);
      if (t === "kuber" || t === "nord" || t === "linear") {
        document.documentElement.classList.add("dark");
      }
    }
    return t;
  });

  const isClassic = theme === "classic";

  const updateCheck = useCallback(
    (id: string, status: CheckStatus, message?: string) => {
      setChecks((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status, message } : c))
      );
    },
    []
  );

  // Run real system checks sequentially
  useEffect(() => {
    let cancelled = false;

    const runChecks = async () => {
      // 1. Database / MongoDB connection
      updateCheck("database", "running");
      try {
        const res = await fetch(`${BACKEND_URL}/api/raice_labz/debug/database-connection`, { signal: AbortSignal.timeout(5000) });
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            const connected = data.connection_status?.startsWith("connected");
            updateCheck("database", connected ? "success" : "error", connected ? "Connected" : "Connection failed");
          } else {
            updateCheck("database", "error", `HTTP ${res.status}`);
          }
        }
      } catch {
        if (!cancelled) updateCheck("database", "error", "Unreachable");
      }

      updateCheck("graindb", "running");
      try {
        const res = await fetch(`${BACKEND_URL}/api/raice_labz/grain-info/varieties`, { signal: AbortSignal.timeout(5000) });
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            const hasData = Array.isArray(data.varieties) && data.varieties.length > 0;
            updateCheck("graindb", hasData ? "success" : "warning", hasData ? "Connected" : "No grain data");
          } else {
            updateCheck("graindb", "warning", "Unavailable");
          }
        }
      } catch {
        if (!cancelled) updateCheck("graindb", "warning", "Unreachable");
      }

      updateCheck("models", "running");
      try {
        const res = await fetch(`${BACKEND_URL}/api/models/health`, { signal: AbortSignal.timeout(8000) });
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            updateCheck("models", data.ready ? "success" : "error", data.ready ? "Connected" : (data.message || "Models not loaded"));
          } else {
            updateCheck("models", "error", `HTTP ${res.status}`);
          }
        }
      } catch {
        if (!cancelled) updateCheck("models", "error", "Unreachable");
      }

      updateCheck("camera", "running");
      try {
        const res = await fetch(`${BACKEND_URL}/api/camera/check`, { signal: AbortSignal.timeout(5000) });
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            updateCheck("camera", data.available ? "success" : "warning", data.available ? "Connected" : "Not detected — check camera connection");
          } else {
            updateCheck("camera", "warning", "Unavailable — check camera connection");
          }
        }
      } catch {
        if (!cancelled) updateCheck("camera", "warning", "Unreachable — check camera connection");
      }

      updateCheck("hardware", "running");
      try {
        const res = await fetch(`${BACKEND_URL}/api/modbus_rtu/status`, { signal: AbortSignal.timeout(5000) });
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            if (data.connected) {
              updateCheck("hardware", "success", "Connected");
            } else {
              const hint = data.port_open
                ? "Machine not responding — check power & cable"
                : "No device found — check USB connection";
              updateCheck("hardware", "warning", hint);
            }
          } else {
            updateCheck("hardware", "warning", "Unavailable — check machine power");
          }
        }
      } catch {
        if (!cancelled) updateCheck("hardware", "warning", "Unreachable — check machine power");
      }
    };

    runChecks();
    return () => { cancelled = true; };
  }, [updateCheck]);

  // Drive progress bar from real check completion
  useEffect(() => {
    const completedCount = checks.filter(
      (c) => c.status === "success" || c.status === "warning" || c.status === "error"
    ).length;
    setProgress(Math.round((completedCount / checks.length) * 100));

    const done = checks.length > 0 && checks.every((c) => c.status !== "pending" && c.status !== "running");
    setAllDone(done);
    if (done) {
      const criticalFailed = checks.some((c) => c.critical && c.status === "error");
      setCanEnter(!criticalFailed);
    }
  }, [checks]);

  /* ─── Classic theme — original blue gradient splash, untouched ─── */
  if (isClassic) {
    const dotColor = (status: CheckStatus) => {
      switch (status) {
        case "success": return "bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.6)]";
        case "warning": return "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]";
        case "error": return "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]";
        case "running": return "bg-blue-300 animate-pulse";
        default: return "bg-blue-300/30";
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col items-center justify-center text-center">
        <div className="mb-6 animate-logo-glow">
          <img src="/company-logo.png" alt="Company Logo" className="h-40 w-auto mx-auto" />
        </div>
        <div className="mb-6">
          <p className="text-white text-2xl font-bold tracking-widest">
            {!allDone ? "INITIALIZING..." : canEnter
              ? (checks.some((c) => c.status === "warning") ? "CHECK MACHINE" : "READY!")
              : "CHECK FAILED"}
          </p>
        </div>
        <div className="w-96 mb-8">
          <div className="bg-blue-400/30 rounded-full h-2 overflow-hidden">
            <div className="bg-yellow-400 h-full transition-all duration-100 ease-out rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="w-80 mb-8 text-left space-y-2">
          {checks.map((check) => (
            <div key={check.id} className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-300 ${dotColor(check.status)}`} />
              <span className="text-sm text-blue-100/80 font-mono flex-1">{check.label}</span>
              <span className={`text-xs font-mono ${
                check.status === "success" ? "text-yellow-400/80"
                : check.status === "warning" ? "text-amber-400/80"
                : check.status === "error" ? "text-red-400/80"
                : check.status === "running" ? "text-blue-200/60"
                : "text-blue-300/30"
              }`}>
                {check.status === "pending" ? "..." : check.status === "running" ? "checking" : check.message || check.status}
              </span>
            </div>
          ))}
        </div>
        {!allDone && (
          <div className="relative mb-8">
            <div className="w-16 h-16 border-4 border-blue-300/30 border-t-blue-400 rounded-full animate-spin"></div>
          </div>
        )}
        {allDone && (
          <button
            type="button"
            disabled={!canEnter}
            onClick={onLoadingComplete}
            className={`px-8 py-3 rounded-lg font-bold text-lg tracking-wider transition-all duration-300 ${
              canEnter
                ? "bg-yellow-400 hover:bg-yellow-300 text-blue-900 shadow-lg hover:shadow-xl cursor-pointer"
                : "bg-red-500/20 text-red-300/60 border border-red-400/30 cursor-not-allowed"
            }`}
          >
            {canEnter ? "ENTER SYSTEM →" : "CRITICAL CHECK FAILED"}
          </button>
        )}
        <style>{`
          @keyframes logoGlow {
            0%, 100% { filter: drop-shadow(0 0 8px rgba(96,165,250,0.3)); }
            50% { filter: drop-shadow(0 0 24px rgba(96,165,250,0.7)); }
          }
          .animate-logo-glow { animation: logoGlow 3s ease-in-out infinite; }
        `}</style>
      </div>
    );
  }

  /* ─── iOS themes — clean concentric-ring splash ─── */
  return <LoadingPageIOS
    progress={progress}
    checks={checks}
    allDone={allDone}
    canEnter={canEnter}
    onLoadingComplete={onLoadingComplete}
  />;
};

interface IOSProps {
  progress: number;
  checks: SystemCheck[];
  allDone: boolean;
  canEnter: boolean;
  onLoadingComplete: () => void;
}

const themeStyles: Record<Exclude<ThemeMode, "classic">, {
  pageBg: string;
  heroBg: string;
  cardBg: string;
  buttonBg: string;
  buttonText: string;
  text: string;
  subtext: string;
  accent: string;
  accentSoft: string;
  glow: string;
}> = {
  apit: {
    pageBg: "linear-gradient(180deg, #071124 0%, #0C1F42 40%, #09122B 100%)",
    heroBg: "rgba(15, 23, 42, 0.95)",
    cardBg: "rgba(15, 23, 42, 0.82)",
    buttonBg: "#FACC15",
    buttonText: "#0F172A",
    text: "#F8FAFC",
    subtext: "#CBD5E1",
    accent: "#FACC15",
    accentSoft: "rgba(250, 204, 21, 0.2)",
    glow: "rgba(250, 204, 21, 0.22)",
  },
  apple: {
    pageBg: "linear-gradient(180deg, #F5F7FB 0%, #E2E8F0 44%, #F9FAFB 100%)",
    heroBg: "rgba(255, 255, 255, 0.96)",
    cardBg: "rgba(255, 255, 255, 0.88)",
    buttonBg: "#007AFF",
    buttonText: "#FFFFFF",
    text: "#0F172A",
    subtext: "#64748B",
    accent: "#007AFF",
    accentSoft: "rgba(0, 122, 255, 0.18)",
    glow: "rgba(0, 122, 255, 0.15)",
  },
  kuber: {
    pageBg: "linear-gradient(180deg, #051226 0%, #071834 44%, #091f3f 100%)",
    heroBg: "rgba(6, 18, 40, 0.96)",
    cardBg: "rgba(10, 25, 49, 0.86)",
    buttonBg: "#60A5FA",
    buttonText: "#0F172A",
    text: "#FFFFFF",
    subtext: "#E2E8F0",
    accent: "#60A5FA",
    accentSoft: "rgba(96, 165, 250, 0.22)",
    glow: "rgba(96, 165, 250, 0.2)",
  },
};

const LoadingPageIOS: React.FC<IOSProps> = ({ progress, checks, allDone, canEnter, onLoadingComplete }) => {
  const ringSize = 180;
  const stroke = 14;
  const r = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - progress / 100);

  const theme = readTheme();
  const visual = (themeStyles as Record<string, typeof themeStyles.apit>)[theme] ?? themeStyles.apple;

  const headline = !allDone
    ? "Initializing"
    : canEnter
      ? (checks.some((c) => c.status === "warning") ? "Check machine" : "Ready")
      : "Critical check failed";

  const tone = allDone && !canEnter ? "#EF4444" : visual.accent;
  const [visibleChecks, setVisibleChecks] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleChecks((prev) => (prev < checks.length ? prev + 1 : prev));
    }, 500);
    return () => clearInterval(interval);
  }, [checks.length]);

  return (
    <div className="min-h-screen px-4 py-5 flex items-center justify-center" style={{ background: visual.pageBg, color: visual.text }}>
      <style>{`
        @keyframes logoPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes checkmark {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        .animate-checkmark {
          animation: checkmark 0.5s ease-in-out forwards;
        }
      `}</style>
      <div className="w-full max-w-4xl flex flex-col justify-between min-h-[calc(100vh-2rem)]">
        <div className="overflow-hidden rounded-[36px] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.45)] border" style={{ background: visual.heroBg, borderColor: visual.accentSoft }}>
          <div className="px-8 py-10 sm:px-10 sm:py-12 text-center flex items-center justify-center">
            <div className="mx-auto flex items-center justify-center animate-[logoPulse_2s_ease-in-out_infinite]" style={{ width: "fit-content" }}>
              <img src="/company-logo.png" alt="Company Logo" className="block h-32 w-auto" />
            </div>
          </div>

          <div className="px-8 pt-8 pb-6 sm:px-10 flex flex-col items-center text-center">
            <div className="text-xl sm:text-2xl font-bold uppercase tracking-[0.32em]" style={{ color: visual.text }}>
              {!allDone ? "INITIALIZING..." : canEnter ? (checks.some((c) => c.status === "warning") ? "CHECK MACHINE" : "READY!") : "CHECK FAILED"}
            </div>
            <div className="mt-5 h-3 w-full max-w-3xl rounded-full overflow-hidden" style={{ background: visual.cardBg }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: visual.accent }} />
            </div>
          </div>

          <div className="px-8 pb-10 sm:px-10 flex justify-center">
            <RiceStrip count={12} fill={progress / 100} grainW={12} grainH={26} tilt={-22} animate />
          </div>
        </div>

        <div className="mt-8 rounded-[32px] border p-5 sm:p-6 backdrop-blur-xl" style={{ background: visual.cardBg, borderColor: visual.accentSoft }}>
          <div className="text-xs uppercase tracking-[0.24em] mb-4" style={{ color: visual.subtext }}>Diagnostics</div>
          <div className="space-y-3">
            {checks.slice(0, visibleChecks).map((check) => (
              <div
                key={check.id}
                className="flex items-center gap-3 rounded-2xl border px-4 py-3"
                style={{ background: `rgba(255,255,255,0.05)`, borderColor: visual.accentSoft }}
              >
                <CheckDot status={check.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: visual.text }}>{check.label}</div>
                  {check.message && (
                    <div className="text-[11px] truncate" style={{ color: visual.subtext }}>{check.message}</div>
                  )}
                </div>
                <CheckBadge status={check.status} visual={visual} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          {allDone ? (
            <button
              type="button"
              disabled={!canEnter}
              onClick={onLoadingComplete}
              className="inline-flex h-12 items-center justify-center rounded-full px-10 font-semibold transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: visual.buttonBg, color: visual.buttonText }}
            >
              {canEnter ? "Enter system" : "Critical check failed"}
            </button>
          ) : (
            <div className="text-sm uppercase tracking-[0.24em]" style={{ color: visual.subtext }}>Running diagnostics…</div>
          )}
        </div>
      </div>
    </div>
  );
};

function CheckDot({ status }: { status: CheckStatus }) {
  let bg = "hsl(var(--ios-text-tertiary))";
  let pulse = false;
  if (status === "success") bg = "hsl(var(--ios-green))";
  else if (status === "warning") bg = "hsl(var(--ios-orange))";
  else if (status === "error") bg = "hsl(var(--ios-red))";
  else if (status === "running") {
    bg = "hsl(var(--accent))";
    pulse = true;
  }
  return (
    <span className="relative inline-flex shrink-0" style={{ width: 8, height: 8 }}>
      {pulse && (
        <span
          className="ios-pulse absolute inset-0 rounded-full opacity-60"
          style={{ background: bg }}
        />
      )}
      <span
        className="relative inline-block rounded-full"
        style={{ width: 8, height: 8, background: bg }}
      />
    </span>
  );
}

function CheckBadge({ status, visual }: { status: CheckStatus; visual: typeof themeStyles.apit }) {
  if (status === "pending") return <span className="text-[11px] font-medium" style={{ color: visual.subtext }}>Queued</span>;
  if (status === "running") return <span className="text-[11px] font-medium" style={{ color: visual.accent }}>Checking…</span>;
  if (status === "success") return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-checkmark" style={{ color: "hsl(var(--ios-green))" }}>
      <path
        d="M20 6L9 17l-5-5"
        style={{ strokeDasharray: 24, strokeDashoffset: 24, animation: "checkmark 0.5s ease-in-out forwards" }}
      />
    </svg>
  );
  if (status === "warning") return <span className="text-[11px] font-semibold" style={{ color: "hsl(var(--ios-orange))" }}>Warn</span>;
  return <span className="text-[11px] font-semibold" style={{ color: "hsl(var(--ios-red))" }}>Fail</span>;
}

export default LoadingPage;
