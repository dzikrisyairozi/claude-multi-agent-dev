"use server";

import { supabaseServer } from "@/integrations/supabase/server";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { processStepApproval } from "./approvalRouteMatching";
import { createNotification, completeNotificationAction } from "@/service/notification/notification";
import { logActivity } from "@/service/activityLog/activityLog";
import type { ActivityAction } from "@/types/activityLog";
import type {
  EscalationInfo,
  AvailableApprover,
  ProxyApproveParams,
  ReassignApproverParams,
} from "@/types/escalation";

// ---------------------------------------------------------------------------
// Proxy Approve
// ---------------------------------------------------------------------------

export async function proxyApproveSubmission(
  params: ProxyApproveParams
): Promise<{ data: { status: string } | null; error: string | null }> {
  try {
    const supabase = await supabaseServer();

    // Auth check
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: "Unauthorized" };
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, first_name, last_name")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "platform_admin"].includes(profile.role)) {
      return { data: null, error: "Only admins can proxy approve" };
    }

    // Get current step info before approval (for logging)
    const { data: request } = await supabase
      .from("approval_requests")
      .select("id, title, current_step_order")
      .eq("id", params.requestId)
      .single();

    if (!request || request.current_step_order == null) {
      return { data: null, error: "Request not found or no active step" };
    }

    // Get current step details (original assignee info)
    const { data: currentStep } = await supabase
      .from("approval_request_step_approvals")
      .select("id, step_name, approver_user_id, step_order")
      .eq("approval_request_id", params.requestId)
      .eq("step_order", request.current_step_order)
      .single();

    if (!currentStep) {
      return { data: null, error: "Current step not found" };
    }

    // Process the approval using existing flow
    const result = await processStepApproval(
      params.requestId,
      user.id,
      "approved",
      params.comment
    );

    if (result.error) {
      return { data: null, error: result.error };
    }

    // Mark step with proxy_approved_by
    await supabase
      .from("approval_request_step_approvals")
      .update({ proxy_approved_by: user.id })
      .eq("id", currentStep.id);

    // Reset escalation flag if it was escalated
    await supabase
      .from("approval_requests")
      .update({ is_escalated: false })
      .eq("id", params.requestId)
      .eq("is_escalated", true);

    // Log activity with proxy approver label
    logActivity(supabase, user.id, {
      action: "submission_proxy_approve" as ActivityAction,
      entity_type: "submission",
      entity_id: params.requestId,
      entity_name: request.title,
      new_values: {
        step_order: currentStep.step_order,
        step_name: currentStep.step_name,
        proxy_approved_by: `${profile.first_name} ${profile.last_name}`,
        original_assignee_id: currentStep.approver_user_id,
        comment: params.comment,
      },
    });

    // Complete escalation notifications for this request
    completeNotificationAction(params.requestId);

    return { data: { status: result.data?.status || "approved" }, error: null };
  } catch (error) {
    console.error("proxyApproveSubmission failed:", error);
    return { data: null, error: "Failed to proxy approve submission" };
  }
}

// ---------------------------------------------------------------------------
// Re-assign Approver
// ---------------------------------------------------------------------------

