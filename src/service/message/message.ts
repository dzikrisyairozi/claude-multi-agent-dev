"use client";

import { supabase } from "@/integrations/supabase/client";
import { MessageRecord } from "@/types/message";
import { ThreadListItem } from "@/types/thread";

export type ThreadRecord = ThreadListItem;

export async function fetchMessages(
  threadId: string
): Promise<MessageRecord[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("id, role, content, metadata, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function insertMessage(
  threadId: string,
  payload: {
    role: "user" | "assistant";
    content: string;
    metadata?: Record<string, any> | null;
  }
): Promise<MessageRecord> {
  const { data, error } = await supabase
    .from("ai_messages")
    .insert({
      thread_id: threadId,
      role: payload.role,
      content: payload.content,
      metadata: payload.metadata ?? {},
    })
    .select("id, role, content, metadata, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save message");
  }

  return data;
}
