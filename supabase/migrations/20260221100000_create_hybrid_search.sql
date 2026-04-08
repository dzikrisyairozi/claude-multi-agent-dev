-- Hybrid search: combines pgvector semantic search + full-text keyword search
-- Uses Reciprocal Rank Fusion (RRF) to merge rankings from both methods.
-- This solves the low-similarity problem for short/specific queries (e.g. person names)
-- where exact keyword match is more reliable than pure vector similarity.

CREATE OR REPLACE FUNCTION public.hybrid_search(
  query_text text,
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  similarity_threshold float DEFAULT 0.0,
  rrf_k int DEFAULT 60
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  document_id uuid,
  content text,
  similarity float,
  -- Joined from documents table:
  file_name text,
  file_path text,
  mime_type text,
  file_size bigint,
  created_at timestamptz,
  folder_id uuid,
  category text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH semantic AS (
    SELECT
      de.id,
      de.user_id,
      de.document_id,
      de.content,
      (1 - (de.embedding <=> query_embedding))::float AS similarity,
      ROW_NUMBER() OVER (ORDER BY de.embedding <=> query_embedding ASC) AS rank_ix
    FROM public.document_embeddings de
    WHERE de.user_id = auth.uid()
  ),
  fulltext AS (
    SELECT
      de.id,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(
          to_tsvector('simple', COALESCE(de.content, '')),
          plainto_tsquery('simple', query_text)
        ) DESC
      ) AS rank_ix
    FROM public.document_embeddings de
    WHERE de.user_id = auth.uid()
      AND to_tsvector('simple', COALESCE(de.content, '')) @@ plainto_tsquery('simple', query_text)
  )
  SELECT
    s.id,
    s.user_id,
    s.document_id,
    s.content,
    s.similarity,
    d.file_name,
    d.file_path,
    d.mime_type,
    d.file_size,
    d.created_at,
    d.folder_id,
    d.category
  FROM semantic s
  LEFT JOIN fulltext f ON s.id = f.id
  JOIN public.documents d ON d.id = s.document_id
  -- Include if: semantic score above threshold OR has a fulltext match
  WHERE s.similarity >= similarity_threshold OR f.id IS NOT NULL
  ORDER BY
    -- RRF: combined rank score (higher = more relevant)
    (1.0 / (rrf_k + s.rank_ix)) + COALESCE(1.0 / (rrf_k + f.rank_ix), 0) DESC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hybrid_search TO authenticated;
