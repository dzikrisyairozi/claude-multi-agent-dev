-- Hybrid search v4: semantic + BM25 via RRF
-- Improvements over v3:
--   1. Strip metadata prefix from BM25 matching (avoid double-boost)
--   2. Only return results that have at least one keyword match

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
DECLARE
  avg_doc_len float;
  total_docs float;
  k1 float := 1.2;
  b float := 0.75;
BEGIN
  -- Corpus stats for BM25 (scoped to user)
  SELECT
    COALESCE(AVG(LENGTH(de.content))::float, 1.0),
    GREATEST(COUNT(*)::float, 1.0)
  INTO avg_doc_len, total_docs
  FROM public.document_embeddings de
  WHERE de.user_id = auth.uid();

  RETURN QUERY
  WITH
  -- Parse query into individual terms
  query_terms AS (
    SELECT DISTINCT LOWER(term) AS term
    FROM UNNEST(string_to_array(LOWER(query_text), ' ')) AS term
    WHERE LENGTH(term) > 1
  ),
  -- Strip <metadata>...</metadata> block from content for BM25 matching
  user_docs AS (
    SELECT
      de.id,
      regexp_replace(de.content, E'^<metadata>[\\s\\S]*?</metadata>\\n?', '', 'i') AS bm25_content
    FROM public.document_embeddings de
    WHERE de.user_id = auth.uid()
  ),
  -- Fast pre-filter: only docs with at least one query term (on stripped content)
  matched_docs AS (
    SELECT ud.id, ud.bm25_content
    FROM user_docs ud
    WHERE to_tsvector('simple', COALESCE(ud.bm25_content, ''))
          @@ to_tsquery('simple', (
            SELECT string_agg(term, ' | ') FROM query_terms
          ))
  ),
  -- Document frequency per term
  doc_freq AS (
    SELECT
      qt.term,
      COUNT(md.id)::float AS df
    FROM query_terms qt
    CROSS JOIN matched_docs md
    WHERE to_tsvector('simple', md.bm25_content) @@ to_tsquery('simple', qt.term)
    GROUP BY qt.term
  ),
  -- BM25 score per document
  bm25_scores AS (
    SELECT
      md.id,
      SUM(
        -- IDF
        LN((total_docs - COALESCE(df.df, 0) + 0.5) / (COALESCE(df.df, 0) + 0.5) + 1.0)
        *
        -- TF with saturation
        (
          (SELECT COUNT(*)::float FROM regexp_matches(LOWER(md.bm25_content), '\m' || qt.term || '\M', 'g'))
          * (k1 + 1.0)
        )
        / (
          (SELECT COUNT(*)::float FROM regexp_matches(LOWER(md.bm25_content), '\m' || qt.term || '\M', 'g'))
          + k1 * (1.0 - b + b * LENGTH(md.bm25_content)::float / avg_doc_len)
        )
      ) AS score
    FROM matched_docs md
    CROSS JOIN query_terms qt
    LEFT JOIN doc_freq df ON df.term = qt.term
    GROUP BY md.id
  ),
  bm25_ranked AS (
    SELECT
      bs.id,
      bs.score,
      ROW_NUMBER() OVER (ORDER BY bs.score DESC) AS rank_ix
    FROM bm25_scores bs
    WHERE bs.score > 0
  ),
  -- Semantic search
  semantic AS (
    SELECT
      de.id,
      de.user_id,
      de.document_id,
      de.content,
      (1 - (de.embedding <=> query_embedding))::float AS similarity,
      ROW_NUMBER() OVER (ORDER BY de.embedding <=> query_embedding ASC) AS rank_ix
    FROM public.document_embeddings de
    WHERE de.user_id = auth.uid()
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
  LEFT JOIN bm25_ranked br ON s.id = br.id
  JOIN public.documents d ON d.id = s.document_id
  WHERE s.similarity >= similarity_threshold OR br.id IS NOT NULL
  ORDER BY
    -- BM25 matches get boosted via RRF; semantic-only results still appear
    (1.0 / (rrf_k + s.rank_ix)) + COALESCE(1.0 / (rrf_k + br.rank_ix), 0.0) DESC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hybrid_search TO authenticated;
