"use server";

import { supabaseServer } from "@/integrations/supabase/server";
import { isAdminOrSuper } from "@/service/auth/authorization";
import { logActivity } from "@/service/activityLog/activityLog";
import {
  CategoryType,
  CreateCategoryTypeParams,
  UpdateCategoryTypeParams,
} from "@/types/categoryType";

export async function getCategoryTypes(): Promise<{
  data: CategoryType[] | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("category_types")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data as CategoryType[], error: null };
  } catch (error) {
    console.error("getCategoryTypes failed", error);
    return { data: null, error: "Failed to fetch category types" };
  }
}

export async function getActiveCategoryTypes(): Promise<{
  data: CategoryType[] | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("category_types")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data as CategoryType[], error: null };
  } catch (error) {
    console.error("getActiveCategoryTypes failed", error);
    return { data: null, error: "Failed to fetch category types" };
  }
}

export async function createCategoryType(
  params: CreateCategoryTypeParams
): Promise<{ data: CategoryType | null; error: string | null }> {
  try {
    const { allowed, userId } = await isAdminOrSuper();
    if (!allowed) return { data: null, error: "Unauthorized" };

    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("category_types")
      .insert({
        category: params.category,
        name: params.name,
        description: params.description ?? null,
        notes: params.notes ?? null,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    if (userId) {
      logActivity(supabase, userId, {
        action: "department_create",
        entity_type: "department",
        entity_id: data.id,
        entity_name: `${data.category}/${data.name}`,
        new_values: {
          category: data.category,
          name: data.name,
          notes: data.notes,
        },
      });
    }

    return { data: data as CategoryType, error: null };
  } catch (error) {
    console.error("createCategoryType failed", error);
    return { data: null, error: "Failed to create category type" };
  }
}

export async function updateCategoryType(
  params: UpdateCategoryTypeParams
): Promise<{ data: CategoryType | null; error: string | null }> {
  try {
    const { allowed, userId } = await isAdminOrSuper();
    if (!allowed) return { data: null, error: "Unauthorized" };

    const supabase = await supabaseServer();

    const { data: existing } = await supabase
      .from("category_types")
      .select("name, notes, is_active")
      .eq("id", params.id)
      .single();

    const updatePayload: Record<string, unknown> = {};
    if (params.name !== undefined) updatePayload.name = params.name;
    if (params.notes !== undefined) updatePayload.notes = params.notes;
    if (params.is_active !== undefined)
      updatePayload.is_active = params.is_active;
    if (params.sort_order !== undefined)
      updatePayload.sort_order = params.sort_order;

    const { data, error } = await supabase
      .from("category_types")
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

    return { data: data as CategoryType, error: null };
  } catch (error) {
    console.error("updateCategoryType failed", error);
    return { data: null, error: "Failed to update category type" };
  }
}

export async function deleteCategoryType(
  id: string
): Promise<{ error: string | null }> {
  try {
    const { allowed, userId } = await isAdminOrSuper();
    if (!allowed) return { error: "Unauthorized" };

    const supabase = await supabaseServer();

    const { data: existing } = await supabase
      .from("category_types")
      .select("name, category")
      .eq("id", id)
      .single();

    // Check if referenced by any submission — soft delete if so
    const { count } = await supabase
      .from("approval_requests")
      .select("id", { count: "exact", head: true })
      .eq("category_type_id", id);

    if (count && count > 0) {
      // Soft delete: mark inactive instead of removing
      const { error } = await supabase
        .from("category_types")
        .update({ is_active: false })
        .eq("id", id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase
        .from("category_types")
        .delete()
        .eq("id", id);
      if (error) return { error: error.message };
    }

    if (userId) {
      logActivity(supabase, userId, {
        action: "department_delete",
        entity_type: "department",
        entity_id: id,
        entity_name: existing
          ? `${existing.category}/${existing.name}`
          : null,
      });
    }

    return { error: null };
  } catch (error) {
    console.error("deleteCategoryType failed", error);
    return { error: "Failed to delete category type" };
  }
}
