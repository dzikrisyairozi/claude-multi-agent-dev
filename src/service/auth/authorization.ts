"use server";

import { supabaseServer } from "@/integrations/supabase/server";
import { UserRole } from "@/types/user";
import { PermissionAction, PermissionValue } from "@/types/permission";

export async function getCurrentUserProfile(): Promise<{
  userId: string | null;
  role: UserRole | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    const user = session?.user;

    if (authError || !user) return { userId: null, role: null, error: "Unauthorized" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (profile?.is_active !== true) {
      return { userId: null, role: null, error: "Account is not active" };
    }

    return {
      userId: user.id,
      role: (profile?.role as UserRole) ?? null,
      error: null,
    };
  } catch {
    return { userId: null, role: null, error: "Failed to get user profile" };
  }
}

export async function isAdminOrSuper(): Promise<{
  allowed: boolean;
  userId: string | null;
}> {
  const { userId, role } = await getCurrentUserProfile();
  return {
    allowed: role === "admin" || role === "platform_admin",
    userId,
  };
}

export async function hasRole(
  allowedRoles: UserRole[]
): Promise<{ allowed: boolean; userId: string | null }> {
  const { userId, role } = await getCurrentUserProfile();
  return {
    allowed: role !== null && allowedRoles.includes(role),
    userId,
  };
}

export async function checkPermission(
  action: PermissionAction
): Promise<{
  allowed: boolean;
  permission: PermissionValue;
  userId: string | null;
  userRole: UserRole | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user;

    if (!user) {
      return {
        allowed: false,
        permission: "denied",
        userId: null,
        userRole: null,
        error: "Unauthorized",
      };
    }

    // Verify user is active before checking permissions
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (profile?.is_active !== true) {
      return {
        allowed: false,
        permission: "denied",
        userId: user.id,
        userRole: null,
        error: "Account is not active",
      };
    }

    const { data, error } = await supabase.rpc("check_user_permission", {
      p_user_id: user.id,
      p_action: action,
    });

    if (error) {
      console.error("checkPermission RPC error:", error.message);
      return {
        allowed: false,
        permission: "denied",
        userId: user.id,
        userRole: null,
        error: error.message,
      };
    }

    const permissionValue = (data as PermissionValue) || "denied";

    return {
      allowed: permissionValue !== "denied",
      permission: permissionValue,
      userId: user.id,
      userRole: (profile?.role as UserRole) ?? null,
      error: null,
    };
  } catch {
    return {
      allowed: false,
      permission: "denied",
      userId: null,
      userRole: null,
      error: "Failed to check permission",
    };
  }
}
