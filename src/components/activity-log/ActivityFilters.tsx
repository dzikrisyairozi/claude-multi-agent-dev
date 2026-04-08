"use client";

import { useEffect } from "react";
import { useSearch } from "@/hooks/useSearch";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContentScrollable,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActivityAction } from "@/types/activityLog";
import {
  GENERAL_ACTION_OPTIONS,
  SUBMISSION_ACTION_OPTIONS,
} from "@/lib/constants/activityLog";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/providers/LanguageProvider";

interface ActivityFiltersProps {
  onSearch: (search: string) => void;
  onActionFilter: (action: ActivityAction | undefined) => void;
}

export function ActivityFilters({
  onSearch,
  onActionFilter,
}: ActivityFiltersProps) {
  const { t } = useLanguage();
  const { searchValue, debouncedValue, setSearchValue } = useSearch("", 300);

  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  return (
    <div className="flex flex-col md:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t("activityLog.search")}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Action Type Filter */}
      <Select
        onValueChange={(v) =>
          onActionFilter(v === "all" ? undefined : (v as ActivityAction))
        }
      >
        <SelectTrigger className="w-full md:w-[180px]">
          <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder={t("activityLog.allTypes")} />
        </SelectTrigger>
        <SelectContentScrollable>
          <SelectItem value="all">{t("activityLog.allTypes")}</SelectItem>
          <SelectSeparator />

          {GENERAL_ACTION_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className={option.className}
            >
              <option.icon className={cn("w-4 h-4", option.className)} />
              {t(option.labelKey)}
            </SelectItem>
          ))}

          <SelectSeparator />

          <SelectGroup>
            <SelectLabel>{t("action.submission")}</SelectLabel>
            {SUBMISSION_ACTION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <option.icon className="w-4 h-4" />
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContentScrollable>
      </Select>
    </div>
  );
}
