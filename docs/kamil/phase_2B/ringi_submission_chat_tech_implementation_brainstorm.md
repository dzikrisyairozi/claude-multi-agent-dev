# Ringi Submission Chat -- Technical Implementation Brainstorm (v2)

> **Date**: 2026-03-06
> **Phase**: 2B (Production-Ready)
> **Scope**: Employee (Requester) primary, Superadmin (Approver) secondary
> **Companion doc**: `ringi_submission_chat_brainstorm.md` (user scenarios)

---

## 1. Why Embedding Is Necessary

The previous version of this document recommended skipping embedding and relying on ILIKE + LLM reasoning. After reconsideration, that approach fails for production use:

| User Query | Why ILIKE Fails | Why Embedding Works |
|-----------|-----------------|---------------------|
| "What's my server purchase status?" | `%server purchase%` does NOT match "Server Room Upgrade -- Dell PowerEdge Rack Servers" (substring absent) | Vector similarity connects "server purchase" to "Server Room Upgrade" semantically |
| "Tell me about Tanaka's equipment request" | Requires matching across submitter name + topic simultaneously -- ILIKE can't cross-join fields | Embedding includes submitter name in text; vector search handles multi-concept matching |
| "Sakura Tech vendor submissions" | `%Sakura Tech%` misses "Sakura Technologies Co., Ltd." | Embedding captures semantic similarity between name variants |
| Japanese query for English submission | ILIKE is language-blind | Bilingual embedding averaging (EN + JA) -- same pattern as document RAG |

**Decision: Submission embedding is required for Phase 2B.**

---

## 2. Current State -- What Exists Today

### Existing Document RAG Pipeline (Pattern to Replicate)

| Component | What It Does | File |
|-----------|-------------|------|
| `document_embeddings` table | Stores chunked text + vectors (1536 dims) | `supabase/migrations/20250218121000_create_document_embeddings_table.sql` |
| `DocumentIngestionService` | Extracts text from files, chunks, generates embeddings, inserts | `src/service/rag/triggerEmbeddings.ts` |
| `match_document_embeddings_v3` | RPC: cosine similarity search, returns matched chunks + file metadata | `supabase/migrations/20260221000000_create_match_document_embeddings_v3.sql` |
| `search_user_documents` tool | Bilingual embedding query (EN+JA averaging) -> RPC call -> results | `src/app/api/openai/respond/tools/rag.ts` |
| Config | Model: `text-embedding-3-small`, threshold: 0.25, gap: 0.10, chunk: 800/200 | `src/app/api/openai/respond/config/ai.config.ts` |

### Existing Approval Request System

| Component | What It Does | Limitation |
|-----------|-------------|-----------|
| `manage_approval_requests` tool | CRUD + list + propose | `list` always scoped to `user_id`; `read` uses generic CRUD (no joins) |
| `approval_requests` table RLS | ALL policies: `user_id = auth.uid()` | Superadmin blocked at DB level |
| `createApprovalRequest` service | Inserts submission + junction table docs | No embedding trigger |
| `updateApprovalRequest` service | Partial update + doc replacement | No embedding trigger |

---

## 3. Architecture Overview

```
                              SUBMISSION LIFECYCLE
                              ====================

  [User creates/updates submission]
       |
       v
  [approvalRequest.ts service]
       |
       +---> Insert/Update into approval_requests table
       |
       +---> Trigger embedding (fire-and-forget):
               |
               v
             [SubmissionEmbeddingService]
               1. Build text: title + vendor + dept + description + purpose +
                              reason + remarks + items + submitter_name
               2. Generate embedding (text-embedding-3-small, 1536 dims)
               3. Upsert into submission_embeddings table


                              SEARCH FLOW
                              ===========

  [User asks: "What's my server purchase status?"]
       |
       v
  [AI decides to call search_submissions tool]
       |
       v
  [search_submissions handler]
       1. Generate bilingual embeddings (EN + JA)
       2. Average vectors
       3. Call match_submission_embeddings RPC
       |
       v
  [PostgreSQL RPC]
       - Cosine similarity search on submission_embeddings
       - JOIN approval_requests for metadata
       - JOIN profiles for submitter name
       - Role-based: user_id filter for employee, no filter for superadmin
       |
       v
  [Results returned to AI]
       - Submission title, status, amount, vendor, department, similarity
       - AI formulates natural language response
```

