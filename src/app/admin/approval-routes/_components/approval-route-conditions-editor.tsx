"use client";

import { useMemo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContentScrollable,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconPlus, IconMinus, IconFilter, IconX, IconAlertTriangle } from "@tabler/icons-react";
import { ApprovalRouteCategory, ApprovalRouteCondition } from "@/types/approvalRoute";
import { Department } from "@/types/department";
import { CategoryType } from "@/types/categoryType";
import { getActiveDepartments } from "@/service/admin/department";
import { getActiveCategoryTypes } from "@/service/admin/categoryType";
import { useLanguage } from "@/providers/LanguageProvider";

export type ConditionField = "department" | "amount" | "category" | "category_type";
export type ConditionOperator =
  | "is"
  | "is_not"
  | "is_greater_than"
  | "is_greater_than_or_equal"
  | "is_less_than"
  | "is_less_than_or_equal";

export interface ConditionRow {
  id: string;
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
}

export interface ConditionGroup {
  id: string;
  rows: ConditionRow[];
}

function getDefaultOperator(field: ConditionField): ConditionOperator {
  return field === "amount" ? "is_greater_than" : "is";
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Get available fields for a new/existing row in a group.
 * Rules:
 * - Category: max 1 per group
 * - Category Type: max 1, only when category exists in group
 * - Department: max 1 per group
 * - Amount: max 2 (one > and one <); hide if both operators used
 */
export function getAvailableFields(
  group: ConditionGroup,
  currentRowId?: string
): ConditionField[] {
  const otherRows = currentRowId
    ? group.rows.filter((r) => r.id !== currentRowId)
    : group.rows;

  const fields: ConditionField[] = [];

  // Department: max 1
  if (!otherRows.some((r) => r.field === "department")) {
    fields.push("department");
  }

  // Amount: max 2 (one per operator direction)
  const amountRows = otherRows.filter((r) => r.field === "amount");
  const hasGt = amountRows.some((r) => r.operator === "is_greater_than" || r.operator === "is_greater_than_or_equal");
  const hasLt = amountRows.some((r) => r.operator === "is_less_than" || r.operator === "is_less_than_or_equal");
  if (!hasGt || !hasLt) {
    fields.push("amount");
  }

  // Category: max 1
  if (!otherRows.some((r) => r.field === "category")) {
    fields.push("category");
  }

  // Category Type: max 1, only when category with value exists
  const hasCategoryWithValue = group.rows.some((r) => r.field === "category" && r.value);
  if (hasCategoryWithValue && !otherRows.some((r) => r.field === "category_type")) {
    fields.push("category_type");
  }

  return fields;
}

/**
 * Get available amount operators for a row in a group.
 * Only one lower-bound (gt / gte) and one upper-bound (lt / lte) operator per group.
 */
export function getAvailableAmountOperators(
  group: ConditionGroup,
  currentRowId: string
): ConditionOperator[] {
  const otherAmountRows = group.rows.filter(
    (r) => r.id !== currentRowId && r.field === "amount"
  );
  const usedOps = otherAmountRows.map((r) => r.operator);

  const hasLowerBound = usedOps.includes("is_greater_than") || usedOps.includes("is_greater_than_or_equal");
  const hasUpperBound = usedOps.includes("is_less_than") || usedOps.includes("is_less_than_or_equal");

  const available: ConditionOperator[] = [];
  if (!hasLowerBound) {
    available.push("is_greater_than");
    available.push("is_greater_than_or_equal");
  }
  if (!hasUpperBound) {
    available.push("is_less_than");
    available.push("is_less_than_or_equal");
  }
  return available;
}

/**
 * Detect contradictory or degenerate amount ranges within a group.
 * Returns a warning key if the range is impossible or only matches a single value.
 */
export function getAmountRangeWarning(
  group: ConditionGroup
): "impossible" | "exactMatch" | null {
  const amountRows = group.rows.filter((r) => r.field === "amount" && r.value);
  if (amountRows.length < 2) return null;

  const lowerRow = amountRows.find(
    (r) => r.operator === "is_greater_than" || r.operator === "is_greater_than_or_equal"
  );
  const upperRow = amountRows.find(
    (r) => r.operator === "is_less_than" || r.operator === "is_less_than_or_equal"
  );
  if (!lowerRow || !upperRow) return null;

  const lower = Number(lowerRow.value);
  const upper = Number(upperRow.value);
  if (isNaN(lower) || isNaN(upper)) return null;

  const lowerInclusive = lowerRow.operator === "is_greater_than_or_equal";
  const upperInclusive = upperRow.operator === "is_less_than_or_equal";

  if (lower === upper) {
    // >= X AND <= X → exact match (probably unintended)
    if (lowerInclusive && upperInclusive) return "exactMatch";
    // Any other combo with same value → impossible (> X AND < X, > X AND <= X, >= X AND < X)
    return "impossible";
  }

  if (lower > upper) return "impossible";

  return null;
}

// Convert a single stored conditions object → rows
function singleConditionToRows(conditions: ApprovalRouteCondition): ConditionRow[] {
  const rows: ConditionRow[] = [];

  (conditions.departments ?? []).forEach((dept) => {
    rows.push({ id: newId(), field: "department", operator: "is", value: dept });
  });

  if (conditions.min_amount != null) {
    const op = conditions.min_amount_inclusive ? "is_greater_than_or_equal" : "is_greater_than";
    rows.push({ id: newId(), field: "amount", operator: op, value: String(conditions.min_amount) });
  }

  if (conditions.max_amount != null) {
    const op = conditions.max_amount_inclusive ? "is_less_than_or_equal" : "is_less_than";
    rows.push({ id: newId(), field: "amount", operator: op, value: String(conditions.max_amount) });
  }

  (conditions.categories ?? []).forEach((cat) => {
    rows.push({ id: newId(), field: "category", operator: "is", value: cat });
  });

  (conditions.category_type_ids ?? []).forEach((ctId) => {
    rows.push({ id: newId(), field: "category_type", operator: "is", value: ctId });
  });

  return rows;
}

// Convert rows → single stored conditions object
export function rowsToConditions(rows: ConditionRow[]): ApprovalRouteCondition {
  const departments: string[] = [];
  const categories: ApprovalRouteCategory[] = [];
  const category_type_ids: string[] = [];
  const result: ApprovalRouteCondition = {};

  for (const row of rows) {
    if (!row.value) continue;
    switch (row.field) {
      case "department":
        departments.push(row.value);
        break;
      case "amount":
        if (row.operator === "is_greater_than" || row.operator === "is_greater_than_or_equal") {
          result.min_amount = Number(row.value);
          result.min_amount_inclusive = row.operator === "is_greater_than_or_equal";
        } else if (row.operator === "is_less_than" || row.operator === "is_less_than_or_equal") {
          result.max_amount = Number(row.value);
          result.max_amount_inclusive = row.operator === "is_less_than_or_equal";
        }
        break;
      case "category":
        categories.push(row.value as ApprovalRouteCategory);
        break;
      case "category_type":
        category_type_ids.push(row.value);
        break;
    }
  }

  if (departments.length > 0) result.departments = departments;
  if (categories.length > 0) result.categories = categories;
  if (category_type_ids.length > 0) result.category_type_ids = category_type_ids;

  return result;
}

// Convert stored JSONB → ConditionGroup[]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function conditionsToGroups(conditions: any): ConditionGroup[] {
  if (!conditions) return [];

  // New format: { groups: [...] }
  if (conditions.groups && Array.isArray(conditions.groups)) {
    const groups = conditions.groups
      .map((g: ApprovalRouteCondition) => ({
        id: newId(),
        rows: singleConditionToRows(g),
      }))
      .filter((g: ConditionGroup) => g.rows.length > 0);
    return groups;
  }

  // Legacy format: single condition object
  const rows = singleConditionToRows(conditions);
  if (rows.length === 0) return [];
  return [{ id: newId(), rows }];
}

