# RAG Simplification: Remove AI Judgment & OpenAI PDF Extraction

## What

Remove two OpenAI-dependent features from the RAG ingestion pipeline:
1. **PDF text extraction via OpenAI** (`extractPDFWithStructuredOutput`) — replaced by `pdf-parse` library
2. **AI Judgment generation** — structured metadata (document_type, summary, entities, tags) generated for every file

Search is simplified from dual-path (semantic + metadata filters) to **semantic-only** search.

**Exception**: Image files still use the Vision API since JS cannot parse image content.

## Why

| Concern | Before | After |
|---------|--------|-------|
| **Cost** | Every file upload triggers 1-2 OpenAI API calls (PDF extraction + AI judgment) | Only embeddings + Vision (images only) |
| **Latency** | PDF extraction: ~5-15s, AI judgment: ~3-8s per file | PDF extraction: <1s via pdf-parse |
| **Complexity** | Dual-path search with 6 metadata filter params | Single semantic search with query + threshold |
| **Reliability** | Depends on OpenAI for text extraction (fallback to pdf-parse anyway) | Direct library extraction, no network dependency |

Semantic search (embeddings) already finds relevant documents without metadata filters. The AI judgment added cost/latency without proportional search quality improvement.

## How

### Before Architecture
```
Upload → S3 + Extract Text (OpenAI for PDF, libraries for others)
       → Generate AI Judgment (OpenAI for all files)
       → Chunk → Embed → Store

Search → Generate query embedding
       → match_document_embeddings_v2 (semantic + metadata filters)
       → Return results with ai_judgment
```

### After Architecture
```
Upload → S3 + Extract Text (pdf-parse for PDF, libraries for others, Vision for images)
       → Chunk → Embed → Store

Search → Generate query embedding
       → match_document_embeddings_v3 (semantic only)
       → Return results
```

## Files Changed

| File | Change |
|------|--------|
| `src/app/api/openai/respond/config/ai.config.ts` | Removed `DUAL_PATH` section, `PDF_EXTRACTION_MODEL` |
| `src/service/rag/triggerEmbeddings.ts` | Removed `extractPDFWithStructuredOutput`, `generateAIJudgment`, simplified PDF path and `ingestDocumentEmbeddings` |
| `src/app/api/upload/route.ts` | Removed `ai_judgment` from DB insert |
| `supabase/migrations/20260221000000_create_match_document_embeddings_v3.sql` | New semantic-only search function |
| `src/app/api/openai/respond/tools/rag.ts` | Removed metadata filter params, calls v3 |
| `src/app/api/openai/respond/route.ts` | Simplified system prompt search instructions |

## Not Changed

- `types/document.ts` — `AIJudgment` type kept for existing data compatibility
- All frontend components, hooks, client-side services
- Tool orchestrator, stream manager, tool execution, progress messages
- Document/folder/approval-request tools
- v1 and v2 SQL functions (kept for backward compatibility)
