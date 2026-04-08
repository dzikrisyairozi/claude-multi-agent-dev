# Dual-Path Search Pipeline — Adapted for EB-FILEMG (Supabase + OpenAI)

> Enhancement layer for document search: combining semantic search with metadata filtering.
>
> Date: 2026-02-20
>
> Source: Distilled from `../research/rag_is_dead.md` (Dual-Path architecture analysis)
>
> Audience: Engineers
>
> Depends on: `improvement_technical_proposal.en.md` (Items 6, 8, 15)

---

## Context

The existing Phase 2 improvement proposals define 20 items across 3 tiers for demo reliability. Separately, the "Dual-Path Search Pipeline" research demonstrates a powerful pattern: combining **semantic search** (vector similarity) with **metadata filtering** (structured document attributes) for higher-accuracy retrieval without full agentic scanning latency.

**The gap**: The current proposals treat `ai_judgment` (Tier 2, Item 8) as a storage enhancement, but don't leverage it as a **search path**. The Dual-Path research shows that metadata-filtered search is a distinct, valuable capability — "show me all invoices" shouldn't require vector similarity at all.

**This plan** adds the Dual-Path concept as an enhancement layer on top of the existing Tier 1/2 proposals, using Supabase (not DuckDB) and OpenAI (not Gemini).

---

## Tech Stack Mapping

| Dual-Path (Research) | EB-FILEMG (Ours) |
|---|---|
| DuckDB + HNSW index | Supabase pgvector + `<=>` cosine distance |
| Gemini Embeddings (768-dim) | OpenAI `text-embedding-3-small` (1536-dim) — already done |
| DuckDB typed columns (document_type, entities) | `ai_judgment JSONB` column + GIN index |
| DuckDB `corpora` table | Not needed (single-tenant per user via RLS) |
| DuckDB `schemas` table | Not needed (fixed JSONB schema, AI knows fields from tool params) |
| DuckDB `chunks` + `chunk_embeddings` | `document_embeddings` table — already exists |
| LangExtract (Gemini metadata extraction) | OpenAI `gpt-4o-mini` with Structured Output + Zod validation |

---

## What's Already Covered by Existing Proposals

| Dual-Path Concept | Existing Proposal |
|---|---|
| Metadata extraction via LLM | Tier 2 Item 8 (`ai_judgment` column) |
| Smart chunking with overlap | Already implemented (800 chars, 200 overlap) |
| Embedding model | `text-embedding-3-small` in `ai.config.ts` |
| Multi-step retrieval / backtracking | Tier 3 Item 19 + `ToolOrchestrator` MAX_TOOL_ROUNDS=5 |
| PDF text + metadata extraction | Tier 1 Item 15 (File Input API + Structured Output) |

## What's NEW from Dual-Path (to add)

| Feature | Priority | Description |
|---|---|---|
| `match_document_embeddings_v2` RPC | HIGH | Single function supporting all 3 search paths with JOIN enrichment |
| Metadata filter parameters on `search_user_documents` | HIGH | `documentType`, `organization`, `dateFrom`, `dateTo`, `tags`, `category` |
| Metadata-only search mode (Path B) | HIGH | Allow search without query — pure JSONB filtering |
| System prompt dual-path decision tree | MEDIUM | Teach AI when to use semantic vs. metadata vs. combined |
| Enriched search results with `ai_judgment` summary | MEDIUM | Return `documentType` + `summary` in results |

## What to SKIP (YAGNI)

| Feature | Reason |
|---|---|
| Schema Discovery endpoint | Overkill — AI knows fields from tool param definitions |
| Full-text search (tsvector) as 3rd path | Semantic search handles keyword queries well enough |
| Re-ranking pipeline | Adds latency/cost, pgvector ranking sufficient for demo |
| Adaptive chunking | Already decided YAGNI in existing proposals |
| Embedding metadata enrichment | The v2 function JOINs at query time — no chunk metadata needed |
| Cross-document graph backtracking | Existing multi-step retrieval covers sequential lookups |

---

## Implementation Steps

### Step 1: Add `ai_judgment` JSONB Column (enhances existing Tier 2 Item 8)

**Migration file**: `supabase/migrations/YYYYMMDD_add_ai_judgment_to_documents.sql`

```sql
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS ai_judgment JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_ai_judgment_gin
  ON public.documents USING GIN (ai_judgment);

CREATE INDEX IF NOT EXISTS idx_documents_ai_judgment_type
  ON public.documents ((ai_judgment->>'document_type'));
```

Run via `supabase db push`.

**Type definition**: Add `AIJudgment` type in `src/types/document.ts`:

```typescript
export type AIJudgment = {
  document_type: string;     // "invoice" | "contract" | "receipt" | "report" | "meeting_notes" | etc.
  summary: string;           // 2-3 sentence summary
  purpose: string;           // Why this document exists
  key_entities: {
    people: string[];
    organizations: string[];
    amounts: string[];
    dates: string[];
  };
  tags: string[];
  language: string;          // "ja" | "en" | "mixed"
  confidence: number;        // 0-1
};
```

---

### Step 2: Generate `ai_judgment` During Ingestion

**File**: `src/service/rag/triggerEmbeddings.ts`

