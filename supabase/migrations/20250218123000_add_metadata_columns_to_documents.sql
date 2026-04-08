alter table public.documents
  add column if not exists mime_type text,
  add column if not exists file_size bigint;
