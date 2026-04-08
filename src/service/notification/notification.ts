"use server";

import { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/integrations/supabase/server";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import {
  Notification,
  CreateNotificationPayload,
} from "@/types/notification";

/**
 * Create a notification. Fire-and-forget: errors are logged but not thrown.
 */
export async function createNotification(
  supabase: SupabaseClient,
  payload: CreateNotificationPayload
): Promise<Notification | null> {
  try {
    const { error } = await supabase
      .from("notifications")
      .insert({
        recipient_id: payload.recipient_id,
        actor_id: payload.actor_id ?? null,
        type: payload.type,
        title: payload.title,
        message: payload.message ?? null,
        approval_request_id: payload.approval_request_id ?? null,
        requires_action: payload.requires_action ?? false,
        step_order: payload.step_order ?? null,
      });

    if (error) {
      console.error("Failed to create notification:", error.message);
      return null;
    }

    return null;
  } catch (err) {
    console.error("Notification creation error:", err);
    return null;
  }
}

/**
 * Server action: Get notifications for the current user.
 */
export async function getNotifications(
  limit = 50
): Promise<{
  data: Notification[] | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Notification[], error: null };
  } catch (error) {
    console.error("Failed to fetch notifications", error);
    return { data: null, error: "Failed to fetch notifications" };
  }
}

/**
 * Server action: Mark a single notification as read.
 */
export async function markNotificationRead(
  id: string
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

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("recipient_id", user.id);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error("Failed to mark notification as read", error);
    return { error: "Failed to mark notification as read" };
  }
}

/**
 * Server action: Mark all notifications as read for the current user.
 */
export async function markAllNotificationsRead(): Promise<{
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("recipient_id", user.id)
      .eq("is_read", false);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error("Failed to mark all notifications as read", error);
    return { error: "Failed to mark all notifications as read" };
  }
}

/**
 * Server action: Complete the action on all actionable notifications
 * for ALL users related to a specific approval request (optionally scoped to a step).
 * Called when anyone acts on a submission step (approve/reject/revision).
 * Uses supabaseAdmin to bypass RLS (own_update policy limits to recipient_id).
 *
 * @param stepOrder - When provided, only complete notifications for that specific step.
 *                    When omitted, complete ALL actionable notifications for the request.
 */
export async function completeNotificationAction(
  approvalRequestId: string,
  stepOrder?: number
): Promise<{ error: string | null }> {
  try {
    let query = supabaseAdmin
      .from("notifications")
      .update({ action_completed_at: new Date().toISOString() })
      .eq("approval_request_id", approvalRequestId)
      .eq("requires_action", true)
      .is("action_completed_at", null);

    if (stepOrder != null) {
      query = query.eq("step_order", stepOrder);
    }

    const { error } = await query;

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error("Failed to complete notification action", error);
    return { error: "Failed to complete notification action" };
  }
}
