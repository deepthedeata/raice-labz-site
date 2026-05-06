
import { SidebarTrigger } from "@/components/ui/sidebar";
import { User } from "lucide-react";
import { ThemeSwitcher } from "@/components/ios/ThemeSwitcher";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <SidebarTrigger className="lg:hidden" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <ThemeSwitcher />
        <div className="text-right hidden md:block">
          <div className="font-semibold text-foreground">Rice Mill Private Limited</div>
          <div className="text-sm text-muted-foreground">Quality Control System</div>
        </div>
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
