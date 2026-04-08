-- Conversation tables backing AI chat flows
create extension if not exists "pgcrypto";

create table if not exists public.ai_threads (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_threads(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  role text not null check (role in ('system','user','assistant','tool')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_threads
  alter column created_by set default auth.uid();

alter table public.ai_messages
  alter column created_by set default auth.uid();

create index if not exists ai_threads_created_by_idx
  on public.ai_threads (created_by, created_at desc);

create index if not exists ai_messages_thread_id_idx
  on public.ai_messages (thread_id, created_at desc);

create or replace function public.set_ai_threads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_ai_threads_updated_at on public.ai_threads;
create trigger set_ai_threads_updated_at
before update on public.ai_threads
for each row
execute function public.set_ai_threads_updated_at();

create or replace function public.touch_ai_thread_from_message()
returns trigger
language plpgsql
as $$
begin
  update public.ai_threads
     set updated_at = now()
   where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists touch_ai_thread_from_message on public.ai_messages;
create trigger touch_ai_thread_from_message
after insert on public.ai_messages
for each row
execute function public.touch_ai_thread_from_message();

alter table public.ai_threads enable row level security;
alter table public.ai_messages enable row level security;

-- Drop existing policies if they exist to make migration idempotent
drop policy if exists ai_threads_select_own on public.ai_threads;
drop policy if exists ai_threads_insert_own on public.ai_threads;
drop policy if exists ai_threads_update_own on public.ai_threads;
drop policy if exists ai_threads_delete_own on public.ai_threads;
drop policy if exists ai_messages_select_from_owned_threads on public.ai_messages;
drop policy if exists ai_messages_insert_into_owned_threads on public.ai_messages;
drop policy if exists ai_messages_update_in_owned_threads on public.ai_messages;
drop policy if exists ai_messages_delete_from_owned_threads on public.ai_messages;

create policy ai_threads_select_own
  on public.ai_threads
  for select
  using (created_by = auth.uid());

create policy ai_threads_insert_own
  on public.ai_threads
  for insert
  with check (created_by = auth.uid());

create policy ai_threads_update_own
  on public.ai_threads
  for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy ai_threads_delete_own
  on public.ai_threads
  for delete
  using (created_by = auth.uid());

create policy ai_messages_select_from_owned_threads
  on public.ai_messages
  for select
  using (
    exists (
      select 1
        from public.ai_threads t
       where t.id = ai_messages.thread_id
         and t.created_by = auth.uid()
    )
  );

create policy ai_messages_insert_into_owned_threads
  on public.ai_messages
  for insert
  with check (
    exists (
      select 1
        from public.ai_threads t
       where t.id = ai_messages.thread_id
         and t.created_by = auth.uid()
    )
  );

create policy ai_messages_update_in_owned_threads
  on public.ai_messages
  for update
  using (
    exists (
      select 1
        from public.ai_threads t
       where t.id = ai_messages.thread_id
         and t.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1
        from public.ai_threads t
       where t.id = ai_messages.thread_id
         and t.created_by = auth.uid()
    )
  );

create policy ai_messages_delete_from_owned_threads
  on public.ai_messages
  for delete
  using (
    exists (
      select 1
        from public.ai_threads t
       where t.id = ai_messages.thread_id
         and t.created_by = auth.uid()
    )
  );
