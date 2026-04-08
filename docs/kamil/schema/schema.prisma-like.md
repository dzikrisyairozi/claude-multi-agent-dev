# Supabase Schema (Prisma-like) — Snapshot 2026-02-21

## Enums

```
enum user_role {
  superadmin
  manager
  employee
  accountant
}

enum activity_action {
  file_upload
  file_delete
  file_rename
  file_move
  folder_create
  folder_rename
  folder_delete
  folder_move
  bulk_move
  rag_ingest
  thread_create
  message_insert
  user_invite
  user_approve
  user_reject
  user_role_change
  user_delete
  file_share
  submission_approve
  submission_reject
  submission_need_revision
}

enum activity_entity_type {
  file
  folder
  thread
  message
  bulk
  user
  submission
}
```

## Tables

```
model profiles {
  id          String     @id @default(uuid()) → auth.users
  email       String?
  first_name  String?
  last_name   String?
  role        user_role  @default(employee)
  is_active   Boolean?
  created_at  DateTime   @default(now())
  updated_at  DateTime   @default(now())
}

model ai_threads {
  id          String     @id @default(uuid())
  created_by  String     → auth.users
  title       String?
  summary     String?
  metadata    Json       @default({})
  created_at  DateTime   @default(now())
  updated_at  DateTime   @default(now())

  messages    ai_messages[]
}

model ai_messages {
  id          String     @id @default(uuid())
  thread_id   String     → ai_threads.id (cascade delete)
  created_by  String?    → auth.users
  role        String     // system | user | assistant | tool
  content     String
  metadata    Json       @default({})
  created_at  DateTime   @default(now())
}

model documents {
  id            String     @id @default(uuid())
  user_id       String     → auth.users
  file_name     String
  file_path     String     // S3 key
  mime_type     String?
  file_size     Int?
  text_content  String?    // populated after RAG ingestion
  content_hash  String?    // SHA-256 of text_content (dedup)
  file_hash     String?    // SHA-256 of raw file bytes (dedup)
  ai_judgment   Json?      // legacy: structured metadata from AI analysis
  category      String?
  folder_id     String?    → folders.id
  created_at    DateTime   @default(now())

  embeddings    document_embeddings[]
  folder        folders?
}

model document_embeddings {
  id            String     @id @default(uuid())
  user_id       String     → auth.users
  document_id   String     → documents.id (cascade delete)
  embedding     Vector(1536)  // pgvector
  content       String?    // chunk text
  metadata      Json       @default({})  // { chunk_index, file_name, file_path, length }

  document      documents
}

model folders {
  id          String     @id @default(uuid())
  user_id     String     → auth.users
  name        String
  parent_id   String?    → folders.id (self-referencing)
  created_at  DateTime   @default(now())
  updated_at  DateTime   @default(now())

  documents   documents[]
  children    folders[]
}

model approval_requests {
  id                      String     @id @default(uuid())
  user_id                 String     → auth.users
  title                   String
  description             String?
  category                String?
  amount                  Float?
  status                  String     @default("pending")  // pending | approved | rejected | need_revision | cancelled
  priority                String?
  date                    String?
  department              String?
  vendor_name             String?
  items                   Json?      // [{name, quantity, unit_price, amount}]
  is_use_tax              Boolean?
  is_tax_included         Boolean?
  tax_rate                Float?
  payment_method          String?
  payment_schedule_date   String?
  purpose                 String?
  reason_for_purchase     String?
  remarks                 String?
  approved_by             String?    → auth.users
  rejected_by             String?    → auth.users
  approval_notes          String?
  document_id             String?    → documents.id
  document_url            String?
  created_at              DateTime   @default(now())
  updated_at              DateTime   @default(now())

  linked_documents        approval_request_documents[]
}

model approval_request_documents {
  id                    String     @id @default(uuid())
  approval_request_id   String     → approval_requests.id
  document_id           String?    → documents.id
  document_url          String?
  created_at            DateTime   @default(now())
}

model activity_logs {
  id            String                @id @default(uuid())
  user_id       String                → auth.users
  action        activity_action
  entity_type   activity_entity_type
  entity_id     String?
  entity_name   String?
  old_values    Json?
  new_values    Json?
  metadata      Json                  @default({})
  created_at    DateTime              @default(now())
}
```

## Functions

```
function match_document_embeddings(
  query_embedding  Vector(1536),
  match_count      Int       @default(5),
  similarity_threshold Float @default(0.5)
) → {
  id          String
  user_id     String
  document_id String
  embedding   Vector(1536)
  content     String
  metadata    Json
  similarity  Float
}[]
// v1: Basic semantic search on document_embeddings
// Uses cosine distance: 1 - (embedding <=> query_embedding)
// Filtered by RLS: user_id = auth.uid()

function match_document_embeddings_v2(
  query_embedding       Vector(1536)?  @default(null),
  match_count           Int            @default(20),
  similarity_threshold  Float          @default(0.7),
  filter_document_type  String?        @default(null),
  filter_organization   String?        @default(null),
  filter_date_from      DateTime?      @default(null),
  filter_date_to        DateTime?      @default(null),
  filter_tags           String[]?      @default(null),
  filter_category       String?        @default(null)
) → {
  id          String
  user_id     String
  document_id String
  content     String
  similarity  Float
  file_name   String
  file_path   String
  mime_type   String
  file_size   Int
  created_at  DateTime
  folder_id   String
  category    String
  ai_judgment Json
}[]
// v2: Dual-path search (semantic + metadata filters) with document JOIN
// Legacy — kept for backward compatibility

function match_document_embeddings_v3(
  query_embedding       Vector(1536),
  match_count           Int    @default(10),
  similarity_threshold  Float  @default(0.7)
) → {
  id          String
  user_id     String
  document_id String
  content     String
  similarity  Float
  file_name   String
  file_path   String
  mime_type   String
  file_size   Int
  created_at  DateTime
  folder_id   String
  category    String
}[]
// v3: Semantic-only search with document JOIN (no metadata filters)
// Active version used by search_user_documents tool

function is_admin_user() → Boolean
// Returns true if current user has superadmin or manager role
```
