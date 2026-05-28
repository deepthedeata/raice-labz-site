import {
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  Video,
  HelpCircle,
  Phone,
  Mail,
  Globe,
  Cpu,
  Camera,
  Wrench,
  ChevronRight,
} from "lucide-react";
import { TopBarIOS } from "@/components/ios/TopBarIOS";
import { Tile } from "@/components/ios/Tile";
import { GroupedList, GroupedRow } from "@/components/ios/GroupedList";
import { cn } from "@/lib/utils";

interface Manual {
  title: string;
  description: string;
  icon: typeof BookOpen;
  type: "PDF" | "MP4" | "HTML";
  size: string;
  meta?: string;
  external?: boolean;
  category: "guides" | "videos" | "reference";
}

const MANUALS: Manual[] = [
  {
    title: "Quick Start Guide",
    description: "Get started with RAICE LABZ in minutes",
    icon: BookOpen,
    type: "PDF",
    size: "2.1 MB",
    meta: "12 pages",
    category: "guides",
  },
  {
    title: "Hardware Setup Manual",
    description: "Complete guide for camera and sensor installation",
    icon: Camera,
    type: "PDF",
    size: "5.8 MB",
    meta: "45 pages",
    category: "guides",
  },
  {
    title: "Software Configuration Guide",
    description: "Detailed software setup and configuration",
    icon: Cpu,
    type: "PDF",
    size: "3.2 MB",
    meta: "28 pages",
    category: "guides",
  },
  {
    title: "Operation Manual",
    description: "Day-to-day operation procedures",
    icon: BookOpen,
    type: "PDF",
    size: "7.4 MB",
    meta: "68 pages",
    category: "guides",
  },
  {
    title: "Basic Setup Tutorial",
    description: "Step-by-step video guide for initial setup",
    icon: Video,
    type: "MP4",
    size: "125 MB",
    meta: "15 min",
    category: "videos",
  },
  {
    title: "Advanced Features Tutorial",
    description: "Advanced features and troubleshooting",
    icon: Video,
    type: "MP4",
    size: "98 MB",
    meta: "12 min",
    category: "videos",
  },
  {
    title: "Troubleshooting Guide",
    description: "Common issues and their solutions",
    icon: Wrench,
    type: "PDF",
    size: "2.9 MB",
    meta: "24 pages",
    category: "reference",
  },
  {
    title: "API Documentation",
    description: "Technical documentation for developers",
    icon: FileText,
    type: "HTML",
    size: "1.2 MB",
    meta: "Online",
    external: true,
    category: "reference",
  },
];

const TYPE_COLOR: Record<Manual["type"], string> = {
  PDF: "hsl(var(--ios-red))",
  MP4: "hsl(var(--accent))",
  HTML: "hsl(var(--ios-orange))",
};

