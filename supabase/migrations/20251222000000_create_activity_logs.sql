-- Create enum for activity action types (only if it doesn't exist)
do $$ begin
  create type public.activity_action as enum (
    'file_upload',
    'file_delete',
    'file_rename',
    'file_move',
    'folder_create',
    'folder_rename',
    'folder_delete',
    'folder_move',
    'bulk_move',
    'rag_ingest',
    'thread_create',
    'message_insert'
  );
exception
  when duplicate_object then null;
end $$;

-- Create enum for entity types (only if it doesn't exist)
do $$ begin
  create type public.activity_entity_type as enum (
    'file',
    'folder',
    'thread',
    'message',
    'bulk'
  );
exception
  when duplicate_object then null;
end $$;

-- Create activity_logs table
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action public.activity_action not null,
  entity_type public.activity_entity_type not null,
  entity_id uuid,
  entity_name text,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for efficient querying
create index if not exists activity_logs_user_id_created_at_idx
  on public.activity_logs (user_id, created_at desc);

create index if not exists activity_logs_entity_idx
  on public.activity_logs (entity_type, entity_id);

create index if not exists activity_logs_action_idx
  on public.activity_logs (action);

-- Enable RLS
alter table public.activity_logs enable row level security;

-- Helper function to check if user is admin (superadmin or manager)
create or replace function public.is_admin_user()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('superadmin', 'manager')
  )
$$;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own activity logs" on public.activity_logs;
drop policy if exists "Admins can view all activity logs" on public.activity_logs;
drop policy if exists "Users can insert their own activity logs" on public.activity_logs;

-- Policy: Users can view their own logs
create policy "Users can view their own activity logs"
  on public.activity_logs
  for select
  using (user_id = auth.uid());

-- Policy: Admins (superadmin/manager) can view ALL logs
create policy "Admins can view all activity logs"
  on public.activity_logs
  for select
  using (public.is_admin_user());

-- Policy: Insert only own logs (server uses authenticated user context)
create policy "Users can insert their own activity logs"
  on public.activity_logs
  for insert
  with check (user_id = auth.uid());

-- Note: No update or delete policies - activity logs are immutable

