export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/integrations/supabase/server";
import { logActivity } from "@/service/activityLog/activityLog";

// GET /api/folders - List folders (optionally filter by parent_id)
export async function GET(req: NextRequest) {
  try {
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

    const parentId = req.nextUrl.searchParams.get("parent_id");

    let query = supabase
      .from("folders")
      .select("id, user_id, parent_id, name, created_at, updated_at")
      .order("name", { ascending: true });

    if (parentId === null || parentId === "null" || parentId === "") {
      query = query.is("parent_id", null);
    } else if (parentId) {
      query = query.eq("parent_id", parentId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error: unknown) {
    console.error("Folders fetch failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch folders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/folders - Create a new folder
export async function POST(req: NextRequest) {
  try {
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
    const { name, parent_id } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    // Verify parent folder exists and belongs to user if provided
    if (parent_id) {
      const { data: parentFolder, error: parentError } = await supabase
        .from("folders")
        .select("id")
        .eq("id", parent_id)
        .single();

      if (parentError || !parentFolder) {
        return NextResponse.json(
          { error: "Parent folder not found" },
          { status: 404 }
        );
      }
    }

    const { data, error } = await supabase
      .from("folders")
      .insert({
        name: name.trim(),
        parent_id: parent_id || null,
      })
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

    // Log activity (fire-and-forget)
    logActivity(supabase, user.id, {
      action: "folder_create",
      entity_type: "folder",
      entity_id: data.id,
      entity_name: data.name,
      new_values: {
        name: data.name,
        parent_id: data.parent_id,
      },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    console.error("Folder creation failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to create folder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
