"use server";

import { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/integrations/supabase/server";
import {
  ActivityLogRecord,
  CreateActivityLogPayload,
  ActivityLogFilters,
  ActivityStats,
} from "@/types/activityLog";

const ACTIVITY_LOG_SELECT =
  "id, user_id, action, entity_type, entity_id, entity_name, old_values, new_values, metadata, created_at";

const ACTIVITY_LOG_WITH_ACTOR_SELECT =
  "id, user_id, action, entity_type, entity_id, entity_name, old_values, new_values, metadata, created_at";

/**
 * Log an activity. Call this explicitly in API routes after successful operations.
 * Fire-and-forget: errors are logged but not thrown to avoid breaking main operations.
 */
export async function logActivity(
  supabase: SupabaseClient,
  userId: string,
  payload: CreateActivityLogPayload
): Promise<ActivityLogRecord | null> {
  try {
    const { data, error } = await supabase
      .from("activity_logs")
      .insert({
        user_id: userId,
        action: payload.action,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id ?? null,
        entity_name: payload.entity_name ?? null,
        old_values: payload.old_values ?? null,
        new_values: payload.new_values ?? null,
        metadata: payload.metadata ?? {},
      })
      .select(ACTIVITY_LOG_SELECT)
      .single();

    if (error) {
      console.error("Failed to log activity:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Activity logging error:", err);
    return null;
  }
}

/**
 * Fetch activity logs with optional filters.
 * Regular users see their own logs; admins see all logs (via RLS).
 */
export async function fetchActivityLogs(
  supabase: SupabaseClient,
  filters?: ActivityLogFilters,
  limit = 50,
  offset = 0
): Promise<ActivityLogRecord[]> {
  let query = supabase
    .from("activity_logs")
    .select(ACTIVITY_LOG_SELECT)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.action) {
    query = query.eq("action", filters.action);
  }

  if (filters?.entity_type) {
    query = query.eq("entity_type", filters.entity_type);
  }

  if (filters?.entity_id) {
    query = query.eq("entity_id", filters.entity_id);
  }

  if (filters?.user_id) {
    query = query.eq("user_id", filters.user_id);
  }

  if (filters?.from_date) {
    query = query.gte("created_at", filters.from_date);
  }

  if (filters?.to_date) {
    query = query.lte("created_at", filters.to_date);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Get activity log by ID
 */
export async function getActivityLogById(
  supabase: SupabaseClient,
  id: string
): Promise<ActivityLogRecord | null> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select(ACTIVITY_LOG_SELECT)
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }

  return data ?? null;
}

/**
 * Fetch activity logs with actor information (joined from profiles).
 * Regular users see their own logs; admins see all logs (via RLS).
 */
export async function fetchActivityLogsWithActor(
  supabase: SupabaseClient,
  filters?: ActivityLogFilters,
  limit = 50,
  offset = 0
): Promise<{ data: ActivityLogRecord[]; total: number }> {
  // Build count query
  let countQuery = supabase
    .from("activity_logs")
    .select("id", { count: "exact", head: true });

  // Build data query
  let dataQuery = supabase
    .from("activity_logs")
    .select(ACTIVITY_LOG_WITH_ACTOR_SELECT)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters to both queries
  if (filters?.action) {
    countQuery = countQuery.eq("action", filters.action);
    dataQuery = dataQuery.eq("action", filters.action);
  }

  if (filters?.entity_type) {
    countQuery = countQuery.eq("entity_type", filters.entity_type);
    dataQuery = dataQuery.eq("entity_type", filters.entity_type);
  }

  if (filters?.entity_id) {
    countQuery = countQuery.eq("entity_id", filters.entity_id);
    dataQuery = dataQuery.eq("entity_id", filters.entity_id);
  }

  if (filters?.user_ids && filters.user_ids.length > 0) {
    countQuery = countQuery.in("user_id", filters.user_ids);
    dataQuery = dataQuery.in("user_id", filters.user_ids);
  } else if (filters?.user_id) {
    countQuery = countQuery.eq("user_id", filters.user_id);
    dataQuery = dataQuery.eq("user_id", filters.user_id);
  }

  if (filters?.from_date) {
    countQuery = countQuery.gte("created_at", filters.from_date);
    dataQuery = dataQuery.gte("created_at", filters.from_date);
  }

  if (filters?.to_date) {
    countQuery = countQuery.lte("created_at", filters.to_date);
    dataQuery = dataQuery.lte("created_at", filters.to_date);
  }

  if (filters?.search) {
    const searchPattern = `%${filters.search}%`;
    countQuery = countQuery.ilike("entity_name", searchPattern);
    dataQuery = dataQuery.ilike("entity_name", searchPattern);
  }

  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

  if (countResult.error) {
    throw new Error(countResult.error.message);
  }

  if (dataResult.error) {
    throw new Error(dataResult.error.message);
  }

  const logs = dataResult.data ?? [];

  // Fetch actor profiles separately
  const userIds = [...new Set(logs.map((log: { user_id: string }) => log.user_id))];

  let profilesMap: Record<string, { id: string; first_name: string | null; last_name: string | null; email: string | null; role: string | null }> = {};

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role")
      .in("id", userIds);

    if (profilesError) {
      console.error("Failed to fetch actor profiles:", profilesError.message);
    }

    if (profiles) {
      profilesMap = profiles.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as typeof profilesMap);
    }
  }

  // Transform data to include actor field
  const transformedData = logs.map((log: Record<string, unknown>) => {
    return {
      ...log,
      actor: profilesMap[log.user_id as string] ?? null,
    } as ActivityLogRecord;
  });

  return {
    data: transformedData,
    total: countResult.count ?? 0,
  };
}