export async function reassignApprover(
  params: ReassignApproverParams
): Promise<{ data: { success: boolean } | null; error: string | null }> {
  try {
    const supabase = await supabaseServer();

    // Auth check
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: "Unauthorized" };
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, first_name, last_name")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "platform_admin"].includes(profile.role)) {
      return { data: null, error: "Only admins can reassign approvers" };
    }

    // Get request info
    const { data: request } = await supabase
      .from("approval_requests")
      .select("id, title, current_step_order")
      .eq("id", params.requestId)
      .single();

    if (!request || request.current_step_order == null) {
      return { data: null, error: "Request not found or no active step" };
    }

    // Get current step
    const { data: currentStep } = await supabase
      .from("approval_request_step_approvals")
      .select("id, step_name, step_order, approver_user_id")
      .eq("approval_request_id", params.requestId)
      .eq("step_order", request.current_step_order)
      .single();

    if (!currentStep) {
      return { data: null, error: "Current step not found" };
    }

    const previousAssigneeId = currentStep.approver_user_id;

    // Update step assignee
    const { error: updateError } = await supabase
      .from("approval_request_step_approvals")
      .update({
        approver_user_id: params.newUserId,
        reassigned_from_user_id: previousAssigneeId,
      })
      .eq("id", currentStep.id);

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    // Also update multi-assignee junction if exists — replace old with new
    if (previousAssigneeId) {
      await supabase
        .from("approval_request_step_assignees")
        .delete()
        .eq("step_approval_id", currentStep.id)
        .eq("user_id", previousAssigneeId);
    }

    await supabase
      .from("approval_request_step_assignees")
      .upsert(
        { step_approval_id: currentStep.id, user_id: params.newUserId },
        { onConflict: "step_approval_id,user_id" }
      );

    // Reset escalation flag
    await supabase
      .from("approval_requests")
      .update({ is_escalated: false })
      .eq("id", params.requestId)
      .eq("is_escalated", true);

    // Notify the new assignee
    createNotification(supabase, {
      recipient_id: params.newUserId,
      actor_id: user.id,
      type: "proxy_delegated",
      title: "Approval Re-assigned",
      message: `${request.title} has been re-assigned to you for approval at Step ${currentStep.step_order} (${currentStep.step_name}).`,
      approval_request_id: params.requestId,
      requires_action: true,
      step_order: currentStep.step_order,
    });

    // Complete old notifications for this step
    completeNotificationAction(params.requestId, currentStep.step_order);

    // Get previous assignee name for logging
    let previousAssigneeName = "Unknown";
    if (previousAssigneeId) {
      const { data: prevUser } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", previousAssigneeId)
        .single();
      if (prevUser) {
        previousAssigneeName = `${prevUser.first_name} ${prevUser.last_name}`;
      }
    }

    // Get new assignee name for logging
    const { data: newUser } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", params.newUserId)
      .single();

    const newAssigneeName = newUser
      ? `${newUser.first_name} ${newUser.last_name}`
      : "Unknown";

    // Log activity
    logActivity(supabase, user.id, {
      action: "submission_reassign_approver" as ActivityAction,
      entity_type: "submission",
      entity_id: params.requestId,
      entity_name: request.title,
      old_values: {
        approver_user_id: previousAssigneeId,
        approver_name: previousAssigneeName,
      },
      new_values: {
        approver_user_id: params.newUserId,
        approver_name: newAssigneeName,
        step_order: currentStep.step_order,
        step_name: currentStep.step_name,
        reason: params.reason,
        performed_by: `${profile.first_name} ${profile.last_name}`,
      },
    });

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error("reassignApprover failed:", error);
    return { data: null, error: "Failed to reassign approver" };
  }
}

// ---------------------------------------------------------------------------
// Get Escalation Info
// ---------------------------------------------------------------------------

export async function getEscalationInfo(
  requestId: string
): Promise<{ data: EscalationInfo | null; error: string | null }> {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: "Unauthorized" };
    }

    const { data: request, error: reqError } = await supabase
      .from("approval_requests")
      .select(
        `id, title, current_step_order, escalated_at, amount, vendor_name, category, priority, category_type_id`
      )
      .eq("id", requestId)
      .single();

    if (reqError || !request) {
      return { data: null, error: "Request not found" };
    }

    // Get category type name if exists
    let categoryTypeName: string | null = null;
    if (request.category_type_id) {
      const { data: catType } = await supabase
        .from("category_types")
        .select("name")
        .eq("id", request.category_type_id)
        .single();
      categoryTypeName = catType?.name ?? null;
    }

    // Get current step with assignee info
    const { data: step } = await supabase
      .from("approval_request_step_approvals")
      .select("step_order, step_name, approver_user_id")
      .eq("approval_request_id", requestId)
      .eq("step_order", request.current_step_order)
      .single();

    // Get original assignee profile
    let originalAssignee = null;
    if (step?.approver_user_id) {
      const { data: assigneeProfile } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, role")
        .eq("id", step.approver_user_id)
        .single();
      originalAssignee = assigneeProfile
        ? {
            id: assigneeProfile.id,
            firstName: assigneeProfile.first_name,
            lastName: assigneeProfile.last_name,
            email: assigneeProfile.email,
            role: assigneeProfile.role,
          }
        : null;
    }

    // Generate request code from ID
    const requestCode = `REQ-${request.id.slice(0, 5).toUpperCase()}`;

    return {
      data: {
        requestId: request.id,
        requestTitle: request.title,
        requestCode,
        currentStepOrder: step?.step_order ?? 0,
        currentStepName: step?.step_name ?? "",
        originalAssignee,
        escalatedAt: request.escalated_at,
        categoryTypeName,
        amount: request.amount,
        vendorName: request.vendor_name,
        category: request.category,
        priority: request.priority,
      },
      error: null,
    };
  } catch (error) {
    console.error("getEscalationInfo failed:", error);
    return { data: null, error: "Failed to get escalation info" };
  }
}

