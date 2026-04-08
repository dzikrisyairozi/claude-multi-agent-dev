export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/integrations/supabase/server";
import { deleteFileFromS3 } from "@/service/s3/deleteFile";
import { logActivity } from "@/service/activityLog/activityLog";

type RouteParams =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, context: RouteParams) {
  try {
    const resolvedParams = await Promise.resolve(context.params);

    const documentId =
      resolvedParams?.id ||
      req.nextUrl.pathname.split("/").filter(Boolean).pop();
    if (!documentId) {
      return NextResponse.json(
        { error: "Missing document id" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: userError?.message || "Unable to authenticate user" },
        { status: 401 }
      );
    }

    const { data: document, error: fetchError } = await supabase
      .from("documents")
      .select("id, user_id, file_name, file_path")
      .eq("id", documentId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (document.user_id !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to delete this file" },
        { status: 403 }
      );
    }

    // Block deletion if the file is linked to an active approval request (Ringi)
    const { data: linkedRequests, error: linkedError } = await supabase
      .from("approval_request_documents")
      .select("approval_request_id, approval_requests!inner(status, title)")
      .eq("document_id", documentId)
      .neq("approval_requests.status", "draft");

    if (linkedError) {
      return NextResponse.json({ error: linkedError.message }, { status: 500 });
    }

    if (linkedRequests && linkedRequests.length > 0) {
      const ringiTitles = linkedRequests
        .map((r) => {
          const ar = r.approval_requests as unknown as { title: string } | null;
          return ar?.title;
        })
        .filter(Boolean);
      return NextResponse.json(
        { error: "FILE_LINKED_TO_RINGI", ringiTitles },
        { status: 400 }
      );
    }

    await deleteFileFromS3({ key: document.file_path });

    const { error: embeddingsDeleteError } = await supabase
      .from("document_embeddings")
      .delete()
      .eq("document_id", documentId);

    if (embeddingsDeleteError) {
      return NextResponse.json(
        { error: embeddingsDeleteError.message },
        { status: 500 }
      );
    }

    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Log activity (fire-and-forget)
    logActivity(supabase, user.id, {
      action: "file_delete",
      entity_type: "file",
      entity_id: documentId,
      entity_name: document.file_name,
      old_values: {
        file_name: document.file_name,
        file_path: document.file_path,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("File delete failed", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete file" },
      { status: 500 }
    );
  }
}
