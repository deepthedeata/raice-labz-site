import { SVGProps } from "react";

type RiceIconProps = SVGProps<SVGSVGElement>;

/**
 * Drooping paddy panicle — used for Procurement (raw/field stage).
 * Fixed photo-inspired palette (olive stalk, amber-gold grains) so it reads as
 * real paddy regardless of the surrounding tile color. Grain head sways gently.
 */
export const PaddyGrainIcon = ({ className, ...props }: RiceIconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <path d="M12 21c-1.8-.8-3.1-2.5-3.6-4.6" stroke="#4d7c0f" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M12 21c1.7-.6 3-2.1 3.4-4" stroke="#4d7c0f" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M12 21c-.7-5.6.2-9.8 3.6-13" stroke="#65a30d" strokeWidth="1.4" strokeLinecap="round" />
    <g className="animate-paddy-sway">
      <ellipse cx="15.6" cy="8" rx="1.6" ry="0.95" transform="rotate(-38 15.6 8)" fill="#d9a441" stroke="#b8842a" strokeWidth="0.5" />
      <ellipse cx="13.9" cy="10.1" rx="1.55" ry="0.9" transform="rotate(-42 13.9 10.1)" fill="#e0ac4c" stroke="#b8842a" strokeWidth="0.5" />
      <ellipse cx="12.7" cy="12.3" rx="1.5" ry="0.88" transform="rotate(-46 12.7 12.3)" fill="#d9a441" stroke="#b8842a" strokeWidth="0.5" />
      <ellipse cx="17.4" cy="6.3" rx="1.4" ry="0.8" transform="rotate(-28 17.4 6.3)" fill="#f0c465" stroke="#b8842a" strokeWidth="0.5" />
      <ellipse cx="14.9" cy="8.8" rx="1.3" ry="0.75" transform="rotate(-18 14.9 8.8)" fill="#e0ac4c" stroke="#b8842a" strokeWidth="0.5" />
      <ellipse cx="13.5" cy="11.1" rx="1.2" ry="0.7" transform="rotate(-22 13.5 11.1)" fill="#d9a441" stroke="#b8842a" strokeWidth="0.5" />
      <path d="M19.3 4.3c.5.4.5 1.1 0 1.5" stroke="#65a30d" strokeWidth="1.1" strokeLinecap="round" />
    </g>
  </svg>
);

/**
 * Process line — a small brown/unmilled rice pile flows through a mill (gear on the
 * connecting arrow) into a pile of finished, glossy milled rice. Used for Production.
 */
export const RiceProcessIcon = ({ className, ...props }: RiceIconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
    {/* brown / unmilled rice pile */}
    <ellipse cx="3.3" cy="13" rx="1.5" ry="0.9" transform="rotate(-15 3.3 13)" fill="#8f5e34" />
    <ellipse cx="4.6" cy="12.6" rx="1.6" ry="0.95" transform="rotate(-10 4.6 12.6)" fill="#a97142" />
    <ellipse cx="3.9" cy="11.9" rx="1.4" ry="0.85" transform="rotate(-20 3.9 11.9)" fill="#c9975f" />

    {/* connecting line + machine (gear) */}
    <path d="M6.8 12.2h2.4" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="1.5 1.4" />
    <g className="animate-mill-gear">
      <circle cx="12" cy="12" r="2" stroke="#64748b" strokeWidth="1.3" />
      <path
        d="M12 9.4v-.9M12 15.5v-.9M9.4 12h-.9M15.5 12h-.9M10.1 10.1l-.65-.65M14.55 14.55l-.65-.65M10.1 13.9l-.65.65M14.55 9.45l-.65.65"
        stroke="#64748b"
        strokeWidth="1.05"
        strokeLinecap="round"
      />
    </g>
    <path d="M14.8 12h2.4" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="1.5 1.4" />

    {/* finished, glossy milled rice pile */}
    <ellipse cx="19" cy="12.5" rx="1.5" ry="0.9" transform="rotate(-15 19 12.5)" fill="#f0f0ea" stroke="#aaab9e" strokeWidth="0.55" />
    <ellipse cx="20.3" cy="12.1" rx="1.6" ry="0.95" transform="rotate(-10 20.3 12.1)" fill="#ffffff" stroke="#bcbdb0" strokeWidth="0.55" />
    <ellipse cx="19.6" cy="11.4" rx="1.4" ry="0.85" transform="rotate(-20 19.6 11.4)" fill="#fafaf5" stroke="#aaab9e" strokeWidth="0.55" />
    <path
      d="M21.3 8.6l.5-.9M22.3 9.4h1M21.6 10.2l.7.6"
      stroke="#fbbf24"
      strokeWidth="0.85"
      strokeLinecap="round"
      className="animate-grain-glint"
    />
  </svg>
);

/**
 * Pile of finished, glossy milled rice — the final product. Used wherever "Milled Rice"
 * needs its own standalone icon (dashboard tiles, replay/section banners). Animated shine.
 */
export const GlossyRiceIcon = ({ className, ...props }: RiceIconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <ellipse cx="8.6" cy="15.2" rx="3.1" ry="1.9" transform="rotate(-14 8.6 15.2)" fill="#f0f0ea" stroke="#aaab9e" strokeWidth="0.55" />
    <ellipse cx="12.4" cy="14.1" rx="3.4" ry="2.05" transform="rotate(-10 12.4 14.1)" fill="#ffffff" stroke="#bcbdb0" strokeWidth="0.55" />
    <ellipse cx="10.2" cy="12.5" rx="3" ry="1.85" transform="rotate(-20 10.2 12.5)" fill="#fafaf5" stroke="#aaab9e" strokeWidth="0.55" />
    <ellipse
      cx="10.6"
      cy="11.6"
      rx="1.6"
      ry="0.8"
      transform="rotate(-20 10.6 11.6)"
      fill="#ffffff"
      fillOpacity="0.65"
      className="animate-grain-glint"
    />
    <path
      d="M16.6 7.4l.7-1.2M18 8.4h1.4M17.1 9.5l.95.85"
      stroke="#fbbf24"
      strokeWidth="1"
      strokeLinecap="round"
      className="animate-grain-glint"
    />
  </svg>
);
