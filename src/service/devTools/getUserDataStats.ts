"use server";

import { supabaseAdmin } from "@/integrations/supabase/admin";
import { supabaseServer } from "@/integrations/supabase/server";
import type { UserDataStats } from "@/types/devTools";

export async function getUserDataStats(): Promise<{
  data: UserDataStats | null;
  error: string | null;
}> {
  try {
    if (process.env.NEXT_PUBLIC_DEV_TOOLS !== "true") {
      return { data: null, error: "Dev tools are disabled" };
    }

    const supabase = await supabaseServer();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: "Unauthorized" };
    }

    const [
      threadsResult,
      messagesResult,
      documentsResult,
      embeddingsResult,
      approvalRequestsResult,
      foldersResult,
      activityLogsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("ai_threads")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("ai_messages")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("documents")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("document_embeddings")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("approval_requests")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("folders")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("activity_logs")
        .select("*", { count: "exact", head: true }),
    ]);

    return {
      data: {
        threads: threadsResult.count ?? 0,
        messages: messagesResult.count ?? 0,
        documents: documentsResult.count ?? 0,
        embeddings: embeddingsResult.count ?? 0,
        approval_requests: approvalRequestsResult.count ?? 0,
        folders: foldersResult.count ?? 0,
        activity_logs: activityLogsResult.count ?? 0,
      },
      error: null,
    };
  } catch (error) {
    console.error("Failed to fetch user data stats", error);
    return { data: null, error: "Failed to fetch stats" };
  }
}
