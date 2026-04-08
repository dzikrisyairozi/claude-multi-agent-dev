"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { checkDocumentsExist } from "@/service/document/document";
import { ConversationMessage } from "@/types/conversation";

export function useDeletedFiles(messages: ConversationMessage[]) {
  // Collect only message.files IDs — these are the ones rendered as cards.
  // rag_sources are AI context only and never rendered, so skip them.
  const allFileIds = useMemo(() => {
    const ids = new Set<string>();
    for (const msg of messages) {
      for (const f of msg.files ?? []) {
        if (f.id && !f.id.startsWith("temp-") && !f.id.startsWith("optimistic-")) {
          ids.add(f.id);
        }
      }
    }
    // Sort for a stable, deterministic query key regardless of insertion order.
    // This prevents cache misses when the same IDs appear in different order
    // (e.g. streaming re-renders re-creating the messages array).
    return Array.from(ids).sort();
  }, [messages]);

  // Use the sorted, joined string as the cache key so identical ID sets always
  // hit the same cache entry even if messages reference changes.
  const { data: existingIds } = useQuery({
    queryKey: ["documentsExist", allFileIds.join(",")],
    queryFn: () => checkDocumentsExist(allFileIds),
    enabled: allFileIds.length > 0,
    staleTime: 5 * 60_000,       // 5 minutes — files rarely deleted mid-chat
    gcTime: 10 * 60_000,         // keep in cache 10 minutes
    refetchOnWindowFocus: false, // tab switches should not re-check existence
  });

  const deletedFileIds = useMemo<Set<string>>(() => {
    if (!existingIds || allFileIds.length === 0) return new Set();
    return new Set(allFileIds.filter((id) => !existingIds.has(id)));
  }, [existingIds, allFileIds]);

  return { deletedFileIds };
}
