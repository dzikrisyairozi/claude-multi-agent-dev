"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";

export type FilterState = {
  fileTypes: string[];
  dateRange: string;
  sizeRange: string;
};

type FilterPanelProps = {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
};

const FILE_TYPE_OPTIONS = [
  { value: "doc", label: "Documents" },
  { value: "folder", label: "Folders" },
  { value: "image", label: "Images" },
  { value: "pdf", label: "PDF" },
  { value: "ppt", label: "Presentation" },
  { value: "xls", label: "Spreadsheet" },
  { value: "zip", label: "ZIP" },
];

export function FilterPanel({
  filters,
  onFiltersChange,
}: FilterPanelProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const hasActiveFilters = filters.fileTypes.length > 0;

  const handleFileTypeChange = (value: string, checked: boolean) => {
    const newFileTypes = checked
      ? [...filters.fileTypes, value]
      : filters.fileTypes.filter((t) => t !== value);
    onFiltersChange({ ...filters, fileTypes: newFileTypes });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 h-[45px] px-4 rounded-lg text-[15px] font-normal transition-colors hover:bg-[#f5f5f5] border border-figma-border text-figma-light">
          <Filter className="h-5 w-5" />
          {t("files.filter.button")}
          {hasActiveFilters && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white bg-figma-primary">
              {filters.fileTypes.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <div className="space-y-3">
          {/* File Format Label */}
          <Label className="text-xs text-muted-foreground">
            {t("files.filter.fileType")}
          </Label>

          {/* File Type Options */}
          <div className="space-y-2">
            {FILE_TYPE_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center space-x-3">
                <Checkbox
                  id={`type-${option.value}`}
                  checked={filters.fileTypes.includes(option.value)}
                  onCheckedChange={(checked) =>
                    handleFileTypeChange(option.value, checked as boolean)
                  }
                />
                <Label
                  htmlFor={`type-${option.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
