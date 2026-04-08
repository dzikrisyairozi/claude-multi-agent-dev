"use server";

import { supabaseServer } from "@/integrations/supabase/server";
import { isAdminOrSuper } from "@/service/auth/authorization";
import { logActivity } from "@/service/activityLog/activityLog";
import {
  Position,
  CreatePositionParams,
  UpdatePositionParams,
} from "@/types/position";

export async function getPositions(): Promise<{
  data: Position[] | null;
  error: string | null;
}> {
  try {
    const { allowed } = await isAdminOrSuper();
    if (!allowed) return { data: null, error: "Unauthorized" };

    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .order("level", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data as Position[], error: null };
  } catch (error) {
    console.error("getPositions failed", error);
    return { data: null, error: "Failed to fetch positions" };
  }
}

export async function getActivePositions(): Promise<{
  data: Position[] | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .eq("is_active", true)
      .order("level", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data as Position[], error: null };
  } catch (error) {
    console.error("getActivePositions failed", error);
    return { data: null, error: "Failed to fetch positions" };
  }
}

export async function createPosition(
  params: CreatePositionParams
): Promise<{ data: Position | null; error: string | null }> {
  try {
    const { allowed, userId } = await isAdminOrSuper();
    if (!allowed) return { data: null, error: "Unauthorized" };

    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("positions")
      .insert({
        name: params.name,
        level: params.level,
        description: params.description ?? null,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    if (userId) {
      logActivity(supabase, userId, {
        action: "position_create",
        entity_type: "position",
        entity_id: data.id,
        entity_name: data.name,
        new_values: {
          name: data.name,
          level: data.level,
          description: data.description,
        },
      });
    }

    return { data: data as Position, error: null };
  } catch (error) {
    console.error("createPosition failed", error);
    return { data: null, error: "Failed to create position" };
  }
}

export async function updatePosition(
  params: UpdatePositionParams
): Promise<{ data: Position | null; error: string | null }> {
  try {
    const { allowed, userId } = await isAdminOrSuper();
    if (!allowed) return { data: null, error: "Unauthorized" };

    const supabase = await supabaseServer();

    const { data: existing } = await supabase
      .from("positions")
      .select("name, level, description, is_active")
      .eq("id", params.id)
      .single();

    const updatePayload: Record<string, unknown> = {};
    if (params.name !== undefined) updatePayload.name = params.name;
    if (params.level !== undefined) updatePayload.level = params.level;
    if (params.description !== undefined)
      updatePayload.description = params.description;
    if (params.is_active !== undefined)
      updatePayload.is_active = params.is_active;

    const { data, error } = await supabase
      .from("positions")
      .update(updatePayload)
      .eq("id", params.id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    if (userId) {
      logActivity(supabase, userId, {
        action: "position_update",
        entity_type: "position",
        entity_id: params.id,
        entity_name: data.name,
        old_values: existing ?? null,
        new_values: updatePayload,
      });
    }

    return { data: data as Position, error: null };
  } catch (error) {
    console.error("updatePosition failed", error);
    return { data: null, error: "Failed to update position" };
  }
}

export async function getPositionUserCount(
  id: string
): Promise<{ count: number; error: string | null }> {
  try {
    const { allowed } = await isAdminOrSuper();
    if (!allowed) return { count: 0, error: "Unauthorized" };

    const supabase = await supabaseServer();
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("position_id", id);

    if (error) return { count: 0, error: error.message };
    return { count: count ?? 0, error: null };
  } catch (error) {
    console.error("getPositionUserCount failed", error);
    return { count: 0, error: "Failed to check assigned users" };
  }
}

export async function deletePosition(
  id: string
): Promise<{ error: string | null }> {
  try {
    const { allowed, userId } = await isAdminOrSuper();
    if (!allowed) return { error: "Unauthorized" };

    const supabase = await supabaseServer();

    const { data: existing } = await supabase
      .from("positions")
      .select("name")
      .eq("id", id)
      .single();

    const { error } = await supabase.from("positions").delete().eq("id", id);

    if (error) return { error: error.message };

    if (userId) {
      logActivity(supabase, userId, {
        action: "position_delete",
        entity_type: "position",
        entity_id: id,
        entity_name: existing?.name ?? null,
      });
    }

    return { error: null };
  } catch (error) {
    console.error("deletePosition failed", error);
    return { error: "Failed to delete position" };
  }
}
