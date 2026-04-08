-- Add folder_id to documents table for folder organization
-- NULL folder_id means file is in root

alter table public.documents
  add column if not exists folder_id uuid references public.folders(id) on delete set null;

-- Index for querying files by folder
create index if not exists documents_folder_id_idx
  on public.documents (folder_id);
