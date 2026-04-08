"use server";

import { supabaseServer } from "@/integrations/supabase/server";
import { logActivity } from "@/service/activityLog/activityLog";
import { createNotification, completeNotificationAction } from "@/service/notification/notification";
import { getCurrentUserProfile, checkPermission } from "@/service/auth/authorization";
import { ActivityAction } from "@/types/activityLog";
import { NotificationType } from "@/types/notification";
import {
  ApprovalRequest,
  ApprovalRequestDocument,
  ApprovalRequestStepApproval,
  CreateApprovalRequestParams,
  GetApprovalRequestsParams,
  UpdateApprovalRequestParams,
} from "@/types/approvalRequest";
import { embedSubmission } from "@/service/rag/submissionEmbeddings";
import {
  matchApprovalRoute,
  snapshotRouteSteps,
  processStepApproval,
  canUserApproveCurrentStep,
} from "@/service/approvalRequest/approvalRouteMatching";

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Notify step approvers (direct user, multi-assignees, or role-based).
 * Fire-and-forget: errors are logged but won't block the caller.
 */
export async function notifyStepApprovers(
  supabase: SupabaseClient,
  params: {
    stepApproverRole: string | null;
    stepApproverUserId: string | null;
    stepAssignees: string[];
    excludeUserId: string;
    actorId: string;
    approvalRequestId: string;
    title: string;
    message: string;
    stepOrder: number;
  }
) {
  const notifyIds = new Set<string>();
  if (params.stepApproverUserId) notifyIds.add(params.stepApproverUserId);
  params.stepAssignees.forEach((id) => notifyIds.add(id));

  // For role-based steps with no specific users, find all users with that role
  if (params.stepApproverRole && !params.stepApproverUserId && params.stepAssignees.length === 0) {
    const { data: roleUsers } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", params.stepApproverRole);
    roleUsers?.forEach((u) => notifyIds.add(u.id));
  }

  notifyIds.delete(params.excludeUserId);
  notifyIds.forEach((recipientId) => {
    createNotification(supabase, {
      recipient_id: recipientId,
      actor_id: params.actorId,
      type: "approval_submitted",
      title: params.title,
      message: params.message,
      approval_request_id: params.approvalRequestId,
      requires_action: true,
      step_order: params.stepOrder,
    });
  });
}

// Allowed status transitions based on role
const ADMIN_ALLOWED_STATUSES = [
  "approved",
  "rejected",
  "need_revision",
  "cancelled",
];
const REQUESTER_ALLOWED_STATUSES = ["pending", "cancelled", "draft"];

