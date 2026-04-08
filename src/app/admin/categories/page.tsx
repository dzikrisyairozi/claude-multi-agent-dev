"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryTypes } from "@/service/admin/categoryType";
import { CategoryType, ParentCategory, CategoryGroup } from "@/types/categoryType";
import { SettingsSidebar } from "@/components/admin/settings-sidebar";
import { CategoryGroupCard } from "./_components/category-group-card";
import { EditCategoryTypeSheet } from "./_components/edit-category-type-sheet";
import { useLanguage } from "@/providers/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";

const PARENT_CATEGORIES: {
  category: ParentCategory;
  labelKey: string;
  subtitleKey: string;
}[] = [
  {
    category: "contracts",
    labelKey: "categoryTypes.contract",
    subtitleKey: "categoryTypes.contractSubtitle",
  },
  {
    category: "purchasing",
    labelKey: "categoryTypes.purchasing",
    subtitleKey: "categoryTypes.purchasingSubtitle",
  },
  {
    category: "expenses",
    labelKey: "categoryTypes.expenses",
    subtitleKey: "categoryTypes.expensesSubtitle",
  },
  {
    category: "other",
    labelKey: "categoryTypes.other",
    subtitleKey: "categoryTypes.otherSubtitle",
  },
];

export default function CategoriesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingType, setEditingType] = useState<CategoryType | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const {
    data: result,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["categoryTypes"],
    queryFn: async () => {
      const res = await getCategoryTypes();
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const categoryTypes = result ?? [];

  const groups: CategoryGroup[] = useMemo(
    () =>
      PARENT_CATEGORIES.map(({ category, labelKey, subtitleKey }) => ({
        category,
        label: t(labelKey as Parameters<typeof t>[0]),
        subtitle: t(subtitleKey as Parameters<typeof t>[0]),
        types: categoryTypes.filter((ct) => ct.category === category),
      })),
    [categoryTypes, t]
  );

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["categoryTypes"] });
  };

  const handleEdit = (categoryType: CategoryType) => {
    setEditingType(categoryType);
    setIsEditOpen(true);
  };

  const handleEditSuccess = () => {
    handleRefresh();
    setEditingType(null);
  };

  return (
    <SettingsSidebar activeItem="categories">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("categoryTypes.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("categoryTypes.subtitle")}
          </p>
        </div>

        {error || (!isLoading && !result) ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("categoryTypes.error")}</AlertTitle>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : t("categoryTypes.failedToLoad")}
            </AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
                <Skeleton className="h-[60px] w-full rounded-none" />
                <div className="px-5 py-4 space-y-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <CategoryGroupCard
                key={group.category}
                category={group.category}
                label={group.label}
                subtitle={group.subtitle}
                types={group.types}
                onEdit={handleEdit}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        )}

        <EditCategoryTypeSheet
          categoryType={editingType}
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open);
            if (!open) setEditingType(null);
          }}
          onSuccess={handleEditSuccess}
        />
      </div>
    </SettingsSidebar>
  );
}
