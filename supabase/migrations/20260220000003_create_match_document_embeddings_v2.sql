-- Dual-path search: supports semantic, metadata, and combined search (Item 21)
-- Preserves v1 for backward compatibility
CREATE OR REPLACE FUNCTION public.match_document_embeddings_v2(
  query_embedding vector(1536) DEFAULT NULL,
  match_count int DEFAULT 20,
  similarity_threshold float DEFAULT 0.7,
  filter_document_type text DEFAULT NULL,
  filter_organization text DEFAULT NULL,
  filter_date_from timestamptz DEFAULT NULL,
  filter_date_to timestamptz DEFAULT NULL,
  filter_tags text[] DEFAULT NULL,
  filter_category text DEFAULT NULL
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
  category text,
  ai_judgment jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Path A: Semantic search (query_embedding provided, no filters)
  -- Path B: Metadata search (no query_embedding, filters provided)
  -- Path C: Combined (both provided)

  IF query_embedding IS NULL AND filter_document_type IS NULL AND filter_organization IS NULL
     AND filter_date_from IS NULL AND filter_date_to IS NULL AND filter_tags IS NULL
     AND filter_category IS NULL THEN
    RAISE EXCEPTION 'At least query_embedding or one filter parameter must be provided';
  END IF;

  RETURN QUERY
  SELECT
    de.id,
    de.user_id,
    de.document_id,
    de.content,
    CASE
      WHEN query_embedding IS NOT NULL THEN 1 - (de.embedding <=> query_embedding)
      ELSE 1.0  -- No similarity score for metadata-only search
    END AS similarity,
    d.file_name,
    d.file_path,
    d.mime_type,
    d.file_size,
    d.created_at,
    d.folder_id,
    d.category,
    d.ai_judgment
  FROM public.document_embeddings de
  JOIN public.documents d ON d.id = de.document_id
  WHERE de.user_id = auth.uid()
    -- Vector similarity filter (only when embedding provided)
    AND (query_embedding IS NULL OR 1 - (de.embedding <=> query_embedding) > similarity_threshold)
    -- Metadata filters (applied when provided)
    AND (filter_document_type IS NULL OR d.ai_judgment->>'document_type' = filter_document_type)
    AND (filter_organization IS NULL OR d.ai_judgment->'key_entities'->'organizations' ? filter_organization)
    AND (filter_date_from IS NULL OR d.created_at >= filter_date_from)
    AND (filter_date_to IS NULL OR d.created_at <= filter_date_to)
    AND (filter_tags IS NULL OR d.ai_judgment->'tags' ?| filter_tags)
    AND (filter_category IS NULL OR d.category = filter_category)
  ORDER BY
    CASE WHEN query_embedding IS NOT NULL THEN de.embedding <=> query_embedding ELSE 0 END ASC,
    d.created_at DESC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_document_embeddings_v2 TO authenticated;
