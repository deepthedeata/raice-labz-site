import { useEffect, useRef, useState } from "react";

/**
 * Smoothly animates a numeric value when the target changes.
 * Uses requestAnimationFrame with an iOS-spring-like easing.
 *
 *   const display = useAnimatedNumber(actual, { duration: 600 });
 *
 * Returns the current animated value (number). Pass `decimals` to
 * pre-format if you want trailing zeros to stay stable.
 */
export function useAnimatedNumber(
  target: number,
  opts: { duration?: number; decimals?: number } = {},
): number {
  const { duration = 600 } = opts;
  const [value, setValue] = useState<number>(target);
  const fromRef = useRef<number>(target);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = value;
    fromRef.current = from;
    startRef.current = performance.now();

    const tick = (t: number) => {
      const elapsed = t - startRef.current;
      const k = Math.min(1, elapsed / duration);
      // iOS-style cubic-bezier(0.32, 0.72, 0, 1) approximated as ease-out cubic
      const eased = 1 - Math.pow(1 - k, 3);
      const next = from + (target - from) * eased;
      setValue(next);
      if (k < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // intentionally only re-run when target changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}