---

## 4. What Gets Embedded Per Submission

### Text Composition

Each submission gets ONE embedding vector. The embedded text is a concatenation of the submission's key fields:

```
[Submission] {title}
Vendor: {vendor_name}
Category: {category} | Department: {department}
Amount: {amount} yen
Status: {status}
Description: {description}
Purpose: {purpose}
Reason: {reason_for_purchase}
Remarks: {remarks}
Items: {item1.name}, {item2.name}, ...
Submitted by: {submitter_first_name} {submitter_last_name}
```

### Why Include Each Field

| Field | Reason |
|-------|--------|
| `title` | Primary search target ("server purchase" matches "Server Room Upgrade") |
| `vendor_name` | "Sakura Tech" matches "Sakura Technologies Co., Ltd." |
| `category` | Semantic: "buying stuff" matches "purchasing" |
| `department` | "Engineering team submissions" |
| `amount` | Not great for embedding (numeric), but provides context |
| `description` | Free-text, rich with queryable content |
| `purpose` | "for the new hires joining in April" -- natural language target |
| `reason_for_purchase` | Business justification -- highly queryable |
| `remarks` | Often contains unique context |
| `items[].name` | "Dell PowerEdge R750" -- product names are key search targets |
| `submitter name` | Enables "Tanaka's request" searches (critical for superadmin) |

### Why NOT Include

| Field | Reason for Exclusion |
|-------|---------------------|
| `status` | Better as a structured filter (exact match), not semantic search |
| `amount` (numeric only) | Numbers don't embed well; use SQL range filters instead |
| `dates` | Same -- use SQL date filters |
| `approval_notes` | Could be included for "what feedback did they give?" queries. Consider adding later. |

### Estimated Text Length

Most submissions: **200-600 chars** after concatenation. Well under the 800-char chunk size. No chunking needed -- one embedding per submission.

---

## 5. Schema Changes

### 5A. New Table: `submission_embeddings`

```sql
CREATE TABLE IF NOT EXISTS public.submission_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approval_request_id uuid NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  content text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Unique constraint: one embedding per submission (for upsert)
CREATE UNIQUE INDEX submission_embeddings_approval_request_id_idx
  ON public.submission_embeddings (approval_request_id);

-- Index for user-scoped queries
CREATE INDEX submission_embeddings_user_id_idx
  ON public.submission_embeddings (user_id);

-- RLS: Employee sees own, Superadmin sees all
ALTER TABLE public.submission_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submission_embeddings_select_own"
  ON public.submission_embeddings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "submission_embeddings_insert_own"
  ON public.submission_embeddings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "submission_embeddings_update_own"
  ON public.submission_embeddings FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "submission_embeddings_delete_own"
  ON public.submission_embeddings FOR DELETE
  USING (user_id = auth.uid());

-- Superadmin can see all (for cross-user search)
CREATE POLICY "superadmin_select_all_submission_embeddings"
  ON public.submission_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );
```

**Key design choice**: `UNIQUE INDEX` on `approval_request_id` -- one embedding per submission. This enables `INSERT ... ON CONFLICT` (upsert) when a submission is updated.

### 5B. New RPC: `match_submission_embeddings`

```sql
CREATE OR REPLACE FUNCTION public.match_submission_embeddings(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  similarity_threshold float DEFAULT 0.25,
  filter_user_id uuid DEFAULT NULL,
  filter_status text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  approval_request_id uuid,
  user_id uuid,
  content text,
  similarity float,
  -- Submission metadata (joined from approval_requests):
  title text,
  description text,
  vendor_name text,
  category text,
  amount numeric,
  priority text,
  status text,
  department text,
  approval_notes text,
  created_at timestamptz,
  -- Submitter profile (joined from profiles):
  submitter_first_name text,
  submitter_last_name text,
  submitter_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.id,
    se.approval_request_id,
    se.user_id,
    se.content,
    (1 - (se.embedding <=> query_embedding))::float AS similarity,
    ar.title,
    ar.description,
    ar.vendor_name,
    ar.category,
    ar.amount,
    ar.priority,
    ar.status,
    ar.department,
    ar.approval_notes,
    ar.created_at,
    p.first_name AS submitter_first_name,
    p.last_name AS submitter_last_name,
    p.email AS submitter_email
  FROM public.submission_embeddings se
  JOIN public.approval_requests ar ON ar.id = se.approval_request_id
  LEFT JOIN public.profiles p ON p.id = ar.user_id
  WHERE
    -- Role-based access:
    -- If filter_user_id is provided, scope to that user (employee mode)
    -- If NULL, return all (superadmin mode -- RLS on table handles actual access)
    (filter_user_id IS NULL OR se.user_id = filter_user_id)
    -- Optional status filter
    AND (filter_status IS NULL OR ar.status = filter_status)
    -- Similarity threshold
    AND 1 - (se.embedding <=> query_embedding) > similarity_threshold
  ORDER BY se.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_submission_embeddings TO authenticated;
```

