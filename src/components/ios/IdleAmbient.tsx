import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { CircleDot, Wheat, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHardwareHealth } from "@/hooks/useHardwareHealth";

const IDLE_AFTER_MS = 60_000;          // 60 s of no input
const STATS_POLL_MS = 30_000;          // refresh stats every 30 s while shown
const STORAGE_KEY = "raice-idle-disabled";
const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

interface SummaryStats {
  total_batches?: number;
  total_grains_all_time?: number;
  avg_head_rice?: number;
  avg_broken?: number;
  avg_whiteness_index?: number;
  avg_grain_length?: number;
}

interface RecentActivity {
  variety?: string;
  mode_type?: string;
  mode_id?: string;
  machine?: string;
  /** ISO 8601 timestamp string. */
  timestamp?: string;
  date?: string;
}

const formatVariety = (v?: string) => {
  if (!v) return "—";
  const s = v.trim();
  if (s.length === 3) return s.toUpperCase();
  return s.toLowerCase().replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const relativeTime = (iso: string | undefined): string => {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return "—";
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
  return `${Math.floor(diffSec / 86400)} d ago`;
};

/**
 * After 60 s of no input on the Console route, fades in a giant ambient
 * status display readable from across a mill floor. Operations stats
 * (option A): today's runs, head rice / broken / WI averages, last test.
 * Status reduces to a single dot + word — "Ready" or "Hardware fault".
 * Tap or any movement dismisses.
 */
export function IdleAmbient() {
  const location = useLocation();
  const { checks, hasFault } = useHardwareHealth();
  const [active, setActive] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [lastRun, setLastRun] = useState<RecentActivity | null>(null);
  const timerRef = useRef<number | null>(null);

  const onlyOnConsole = location.pathname === "/";
  const userDisabled =
    typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true";

  // Activity tracker — resets the timer on any event.
  useEffect(() => {
    if (!onlyOnConsole || userDisabled) {
      setActive(false);
      return;
    }
    const reset = () => {
      setActive(false);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setActive(true), IDLE_AFTER_MS);
    };
    const events: (keyof WindowEventMap)[] = [
      "pointerdown",
      "pointermove",
      "keydown",
      "wheel",
      "touchstart",
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [onlyOnConsole, userDisabled]);

  // Live clock while active.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [active]);

  // Stats polling while active.
  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const [sumRes, recentRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/raice_labz/analytics/summary`).catch(() => null),
          fetch(`${BACKEND_URL}/api/raice_labz/analytics/recent-activities?limit=1`).catch(() => null),
        ]);
        if (cancelled) return;
        if (sumRes?.ok) {
          const d = await sumRes.json().catch(() => null);
          if (d?.summary) setSummary(d.summary);
        }
        if (recentRes?.ok) {
          const d = await recentRes.json().catch(() => null);
          const first = Array.isArray(d?.activities) ? d.activities[0] : null;
          if (first) setLastRun(first);
        }
      } catch {
        /* swallow — keep last-known values */
      }
    };

    tick();
    const id = setInterval(tick, STATS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active]);

  if (!active) return null;

  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  // Pick the single most-relevant fault message
  const faultLabel = hasFault
    ? `${checks.find((c) => c.status === "offline")?.label ?? "System"} offline`
    : "Ready";

  const lastRunIso = lastRun?.timestamp ?? lastRun?.date;
  const stats: { label: string; value: string }[] = [
    {
      label: "Runs today",
      value: summary?.total_batches != null ? String(summary.total_batches) : "—",
    },
    {
      label: "Head rice",
      value: summary?.avg_head_rice != null ? `${summary.avg_head_rice.toFixed(1)}%` : "—",
    },
    {
      label: "Broken",
      value: summary?.avg_broken != null ? `${summary.avg_broken.toFixed(1)}%` : "—",
    },
    {
      label: "Whiteness",
      value: summary?.avg_whiteness_index != null ? summary.avg_whiteness_index.toFixed(1) : "—",
    },
    {
      label: "Last test",
      value: lastRun
        ? `${formatVariety(lastRun.variety)} · ${relativeTime(lastRunIso)}`
        : "—",
    },
  ];

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex flex-col items-center justify-center px-6",
        "ios-fade select-none cursor-pointer",
      )}
      style={{
        background: "hsl(var(--ios-canvas))",
        color: "hsl(var(--ios-text))",
      }}
      onClick={() => setActive(false)}
      role="button"
      aria-label="Dismiss idle screen"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent) / 0.7))",
            color: "hsl(var(--primary-foreground))",
          }}
        >
          <Wheat className="w-6 h-6" />
        </div>
        <div>
          <div className="text-[18px] font-bold tracking-tight">RAICE LABZ</div>
          <div className="text-[11px] uppercase tracking-[0.2em] ios-text-tertiary font-semibold">
            Grain Analyzer
          </div>
        </div>
      </div>

      {/* Clock */}
      <div className="text-[180px] font-bold tabular leading-none tracking-[-0.03em] ios-text">
        {time}
      </div>
      <div className="text-[18px] ios-text-secondary mt-3">{date}</div>

      {/* Stats strip */}
      <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full max-w-[1100px]">
        {stats.map((s) => (
          <div
            key={s.label}
            className="ios-surface border ios-hairline rounded-[14px] px-4 py-3 text-center"
          >
            <div className="text-[10px] uppercase tracking-[0.16em] font-semibold ios-text-tertiary mb-1">
              {s.label}
            </div>
            <div className="text-[20px] font-bold ios-text leading-tight tabular truncate">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Status — single dot + word */}
      <div className="mt-8 flex items-center gap-2.5">
        {hasFault ? (
          <AlertTriangle className="w-4 h-4" style={{ color: "hsl(var(--ios-red))" }} />
        ) : (
          <CircleDot className="w-4 h-4" style={{ color: "hsl(var(--ios-green))" }} />
        )}
        <span
          className="text-[14px] font-semibold"
          style={{ color: hasFault ? "hsl(var(--ios-red))" : "hsl(var(--ios-green))" }}
        >
          {faultLabel}
        </span>
      </div>

      <div className="mt-8 text-[11px] uppercase tracking-[0.18em] ios-text-tertiary font-semibold">
        Tap to dismiss
      </div>
    </div>
  );
}

/** Persist a user opt-out so the ambient screen never activates. */
export const setIdleAmbientDisabled = (v: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEY, v ? "true" : "false");
  } catch {
    /* swallow */
  }
};
