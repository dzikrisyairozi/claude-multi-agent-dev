"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ActivityStats,
  StatCardConfig,
  StatCategoryConfig,
} from "@/types/activityLog";
import { useLanguage } from "@/providers/LanguageProvider";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBgColor: string;
}

function StatCard({ label, value, icon, iconBgColor }: StatCardProps) {
  return (
    <Card className="p-4 min-w-[160px] shrink-0 md:min-w-0 md:shrink">
      <div className="flex flex-col gap-2">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBgColor}`}
        >
          {icon}
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold">
          {value.toString().padStart(2, "0")}
        </span>
      </div>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="p-4 min-w-[160px] shrink-0 md:min-w-0 md:shrink">
      <div className="flex flex-col gap-2">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="w-24 h-4" />
        <Skeleton className="w-12 h-8" />
      </div>
    </Card>
  );
}

interface StatsCardsProps {
  stats: ActivityStats | null;
  isLoading: boolean;
  categories: StatCategoryConfig[];
  visibleStats: Array<keyof ActivityStats>;
}

export function StatsCards({
  stats,
  isLoading,
  categories,
  visibleStats,
}: StatsCardsProps) {
  const { t } = useLanguage();

  const visibleCards = categories
    .flatMap((cat) => cat.cards)
    .filter((card) => visibleStats.includes(card.key));

  if (visibleCards.length === 0) return null;

  const getGridCols = (count: number) => {
    if (count <= 2) return "md:grid-cols-2";
    if (count <= 4) return "md:grid-cols-4";
    if (count <= 6) return "md:grid-cols-3 lg:grid-cols-6";
    return "md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9";
  };

  const containerClass = `flex gap-4 overflow-x-auto pb-2 md:pb-0 md:grid ${getGridCols(visibleCards.length)}`;

  if (isLoading) {
    return (
      <div className={containerClass}>
        {visibleCards.map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {visibleCards.map((config: StatCardConfig) => {
        const Icon = config.icon;
        return (
          <StatCard
            key={config.key}
            label={t(config.labelKey)}
            value={stats?.[config.key] ?? 0}
            icon={<Icon className={`w-5 h-5 ${config.iconColor}`} />}
            iconBgColor={config.iconBgColor}
          />
        );
      })}
    </div>
  );
}
