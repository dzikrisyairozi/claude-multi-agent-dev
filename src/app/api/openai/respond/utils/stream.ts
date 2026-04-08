import { IFileMetadata, ExtractedToolMetadata } from "@/types/file";
import { AI_CONFIG } from "../config/ai.config";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
} as const;

export type { ExtractedToolMetadata };

// Extract metadata from tool responses (approval requests, documents, etc.)
export const extractToolMetadata = (
  toolResponses: { role: string; tool_call_id: string; content: string }[],
): ExtractedToolMetadata => {
  const result: ExtractedToolMetadata = {};
  const allFiles: IFileMetadata[] = [];
  const ragCandidates: { file: IFileMetadata; similarity: number }[] = [];

  for (const response of toolResponses) {
    try {
      const parsed = JSON.parse(response.content);

      // Check if this is a successful create action for an approval request
      if (parsed?.data?.id && parsed?.message === "Approval request created") {
        result.approval_request_id = parsed.data.id;
      }

      // Check if this is a successful folder create action
      if (parsed?.data?.id && parsed?.message === "folders created") {
        result.folder_id = parsed.data.id;
      }

      // Check if this is a propose action returning a proposal
      if (parsed?.type === "proposal" && parsed?.data) {
        result.ringi_proposal = parsed.data;
      }

      // Check if this is a list action with approval_requests array
      if (
        parsed?.approval_requests &&
        Array.isArray(parsed.approval_requests)
      ) {
        const ids = parsed.approval_requests
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((req: any) => req.id)
          .filter(Boolean);
        if (ids.length > 0) {
          result.approval_request_ids = ids;
        }
      }

      // Extract documents from manage_documents tool
      if (parsed?.documents && Array.isArray(parsed.documents)) {
        allFiles.push(...parsed.documents);
      }

      // Extract documents from RAG tool (returns array with file + similarity)
      // Stored as candidates — gap filtering happens after the loop so that only
      // high-confidence matches appear in both rag_sources and the file cards.
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.file) {
            const fileEntry: IFileMetadata = {
              id: item.file.id,
              name: item.file.name,
              mimeType: item.file.mimeType,
              size: item.file.size,
              fileUrl: item.file.fileUrl,
              modifiedTime: item.file.modifiedTime,
              category: item.file.category,
            };
            // Note: NOT pushed to allFiles here — added after gap filtering below
            ragCandidates.push({ file: fileEntry, similarity: item.similarity ?? 0 });
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Apply relative-gap filter to RAG candidates:
  // only files within RAG_SOURCES_SIMILARITY_GAP of the top score are surfaced.
  // Filtered files are added to allFiles (for cards) and rag_sources (for "Sources:").
  if (ragCandidates.length > 0) {
    const seen = new Map<string, number>();
    for (const { file, similarity } of ragCandidates) {
      if (!seen.has(file.id) || seen.get(file.id)! < similarity) {
        seen.set(file.id, similarity);
      }
    }
    const topSimilarity = Math.max(...seen.values());
    const gap = AI_CONFIG.EMBEDDING.RAG_SOURCES_SIMILARITY_GAP;
    const deduped = Array.from(
      new Map(ragCandidates.map(({ file }) => [file.id, file])).values()
    );
    const filtered = deduped.filter(
      (f) => (seen.get(f.id) ?? 0) >= topSimilarity - gap
    );
    // All search results go to file cards; only gap-filtered ones go to rag_sources
    allFiles.push(...deduped);
    result.rag_sources = filtered;
  }

  // Deduplicate files by id — must come after RAG gap filtering above
  if (allFiles.length > 0) {
    result.files = Array.from(
      new Map(allFiles.map((f) => [f.id, f])).values()
    );
  }

  return result;
};

// Stream response with prepended metadata event
export const streamResponseWithMetadata = (
  source: ReadableStream<Uint8Array> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>,
) => {
  if (!source) throw new Error("OpenAI response did not include a stream");

  const encoder = new TextEncoder();
  const metadataEvent = `data: ${JSON.stringify({ type: "tool_metadata", ...metadata })}\n\n`;

  return new Response(
    new ReadableStream({
      async start(controller) {
        // Send metadata first
        controller.enqueue(encoder.encode(metadataEvent));

        // Then stream the OpenAI response
        const reader = source.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
      cancel() {
        source.cancel();
      },
    }),
    { headers: SSE_HEADERS },
  );
};

export const streamResponse = (source: ReadableStream<Uint8Array> | null) => {
  if (!source) throw new Error("OpenAI response did not include a stream");

  return new Response(
    new ReadableStream({
      async start(controller) {
        const reader = source.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
      cancel() {
        source.cancel();
      },
    }),
    { headers: SSE_HEADERS },
  );
};

export const streamText = (content: string) => {
  const encoder = new TextEncoder();
  const created = Math.floor(Date.now() / 1000);
  const payloads = [
    {
      id: `rag_${created}`,
      object: "chat.completion.chunk",
      created,
      model: AI_CONFIG.MODEL,
      choices: [
        {
          index: 0,
          delta: { role: "assistant", content },
          finish_reason: null,
        },
      ],
    },
    {
      id: `rag_${created}_done`,
      object: "chat.completion.chunk",
      created,
      model: AI_CONFIG.MODEL,
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    },
  ];

  return new Response(
    new ReadableStream({
      start(controller) {
        payloads.forEach((chunk) =>
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
          ),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    }),
    { headers: SSE_HEADERS },
  );
};
