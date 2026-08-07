
import { SidebarTrigger } from "@/components/ui/sidebar";
import { User } from "lucide-react";
import { ThemeSwitcher } from "@/components/ios/ThemeSwitcher";
import { AppBranding } from "@/components/AppBranding";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage, AVAILABLE_LANGUAGES } from "@/contexts/LanguageContext";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <SidebarTrigger className="lg:hidden" />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground mt-1 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Select value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
          <SelectTrigger className="h-9 w-[110px] text-sm" aria-label="Select language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_LANGUAGES.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ThemeSwitcher />
        <AppBranding className="max-w-[240px]" />
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "hsl(var(--primary))" }}
        >
          <User className="w-5 h-5" style={{ color: "hsl(var(--primary-foreground))" }} />
        </div>
      </div>
    </header>
  );
}
