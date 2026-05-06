import { useCallback, useEffect, useRef } from "react";

const STORAGE_KEY = "raice-sounds-enabled";

type Tone = "start" | "stop" | "complete" | "fault" | "tap";

const PRESETS: Record<Tone, { freqs: number[]; durMs: number; type?: OscillatorType; gain?: number }> = {
  // Soft 2-note rising chirp — neutral "session begun"
  start: { freqs: [620, 880], durMs: 220, type: "sine", gain: 0.18 },
  // Single mid-sine drop — "stopped"
  stop: { freqs: [580, 380], durMs: 200, type: "sine", gain: 0.16 },
  // Triumphant 3-note arpeggio — "session complete"
  complete: { freqs: [620, 880, 1175], durMs: 320, type: "sine", gain: 0.2 },
  // Two-tone urgent buzz — "fault"
  fault: { freqs: [220, 220], durMs: 220, type: "square", gain: 0.14 },
  // Brief click — used for taps / confirmations
  tap: { freqs: [880], durMs: 50, type: "triangle", gain: 0.1 },
};

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const v = localStorage.getItem(STORAGE_KEY);
  // Default enabled. Operators can disable in settings later.
  return v !== "false";
}

/**
 * Fire-and-forget sound effects synthesised with the Web Audio API.
 * No assets — every tone is generated on the fly so this works offline,
 * embedded, on slow networks, etc.
 *
 *   const sounds = useSoundEffects();
 *   sounds.play("start");
 *
 * Honours a localStorage flag (`raice-sounds-enabled`). Defaults to on.
 * The audio context is lazily created on first play() to satisfy the
 * browser's "user gesture required" autoplay policy.
 */
export function useSoundEffects() {
  const ctxRef = useRef<AudioContext | null>(null);

  const ensureCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      try {
        const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
        ctxRef.current = new Ctor();
      } catch {
        return null;
      }
    }
    return ctxRef.current;
  }, []);

  const play = useCallback(
    (tone: Tone) => {
      if (!isEnabled()) return;
      const ctx = ensureCtx();
      if (!ctx) return;
      const preset = PRESETS[tone];
      const noteDur = preset.durMs / preset.freqs.length / 1000;
      const now = ctx.currentTime;

      preset.freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = preset.type ?? "sine";
        osc.frequency.value = f;
        const start = now + i * noteDur;
        const end = start + noteDur;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(preset.gain ?? 0.15, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(end + 0.02);
      });
    },
    [ensureCtx],
  );

  // Unsuspend on first user gesture so subsequent plays are immediate.
  useEffect(() => {
    const resume = () => {
      const ctx = ensureCtx();
      if (ctx && ctx.state === "suspended") ctx.resume();
    };
    window.addEventListener("pointerdown", resume, { once: true });
    return () => window.removeEventListener("pointerdown", resume);
  }, [ensureCtx]);

  return { play };
}

/** Toggle sound effects globally. Persists in localStorage. */
export const setSoundsEnabled = (v: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEY, v ? "true" : "false");
  } catch {
    /* swallow */
  }
};

export const getSoundsEnabled = (): boolean => isEnabled();
