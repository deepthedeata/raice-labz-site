/** Small stylized icons representing rice grain quality categories (head rice, broken, chalky, etc.)
 * Hand-drawn SVGs, not photos — used as compact visual cues next to quality metric labels. */

type GrainType = "headrice" | "brokens" | "chalky" | "discolored" | "foreignmatter" | "immature";

interface GrainTypeIconProps {
  type: GrainType;
  className?: string;
}

/** A single rice-grain silhouette (rounded capsule), reused as the base shape across variants. */
function GrainShape({
  fill,
  x = 0,
  y = 0,
  rotate = 0,
  scale = 1,
}: {
  fill: string;
  x?: number;
  y?: number;
  rotate?: number;
  scale?: number;
}) {
  return (
    <ellipse
      cx="12"
      cy="12"
      rx="4.6"
      ry="9"
      fill={fill}
      stroke="#00000014"
      strokeWidth="0.5"
      transform={`translate(${x} ${y}) rotate(${rotate} 12 12) scale(${scale})`}
    />
  );
}

export function GrainTypeIcon({ type, className }: GrainTypeIconProps) {
  const wrapClass = className ?? "w-7 h-7 rounded-md shrink-0";

  switch (type) {
    case "headrice":
      return (
        <div className={`${wrapClass} bg-gradient-to-br from-orange-50 to-amber-100 border border-amber-200 flex items-center justify-center overflow-hidden`}>
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <GrainShape fill="#faf6ec" rotate={-12} />
          </svg>
        </div>
      );

    case "brokens":
      return (
        <div className={`${wrapClass} bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 flex items-center justify-center overflow-hidden`}>
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <ellipse cx="8.5" cy="9" rx="3.2" ry="5.2" fill="#faf6ec" stroke="#00000014" strokeWidth="0.5" transform="rotate(-18 8.5 9)" />
            <ellipse cx="16" cy="15.5" rx="3.2" ry="5" fill="#faf6ec" stroke="#00000014" strokeWidth="0.5" transform="rotate(20 16 15.5)" />
          </svg>
        </div>
      );

    case "chalky":
      return (
        <div className={`${wrapClass} bg-gradient-to-br from-sky-50 to-blue-50 border border-blue-200 flex items-center justify-center overflow-hidden`}>
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <GrainShape fill="#f2ede0" rotate={-10} />
            <ellipse cx="12" cy="12" rx="2.1" ry="3.2" fill="#ffffff" opacity="0.95" transform="rotate(-10 12 12)" />
          </svg>
        </div>
      );

    case "discolored":
      return (
        <div className={`${wrapClass} bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 flex items-center justify-center overflow-hidden`}>
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <GrainShape fill="#d9b979" rotate={-10} />
            <ellipse cx="11" cy="10" rx="1.4" ry="2.1" fill="#9c7a3c" opacity="0.55" transform="rotate(-10 11 10)" />
          </svg>
        </div>
      );

    case "foreignmatter":
      return (
        <div className={`${wrapClass} bg-gradient-to-br from-amber-50 to-yellow-50 border border-yellow-300 flex items-center justify-center overflow-hidden`}>
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <GrainShape fill="#faf6ec" x={-3} rotate={-15} scale={0.85} />
            <path d="M15 8.5 L18.5 9.5 L17.5 13 L14 12.5 L13 10 Z" fill="#6b5744" stroke="#00000022" strokeWidth="0.4" />
          </svg>
        </div>
      );

    case "immature":
      return (
        <div className={`${wrapClass} bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 flex items-center justify-center overflow-hidden`}>
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <ellipse cx="12" cy="12" rx="3.6" ry="9" fill="#dce8c2" stroke="#00000014" strokeWidth="0.5" transform="rotate(-12 12 12)" />
          </svg>
        </div>
      );

    default:
      return null;
  }
}