/**
 * Get activity statistics for a date range.
 * Counts activities grouped by action type.
 * If userId is provided, filters to only that user's activities.
 */
export async function fetchActivityStats(
  supabase: SupabaseClient,
  fromDate?: string,
  toDate?: string,
  userId?: string
): Promise<ActivityStats> {
  let query = supabase.from("activity_logs").select("action");

  if (fromDate) {
    query = query.gte("created_at", fromDate);
  }

  if (toDate) {
    query = query.lte("created_at", toDate);
  }

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const logs = data ?? [];

  // Count by action type
  const counts = logs.reduce(
    (acc: Record<string, number>, log: { action: string }) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    },
    {}
  );

  // Calculate total form submissions (all submission-related actions)
  const totalFormSubmissions =
    (counts["submission_approve"] || 0) +
    (counts["submission_reject"] || 0) +
    (counts["submission_need_revision"] || 0);

  return {
    users_approved: counts["user_approve"] || 0,
    users_rejected: counts["user_reject"] || 0,
    files_uploaded: counts["file_upload"] || 0,
    files_deleted: counts["file_delete"] || 0,
    files_shared: counts["file_share"] || 0,
    submissions_approved: counts["submission_approve"] || 0,
    submissions_rejected: counts["submission_reject"] || 0,
    submissions_pending: 0, // This would come from approval_requests table
    submissions_need_revision: counts["submission_need_revision"] || 0,
    total_form_submissions: totalFormSubmissions,
  };
}

/**
 * Server action: Get activity logs with actor information.
 */
export async function getActivityLogs(
  filters: ActivityLogFilters = {},
  limit = 10,
  offset = 0
): Promise<{
  data: { logs: ActivityLogRecord[]; total: number } | null;
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

    const result = await fetchActivityLogsWithActor(supabase, filters, limit, offset);

    return {
      data: { logs: result.data, total: result.total },
      error: null,
    };
  } catch (error) {
    console.error("Activity logs fetch failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch activity logs";
    return { data: null, error: message };
  }
}

/**
 * Server action: Get activity statistics.
 * - If userId is provided: Returns stats for that specific user (for employee view)
 * - If userId is not provided: Requires admin role, returns all stats
 */
export async function getActivityStats(
  fromDate?: string,
  toDate?: string,
  userId?: string
): Promise<{ data: ActivityStats | null; error: string | null }> {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError?.message || "Unauthorized" };
    }

    // If userId is provided, allow any authenticated user to see their own stats
    if (userId) {
      // Ensure users can only view their own stats
      if (userId !== user.id) {
        return { data: null, error: "Unauthorized - Can only view own stats" };
      }
      const stats = await fetchActivityStats(supabase, fromDate, toDate, userId);
      return { data: stats, error: null };
    }

    // For team stats (no userId), require admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["platform_admin", "admin"].includes(profile.role)) {
      return { data: null, error: "Unauthorized - Admin access required" };
    }

    const stats = await fetchActivityStats(supabase, fromDate, toDate);

    return { data: stats, error: null };
  } catch (error) {
    console.error("Activity stats fetch failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch activity stats";
    return { data: null, error: message };
  }
}

/**
 * Server action: Get activity logs and stats in a single call.
 * Eliminates double-fetch by sharing auth check and date range filters.
 */
export async function getActivityLogsWithStats(
  filters: ActivityLogFilters = {},
  limit = 10,
  offset = 0,
  userId?: string
): Promise<{
  data: {
    logs: ActivityLogRecord[];
    total: number;
    stats: ActivityStats;
  } | null;
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

    // For team stats (no userId), require admin role
    if (!userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || !["platform_admin", "admin"].includes(profile.role)) {
        return { data: null, error: "Unauthorized - Admin access required" };
      }
    } else if (userId !== user.id) {
      return { data: null, error: "Unauthorized - Can only view own data" };
    }

    // Fetch logs and stats in parallel with a single auth check
    const [logsResult, stats] = await Promise.all([
      fetchActivityLogsWithActor(supabase, filters, limit, offset),
      fetchActivityStats(
        supabase,
        filters.from_date,
        filters.to_date,
        userId,
      ),
    ]);

    return {
      data: {
        logs: logsResult.data,
        total: logsResult.total,
        stats,
      },
      error: null,
    };
  } catch (error) {
    console.error("Activity logs+stats fetch failed", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch activity data";
    return { data: null, error: message };
  }
}
