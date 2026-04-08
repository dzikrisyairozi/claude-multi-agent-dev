-- Submission embeddings for semantic search over approval requests (ringi)
-- One embedding per submission (no chunking needed — submissions are short text)

-- 1. Create submission_embeddings table
CREATE TABLE IF NOT EXISTS public.submission_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approval_request_id uuid NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.submission_embeddings
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Unique index: one embedding per submission (enables upsert)
CREATE UNIQUE INDEX IF NOT EXISTS submission_embeddings_approval_request_id_idx
  ON public.submission_embeddings (approval_request_id);

CREATE INDEX IF NOT EXISTS submission_embeddings_user_id_idx
  ON public.submission_embeddings (user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_submission_embeddings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_submission_embeddings_updated_at ON public.submission_embeddings;
CREATE TRIGGER set_submission_embeddings_updated_at
BEFORE UPDATE ON public.submission_embeddings
FOR EACH ROW
EXECUTE FUNCTION public.set_submission_embeddings_updated_at();

-- RLS
ALTER TABLE public.submission_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS submission_embeddings_select_own ON public.submission_embeddings;
DROP POLICY IF EXISTS submission_embeddings_insert_own ON public.submission_embeddings;
DROP POLICY IF EXISTS submission_embeddings_update_own ON public.submission_embeddings;

CREATE POLICY submission_embeddings_select_own
  ON public.submission_embeddings
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY submission_embeddings_insert_own
  ON public.submission_embeddings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY submission_embeddings_update_own
  ON public.submission_embeddings
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- 2. match_submission_embeddings RPC (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.match_submission_embeddings(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  similarity_threshold float DEFAULT 0.25,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  approval_request_id uuid,
  content text,
  similarity float,
  title text,
  vendor_name text,
  category text,
  amount numeric,
  priority text,
  status text,
  department text,
  date date,
  submitter_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.id,
    se.approval_request_id,
    se.content,
    (1 - (se.embedding <=> query_embedding))::float AS similarity,
    ar.title,
    ar.vendor_name,
    ar.category,
    ar.amount,
    ar.priority,
    ar.status,
    ar.department,
    ar.date,
    COALESCE(p.first_name || ' ' || p.last_name, p.first_name, p.last_name, 'Unknown')::text AS submitter_name,
    ar.created_at
  FROM public.submission_embeddings se
  JOIN public.approval_requests ar ON ar.id = se.approval_request_id
  LEFT JOIN public.profiles p ON p.id = ar.user_id
  WHERE 1 - (se.embedding <=> query_embedding) > similarity_threshold
    AND (p_user_id IS NULL OR ar.user_id = p_user_id)
  ORDER BY se.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_submission_embeddings TO authenticated;


-- 3. Superadmin RLS policies on approval_requests
-- Currently only user_id = auth.uid() policies exist — superadmin cannot see others' submissions

DROP POLICY IF EXISTS approval_requests_select_superadmin ON public.approval_requests;
DROP POLICY IF EXISTS approval_requests_update_superadmin ON public.approval_requests;

CREATE POLICY approval_requests_select_superadmin
  ON public.approval_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY approval_requests_update_superadmin
  ON public.approval_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );
