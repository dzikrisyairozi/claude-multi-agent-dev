"use server";

import { supabaseAdmin } from "@/integrations/supabase/admin";
import { supabaseServer } from "@/integrations/supabase/server";
import { deleteFileFromS3 } from "@/service/s3/deleteFile";
import type { ResetResult } from "@/types/devTools";

export async function resetUserData(): Promise<{
  data: ResetResult | null;
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

    const errors: string[] = [];
    const deleted = {
      approval_requests: 0,
      documents: 0,
      threads: 0,
      folders: 0,
      activity_logs: 0,
      s3_files: 0,
    };

    // Step 1: Collect all file paths for S3 cleanup
    const { data: docFiles, error: docFilesError } = await supabaseAdmin
      .from("documents")
      .select("file_path");

    if (docFilesError) {
      errors.push(`Failed to fetch document file paths: ${docFilesError.message}`);
    }

    const filePaths = (docFiles ?? [])
      .map((d) => d.file_path)
      .filter(Boolean) as string[];

    // Step 2: Delete approval_requests (cascades → approval_request_documents)
    const { count: approvalCount, error: approvalError } = await supabaseAdmin
      .from("approval_requests")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (approvalError) {
      errors.push(`approval_requests: ${approvalError.message}`);
    } else {
      deleted.approval_requests = approvalCount ?? 0;
    }

    // Step 3: Delete documents (cascades → document_embeddings)
    const { count: docCount, error: docError } = await supabaseAdmin
      .from("documents")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (docError) {
      errors.push(`documents: ${docError.message}`);
    } else {
      deleted.documents = docCount ?? 0;
    }

    // Step 4: Delete ai_threads (cascades → ai_messages)
    const { count: threadCount, error: threadError } = await supabaseAdmin
      .from("ai_threads")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (threadError) {
      errors.push(`ai_threads: ${threadError.message}`);
    } else {
      deleted.threads = threadCount ?? 0;
    }

    // Step 5: Delete folders (self-referencing cascade)
    const { count: folderCount, error: folderError } = await supabaseAdmin
      .from("folders")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (folderError) {
      errors.push(`folders: ${folderError.message}`);
    } else {
      deleted.folders = folderCount ?? 0;
    }

    // Step 6: Delete activity_logs
    const { count: logCount, error: logError } = await supabaseAdmin
      .from("activity_logs")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (logError) {
      errors.push(`activity_logs: ${logError.message}`);
    } else {
      deleted.activity_logs = logCount ?? 0;
    }

    // Step 7: Bulk delete S3 files
    if (filePaths.length > 0) {
      const s3Results = await Promise.allSettled(
        filePaths.map((key) => deleteFileFromS3({ key }))
      );

      let s3Deleted = 0;
      for (const result of s3Results) {
        if (result.status === "fulfilled") {
          s3Deleted++;
        } else {
          errors.push(`S3 delete failed: ${result.reason}`);
        }
      }
      deleted.s3_files = s3Deleted;
    }

    return {
      data: {
        success: errors.length === 0,
        deleted,
        errors,
      },
      error: null,
    };
  } catch (error) {
    console.error("Reset user data failed", error);
    return { data: null, error: "Reset operation failed unexpectedly" };
  }
}