// GET - List all approval requests
export async function getApprovalRequests(
  params?: GetApprovalRequestsParams,
): Promise<{
  data: ApprovalRequest[] | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: userError?.message || "Unauthorized" };
    }

    // Get user role for permission-based filtering
    const { role } = await getCurrentUserProfile();

    // SUB-004/005: Platform Admin has no submission access
    if (role === "platform_admin") {
      return { data: [], error: null };
    }

    const selectQuery = `
      *,
      approval_request_documents (
        *,
        documents (
          file_name,
          file_size,
          mime_type
        )
      )
    `;

    let query = supabase
      .from("approval_requests")
      .select(selectQuery)
      .order("created_at", { ascending: false });

    // Role-based filtering:
    // SUB-004: View ALL submissions = accounting, admin only (no filter)
    // SUB-005/006: Approver = assigned only, Requester = own + assigned
    if (role === "requester") {
      // Own submissions only (assigned submissions handled via step_approvals below)
      query = query.eq("user_id", user.id);
    } else if (role === "approver") {
      // Own submissions only (will merge with assigned below)
      query = query.eq("user_id", user.id);
    }
    // accounting + admin: no filter — can see all (SUB-004)

    if (params?.category) {
      query = query.eq("category", params.category);
    }

    if (params?.priority) {
      query = query.eq("priority", params.priority);
    }

    if (params?.status) {
      query = query.eq("status", params.status);
    }

    if (params?.excludeDrafts) {
      query = query.neq("status", "draft");
    }

    const { data, error } = await query;

    // For approver/requester: also fetch submissions assigned to them via step_approvals
    // Check all assignment types: direct user, multi-assignee, role, position+department
    let assignedData: typeof data = [];
    if ((role === "approver" || role === "requester") && !error) {
      const assignedRequestIds = new Set<string>();

      // 1. Direct user assignment
      const { data: directAssigned } = await supabase
        .from("approval_request_step_approvals")
        .select("approval_request_id")
        .eq("approver_user_id", user.id);
      directAssigned?.forEach((s) => assignedRequestIds.add(s.approval_request_id));

      // 2. Multi-assignee assignment
      const { data: multiAssigned } = await supabase
        .from("approval_request_step_assignees")
        .select("step_approval_id")
        .eq("user_id", user.id);
      if (multiAssigned && multiAssigned.length > 0) {
        const stepIds = multiAssigned.map((a) => a.step_approval_id);
        const { data: stepRequests } = await supabase
          .from("approval_request_step_approvals")
          .select("approval_request_id")
          .in("id", stepIds);
        stepRequests?.forEach((s) => assignedRequestIds.add(s.approval_request_id));
      }

      // 3. Role-based assignment
      if (role) {
        const { data: roleAssigned } = await supabase
          .from("approval_request_step_approvals")
          .select("approval_request_id")
          .eq("approver_role", role);
        roleAssigned?.forEach((s) => assignedRequestIds.add(s.approval_request_id));
      }

      // 4. Position+department assignment
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("position_id, department_id")
        .eq("id", user.id)
        .single();

      if (userProfile?.position_id) {
        const posQuery = supabase
          .from("approval_request_step_approvals")
          .select("approval_request_id")
          .eq("approver_position_id", userProfile.position_id);

        // If step also specifies department, filter by it
        // We fetch all position matches then filter on client for optional dept
        const { data: posAssigned } = await posQuery;
        if (posAssigned) {
          // For each, check if department constraint is met
          for (const step of posAssigned) {
            assignedRequestIds.add(step.approval_request_id);
          }
        }
      }

      // Fetch assigned submissions excluding own
      const ownIds = new Set((data || []).map((d: Record<string, unknown>) => d.id));
      const newIds = [...assignedRequestIds].filter((id) => !ownIds.has(id));

      if (newIds.length > 0) {
        let assignedQuery = supabase
          .from("approval_requests")
          .select(selectQuery)
          .in("id", newIds)
          .order("created_at", { ascending: false });

        if (params?.category) assignedQuery = assignedQuery.eq("category", params.category);
        if (params?.priority) assignedQuery = assignedQuery.eq("priority", params.priority);
        if (params?.status) assignedQuery = assignedQuery.eq("status", params.status);
        if (params?.excludeDrafts) assignedQuery = assignedQuery.neq("status", "draft");

        const { data: aData } = await assignedQuery;
        assignedData = aData || [];
      }
    }

    const allData = [...(data || []), ...assignedData];

    if (error) {
      return { data: null, error: error.message };
    }

    // Transform response to include documents array
    const transformedData = (allData || []).map(
      (item: Record<string, unknown>) => ({
        ...item,
        documents:
          (item.approval_request_documents as ApprovalRequestDocument[]) || [],
        step_approvals: [] as ApprovalRequestStepApproval[],
      }),
    ) as unknown as ApprovalRequest[];

    return { data: transformedData, error: null };
  } catch (error) {
    console.error("Approval requests fetch failed", error);
    return { data: null, error: "Failed to fetch approval requests" };
  }
}

