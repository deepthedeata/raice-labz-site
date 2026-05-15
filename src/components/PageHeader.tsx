
import { SidebarTrigger } from "@/components/ui/sidebar";
import { User } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <SidebarTrigger className="lg:hidden" />
        <div>
          <h1 className="text-2xl font-bold text-rice-primary">{title}</h1>
          {subtitle && (
            <p className="text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <div className="font-semibold text-rice-primary">Rice Mill Private Limited</div>
          <div className="text-sm text-gray-600">Quality Control System</div>
        </div>
        <div className="w-10 h-10 bg-rice-primary rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
      </div>
    </header>
  );
}
