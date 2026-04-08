create extension if not exists "vector";

create table if not exists public.document_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  embedding vector(1536) not null,
  content text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.document_embeddings
  alter column user_id set default auth.uid();

create index if not exists document_embeddings_user_id_document_id_idx
  on public.document_embeddings (user_id, document_id);

alter table public.document_embeddings enable row level security;

-- Drop existing policies if they exist
drop policy if exists document_embeddings_select_own on public.document_embeddings;
drop policy if exists document_embeddings_insert_own on public.document_embeddings;

create policy document_embeddings_select_own
  on public.document_embeddings
  for select
  using (user_id = auth.uid());

create policy document_embeddings_insert_own
  on public.document_embeddings
  for insert
  with check (user_id = auth.uid());