// GET - Get single approval request
export async function getApprovalRequest(id: string): Promise<{
  data: ApprovalRequest | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: userError?.message || "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("approval_requests")
      .select(
        `
        *,
        category_type:category_types(id, name, category),
        approval_request_documents (
          *,
          documents (
            file_name,
            file_size,
            mime_type
          )
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { data: null, error: "Approval request not found" };
      }
      return { data: null, error: error.message };
    }

    // Fetch approver/rejector/submitter profiles in a single batch query
    const profileIds = [data.user_id, data.approved_by, data.rejected_by].filter(
      Boolean
    ) as string[];
    const uniqueProfileIds = [...new Set(profileIds)];

    const profileMap: Record<
      string,
      { first_name: string; last_name: string; email: string }
    > = {};
    if (uniqueProfileIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", uniqueProfileIds);

      if (profiles) {
        for (const p of profiles) {
          profileMap[p.id] = {
            first_name: p.first_name,
            last_name: p.last_name,
            email: p.email,
          };
        }
      }
    }

    const submitter = data.user_id ? profileMap[data.user_id] || null : null;
    const approver = data.approved_by
      ? profileMap[data.approved_by] || null
      : null;
    const rejector = data.rejected_by
      ? profileMap[data.rejected_by] || null
      : null;

    // Fetch step approvals with actor profiles and multi-assignees
    let stepApprovals: ApprovalRequestStepApproval[] = [];
    const { data: stepsData } = await supabase
      .from("approval_request_step_approvals")
      .select(`
        *,
        assignees:approval_request_step_assignees(
          user_id,
          user:profiles(first_name, last_name, email)
        )
      `)
      .eq("approval_request_id", id)
      .order("step_order", { ascending: true });

    if (stepsData && stepsData.length > 0) {
      // Fetch actor profiles for steps that have been acted on
      const actorIds = stepsData
        .filter((s) => s.acted_by)
        .map((s) => s.acted_by as string);

      const uniqueActorIds = [...new Set(actorIds)];
      const actorMap: Record<string, { first_name: string; last_name: string; email: string }> = {};

      if (uniqueActorIds.length > 0) {
        const { data: actors } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", uniqueActorIds);

        if (actors) {
          for (const actor of actors) {
            actorMap[actor.id] = {
              first_name: actor.first_name,
              last_name: actor.last_name,
              email: actor.email,
            };
          }
        }
      }

      stepApprovals = stepsData.map((s) => ({
        ...s,
        actor: s.acted_by ? actorMap[s.acted_by] || null : null,
      })) as ApprovalRequestStepApproval[];
    }

    // Transform response to include documents array, profiles, and step approvals
    const transformedData = {
      ...data,
      documents:
        (data.approval_request_documents as ApprovalRequestDocument[]) || [],
      approver,
      rejector,
      submitter,
      step_approvals: stepApprovals,
    } as ApprovalRequest;

    return { data: transformedData, error: null };
  } catch (error) {
    console.error("Approval request fetch failed", error);
    return { data: null, error: "Failed to fetch approval request" };
  }
}

// POST - Create approval request
export async function createApprovalRequest(
  params: CreateApprovalRequestParams,
): Promise<{
  data: ApprovalRequest | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: userError?.message || "Unauthorized" };
    }

    // SUB-001: Check create_submit_ringi permission
    const { allowed: canCreate } = await checkPermission("create_submit_ringi");
    if (!canCreate) {
      return { data: null, error: "You don't have permission to create submissions" };
    }

    // Validate title
    if (!params.title || params.title.trim() === "") {
      return { data: null, error: "Title is required" };
    }

    // Validate items if provided
    if (params.items && !Array.isArray(params.items)) {
      return { data: null, error: "Items must be an array" };
    }

    if (params.items) {
      for (const item of params.items) {
        if (!item.name || typeof item.name !== "string") {
          return { data: null, error: "Each item must have a valid name" };
        }
      }
    }

    // Verify all document_ids exist if provided
    if (params.document_ids && params.document_ids.length > 0) {
      const { data: documents, error: docsError } = await supabase
        .from("documents")
        .select("id")
        .in("id", params.document_ids);

      if (docsError) {
        return { data: null, error: docsError.message };
      }

      if (!documents || documents.length !== params.document_ids.length) {
        return { data: null, error: "One or more documents not found" };
      }
    }

    const { data, error } = await supabase
      .from("approval_requests")
      .insert({
        title: params.title.trim(),
        description: params.description?.trim() || null,
        vendor_name: params.vendor_name?.trim() || null,
        category: params.category?.trim() || null,
        amount: params.amount || null,
        priority: params.priority?.trim() || null,
        date: params.date || null,
        status: params.status === "draft" ? "draft" : "pending",
        items: params.items || [],
        department: params.department || null,
        is_use_tax: params.is_use_tax ?? false,
        is_tax_included: params.is_tax_included ?? true,
        tax_rate: params.tax_rate || 0,
        payment_schedule_date: params.payment_schedule_date || null,
        payment_method: params.payment_method || null,
        reason_for_purchase: params.reason_for_purchase || null,
        purpose: params.purpose || null,
        remarks: params.remarks || null,
        category_type_id: params.category_type_id || null,
      })
      .select("*")
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    // Insert documents into junction table
    const documentsToInsert: {
      approval_request_id: string;
      document_id?: string;
      document_url?: string;
    }[] = [];

    // Add document_ids
    if (params.document_ids && params.document_ids.length > 0) {
      for (const docId of params.document_ids) {
        documentsToInsert.push({
          approval_request_id: data.id,
          document_id: docId,
        });
      }
    }

    // Add document_urls
    if (params.document_urls && params.document_urls.length > 0) {
      for (const url of params.document_urls) {
        documentsToInsert.push({
          approval_request_id: data.id,
          document_url: url.trim(),
        });
      }
    }

    // Insert documents if any
    let documents: ApprovalRequestDocument[] = [];
    if (documentsToInsert.length > 0) {
      const { data: insertedDocs, error: docsInsertError } = await supabase
        .from("approval_request_documents")
        .insert(documentsToInsert)
        .select("*");

      if (docsInsertError) {
        console.error("Failed to insert documents:", docsInsertError);
        // Don't fail the whole request, just log the error
      } else {
        documents = insertedDocs as ApprovalRequestDocument[];
      }
    }

    // If submitting (not draft), match and snapshot approval route
    let matchedRoute: Awaited<ReturnType<typeof matchApprovalRoute>>["data"] = null;
    if (data.status === "pending") {
      const { data: route } = await matchApprovalRoute(
        params.category,
        params.department,
        params.amount,
        params.category_type_id || null
      );
      matchedRoute = route;

      if (route) {
        const { error: snapshotError } = await snapshotRouteSteps(
          supabase,
          data.id,
          route
        );
        if (snapshotError) {
          console.error("Failed to snapshot route steps:", snapshotError);
        }
      }
    }

    // Fire-and-forget: generate submission embedding
    embedSubmission(supabase, data.id).catch((err) =>
      console.error("[Embedding] Create submission failed:", err)
    );

    // Notify step-1 approvers (admins only get notified when assigned as approver in a step)
    if (data.status === "pending" && matchedRoute) {
      const step1 = matchedRoute.steps.find((s) => s.step_order === 1);
      if (step1) {
        notifyStepApprovers(supabase, {
          stepApproverRole: step1.approver_role || null,
          stepApproverUserId: step1.approver_user_id || null,
          stepAssignees: step1.assignees?.map((a) => a.user_id) || [],
          excludeUserId: user.id,
          actorId: user.id,
          approvalRequestId: data.id,
          title: "New Submission for Approval",
          message: `${data.title} is awaiting your approval.`,
          stepOrder: 1,
        });
      }
    }

    return { data: { ...data, documents, step_approvals: [], route_id: null, current_step_order: null } as ApprovalRequest, error: null };
  } catch (error) {
    console.error("Approval request creation failed", error);
    return { data: null, error: "Failed to create approval request" };
  }
}

// PATCH - Update approval request
export async function updateApprovalRequest(
  params: UpdateApprovalRequestParams,
): Promise<{
  data: ApprovalRequest | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: userError?.message || "Unauthorized" };
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (params.title !== undefined) {
      if (params.title.trim() === "") {
        return { data: null, error: "Title cannot be empty" };
      }
      updateData.title = params.title.trim();
    }

    if (params.description !== undefined)
      updateData.description = params.description?.trim() || null;
    if (params.vendor_name !== undefined)
      updateData.vendor_name = params.vendor_name?.trim() || null;
    if (params.category !== undefined)
      updateData.category = params.category?.trim() || null;
    if (params.amount !== undefined) updateData.amount = params.amount;
    if (params.priority !== undefined)
      updateData.priority = params.priority?.trim() || null;
    if (params.date !== undefined) updateData.date = params.date || null;
    if (params.status !== undefined)
      updateData.status = params.status?.trim() || null;
    if (params.approval_notes !== undefined)
      updateData.approval_notes = params.approval_notes?.trim() || null;
    if (params.department !== undefined)
      updateData.department = params.department?.trim() || null;
    if (params.is_use_tax !== undefined)
      updateData.is_use_tax = params.is_use_tax;
    if (params.is_tax_included !== undefined)
      updateData.is_tax_included = params.is_tax_included;
    if (params.tax_rate !== undefined) updateData.tax_rate = params.tax_rate;
    if (params.payment_schedule_date !== undefined)
      updateData.payment_schedule_date = params.payment_schedule_date || null;
    if (params.payment_method !== undefined)
      updateData.payment_method = params.payment_method?.trim() || null;
    if (params.reason_for_purchase !== undefined)
      updateData.reason_for_purchase =
        params.reason_for_purchase?.trim() || null;
    if (params.purpose !== undefined)
      updateData.purpose = params.purpose?.trim() || null;
    if (params.remarks !== undefined)
      updateData.remarks = params.remarks?.trim() || null;
    if (params.category_type_id !== undefined)
      updateData.category_type_id = params.category_type_id || null;

    // Validate document_ids if provided
    if (params.document_ids !== undefined && params.document_ids.length > 0) {
      const { data: documents, error: docsError } = await supabase
        .from("documents")
        .select("id")
        .in("id", params.document_ids);

      if (docsError) {
        return { data: null, error: docsError.message };
      }

      if (!documents || documents.length !== params.document_ids.length) {
        return { data: null, error: "One or more documents not found" };
      }
    }

    // Validate items if provided
    if (params.items !== undefined) {
      if (params.items && !Array.isArray(params.items)) {
        return { data: null, error: "Items must be an array" };
      }

      if (params.items) {
        for (const item of params.items) {
          if (!item.name || typeof item.name !== "string") {
            return { data: null, error: "Each item must have a valid name" };
          }
        }
      }
      updateData.items = params.items || [];
    }

    // Check if we have something to update (either fields or documents)
    const hasDocumentUpdates =
      params.document_ids !== undefined || params.document_urls !== undefined;
    if (Object.keys(updateData).length === 0 && !hasDocumentUpdates) {
      return { data: null, error: "No fields to update" };
    }

    let data;

    // Fetch previous state before update to detect transitions and track changes
    let previousStatus: string | null = null;
    let previousSnapshot: Record<string, unknown> | null = null;
    if (params.status === "pending") {
      const { data: existing } = await supabase
        .from("approval_requests")
        .select("*")
        .eq("id", params.id)
        .single();
      previousStatus = existing?.status ?? null;
      // Snapshot fields for change tracking on resubmit (need_revision → pending)
      if (previousStatus === "need_revision" && existing) {
        previousSnapshot = {
          title: existing.title,
          vendor_name: existing.vendor_name,
          amount: existing.amount,
          category: existing.category,
          priority: existing.priority,
          department: existing.department,
          description: existing.description,
          payment_method: existing.payment_method,
          payment_schedule_date: existing.payment_schedule_date,
          reason_for_purchase: existing.reason_for_purchase,
          purpose: existing.purpose,
          remarks: existing.remarks,
          is_use_tax: existing.is_use_tax,
          is_tax_included: existing.is_tax_included,
          tax_rate: existing.tax_rate,
        };
      }
    }

    // Capture revision tracking fields before clearing them (needed after snapshotRouteSteps)
    let revisionSourceStepOrder: number | null = null;
    let revisionRestartFromFirst: boolean | null = null;
    if (params.status === "pending" && previousStatus === "need_revision") {
      const existing = await supabase
        .from("approval_requests")
        .select("revision_source_step_order, revision_restart_from_first")
        .eq("id", params.id)
        .single();
      revisionSourceStepOrder = existing.data?.revision_source_step_order ?? null;
      revisionRestartFromFirst = existing.data?.revision_restart_from_first ?? null;

      updateData.revision_source_step_order = null;
      updateData.revision_restart_from_first = null;
    }

    // Only update approval_requests if there are field changes
    if (Object.keys(updateData).length > 0) {
      const { data: updatedData, error } = await supabase
        .from("approval_requests")
        .update(updateData)
        .eq("id", params.id)
        .select("*")
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      if (!updatedData) {
        return { data: null, error: "Approval request not found" };
      }

      data = updatedData;
    } else {
      // Fetch existing data if only updating documents
      const { data: existingData, error } = await supabase
        .from("approval_requests")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error || !existingData) {
        return { data: null, error: "Approval request not found" };
      }

      data = existingData;
    }

    // Handle document updates if document_ids or document_urls provided
    let documents: ApprovalRequestDocument[] = [];
    if (hasDocumentUpdates) {
      // Delete existing documents
      await supabase
        .from("approval_request_documents")
        .delete()
        .eq("approval_request_id", params.id);

      // Insert new documents
      const documentsToInsert: {
        approval_request_id: string;
        document_id?: string;
        document_url?: string;
      }[] = [];

      if (params.document_ids && params.document_ids.length > 0) {
        for (const docId of params.document_ids) {
          documentsToInsert.push({
            approval_request_id: params.id,
            document_id: docId,
          });
        }
      }

      if (params.document_urls && params.document_urls.length > 0) {
        for (const url of params.document_urls) {
          documentsToInsert.push({
            approval_request_id: params.id,
            document_url: url.trim(),
          });
        }
      }

      if (documentsToInsert.length > 0) {
        const { data: insertedDocs, error: docsInsertError } = await supabase
          .from("approval_request_documents")
          .insert(documentsToInsert)
          .select("*");

        if (docsInsertError) {
          console.error("Failed to insert documents:", docsInsertError);
        } else {
          documents = insertedDocs as ApprovalRequestDocument[];
        }
      }
    } else {
      // Fetch existing documents if not updating them
      const { data: existingDocs } = await supabase
        .from("approval_request_documents")
        .select("*")
        .eq("approval_request_id", params.id);

      documents = (existingDocs as ApprovalRequestDocument[]) || [];
    }

    // If transitioning to pending (from draft or need_revision), match and snapshot route
    if (
      params.status === "pending" &&
      previousStatus &&
      ["draft", "need_revision"].includes(previousStatus)
    ) {
      const { data: route } = await matchApprovalRoute(
        (data as Record<string, unknown>).category as string | null,
        (data as Record<string, unknown>).department as string | null,
        (data as Record<string, unknown>).amount as number | null,
        (data as Record<string, unknown>).category_type_id as string | null
      );

      if (route) {
        // If revision was NOT "restart from first", skip to the revision source step
        const skipToStep =
          previousStatus === "need_revision" &&
          !revisionRestartFromFirst &&
          revisionSourceStepOrder &&
          revisionSourceStepOrder > 1
            ? revisionSourceStepOrder
            : undefined;

        const { error: snapshotError } = await snapshotRouteSteps(
          supabase,
          params.id,
          route,
          skipToStep,
        );
        if (snapshotError) {
          console.error("Failed to snapshot route steps:", snapshotError);
        }
      }
    }

    // Fire-and-forget: re-generate submission embedding
    embedSubmission(supabase, params.id).catch((err) =>
      console.error("[Embedding] Update submission failed:", err)
    );

    // Notify step approvers when submitted (draft/need_revision → pending)
    if (
      params.status === "pending" &&
      previousStatus &&
      ["draft", "need_revision"].includes(previousStatus)
    ) {
      const requestTitle =
        (data as Record<string, unknown>).title as string ||
        `Request #${params.id.slice(0, 8)}`;

      // Clear requester's revision notification on resubmit
      if (previousStatus === "need_revision") {
        completeNotificationAction(params.id);
      }

      // Find the re-entry step and notify its approvers
      const reentryStepOrder =
        previousStatus === "need_revision" &&
        !revisionRestartFromFirst &&
        revisionSourceStepOrder &&
        revisionSourceStepOrder > 1
          ? revisionSourceStepOrder
          : 1;

      const { data: reentryStep } = await supabase
        .from("approval_request_step_approvals")
        .select("approver_role, approver_user_id")
        .eq("approval_request_id", params.id)
        .eq("step_order", reentryStepOrder)
        .single();

      if (reentryStep) {
        const isResubmit = previousStatus === "need_revision";
        const lastRevisionNotes = (data as Record<string, unknown>).approval_notes as string | null;
        const message = isResubmit
          ? `${requestTitle} has been revised and resubmitted.${lastRevisionNotes ? ` Previous feedback: "${lastRevisionNotes}"` : ""}`
          : `${requestTitle} is awaiting your approval.`;

        notifyStepApprovers(supabase, {
          stepApproverRole: reentryStep.approver_role || null,
          stepApproverUserId: reentryStep.approver_user_id || null,
          stepAssignees: [],
          excludeUserId: user.id,
          actorId: user.id,
          approvalRequestId: params.id,
          title: isResubmit ? "Resubmitted for Approval" : "New Submission for Approval",
          message,
          stepOrder: reentryStepOrder,
        });
      }
    }

    // Log resubmit activity with field-level change tracking (need_revision → pending)
    if (
      params.status === "pending" &&
      previousStatus === "need_revision" &&
      previousSnapshot
    ) {
      const newSnapshot: Record<string, unknown> = {
        title: (data as Record<string, unknown>).title,
        vendor_name: (data as Record<string, unknown>).vendor_name,
        amount: (data as Record<string, unknown>).amount,
        category: (data as Record<string, unknown>).category,
        priority: (data as Record<string, unknown>).priority,
        department: (data as Record<string, unknown>).department,
        description: (data as Record<string, unknown>).description,
        payment_method: (data as Record<string, unknown>).payment_method,
        payment_schedule_date: (data as Record<string, unknown>).payment_schedule_date,
        reason_for_purchase: (data as Record<string, unknown>).reason_for_purchase,
        purpose: (data as Record<string, unknown>).purpose,
        remarks: (data as Record<string, unknown>).remarks,
        is_use_tax: (data as Record<string, unknown>).is_use_tax,
        is_tax_included: (data as Record<string, unknown>).is_tax_included,
        tax_rate: (data as Record<string, unknown>).tax_rate,
      };

      logActivity(supabase, user.id, {
        action: "submission_resubmit",
        entity_type: "submission",
        entity_id: params.id,
        entity_name:
          (data as Record<string, unknown>).title as string ||
          `Request #${params.id.slice(0, 8)}`,
        old_values: previousSnapshot,
        new_values: newSnapshot,
      });
    }

    return { data: { ...data, documents, step_approvals: [] } as ApprovalRequest, error: null };
  } catch (error) {
    console.error("Approval request update failed", error);
    return { data: null, error: "Failed to update approval request" };
  }
}

