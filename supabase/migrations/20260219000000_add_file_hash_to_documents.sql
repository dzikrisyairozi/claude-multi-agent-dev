alter table public.documents
  add column if not exists file_hash text;

create unique index if not exists documents_user_id_file_hash_key
  on public.documents (user_id, file_hash)
  where file_hash is not null;
