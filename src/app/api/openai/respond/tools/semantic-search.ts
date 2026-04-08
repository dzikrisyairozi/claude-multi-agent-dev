import { SupabaseClient } from "@supabase/supabase-js";
import { embedQuery } from "@/service/rag/embedding";
import { AI_CONFIG } from "../config/ai.config";

interface DocumentMatch {
  document_id: string;
  similarity: number;
  bm25_score: number;
  content: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  file_path: string;
  created_at: string;
  category: string | null;
  folder_id: string | null;
}

export const semanticSearchTool = {
  definition: {
    type: "function",
    function: {
      name: "semantic_search",
      description:
        "Search the user's uploaded documents using semantic similarity. Accepts a natural language query in any language.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Natural language search query.",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 5,
            default: 3,
            description: "Maximum number of results to retrieve.",
          },
        },
        required: ["query"],
      },
    },
  },
  handler: async (
    args: { query: string; limit?: number },
    { supabase }: { supabase: SupabaseClient; user: { id: string } }
  ) => {
    if (!args.query?.trim()) {
      return { error: "Search query is required." };
    }

    const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 20);
    const similarityThreshold = AI_CONFIG.EMBEDDING.SIMILARITY_THRESHOLD;

    const embedding = await embedQuery(args.query);
    console.log(
      `[SemanticSearch] query="${args.query}" | threshold=${similarityThreshold}`
    );

    const { data, error } = await supabase.rpc(
      "hybrid_search",
      {
        query_text: args.query,
        query_embedding: embedding,
        match_count: limit,
        similarity_threshold: similarityThreshold,
      }
    );

    if (error) {
      console.error(`[SemanticSearch] RPC error:`, error.message);
      throw new Error(`Semantic search failed: ${error.message}`);
    }

    // Preserve RRF order from hybrid_search SQL (don't re-sort by similarity)
    const results = (data || []).slice(0, limit);

    const count = results.length;
    console.log(`[SemanticSearch] ${count} results (hybrid: semantic + BM25 via RRF)`);
    results.forEach((r: DocumentMatch, i: number) => {
      console.log(
        `[SemanticSearch]   RRF#${i + 1} ${r.file_name} | sem: ${r.similarity?.toFixed(4)} | bm25: ${r.bm25_score?.toFixed(4)} | "${r.content?.slice(0, 80)}..."`
      );
    });

    if (results.length === 0) return [];

    return results.map((row: DocumentMatch) => ({
      documentId: row.document_id,
      similarity: row.similarity,
      content: row.content,
      file: {
        id: row.document_id,
        name: row.file_name,
        mimeType: row.mime_type,
        size: row.file_size,
        fileUrl: row.file_path,
        modifiedTime: row.created_at,
        category: row.category,
        folderId: row.folder_id,
      },
    }));
  },
} as const;
