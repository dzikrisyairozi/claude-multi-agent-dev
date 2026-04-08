"use client";

import { supabase } from "@/integrations/supabase/client";
import {
  FolderRecord,
  CreateFolderPayload,
  UpdateFolderPayload,
  MoveFolderPayload,
  FolderContents,
  BreadcrumbItem,
} from "@/types/folder";
import { DocumentRecord } from "@/types/document";

const FOLDER_SELECT = "id, user_id, parent_id, name, created_at, updated_at";
const DOCUMENT_SELECT =
  "id, user_id, folder_id, file_name, file_path, text_content, mime_type, file_size, file_hash, created_at";

export async function fetchFolders(
  parentId?: string | null
): Promise<FolderRecord[]> {
  let query = supabase
    .from("folders")
    .select(FOLDER_SELECT)
    .order("name", { ascending: true });

  if (parentId === null || parentId === undefined) {
    query = query.is("parent_id", null);
  } else {
    query = query.eq("parent_id", parentId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getFolderById(
  id: string
): Promise<FolderRecord | null> {
  const { data, error } = await supabase
    .from("folders")
    .select(FOLDER_SELECT)
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function createFolder(
  payload: CreateFolderPayload
): Promise<FolderRecord> {
  const { data, error } = await supabase
    .from("folders")
    .insert({
      name: payload.name,
      parent_id: payload.parent_id ?? null,
    })
    .select(FOLDER_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create folder");
  }

  return data;
}

export async function updateFolder(
  id: string,
  payload: UpdateFolderPayload
): Promise<FolderRecord> {
  if (!payload || Object.keys(payload).length === 0) {
    throw new Error("No folder fields provided for update");
  }

  const { data, error } = await supabase
    .from("folders")
    .update(payload)
    .eq("id", id)
    .select(FOLDER_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update folder");
  }

  return data;
}

export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase.from("folders").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

// Check if moving folder would create circular reference
async function wouldCreateCircularReference(
  folderId: string,
  newParentId: string | null
): Promise<boolean> {
  if (!newParentId) return false;
  if (folderId === newParentId) return true;

  // Walk up the tree from newParentId to check if we hit folderId
  let currentId: string | null = newParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) break; // Safety: prevent infinite loop
    visited.add(currentId);

    if (currentId === folderId) return true;

    const response: any = await supabase
      .from("folders")
      .select("parent_id")
      .eq("id", currentId)
      .single<{ parent_id: string | null }>();

    const data = response.data;

    currentId = data?.parent_id ?? null;
  }

  return false;
}

export async function moveFolder(
  id: string,
  payload: MoveFolderPayload
): Promise<FolderRecord> {
  // Check for circular reference
  if (await wouldCreateCircularReference(id, payload.parent_id)) {
    throw new Error("Cannot move folder into itself or its descendants");
  }

  const { data, error } = await supabase
    .from("folders")
    .update({ parent_id: payload.parent_id })
    .eq("id", id)
    .select(FOLDER_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to move folder");
  }

  return data;
}

export async function moveFile(
  fileId: string,
  folderId: string | null
): Promise<DocumentRecord> {
  const { data, error } = await supabase
    .from("documents")
    .update({ folder_id: folderId })
    .eq("id", fileId)
    .select(DOCUMENT_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to move file");
  }

  return data;
}

// Build breadcrumb path from root to folder
async function buildBreadcrumbs(
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
      .single<{ id: string; name: string; parent_id: string | null }>();

    const data = response.data;

    if (!data) break;

    path.unshift({ id: data.id, name: data.name });
    currentId = data.parent_id;
  }

  return [...breadcrumbs, ...path];
}

export async function getFolderContents(
  folderId: string | null
): Promise<FolderContents> {
  // Get current folder info
  let folder: FolderRecord | null = null;
  if (folderId) {
    folder = await getFolderById(folderId);
  }

  // Get subfolders
  const folders = await fetchFolders(folderId);

  // Get documents in this folder
  let documentsQuery = supabase
    .from("documents")
    .select(DOCUMENT_SELECT)
    .order("created_at", { ascending: false });

  if (folderId === null) {
    documentsQuery = documentsQuery.is("folder_id", null);
  } else {
    documentsQuery = documentsQuery.eq("folder_id", folderId);
  }

  const { data: documents, error } = await documentsQuery;

  if (error) {
    throw new Error(error.message);
  }

  // Build breadcrumbs
  const breadcrumbs = await buildBreadcrumbs(folderId);

  return {
    folder,
    folders,
    documents: documents ?? [],
    breadcrumbs,
  };
}
