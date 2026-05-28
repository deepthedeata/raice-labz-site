import { cn } from "@/lib/utils";

interface AppBrandingProps {
  className?: string;
}

export function AppBranding({ className }: AppBrandingProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-sm font-semibold text-foreground truncate">
        Rice Mill Private Limited
      </div>
    </div>
  );
}
