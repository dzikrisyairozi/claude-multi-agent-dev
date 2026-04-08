"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Filter, X } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";

export interface FilterState {
  category: string;
  priority: string;
  department: string;
  dateFrom: string;
  dateTo: string;
}

export const initialFilterState: FilterState = {
  category: "",
  priority: "",
  department: "",
  dateFrom: "",
  dateTo: "",
};

interface FilterOptions {
  categories: string[];
  priorities: string[];
  departments: string[];
}

interface ApprovalRequestFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  filterOptions: FilterOptions;
}

export function ApprovalRequestFilter({
  filters,
  onFiltersChange,
  filterOptions,
}: ApprovalRequestFilterProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category) count++;
    if (filters.priority) count++;
    if (filters.department) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    return count;
  }, [filters]);

  const handleResetFilters = () => {
    onFiltersChange(initialFilterState);
  };

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === "all" ? "" : value,
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`bg-white border-gray-200 text-gray-600 gap-2 ${
            activeFilterCount > 0 ? "border-primary text-primary" : ""
          }`}
        >
          <Filter className="w-4 h-4" />
          {t("dashboard.filter")}
          {activeFilterCount > 0 && (
            <Badge className="ml-1 bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">
              {t("dashboard.filterOptions")}
            </h4>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-gray-500 hover:text-gray-700 h-auto p-1"
              >
                <X className="w-3 h-3 mr-1" />
                {t("dashboard.resetFilters")}
              </Button>
            )}
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">
              {t("fields.category")}
            </Label>
            <Select
              value={filters.category || "all"}
              onValueChange={(value) => updateFilter("category", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("dashboard.selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("status.all")}</SelectItem>
                {filterOptions.categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">
              {t("fields.priority")}
            </Label>
            <Select
              value={filters.priority || "all"}
              onValueChange={(value) => updateFilter("priority", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("dashboard.selectPriority")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("status.all")}</SelectItem>
                {filterOptions.priorities.map((pri) => (
                  <SelectItem key={pri} value={pri}>
                    {pri}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department Filter */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">
              {t("fields.department")}
            </Label>
            <Select
              value={filters.department || "all"}
              onValueChange={(value) => updateFilter("department", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("dashboard.selectDepartment")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("status.all")}</SelectItem>
                {filterOptions.departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter - Using native date inputs for reliability */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">
              {t("dashboard.dateRange")}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-400 mb-1 block">
                  {t("dashboard.from")}
                </Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter("dateFrom", e.target.value)}
                  className="w-full h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-400 mb-1 block">
                  {t("dashboard.to")}
                </Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter("dateTo", e.target.value)}
                  className="w-full h-9 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
