import { cn } from "@/lib/utils";

interface Props {
  /** Number of grains in the strip. Defaults to 12. */
  count?: number;
  /** 0..1 — proportion of grains shown in their natural rice colour vs muted. */
  fill?: number;
  /** Animate grains in sequentially on mount. */
  animate?: boolean;
  /** Single grain width in px. */
  grainW?: number;
  /** Single grain height in px. */
  grainH?: number;
  /** Tilt angle in degrees applied to each grain. */
  tilt?: number;
  className?: string;
}

/**
 * Real rice grain palette — natural tones you actually see in a mill:
 * pearly white (raw long grain), cream (raw bold), pale yellow (light
 * parboiled), golden (medium parboiled), amber (deep parboiled), brown
 * (with bran), dark husk. Each tone has top/bottom shades so the
 * gradient reads dimensional.
 */
const RICE_PALETTE: Array<{ top: string; bottom: string; shadow: string }> = [
  // Pearly white — raw white rice
  { top: "#FAF6E8", bottom: "#E8DDB5", shadow: "#B8AB80" },
  // Cream — bold raw rice
  { top: "#F2E5BD", bottom: "#D8C58A", shadow: "#A09060" },
  // Pale yellow — lightly parboiled
  { top: "#EAD68E", bottom: "#C9AC53", shadow: "#8E7426" },
  // Golden — standard parboiled
  { top: "#D4A547", bottom: "#A4781F", shadow: "#6E4F13" },
  // Amber — deep parboiled
  { top: "#B47A28", bottom: "#8B5616", shadow: "#5C380C" },
  // Brown rice (bran intact)
  { top: "#A6824B", bottom: "#76542A", shadow: "#4A3414" },
  // Husk / very dark
  { top: "#7A5C2E", bottom: "#4F3A18", shadow: "#2C1F0A" },
];

const MUTED_PALETTE = {
  top: "hsl(var(--ios-separator))",
  bottom: "hsl(var(--ios-text-tertiary) / 0.4)",
  shadow: "hsl(var(--ios-text-tertiary) / 0.6)",
};

/* Pseudo-stable per-index palette pick — feels random, identical every render. */
const pickPalette = (i: number) => RICE_PALETTE[(i * 7 + 3) % RICE_PALETTE.length];

/**
 * Signature visual identity for RAICE LABZ — a row of stylised rice grains
 * in the natural mixed tones you'd actually see in a mill (pearly white,
 * cream, golden, amber, brown). Each grain is an SVG ellipse with a
 * top-to-bottom gradient and a pearl highlight, so it reads dimensional
 * rather than as a flat dot. Used on LoadingPage as the progress visual
 * and on the Console as a brand band.
 */
export function RiceStrip({
  count = 12,
  fill = 1,
  animate = false,
  grainW = 14,
  grainH = 28,
  tilt = -22,
  className,
}: Props) {
  const filledCount = Math.round(Math.max(0, Math.min(1, fill)) * count);

  return (
    <div
      className={cn("flex items-end gap-1", className)}
      role="img"
      aria-label="Rice grain strip"
    >
      {Array.from({ length: count }).map((_, i) => {
        const isFilled = i < filledCount;
        const palette = isFilled ? pickPalette(i) : MUTED_PALETTE;
        const gradId = `rice-grad-${i}-${isFilled ? "on" : "off"}`;
        const delay = animate ? `${i * 60}ms` : "0ms";

        return (
          <svg
            key={i}
            width={grainW}
            height={grainH}
            viewBox={`0 0 ${grainW} ${grainH}`}
            style={{
              transform: `rotate(${tilt}deg)`,
              animation: animate ? `ricePop 0.42s cubic-bezier(0.32, 0.72, 0, 1) both` : undefined,
              animationDelay: delay,
              filter: isFilled
                ? `drop-shadow(0 1px 1px ${palette.shadow}66)`
                : undefined,
              transition: "all 350ms cubic-bezier(0.32, 0.72, 0, 1)",
            }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.top} />
                <stop offset="100%" stopColor={palette.bottom} />
              </linearGradient>
            </defs>
            {/* Body */}
            <ellipse
              cx={grainW / 2}
              cy={grainH / 2}
              rx={(grainW - 2) / 2}
              ry={(grainH - 2) / 2}
              fill={`url(#${gradId})`}
            />
            {/* Pearl highlight — small white blur near the top to read as 3D */}
            <ellipse
              cx={grainW / 2 - 1.6}
              cy={grainH / 2 - grainH * 0.22}
              rx={Math.max(1, grainW * 0.12)}
              ry={Math.max(2, grainH * 0.16)}
              fill="white"
              opacity={isFilled ? 0.55 : 0.25}
            />
            {/* Subtle dark ridge on the underside */}
            <ellipse
              cx={grainW / 2 + 0.5}
              cy={grainH / 2 + grainH * 0.18}
              rx={Math.max(1, grainW * 0.08)}
              ry={Math.max(2, grainH * 0.12)}
              fill={palette.shadow}
              opacity={isFilled ? 0.35 : 0.18}
            />
          </svg>
        );
      })}
    </div>
  );
}
