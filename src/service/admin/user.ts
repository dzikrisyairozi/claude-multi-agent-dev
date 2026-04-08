"use server";

import { supabaseServer } from "@/integrations/supabase/server";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { Profile, CreateUserParams, UpdateUserParams } from "@/types/user";
import { logActivity } from "@/service/activityLog/activityLog";
import { isAdminOrSuper } from "@/service/auth/authorization";

export async function getUsers(): Promise<{
  data: Profile[] | null;
  error: string | null;
}> {
  const { allowed: isAllowed } = await isAdminOrSuper();
  if (!isAllowed) {
    return { data: null, error: "Unauthorized" };
  }

  const supabase = await supabaseServer();

  // Run both queries in parallel
  const [profilesResult, authResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, departments:department_id(id, name), positions:position_id(id, name)")
      .order("created_at", { ascending: false }),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (profilesResult.error) {
    return { data: null, error: profilesResult.error.message };
  }

  const profiles = profilesResult.data;

  if (authResult.error) {
    return { data: profiles as Profile[], error: null };
  }

  // Index auth users by ID for O(1) lookup
  const authUserMap = new Map(
    authResult.data.users.map((u) => [u.id, u])
  );

  // Merge auth metadata into profiles
  const enrichedProfiles = profiles.map((profile) => {
    const authUser = authUserMap.get(profile.id);
    const meta = authUser?.user_metadata ?? {};
    const displayName = meta.full_name || meta.name || meta.display_name || null;

    let firstName: string | null = meta.given_name || meta.first_name || null;
    let lastName: string | null = meta.family_name || meta.last_name || null;
    if (!firstName && displayName) {
      const parts = displayName.trim().split(/\s+/);
      firstName = parts[0];
      if (!lastName && parts.length > 1) {
        lastName = parts.slice(1).join(" ");
      }
    }

    return {
      ...profile,
      department: profile.departments || null,
      position: profile.positions || null,
      display_name: displayName || null,
      first_name: profile.first_name || firstName,
      last_name: profile.last_name || lastName,
      email_confirmed_at: authUser?.email_confirmed_at ?? null,
    };
  });

  return { data: enrichedProfiles as Profile[], error: null };
}

export async function inviteUser(params: CreateUserParams) {
  const supabase = await supabaseServer();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { allowed: isAllowed } = await isAdminOrSuper();
  if (!isAllowed) {
    return { error: "Unauthorized" };
  }

  // Only supabaseAdmin can invite users
  const siteUrl = (
    process.env.NEXT_PUBLIC_WEB_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
  ).replace(/\/+$/, "");
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    params.email,
    {
      data: {
        role: params.role,
        first_name: params.firstName,
        last_name: params.lastName,
      },
      redirectTo: `${siteUrl}/auth/confirm`,
    },
  );

  if (error) {
    return { error: error.message };
  }

  // Auto-activate invited users and update department/position if provided
  if (data?.user) {
    const profileUpdate: Record<string, unknown> = { is_active: true };
    if (params.departmentId) profileUpdate.department_id = params.departmentId;
    if (params.positionId) profileUpdate.position_id = params.positionId;

    await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", data.user.id);
  }

  // Log activity (fire-and-forget)
  if (currentUser && data?.user) {
    const invitedName =
      `${params.firstName || ""} ${params.lastName || ""}`.trim() ||
      params.email;
    logActivity(supabase, currentUser.id, {
      action: "user_invite",
      entity_type: "user",
      entity_id: data.user.id,
      entity_name: invitedName,
      new_values: {
        email: params.email,
        role: params.role,
        first_name: params.firstName,
        last_name: params.lastName,
      },
    });
  }

  return { data, error: null };
}

export async function updateUser(params: UpdateUserParams) {
  const supabase = await supabaseServer();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { allowed: isAllowed } = await isAdminOrSuper();
  if (!isAllowed) {
    return { error: "Unauthorized" };
  }

  // Get current user data for change tracking
  const { data: oldProfile } = await supabase
    .from("profiles")
    .select("role, first_name, last_name, is_active")
    .eq("id", params.id)
    .single();

  // Update auth metadata if needed (optional, keeping sync)
  if (params.role || params.firstName || params.lastName) {
    const updates: Record<string, string> = {};
    if (params.role) updates.role = params.role;
    if (params.firstName) updates.first_name = params.firstName;
    if (params.lastName) updates.last_name = params.lastName;

    await supabaseAdmin.auth.admin.updateUserById(params.id, {
      user_metadata: updates,
    });
  }

  // Build profile update object
  const profileUpdate: Record<string, unknown> = {};
  if (params.role !== undefined) profileUpdate.role = params.role;
  if (params.firstName !== undefined)
    profileUpdate.first_name = params.firstName;
  if (params.lastName !== undefined) profileUpdate.last_name = params.lastName;
  if (params.isActive !== undefined) profileUpdate.is_active = params.isActive;
  if (params.departmentId !== undefined) profileUpdate.department_id = params.departmentId;
  if (params.positionId !== undefined) profileUpdate.position_id = params.positionId;

  // Use server client for profile update
  const { error } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", params.id);

  if (error) {
    return { error: error.message };
  }

  const userName =
    `${params.firstName || oldProfile?.first_name || ""} ${params.lastName || oldProfile?.last_name || ""}`.trim() ||
    "User";

  // Log role change activity if role was updated
  if (currentUser && params.role && oldProfile?.role !== params.role) {
    logActivity(supabase, currentUser.id, {
      action: "user_role_change",
      entity_type: "user",
      entity_id: params.id,
      entity_name: userName,
      old_values: { role: oldProfile?.role },
      new_values: { role: params.role },
    });
  }

  // Log activation status change
  if (
    currentUser &&
    params.isActive !== undefined &&
    oldProfile?.is_active !== params.isActive
  ) {
    logActivity(supabase, currentUser.id, {
      action: params.isActive ? "user_approve" : "user_reject",
      entity_type: "user",
      entity_id: params.id,
      entity_name: userName,
      old_values: { is_active: oldProfile?.is_active },
      new_values: { is_active: params.isActive },
    });
  }

  return { error: null };
}