// Convert ConditionGroup[] → stored JSONB
export function groupsToConditions(
  groups: ConditionGroup[]
): { groups: ApprovalRouteCondition[] } | ApprovalRouteCondition {
  const nonEmpty = groups.filter((g) => g.rows.length > 0);
  if (nonEmpty.length === 0) return {};
  if (nonEmpty.length === 1) {
    // Single group: store as flat object for simplicity
    return rowsToConditions(nonEmpty[0].rows);
  }
  return { groups: nonEmpty.map((g) => rowsToConditions(g.rows)) };
}

interface ApprovalRouteConditionsEditorProps {
  groups: ConditionGroup[];
  onChange: (groups: ConditionGroup[]) => void;
}

export function ApprovalRouteConditionsEditor({
  groups,
  onChange,
}: ApprovalRouteConditionsEditorProps) {
  const { t } = useLanguage();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categoryTypes, setCategoryTypes] = useState<CategoryType[]>([]);

  useEffect(() => {
    getActiveDepartments().then((res) => {
      if (res.data) setDepartments(res.data);
    });
    getActiveCategoryTypes().then((res) => {
      if (res.data) setCategoryTypes(res.data);
    });
  }, []);

  const FIELD_LABELS: Record<ConditionField, string> = useMemo(() => ({
    department: t("approvalRoute.conditions.department"),
    amount: t("approvalRoute.conditions.amount"),
    category: t("approvalRoute.conditions.category"),
    category_type: "Category Type",
  }), [t]);

  const getFieldOptionsForRow = (group: ConditionGroup, rowId?: string) => {
    const available = getAvailableFields(group, rowId);
    return available.map((f) => ({ value: f, label: FIELD_LABELS[f] }));
  };

  // Get the selected parent category from a group (for filtering category types)
  const getGroupCategory = (group: ConditionGroup): string | null => {
    const catRow = group.rows.find((r) => r.field === "category" && r.value);
    return catRow?.value ?? null;
  };

  const OPERATOR_OPTIONS = useMemo<
    Record<ConditionField, { value: ConditionOperator; label: string }[]>
  >(
    () => ({
      department: [
        { value: "is", label: t("approvalRoute.conditions.is") },
        { value: "is_not", label: t("approvalRoute.conditions.isNot") },
      ],
      amount: [
        { value: "is_greater_than", label: t("approvalRoute.conditions.isGreaterThan") },
        { value: "is_greater_than_or_equal", label: t("approvalRoute.conditions.isGreaterThanOrEqual") },
        { value: "is_less_than", label: t("approvalRoute.conditions.isLessThan") },
        { value: "is_less_than_or_equal", label: t("approvalRoute.conditions.isLessThanOrEqual") },
      ],
      category: [
        { value: "is", label: t("approvalRoute.conditions.is") },
        { value: "is_not", label: t("approvalRoute.conditions.isNot") },
      ],
      category_type: [
        { value: "is", label: t("approvalRoute.conditions.is") },
        { value: "is_not", label: t("approvalRoute.conditions.isNot") },
      ],
    }),
    [t],
  );

  const CATEGORY_OPTIONS = useMemo<{ value: ApprovalRouteCategory; label: string }[]>(
    () => [
      { value: "purchasing", label: t("approvalRoute.conditions.purchasing") },
      { value: "contracts", label: t("approvalRoute.conditions.contracts") },
      { value: "expenses", label: t("approvalRoute.conditions.expenses") },
      { value: "other", label: t("approvalRoute.conditions.other") },
    ],
    [t],
  );

  const addGroup = () => {
    onChange([
      ...groups,
      { id: newId(), rows: [{ id: newId(), field: "department", operator: "is", value: "" }] },
    ]);
  };

  const removeGroup = (groupId: string) => {
    onChange(groups.filter((g) => g.id !== groupId));
  };

  const addRowToGroup = (groupId: string) => {
    onChange(
      groups.map((g) => {
        if (g.id !== groupId) return g;
        const available = getAvailableFields(g);
        if (available.length === 0) return g;
        const field = available[0];
        return {
          ...g,
          rows: [...g.rows, { id: newId(), field, operator: getDefaultOperator(field), value: "" }],
        };
      })
    );
  };

  const removeRow = (groupId: string, rowId: string) => {
    onChange(
      groups
        .map((g) => {
          if (g.id !== groupId) return g;
          const removedRow = g.rows.find((r) => r.id === rowId);
          let remaining = g.rows.filter((r) => r.id !== rowId);

          // If removing a category row, also reset category_type rows
          if (removedRow?.field === "category") {
            remaining = remaining.map((r) =>
              r.field === "category_type" ? { ...r, value: "" } : r
            );
          }

          return { ...g, rows: remaining };
        })
        .filter((g) => g.rows.length > 0)
    );
  };

  const updateRow = (groupId: string, rowId: string, updates: Partial<ConditionRow>) => {
    onChange(
      groups.map((g) => {
        if (g.id !== groupId) return g;

        const targetRow = g.rows.find((r) => r.id === rowId);
        const isCategoryRowChanging =
          targetRow?.field === "category" &&
          (updates.field !== undefined || updates.value !== undefined);

        let updatedRows = g.rows.map((r) => {
          if (r.id !== rowId) return r;
          const updated = { ...r, ...updates };
          if (updates.field && updates.field !== r.field) {
            updated.operator = getDefaultOperator(updates.field);
            updated.value = "";
          }
          return updated;
        });

        // If the category row changed field or value, reset all category_type rows in this group
        if (isCategoryRowChanging) {
          updatedRows = updatedRows.map((r) =>
            r.field === "category_type" ? { ...r, value: "" } : r
          );
        }

        return { ...g, rows: updatedRows };
      })
    );
  };

  const renderRow = (group: ConditionGroup, row: ConditionRow, index: number) => {
    const fieldOptions = getFieldOptionsForRow(group, row.id);
    // Always include the current row's field so it shows in the dropdown
    if (!fieldOptions.some((o) => o.value === row.field)) {
      fieldOptions.unshift({ value: row.field, label: FIELD_LABELS[row.field] });
    }
    const parentCategory = getGroupCategory(group);
    const filteredCategoryTypes = parentCategory
      ? categoryTypes.filter((ct) => ct.category === parentCategory)
      : categoryTypes;

    return (
    <div
      key={row.id}
      className="flex items-center gap-2"
    >
      <span className="text-sm font-semibold w-8 shrink-0">
        {index === 0 ? "If" : "And"}
      </span>

      {/* Field */}
      <Select
        value={row.field}
        onValueChange={(val) => updateRow(group.id, row.id, { field: val as ConditionField })}
      >
        <SelectTrigger className="w-[170px] h-[45px] rounded-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContentScrollable>
          {fieldOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContentScrollable>
      </Select>

      {/* Operator */}
      <Select
        value={row.operator}
        onValueChange={(val) => updateRow(group.id, row.id, { operator: val as ConditionOperator })}
      >
        <SelectTrigger className="w-[170px] h-[45px] rounded-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContentScrollable>
          {(row.field === "amount"
            ? OPERATOR_OPTIONS.amount.filter((opt) =>
                getAvailableAmountOperators(group, row.id).includes(opt.value) || opt.value === row.operator
              )
            : OPERATOR_OPTIONS[row.field]
          ).map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContentScrollable>
      </Select>

      {/* Value */}
      {row.field === "category" ? (
        <Select value={row.value} onValueChange={(val) => updateRow(group.id, row.id, { value: val })}>
          <SelectTrigger className="w-[170px] h-[45px] rounded-lg">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContentScrollable>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContentScrollable>
        </Select>
      ) : row.field === "category_type" ? (
        <Select value={row.value} onValueChange={(val) => updateRow(group.id, row.id, { value: val })}>
          <SelectTrigger className="w-[170px] h-[45px] rounded-lg">
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContentScrollable>
            {filteredCategoryTypes.map((ct) => (
              <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>
            ))}
          </SelectContentScrollable>
        </Select>
      ) : row.field === "amount" ? (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
          <Input
            type="number"
            min={0}
            value={row.value}
            onChange={(e) => updateRow(group.id, row.id, { value: e.target.value })}
            className="pl-7 w-[170px] h-[45px] rounded-lg"
            placeholder="0"
          />
        </div>
      ) : (
        <Select value={row.value} onValueChange={(val) => updateRow(group.id, row.id, { value: val })}>
          <SelectTrigger className="w-[170px] h-[45px] rounded-lg">
            <SelectValue placeholder={t("approvalRoute.conditions.deptPlaceholder")} />
          </SelectTrigger>
          <SelectContentScrollable>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
            ))}
          </SelectContentScrollable>
        </Select>
      )}

      {/* Remove row */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => removeRow(group.id, row.id)}
      >
        <IconMinus className="size-4" />
      </Button>
    </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold">{t("approvalRoute.conditions.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("approvalRoute.conditions.subtitle")}
          </p>
        </div>
        <Button type="button" className="h-[45px] px-5 rounded-lg" onClick={addGroup}>
          <IconPlus className="size-4 mr-1.5" />
          Add Group
        </Button>
      </div>

      {/* Groups */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed rounded-lg text-muted-foreground">
          <IconFilter className="size-8 opacity-40" />
          <p className="text-sm">{t("approvalRoute.conditions.noConditions")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group, groupIndex) => (
            <div key={group.id}>
              {/* OR separator between groups */}
              {groupIndex > 0 && (
                <div className="flex items-center justify-center py-2">
                  <div className="flex-1 border-t border-dashed" />
                  <span className="px-4 text-sm font-bold text-orange-500 bg-white">OR</span>
                  <div className="flex-1 border-t border-dashed" />
                </div>
              )}

              {/* Group card */}
              <div className="border rounded-lg p-4">
                {/* Group header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Group {groupIndex + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    {getAvailableFields(group).length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-sky-500 hover:text-sky-600"
                        onClick={() => addRowToGroup(group.id)}
                      >
                        <IconPlus className="size-3 mr-1" />
                        Add Condition
                      </Button>
                    )}
                    {groups.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeGroup(group.id)}
                      >
                        <IconX className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Rows (AND within group) */}
                <div className="flex flex-col gap-2">
                  {group.rows.map((row, rowIndex) => renderRow(group, row, rowIndex))}
                </div>

                {/* Amount range warning */}
                {(() => {
                  const warning = getAmountRangeWarning(group);
                  if (!warning) return null;
                  return (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                      <IconAlertTriangle className="size-4 shrink-0" />
                      <span>
                        {warning === "impossible"
                          ? t("approvalRoute.conditions.warning.impossible")
                          : t("approvalRoute.conditions.warning.exactMatch")}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
