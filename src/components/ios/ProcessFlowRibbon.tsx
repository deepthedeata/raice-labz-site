import { cn } from "@/lib/utils";

export type FlowStage = "husking" | "whitening" | "polishing" | "output";

interface Stage {
  key: FlowStage;
  label: string;
  description: string;
}

const STAGES: Stage[] = [
  { key: "husking", label: "Husking", description: "Hull removed" },
  { key: "whitening", label: "Whitening", description: "Bran removed" },
  { key: "polishing", label: "Polishing", description: "Surface finish" },
  { key: "output", label: "Output", description: "Sortex / bagging" },
];

interface Props {
  /** Currently active stage. Pass null when no run is in progress. */
  activeStage?: FlowStage | null;
  /** Show or hide stage descriptions on hover (defaults true). */
  showDescriptions?: boolean;
  className?: string;
}

/**
 * Persistent process-flow ribbon — six chevron-cut tiles representing the
 * mill pipeline. Used at the top of the Console (decorative, no active stage)
 * and during a Live Analysis session (active stage glows). Pure SVG path
 * shapes so the chevron edges scale crisply on any viewport.
 */
export function ProcessFlowRibbon({ activeStage, showDescriptions = true, className }: Props) {
  const activeIndex = activeStage ? STAGES.findIndex((s) => s.key === activeStage) : -1;

  return (
    <div
      className={cn(
        "flex items-stretch gap-0 ios-surface border ios-hairline rounded-[14px] p-1.5 overflow-hidden",
        className,
      )}
      aria-label="Mill process stages"
    >
      {STAGES.map((stage, i) => {
        const status: "passed" | "active" | "pending" =
          activeIndex < 0
            ? "pending"
            : i < activeIndex
              ? "passed"
              : i === activeIndex
                ? "active"
                : "pending";

        return (
          <StageTile
            key={stage.key}
            stage={stage}
            status={status}
            isFirst={i === 0}
            isLast={i === STAGES.length - 1}
            showDescriptions={showDescriptions}
          />
        );
      })}
    </div>
  );
}

function StageTile({
  stage,
  status,
  isFirst,
  isLast,
  showDescriptions,
}: {
  stage: Stage;
  status: "passed" | "active" | "pending";
  isFirst: boolean;
  isLast: boolean;
  showDescriptions: boolean;
}) {
  const bg =
    status === "active"
      ? "hsl(var(--accent))"
      : status === "passed"
        ? "hsl(var(--ios-green) / 0.18)"
        : "hsl(var(--ios-raised))";
  const fg =
    status === "active"
      ? "hsl(var(--primary-foreground))"
      : status === "passed"
        ? "hsl(var(--ios-green))"
        : "hsl(var(--ios-text-secondary))";

  return (
    <div
      title={`${stage.label} — ${stage.description}`}
      className={cn(
        "group relative flex-1 min-w-0 px-3 py-2",
        "transition-all duration-300 ios-spring",
        !isFirst && "-ml-[10px]",
      )}
      style={{
        background: bg,
        color: fg,
        clipPath: isLast
          ? "polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%)"
          : isFirst
            ? "polygon(0 0, 100% 0, calc(100% - 10px) 50%, 100% 100%, 0 100%)"
            : "polygon(10px 0, 100% 0, calc(100% - 10px) 50%, 100% 100%, 10px 100%, 0 50%)",
      }}
    >
      <div className={cn("flex items-center justify-center gap-2 px-1", isFirst ? "pl-1" : "pl-3")}>
        <span
          className="text-[9px] font-bold uppercase tabular shrink-0"
          style={{
            opacity: status === "passed" ? 0.85 : status === "active" ? 0.95 : 0.6,
          }}
        >
          {String(STAGES.findIndex((s) => s.key === stage.key) + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wider truncate">
            {stage.label}
          </div>
          {showDescriptions && (
            <div
              className="text-[9px] uppercase tracking-wider truncate hidden lg:block"
              style={{ opacity: 0.7 }}
            >
              {stage.description}
            </div>
          )}
        </div>
      </div>
      {status === "active" && (
        <span
          className="absolute inset-0 pointer-events-none"
          style={{
            clipPath: isLast
              ? "polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%)"
              : isFirst
                ? "polygon(0 0, 100% 0, calc(100% - 10px) 50%, 100% 100%, 0 100%)"
                : "polygon(10px 0, 100% 0, calc(100% - 10px) 50%, 100% 100%, 10px 100%, 0 50%)",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 45%, transparent 90%)",
            animation: "ribbonShine 2.4s linear infinite",
          }}
        />
      )}
    </div>
  );
}