**Design notes**:
- `SECURITY DEFINER` -- runs with the function owner's privileges, but RLS on the `submission_embeddings` table still applies for the calling user's session. This is the same pattern as `match_document_embeddings_v3`.
- `filter_user_id` parameter -- employee calls pass their own ID; superadmin passes NULL to search all.
- `filter_status` parameter -- enables "show me pending submissions" type searches.
- JOIN with `profiles` -- returns submitter name directly, no extra query needed.

### 5C. Superadmin RLS on `approval_requests` (Also Needed)

```sql
-- Superadmin can read ALL approval requests
CREATE POLICY "superadmin_select_all_approval_requests"
  ON public.approval_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

-- Superadmin can update ALL approval requests (for approve/reject)
CREATE POLICY "superadmin_update_all_approval_requests"
  ON public.approval_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

-- Superadmin can read linked documents for any submission
CREATE POLICY "superadmin_select_all_approval_request_documents"
  ON public.approval_request_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );
```

---

## 6. Submission Embedding Service

### New File: `src/service/rag/submissionEmbeddings.ts`

This is intentionally simple compared to `DocumentIngestionService` -- no file extraction, no chunking, no S3.

```typescript
// Conceptual structure:

class SubmissionEmbeddingService {

  /**
   * Build the text to embed from a submission's fields.
   * Includes submitter name for cross-user search.
   */
  buildEmbeddingText(submission: {
    title: string;
    vendor_name?: string | null;
    category?: string | null;
    department?: string | null;
    description?: string | null;
    purpose?: string | null;
    reason_for_purchase?: string | null;
    remarks?: string | null;
    items?: { name: string }[];
    submitter_name?: string | null;  // "Tanaka Taro"
  }): string {
    const parts = [
      submission.title,
      submission.vendor_name && `Vendor: ${submission.vendor_name}`,
      submission.category && `Category: ${submission.category}`,
      submission.department && `Department: ${submission.department}`,
      submission.description,
      submission.purpose && `Purpose: ${submission.purpose}`,
      submission.reason_for_purchase && `Reason: ${submission.reason_for_purchase}`,
      submission.remarks && `Remarks: ${submission.remarks}`,
      submission.items?.length && `Items: ${submission.items.map(i => i.name).join(", ")}`,
      submission.submitter_name && `Submitted by: ${submission.submitter_name}`,
    ].filter(Boolean);

    return parts.join("\n");
  }

  /**
   * Generate embedding and upsert into submission_embeddings.
   * Called after create or update.
   */
  async embedSubmission(params: {
    submissionId: string;
    userId: string;
    text: string;
    supabase: SupabaseClient;
  }): Promise<void> {
    // 1. Generate embedding via OpenAI
    const embedding = await openai.embeddings.create({
      model: AI_CONFIG.EMBEDDING.MODEL,  // text-embedding-3-small
      input: params.text,
      encoding_format: "float",
    });
    const vector = embedding.data[0].embedding;

    // 2. Upsert (insert or update if submission already has embedding)
    await params.supabase
      .from("submission_embeddings")
      .upsert({
        user_id: params.userId,
        approval_request_id: params.submissionId,
        embedding: vector,
        content: params.text,
        metadata: { updated_at: new Date().toISOString() },
      }, {
        onConflict: "approval_request_id"
      });
  }
}
```

### Key Differences from DocumentIngestionService

| Aspect | Document Embedding | Submission Embedding |
|--------|-------------------|---------------------|
| Text source | S3 file download + extraction | DB fields (already available) |
| Chunking | 800 chars / 200 overlap | None (one embedding per submission) |
| Batch processing | 80 segments per API call | 1 embedding per call |
| Duplicate detection | SHA256 content hash | Not needed (upsert by submission ID) |
| Trigger | POST /api/rag/ingest after file upload | Inline after create/update service call |
| Complexity | ~700 lines | ~80 lines |

