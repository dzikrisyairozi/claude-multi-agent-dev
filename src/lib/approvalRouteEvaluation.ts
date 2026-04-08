/**
 * Pure evaluation functions for approval route condition matching.
 * Extracted from server action for testability.
 */

import { ApprovalRouteCondition } from "@/types/approvalRoute";

/**
 * Evaluate a single condition group (AND logic within group).
 * Returns { matches, score } where score = number of matched conditions.
 */
export function evaluateGroup(
  conditions: ApprovalRouteCondition,
  category?: string | null,
  department?: string | null,
  amount?: number | null,
  categoryTypeId?: string | null
): { matches: boolean; score: number } {
  let matches = true;
  let score = 0;

  // Check categories
  if (conditions.categories && conditions.categories.length > 0) {
    if (!category || !conditions.categories.includes(category as never)) {
      matches = false;
    } else {
      score++;
    }
  }

  // Check departments
  if (conditions.departments && conditions.departments.length > 0) {
    if (!department || !conditions.departments.includes(department)) {
      matches = false;
    } else {
      score++;
    }
  }

  // Check min_amount (> or >=)
  if (conditions.min_amount != null) {
    const pass = conditions.min_amount_inclusive
      ? amount != null && amount >= conditions.min_amount
      : amount != null && amount > conditions.min_amount;
    if (!pass) {
      matches = false;
    } else {
      score++;
    }
  }

  // Check max_amount (< or <=)
  if (conditions.max_amount != null) {
    const pass = conditions.max_amount_inclusive
      ? amount != null && amount <= conditions.max_amount
      : amount != null && amount < conditions.max_amount;
    if (!pass) {
      matches = false;
    } else {
      score++;
    }
  }

  // Check category_type_ids
  if (conditions.category_type_ids && conditions.category_type_ids.length > 0) {
    if (!categoryTypeId || !conditions.category_type_ids.includes(categoryTypeId)) {
      matches = false;
    } else {
      score++;
    }
  }

  return { matches, score };
}

/**
 * Evaluate route conditions supporting both flat and group-based formats.
 * - Flat: single condition object → AND
 * - Groups: { groups: [...] } → OR between groups, AND within
 */
export function evaluateRouteConditions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conditions: any,
  category?: string | null,
  department?: string | null,
  amount?: number | null,
  categoryTypeId?: string | null
): { matches: boolean; score: number } {
  if (!conditions || Object.keys(conditions).length === 0) {
    // No conditions = matches everything with score 0
    return { matches: true, score: 0 };
  }

  // Group-based format: { groups: [...] }
  if (conditions.groups && Array.isArray(conditions.groups)) {
    let bestScore = -1;
    let anyMatch = false;

    for (const group of conditions.groups) {
      const result = evaluateGroup(group, category, department, amount, categoryTypeId);
      if (result.matches) {
        anyMatch = true;
        if (result.score > bestScore) bestScore = result.score;
      }
    }

    // OR logic: any group matching is sufficient
    return { matches: anyMatch, score: bestScore >= 0 ? bestScore : 0 };
  }

  // Flat format: single condition object (AND)
  return evaluateGroup(conditions as ApprovalRouteCondition, category, department, amount, categoryTypeId);
}