// DELETE - Delete approval request
export async function deleteApprovalRequest(id: string): Promise<{
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { error: userError?.message || "Unauthorized" };
    }

    const { error } = await supabase
      .from("approval_requests")
      .delete()
      .eq("id", id);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error("Approval request delete failed", error);
    return { error: "Failed to delete approval request" };
  }
}

// PATCH - Update approval request status (role-based)
export async function updateApprovalRequestStatus(
  id: string,
  status: string,
  notes?: string,
  restartFromFirst?: boolean,
): Promise<{
  data: ApprovalRequest | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: userError?.message || "Unauthorized" };
    }

    // Get user role from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { data: null, error: "Unable to fetch user profile" };
    }

    const userRole = profile.role;

    if (!status || status.trim() === "") {
      return { data: null, error: "Status is required" };
    }

    const normalizedStatus = status.trim().toLowerCase();

    // Check if this request has a route assigned (multi-step workflow)
    const { data: requestData } = await supabase
      .from("approval_requests")
      .select("route_id, current_step_order, title, user_id")
      .eq("id", id)
      .single();

    if (
      requestData?.route_id &&
      ["approved", "rejected", "need_revision"].includes(normalizedStatus)
    ) {
      // Verify the current user is authorized to act on this step
      const { canApprove, error: authError } =
        await canUserApproveCurrentStep(id, user.id);
      if (authError) {
        return { data: null, error: authError };
      }
      if (!canApprove) {
        return {
          data: null,
          error: "You are not authorized to act on the current approval step",
        };
      }

      // Delegate to multi-step workflow
      const { data: stepResult, error: stepError } =
        await processStepApproval(
          id,
          user.id,
          normalizedStatus as "approved" | "rejected" | "need_revision",
          notes,
          restartFromFirst,
        );

      if (stepError) {
        return { data: null, error: stepError };
      }

      // Clear current step's "Needs Action" notifications
      completeNotificationAction(id, requestData.current_step_order ?? undefined);

      // Only notify requester on terminal actions (not intermediate step approvals)
      const resultStatus = stepResult?.status;
      if (resultStatus && resultStatus !== "pending" && requestData.user_id) {
        const notifyTypeMap: Record<string, NotificationType> = {
          approved: "approval_approved",
          rejected: "approval_rejected",
          need_revision: "approval_need_revision",
        };
        const notifyType = notifyTypeMap[resultStatus];
        if (notifyType) {
          const requestTitle = requestData.title || `Request #${id.slice(0, 8)}`;
          const titleMap: Record<string, string> = {
            approved: "Request Approved",
            rejected: "Request Rejected",
            need_revision: "Revision Required",
          };
          createNotification(supabase, {
            recipient_id: requestData.user_id,
            actor_id: user.id,
            type: notifyType,
            title: titleMap[resultStatus],
            message: `${requestTitle}${notes ? ` — ${notes}` : ""}`,
            approval_request_id: id,
            ...(resultStatus === "need_revision" && { requires_action: true }),
          });
        }
      }

      // Return the updated request
      return getApprovalRequest(id);
    }

    // Fallback: legacy single-step flow (no route assigned)
    // Validate status based on role
    let allowedStatuses: string[] = [];

    switch (userRole) {
      case "platform_admin":
      case "admin":
        allowedStatuses = ADMIN_ALLOWED_STATUSES;
        break;
      case "requester":
        allowedStatuses = REQUESTER_ALLOWED_STATUSES;
        break;
      case "accounting":
        // In legacy mode, accounting role still cannot approve
        return {
          data: null,
          error: "You do not have permission to update approval request status",
        };
      default:
        return { data: null, error: "Invalid user role" };
    }

    if (!allowedStatuses.includes(normalizedStatus)) {
      return {
        data: null,
        error: `Invalid status. As a ${userRole}, you can only set status to: ${allowedStatuses.join(
          ", ",
        )}`,
      };
    }

    // Update the status and notes if provided
    const updatePayload: {
      status: string;
      approval_notes?: string;
      approved_by?: string | null;
      rejected_by?: string | null;
    } = {
      status: normalizedStatus,
    };
    if (notes !== undefined) {
      updatePayload.approval_notes = notes;
    }

    // Set approved_by/rejected_by
    if (normalizedStatus === "approved") {
      updatePayload.approved_by = user.id;
      updatePayload.rejected_by = null;
    } else if (normalizedStatus === "rejected") {
      updatePayload.rejected_by = user.id;
      updatePayload.approved_by = null;
    }

    const { data, error } = await supabase
      .from("approval_requests")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { data: null, error: "Approval request not found" };
      }
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: "Approval request not found" };
    }

    // Log activity based on status (fire-and-forget)
    const statusToAction: Record<string, ActivityAction | null> = {
      approved: "submission_approve",
      rejected: "submission_reject",
      need_revision: "submission_need_revision",
    };

    const action = statusToAction[normalizedStatus];
    if (action) {
      logActivity(supabase, user.id, {
        action,
        entity_type: "submission",
        entity_id: id,
        entity_name:
          ((data as Record<string, unknown>).title as string) ||
          `Request #${id.slice(0, 8)}`,
        old_values: { status: (data as Record<string, unknown>).status },
        new_values: { status: normalizedStatus },
      });
    }

    // Fire-and-forget: notify submitter on approval decision
    const notifyTypeMap: Record<string, NotificationType> = {
      approved: "approval_approved",
      rejected: "approval_rejected",
      need_revision: "approval_need_revision",
    };
    const notifyType = notifyTypeMap[normalizedStatus];
    if (notifyType) {
      const requestTitle =
        ((data as Record<string, unknown>).title as string) ||
        `Request #${id.slice(0, 8)}`;
      const titleMap: Record<string, string> = {
        approved: "Request Approved",
        rejected: "Request Rejected",
        need_revision: "Revision Required",
      };
      // Clear "Needs Action" notifications for the acting user on this request
      // (must happen BEFORE creating the new notification to avoid clearing it)
      completeNotificationAction(id);

      createNotification(supabase, {
        recipient_id: (data as Record<string, unknown>).user_id as string,
        actor_id: user.id,
        type: notifyType,
        title: titleMap[normalizedStatus],
        message: `${requestTitle}${notes ? ` — ${notes}` : ""}`,
        approval_request_id: id,
        ...(normalizedStatus === "need_revision" && { requires_action: true }),
      });
    }

    return { data: { ...data, step_approvals: [] } as ApprovalRequest, error: null };
  } catch (error) {
    console.error("Approval request status update failed", error);
    return { data: null, error: "Failed to update approval request status" };
  }
}

