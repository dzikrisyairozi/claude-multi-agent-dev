"use client";

import { supabase } from "@/integrations/supabase/client";
import { ThreadListItem } from "@/types/thread";

export type ThreadRecord = ThreadListItem;

export async function fetchThreads(mode: "chat" | "mgapp" = "chat"): Promise<ThreadRecord[]> {
  const { data, error } = await supabase
    .from("ai_threads")
    .select("id, title, updated_at")
    .eq("mode", mode)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createThread(title: string, mode: "chat" | "mgapp" = "chat"): Promise<string> {
  const { data, error } = await supabase
    .from("ai_threads")
    .insert({ title, mode })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create thread");
  }

  return data.id;
}

export async function updateThread(
  id: string,
  updates: { title?: string }
): Promise<void> {
  const { error } = await supabase
    .from("ai_threads")
    .update(updates)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteThread(id: string): Promise<void> {
  const { error } = await supabase.from("ai_threads").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
