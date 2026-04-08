-- Create folders table for hierarchical file organization
create extension if not exists "pgcrypto";

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Default user_id to current auth user
alter table public.folders
  alter column user_id set default auth.uid();

-- Indexes for efficient queries
create index if not exists folders_user_id_idx
  on public.folders (user_id);

create index if not exists folders_parent_id_idx
  on public.folders (parent_id);

-- Unique constraint: no duplicate folder names within same parent for same user
-- Using coalesce to handle NULL parent_id (root level folders)
create unique index if not exists folders_user_parent_name_unique
  on public.folders (user_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

-- Trigger to update updated_at on changes
create or replace function public.set_folders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_folders_updated_at on public.folders;
create trigger set_folders_updated_at
before update on public.folders
for each row
execute function public.set_folders_updated_at();

-- Row Level Security
alter table public.folders enable row level security;

-- Drop existing policies if they exist
drop policy if exists folders_select_own on public.folders;
drop policy if exists folders_insert_own on public.folders;
drop policy if exists folders_update_own on public.folders;
drop policy if exists folders_delete_own on public.folders;

create policy folders_select_own
  on public.folders
  for select
  using (user_id = auth.uid());

create policy folders_insert_own
  on public.folders
  for insert
  with check (user_id = auth.uid());

create policy folders_update_own
  on public.folders
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy folders_delete_own
  on public.folders
  for delete
  using (user_id = auth.uid());

