import { useEffect, useState } from "react";
import {
  User,
  Building2,
  MapPin,
  Wheat,
  Languages,
  Volume2,
  VolumeX,
  Moon,
  Cable,
  Sliders,
  Palette,
  Database,
  ChevronRight,
  Save,
  Info,
} from "lucide-react";
import { TopBarIOS } from "@/components/ios/TopBarIOS";
import { Tile } from "@/components/ios/Tile";
import { GroupedList, GroupedRow } from "@/components/ios/GroupedList";
import { SegmentedControl } from "@/components/ios/SegmentedControl";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme, ALL_THEMES, THEME_META, ThemeMode } from "@/components/ios/theme-provider";
import { getSoundsEnabled, setSoundsEnabled } from "@/hooks/useSoundEffects";
import { setIdleAmbientDisabled } from "@/components/ios/IdleAmbient";
import { useToast } from "@/hooks/use-toast";

const SettingsIOS = () => {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [millName, setMillName] = useState<string>(() => localStorage.getItem("riceMill_millName") ?? "");
  const [operator, setOperator] = useState<string>(() => localStorage.getItem("riceMill_operatorName") ?? "");
  const [location, setLocation] = useState<string>(() => localStorage.getItem("riceMill_location") ?? "");
  const [region, setRegion] = useState<string>(() => localStorage.getItem("riceMill_region") ?? "non-basmati");
  const [soundsOn, setSoundsOn] = useState<boolean>(() => getSoundsEnabled());
  const [idleEnabled, setIdleEnabled] = useState<boolean>(() => localStorage.getItem("raice-idle-disabled") !== "true");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/raice_labz/settings/rice-mill");
        const d = await r.json();
        if (d?.status === "success" && d.settings) {
          if (d.settings.riceMillName) {
            setMillName(d.settings.riceMillName);
            localStorage.setItem("riceMill_millName", d.settings.riceMillName);
          }
          if (d.settings.operatorName) {
            setOperator(d.settings.operatorName);
            localStorage.setItem("riceMill_operatorName", d.settings.operatorName);
          }
          if (d.settings.location) {
            setLocation(d.settings.location);
            localStorage.setItem("riceMill_location", d.settings.location);
          }
          if (d.settings.region) {
            setRegion(d.settings.region);
            localStorage.setItem("riceMill_region", d.settings.region);
          }
        }
      } catch (e) {
        console.warn("Settings load failed", e);
      }
    })();
  }, []);

  const persistLocal = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* swallow */
    }
  };

  const saveCore = async () => {
    setSaving(true);
    persistLocal("riceMill_millName", millName);
    persistLocal("riceMill_operatorName", operator);
    persistLocal("riceMill_location", location);
    persistLocal("riceMill_region", region);

    try {
      const r = await fetch("/api/raice_labz/settings/rice-mill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riceMillName: millName,
          operatorName: operator,
          location,
          region,
        }),
      });
      if (r.ok) {
        toast({ title: "Settings saved", description: "Mill information synced." });
      } else {
        toast({ title: "Saved locally", description: "Backend unreachable — values stored on this device." });
      }
    } catch {
      toast({ title: "Saved locally", description: "Backend unreachable — values stored on this device." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBarIOS title="Settings" subtitle="Configure machine, appearance, and behaviour" />

      <div className="px-6 py-6 max-w-[820px] w-full mx-auto space-y-6">
        {/* Mill identity */}
        <GroupedList title="Mill" footer="These values are stamped on every report.">
          <GroupedRow
            icon={<Building2 className="w-3.5 h-3.5" />}
            iconBg="hsl(var(--accent))"
            title="Mill name"
            trailing={
              <input
                value={millName}
                onChange={(e) => setMillName(e.target.value)}
                placeholder="e.g. Plant 2"
                className="bg-transparent text-right text-[14px] ios-text outline-none w-[200px]"
              />
            }
          />
          <GroupedRow
            icon={<User className="w-3.5 h-3.5" />}
            iconBg="hsl(var(--ios-green))"
            title="Operator"
            trailing={
              <input
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                placeholder="On shift"
                className="bg-transparent text-right text-[14px] ios-text outline-none w-[200px]"
              />
            }
          />
          <GroupedRow
            icon={<MapPin className="w-3.5 h-3.5" />}
            iconBg="hsl(var(--ios-orange))"
            title="Location"
            trailing={
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, State"
                className="bg-transparent text-right text-[14px] ios-text outline-none w-[200px]"
              />
            }
          />
          <GroupedRow
            icon={<Wheat className="w-3.5 h-3.5" />}
            iconBg="hsl(var(--ios-red))"
            title="Region"
            trailing={
              <SegmentedControl
                size="sm"
                value={region}
                onChange={setRegion}
                segments={[
                  { value: "non-basmati", label: "Non-Basmati" },
                  { value: "basmati", label: "Basmati" },
                ]}
              />
            }
          />
        </GroupedList>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={saveCore}
            disabled={saving}
            className="h-11 px-6 rounded-[12px] flex items-center gap-2 text-[14px] font-semibold transition-transform duration-150 ios-spring hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            style={{
              background: "hsl(var(--accent))",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save mill info"}
          </button>
        </div>

        {/* Appearance */}
        <GroupedList title="Appearance">
          <GroupedRow
            icon={<Palette className="w-3.5 h-3.5" />}
            iconBg="hsl(var(--accent))"
            title="Theme"
            subtitle={THEME_META[theme].description}
            trailing={
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as ThemeMode)}
                aria-label="Theme"
                title="Theme"
                className="bg-transparent text-[14px] ios-text outline-none cursor-pointer pr-1"
              >
                {ALL_THEMES.map((t) => (
                  <option key={t} value={t}>
                    {THEME_META[t].label}
                    {THEME_META[t].isDark ? " (Dark)" : ""}
                  </option>
                ))}
              </select>
            }
          />
          <GroupedRow
            icon={<Languages className="w-3.5 h-3.5" />}
            iconBg="hsl(var(--ios-orange))"
            title="Language"
            trailing={
              <SegmentedControl
                size="sm"
                value={language}
                onChange={(v) => setLanguage(v as "en" | "kn")}
                segments={[
                  { value: "en", label: "English" },
                  { value: "kn", label: "ಕನ್ನಡ" },
                ]}
              />
            }
          />
        </GroupedList>

        {/* Behaviour */}
        <GroupedList title="Behaviour" footer="Tones use the Web Audio API — no asset files. Idle ambient hides the UI when no input for 60 s on the Console.">
          <GroupedRow
            icon={soundsOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            iconBg="hsl(var(--ios-green))"
            title="Sound feedback"
            subtitle={soundsOn ? "Plays start / stop / fault tones" : "Muted"}
            trailing={
              <Toggle
                value={soundsOn}
                onChange={(v) => {
                  setSoundsEnabled(v);
                  setSoundsOn(v);
                }}
              />
            }
          />
          <GroupedRow
            icon={<Moon className="w-3.5 h-3.5" />}
            iconBg="hsl(var(--accent))"
            title="Idle ambient screen"
            subtitle={idleEnabled ? "Activates after 60 s on Console" : "Disabled"}
            trailing={
              <Toggle
                value={idleEnabled}
                onChange={(v) => {
                  setIdleAmbientDisabled(!v);
                  setIdleEnabled(v);
                }}
              />
            }
          />
        </GroupedList>

        {/* Advanced — links to the existing full Settings page */}
        <GroupedList title="Advanced" footer="The legacy Settings page hosts deep config: production lines, machines, Modbus RTU device control, segmentation thresholds, and Whiteness Index grade colours.">
          <GroupedRow
            icon={<Database className="w-3.5 h-3.5" />}
            iconBg="hsl(var(--ios-blue))"
            title="Production lines & machines"
            subtitle="Add, edit, delete lines and per-line machine roster"
            chevron
            onClick={() => (window.location.href = "/settings/advanced")}
          />
          <GroupedRow
            icon={<Cable className="w-3.5 h-3.5" />}
            iconBg="hsl(var(--ios-orange))"
            title="Modbus RTU"
            subtitle="Port, baud, slave ID, live device control"
            chevron
            onClick={() => (window.location.href = "/settings/advanced")}
          />
          <GroupedRow
            icon={<Sliders className="w-3.5 h-3.5" />}
            iconBg="hsl(var(--ios-red))"
            title="Segmentation thresholds"
            subtitle="Length-based grain category cut-offs by region"
            chevron
            onClick={() => (window.location.href = "/settings/advanced")}
          />
          <GroupedRow
            icon={<Palette className="w-3.5 h-3.5" />}
            iconBg="hsl(var(--ios-green))"
            title="Whiteness Index grades"
            subtitle="Super White / White / Cream / Lemon / Amber / Golden"
            chevron
            onClick={() => (window.location.href = "/settings/advanced")}
          />
        </GroupedList>

        <Tile className="flex items-start gap-3">
          <Info className="w-4 h-4 ios-text-tertiary shrink-0 mt-0.5" />
          <div className="text-[12px] ios-text-secondary leading-relaxed">
            iOS Settings shows the high-frequency switches you'd flip during a shift. For one-time
            commissioning tasks (Modbus connection, segmentation tuning, line setup), open the
            Advanced rows above — they jump to the legacy settings page.
          </div>
        </Tile>
      </div>
    </div>
  );
};

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value ? "true" : "false"}
      aria-label={value ? "On" : "Off"}
      title={value ? "On" : "Off"}
      className="relative h-7 w-12 rounded-full transition-colors duration-200 ios-spring"
      style={{
        background: value ? "hsl(var(--ios-green))" : "hsl(var(--ios-separator))",
      }}
    >
      <span
        className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform duration-200 ios-spring"
        style={{
          transform: value ? "translateX(20px)" : "translateX(0)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

export default SettingsIOS;
