export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/integrations/supabase/server";
import { logActivity } from "@/service/activityLog/activityLog";

type RouteParams =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

// PATCH /api/files/[id]/rename - Rename a file
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
    const { file_name } = body;

    if (
      !file_name ||
      typeof file_name !== "string" ||
      file_name.trim() === ""
    ) {
      return NextResponse.json(
        { error: "File name is required" },
        { status: 400 }
      );
    }

    // Verify file exists and belongs to user (get old name for logging)
    const { data: file, error: fetchError } = await supabase
      .from("documents")
      .select("id, user_id, file_name")
      .eq("id", fileId)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (file.user_id !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to rename this file" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("documents")
      .update({ file_name: file_name.trim() })
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
      action: "file_rename",
      entity_type: "file",
      entity_id: fileId,
      entity_name: data.file_name,
      old_values: { file_name: file.file_name },
      new_values: { file_name: data.file_name },
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("File rename failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to rename file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