export async function deleteUser(userId: string) {
  const supabase = await supabaseServer();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { allowed: isAllowed } = await isAdminOrSuper();
  if (!isAllowed) {
    return { error: "Unauthorized" };
  }

  // Get user info before deletion for logging
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, role")
    .eq("id", userId)
    .single();

  // Only supabaseAdmin can delete users
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    return { error: error.message };
  }

  // Log activity (fire-and-forget)
  if (currentUser) {
    const deletedName =
      `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim() ||
      userProfile?.email ||
      "User";
    logActivity(supabase, currentUser.id, {
      action: "user_delete",
      entity_type: "user",
      entity_id: userId,
      entity_name: deletedName,
      old_values: {
        email: userProfile?.email,
        role: userProfile?.role,
        first_name: userProfile?.first_name,
        last_name: userProfile?.last_name,
      },
    });
  }

  return { error: null };
}

export interface PickerProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
  department?: { id: string; name: string } | null;
}

export async function getActiveProfiles(): Promise<{
  data: PickerProfile[] | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role, department:department_id(id, name)")
      .eq("is_active", true)
      .order("first_name", { ascending: true });

    if (error) return { data: null, error: error.message };
    // Supabase returns single-relation joins as objects, but TS types them as arrays
    return { data: data as unknown as PickerProfile[], error: null };
  } catch (error) {
    console.error("getActiveProfiles failed", error);
    return { data: null, error: "Failed to fetch profiles" };
  }
}

export async function resendInvite(userId: string) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    const { allowed } = await isAdminOrSuper();
    if (!allowed) return { error: "Unauthorized" };

    // Get existing profile data before deletion
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, first_name, last_name, role, department_id, position_id")
      .eq("id", userId)
      .single();

    if (!profile || !profile.email) {
      return { error: "User not found" };
    }

    // Delete the old auth user (cascades to profile)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return { error: deleteError.message };
    }

    // Re-invite with the same data
    const siteUrl = (
      process.env.NEXT_PUBLIC_WEB_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
    ).replace(/\/+$/, "");

    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(profile.email, {
        data: {
          role: profile.role,
          first_name: profile.first_name,
          last_name: profile.last_name,
        },
        redirectTo: `${siteUrl}/auth/confirm`,
      });

    if (inviteError) {
      return { error: inviteError.message };
    }

    // Restore profile data (department, position, is_active)
    if (inviteData?.user) {
      const profileUpdate: Record<string, unknown> = { is_active: true };
      if (profile.department_id) profileUpdate.department_id = profile.department_id;
      if (profile.position_id) profileUpdate.position_id = profile.position_id;

      await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", inviteData.user.id);
    }

    // Log activity
    if (currentUser && inviteData?.user) {
      const userName =
        `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
        profile.email;
      logActivity(supabase, currentUser.id, {
        action: "user_invite",
        entity_type: "user",
        entity_id: inviteData.user.id,
        entity_name: userName,
        new_values: { email: profile.email, resend: true },
      });
    }

    return { error: null };
  } catch (err) {
    console.error("Error in resendInvite:", err);
    return { error: "Failed to resend invitation" };
  }
}

export async function approveUser(userId: string) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    const { allowed } = await isAdminOrSuper();
    if (!allowed) return { error: "Unauthorized" };

    // Get user info for logging
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", userId)
      .single();

    // Use server client for profile update
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: true })
      .eq("id", userId);

    if (error) {
      console.error("Error approving user:", error);
      return { error: error.message };
    }

    // Log activity
    if (currentUser) {
      const userName =
        `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim() ||
        userProfile?.email ||
        "User";
      logActivity(supabase, currentUser.id, {
        action: "user_approve",
        entity_type: "user",
        entity_id: userId,
        entity_name: userName,
        new_values: { is_active: true },
      });
    }

    return { error: null };
  } catch (err) {
    console.error("Error in approveUser:", err);
    return { error: "Failed to approve user" };
  }
}

export async function rejectUser(userId: string) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    const { allowed } = await isAdminOrSuper();
    if (!allowed) return { error: "Unauthorized" };

    // Get user info for logging
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", userId)
      .single();

    // Use server client for profile update
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", userId);

    if (error) {
      console.error("Error rejecting user:", error);
      return { error: error.message };
    }

    // Log activity
    if (currentUser) {
      const userName =
        `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim() ||
        userProfile?.email ||
        "User";
      logActivity(supabase, currentUser.id, {
        action: "user_reject",
        entity_type: "user",
        entity_id: userId,
        entity_name: userName,
        new_values: { is_active: false },
      });
    }

    return { error: null };
  } catch (err) {
    console.error("Error in rejectUser:", err);
    return { error: "Failed to reject user" };
  }
}
