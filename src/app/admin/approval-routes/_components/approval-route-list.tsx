"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ApprovalRoute } from "@/types/approvalRoute";
import {
  IconSearch,
  IconRoute,
  IconChevronRight,
} from "@tabler/icons-react";
import { useLanguage } from "@/providers/LanguageProvider";

interface ApprovalRouteListProps {
  routes: ApprovalRoute[];
  selectedId: string | null;
  isLoading?: boolean;
  onSelect: (route: ApprovalRoute) => void;
}

function getRouteSubtitle(
  route: ApprovalRoute,
  t: ReturnType<typeof useLanguage>["t"]
): string {
  const parts: string[] = [];
  const { conditions } = route;

  if (conditions.departments?.length) {
    const depts = conditions.departments.slice(0, 2);
    const more =
      conditions.departments.length > 2
        ? ` +${conditions.departments.length - 2}`
        : "";
    parts.push(t("approvalRoute.list.forDept", { depts: `${depts.join(", ")}${more}` }));
  }

  if (conditions.min_amount != null) {
    const op = conditions.min_amount_inclusive ? "≥" : ">";
    parts.push(`${op} ¥${conditions.min_amount.toLocaleString()}`);
  }

  if (conditions.max_amount != null) {
    const op = conditions.max_amount_inclusive ? "≤" : "<";
    parts.push(`${op} ¥${conditions.max_amount.toLocaleString()}`);
  }

  if (conditions.categories?.length && parts.length === 0) {
    parts.push(
      conditions.categories
        .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
        .join(", ")
    );
  }

  return parts.join(" · ") || t("approvalRoute.list.noConditions");
}

export function ApprovalRouteList({
  routes,
  selectedId,
  isLoading,
  onSelect,
}: ApprovalRouteListProps) {
  const [search, setSearch] = useState("");
  const { t } = useLanguage();

  const filtered = routes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t("approvalRoute.list.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground px-4 text-center">
            {search
              ? t("approvalRoute.list.noMatch")
              : t("approvalRoute.list.empty")}
          </div>
        ) : (
          filtered.map((route) => {
            const isSelected = selectedId === route.id;
            return (
              <button
                key={route.id}
                onClick={() => onSelect(route)}
                className={cn(
                  "w-full text-left flex items-center gap-3 px-4 py-3 border-b transition-colors border-l-2",
                  isSelected
                    ? "bg-blue-50 border-l-blue-500"
                    : "border-l-transparent hover:bg-muted/40"
                )}
              >
                <div
                  className={cn(
                    "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
                    isSelected
                      ? "bg-blue-100 text-blue-600"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <IconRoute className="size-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">{route.name}</p>
                    {!route.is_active && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1 py-0 h-4 shrink-0"
                      >
                        {t("approvalRoute.list.off")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {getRouteSubtitle(route, t)}
                  </p>
                </div>

                <IconChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
