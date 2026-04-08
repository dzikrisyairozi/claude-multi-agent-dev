"use client";

import { useState, useMemo, useCallback } from "react";
import { Calendar } from "lucide-react";
import { useActivityDataQuery } from "@/hooks/activity-log";
import {
  ActivityLogFilters,
  ActivityAction,
  ActivityStats,
  DateRange,
} from "@/types/activityLog";
import { StatsCards } from "./StatsCards";
import { ActivityFilters } from "./ActivityFilters";
import { ActivityLogList } from "./ActivityLogList";
import { FilterShowsDropdown } from "./FilterShowsDropdown";
import { TablePagination } from "@/components/table-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_PAGE_SIZE,
  DATE_RANGE_OPTIONS,
  getDateRangeValues,
  ACTIVITY_LOG_PAGE_CONFIG,
} from "@/lib/constants/activityLog";
import { useLanguage } from "@/providers/LanguageProvider";

interface ActivityLogPageClientProps {
  variant?: "admin" | "employee";
  userId?: string;
}

export function ActivityLogPageClient({
  variant = "admin",
  userId,
}: ActivityLogPageClientProps) {
  const { t } = useLanguage();
  const config = ACTIVITY_LOG_PAGE_CONFIG[variant];

  const pageTitle = t(config.titleKey);
  const pageSubtitle = t(config.subtitleKey);

  const [dateRange, setDateRange] = useState<DateRange>("7days");
  const [filters, setFilters] = useState<ActivityLogFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleStats, setVisibleStats] = useState<Array<keyof ActivityStats>>(
    config.defaultVisibleStats,
  );
  const pageSize = DEFAULT_PAGE_SIZE;

  const { from, to } = useMemo(
    () => getDateRangeValues(dateRange),
    [dateRange],
  );

  const combinedFilters: ActivityLogFilters = useMemo(
    () => ({
      ...filters,
      from_date: from,
      to_date: to,
      ...(variant === "employee" && userId ? { user_id: userId } : {}),
    }),
    [filters, from, to, variant, userId],
  );

  const {
    logs,
    total,
    totalPages,
    stats,
    isLoading,
  } = useActivityDataQuery(
    combinedFilters,
    currentPage,
    pageSize,
    variant === "employee" ? userId : undefined,
  );

  const handleFilterChange = useCallback(
    (newFilters: Partial<ActivityLogFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
      setCurrentPage(1);
    },
    [],
  );

  const handleActionFilter = useCallback(
    (action: ActivityAction | undefined) => {
      handleFilterChange({ action });
    },
    [handleFilterChange],
  );

  const handleSearch = useCallback(
    (search: string) => {
      handleFilterChange({ search: search || undefined });
    },
    [handleFilterChange],
  );

  const handleToggleStat = useCallback((statKey: keyof ActivityStats) => {
    setVisibleStats((prev) =>
      prev.includes(statKey)
        ? prev.filter((k) => k !== statKey)
        : [...prev, statKey],
    );
  }, []);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight">{pageTitle}</h2>
          <p className="text-muted-foreground text-sm">{pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <FilterShowsDropdown
            categories={config.statCategories}
            visibleStats={visibleStats}
            onToggleStat={handleToggleStat}
          />
          <Select
            value={dateRange}
            onValueChange={(v) => setDateRange(v as DateRange)}
          >
            <SelectTrigger className="w-[150px] text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder={t("dateRange.7days")} />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards
        stats={stats}
        isLoading={isLoading}
        categories={config.statCategories}
        visibleStats={visibleStats}
      />

      {/* Filters */}
      <ActivityFilters
        onSearch={handleSearch}
        onActionFilter={handleActionFilter}
      />

      {/* Activity Log List */}
      <ActivityLogList logs={logs} isLoading={isLoading} />

      {/* Pagination */}
      {total > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          startIndex={startIndex}
          endIndex={endIndex}
          totalItems={total}
          goToPreviousPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
          goToNextPage={() =>
            setCurrentPage((p) => Math.min(totalPages, p + 1))
          }
          setCurrentPage={setCurrentPage}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
        />
      )}
    </div>
  );
}
