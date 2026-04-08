export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/integrations/supabase/server";

type RouteParams =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

type BreadcrumbItem = {
  id: string | null;
  name: string;
};

// Build breadcrumb path from root to folder
async function buildBreadcrumbs(
  supabase: any,
  folderId: string | null
): Promise<BreadcrumbItem[]> {
  const breadcrumbs: BreadcrumbItem[] = [{ id: null, name: "My Files" }];

  if (!folderId) return breadcrumbs;

  const path: BreadcrumbItem[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const response: any = await supabase
      .from("folders")
      .select("id, name, parent_id")
      .eq("id", currentId)
      .single();

    const data = response.data;

    if (!data) break;

    path.unshift({ id: data.id, name: data.name });
    currentId = data.parent_id;
  }

  return [...breadcrumbs, ...path];
}

// GET /api/folders/[id]/contents - Get folder contents (subfolders + files)
// Use "root" as id for root folder
export async function GET(req: NextRequest, context: RouteParams) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const paramId = resolvedParams?.id;

    // "root" means null (root folder)
    const folderId = paramId === "root" ? null : paramId;

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

    // Get current folder info (if not root)
    let folder = null;
    if (folderId) {
      const { data, error } = await supabase
        .from("folders")
        .select("id, user_id, parent_id, name, created_at, updated_at")
        .eq("id", folderId)
        .single();

      if (error && error.code !== "PGRST116") {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json(
          { error: "Folder not found" },
          { status: 404 }
        );
      }

      folder = data;
    }

    // Get subfolders
    let foldersQuery = supabase
      .from("folders")
      .select("id, user_id, parent_id, name, created_at, updated_at")
      .order("name", { ascending: true });

    if (folderId === null) {
      foldersQuery = foldersQuery.is("parent_id", null);
    } else {
      foldersQuery = foldersQuery.eq("parent_id", folderId);
    }

    const { data: folders, error: foldersError } = await foldersQuery;

    if (foldersError) {
      return NextResponse.json(
        { error: foldersError.message },
        { status: 500 }
      );
    }

    // Get documents in this folder
    let documentsQuery = supabase
      .from("documents")
      .select(
        "id, user_id, folder_id, file_name, file_path, text_content, mime_type, file_size, created_at"
      )
      .order("created_at", { ascending: false });

    if (folderId === null) {
      documentsQuery = documentsQuery.is("folder_id", null);
    } else {
      documentsQuery = documentsQuery.eq("folder_id", folderId);
    }

    const { data: documents, error: documentsError } = await documentsQuery;

    if (documentsError) {
      return NextResponse.json(
        { error: documentsError.message },
        { status: 500 }
      );
    }

    // Build breadcrumbs
    const breadcrumbs = await buildBreadcrumbs(supabase, folderId);

    return NextResponse.json({
      folder,
      folders: folders ?? [],
      documents: documents ?? [],
      breadcrumbs,
    });
  } catch (error: unknown) {
    console.error("Folder contents fetch failed", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch folder contents";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
