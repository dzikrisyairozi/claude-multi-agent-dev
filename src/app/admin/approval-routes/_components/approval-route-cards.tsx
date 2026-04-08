"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ApprovalRoute } from "@/types/approvalRoute";
import { deleteApprovalRoute } from "@/service/approvalRoute/approvalRoute";
import {
  IconFileText,
  IconShoppingCart,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { useLanguage } from "@/providers/LanguageProvider";

interface ApprovalRouteCardsProps {
  routes: ApprovalRoute[];
  isLoading?: boolean;
  onSelect: (routeId: string) => void;
  onDelete: () => void;
}

function summarizeGroup(cond: Record<string, unknown>): string[] {
  const parts: string[] = [];
  const categories = cond.categories as string[] | undefined;
  const departments = cond.departments as string[] | undefined;
  const minAmount = cond.min_amount as number | undefined;
  const maxAmount = cond.max_amount as number | undefined;

  if (categories?.length) {
    parts.push(categories.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", "));
  }
  if (departments?.length) {
    parts.push(departments.join(", ") + " Dept");
  }
  if (minAmount != null) {
    const op = cond.min_amount_inclusive ? "≥" : ">";
    parts.push(`${op} ¥${minAmount.toLocaleString()}`);
  }
  if (maxAmount != null) {
    const op = cond.max_amount_inclusive ? "≤" : "<";
    parts.push(`${op} ¥${maxAmount.toLocaleString()}`);
  }
  return parts;
}

function getConditionSummary(route: ApprovalRoute): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions = route.conditions as any;
  if (!conditions || Object.keys(conditions).length === 0) return "No conditions";

  // Group format: { groups: [...] }
  if (conditions.groups && Array.isArray(conditions.groups)) {
    const groupSummaries = conditions.groups
      .map((g: Record<string, unknown>) => summarizeGroup(g))
      .filter((parts: string[]) => parts.length > 0)
      .map((parts: string[]) => parts.join(" + "));
    return groupSummaries.length > 0 ? groupSummaries.join(" OR ") : "No conditions";
  }

  // Flat format
  const parts = summarizeGroup(conditions);
  return parts.length > 0 ? parts.join(" + ") : "No conditions";
}

function getCategoryIcon(route: ApprovalRoute) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions = route.conditions as any;
  // Check flat format
  let cats = conditions?.categories as string[] | undefined;
  // Check group format
  if (!cats?.length && conditions?.groups?.[0]?.categories) {
    cats = conditions.groups[0].categories;
  }
  if (cats?.includes("contracts")) return IconFileText;
  if (cats?.includes("purchasing")) return IconShoppingCart;
  return IconFileText;
}

export function ApprovalRouteCards({
  routes,
  isLoading,
  onSelect,
  onDelete,
}: ApprovalRouteCardsProps) {
  const { t } = useLanguage();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteApprovalRoute(deleteId);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Route deleted successfully");
      onDelete();
    }
    setDeleteId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-[10px] p-5">
            <Skeleton className="h-6 w-1/3 mb-3" />
            <Skeleton className="h-4 w-1/2 mb-4" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <p className="text-sm">{t("approvalRoute.list.empty")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {routes.map((route) => {
          const Icon = getCategoryIcon(route);
          return (
            <div
              key={route.id}
              className="border rounded-[10px] p-5 bg-white hover:border-sky-200 transition-colors cursor-pointer"
              onClick={() => onSelect(route.id)}
            >
              {/* Header: icon + name + badge + actions */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center">
                    <Icon className="size-5 text-sky-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">{route.name}</h3>
                    <Badge
                      className={
                        route.is_active
                          ? "bg-green-100 text-green-600 hover:bg-green-100"
                          : "bg-red-100 text-red-600 hover:bg-red-100"
                      }
                    >
                      {route.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 border rounded-md hover:bg-gray-100"
                    onClick={() => onSelect(route.id)}
                  >
                    <IconPencil className="size-4 text-gray-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 bg-red-500 rounded-md hover:bg-red-600 text-white"
                    onClick={() => setDeleteId(route.id)}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Condition summary + weight */}
              <div className="flex items-center gap-3 mt-2 ml-[52px]">
                <p className="text-sm text-muted-foreground">
                  {getConditionSummary(route)}
                </p>
                <Badge variant="outline" className="text-[10px] font-medium text-gray-500 border-gray-200">
                  Weight: {route.weight ?? 50}
                </Badge>
              </div>

              {/* Step preview timeline */}
              {route.steps.length > 0 && (
                <div className="mt-4 ml-[52px] mr-4">
                  <div className="flex items-start">
                    {/* Requester node */}
                    <div className="flex flex-col items-center shrink-0">
                      <p className="text-[11px] font-semibold text-sky-500 mb-1">Requester</p>
                      <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center">
                        <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>

                    {/* Steps with connecting lines */}
                    {route.steps.map((step) => {
                      const hasMembers = step.assignees && step.assignees.length > 0;
                      const filters: { label: string; value: string }[] = [];
                      if (step.approver_role) filters.push({ label: "Role", value: step.approver_role.charAt(0).toUpperCase() + step.approver_role.slice(1) });
                      if (step.position) filters.push({ label: "Position", value: step.position.name });
                      if (step.department) filters.push({ label: "Department", value: step.department.name });

                      return (
                        <div key={step.step_order} className="flex items-start flex-1">
                          <div className="flex-1 h-0.5 bg-sky-200 mt-[30px] mx-3" />
                          <div className="flex flex-col items-center shrink-0 min-w-[100px]">
                            {/* Step label */}
                            <p className="text-[11px] font-semibold text-muted-foreground mb-1">
                              Step {step.step_order} {step.name ? `(${step.name})` : ""}
                            </p>
                            {/* Dot */}
                            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-gray-400" />
                            </div>
                            {/* Details */}
                            <div className="mt-1.5 flex flex-col items-center gap-0.5">
                              {hasMembers ? (
                                <>
                                  <span className="text-[10px] text-muted-foreground">Members:</span>
                                  {step.assignees!.slice(0, 3).map((a) => (
                                    <span key={a.user_id} className="text-[11px] font-medium text-gray-700">
                                      {a.user ? [a.user.first_name, a.user.last_name].filter(Boolean).join(" ") : "Member"}
                                    </span>
                                  ))}
                                  {step.assignees!.length > 3 && (
                                    <span className="text-[10px] text-muted-foreground">+{step.assignees!.length - 3} more</span>
                                  )}
                                </>
                              ) : filters.length > 0 ? (
                                filters.map((f) => (
                                  <span key={f.label} className="text-[11px] text-muted-foreground">
                                    <span className="font-medium text-gray-700">{f.label}:</span> {f.value}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-muted-foreground italic">No assignment</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Route</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this approval route? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
