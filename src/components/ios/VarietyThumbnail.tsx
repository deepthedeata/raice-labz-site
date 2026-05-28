import { cn } from "@/lib/utils";

interface Props {
  variety?: string;
  size?: number;
  className?: string;
}

/* Hash the variety name to a stable hue. Same name → same colour, every time. */
function hashHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 360;
}

/* Region-aware palette — basmati names lean warm gold, others lean fresh
 * green-amber. Tweak biases the hue without losing per-name uniqueness. */
function paletteFor(name: string): { hue: number; sat: number; toneA: number; toneB: number } {
  const lower = name.toLowerCase();
  const hue = hashHue(name);
  if (lower.includes("basmati") || lower.includes("1121") || lower.includes("pusa")) {
    // bias warm
    return { hue: (hue % 50) + 30, sat: 65, toneA: 60, toneB: 38 };
  }
  if (lower.includes("sona") || lower.includes("masuri") || lower.includes("samba")) {
    return { hue: (hue % 60) + 65, sat: 40, toneA: 75, toneB: 50 };
  }
  if (lower.includes("ir") || lower.includes("swarna")) {
    return { hue: (hue % 30) + 95, sat: 35, toneA: 70, toneB: 45 };
  }
  return { hue, sat: 45, toneA: 70, toneB: 45 };
}

/**
 * Procedural variety thumbnail. Generates a stable, unique-feeling chip per
 * grain variety by hashing the name into a hue and rendering a couple of
 * tilted ellipses on a soft gradient. No assets required. Used on Recipe
 * cards and Reports rows for instant visual recognition.
 */
export function VarietyThumbnail({ variety, size = 56, className }: Props) {
  const name = (variety ?? "").trim();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

  const { hue, sat, toneA, toneB } = paletteFor(name || "unknown");
  const colorA = `hsl(${hue} ${sat}% ${toneA}%)`;
  const colorB = `hsl(${(hue + 30) % 360} ${sat}% ${toneB}%)`;
  const accent = `hsl(${(hue + 14) % 360} ${Math.min(80, sat + 10)}% ${Math.max(20, toneB - 12)}%)`;

  return (
    <div
      className={cn("relative shrink-0 rounded-[12px] overflow-hidden", className)}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${colorA} 0%, ${colorB} 100%)`,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)",
      }}
      aria-label={variety ? `Thumbnail for ${variety}` : "Variety thumbnail"}
      role="img"
    >
      {/* Decorative grain ellipses — different sizes / tilts so each variety reads visually distinct */}
      <svg
        viewBox="0 0 56 56"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        className="absolute inset-0"
      >
        <ellipse cx="36" cy="22" rx="4" ry="9" fill={accent} opacity={0.85} transform={`rotate(-${20 + (hue % 25)} 36 22)`} />
        <ellipse cx="44" cy="38" rx="3" ry="7" fill={accent} opacity={0.75} transform={`rotate(${15 + (hue % 30)} 44 38)`} />
        <ellipse cx="22" cy="42" rx="3.5" ry="8" fill={accent} opacity={0.7} transform={`rotate(-${30 + (hue % 20)} 22 42)`} />
      </svg>

      {/* Initials overlay — high-contrast white with subtle shadow */}
      <div
        className="absolute inset-0 flex items-center justify-center font-bold tabular tracking-tight"
        style={{
          color: "white",
          textShadow: "0 1px 2px rgba(0,0,0,0.25)",
          fontSize: size * 0.34,
        }}
      >
        {initials}
      </div>
    </div>
  );
}
