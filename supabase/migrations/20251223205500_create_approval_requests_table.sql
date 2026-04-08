-- Create approval_requests table for managing approval workflows
create extension if not exists "pgcrypto";

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  vendor_name text,
  category text,
  amount numeric(15, 2),
  priority text,
  date date,
  document_id uuid references public.documents(id) on delete set null,
  document_url text,
  status text not null default 'pending',
  items jsonb default '[]'::jsonb,
  -- items structure: [{ "name": string, "quantity": number, "amount": number }]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Default user_id to current auth user
alter table public.approval_requests
  alter column user_id set default auth.uid();

-- Indexes for efficient queries
create index if not exists approval_requests_user_id_idx
  on public.approval_requests (user_id);

create index if not exists approval_requests_created_at_idx
  on public.approval_requests (created_at desc);

create index if not exists approval_requests_category_idx
  on public.approval_requests (category);

create index if not exists approval_requests_priority_idx
  on public.approval_requests (priority);

create index if not exists approval_requests_date_idx
  on public.approval_requests (date);

-- Trigger to update updated_at on changes
create or replace function public.set_approval_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_approval_requests_updated_at on public.approval_requests;
create trigger set_approval_requests_updated_at
before update on public.approval_requests
for each row
execute function public.set_approval_requests_updated_at();

-- Row Level Security
alter table public.approval_requests enable row level security;

-- Drop existing policies if they exist
drop policy if exists approval_requests_select_own on public.approval_requests;
drop policy if exists approval_requests_insert_own on public.approval_requests;
drop policy if exists approval_requests_update_own on public.approval_requests;
drop policy if exists approval_requests_delete_own on public.approval_requests;

create policy approval_requests_select_own
  on public.approval_requests
  for select
  using (user_id = auth.uid());

create policy approval_requests_insert_own
  on public.approval_requests
  for insert
  with check (user_id = auth.uid());

create policy approval_requests_update_own
  on public.approval_requests
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy approval_requests_delete_own
  on public.approval_requests
  for delete
  using (user_id = auth.uid());

