-- Migration: Add category column to documents table
-- Purpose: Store document classification/tags (e.g., Invoice, Contract, Report)

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Add index for efficient category filtering
CREATE INDEX IF NOT EXISTS documents_category_idx
  ON public.documents (category);

-- Add comment for documentation
COMMENT ON COLUMN public.documents.category IS
  'Document category/tag for classification (e.g., Invoice, Contract, Report)';
