-- Add content_hash column for deduplication (Item 2)
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS content_hash TEXT DEFAULT NULL;

-- Unique index on (user_id, content_hash) — same content for same user = duplicate
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_user_content_hash
  ON public.documents (user_id, content_hash)
  WHERE content_hash IS NOT NULL;