const ManualsIOS = () => {
  const handleOpen = (m: Manual) => {
    if (m.external) {
      console.log(`Open external: ${m.title}`);
    } else {
      console.log(`Download: ${m.title}`);
    }
  };

  const guides = MANUALS.filter((m) => m.category === "guides");
  const videos = MANUALS.filter((m) => m.category === "videos");
  const reference = MANUALS.filter((m) => m.category === "reference");

  return (
    <div className="flex flex-col min-h-screen">
      <TopBarIOS title="Manuals" subtitle="Help, guides, and documentation" />

      <div className="px-6 py-6 max-w-[1100px] w-full mx-auto space-y-6">
        {/* Hero */}
        <Tile
          padded={false}
          className="overflow-hidden relative"
        >
          <div
            className="p-6 text-white relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--accent) / 0.7) 60%, hsl(var(--ios-orange)) 140%)",
            }}
          >
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
            <div className="relative z-10">
              <div className="text-[12px] uppercase tracking-[0.16em] font-semibold opacity-80 mb-2">
                Help center
              </div>
              <div className="text-[28px] font-bold tracking-tight leading-tight">
                Browse the docs and<br />learn the analyzer.
              </div>
              <div className="text-[14px] opacity-85 mt-2 max-w-[480px]">
                Setup walkthroughs, day-to-day operation, video tutorials, and developer references — everything to get the most out of RAICE LABZ.
              </div>
            </div>
          </div>
        </Tile>

        {/* Guides */}
        <Section title="Guides" subtitle="Step-by-step manuals">
          {guides.map((m) => (
            <ManualCard key={m.title} manual={m} onOpen={() => handleOpen(m)} />
          ))}
        </Section>

        {/* Videos */}
        <Section title="Videos" subtitle="Watch and follow along">
          {videos.map((m) => (
            <ManualCard key={m.title} manual={m} onOpen={() => handleOpen(m)} />
          ))}
        </Section>

        {/* Reference */}
        <Section title="Reference" subtitle="Troubleshooting and APIs">
          {reference.map((m) => (
            <ManualCard key={m.title} manual={m} onOpen={() => handleOpen(m)} />
          ))}
        </Section>

        {/* Support */}
        <GroupedList title="Support">
          <GroupedRow
            icon={<Mail className="w-3.5 h-3.5" />}
            iconBg="hsl(var(--accent))"
            title="Email support"
            subtitle="support@raicelabz.example"
            chevron
          />
          <GroupedRow
            icon={<Phone className="w-3.5 h-3.5" />}
            iconBg="hsl(var(--ios-green))"
            title="Phone"
            subtitle="+91 ........"
            chevron
          />
          <GroupedRow
            icon={<Globe className="w-3.5 h-3.5" />}
            iconBg="hsl(var(--ios-orange))"
            title="Knowledge base"
            subtitle="kb.raicelabz.example"
            chevron
          />
          <GroupedRow
            icon={<HelpCircle className="w-3.5 h-3.5" />}
            iconBg="hsl(var(--ios-red))"
            title="Community forum"
            subtitle="forum.raicelabz.example"
            chevron
          />
        </GroupedList>

        {/* System info */}
        <GroupedList title="System">
          <GroupedRow title="Software" trailing="v 1.0.0" />
          <GroupedRow title="Build" trailing={new Date().toISOString().slice(0, 10)} />
          <GroupedRow title="License" trailing="APIT-PRO-2026" />
          <GroupedRow title="Developer" trailing="RAICE LABZ" />
        </GroupedList>
      </div>
    </div>
  );
};

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="px-1 mb-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider ios-text-tertiary">
          {title}
        </div>
        {subtitle && (
          <div className="text-[12px] ios-text-tertiary mt-0.5">{subtitle}</div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {children}
      </div>
    </section>
  );
}

function ManualCard({ manual, onOpen }: { manual: Manual; onOpen: () => void }) {
  const Icon = manual.icon;
  const color = TYPE_COLOR[manual.type];
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "ios-surface border ios-hairline rounded-[14px] p-4 text-left",
        "flex items-start gap-3",
        "hover:scale-[1.012] active:scale-[0.99] transition-transform duration-150 ios-spring",
      )}
    >
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white shrink-0"
        style={{ background: color }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold ios-text leading-tight">
          {manual.title}
        </div>
        <div className="text-[12px] ios-text-tertiary mt-0.5 line-clamp-2">
          {manual.description}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px]"
            style={{ background: `${color}1f`, color }}
          >
            {manual.type}
          </span>
          <span className="text-[11px] ios-text-tertiary tabular">{manual.size}</span>
          {manual.meta && (
            <>
              <span className="ios-text-tertiary">·</span>
              <span className="text-[11px] ios-text-tertiary">{manual.meta}</span>
            </>
          )}
        </div>
      </div>
      {manual.external ? (
        <ExternalLink className="w-3.5 h-3.5 ios-text-tertiary shrink-0 mt-1" />
      ) : (
        <Download className="w-3.5 h-3.5 ios-text-tertiary shrink-0 mt-1" />
      )}
    </button>
  );
}

export default ManualsIOS;