---

## 7. Integration Points -- When to Trigger Embedding

### On `createApprovalRequest` (after successful insert)

```typescript
// In src/service/approvalRequest/approvalRequest.ts, after successful create:
// Fire-and-forget (don't block the response)
const submitterName = `${userProfile?.first_name ?? ""} ${userProfile?.last_name ?? ""}`.trim();
submissionEmbeddingService.embedSubmission({
  submissionId: data.id,
  userId: user.id,
  text: submissionEmbeddingService.buildEmbeddingText({
    ...params,
    submitter_name: submitterName,
  }),
  supabase,
}).catch(err => console.error("Submission embedding failed:", err));
```

### On `updateApprovalRequest` (after successful update)

Same pattern. Re-embed because title, description, vendor, items, etc. may have changed.

### On `updateApprovalRequestStatus` (optional)

Consider re-embedding when `approval_notes` is set (on reject/send-back). This would enable searching for "what feedback was given?" but is NOT essential for MVP. Can add later.

### Fire-and-Forget Pattern

Match the existing `logActivity` pattern used throughout the codebase -- embed async without awaiting. If embedding fails, the submission itself is still saved. Embedding can be retried via backfill.

---

## 8. New Tool: `search_submissions`

### Option A: New Standalone Tool (Recommended)

Create `src/app/api/openai/respond/tools/submission-search.ts`:

```typescript
const submissionSearchTool = {
  definition: {
    type: "function",
    function: {
      name: "search_submissions",
      description:
        "Semantic search across approval requests (ringi submissions). " +
        "Use this when the user asks about submissions by topic, vendor, person, " +
        "or any natural language query. Returns matching submissions ranked by relevance. " +
        "For exact filters (status, amount range), use manage_approval_requests(list) instead.",
      parameters: {
        type: "object",
        properties: {
          query_en: {
            type: "string",
            description: "Search query in English.",
          },
          query_ja: {
            type: "string",
            description: "Search query in Japanese.",
          },
          status: {
            type: "string",
            description: "Optional: filter by status (pending, approved, rejected, etc.).",
          },
          limit: {
            type: "integer",
            description: "Max results (1-20, default 10).",
          },
        },
        required: ["query_en", "query_ja"],
      },
    },
  },
  handler: async (args, { supabase, user, userRole }) => {
    // 1. Generate bilingual embeddings (same as document RAG)
    const [embeddingEn, embeddingJa] = await Promise.all([
      requestEmbedding(args.query_en),
      requestEmbedding(args.query_ja),
    ]);
    const embeddingAvg = embeddingEn.map((v, i) => (v + embeddingJa[i]) / 2);

    // 2. Role-based scoping
    const filterUserId = userRole === "superadmin" ? null : user.id;

    // 3. Call RPC
    const { data, error } = await supabase.rpc("match_submission_embeddings", {
      query_embedding: embeddingAvg,
      match_count: Math.min(args.limit ?? 10, 20),
      similarity_threshold: AI_CONFIG.EMBEDDING.SIMILARITY_THRESHOLD,
      filter_user_id: filterUserId,
      filter_status: args.status ?? null,
    });

    if (error) throw new Error(error.message);

    // 4. Transform results
    return {
      submissions: data.map(row => ({
        id: row.approval_request_id,
        similarity: row.similarity,
        title: row.title,
        status: row.status,
        amount: row.amount,
        vendor_name: row.vendor_name,
        category: row.category,
        department: row.department,
        priority: row.priority,
        approval_notes: row.approval_notes,
        created_at: row.created_at,
        submitter: row.submitter_first_name
          ? `${row.submitter_first_name} ${row.submitter_last_name}`
          : null,
      })),
    };
  },
};
```

### Option B: New `search` Action on Existing Tool

Add a `"search"` action to `manage_approval_requests`. This keeps the tool count at 4 (no new registration).

**Pros**: Fewer tools for the AI to choose from.
**Cons**: Overloads the tool; the AI must distinguish when to use `search` vs `list`. More complex handler.

### Recommendation: Option A (Standalone)

A dedicated `search_submissions` tool with clear description makes it unambiguous for the AI:
- **`search_submissions`** -- semantic/natural language search ("server purchase", "Tanaka's equipment")
- **`manage_approval_requests(list)`** -- structured filters (status=pending, amount > 1M, date range)

