"use server";

import { supabaseServer } from "@/integrations/supabase/server";
import { logActivity } from "@/service/activityLog/activityLog";
import { isAdminOrSuper } from "@/service/auth/authorization";
import {
  ApprovalRoute,
  CreateApprovalRouteParams,
  UpdateApprovalRouteParams,
} from "@/types/approvalRoute";

export async function getApprovalRoutes(search?: string): Promise<{
  data: ApprovalRoute[] | null;
  error: string | null;
}> {
  try {
    const { allowed } = await isAdminOrSuper();
    if (!allowed) return { data: null, error: "Unauthorized" };

    const supabase = await supabaseServer();

    let query = supabase
      .from("approval_routes")
      .select(
        `
        *,
        steps:approval_route_steps(
          *,
          position:positions!approval_route_steps_approver_position_id_fkey(id, name),
          department:departments!approval_route_steps_approver_department_id_fkey(id, name),
          assignees:approval_route_step_assignees(
            user_id,
            user:profiles(first_name, last_name, email)
          )
        )
      `
      )
      .order("created_at", { ascending: false });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data: routes, error } = await query;

    if (error) return { data: null, error: error.message };

    const sorted = (routes ?? []).map((route) => ({
      ...route,
      condition_logic: route.condition_logic ?? "and",
      steps: (route.steps ?? []).sort(
        (a: { step_order: number }, b: { step_order: number }) =>
          a.step_order - b.step_order
      ),
    }));

    return { data: sorted as ApprovalRoute[], error: null };
  } catch (error) {
    console.error("getApprovalRoutes failed", error);
    return { data: null, error: "Failed to fetch approval routes" };
  }
}

