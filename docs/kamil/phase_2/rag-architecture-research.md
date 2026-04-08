# RAG Architecture Research - EB-FILEMG

Deep research into the current Retrieval-Augmented Generation (RAG) architecture, embedding strategy, retrieval strategy, and approval integration in the EB-FILEMG project.

---

## High-Level Flows

### How a File Becomes Searchable

```mermaid
flowchart LR
    A[User drops file] --> B[Store in S3]
    B --> C[Extract text]
    C --> D[Split into chunks]
    D --> E[Generate embeddings via OpenAI]
    E --> F[Store vectors in pgvector]
```

### How a User Searches Documents

```mermaid
flowchart LR
    A[User asks question] --> B[OpenAI decides to search]
    B --> C[Embed the query]
    C --> D[Cosine similarity search]
    D --> E[Return top chunks]
    E --> F[OpenAI answers with context]
```

### How an Approval Request is Created from a Document

```mermaid
flowchart LR
    A[User uploads invoice] --> B[AI reads document content]
    B --> C[AI extracts vendor, amount, items]
    C --> D[AI creates approval request]
    D --> E[Links document to request]
    E --> F[User reviews & submits]
```

### Overall System Flow

```mermaid
flowchart TD
    Upload["📄 File Upload"]
    Ingest["🔄 RAG Ingestion"]
    Store["💾 Vector Storage"]
    Chat["💬 User Chat"]
    Search["🔍 Semantic Search"]
    AI["🤖 AI Response"]
    Approval["📋 Approval Request"]

    Upload --> Ingest
    Ingest --> Store
    Chat --> Search
    Search --> Store
    Search --> AI
    AI --> Approval
    Upload -.->|documents linked| Approval
```

---

## 1. System Overview

The RAG system enables intelligent document search by ingesting uploaded files, generating vector embeddings, and retrieving relevant content during AI conversations.

```mermaid
flowchart TB
    subgraph Client["Frontend (Next.js)"]
        UI[Chat UI]
        Upload[File Upload Zone]
        Stream[Stream Parser]
    end

    subgraph API["API Layer"]
        UploadAPI["/api/upload"]
        IngestAPI["/api/rag/ingest"]
        RespondAPI["/api/openai/respond"]
    end

    subgraph Services["Service Layer"]
        S3Svc[S3 Service]
        RAGSvc[RAG Service<br/>triggerEmbeddings.ts]
        ToolExec[Tool Execution]
    end

    subgraph External["External Services"]
        S3[(AWS S3)]
        OpenAI[OpenAI API<br/>Embeddings + Chat]
    end

    subgraph Database["Supabase (PostgreSQL + pgvector)"]
        DocTable[(documents)]
        EmbedTable[(document_embeddings<br/>vector 1536)]
        MatchFn[match_document_embeddings<br/>RPC Function]
    end

    Upload -->|Files| UploadAPI
    UploadAPI --> S3Svc --> S3
    UploadAPI --> DocTable

    UI -->|documentIds| IngestAPI
    IngestAPI --> RAGSvc
    RAGSvc -->|1. Fetch file| S3
    RAGSvc -->|2. Generate embeddings| OpenAI
    RAGSvc -->|3. Store chunks + vectors| EmbedTable

    UI -->|Chat message| RespondAPI
    RespondAPI -->|Tool call: search_user_documents| ToolExec
    ToolExec -->|Query embedding| OpenAI
    ToolExec -->|Vector search| MatchFn
    MatchFn --> EmbedTable
    ToolExec -->|Enrich results| DocTable

    RespondAPI -->|SSE stream| Stream
    Stream --> UI
```

---

