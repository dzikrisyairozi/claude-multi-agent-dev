"use client";

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ActivityStats, StatCategoryConfig } from "@/types/activityLog";
import { useLanguage } from "@/providers/LanguageProvider";

interface FilterShowsDropdownProps {
  categories: StatCategoryConfig[];
  visibleStats: Array<keyof ActivityStats>;
  onToggleStat: (statKey: keyof ActivityStats) => void;
}

export function FilterShowsDropdown({
  categories,
  visibleStats,
  onToggleStat,
}: FilterShowsDropdownProps) {
  const { t } = useLanguage();
  const hasActiveFilters = visibleStats.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          {t("activityLog.filterShows")}
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-green-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="end">
        <div className="py-2">
          {categories.map((catConfig) => (
            <div key={catConfig.category}>
              <div className="px-3 py-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t(catConfig.labelKey)}
                </span>
              </div>
              {catConfig.cards.map((card) => (
                <div
                  key={card.key}
                  className="flex items-center px-3 py-1.5 hover:bg-accent cursor-pointer"
                  onClick={() => onToggleStat(card.key)}
                >
                  <Checkbox
                    checked={visibleStats.includes(card.key)}
                    className="mr-2 pointer-events-none"
                  />
                  <span className="text-sm">
                    {t(card.labelKey)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