Add `generateAIJudgment()` function:
- For **PDFs** (with Item 15): comes from unified `extractPDFWithStructuredOutput()` — single API call returns both `extracted_text` and `ai_judgment`
- For **non-PDFs**: separate call to `gpt-4o-mini` with `response_format: { type: "json_schema" }`, first 3000 chars of text content
- Validate with Zod schema, store NULL if validation fails
- Cost: ~$0.0004 per non-PDF file

Pipeline becomes:
```
S3 download → extract text → generate ai_judgment → chunk → embed →
DELETE old embeddings → INSERT new embeddings → UPDATE text_content + ai_judgment
```

---

### Step 3: Create `match_document_embeddings_v2` RPC Function

**Migration file**: `supabase/migrations/YYYYMMDD_create_match_document_embeddings_v2.sql`

Key design:
- Accepts optional `query_embedding` (NULL = skip vector search)
- Accepts optional metadata filters: `filter_document_type`, `filter_organization`, `filter_date_from`, `filter_date_to`, `filter_tags`, `filter_category`
- JOINs with `documents` table to return enriched data (file_name, mime_type, ai_judgment) in a single query
- Supports all 3 search paths:
  - **Path A** (semantic): `query_embedding` provided, no filters → pure cosine similarity
  - **Path B** (metadata): no `query_embedding`, filters provided → JSONB filtering only
  - **Path C** (combined): both provided → vector similarity within filtered document set
- Preserves existing `match_document_embeddings` for backward compatibility
- RLS enforced: `de.user_id = auth.uid()`

---

### Step 4: Upgrade `search_user_documents` Tool

**File**: `src/app/api/openai/respond/tools/rag.ts`

Changes:
1. Make `query` parameter **optional** (currently required)
2. Add new optional parameters: `documentType`, `organization`, `dateFrom`, `dateTo`, `tags`, `category`
3. Validate: at least `query` or one metadata filter must be provided
4. Generate embedding only when `query` is present
5. Call `match_document_embeddings_v2` instead of `match_document_embeddings`
6. Remove the separate document enrichment query (v2 returns joined data — simpler!)
7. Include `aiJudgment` summary in response

Handler flow simplifies from:
```
Current:  embed(query) → RPC(v1) → query(documents) → merge results
New:      embed(query?) → RPC(v2) → done (already joined)
```

---

### Step 5: Update System Prompt with Dual-Path Decision Tree

**File**: `src/app/api/openai/respond/route.ts`

Add to the `<tool_selection>` section (part of existing Item 6 restructured prompt):

```
SEARCH APPROACH:
- Content question → query param: "what does the contract say about payment?"
- Type-based → documentType filter: "show all invoices" → documentType: "invoice"
- Company-based → organization filter: "docs from Company X" → organization: "Company X"
- Date-based → dateFrom/dateTo: "documents from last month"
- Combined → both query + filter: "invoices about the Tokyo project"
```

---

### Step 6: Update `ai.config.ts`

**File**: `src/app/api/openai/respond/config/ai.config.ts`

Add dual-path configuration:

```typescript
DUAL_PATH: {
  DEFAULT_SIMILARITY_THRESHOLD: 0.7,
  MAX_RESULTS: 20,
  AI_JUDGMENT_MODEL: "gpt-4o-mini",
  AI_JUDGMENT_MAX_INPUT_CHARS: 3000,
}
```

---

## Execution Sequence (integrated with existing tiers)

1. **Tier 1 sprint** (existing items 1-7, 15, 20) — no changes, proceed as planned
2. **Dual-Path foundation** (Steps 1-2 above) — enhances existing Tier 2 Item 8
3. **Dual-Path search** (Steps 3-4 above) — new, builds on Step 2
4. **Prompt integration** (Step 5 above) — extends existing Tier 1 Item 6
5. **Tier 2 remaining** (existing items 9-14) — proceed as planned, Item 9 now includes `ai_judgment.summary`

---

## Files to Create/Modify

| Action | File |
|---|---|
| CREATE | `supabase/migrations/YYYYMMDD_add_ai_judgment_to_documents.sql` |
| CREATE | `supabase/migrations/YYYYMMDD_create_match_document_embeddings_v2.sql` |
| MODIFY | `src/types/document.ts` — add `AIJudgment`, `SearchFilters`, `DualPathSearchResult` types |
| MODIFY | `src/service/rag/triggerEmbeddings.ts` — add `generateAIJudgment()`, integrate into pipeline |
| MODIFY | `src/app/api/openai/respond/tools/rag.ts` — upgrade tool definition + handler for dual-path |
| MODIFY | `src/app/api/openai/respond/route.ts` — add dual-path tool selection to system prompt |
| MODIFY | `src/app/api/openai/respond/config/ai.config.ts` — add dual-path config |

---

## Verification

1. **Upload a test PDF** → verify `ai_judgment` is populated in `documents` table
2. **Path A test**: "find documents about budget" → AI calls `search_user_documents({ query: "budget" })`
3. **Path B test**: "show me all invoices" → AI calls `search_user_documents({ documentType: "invoice" })`
4. **Path C test**: "find invoices from Company X" → AI calls with both `documentType` + `organization` (or `query`)
5. **Graceful degradation**: Documents without `ai_judgment` still appear in semantic search, just not in metadata filters
6. **Edge case**: No parameters → returns actionable error message
7. **Performance**: Single RPC call (v2 with JOIN) should be faster than current 2-query approach
