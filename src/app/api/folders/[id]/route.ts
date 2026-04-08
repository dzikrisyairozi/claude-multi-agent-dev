export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/integrations/supabase/server";
import { logActivity } from "@/service/activityLog/activityLog";

type RouteParams =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

// GET /api/folders/[id] - Get single folder
export async function GET(req: NextRequest, context: RouteParams) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const folderId = resolvedParams?.id;

    if (!folderId) {
      return NextResponse.json({ error: "Missing folder id" }, { status: 400 });
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

    const { data, error } = await supabase
      .from("folders")
      .select("id, user_id, parent_id, name, created_at, updated_at")
      .eq("id", folderId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Folder not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Folder fetch failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch folder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/folders/[id] - Rename folder
export async function PATCH(req: NextRequest, context: RouteParams) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const folderId = resolvedParams?.id;

    if (!folderId) {
      return NextResponse.json({ error: "Missing folder id" }, { status: 400 });
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
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    // Get old folder name for logging
    const { data: oldFolder } = await supabase
      .from("folders")
      .select("name")
      .eq("id", folderId)
      .single();

    const { data, error } = await supabase
      .from("folders")
      .update({ name: name.trim() })
      .eq("id", folderId)
      .select("id, user_id, parent_id, name, created_at, updated_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A folder with this name already exists in this location" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Log activity (fire-and-forget)
    logActivity(supabase, user.id, {
      action: "folder_rename",
      entity_type: "folder",
      entity_id: folderId,
      entity_name: data.name,
      old_values: { name: oldFolder?.name },
      new_values: { name: data.name },
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Folder rename failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to rename folder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/folders/[id] - Delete folder
export async function DELETE(req: NextRequest, context: RouteParams) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const folderId = resolvedParams?.id;

    if (!folderId) {
      return NextResponse.json({ error: "Missing folder id" }, { status: 400 });
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

    // Get folder info for logging before deletion
    const { data: folderToDelete } = await supabase
      .from("folders")
      .select("id, name, parent_id")
      .eq("id", folderId)
      .single();

    // Move files in this folder to root (set folder_id to null)
    await supabase
      .from("documents")
      .update({ folder_id: null })
      .eq("folder_id", folderId);

    // Delete folder (child folders will cascade delete due to ON DELETE CASCADE)
    const { error } = await supabase
      .from("folders")
      .delete()
      .eq("id", folderId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity (fire-and-forget)
    logActivity(supabase, user.id, {
      action: "folder_delete",
      entity_type: "folder",
      entity_id: folderId,
      entity_name: folderToDelete?.name,
      old_values: {
        name: folderToDelete?.name,
        parent_id: folderToDelete?.parent_id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Folder delete failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete folder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