This mirrors the existing pattern where `search_user_documents` (semantic) is separate from `manage_documents(search)` (filename ILIKE).

Register in `src/app/api/openai/respond/tools/index.ts`:
```typescript
export const toolsRegistry: Tool[] = [
  ragTool,
  submissionSearchTool,  // NEW
  foldersTool,
  approvalRequestsTool,
  documentsTool,
];
```

---

## 9. Enhanced `manage_approval_requests` Tool (Still Needed)

Even with the new search tool, the existing tool needs improvements:

### 9A. Enhanced `list` Action
- Add `approval_notes`, `approved_by`, `rejected_by` to SELECT
- Add joined `approval_request_documents(documents(file_name))`
- Role-based scoping (superadmin sees all)
- New filters: `department`, `minAmount`, `maxAmount`, `dateFrom`, `dateTo`, `excludeDrafts`

### 9B. Enhanced `read` Action
- Replace generic CRUD with dedicated handler
- JOIN documents + submitter profile
- RLS handles access control

### 9C. Pass User Role via Tool Context
- Fetch `profiles.role` once in `route.ts`
- Thread through `tool-execution.ts` to all tool handlers

---

## 10. System Prompt Updates

Add to `src/app/api/openai/respond/prompts/v2.ts`:

```
## Submission Query Rules

Rule S1 -- Choosing the Right Tool:
- Natural language / topic queries: use search_submissions
  Examples: "server purchase", "Tanaka's request", "anything from Sakura Tech"
- Exact filters: use manage_approval_requests(list)
  Examples: "pending submissions", "over 1M yen", "from last month"
- Full details of one submission: use manage_approval_requests(read)

Rule S2 -- Bilingual Search:
- Always provide BOTH query_en and query_ja for search_submissions.
  Translate the user's query into both languages.

Rule S3 -- Role-Based Behavior:
- Employee: you can ONLY access their own submissions.
- Superadmin: you CAN access ALL submissions. Include submitter name in results.

Rule S4 -- Presenting Submissions:
- For list/search results: show title, status, amount, department, date. Keep scannable.
- For detail: show all fields. ALWAYS show approval_notes if status is
  rejected/need_revision/approved.
- If submission has attached documents, mention file names and offer to read content.

Rule S5 -- Cross-Reference with Documents:
When asked about a document attached to a submission:
1. read the submission (get document IDs)
2. call manage_documents(get_content) on the specific document
Do NOT use search_user_documents for this.
```

---

## 11. Backfill Strategy

Existing submissions need embedding on feature launch.

### Approach: One-Time API Endpoint or Script

```typescript
// Pseudocode for backfill:
async function backfillSubmissionEmbeddings(supabase) {
  // 1. Get all submissions (paginated)
  const { data: submissions } = await supabase
    .from("approval_requests")
    .select("*, profiles!user_id(first_name, last_name)")
    .order("created_at", { ascending: true });

  // 2. For each, build text and embed
  for (const submission of submissions) {
    const text = buildEmbeddingText({
      ...submission,
      submitter_name: `${submission.profiles.first_name} ${submission.profiles.last_name}`,
    });
    await embedSubmission({ submissionId: submission.id, userId: submission.user_id, text, supabase });
  }
}
```

Can be a protected API endpoint (`POST /api/admin/backfill-submission-embeddings`) or a standalone script run once.

---

## 12. Implementation Order

### Step 1: Migration (~1 hour)
- Create `submission_embeddings` table with RLS
- Create `match_submission_embeddings` RPC function
- Add superadmin RLS policies on `approval_requests` and `approval_request_documents`
- Run `supabase db push`

### Step 2: SubmissionEmbeddingService (~1 hour)
- New file: `src/service/rag/submissionEmbeddings.ts`
- `buildEmbeddingText()` -- concatenate fields
- `embedSubmission()` -- generate vector + upsert
- Keep it simple: ~80-100 lines total

### Step 3: Hook into Create/Update (~30 min)
- `src/service/approvalRequest/approvalRequest.ts`
- Fire-and-forget call after `createApprovalRequest` and `updateApprovalRequest`
- Fetch submitter name from profiles for embedding text

