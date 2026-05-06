import { useEffect, useState, useCallback } from "react";
import { RiceStrip } from "@/components/ios/RiceStrip";

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
function readTheme(): string {
  try {
    const t = localStorage.getItem("raice-theme");
    if (!t) return "apple";
    return t;
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
        <h1 className="text-8xl font-bold text-white mb-4 tracking-wide">RAICE LABZ</h1>
        <p className="text-2xl text-blue-100 mb-2 font-light tracking-wide">Advanced Rice Quality Analysis System</p>
        <p className="text-sm text-blue-200/60 tracking-widest uppercase mb-8">Quality Intelligence For Every Grain</p>
        <div className="mb-12 animate-logo-glow">
          <img src="/company-logo.png" alt="APIT Company Logo" className="h-24 w-auto mx-auto" />
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

const LoadingPageIOS: React.FC<IOSProps> = ({ progress, checks, allDone, canEnter, onLoadingComplete }) => {
  const ringSize = 220;
  const stroke = 14;
  const r = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - progress / 100);

  const headline = !allDone
    ? "Initializing"
    : canEnter
      ? (checks.some((c) => c.status === "warning") ? "Check machine" : "Ready")
      : "Critical check failed";

  const tone = allDone && !canEnter ? "hsl(var(--ios-red))" : "hsl(var(--accent))";

  return (
    <div className="min-h-screen ios-canvas flex flex-col items-center justify-center px-6">
      <div className="flex items-center gap-3 mb-12">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-[16px]"
          style={{ background: "linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent) / 0.7))" }}
        >
          R
        </div>
        <div>
          <div className="text-[20px] font-bold ios-text leading-tight tracking-tight">RAICE LABZ</div>
          <div className="text-[10px] uppercase tracking-[0.2em] ios-text-tertiary font-semibold">Grain Analyzer</div>
        </div>
      </div>

      {/* Concentric ring */}
      <div className="relative" style={{ width: ringSize, height: ringSize }}>
        <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} className="-rotate-90">
          <circle cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none" stroke="hsl(var(--ios-separator))" strokeWidth={stroke} />
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={r}
            fill="none"
            stroke={tone}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.32, 0.72, 0, 1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[48px] font-bold ios-text leading-none tabular tracking-tight">
            {progress}
            <span className="text-[20px] ios-text-tertiary font-medium ml-0.5">%</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.16em] font-semibold ios-text-tertiary mt-2">
            {headline}
          </div>
        </div>
      </div>

      {/* Signature rice strip — fills as system checks complete */}
      <div className="mt-8">
        <RiceStrip
          count={12}
          fill={progress / 100}
          grainW={12}
          grainH={26}
          tilt={-22}
          animate
        />
      </div>

      {/* Check list */}
      <div className="w-[340px] mt-10 space-y-1.5">
        {checks.map((check) => (
          <div
            key={check.id}
            className="flex items-center gap-3 ios-surface border ios-hairline rounded-[12px] px-4 py-2.5"
          >
            <CheckDot status={check.status} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium ios-text leading-tight">{check.label}</div>
              {check.message && (
                <div className="text-[11px] ios-text-tertiary truncate">{check.message}</div>
              )}
            </div>
            <CheckBadge status={check.status} />
          </div>
        ))}
      </div>

      {/* Enter button */}
      <div className="mt-10 h-12 flex items-center">
        {allDone ? (
          <button
            type="button"
            disabled={!canEnter}
            onClick={onLoadingComplete}
            className="h-12 px-8 rounded-full font-semibold text-[14px] transition-all duration-150 ios-spring hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: canEnter ? "hsl(var(--accent))" : "hsl(var(--ios-red))",
              color: "hsl(var(--primary-foreground))",
              boxShadow: "0 6px 18px hsl(var(--accent) / 0.25)",
            }}
          >
            {canEnter ? "Enter system" : "Critical check failed"}
          </button>
        ) : (
          <div className="text-[12px] ios-text-tertiary font-medium tracking-wider uppercase">
            Running diagnostics…
          </div>
        )}
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

function CheckBadge({ status }: { status: CheckStatus }) {
  if (status === "pending") return <span className="text-[11px] ios-text-tertiary font-medium">Queued</span>;
  if (status === "running") return <span className="text-[11px] font-medium" style={{ color: "hsl(var(--accent))" }}>Checking…</span>;
  if (status === "success") return <span className="text-[11px] font-semibold" style={{ color: "hsl(var(--ios-green))" }}>OK</span>;
  if (status === "warning") return <span className="text-[11px] font-semibold" style={{ color: "hsl(var(--ios-orange))" }}>Warn</span>;
  return <span className="text-[11px] font-semibold" style={{ color: "hsl(var(--ios-red))" }}>Fail</span>;
}

export default LoadingPage;