// ---------------------------------------------------------------------------
// Get Available Approvers for Re-assignment
// ---------------------------------------------------------------------------

export async function getAvailableApprovers(
  requestId: string
): Promise<{ data: AvailableApprover[] | null; error: string | null }> {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: "Unauthorized" };
    }

    // Get current step's assignee (to exclude from list)
    const { data: request } = await supabase
      .from("approval_requests")
      .select("current_step_order, user_id")
      .eq("id", requestId)
      .single();

    let excludeUserId: string | null = null;
    if (request?.current_step_order) {
      const { data: step } = await supabase
        .from("approval_request_step_approvals")
        .select("approver_user_id")
        .eq("approval_request_id", requestId)
        .eq("step_order", request.current_step_order)
        .single();
      excludeUserId = step?.approver_user_id ?? null;
    }

    // Get all active users (exclude current assignee and requester)
    const query = supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role")
      .eq("is_active", true)
      .order("first_name", { ascending: true });

    const { data: users, error: usersError } = await query;
    if (usersError) return { data: null, error: usersError.message };

    // Filter out current assignee and requester
    const filtered = (users || []).filter(
      (u) => u.id !== excludeUserId && u.id !== request?.user_id
    );

    // Count pending submissions per user (as assignee)
    const approvers: AvailableApprover[] = await Promise.all(
      filtered.map(async (u) => {
        const { count } = await supabase
          .from("approval_request_step_approvals")
          .select("id", { count: "exact", head: true })
          .eq("approver_user_id", u.id)
          .eq("status", "pending");

        return {
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          email: u.email,
          role: u.role,
          pendingCount: count ?? 0,
        };
      })
    );

    return { data: approvers, error: null };
  } catch (error) {
    console.error("getAvailableApprovers failed:", error);
    return { data: null, error: "Failed to get available approvers" };
  }
}

// ---------------------------------------------------------------------------
// Cron: Check and escalate overdue submissions
// ---------------------------------------------------------------------------

export async function checkAndEscalateOverdueSubmissions(): Promise<{
  escalated: number;
  error: string | null;
}> {
  try {
    // Find pending submissions past target date, not yet escalated
    const { data: overdueRequests, error: queryError } = await supabaseAdmin
      .from("approval_requests")
      .select("id, title, user_id, current_step_order")
      .eq("status", "pending")
      .eq("is_escalated", false)
      .not("date", "is", null)
      .lt("date", new Date().toISOString().split("T")[0]); // Compare date only

    if (queryError) {
      return { escalated: 0, error: queryError.message };
    }

    if (!overdueRequests || overdueRequests.length === 0) {
      return { escalated: 0, error: null };
    }

    // Mark all as escalated
    const ids = overdueRequests.map((r) => r.id);
    const { error: updateError } = await supabaseAdmin
      .from("approval_requests")
      .update({
        is_escalated: true,
        escalated_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (updateError) {
      return { escalated: 0, error: updateError.message };
    }

    // Get all admin/platform_admin users for notifications
    const { data: admins } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .in("role", ["admin", "platform_admin"])
      .eq("is_active", true);

    if (admins && admins.length > 0) {
      for (const request of overdueRequests) {
        for (const admin of admins) {
          await supabaseAdmin.from("notifications").insert({
            recipient_id: admin.id,
            actor_id: null,
            type: "escalation_timeout",
            title: "Submission Escalation",
            message: `Purchasing request ${request.title} has expired due to no action within the due time`,
            approval_request_id: request.id,
            requires_action: true,
            is_read: false,
          });
        }
      }
    }

    return { escalated: overdueRequests.length, error: null };
  } catch (error) {
    console.error("checkAndEscalateOverdueSubmissions failed:", error);
    return { escalated: 0, error: "Failed to check escalations" };
  }
}
