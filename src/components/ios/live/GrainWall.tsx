import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ClassCounts {
  good?: number;
  broken?: number;
  chalky?: number;
  rejection?: number;
  foreign?: number;
}

interface Props {
  /** Cumulative class counts from the live stream — wall paints grains based on the delta each tick. */
  counts: ClassCounts;
  /** Visible window in seconds. Defaults to 30. */
  windowSec?: number;
  /** Tile width in px. */
  tileW?: number;
  /** Tile height in px. */
  tileH?: number;
  /** Max grains rendered to keep DOM cheap. */
  maxGrains?: number;
  className?: string;
}

interface Grain {
  id: number;
  cls: keyof ClassCounts;
  ts: number;
}

const CLASS_COLOR: Record<keyof ClassCounts, string> = {
  good: "hsl(var(--grain-head))",          // Blue   — Head Rice
  broken: "hsl(var(--grain-broken))",      // Cyan   — Broken
  chalky: "hsl(var(--grain-chalky))",      // Orange — Chalky
  rejection: "hsl(var(--grain-rejection))",// Red    — Rejection
  foreign: "hsl(var(--grain-foreign))",    // Pink   — Foreign Matter
};

const CLASS_LABEL: Record<keyof ClassCounts, string> = {
  good: "Good",
  broken: "Broken",
  chalky: "Chalky",
  rejection: "Reject",
  foreign: "Foreign",
};

let nextId = 0;

/**
 * Bühler-style scrolling grain wall. Each detected grain becomes a small
 * coloured rectangle that scrolls right-to-left across a 30s window. Fed
 * from cumulative class counts — we diff the previous tick to figure out
 * how many of each class to paint. No bbox data needed.
 */
export function GrainWall({
  counts,
  windowSec = 30,
  tileW = 6,
  tileH = 16,
  maxGrains = 600,
  className,
}: Props) {
  const [grains, setGrains] = useState<Grain[]>([]);
  const lastCountsRef = useRef<ClassCounts>({});

  useEffect(() => {
    const last = lastCountsRef.current;
    const now = Date.now();
    const additions: Grain[] = [];

    (Object.keys(counts) as (keyof ClassCounts)[]).forEach((cls) => {
      const prev = last[cls] ?? 0;
      const curr = counts[cls] ?? 0;
      const delta = Math.max(0, curr - prev);
      // Cap per-tick burst so a backend backfill doesn't dump 10k rectangles
      const capped = Math.min(delta, 80);
      for (let i = 0; i < capped; i++) {
        additions.push({ id: nextId++, cls, ts: now });
      }
    });

    if (additions.length === 0) {
      lastCountsRef.current = counts;
      return;
    }

    setGrains((prev) => {
      const cutoff = now - windowSec * 1000;
      const merged = [...prev, ...additions].filter((g) => g.ts >= cutoff);
      return merged.length > maxGrains ? merged.slice(-maxGrains) : merged;
    });
    lastCountsRef.current = counts;
  }, [counts, windowSec, maxGrains]);

  // Periodic prune so old grains drop out of the window even when no new
  // counts arrive (e.g. paused).
  useEffect(() => {
    const id = setInterval(() => {
      const cutoff = Date.now() - windowSec * 1000;
      setGrains((prev) => prev.filter((g) => g.ts >= cutoff));
    }, 1000);
    return () => clearInterval(id);
  }, [windowSec]);

  const totals: Record<keyof ClassCounts, number> = {
    good: 0,
    broken: 0,
    chalky: 0,
    rejection: 0,
    foreign: 0,
  };
  grains.forEach((g) => {
    totals[g.cls] = (totals[g.cls] ?? 0) + 1;
  });

  return (
    <div
      className={cn(
        "ios-surface border ios-hairline rounded-[14px] p-3 overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-wider font-semibold ios-text-tertiary">
          Last {windowSec}s · {grains.length.toLocaleString()} grains
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.keys(CLASS_LABEL) as (keyof ClassCounts)[]).map((cls) => (
            <span key={cls} className="flex items-center gap-1.5">
              <span
                className="inline-block rounded-sm"
                style={{ width: 8, height: 4, background: CLASS_COLOR[cls] }}
              />
              <span className="text-[10px] ios-text-secondary font-medium">
                {CLASS_LABEL[cls]}
                <span className="ios-text-tertiary tabular ml-1">{totals[cls]}</span>
              </span>
            </span>
          ))}
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-[8px]"
        style={{
          height: tileH + 12,
          background: "hsl(var(--ios-canvas))",
          borderTop: "1px solid hsl(var(--ios-separator))",
          borderBottom: "1px solid hsl(var(--ios-separator))",
        }}
      >
        {grains.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] ios-text-tertiary">Waiting for detections…</span>
          </div>
        ) : (
          <div
            className="absolute inset-y-0 right-0 flex items-center gap-[2px] pr-1"
            style={{ direction: "rtl" }}
          >
            {/* Render most-recent first so they appear on the right */}
            {[...grains].reverse().map((g) => (
              <span
                key={g.id}
                className="shrink-0 rounded-[1px]"
                style={{
                  width: tileW,
                  height: tileH,
                  background: CLASS_COLOR[g.cls],
                  animation: "ricePop 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
                }}
                title={CLASS_LABEL[g.cls]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
