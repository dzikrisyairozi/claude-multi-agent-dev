"use client";

import { supabase } from "@/integrations/supabase/client";
import { DocumentRecord } from "@/types/document";

export async function fetchDocuments(
  limit = 50
): Promise<DocumentRecord[]> {
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, user_id, file_name, file_path, text_content, mime_type, file_size, file_hash, created_at, folder_id"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getDocumentById(
  id: string
): Promise<DocumentRecord | null> {
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, user_id, file_name, file_path, text_content, mime_type, file_size, file_hash, created_at, folder_id"
    )
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }

  return data ?? null;
}

export type CreateDocumentPayload = {
  file_name: string;
  file_path: string;
  text_content?: string | null;
};

export async function createDocument(
  payload: CreateDocumentPayload
): Promise<DocumentRecord> {
  const { data, error } = await supabase
    .from("documents")
    .insert({
      file_name: payload.file_name,
      file_path: payload.file_path,
      text_content: payload.text_content ?? null,
    })
    .select(
      "id, user_id, file_name, file_path, text_content, mime_type, file_size, file_hash, created_at, folder_id"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create document");
  }

  return data;
}

export type UpdateDocumentPayload = {
  file_name?: string;
  file_path?: string;
  text_content?: string | null;
};

export async function updateDocument(
  id: string,
  payload: UpdateDocumentPayload
): Promise<DocumentRecord> {
  if (!payload || Object.keys(payload).length === 0) {
    throw new Error("No document fields provided for update");
  }

  const { data, error } = await supabase
    .from("documents")
    .update({
      ...payload,
      text_content:
        payload.text_content === undefined ? undefined : payload.text_content,
    })
    .eq("id", id)
    .select(
      "id, user_id, file_name, file_path, text_content, mime_type, file_size, file_hash, created_at, folder_id"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update document");
  }

  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function checkDocumentsExist(
  ids: string[]
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data } = await supabase
    .from("documents")
    .select("id")
    .in("id", ids);
  return new Set((data ?? []).map((d) => d.id));
}
