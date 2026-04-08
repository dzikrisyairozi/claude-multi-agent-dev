-- Hybrid search v2: semantic + BM25 keyword scoring
-- BM25 implemented in pure SQL (no external extensions needed)
-- Parameters: k1=1.2 (term frequency saturation), b=0.75 (length normalization)

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
  doc_count float;
BEGIN
  -- Pre-compute corpus stats for BM25
  SELECT
    COALESCE(AVG(LENGTH(de.content)), 1),
    COALESCE(COUNT(*)::float, 1)
  INTO avg_doc_len, doc_count
  FROM public.document_embeddings de
  WHERE de.user_id = auth.uid();

  RETURN QUERY
  WITH
  -- Split query into individual terms
  query_terms AS (
    SELECT LOWER(UNNEST(string_to_array(query_text, ' '))) AS term
  ),
  -- Compute IDF for each query term: log((N - df + 0.5) / (df + 0.5) + 1)
  term_idf AS (
    SELECT
      qt.term,
      LN(
        (doc_count - COALESCE(df.doc_freq, 0) + 0.5)
        / (COALESCE(df.doc_freq, 0) + 0.5)
        + 1
      ) AS idf
    FROM query_terms qt
    LEFT JOIN (
      SELECT
        qt2.term,
        COUNT(DISTINCT de.id)::float AS doc_freq
      FROM query_terms qt2
      CROSS JOIN public.document_embeddings de
      WHERE de.user_id = auth.uid()
        AND LOWER(de.content) LIKE '%' || qt2.term || '%'
      GROUP BY qt2.term
    ) df ON qt.term = df.term
  ),
  -- BM25 score per document
  bm25 AS (
    SELECT
      de.id,
      SUM(
        ti.idf
        * (
          -- Term frequency: count occurrences of term in content
          (LENGTH(LOWER(de.content)) - LENGTH(REPLACE(LOWER(de.content), ti.term, '')))::float
          / GREATEST(LENGTH(ti.term), 1)
          * (1.2 + 1)
        )
        / (
          (LENGTH(LOWER(de.content)) - LENGTH(REPLACE(LOWER(de.content), ti.term, '')))::float
          / GREATEST(LENGTH(ti.term), 1)
          + 1.2 * (1 - 0.75 + 0.75 * LENGTH(de.content)::float / avg_doc_len)
        )
      ) AS score
    FROM public.document_embeddings de
    CROSS JOIN term_idf ti
    WHERE de.user_id = auth.uid()
    GROUP BY de.id
    HAVING SUM(
      CASE WHEN LOWER(de.content) LIKE '%' || ti.term || '%' THEN 1 ELSE 0 END
    ) > 0
  ),
  bm25_ranked AS (
    SELECT
      bm25.id,
      bm25.score,
      ROW_NUMBER() OVER (ORDER BY bm25.score DESC) AS rank_ix
    FROM bm25
  ),
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
  LEFT JOIN bm25_ranked b ON s.id = b.id
  JOIN public.documents d ON d.id = s.document_id
  WHERE s.similarity >= similarity_threshold OR b.id IS NOT NULL
  ORDER BY
    (1.0 / (rrf_k + s.rank_ix)) + COALESCE(1.0 / (rrf_k + b.rank_ix), 0) DESC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hybrid_search TO authenticated;
