"use client";

import { ChevronRight, Home } from "lucide-react";
import { BreadcrumbItem } from "@/types/folder";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/providers/LanguageProvider";

type FolderBreadcrumbProps = {
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
};

export function FolderBreadcrumb({
  breadcrumbs,
  onNavigate,
}: FolderBreadcrumbProps) {
  const { t } = useLanguage();

  // Translate root folder name
  const getDisplayName = (item: BreadcrumbItem, index: number) => {
    if (index === 0 && item.id === null) {
      return t("nav.myFiles");
    }
    return item.name;
  };

  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto">
      {breadcrumbs.map((item, index) => (
        <div key={item.id ?? "root"} className="flex items-center gap-1">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <button
            onClick={() => onNavigate(item.id)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors whitespace-nowrap",
              index === breadcrumbs.length - 1
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {index === 0 && <Home className="h-4 w-4" />}
            <span>{getDisplayName(item, index)}</span>
          </button>
        </div>
      ))}
    </nav>
  );
}
