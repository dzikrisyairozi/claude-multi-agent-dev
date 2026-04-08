"use server";

import { supabaseServer } from "@/integrations/supabase/server";
import { isAdminOrSuper } from "@/service/auth/authorization";
import { logActivity } from "@/service/activityLog/activityLog";
import {
  Department,
  CreateDepartmentParams,
  UpdateDepartmentParams,
} from "@/types/department";

export async function getDepartments(): Promise<{
  data: Department[] | null;
  error: string | null;
}> {
  try {
    const { allowed } = await isAdminOrSuper();
    if (!allowed) return { data: null, error: "Unauthorized" };

    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("name", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data as Department[], error: null };
  } catch (error) {
    console.error("getDepartments failed", error);
    return { data: null, error: "Failed to fetch departments" };
  }
}

export async function getActiveDepartments(): Promise<{
  data: Department[] | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data as Department[], error: null };
  } catch (error) {
    console.error("getActiveDepartments failed", error);
    return { data: null, error: "Failed to fetch departments" };
  }
}

export async function createDepartment(
  params: CreateDepartmentParams
): Promise<{ data: Department | null; error: string | null }> {
  try {
    const { allowed, userId } = await isAdminOrSuper();
    if (!allowed) return { data: null, error: "Unauthorized" };

    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("departments")
      .insert({
        name: params.name,
        description: params.description ?? null,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    if (userId) {
      logActivity(supabase, userId, {
        action: "department_create",
        entity_type: "department",
        entity_id: data.id,
        entity_name: data.name,
        new_values: { name: data.name, description: data.description },
      });
    }

    return { data: data as Department, error: null };
  } catch (error) {
    console.error("createDepartment failed", error);
    return { data: null, error: "Failed to create department" };
  }
}

export async function updateDepartment(
  params: UpdateDepartmentParams
): Promise<{ data: Department | null; error: string | null }> {
  try {
    const { allowed, userId } = await isAdminOrSuper();
    if (!allowed) return { data: null, error: "Unauthorized" };

    const supabase = await supabaseServer();

    const { data: existing } = await supabase
      .from("departments")
      .select("name, description, is_active")
      .eq("id", params.id)
      .single();

    const updatePayload: Record<string, unknown> = {};
    if (params.name !== undefined) updatePayload.name = params.name;
    if (params.description !== undefined)
      updatePayload.description = params.description;
    if (params.is_active !== undefined)
      updatePayload.is_active = params.is_active;

    const { data, error } = await supabase
      .from("departments")
      .update(updatePayload)
      .eq("id", params.id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    if (userId) {
      logActivity(supabase, userId, {
        action: "department_update",
        entity_type: "department",
        entity_id: params.id,
        entity_name: data.name,
        old_values: existing ?? null,
        new_values: updatePayload,
      });
    }

    return { data: data as Department, error: null };
  } catch (error) {
    console.error("updateDepartment failed", error);
    return { data: null, error: "Failed to update department" };
  }
}

export async function getDepartmentUserCount(
  id: string
): Promise<{ count: number; error: string | null }> {
  try {
    const { allowed } = await isAdminOrSuper();
    if (!allowed) return { count: 0, error: "Unauthorized" };

    const supabase = await supabaseServer();
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("department_id", id);

    if (error) return { count: 0, error: error.message };
    return { count: count ?? 0, error: null };
  } catch (error) {
    console.error("getDepartmentUserCount failed", error);
    return { count: 0, error: "Failed to check assigned users" };
  }
}

export async function deleteDepartment(
  id: string
): Promise<{ error: string | null }> {
  try {
    const { allowed, userId } = await isAdminOrSuper();
    if (!allowed) return { error: "Unauthorized" };

    const supabase = await supabaseServer();

    const { data: existing } = await supabase
      .from("departments")
      .select("name")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("departments")
      .delete()
      .eq("id", id);

    if (error) return { error: error.message };

    if (userId) {
      logActivity(supabase, userId, {
        action: "department_delete",
        entity_type: "department",
        entity_id: id,
        entity_name: existing?.name ?? null,
      });
    }

    return { error: null };
  } catch (error) {
    console.error("deleteDepartment failed", error);
    return { error: "Failed to delete department" };
  }
}