## 2. Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    AUTH_USERS ||--o{ DOCUMENTS : "user_id"
    AUTH_USERS ||--o{ DOCUMENT_EMBEDDINGS : "user_id"
    AUTH_USERS ||--o{ APPROVAL_REQUESTS : "user_id"
    DOCUMENTS ||--o{ DOCUMENT_EMBEDDINGS : "document_id"
    APPROVAL_REQUESTS ||--o{ APPROVAL_REQUEST_DOCUMENTS : "approval_request_id"
    DOCUMENTS ||--o{ APPROVAL_REQUEST_DOCUMENTS : "document_id"

    DOCUMENTS {
        uuid id PK
        uuid user_id FK
        uuid folder_id FK "nullable"
        text file_name
        text file_path "S3 key"
        text text_content "nullable - filled by RAG"
        text mime_type "nullable"
        numeric file_size "nullable"
        text category "nullable - AI classified"
        timestamptz created_at
    }

    DOCUMENT_EMBEDDINGS {
        uuid id PK
        uuid user_id FK
        uuid document_id FK
        vector_1536 embedding "pgvector"
        text content "text chunk"
        jsonb metadata "chunk_index file_name file_path length"
    }

    APPROVAL_REQUESTS {
        uuid id PK
        uuid user_id FK
        text title
        text description "nullable"
        text vendor_name "nullable"
        text category "nullable"
        numeric amount "15_2"
        text priority "nullable"
        date date "nullable"
        text status "pending approved rejected need_revision cancelled"
        jsonb items "array of name qty amount"
        text approval_notes "nullable"
        uuid approved_by FK "nullable"
        uuid rejected_by FK "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    APPROVAL_REQUEST_DOCUMENTS {
        uuid id PK
        uuid approval_request_id FK
        uuid document_id FK "nullable"
        text document_url "nullable - external URL"
        timestamptz created_at
    }
```

### Vector Search Function

The `match_document_embeddings` RPC function performs cosine similarity search:

```sql
CREATE OR REPLACE FUNCTION public.match_document_embeddings(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  similarity_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid, user_id uuid, document_id uuid,
  embedding vector(1536), content text,
  metadata jsonb, similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT de.id, de.user_id, de.document_id,
         de.embedding, de.content, de.metadata,
         1 - (de.embedding <=> query_embedding) AS similarity
  FROM public.document_embeddings de
  WHERE de.user_id = auth.uid()
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**Key details**:
- Uses `<=>` cosine distance operator (pgvector)
- Similarity = `1 - cosine_distance` (higher = more similar)
- RLS enforced: `de.user_id = auth.uid()` - users only search their own embeddings
- Default threshold: 0.5, default limit: 5

---

## 3. Embedding Strategy

### Text Extraction

Files are fetched from S3 and text is extracted based on MIME type:

| Format | Library | Notes |
|--------|---------|-------|
| PDF | `pdf-parse` | Extracts all text from pages |
| DOCX | `mammoth` | Extracts raw text |
| Google Docs | Custom JSON parser | Parses export JSON structure |
| TXT, MD, CSV, JSON | UTF-8 decode | Direct string conversion |
| Other text-like | UTF-8 fallback | Attempts decode |
| Unsupported | Skipped | Returns empty string |

### Text Normalization

```typescript
const normalizeText = (content: string) =>
  content.replace(/\s+/g, " ").replace(/\n+/g, " ").trim();
```

Collapses all whitespace and newlines into single spaces.

### Chunking Strategy

```
Chunk Size:  800 characters
Overlap:     200 characters (25%)
```

```mermaid
flowchart LR
    subgraph Document["Normalized Text (e.g. 2400 chars)"]
        direction LR
        C1["Chunk 1<br/>chars 0-800"]
        C2["Chunk 2<br/>chars 600-1400"]
        C3["Chunk 3<br/>chars 1200-2000"]
        C4["Chunk 4<br/>chars 1800-2400"]
    end

    style C1 fill:#4a9eff,color:#fff
    style C2 fill:#4a9eff,color:#fff
    style C3 fill:#4a9eff,color:#fff
    style C4 fill:#4a9eff,color:#fff
```

- Sliding window: advances by `chunkSize - overlap` = 600 chars per step
- 200-char overlap ensures semantic continuity between chunks
- Prevents sentence/concept splitting at boundaries

### Embedding Generation

| Parameter | Value |
|-----------|-------|
| Model | `text-embedding-3-small` (configurable via `OPENAI_EMBEDDING_MODEL`) |
| Dimensions | 1536 |
| Batch size | 80 chunks per API request |
| API endpoint | `{OPENAI_BASE_URL}/embeddings` |

Chunks are sent in batches of 80 to stay under OpenAI rate limits. Each chunk produces a 1536-dimensional float vector.

### Metadata Stored Per Chunk

```json
{
  "chunk_index": 0,
  "file_name": "invoice-2025.pdf",
  "file_path": "uploads/user-id/1707123456_invoice-2025.pdf",
  "length": 782
}
```

---

## 4. Ingestion Pipeline

```mermaid
sequenceDiagram
    actor User
    participant UI as Chat UI
    participant Upload as /api/upload
    participant S3 as AWS S3
    participant DB as Supabase DB
    participant Ingest as /api/rag/ingest
    participant RAG as triggerEmbeddings
    participant OpenAI as OpenAI API

    User->>UI: Select files + send message
    UI->>Upload: POST FormData (files + metadata)
    Upload->>S3: PutObject (uploads/{userId}/{timestamp}_{filename})
    S3-->>Upload: Success
    Upload->>DB: INSERT into documents (file_name, file_path, mime_type, file_size)
    DB-->>Upload: DocumentRecord[]
    Upload-->>UI: DocumentRecord[]

    Note over UI: Fire-and-forget (non-blocking)
    UI->>Ingest: POST { documentIds }
    Ingest->>DB: SELECT documents WHERE id IN (documentIds)
    DB-->>Ingest: Document records

    loop For each document
        Ingest->>RAG: ingestDocumentEmbeddings(document)
        RAG->>DB: DELETE existing embeddings for document_id
        RAG->>S3: GetObject (document.file_path)
        S3-->>RAG: File buffer + contentType

        Note over RAG: Extract text (pdf-parse / mammoth / UTF-8)
        Note over RAG: Normalize whitespace
        Note over RAG: Chunk text (800 chars, 200 overlap)

        RAG->>DB: UPDATE documents SET text_content = extractedText

        RAG->>OpenAI: POST /embeddings (batch of 80 chunks)
        OpenAI-->>RAG: Float vectors (1536 dims each)

        RAG->>DB: INSERT into document_embeddings (chunks + vectors + metadata)
        DB-->>RAG: Success
    end

    Ingest-->>UI: { results: [{ status: "processed", chunks: N }] }
```

### Ingestion Result Types

```typescript
type IngestionResult =
  | { documentId: string; status: "processed"; chunks: number }
  | { documentId: string; status: "skipped"; reason: string }  // unsupported format
  | { documentId: string; status: "failed"; reason: string };  // error occurred
```

### Error Handling

- **Unsupported format**: Skipped with reason (non-fatal)
- **Empty text extraction**: Skipped (non-fatal)
- **OpenAI API error**: Failed with error message
- **DB write error**: Failed with error message
- **Entire ingestion failure**: Doesn't block file upload or chat

---

## 5. Retrieval Strategy

```mermaid
sequenceDiagram
    actor User
    participant UI as Chat UI
    participant API as /api/openai/respond
    participant GPT as OpenAI Chat API<br/>(gpt-4o-mini)
    participant ToolExec as Tool Executor
    participant EmbedAPI as OpenAI Embeddings
    participant RPC as match_document_embeddings
    participant DB as Supabase DB

    User->>UI: "What does my invoice say about shipping?"
    UI->>API: POST messages + tools
    API->>GPT: messages + system prompt + tool definitions

    GPT-->>API: tool_call: search_user_documents({ query: "invoice shipping details", limit: 5 })

    API->>ToolExec: Execute search_user_documents
    ToolExec->>EmbedAPI: POST /embeddings { model: "text-embedding-3-small", input: query }
    EmbedAPI-->>ToolExec: Query vector (1536 dims)

    ToolExec->>RPC: match_document_embeddings(query_vector, limit=5, user_id)
    Note over RPC: Cosine similarity search<br/>Filter: user_id param + auth.uid()<br/>Threshold: > 0.5
    RPC-->>ToolExec: Top 5 chunks with similarity scores

    ToolExec->>DB: SELECT documents WHERE id IN (matched doc IDs) AND user_id = userId
    DB-->>ToolExec: Document metadata (name, size, mime, category, folder)

    Note over ToolExec: Enrich chunks with document metadata
    ToolExec-->>API: DocumentSearchResult[]

    API->>GPT: Original messages + tool_response (search results)
    GPT-->>API: Final answer using retrieved context

    API-->>UI: SSE stream (tool_metadata event + content chunks)
    UI-->>User: AI response with document references
```

### Search Tool Definition

```typescript
{
  name: "search_user_documents",
  description: "Search the user's uploaded documents for the most relevant chunks.",
  parameters: {
    query: { type: "string", description: "Natural language search query" },
    limit: { type: "integer", minimum: 1, maximum: 10, default: 5 }
  },
  required: ["query"]
}
```

### Return Type

```typescript
type DocumentSearchResult = {
  documentId: string;
  similarity: number | null;     // 0.0 to 1.0 (cosine)
  content: string;               // The matched text chunk
  file: DocumentMetadata | null; // Enriched file info
};

type DocumentMetadata = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  fileUrl: string;        // S3 key for presigned URL
  modifiedTime: string;
  category?: string | null;
  folderId?: string;
};
```

### Fallback Strategy

If vector search fails (e.g., RPC error), the system falls back to a basic table scan:

```typescript
const { data: fallback } = await supabase
  .from("document_embeddings")
  .select("document_id, content, metadata")
  .eq("user_id", userId)
  .limit(limit);
```

This returns recent chunks without similarity scoring.

---

## 6. AI Tool Integration

### Tool Registry

The OpenAI chat endpoint registers 4 tools:

| Tool | File | Purpose |
|------|------|---------|
| `search_user_documents` | `tools/rag.ts` | Vector similarity search across documents |
| `manage_documents` | `tools/documents.ts` | List, search by name, get content |
| `manage_folders` | `tools/folders.ts` | Folder CRUD operations |
| `manage_approval_requests` | `tools/approval-requests.ts` | Approval request CRUD |

### Chat Flow with Tool Calling

```mermaid
flowchart TD
    A[User sends message] --> B[Build messages array with system prompt]
    B --> C[Call OpenAI with tools + tool_choice: auto]
    C --> D{Response has tool_calls?}

    D -->|No| E[Stream response directly to client]

    D -->|Yes| F[Execute each tool call]
    F --> G[search_user_documents?]
    F --> H[manage_documents?]
    F --> I[manage_approval_requests?]
    F --> J[manage_folders?]

    G --> K[Collect tool responses]
    H --> K
    I --> K
    J --> K

    K --> L[Extract tool_metadata<br/>approval_request_id, files]
    L --> M[Send messages + tool_responses back to OpenAI]
    M --> N{Has tool_metadata?}

    N -->|Yes| O[Stream with metadata event prefix]
    N -->|No| E

    O --> P[Client receives SSE stream]
    E --> P
    P --> Q[Parse tool_metadata event]
    Q --> R[Render AI response + ApprovalRequestCard + FileCards]
```

### Streaming Response Format

```
event: tool_metadata
data: {"type":"tool_metadata","approval_request_id":"uuid","files":[...],"rag_sources":[...]}

data: {"choices":[{"delta":{"content":"Based on your invoice..."}}]}
data: {"choices":[{"delta":{"content":" the shipping cost is..."}}]}
data: [DONE]
```

- `files`: All documents referenced by tool responses (manage_documents + RAG)
- `rag_sources`: Documents specifically returned by `search_user_documents` (used for "Sources:" display in Q&A)
- `approval_request_id`: UUID of a newly created approval request

### Tool Error Handling

Unknown tools and unparseable arguments now return structured error responses to OpenAI instead of being silently skipped, allowing the model to recover gracefully.

---

## 7. Approval Request Flow

### Status State Machine

```mermaid
stateDiagram-v2
    [*] --> pending: Created (by AI or user)

    pending --> approved: Manager/SuperAdmin approves
    pending --> rejected: Manager/SuperAdmin rejects
    pending --> need_revision: Manager/SuperAdmin requests changes
    pending --> cancelled: Employee/Manager cancels

    need_revision --> pending: Employee resubmits
    need_revision --> cancelled: Employee cancels

    approved --> [*]
    rejected --> [*]
    cancelled --> [*]

    note right of pending
        Default status on creation
    end note

    note right of approved
        Sets approved_by = approver UUID
    end note

    note right of rejected
        Sets rejected_by = rejector UUID
    end note
```

### Role-Based Permissions

| Role | Allowed Status Changes |
|------|----------------------|
| Manager / SuperAdmin | `approved`, `rejected`, `need_revision`, `cancelled` |
| Employee | `pending`, `cancelled` |
| Accountant | **No permission** |

### Document-Approval Linkage

Approval requests link to documents via the `approval_request_documents` junction table:

- `document_id` (nullable): Internal document stored in S3
- `document_url` (nullable): External URL reference
- On document delete: `document_id` set to NULL (soft reference preserved)

### AI-Created Approval Requests

When the AI creates an approval request via the `manage_approval_requests` tool:

1. AI extracts metadata from uploaded documents (vendor, amount, items, etc.)
2. Creates approval request via tool call
3. Links uploaded documents to the request
4. Returns `approval_request_id` in tool metadata
5. Frontend renders `ApprovalRequestCard` component with the ID

---

## 8. End-to-End Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Chat UI
    participant S3 as AWS S3
    participant DB as Supabase
    participant RAG as RAG Service
    participant OpenAI as OpenAI API

    Note over User,OpenAI: === PHASE 1: FILE UPLOAD & INGESTION ===

    User->>UI: Drag & drop invoice.pdf + type "Process this invoice"
    UI->>UI: Validate file (max 20MB, allowed MIME type)
    UI->>UI: Show processing steps: Receiving... Extracting... Auto-filling...

    UI->>S3: Upload to uploads/{userId}/{ts}_invoice.pdf
    UI->>DB: INSERT document record

    Note over UI,RAG: Fire-and-forget ingestion
    UI->>RAG: POST /api/rag/ingest { documentIds: ["doc-uuid"] }
    RAG->>S3: Fetch invoice.pdf buffer
    RAG->>RAG: pdf-parse extract text
    RAG->>RAG: Normalize + chunk (800c, 200 overlap)
    RAG->>OpenAI: Generate embeddings (text-embedding-3-small)
    RAG->>DB: Store chunks + vectors in document_embeddings

    Note over User,OpenAI: === PHASE 2: AI PROCESSING ===

    UI->>OpenAI: POST /api/openai/respond (messages + tools)
    OpenAI->>OpenAI: Decides to call manage_documents(get_content)
    OpenAI-->>UI: tool_call response
    UI->>DB: Fetch document text_content
    UI->>OpenAI: Tool result with document text

    OpenAI->>OpenAI: Extracts vendor, amount, items from text
    OpenAI->>OpenAI: Decides to call manage_approval_requests(create)
    OpenAI-->>UI: tool_call response
    UI->>DB: CREATE approval_request + link documents

    OpenAI-->>UI: Final response streamed via SSE
    UI->>UI: Parse tool_metadata (approval_request_id, files)
    UI-->>User: Show AI message + ApprovalRequestCard + FileCard

    Note over User,OpenAI: === PHASE 3: FUTURE RETRIEVAL ===

    User->>UI: "What was the shipping cost on my invoice?"
    UI->>OpenAI: POST /api/openai/respond
    OpenAI->>OpenAI: Calls search_user_documents(query)
    OpenAI-->>UI: tool_call
    UI->>OpenAI: Embed query (text-embedding-3-small)
    UI->>DB: RPC match_document_embeddings (cosine similarity)
    DB-->>UI: Top 5 chunks with similarity scores
    UI->>OpenAI: Tool result with relevant chunks
    OpenAI-->>UI: "The shipping cost on your invoice was $45.00"
    UI-->>User: Display answer
```

---

## 9. Configuration & Constants

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `OPENAI_API_KEY` | OpenAI API authentication | (required) |
| `OPENAI_BASE_URL` | OpenAI API base URL | `https://api.openai.com/v1` |
| `OPENAI_EMBEDDING_MODEL` | Embedding model name | `text-embedding-3-small` |
| `OPENAI_MODEL` | Chat model name | `gpt-4o-mini` |
| `AWS_S3_BUCKET` | S3 bucket for file storage | (required) |
| `AWS_REGION` | AWS region | (required) |
| `AWS_ACCESS_KEY_ID` | AWS credentials | (required) |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | (required) |

### Hardcoded Constants

| Parameter | Value | Location |
|-----------|-------|----------|
| Chunk size | 800 chars | `triggerEmbeddings.ts` |
| Chunk overlap | 200 chars | `triggerEmbeddings.ts` |
| Embedding dimensions | 1536 | DB schema + API |
| Embedding batch size | 80 | `triggerEmbeddings.ts` |
| Default match count | 5 | `match_document_embeddings` SQL |
| Similarity threshold | 0.5 | `match_document_embeddings` SQL |
| Max search limit (client) | 10 | `rag.ts` tool definition |
| Max file size | 20MB | `ThreadPageClient.tsx` |
| Max tokens | 2048 | `respond/route.ts` |
| Chat temperature | 0.2 | `respond/route.ts` |

### Security

- **RLS (Row-Level Security)**: All tables enforce `user_id = auth.uid()`
- **Bearer token auth**: Upload and ingest endpoints validate access tokens
- **Data isolation**: Vector search function filters by authenticated user
- **S3 path isolation**: Files stored under `uploads/{userId}/`

---

## 10. Key Files Reference

### RAG Pipeline

| File | Purpose |
|------|---------|
| `src/service/rag/triggerEmbeddings.ts` | Core: text extraction, chunking, embedding generation, DB storage |
| `src/service/rag/ingestDocuments.ts` | Client-side API wrapper for ingestion |
| `src/app/api/rag/ingest/route.ts` | API endpoint for RAG ingestion |

### AI & Retrieval

| File | Purpose |
|------|---------|
| `src/app/api/openai/respond/route.ts` | Main chat API with tool calling + streaming |
| `src/app/api/openai/respond/tools/rag.ts` | Vector search tool (`search_user_documents`) |
| `src/app/api/openai/respond/tools/documents.ts` | Document management tool |
| `src/app/api/openai/respond/tools/approval-requests.ts` | Approval request tool |
| `src/app/api/openai/respond/tools/index.ts` | Tool registry |
| `src/app/api/openai/respond/utils/tool-execution.ts` | Tool call executor |
| `src/app/api/openai/respond/utils/stream.ts` | SSE streaming with metadata |

### Upload & Storage

| File | Purpose |
|------|---------|
| `src/app/api/upload/route.ts` | File upload endpoint |
| `src/service/s3/uploadFile.ts` | S3 PutObject server action |
| `src/service/s3/upload.ts` | Client upload service |
| `src/service/s3/s3Presign.ts` | Presigned URL generation |

### Frontend Integration

| File | Purpose |
|------|---------|
| `src/components/chat/hooks/useThreadWorkspace.ts` | Upload + chat orchestration |
| `src/hooks/chat/useAssistantStream.ts` | SSE stream parsing + metadata extraction |
| `src/components/chat/ThreadPageClient.tsx` | Main chat UI component |

### Database

| File | Purpose |
|------|---------|
| `supabase/migrations/20250218120000_create_documents_table.sql` | Documents table |
| `supabase/migrations/20250218121000_create_document_embeddings_table.sql` | Embeddings table with pgvector |
| `supabase/migrations/20250218133000_simplify_match_document_embeddings_function.sql` | Vector search RPC |
| `supabase/migrations/20251223205500_create_approval_requests_table.sql` | Approval requests |
| `supabase/migrations/20251229000000_add_approval_request_documents_table.sql` | Document-approval junction |

### Types

| File | Purpose |
|------|---------|
| `src/types/document.ts` | DocumentRecord, DocumentMetadata, DocumentSearchResult |
| `src/types/approvalRequest.ts` | ApprovalRequest, ApprovalRequestItem, ApprovalRequestDocument |

---

## 11. Loopholes, Bugs & Improvement Ideas

Deep code audit findings across the RAG, approval, upload, and retrieval flows. Grouped by category with severity tags for prioritization.

### 11.1 Security Issues

| # | Finding | Severity | File | Issue | Scenario |
|---|---------|----------|------|-------|----------|
| S1 | Self-approval loophole | **CRITICAL** | `approvalRequest.ts` | No `user_id != approver` check — a manager can approve their own request | Manager submits ¥500k expense, approves it themselves |
| S2 | Thread ownership not verified | **HIGH** | `respond/route.ts:77-91` | Thread existence is checked but not user ownership — any authenticated user can access another user's conversation by knowing the thread ID | User A guesses/leaks thread UUID, reads User B's chat history |
| S3 | No defense-in-depth on ingest | **HIGH** | `ingest/route.ts:51-69` | `documentIds` are not verified against `user_id` — relies solely on RLS | Attacker sends another user's document IDs to re-ingest or overwrite embeddings |
| S4 | RLS blocks manager approvals | **HIGH** | `migration: approval_requests` | UPDATE RLS policy only allows `user_id = auth.uid()` — managers can't approve other employees' requests at DB level | Manager tries to approve an employee's request → silently blocked by RLS |

### 11.2 Data Integrity Issues

| # | Finding | Severity | File | Issue | Scenario |
|---|---------|----------|------|-------|----------|
| D1 | Status regression | **HIGH** | `approvalRequest.ts` | No guard against reverting final states (e.g., `approved` → `pending`) | API call reverts an already-approved request back to pending |
| D2 | Conflicting approver/rejector | **HIGH** | `approvalRequest.ts:632-638` | Both `approved_by` and `rejected_by` can be non-null simultaneously | Request approved, then status changed to rejected without clearing `approved_by` |
| D3 | Embeddings deleted then skipped | **HIGH** | `triggerEmbeddings.ts:218-250` | Existing embeddings are deleted BEFORE checking if new text extraction succeeds — if extraction fails, document loses all searchability | Re-ingest a DOCX that was moved from S3 → old embeddings gone, new ones never created |
| D4 | Orphaned S3 files | **HIGH** | `upload/route.ts:64-102` | S3 upload succeeds → DB insert fails → file is stuck in S3 with no database record | DB timeout during upload → file exists in S3 but no document row references it |
| D5 | Embedding-chunk index mismatch | **MEDIUM** | `triggerEmbeddings.ts:263-280` | If OpenAI returns fewer embeddings than chunks sent, embeddings are stored against wrong chunk indices | Partial OpenAI response → chunk 3's text paired with chunk 1's embedding |

### 11.3 Validation Gaps

| # | Finding | Severity | File | Issue | Scenario |
|---|---------|----------|------|-------|----------|
| V1 | No item amount/quantity validation | **HIGH** | `approvalRequest.ts:213-224` | Negative amounts, zero quantities, non-numeric values all accepted | AI creates item with `quantity: -5, amount: NaN` → stored in DB |
| V2 | No approval amount validation | **HIGH** | `approvalRequest.ts:249` | Negative, `NaN`, `Infinity` accepted as total amount | Approval request with `amount: -99999` passes all checks |
| V3 | No file size limit (server) | **HIGH** | `upload/route.ts` | Client enforces 20MB limit but server has none | Direct API call with 500MB file bypasses client check, fills S3 |
| V4 | Zero-byte files accepted | **MEDIUM** | `upload/route.ts:70` | Empty files are uploaded, stored, and sent to ingestion | User drops empty file → uploaded to S3, document row created, ingestion returns "skipped" |
| V5 | Document URLs not validated | **MEDIUM** | `approvalRequest.ts:289-296` | Arbitrary strings stored as `document_url` (could be `javascript:` or data URIs) | AI stores `javascript:alert(1)` as document URL → rendered as link in UI |
| V6 | No items array limit | **MEDIUM** | `approvalRequest.ts` | Approval request can contain unlimited items | AI or API call creates request with 100,000 line items → DB bloat, UI freeze |

### 11.4 File Processing Gaps

| # | Finding | Severity | File | Issue | Scenario |
|---|---------|----------|------|-------|----------|
| F1 | Images silently unsearchable | **MEDIUM** | `triggerEmbeddings.ts:63-143` | JPG/PNG/HEIC upload succeeds but text extraction returns empty → no embeddings → invisible to search | User uploads beach photo receipt, asks "find my receipt" → nothing found |
| F2 | Excel/PowerPoint unsupported | **MEDIUM** | `triggerEmbeddings.ts` | XLSX, PPTX accepted at upload but produce no embeddings | User uploads quarterly spreadsheet → uploaded but never searchable |
| F3 | Scanned PDFs (image-only) | **MEDIUM** | `triggerEmbeddings.ts` | `pdf-parse` returns empty text for image-only PDFs → no OCR pipeline | Scanned contract uploaded → stored but zero search results |
| F4 | Text normalization destroys structure | **MEDIUM** | `triggerEmbeddings.ts:145-146` | All newlines collapsed into single spaces → code blocks, tables, and lists lose structural meaning | CSV file with columns → becomes unreadable single line of text in embeddings |

### 11.5 Retrieval Limitations

| # | Finding | Severity | File | Issue | Scenario |
|---|---------|----------|------|-------|----------|
| R1 | Hardcoded similarity threshold | **MEDIUM** | `rag.ts:56-65` | Threshold `0.5` is not configurable from client or environment | Niche domain vocabulary consistently scores 0.45 → never returned |
| R2 | Fallback only at 0 results | **MEDIUM** | `rag.ts:59-128` | If vector search returns 2 of 5 requested, no fallback attempted for remaining 3 | Query matches 2 chunks above threshold, misses 3 relevant ones just below |
| R3 | Single tool-call depth (by design) | **LOW** | `respond/route.ts:160-170` | Follow-up call uses `tool_choice: "none"` — intentionally prevents recursive tool calls. If AI needs a second tool, it must be done in a separate user turn | AI searches docs, wants to also create approval request → must happen in next message |
| R4 | No duplicate chunk prevention | **LOW** | `triggerEmbeddings.ts:148-168` | Short texts (600–800 chars) produce overlapping duplicate chunks with near-identical content | 700-char document → 2 chunks that are 87% identical → search returns same content twice |

### 11.6 Concurrency & UX Issues

| # | Finding | Severity | File | Issue | Scenario |
|---|---------|----------|------|-------|----------|
| C1 | Thread creation race condition | **MEDIUM** | `useThreadWorkspace.ts:192-202` | Rapid messages can trigger concurrent `createThread` calls → duplicate threads | User double-clicks send → two threads created for same conversation |
| C2 | S3 filename collision | **MEDIUM** | `upload/route.ts:66` | S3 key uses `Date.now()` — same-millisecond uploads overwrite each other | Drag 5 files at once → some share the same millisecond → file overwritten |
| C3 | Message saved before stream completes | **MEDIUM** | `useThreadWorkspace.ts:287-292` | User message persists to DB immediately, but if AI stream fails, response is error fallback | Stream dies mid-response → user sees their message + "Sorry, error occurred" forever |
| C4 | RAG failure silent to user | **MEDIUM** | `useThreadWorkspace.ts:494-503` | Ingestion fails silently — user thinks files are searchable but they aren't | Upload 3 invoices, ingestion times out → user searches later, finds nothing, confused |
| C5 | No upload file count limit | **LOW** | `useThreadWorkspace.ts:82-84` | No limit on simultaneous file queue | User selects entire folder (1000+ files) → browser tab hangs |
| C6 | Sequential ingestion | **LOW** | `ingest/route.ts:73-79` | Documents ingested one-by-one in a loop — no parallelism | 10 documents × ~30 sec each = ~5 min total ingestion time |