export async function getApprovalRoute(id: string): Promise<{
  data: ApprovalRoute | null;
  error: string | null;
}> {
  try {
    const { allowed } = await isAdminOrSuper();
    if (!allowed) return { data: null, error: "Unauthorized" };

    const supabase = await supabaseServer();

    const { data: route, error } = await supabase
      .from("approval_routes")
      .select(
        `
        *,
        steps:approval_route_steps(
          *,
          position:positions!approval_route_steps_approver_position_id_fkey(id, name),
          department:departments!approval_route_steps_approver_department_id_fkey(id, name),
          assignees:approval_route_step_assignees(
            user_id,
            user:profiles(first_name, last_name, email)
          )
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) return { data: null, error: error.message };

    const result = {
      ...route,
      condition_logic: route.condition_logic ?? "and",
      steps: (route.steps ?? []).sort(
        (a: { step_order: number }, b: { step_order: number }) =>
          a.step_order - b.step_order
      ),
    };

    return { data: result as ApprovalRoute, error: null };
  } catch (error) {
    console.error("getApprovalRoute failed", error);
    return { data: null, error: "Failed to fetch approval route" };
  }
}

export async function createApprovalRoute(
  params: CreateApprovalRouteParams
): Promise<{
  data: ApprovalRoute | null;
  error: string | null;
}> {
  try {
    const { allowed, userId } = await isAdminOrSuper();
    if (!allowed) return { data: null, error: "Unauthorized" };

    const supabase = await supabaseServer();

    const { data: route, error: routeError } = await supabase
      .from("approval_routes")
      .insert({
        name: params.name,
        description: params.description ?? null,
        is_active: params.is_active ?? true,
        conditions: params.conditions ?? {},
        condition_logic: params.condition_logic ?? "and",
        weight: params.weight ?? 50,
      })
      .select()
      .single();

    if (routeError) return { data: null, error: routeError.message };

    if (params.steps.length > 0) {
      const stepsToInsert = params.steps.map((step, index) => ({
        route_id: route.id,
        step_order: index + 1,
        name: step.name,
        approver_role: step.approver_role ?? null,
        approver_user_id: step.approver_user_id ?? null,
        approver_position_id: step.approver_position_id ?? null,
        approver_department_id: step.approver_department_id ?? null,
        is_required: step.is_required ?? true,
      }));

      const { data: insertedSteps, error: stepsError } = await supabase
        .from("approval_route_steps")
        .insert(stepsToInsert)
        .select("id, step_order");

      if (stepsError) return { data: null, error: stepsError.message };

      // Insert multi-assignees for steps that have them
      if (insertedSteps) {
        for (const step of params.steps) {
          if (step.assignee_user_ids && step.assignee_user_ids.length > 0) {
            const matchedStep = insertedSteps.find(
              (s) => s.step_order === step.step_order
            );
            if (matchedStep) {
              const assigneesToInsert = step.assignee_user_ids.map((uid) => ({
                step_id: matchedStep.id,
                user_id: uid,
              }));
              await supabase
                .from("approval_route_step_assignees")
                .insert(assigneesToInsert);
            }
          }
        }
      }
    }

    if (userId) {
      logActivity(supabase, userId, {
        action: "approval_route_create",
        entity_type: "approval_route",
        entity_id: route.id,
        entity_name: route.name,
        new_values: { name: route.name, is_active: route.is_active },
      });
    }

    return await getApprovalRoute(route.id);
  } catch (error) {
    console.error("createApprovalRoute failed", error);
    return { data: null, error: "Failed to create approval route" };
  }
}

export async function updateApprovalRoute(
  params: UpdateApprovalRouteParams
): Promise<{
  data: ApprovalRoute | null;
  error: string | null;
}> {
  try {
    const { allowed, userId } = await isAdminOrSuper();
    if (!allowed) return { data: null, error: "Unauthorized" };

    const supabase = await supabaseServer();

    const { data: existing } = await supabase
      .from("approval_routes")
      .select("name, is_active")
      .eq("id", params.id)
      .single();

    const updatePayload: Record<string, unknown> = {};
    if (params.name !== undefined) updatePayload.name = params.name;
    if (params.description !== undefined)
      updatePayload.description = params.description;
    if (params.is_active !== undefined) updatePayload.is_active = params.is_active;
    if (params.conditions !== undefined)
      updatePayload.conditions = params.conditions;
    if (params.condition_logic !== undefined)
      updatePayload.condition_logic = params.condition_logic;
    if (params.weight !== undefined) updatePayload.weight = params.weight;

    const { error: routeError } = await supabase
      .from("approval_routes")
      .update(updatePayload)
      .eq("id", params.id);

    if (routeError) return { data: null, error: routeError.message };

    if (params.steps !== undefined) {
      // Deleting steps cascades to assignees via FK
      const { error: deleteError } = await supabase
        .from("approval_route_steps")
        .delete()
        .eq("route_id", params.id);

      if (deleteError) return { data: null, error: deleteError.message };

      if (params.steps.length > 0) {
        const stepsToInsert = params.steps.map((step, index) => ({
          route_id: params.id,
          step_order: index + 1,
          name: step.name,
          approver_role: step.approver_role ?? null,
          approver_user_id: step.approver_user_id ?? null,
          approver_position_id: step.approver_position_id ?? null,
          approver_department_id: step.approver_department_id ?? null,
          is_required: step.is_required ?? true,
        }));

        const { data: insertedSteps, error: stepsError } = await supabase
          .from("approval_route_steps")
          .insert(stepsToInsert)
          .select("id, step_order");

        if (stepsError) return { data: null, error: stepsError.message };

        // Insert multi-assignees
        if (insertedSteps) {
          for (const step of params.steps) {
            if (step.assignee_user_ids && step.assignee_user_ids.length > 0) {
              const matchedStep = insertedSteps.find(
                (s) => s.step_order === step.step_order
              );
              if (matchedStep) {
                const assigneesToInsert = step.assignee_user_ids.map(
                  (uid) => ({
                    step_id: matchedStep.id,
                    user_id: uid,
                  })
                );
                await supabase
                  .from("approval_route_step_assignees")
                  .insert(assigneesToInsert);
              }
            }
          }
        }
      }
    }

    if (userId) {
      logActivity(supabase, userId, {
        action: "approval_route_update",
        entity_type: "approval_route",
        entity_id: params.id,
        entity_name: params.name ?? existing?.name,
        old_values: existing
          ? { name: existing.name, is_active: existing.is_active }
          : null,
        new_values: { name: params.name, is_active: params.is_active },
      });
    }

    return await getApprovalRoute(params.id);
  } catch (error) {
    console.error("updateApprovalRoute failed", error);
    return { data: null, error: "Failed to update approval route" };
  }
}

export async function deleteApprovalRoute(id: string): Promise<{
  data: null;
  error: string | null;
}> {
  try {
    const { allowed, userId } = await isAdminOrSuper();
    if (!allowed) return { data: null, error: "Unauthorized" };

    const supabase = await supabaseServer();

    const { data: existing } = await supabase
      .from("approval_routes")
      .select("name")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("approval_routes")
      .delete()
      .eq("id", id);

    if (error) return { data: null, error: error.message };

    if (userId) {
      logActivity(supabase, userId, {
        action: "approval_route_delete",
        entity_type: "approval_route",
        entity_id: id,
        entity_name: existing?.name ?? null,
      });
    }

    return { data: null, error: null };
  } catch (error) {
    console.error("deleteApprovalRoute failed", error);
    return { data: null, error: "Failed to delete approval route" };
  }
}