/**
 * Add a comment to a submission's activity log.
 * Used for reply comments on revision feedback.
 */
export async function addSubmissionComment(
  submissionId: string,
  comment: string,
): Promise<{ error: string | null }> {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { error: "Unauthorized" };
    }

    // Fetch the submission title for the activity log
    const { data: request } = await supabase
      .from("approval_requests")
      .select("title")
      .eq("id", submissionId)
      .single();

    logActivity(supabase, user.id, {
      action: "submission_comment",
      entity_type: "submission",
      entity_id: submissionId,
      entity_name: request?.title || `Request #${submissionId.slice(0, 8)}`,
      metadata: { notes: comment },
    });

    // Notify the submission owner about the comment
    const { data: submission } = await supabase
      .from("approval_requests")
      .select("user_id, title")
      .eq("id", submissionId)
      .single();

    if (submission && submission.user_id !== user.id) {
      const { data: commenter } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

      const commenterName = commenter
        ? `${commenter.first_name ?? ""} ${commenter.last_name ?? ""}`.trim() || "Someone"
        : "Someone";
      const preview = comment.length > 200 ? comment.slice(0, 200) + "..." : comment;

      createNotification(supabase, {
        recipient_id: submission.user_id,
        actor_id: user.id,
        type: "comment_added",
        title: "New Comment",
        message: `${commenterName} commented on ${submission.title ?? `Request #${submissionId.slice(0, 8)}`}: "${preview}"`,
        approval_request_id: submissionId,
      });
    }

    return { error: null };
  } catch (error) {
    console.error("Add submission comment failed", error);
    return { error: "Failed to add comment" };
  }
}

