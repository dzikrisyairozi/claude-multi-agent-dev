-- Create junction table for approval_requests <-> documents relationship
-- This allows each approval request to have multiple documents

create table if not exists public.approval_request_documents (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null references public.approval_requests(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  document_url text,
  created_at timestamptz not null default now()
);

-- Indexes for efficient queries
create index if not exists approval_request_documents_approval_request_id_idx
  on public.approval_request_documents (approval_request_id);

create index if not exists approval_request_documents_document_id_idx
  on public.approval_request_documents (document_id);

-- Row Level Security
alter table public.approval_request_documents enable row level security;

-- Drop existing policies if they exist
drop policy if exists approval_request_documents_select on public.approval_request_documents;
drop policy if exists approval_request_documents_insert on public.approval_request_documents;
drop policy if exists approval_request_documents_update on public.approval_request_documents;
drop policy if exists approval_request_documents_delete on public.approval_request_documents;

-- Policy: Users can select documents for their own approval requests
create policy approval_request_documents_select
  on public.approval_request_documents
  for select
  using (
    exists (
      select 1 from public.approval_requests ar
      where ar.id = approval_request_documents.approval_request_id
        and ar.user_id = auth.uid()
    )
  );

-- Policy: Users can insert documents for their own approval requests
create policy approval_request_documents_insert
  on public.approval_request_documents
  for insert
  with check (
    exists (
      select 1 from public.approval_requests ar
      where ar.id = approval_request_documents.approval_request_id
        and ar.user_id = auth.uid()
    )
  );

-- Policy: Users can update documents for their own approval requests
create policy approval_request_documents_update
  on public.approval_request_documents
  for update
  using (
    exists (
      select 1 from public.approval_requests ar
      where ar.id = approval_request_documents.approval_request_id
        and ar.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.approval_requests ar
      where ar.id = approval_request_documents.approval_request_id
        and ar.user_id = auth.uid()
    )
  );

-- Policy: Users can delete documents for their own approval requests
create policy approval_request_documents_delete
  on public.approval_request_documents
  for delete
  using (
    exists (
      select 1 from public.approval_requests ar
      where ar.id = approval_request_documents.approval_request_id
        and ar.user_id = auth.uid()
    )
  );

-- Migrate existing data: Copy document_id and document_url from approval_requests to the junction table
-- Only insert if document_id or document_url is not null
insert into public.approval_request_documents (approval_request_id, document_id, document_url)
select id, document_id, document_url
from public.approval_requests
where document_id is not null or document_url is not null
on conflict do nothing;
