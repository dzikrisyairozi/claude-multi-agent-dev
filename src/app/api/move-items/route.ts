export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/integrations/supabase/server";
import { logActivity } from "@/service/activityLog/activityLog";

type MoveItem = {
  id: string;
  type: "folder" | "file";
};

type MoveItemsRequest = {
  targetFolderId: string | null;
  items: MoveItem[];
};

type MoveResult = {
  id: string;
  type: "folder" | "file";
  success: boolean;
  error?: string;
};

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

// POST /api/move-items - Move multiple folders and files to a target folder
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);

    if (!tokenMatch) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    const accessToken = tokenMatch[1];
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

    const body: MoveItemsRequest = await req.json();
    const { targetFolderId, items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items to move" }, { status: 400 });
    }

    // Verify target folder exists if provided
    if (targetFolderId) {
      const { data: targetFolder, error: targetError } = await supabase
        .from("folders")
        .select("id")
        .eq("id", targetFolderId)
        .single();

      if (targetError || !targetFolder) {
        return NextResponse.json(
          { error: "Target folder not found" },
          { status: 404 }
        );
      }
    }

    const results: MoveResult[] = [];

    // Process each item
    for (const item of items) {
      if (item.type === "folder") {
        // Move folder
        try {
          // Verify folder exists
          const { data: folder, error: fetchError } = await supabase
            .from("folders")
            .select("id, parent_id")
            .eq("id", item.id)
            .single();

          if (fetchError || !folder) {
            results.push({
              id: item.id,
              type: "folder",
              success: false,
              error: "Folder not found",
            });
            continue;
          }

          // Skip if already in target
          if (folder.parent_id === targetFolderId) {
            results.push({ id: item.id, type: "folder", success: true });
            continue;
          }

          // Check for circular reference
          if (
            await wouldCreateCircularReference(
              supabase,
              item.id,
              targetFolderId
            )
          ) {
            results.push({
              id: item.id,
              type: "folder",
              success: false,
              error: "Cannot move folder into itself or its descendants",
            });
            continue;
          }

          const { error } = await supabase
            .from("folders")
            .update({ parent_id: targetFolderId })
            .eq("id", item.id);

          if (error) {
            if (error.code === "23505") {
              results.push({
                id: item.id,
                type: "folder",
                success: false,
                error:
                  "A folder with this name already exists in the target location",
              });
            } else {
              results.push({
                id: item.id,
                type: "folder",
                success: false,
                error: error.message,
              });
            }
          } else {
            results.push({ id: item.id, type: "folder", success: true });
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to move folder";
          results.push({
            id: item.id,
            type: "folder",
            success: false,
            error: message,
          });
        }
      } else if (item.type === "file") {
        // Move file
        try {
          // Verify file exists and belongs to user
          const { data: file, error: fetchError } = await supabase
            .from("documents")
            .select("id, user_id, folder_id")
            .eq("id", item.id)
            .single();

          if (fetchError || !file) {
            results.push({
              id: item.id,
              type: "file",
              success: false,
              error: "File not found",
            });
            continue;
          }

          if (file.user_id !== user.id) {
            results.push({
              id: item.id,
              type: "file",
              success: false,
              error: "Permission denied",
            });
            continue;
          }

          // Skip if already in target
          if (file.folder_id === targetFolderId) {
            results.push({ id: item.id, type: "file", success: true });
            continue;
          }

          const { error } = await supabase
            .from("documents")
            .update({ folder_id: targetFolderId })
            .eq("id", item.id);

          if (error) {
            results.push({
              id: item.id,
              type: "file",
              success: false,
              error: error.message,
            });
          } else {
            results.push({ id: item.id, type: "file", success: true });
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to move file";
          results.push({
            id: item.id,
            type: "file",
            success: false,
            error: message,
          });
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    // Log bulk move activity if any items were successfully moved (fire-and-forget)
    if (successCount > 0) {
      const successfulItems = results.filter((r) => r.success);
      logActivity(supabase, user.id, {
        action: "bulk_move",
        entity_type: "bulk",
        entity_id: null,
        entity_name: `${successCount} items`,
        new_values: {
          target_folder_id: targetFolderId,
          items: successfulItems.map((r) => ({ id: r.id, type: r.type })),
        },
        metadata: {
          total: items.length,
          success: successCount,
          failed: failCount,
        },
      });
    }

    return NextResponse.json({
      results,
      summary: {
        total: items.length,
        success: successCount,
        failed: failCount,
      },
    });
  } catch (error: unknown) {
    console.error("Bulk move failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to move items";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
