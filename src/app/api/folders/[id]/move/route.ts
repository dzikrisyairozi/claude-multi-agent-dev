export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/integrations/supabase/server";
import { logActivity } from "@/service/activityLog/activityLog";

type RouteParams =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

// Check if moving folder would create circular reference
async function wouldCreateCircularReference(
  supabase: any,
  folderId: string,
  newParentId: string | null
): Promise<boolean> {
  if (!newParentId) return false;
  if (folderId === newParentId) return true;

  let currentId: string | null = newParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);

    if (currentId === folderId) return true;

    const response: any = await supabase
      .from("folders")
      .select("parent_id")
      .eq("id", currentId)
      .single();

    const data = response.data;

    currentId = data?.parent_id ?? null;
  }

  return false;
}

// PATCH /api/folders/[id]/move - Move folder to new parent
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
    const { parent_id } = body;

    // Verify folder exists (get old parent_id and name for logging)
    const { data: folder, error: fetchError } = await supabase
      .from("folders")
      .select("id, parent_id, name")
      .eq("id", folderId)
      .single();

    if (fetchError || !folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Verify parent folder exists if provided
    if (parent_id) {
      const { data: parentFolder, error: parentError } = await supabase
        .from("folders")
        .select("id")
        .eq("id", parent_id)
        .single();

      if (parentError || !parentFolder) {
        return NextResponse.json(
          { error: "Target folder not found" },
          { status: 404 }
        );
      }
    }

    // Check for circular reference
    if (await wouldCreateCircularReference(supabase, folderId, parent_id)) {
      return NextResponse.json(
        { error: "Cannot move folder into itself or its descendants" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("folders")
      .update({ parent_id: parent_id || null })
      .eq("id", folderId)
      .select("id, user_id, parent_id, name, created_at, updated_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error:
              "A folder with this name already exists in the target location",
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity (fire-and-forget)
    logActivity(supabase, user.id, {
      action: "folder_move",
      entity_type: "folder",
      entity_id: folderId,
      entity_name: data.name,
      old_values: { parent_id: folder.parent_id },
      new_values: { parent_id: data.parent_id },
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Folder move failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to move folder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
