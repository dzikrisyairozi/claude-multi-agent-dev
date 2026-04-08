-- Semantic-only search with document JOIN (no metadata filters)
-- Preserves v1 and v2 for backward compatibility
CREATE OR REPLACE FUNCTION public.match_document_embeddings_v3(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  similarity_threshold float DEFAULT 0.7
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
  SELECT
    de.id,
    de.user_id,
    de.document_id,
    de.content,
    (1 - (de.embedding <=> query_embedding))::float AS similarity,
    d.file_name,
    d.file_path,
    d.mime_type,
    d.file_size,
    d.created_at,
    d.folder_id,
    d.category
  FROM public.document_embeddings de
  JOIN public.documents d ON d.id = de.document_id
  WHERE de.user_id = auth.uid()
    AND 1 - (de.embedding <=> query_embedding) > similarity_threshold
  ORDER BY de.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_document_embeddings_v3 TO authenticated;
