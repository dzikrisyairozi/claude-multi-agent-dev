-- Add ai_judgment JSONB column (Item 8)
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS ai_judgment JSONB DEFAULT NULL;

-- GIN index for JSONB containment queries (@>, ?)
CREATE INDEX IF NOT EXISTS idx_documents_ai_judgment_gin
  ON public.documents USING GIN (ai_judgment);

-- B-tree index on extracted document_type for fast type filtering
CREATE INDEX IF NOT EXISTS idx_documents_ai_judgment_type
  ON public.documents ((ai_judgment->>'document_type'));
