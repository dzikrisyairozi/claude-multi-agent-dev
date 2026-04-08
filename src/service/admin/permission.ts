"use server";

import { supabaseServer } from "@/integrations/supabase/server";
import { isAdminOrSuper } from "@/service/auth/authorization";
import { logActivity } from "@/service/activityLog/activityLog";
import {
  Permission,
  RolePermission,
  UpdateRolePermissionParams,
  PermissionMatrixRow,
  PermissionValue,
} from "@/types/permission";
import { UserRole } from "@/types/user";

const ALL_ROLES: UserRole[] = [
  "approver",
  "requester",
  "accounting",
  "admin",
  "platform_admin",
];

export async function getPermissions(): Promise<{
  data: Permission[] | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("permissions")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data as Permission[], error: null };
  } catch (error) {
    console.error("getPermissions failed", error);
    return { data: null, error: "Failed to fetch permissions" };
  }
}

export async function getRolePermissions(
  role?: UserRole
): Promise<{
  data: RolePermission[] | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();
    let query = supabase
      .from("role_permissions")
      .select("*, permissions(*)")
      .order("created_at", { ascending: true });

    if (role) {
      query = query.eq("role", role);
    }

    const { data, error } = await query;

    if (error) return { data: null, error: error.message };
    return { data: data as RolePermission[], error: null };
  } catch (error) {
    console.error("getRolePermissions failed", error);
    return { data: null, error: "Failed to fetch role permissions" };
  }
}

export async function getPermissionMatrix(): Promise<{
  data: PermissionMatrixRow[] | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();

    // Fetch all permissions
    const { data: permissions, error: permError } = await supabase
      .from("permissions")
      .select("*")
      .order("sort_order", { ascending: true });

    if (permError) return { data: null, error: permError.message };

    // Fetch all role permissions
    const { data: rolePerms, error: rpError } = await supabase
      .from("role_permissions")
      .select("role, permission_id, permission");

    if (rpError) return { data: null, error: rpError.message };

    // Build a lookup: permissionId -> { role: value }
    const rpMap: Record<string, Record<string, PermissionValue>> = {};
    for (const rp of rolePerms ?? []) {
      if (!rpMap[rp.permission_id]) rpMap[rp.permission_id] = {};
      rpMap[rp.permission_id][rp.role] =
        rp.permission as PermissionValue;
    }

    // Build matrix rows
    const rows: PermissionMatrixRow[] = (permissions ?? []).map((p) => {
      const values: Record<string, PermissionValue> = {};
      for (const role of ALL_ROLES) {
        values[role] = rpMap[p.id]?.[role] ?? "denied";
      }
      return {
        action: p.code,
        category: p.category,
        name: p.name,
        description: p.description,
        permissionId: p.id,
        values,
      } as PermissionMatrixRow;
    });

    return { data: rows, error: null };
  } catch (error) {
    console.error("getPermissionMatrix failed", error);
    return { data: null, error: "Failed to fetch permission matrix" };
  }
}

export async function updateRolePermission(
  params: UpdateRolePermissionParams
): Promise<{ error: string | null }> {
  try {
    const { allowed, userId } = await isAdminOrSuper();
    if (!allowed) return { error: "Unauthorized" };

    const supabase = await supabaseServer();

    // Get the old value
    const { data: existing } = await supabase
      .from("role_permissions")
      .select("permission")
      .eq("role", params.role)
      .eq("permission_id", params.permissionId)
      .single();

    const { error } = await supabase
      .from("role_permissions")
      .update({ permission: params.permission })
      .eq("role", params.role)
      .eq("permission_id", params.permissionId);

    if (error) return { error: error.message };

    // Get permission name for logging
    const { data: permDef } = await supabase
      .from("permissions")
      .select("name, code")
      .eq("id", params.permissionId)
      .single();

    if (userId) {
      logActivity(supabase, userId, {
        action: "permission_update",
        entity_type: "permission",
        entity_id: params.permissionId,
        entity_name: `${params.role}: ${permDef?.name ?? params.permissionId}`,
        old_values: { permission: existing?.permission },
        new_values: {
          role: params.role,
          permission: params.permission,
          action: permDef?.code,
        },
      });
    }

    return { error: null };
  } catch (error) {
    console.error("updateRolePermission failed", error);
    return { error: "Failed to update role permission" };
  }
}
