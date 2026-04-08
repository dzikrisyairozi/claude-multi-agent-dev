export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/integrations/supabase/server";
import { logActivity } from "@/service/activityLog/activityLog";

type RouteParams =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

// PATCH /api/files/[id]/move - Move file to a folder (or to root)
export async function PATCH(req: NextRequest, context: RouteParams) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const fileId = resolvedParams?.id;

    if (!fileId) {
      return NextResponse.json({ error: "Missing file id" }, { status: 400 });
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

    const body = await req.json();
    const { folder_id } = body;

    // Verify file exists and belongs to user (get old folder_id for logging)
    const { data: file, error: fetchError } = await supabase
      .from("documents")
      .select("id, user_id, folder_id, file_name")
      .eq("id", fileId)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (file.user_id !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to move this file" },
        { status: 403 }
      );
    }

    // Verify target folder exists if provided
    if (folder_id) {
      const { data: targetFolder, error: folderError } = await supabase
        .from("folders")
        .select("id")
        .eq("id", folder_id)
        .single();

      if (folderError || !targetFolder) {
        return NextResponse.json(
          { error: "Target folder not found" },
          { status: 404 }
        );
      }
    }

    const { data, error } = await supabase
      .from("documents")
      .update({ folder_id: folder_id || null })
      .eq("id", fileId)
      .select(
        "id, user_id, folder_id, file_name, file_path, text_content, mime_type, file_size, created_at"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity (fire-and-forget)
    logActivity(supabase, user.id, {
      action: "file_move",
      entity_type: "file",
      entity_id: fileId,
      entity_name: data.file_name,
      old_values: { folder_id: file.folder_id },
      new_values: { folder_id: data.folder_id },
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("File move failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to move file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