### Step 4: New `search_submissions` Tool (~1.5 hours)
- New file: `src/app/api/openai/respond/tools/submission-search.ts`
- Bilingual embedding, role-aware, status filter
- Register in `tools/index.ts`

### Step 5: Enhance Existing Tool (~1.5 hours)
- Enhanced `list`: role-based scoping, new filters, include approval_notes + documents
- Enhanced `read`: dedicated handler with joins + submitter profile
- Pass `userRole` from `route.ts` through tool context

### Step 6: System Prompt (~30 min)
- Add Rules S1-S5 to v2 prompt
- Teach AI when to use `search_submissions` vs `manage_approval_requests(list)` vs `read`

### Step 7: Backfill + Testing (~1.5 hours)
- Run backfill for existing submissions
- Test all scenarios from user brainstorm document
- Verify employee scoping (can't see others')
- Verify superadmin access (sees all)

---

## 13. Schema Changes Summary

### New

| Change | Type |
|--------|------|
| `submission_embeddings` table | New table (vector storage) |
| `match_submission_embeddings` RPC | New function (semantic search) |
| Superadmin SELECT on `approval_requests` | New RLS policy |
| Superadmin UPDATE on `approval_requests` | New RLS policy |
| Superadmin SELECT on `approval_request_documents` | New RLS policy |
| Superadmin SELECT on `submission_embeddings` | New RLS policy |
| Owner CRUD on `submission_embeddings` | New RLS policies |

### Not Changed

| What | Why |
|------|-----|
| `approval_requests` columns | All required fields already exist |
| `document_embeddings` table | Untouched -- file search remains separate |
| Existing RLS on `approval_requests` | Additive -- existing owner policies stay intact |

---

## 14. Two Strategies Considered for Search

### Strategy A: Search Submission Embeddings Directly (Chosen)

User asks "server purchase" -> embed query -> search `submission_embeddings` -> return matching submissions.

**Pros**: Direct, fast (one hop), clean architecture.
**Cons**: Requires new table + embedding pipeline.

### Strategy B: Search File Embeddings -> Find Linked Submissions

User asks "server purchase" -> search `document_embeddings` -> get file IDs -> query `approval_request_documents` junction -> return linked submissions.

**Pros**: Reuses existing infrastructure.
**Cons**:
- Not all submissions have attached files (drafts, quick requests)
- File content represents the DOCUMENT (quotation, contract), not the submission context (title, vendor, purpose)
- "Server purchase" in the submission title won't match if attached files don't mention "server purchase"
- Two-hop query: slower, more complex, fragile

**Verdict**: Strategy A is the correct approach. Strategy B is useful as a COMPLEMENT (for "what does the attached contract say?") but not as the primary search mechanism.

---

## 15. Risk Assessment

| Risk | Severity | Mitigation |
|------|:--------:|-----------|
| Embedding fails silently on create/update | Low | Fire-and-forget with error logging; backfill covers gaps |
| Superadmin RLS opens cross-user read | Intentional | Test that employee A cannot see employee B's submissions |
| Stale embedding after update | Low | Re-embed on every update; upsert pattern handles it |
| OpenAI API cost for embeddings | Low | `text-embedding-3-small` is cheap; ~1 call per submission lifecycle event |
| RPC performance at scale | Low for Phase 2B | pgvector index; consider IVFFlat index if 10K+ submissions |
| Backfill takes too long | Low | Submissions are few; batch embedding in groups of 80 (matching doc pipeline) |

---

## 16. Decision Summary

| Question | Answer |
|----------|--------|
| **Need embedding?** | Yes -- ILIKE can't handle semantic matching |
| **New table?** | Yes -- `submission_embeddings` |
| **New tool?** | Yes -- `search_submissions` (standalone, mirrors `search_user_documents` pattern) |
| **New RPC?** | Yes -- `match_submission_embeddings` |
| **Schema changes?** | New table + RPC + 7 RLS policies |
| **Enhance existing tool?** | Yes -- `manage_approval_requests` list/read improvements |
| **Prompt changes?** | Yes -- 5 new rules |
| **Strategy** | Submission embedding + enhanced tools + RLS fix + prompt update |
| **Embedding trigger** | Fire-and-forget after create/update (same pattern as activity logging) |
| **Chunking?** | No -- one embedding per submission (text < 800 chars) |

---

*This document covers technical architecture and strategy. See `ringi_submission_chat_brainstorm.md` for user-facing scenarios and UX flows.*
