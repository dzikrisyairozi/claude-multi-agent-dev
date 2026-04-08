"use server";

import { supabaseServer } from "@/integrations/supabase/server";
import { isAdminOrSuper } from "@/service/auth/authorization";
import { logActivity } from "@/service/activityLog/activityLog";
import {
  MgappKnowledgeEntry,
  CreateKnowledgeEntryParams,
  UpdateKnowledgeEntryParams,
} from "@/types/mgapp";

export async function getKnowledgeEntries(): Promise<{
  data: MgappKnowledgeEntry[] | null;
  error: string | null;
}> {
  try {
    const { allowed } = await isAdminOrSuper();
    if (!allowed) return { data: null, error: "Unauthorized" };

    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("mgapp_knowledge_entries")
      .select("*")
      .order("category", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data as MgappKnowledgeEntry[], error: null };
  } catch (error) {
    console.error("getKnowledgeEntries failed", error);
    return { data: null, error: "Failed to fetch knowledge entries" };
  }
}

export async function getActiveKnowledgeEntries(): Promise<{
  data: MgappKnowledgeEntry[] | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("mgapp_knowledge_entries")
      .select("*")
      .eq("is_active", true)
      .order("category", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data as MgappKnowledgeEntry[], error: null };
  } catch (error) {
    console.error("getActiveKnowledgeEntries failed", error);
    return { data: null, error: "Failed to fetch knowledge entries" };
  }
}

export async function createKnowledgeEntry(
  params: CreateKnowledgeEntryParams
): Promise<{ data: MgappKnowledgeEntry | null; error: string | null }> {
  try {
    const { allowed, userId } = await isAdminOrSuper();
    if (!allowed) return { data: null, error: "Unauthorized" };

    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("mgapp_knowledge_entries")
      .insert({
        category: params.category,
        question: params.question,
        answer: params.answer,
        routing_contact: params.routing_contact ?? null,
        routing_channel: params.routing_channel ?? null,
        routing_department: params.routing_department ?? null,
        ai_solvability: params.ai_solvability,
        source: params.source ?? null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    if (userId) {
      logActivity(supabase, userId, {
        action: "knowledge_entry_create",
        entity_type: "knowledge_entry",
        entity_id: data.id,
        entity_name: data.question.slice(0, 80),
        new_values: { category: data.category, question: data.question },
      });
    }

    return { data: data as MgappKnowledgeEntry, error: null };
  } catch (error) {
    console.error("createKnowledgeEntry failed", error);
    return { data: null, error: "Failed to create knowledge entry" };
  }
}

export async function updateKnowledgeEntry(
  params: UpdateKnowledgeEntryParams
): Promise<{ data: MgappKnowledgeEntry | null; error: string | null }> {
  try {
    const { allowed, userId } = await isAdminOrSuper();
    if (!allowed) return { data: null, error: "Unauthorized" };

    const supabase = await supabaseServer();

    const { data: existing } = await supabase
      .from("mgapp_knowledge_entries")
      .select("category, question, answer, ai_solvability, is_active")
      .eq("id", params.id)
      .single();

    const updatePayload: Record<string, unknown> = {};
    if (params.category !== undefined) updatePayload.category = params.category;
    if (params.question !== undefined) updatePayload.question = params.question;
    if (params.answer !== undefined) updatePayload.answer = params.answer;
    if (params.routing_contact !== undefined) updatePayload.routing_contact = params.routing_contact;
    if (params.routing_channel !== undefined) updatePayload.routing_channel = params.routing_channel;
    if (params.routing_department !== undefined) updatePayload.routing_department = params.routing_department;
    if (params.ai_solvability !== undefined) updatePayload.ai_solvability = params.ai_solvability;
    if (params.source !== undefined) updatePayload.source = params.source;
    if (params.is_active !== undefined) updatePayload.is_active = params.is_active;

    const { data, error } = await supabase
      .from("mgapp_knowledge_entries")
      .update(updatePayload)
      .eq("id", params.id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    if (userId) {
      logActivity(supabase, userId, {
        action: "knowledge_entry_update",
        entity_type: "knowledge_entry",
        entity_id: params.id,
        entity_name: data.question?.slice(0, 80) ?? null,
        old_values: existing ?? null,
        new_values: updatePayload,
      });
    }

    return { data: data as MgappKnowledgeEntry, error: null };
  } catch (error) {
    console.error("updateKnowledgeEntry failed", error);
    return { data: null, error: "Failed to update knowledge entry" };
  }
}

export async function deleteKnowledgeEntry(
  id: string
): Promise<{ error: string | null }> {
  try {
    const { allowed, userId } = await isAdminOrSuper();
    if (!allowed) return { error: "Unauthorized" };

    const supabase = await supabaseServer();

    const { data: existing } = await supabase
      .from("mgapp_knowledge_entries")
      .select("question")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("mgapp_knowledge_entries")
      .delete()
      .eq("id", id);

    if (error) return { error: error.message };

    if (userId) {
      logActivity(supabase, userId, {
        action: "knowledge_entry_delete",
        entity_type: "knowledge_entry",
        entity_id: id,
        entity_name: existing?.question?.slice(0, 80) ?? null,
      });
    }

    return { error: null };
  } catch (error) {
    console.error("deleteKnowledgeEntry failed", error);
    return { error: "Failed to delete knowledge entry" };
  }
}