// ---------------------------------------------------------------------------
// Batch authorization check for dashboard cards
// ---------------------------------------------------------------------------

export interface ApprovalActionInfo {
  canApprove: boolean;
  currentStepName: string | null;
  currentStepOrder: number | null;
  totalSteps: number;
  hasRoute: boolean;
}

/**
 * Check which pending requests the current user can act on.
 * Returns a map of requestId → action info. Used by dashboard to show
 * action buttons on cards without N+1 queries.
 */
export async function getApprovalActionsForUser(
  requestIds: string[]
): Promise<{ data: Record<string, ApprovalActionInfo>; error: string | null }> {
  try {
    if (requestIds.length === 0) return { data: {}, error: null };

    const supabase = await supabaseServer();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { data: {}, error: "Unauthorized" };

    // Fetch user profile once
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, position_id, department_id")
      .eq("id", user.id)
      .single();

    const isAdminLike = profile?.role === "platform_admin" || profile?.role === "admin";

    // Fetch all step approvals for these requests in one query
    const { data: allSteps } = await supabase
      .from("approval_request_step_approvals")
      .select("*")
      .in("approval_request_id", requestIds);

    // Fetch requests to get current_step_order and route_id
    const { data: requests } = await supabase
      .from("approval_requests")
      .select("id, current_step_order, route_id, status")
      .in("id", requestIds);

    if (!requests || !allSteps) return { data: {}, error: null };

    // Fetch multi-assignee matches for this user across all steps
    const stepIds = allSteps.map((s) => s.id);
    const assigneeStepIds = new Set<string>();
    if (stepIds.length > 0) {
      const { data: assignees } = await supabase
        .from("approval_request_step_assignees")
        .select("step_approval_id")
        .in("step_approval_id", stepIds)
        .eq("user_id", user.id);
      assignees?.forEach((a) => assigneeStepIds.add(a.step_approval_id));
    }

    const result: Record<string, ApprovalActionInfo> = {};

    for (const req of requests) {
      const reqSteps = allSteps.filter((s) => s.approval_request_id === req.id);
      const totalSteps = reqSteps.length;
      const hasRoute = !!req.route_id;

      if (req.status !== "pending" || !hasRoute || req.current_step_order == null) {
        // Legacy or non-pending: admin-like users can act
        if (req.status === "pending" && isAdminLike) {
          result[req.id] = { canApprove: true, currentStepName: null, currentStepOrder: null, totalSteps, hasRoute };
        }
        continue;
      }

      const currentStep = reqSteps.find((s) => s.step_order === req.current_step_order);
      if (!currentStep || currentStep.status !== "pending") continue;

      // Admin/platform_admin can always approve
      if (isAdminLike) {
        result[req.id] = {
          canApprove: true,
          currentStepName: currentStep.step_name,
          currentStepOrder: currentStep.step_order,
          totalSteps,
          hasRoute,
        };
        continue;
      }

      // Check assignment types
      const isDirectUser = currentStep.approver_user_id === user.id;
      const isRoleMatch = !!(currentStep.approver_role && profile?.role && currentStep.approver_role === profile.role);
      const isPositionMatch = !!(
        currentStep.approver_position_id &&
        profile?.position_id &&
        currentStep.approver_position_id === profile.position_id &&
        (!currentStep.approver_department_id || currentStep.approver_department_id === profile.department_id)
      );
      const isMultiAssignee = assigneeStepIds.has(currentStep.id);

      if (isDirectUser || isRoleMatch || isPositionMatch || isMultiAssignee) {
        result[req.id] = {
          canApprove: true,
          currentStepName: currentStep.step_name,
          currentStepOrder: currentStep.step_order,
          totalSteps,
          hasRoute,
        };
      }
    }

    return { data: result, error: null };
  } catch (error) {
    console.error("getApprovalActionsForUser failed", error);
    return { data: {}, error: "Failed to check approval actions" };
  }
}
