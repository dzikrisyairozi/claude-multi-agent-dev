# Simplification V2 — Lower Cost Chat + Smarter File Handling

## Overview

This document describes optimizations to reduce OpenAI API costs and latency by adding `reasoning_effort: "low"` to all chat completion calls.

---

## Current Architecture Flow

### 1. File Upload Pipeline

```
User drops file → POST /api/upload
  ├── SHA256 hash check (dedup)
  ├── S3 upload (parallel)
  ├── Text extraction (parallel)
  │   ├── PDF → pdf-parse
  │   ├── DOCX → mammoth
  │   ├── XLSX → xlsx (CSV conversion)
  │   ├── Images → OpenAI Vision API
  │   └── Text files → UTF-8 decode
  ├── Insert document record to Supabase
  └── Return DocumentRecord[]
```

### 2. RAG Ingestion Pipeline

```
POST /api/rag/ingest { documentIds }
  ├── Fetch document records from DB
  ├── For each document:
  │   ├── Get text_content (from DB or re-extract from S3)
  │   ├── Content hash dedup check
  │   ├── Chunk text (800 chars, 200 overlap, sentence boundaries)
  │   ├── Generate embeddings (text-embedding-3-small, batch 80)
  │   └── Upsert to document_embeddings table
  └── Return IngestionResult[]
```

### 3. Chat Flow

```
User sends message → POST /api/openai/respond
  ├── Auth + thread resolution
  ├── Build system prompt (language-aware)
  ├── Tool orchestration loop (max 5 rounds):
  │   ├── Send messages + tools to OpenAI (non-streaming)
  │   ├── If tool_calls in response:
  │   │   ├── Execute tools in parallel (30s timeout each)
  │   │   ├── Stream progress + metadata via SSE
  │   │   └── Append tool results → loop again
  │   └── If no tool_calls → break
  ├── Final streaming response to client
  └── SSE: progress events → metadata → chat chunks → [DONE]
```

---

## How Files Become Visible to AI

When a user uploads a file in a chat, the frontend injects file context directly into the message content:

```
User message: "Please analyze this document"
+ Injected context: [Document ID: uuid, Name: report.pdf, Extracted text: "...first 8000 chars..."]
```

This means the AI already has:
- The document UUID (for direct DB lookup)
- The extracted text content (no need for semantic search)

---

## AI Tool Selection Logic

The system prompt instructs the AI on when to use each tool:

| Scenario | Tool | Why |
|----------|------|-----|
| Find document by name | `manage_documents(search)` | Name-based DB lookup |
| Read document content | `manage_documents(get_content)` | Direct DB fetch by UUID |
| Search by meaning/topic | `search_user_documents` | Vector similarity (RAG) |
| List recent documents | `manage_documents(list)` | DB query with limit |
| Folder operations | `manage_folders` | CRUD on folders |
| Approval requests | `manage_approval_requests` | Ringi CRUD |

### The Redundancy Problem

When a file is just uploaded, the AI receives the file's text inline in the message. Despite this, it sometimes still calls `search_user_documents` (semantic search) — an expensive operation involving embedding generation + vector similarity search. The system prompt should guide it to prefer inline context first.

---

## Optimization: Low Reasoning Effort

### What Changed

Added `reasoning_effort: "low"` to all OpenAI chat completion payloads:

1. **Tool detection calls** (`createStreamingPayload`) — where the AI decides which tools to call
2. **Final response calls** (`createFinalStreamingPayload`) — the streamed answer to the user

### Where

- **Config**: `src/app/api/openai/respond/config/ai.config.ts` — new `REASONING_EFFORT` constant
- **Payloads**: `src/app/api/openai/respond/services/stream-manager.ts` — both payload methods

### Expected Impact

- Lower token usage per request (fewer reasoning tokens consumed)
- Faster response times (less compute per call)
- Reduced cost per conversation turn
- Behavior should remain functionally equivalent for file management tasks (classification, search, CRUD)

### Configuration

```typescript
// ai.config.ts
REASONING_EFFORT: "low" as const
```

This is set as a centralized config value so it can be easily adjusted (e.g., bumped to `"medium"` or `"high"` if response quality degrades for complex queries).

---

## Files Modified

| File | Change |
|------|--------|
| `src/app/api/openai/respond/config/ai.config.ts` | Added `REASONING_EFFORT` |
| `src/app/api/openai/respond/services/stream-manager.ts` | Added `reasoning_effort` to both payload methods |
