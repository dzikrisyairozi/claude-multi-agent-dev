create extension if not exists "pgcrypto";

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  text_content text,
  created_at timestamptz not null default now()
);

alter table public.documents
  alter column user_id set default auth.uid();

create index if not exists documents_user_id_created_at_idx
  on public.documents (user_id, created_at desc);

alter table public.documents enable row level security;

-- Drop existing policies if they exist
drop policy if exists documents_select_own on public.documents;
drop policy if exists documents_insert_own on public.documents;
drop policy if exists documents_update_own on public.documents;
drop policy if exists documents_delete_own on public.documents;

create policy documents_select_own
  on public.documents
  for select
  using (user_id = auth.uid());

create policy documents_insert_own
  on public.documents
  for insert
  with check (user_id = auth.uid());

create policy documents_update_own
  on public.documents
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy documents_delete_own
  on public.documents
  for delete
  using (user_id = auth.uid());

