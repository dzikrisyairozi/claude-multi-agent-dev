"use server";

import { supabaseServer } from "@/integrations/supabase/server";
import { logActivity } from "@/service/activityLog/activityLog";
import { ActivityAction } from "@/types/activityLog";
import { ApprovalRoute } from "@/types/approvalRoute";
import { ApprovalRequestStepApproval } from "@/types/approvalRequest";
import { SupabaseClient } from "@supabase/supabase-js";
import { evaluateRouteConditions } from "@/lib/approvalRouteEvaluation";
import { notifyStepApprovers } from "@/service/approvalRequest/approvalRequest";

// ---------------------------------------------------------------------------
// Route matching
// ---------------------------------------------------------------------------

/**
 * Find the best matching active approval route based on request attributes.
 * Supports AND/OR condition groups and category_type matching.
 */
export async function matchApprovalRoute(
  category?: string | null,
  department?: string | null,
  amount?: number | null,
  categoryTypeId?: string | null
): Promise<{ data: ApprovalRoute | null; error: string | null }> {
  try {
    const supabase = await supabaseServer();

    const { data: routes, error } = await supabase
      .from("approval_routes")
      .select(
        `
        *,
        steps:approval_route_steps(
          *,
          assignees:approval_route_step_assignees(user_id)
        )
      `
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    if (!routes || routes.length === 0) return { data: null, error: null };

    let bestMatch: ApprovalRoute | null = null;
    let bestScore = -1;
    let bestWeight = -1;

    for (const route of routes) {
      const result = evaluateRouteConditions(
        route.conditions,
        category,
        department,
        amount,
        categoryTypeId
      );

      const routeWeight = route.weight ?? 50;

      if (
        result.matches &&
        (result.score > bestScore ||
          (result.score === bestScore && routeWeight > bestWeight))
      ) {
        bestScore = result.score;
        bestWeight = routeWeight;
        bestMatch = {
          ...route,
          condition_logic: route.condition_logic ?? "and",
          weight: routeWeight,
          steps: (route.steps ?? []).sort(
            (a: { step_order: number }, b: { step_order: number }) =>
              a.step_order - b.step_order
          ),
        } as ApprovalRoute;
      }
    }

    return { data: bestMatch, error: null };
  } catch (error) {
    console.error("matchApprovalRoute failed", error);
    return { data: null, error: "Failed to match approval route" };
  }
}

// ---------------------------------------------------------------------------
// Step snapshot
// ---------------------------------------------------------------------------

/**
 * Snapshot route steps into approval_request_step_approvals.
 * Also copies multi-assignees into approval_request_step_assignees.
 * Called when a request is submitted (status changes to "pending").
 */
export async function snapshotRouteSteps(
  supabase: SupabaseClient,
  requestId: string,
  route: ApprovalRoute,
  skipToStep?: number,
): Promise<{ error: string | null }> {
  try {
    // Delete any existing step approvals (cascade deletes assignees too)
    await supabase
      .from("approval_request_step_approvals")
      .delete()
      .eq("approval_request_id", requestId);

    if (route.steps.length === 0) {
      // Update route_id even with no steps
      await supabase
        .from("approval_requests")
        .update({ route_id: route.id, current_step_order: null })
        .eq("id", requestId);
      return { error: null };
    }

    // Insert step approval rows and get back IDs
    // If skipToStep is provided, auto-approve steps before it (prior approvals preserved on resubmit)
    const stepsToInsert = route.steps.map((step) => ({
      approval_request_id: requestId,
      step_order: step.step_order,
      step_name: step.name,
      approver_role: step.approver_role ?? null,
      approver_user_id: step.approver_user_id ?? null,
      approver_position_id: step.approver_position_id ?? null,
      approver_department_id: step.approver_department_id ?? null,
      is_required: step.is_required,
      status: skipToStep && step.step_order < skipToStep ? "approved" : "pending",
      acted_at: skipToStep && step.step_order < skipToStep ? new Date().toISOString() : null,
    }));

    const { data: insertedSteps, error: insertError } = await supabase
      .from("approval_request_step_approvals")
      .insert(stepsToInsert)
      .select("id, step_order");

    if (insertError) return { error: insertError.message };

    // Copy multi-assignees for each step
    if (insertedSteps && insertedSteps.length > 0) {
      const assigneesToInsert: { step_approval_id: string; user_id: string }[] = [];

      for (const step of route.steps) {
        const assignees = step.assignees;
        if (!assignees || assignees.length === 0) continue;

        const matchedStepApproval = insertedSteps.find(
          (s) => s.step_order === step.step_order
        );
        if (!matchedStepApproval) continue;

        for (const assignee of assignees) {
          assigneesToInsert.push({
            step_approval_id: matchedStepApproval.id,
            user_id: assignee.user_id,
          });
        }
      }

      if (assigneesToInsert.length > 0) {
        const { error: assigneeError } = await supabase
          .from("approval_request_step_assignees")
          .insert(assigneesToInsert);

        if (assigneeError) {
          console.error("Failed to insert step assignees:", assigneeError);
        }
      }
    }

    // Update the request with route_id and current_step_order
    const { error: updateError } = await supabase
      .from("approval_requests")
      .update({
        route_id: route.id,
        current_step_order:
          skipToStep && route.steps.some((s) => s.step_order === skipToStep)
            ? skipToStep
            : 1,
      })
      .eq("id", requestId);

    if (updateError) return { error: updateError.message };

    return { error: null };
  } catch (error) {
    console.error("snapshotRouteSteps failed", error);
    return { error: "Failed to snapshot route steps" };
  }
}

// ---------------------------------------------------------------------------
// Step approval processing
// ---------------------------------------------------------------------------

/**
 * Process a step approval/rejection/revision for a multi-step workflow.
 * Updates both the step approval record and the request status.
 */
export async function processStepApproval(
  requestId: string,
  userId: string,
  action: "approved" | "rejected" | "need_revision",
  notes?: string,
  restartFromFirst?: boolean
): Promise<{
  data: { status: string; current_step_order: number | null } | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();

    // Fetch the request to get current_step_order
    const { data: request, error: reqError } = await supabase
      .from("approval_requests")
      .select("id, title, current_step_order, route_id")
      .eq("id", requestId)
      .single();

    if (reqError || !request) {
      return { data: null, error: "Approval request not found" };
    }

    const currentStepOrder = request.current_step_order;
    if (currentStepOrder == null) {
      return { data: null, error: "No active step to process" };
    }

    // Fetch all step approvals for this request
    const { data: steps, error: stepsError } = await supabase
      .from("approval_request_step_approvals")
      .select("*")
      .eq("approval_request_id", requestId)
      .order("step_order", { ascending: true });

    if (stepsError || !steps || steps.length === 0) {
      return { data: null, error: "No step approvals found" };
    }

    const currentStep = steps.find(
      (s) => s.step_order === currentStepOrder
    );
    if (!currentStep) {
      return { data: null, error: "Current step not found" };
    }

    // Guard: only process if step is still pending (prevents race condition)
    if (currentStep.status !== "pending") {
      return { data: null, error: "Step has already been processed" };
    }

    if (action === "approved") {
      // Mark current step as approved
      const { error: stepUpdateError } = await supabase
        .from("approval_request_step_approvals")
        .update({
          status: "approved",
          acted_by: userId,
          acted_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq("id", currentStep.id)
        .eq("status", "pending"); // atomic guard

      if (stepUpdateError) {
        return { data: null, error: stepUpdateError.message };
      }

      // Find next required step
      const remainingSteps = steps.filter(
        (s) => s.step_order > currentStepOrder
      );

      let nextStep = null;
      for (const step of remainingSteps) {
        if (step.is_required) {
          nextStep = step;
          break;
        } else {
          // Auto-skip non-required step
          await supabase
            .from("approval_request_step_approvals")
            .update({
              status: "skipped",
              acted_at: new Date().toISOString(),
            })
            .eq("id", step.id);
        }
      }

      if (nextStep) {
        const { error: advanceError } = await supabase
          .from("approval_requests")
          .update({ current_step_order: nextStep.step_order })
          .eq("id", requestId);

        if (advanceError) return { data: null, error: advanceError.message };

        logActivity(supabase, userId, {
          action: "submission_step_approve" as ActivityAction,
          entity_type: "submission",
          entity_id: requestId,
          entity_name: request.title || `Request #${requestId.slice(0, 8)}`,
          new_values: {
            step_order: currentStepOrder,
            step_name: currentStep.step_name,
          },
        });

        // Notify next step's approvers (including multi-assignees)
        const requestTitle = request.title || `Request #${requestId.slice(0, 8)}`;
        const { data: assigneeRows } = await supabase
          .from("approval_request_step_assignees")
          .select("user_id")
          .eq("step_approval_id", nextStep.id);
        const stepAssignees = assigneeRows?.map((a) => a.user_id) ?? [];

        notifyStepApprovers(supabase, {
          stepApproverRole: nextStep.approver_role,
          stepApproverUserId: nextStep.approver_user_id,
          stepAssignees,
          excludeUserId: userId,
          actorId: userId,
          approvalRequestId: requestId,
          title: "Pending Approval",
          message: `${requestTitle} is awaiting your approval (Step ${nextStep.step_order}).`,
          stepOrder: nextStep.step_order,
        });

        return {
          data: {
            status: "pending",
            current_step_order: nextStep.step_order,
          },
          error: null,
        };
      } else {
        // Last step approved — mark request as approved
        const { error: approveError } = await supabase
          .from("approval_requests")
          .update({
            status: "approved",
            approved_by: userId,
            current_step_order: currentStepOrder,
            approval_notes: notes || null,
          })
          .eq("id", requestId);

        if (approveError) return { data: null, error: approveError.message };

        logActivity(supabase, userId, {
          action: "submission_approve",
          entity_type: "submission",
          entity_id: requestId,
          entity_name: request.title || `Request #${requestId.slice(0, 8)}`,
          new_values: {
            status: "approved",
            step_order: currentStepOrder,
            step_name: currentStep.step_name,
          },
        });

        return {
          data: { status: "approved", current_step_order: currentStepOrder },
          error: null,
        };
      }
    } else if (action === "rejected") {
      await supabase
        .from("approval_request_step_approvals")
        .update({
          status: "rejected",
          acted_by: userId,
          acted_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq("id", currentStep.id);

      const { error: rejectError } = await supabase
        .from("approval_requests")
        .update({
          status: "rejected",
          rejected_by: userId,
          approval_notes: notes || null,
          current_step_order: currentStepOrder,
        })
        .eq("id", requestId);

      if (rejectError) return { data: null, error: rejectError.message };

      logActivity(supabase, userId, {
        action: "submission_reject",
        entity_type: "submission",
        entity_id: requestId,
        entity_name: request.title || `Request #${requestId.slice(0, 8)}`,
        new_values: {
          status: "rejected",
          step_order: currentStepOrder,
          step_name: currentStep.step_name,
        },
      });

      return {
        data: { status: "rejected", current_step_order: currentStepOrder },
        error: null,
      };
    } else if (action === "need_revision") {
      // Mark current step as rejected with notes
      await supabase
        .from("approval_request_step_approvals")
        .update({
          status: "rejected",
          acted_by: userId,
          acted_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq("id", currentStep.id);

      const reentryStepOrder = restartFromFirst ? 1 : currentStepOrder;

      if (restartFromFirst) {
        // Reset ALL steps to pending
        await supabase
          .from("approval_request_step_approvals")
          .update({
            status: "pending",
            acted_by: null,
            acted_at: null,
            notes: null,
          })
          .eq("approval_request_id", requestId);
      } else {
        // Default: only reset from current step onward, keep earlier approvals
        await supabase
          .from("approval_request_step_approvals")
          .update({
            status: "pending",
            acted_by: null,
            acted_at: null,
            notes: null,
          })
          .eq("approval_request_id", requestId)
          .gte("step_order", currentStepOrder);
      }

      const { error: revisionError } = await supabase
        .from("approval_requests")
        .update({
          status: "need_revision",
          approval_notes: notes || null,
          current_step_order: reentryStepOrder,
          revision_source_step_order: currentStepOrder,
          revision_restart_from_first: !!restartFromFirst,
        })
        .eq("id", requestId);

      if (revisionError) return { data: null, error: revisionError.message };

      logActivity(supabase, userId, {
        action: "submission_need_revision",
        entity_type: "submission",
        entity_id: requestId,
        entity_name: request.title || `Request #${requestId.slice(0, 8)}`,
        new_values: {
          status: "need_revision",
          step_order: currentStepOrder,
          step_name: currentStep.step_name,
          approval_notes: notes || null,
        },
        metadata: {
          notes: notes || null,
          restart_from_first: !!restartFromFirst,
          reentry_step_order: reentryStepOrder,
        },
      });

      return {
        data: { status: "need_revision", current_step_order: reentryStepOrder },
        error: null,
      };
    }

    return { data: null, error: "Invalid action" };
  } catch (error) {
    console.error("processStepApproval failed", error);
    return { data: null, error: "Failed to process step approval" };
  }
}

// ---------------------------------------------------------------------------
// Authorization check
// ---------------------------------------------------------------------------

/**
 * Check if a user can approve the current step of a request.
 * Checks all assignment types: direct user, role, position+department, multi-assignee.
 */
export async function canUserApproveCurrentStep(
  requestId: string,
  userId: string
): Promise<{ canApprove: boolean; currentStep: ApprovalRequestStepApproval | null; error: string | null }> {
  try {
    const supabase = await supabaseServer();

    // Fetch the request
    const { data: request, error: reqError } = await supabase
      .from("approval_requests")
      .select("current_step_order, status")
      .eq("id", requestId)
      .single();

    if (reqError || !request) {
      return { canApprove: false, currentStep: null, error: "Request not found" };
    }

    // Only pending requests can be approved
    if (request.status !== "pending") {
      return { canApprove: false, currentStep: null, error: null };
    }

    if (request.current_step_order == null) {
      return { canApprove: false, currentStep: null, error: null };
    }

    // Fetch current step
    const { data: step, error: stepError } = await supabase
      .from("approval_request_step_approvals")
      .select("*")
      .eq("approval_request_id", requestId)
      .eq("step_order", request.current_step_order)
      .single();

    if (stepError || !step) {
      return { canApprove: false, currentStep: null, error: "Current step not found" };
    }

    // Fetch user profile (role, position, department in one query)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, position_id, department_id")
      .eq("id", userId)
      .single();

    // Platform admins and admins can always approve
    if (profile?.role === "platform_admin" || profile?.role === "admin") {
      return { canApprove: true, currentStep: step as ApprovalRequestStepApproval, error: null };
    }

    // Check all assignment types with OR logic
    const isDirectUser = step.approver_user_id === userId;

    const isRoleMatch = !!(step.approver_role && profile?.role && step.approver_role === profile.role);

    const isPositionMatch = !!(
      step.approver_position_id &&
      profile?.position_id &&
      step.approver_position_id === profile.position_id &&
      (!step.approver_department_id || step.approver_department_id === profile.department_id)
    );

    // Check multi-assignee list
    let isMultiAssignee = false;
    const { data: assigneeMatch } = await supabase
      .from("approval_request_step_assignees")
      .select("id")
      .eq("step_approval_id", step.id)
      .eq("user_id", userId)
      .limit(1);

    if (assigneeMatch && assigneeMatch.length > 0) {
      isMultiAssignee = true;
    }

    return {
      canApprove: isDirectUser || isRoleMatch || isPositionMatch || isMultiAssignee,
      currentStep: step as ApprovalRequestStepApproval,
      error: null,
    };
  } catch (error) {
    console.error("canUserApproveCurrentStep failed", error);
    return { canApprove: false, currentStep: null, error: "Failed to check approval permission" };
  }
}
