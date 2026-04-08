# AI Chat & RAG Improvement Proposal

> Decisive improvement plan for EB-FILEMG demo reliability.
>
> Generated: 2026-02-17
>
> Source: Distilled from `ai_chat_rag_improvement_brainstorm.md` (Sections A–M)

---

## Architectural Decisions

These are firm decisions — no alternatives under consideration:

1. **No LangChain.** Our pipeline is straightforward (extract → chunk → embed → search). LangChain's abstractions add indirection without capability we need. Direct OpenAI API + Zod stays.
2. **No Pydantic AI.** Python-only framework; we are TypeScript. Zod covers structured LLM output validation.
3. **No modular prompt system.** Our prompt is ~600 tokens with 4 tools — well below the threshold where runtime prompt assembly pays off. We restructure internally (clear sections), not modularly.
4. **No multi-step retrieval for demo.** Two-pass orchestration (1st call picks tools, 2nd call streams answer) with single retrieval is sufficient for demo use cases. Multi-step adds latency and infinite-loop risk for marginal gain.
5. **Ringi IDs via join-at-query-time.** After RAG returns document IDs, query `approval_request_documents` junction table. No embedding metadata staleness to manage.
6. **No adaptive chunking for demo.** Fixed 800-char chunks with 200 overlap work. Revisit only if retrieval quality is visibly poor during testing.
7. **Unified PDF extraction via File Input + Structured Output.** For PDFs, we send the file directly to OpenAI with a structured output schema and get back both `extracted_text` and `ai_judgment` in one call. This replaces `pdf-parse` as the primary PDF processor, handles scanned PDFs automatically, and eliminates the need for a separate ai_judgment generation step. `pdf-parse` retained as fallback for very large documents or cost optimization.

---

## Tier 1 — Demo-Critical

These prevent demo failures. Implement first.

### 1. Image Text Extraction via Vision API

**What**: Route image uploads (jpg, png, heic, webp) to OpenAI Vision API (`gpt-4.1-mini`) for text extraction.

**Why**: Images currently return empty string — no text, no embeddings, no searchability. Demo users will upload receipts and invoices as photos.

**How**: Add an image branch in `extractTextFromBuffer` at `src/service/rag/triggerEmbeddings.ts`. Convert buffer to base64, call Vision API with a structured extraction prompt (`temperature: 0.1`), return extracted text.

**Cost**: ~$0.003–0.01 per image. Acceptable for demo volume.

**Effort**: M

**Note**: The same Vision capability extends to PDFs via OpenAI's PDF File Input API (see new Tier 1 item: Native PDF Understanding). Images use base64 `image_url`; PDFs use base64 `input_file` with structured output.

---

### 2. Content Deduplication via SHA-256

**What**: Hash extracted `text_content` with SHA-256. Skip embedding generation if an identical hash exists for the same user.

**Why**: Uploading the same file twice creates duplicate embeddings and duplicate search results. Directly from `demo_actionable_items.md`.

**How**: Add `content_hash TEXT` column to `documents` table. Index on `(user_id, content_hash)`. Check before embedding in `src/service/rag/triggerEmbeddings.ts`. Hash text content (not raw binary) so format-different but content-identical files are caught.

**Effort**: S

---

### 3. Safe Ingestion Order — Defer Delete Until New Embeddings Ready

**What**: Reorder the ingestion pipeline: extract → chunk → embed → DELETE old embeddings → INSERT new embeddings → update `text_content`.

**Why**: Current flow deletes old embeddings first (step 1), then processes. If embedding generation fails after delete, data is lost permanently.

**How**: Move the `DELETE FROM document_embeddings WHERE document_id = ?` in `src/service/rag/triggerEmbeddings.ts` to immediately before the INSERT, after new embeddings are generated and ready.

**Effort**: S

---

### 4. Parallel Tool Execution via Promise.all

**What**: Replace the serial `for...of` loop in `executeToolCalls` with `Promise.all`.

**Why**: When OpenAI returns 2+ tool calls (e.g., `search_user_documents` + `manage_documents`), they are independent operations. Running them sequentially wastes ~500ms+ per additional tool call.

**How**: Refactor `src/app/api/openai/respond/utils/tool-execution.ts`. Map each tool call to an async function, execute with `Promise.all`. Each handler is stateless; Supabase handles concurrent queries natively.

**Effort**: S

---

### 5. UUID Validation Before Tool Dispatch

**What**: Validate that `documentId` and `id` arguments match UUID format before passing to tool handlers. Return an actionable error message if they don't.

**Why**: The LLM sometimes passes file names instead of UUIDs. Current code sends them to Supabase which silently returns empty results — the user sees "no results found" with no explanation.

**How**: Add a UUID regex check in `src/app/api/openai/respond/utils/tool-execution.ts` after argument parsing. If invalid, return `{ error: "Invalid documentId. Use manage_documents(search) to find the UUID first." }` directly as the tool response. The LLM will self-correct.

**Effort**: S

---

### 6. Restructured System Prompt with Sections

**What**: Replace the flat 8-rule numbered list in `SYSTEM_PROMPT` with a structured prompt using labeled sections: `<role>`, `<tool_selection>`, `<rules>`, `<output_format>`. Consolidate the frontend language prompt into the backend prompt.

**Why**: Two fragmented prompts (backend in `route.ts`, frontend in `LanguageProvider.tsx`). No tool selection guidance — LLM relies solely on tool descriptions. No output format instructions.

**How**: Rewrite `SYSTEM_PROMPT` in `src/app/api/openai/respond/route.ts`. Add a `language` field to the request payload. Build the prompt server-side with language interpolation. Simplify the frontend `chat.systemPrompt` to just pass the language code.

**Key additions**:
- Explicit tool selection decision tree (name → search, content → RAG, create ringi → read doc first)
- Domain-grouped rules (approval rules together, document rules together)
- Output format expectations (concise, markdown tables for structured data)
- Dual-path search decision tree (see `dual_path_search_pipeline.en.md` Step 5)

**Effort**: M

---

### 7. Multi-File Handling Prompt Rule

**What**: Add a rule to the system prompt for multi-file scenarios: batch uploads, sequential file-per-message conversations.

**Why**: When users upload 3 files at once or upload files across messages, the AI needs explicit guidance to treat them as related and cross-reference them.

**How**: Add to the `<rules>` section of the restructured prompt: treat batch uploads as related, summarize all files before acting, cross-reference amounts across documents for ringi creation.

**Effort**: S

---

### 15. Native PDF Understanding via File Input API

**What**: Send PDF buffer as base64 to OpenAI with a structured output schema. Returns both extracted text (for RAG chunking/embedding) and `ai_judgment` (for classification/UI) in a single call. Handles text-based AND scanned PDFs natively.

**Why**: Scanned PDFs are extremely common in Japanese business (stamped receipts, signed contracts, formatted invoices with tables). The PDF File Input API handles both text-based and scanned PDFs automatically — the model sees both extracted text and page images. No additional dependencies (`pdf-to-img`, `pdfjs-dist`) required. This also merges the text extraction and `ai_judgment` generation into one API call, reducing complexity and cost.

**How**: In `extractTextFromBuffer`, add a PDF branch that encodes the buffer as base64 and calls OpenAI with `response_format: { type: "json_schema" }`. The schema defines `extracted_text` (string) and `ai_judgment` (object with document_type, summary, key_entities, tags, etc.). Two API options available: Chat Completions API (base64/file_id + `response_format`, current codebase) and Responses API (also supports URL-based input, future option with presigned S3 URLs). `pdf-parse` retained as fallback for very large documents or bulk re-processing cost optimization.

**Effort**: S

> **Promoted from Tier 3 to Tier 1.** Originally planned as a medium-effort scanned PDF fallback using `pdf-to-img`. With OpenAI's PDF File Input API + Structured Output, this becomes a small-effort, high-impact improvement that replaces the primary PDF processing path entirely.

---

### 20. Developer Reset Tool

**What**: Env-gated page at `/dev-tools` with a "Reset All Data" button that wipes all tables (threads, documents, embeddings, approval requests, folders, activity logs) and S3 files. Shows current data counts and reset results.

**Why**: Testing improvements requires fresh state. Manual cleanup across 9 tables + S3 is error-prone and slow. Orphan embeddings and stale threads pollute test results.

**How**: Server action using `supabaseAdmin` for global delete (bypasses RLS), `deleteFileFromS3` for S3 cleanup. Gated by `NEXT_PUBLIC_DEV_TOOLS=true`. Delete order respects foreign key cascades: `approval_requests` → `documents` → `ai_threads` → `folders` → `activity_logs` → S3 files.

**Effort**: S

---

## Tier 2 — Quality Improvements

Improve reliability and user experience after Tier 1 is stable.

### 8. `ai_judgment` JSONB Column for Structured AI Analysis

**What**: Add an `ai_judgment JSONB` column to `documents`. After text extraction and before chunking, call `gpt-4.1-mini` to generate structured metadata: `document_type`, `summary`, `purpose`, `key_entities` (people, organizations, amounts, dates), `tags`, `language`, `confidence`.

**Why**: Currently `text_content` stores raw text with no structured understanding. The AI can't answer "what invoices do I have?" without vector search, which is imprecise for type-based queries. `ai_judgment` enables: type-based filtering, UI enrichment (document type badges, summaries), ringi auto-fill from key entities.

**How**: Migration to add column. For PDF files, `ai_judgment` is generated as part of the unified PDF extraction (see new Tier 1 item: Native PDF Understanding) — no separate call needed. For non-PDF files (images, DOCX, text), new `generateAIJudgment` function in `src/service/rag/triggerEmbeddings.ts`. Run on first 3000 chars with `response_format: { type: "json_object" }`. Validate with Zod schema. Cost: ~$0.0004 per non-PDF file. This effectively reduces the scope of this item since PDF handling (the most complex case) is covered by the Tier 1 item.

**Effort**: M

> **Extension**: `ai_judgment` also enables metadata-filtered search (Dual-Path). See `dual_path_search_pipeline.en.md` for how this column becomes a search path — not just storage.

---

### 9. Richer File Context in [Attached Documents]

**What**: Expand the `[Attached Documents]` block from `- name (ID: uuid)` to include mime type, size, category, and (once available) `ai_judgment` summary.

**Why**: Currently the LLM sees only `- Invoice.pdf (ID: abc-123)`. With richer metadata, it can skip a `manage_documents(search)` call and go straight to `get_content`. Fewer tool calls = faster response.

**How**: Modify `formatMessagesForAI` in `src/components/chat/hooks/useThreadWorkspace.ts`. Add `mimeType`, `size`, `category` fields to the file context string. Later, add `ai_judgment.summary` when available.

**Effort**: S

---

### 10. Tool Result Truncation for Large Documents

**What**: Cap `get_content` tool responses at 8000 characters (~2000 tokens). Append a truncation note pointing to `search_user_documents` for specific sections.

**Why**: A 10-page document returns 15K+ tokens in the tool result, risking token overflow in the 2nd LLM call and inflating cost.

**How**: Add truncation logic in `src/app/api/openai/respond/tools/documents.ts`, `get_content` action. Slice at 8000 chars, append `[... truncated, use search_user_documents for specific sections]`.

**Effort**: S

---

### 11. Parallel Batch Ingestion

**What**: Replace the sequential `for` loop in `POST /api/rag/ingest` with `Promise.allSettled` for multi-file uploads.

**Why**: For batch uploads of 3-5 files, parallel ingestion cuts total time significantly. Each ingestion is independent (different S3 keys, different embedding calls).

**How**: Refactor `src/app/api/rag/ingest/route.ts`. Map documents to `ingestDocumentEmbeddings` promises, run with `Promise.allSettled`, collect results including per-file failure reasons.

**Note**: With the unified PDF extraction (Item 15), parallel ingestion gains are amplified — each parallel pipeline includes the OpenAI PDF extraction + judgment call (`extractPDFWithStructuredOutput`). For a batch of 3 PDFs, this means 3 concurrent OpenAI calls instead of 3 sequential ones. Rate limit safe at demo volume (gpt-4o-mini: ~30K RPM).

**Effort**: S

---

### 12. First-Call Response Validation

**What**: Validate that OpenAI's first-call response contains `choices[0]` before proceeding to tool execution. Return a 502 with a user-friendly message if not.

**Why**: If OpenAI returns malformed JSON or an empty choices array, current code proceeds with `undefined` values — silent failure, no response to user.

**How**: Add a guard in `src/app/api/openai/respond/route.ts` after the first `runOpenAI` call.

**Effort**: S

---

### 13. Tool Execution Timeout (30s)

**What**: Wrap each tool handler call with a 30-second `Promise.race` timeout.

**Why**: If a Supabase query or S3 operation hangs, the entire request blocks indefinitely. User sees infinite loading.

**How**: Add a `withTimeout` utility in `src/app/api/openai/respond/utils/tool-execution.ts`. Apply to each `handler()` call.

**Effort**: S

---

### 14. Actionable Error Messages Back to LLM

**What**: When a tool fails, return `{ error: "{toolName} failed: {message}", suggestion: "Try a different approach or ask the user for more information." }` instead of generic `"Tool execution failed"`.

**Why**: The LLM can recover gracefully when it knows what went wrong. Generic errors produce generic apologies.

**How**: Update the catch block in `src/app/api/openai/respond/utils/tool-execution.ts`.

**Effort**: S

---

## Tier 3 — Future Enhancements

Post-demo or only if specific need arises during testing.

### 16. Excel Extraction via SheetJS

**What**: Add `xlsx` (SheetJS) dependency. Route `.xlsx`/`.xls` files to `XLSX.read` → `sheet_to_csv` per sheet.

**Why**: Excel files currently return empty. Some demo scenarios may involve spreadsheet data.

**How**: `npm install xlsx`. Add branch in `extractTextFromBuffer`. Output: `[Sheet: sheetName]\n{csv}` per sheet.

**Effort**: S

---

### 17. Streaming Error Recovery in Frontend

**What**: Detect interrupted SSE streams (no `[DONE]` token) and show a recovery message to the user.

**Why**: Currently if the stream breaks mid-response, the user sees a partial message with no indication of failure. Silent truncation.

**How**: In `src/hooks/chat/useAssistantStream.ts`, after the parsing loop, check if `[DONE]` was received. If not but we have partial content, append `_(Response was interrupted. Please try again if incomplete.)_`.

**Effort**: S

---

### 18. Conversation Window Management

**What**: For long threads (50+ messages), implement a sliding window: keep system prompt + last 20 messages + summarize older messages.

**Why**: All messages are sent to OpenAI every time. Long threads inflate token usage and cost.

**How**: Add a message window manager that summarizes messages beyond the window into a `[Conversation Summary]` block. Not needed for demo (conversations are short).

**Effort**: L

---

### 19. Multi-Step Retrieval with Iteration Cap

**What**: Allow the 2nd LLM call to request additional tools (change `tool_choice: "none"` to `"auto"`) with a `MAX_TOOL_ROUNDS = 3` cap.

**Why**: Enables cross-document reasoning (e.g., "compare Q1 and Q2 budgets") where a single retrieval round isn't enough.

**How**: Wrap the 2nd call in a loop that checks for tool calls, executes them, and appends results. Cap at 3 iterations. Final iteration forces `tool_choice: "none"`.

**Effort**: M

---

## High-Level Summary

| # | Improvement | Tier | Effort | Primary File(s) |
|---|-----------|------|--------|-----------------|
| 1 | Image Vision API extraction | 1 | M | `service/rag/triggerEmbeddings.ts` |
| 2 | SHA-256 content dedup | 1 | S | `service/rag/triggerEmbeddings.ts`, migration |
| 3 | Safe ingestion order | 1 | S | `service/rag/triggerEmbeddings.ts` |
| 4 | Parallel tool execution | 1 | S | `api/openai/respond/utils/tool-execution.ts` |
| 5 | UUID validation | 1 | S | `api/openai/respond/utils/tool-execution.ts` |
| 6 | Restructured system prompt | 1 | M | `api/openai/respond/route.ts`, `providers/LanguageProvider.tsx` |
| 7 | Multi-file prompt rule | 1 | S | `api/openai/respond/route.ts` |
| 8 | `ai_judgment` column | 2 | M | `service/rag/triggerEmbeddings.ts`, migration |
| 9 | Richer [Attached Documents] | 2 | S | `components/chat/hooks/useThreadWorkspace.ts` |
| 10 | Tool result truncation | 2 | S | `api/openai/respond/tools/documents.ts` |
| 11 | Parallel batch ingestion | 2 | S | `api/rag/ingest/route.ts` |
| 12 | First-call validation | 2 | S | `api/openai/respond/route.ts` |
| 13 | Tool timeout (30s) | 2 | S | `api/openai/respond/utils/tool-execution.ts` |
| 14 | Actionable error messages | 2 | S | `api/openai/respond/utils/tool-execution.ts` |
| 15 | Native PDF Understanding via File Input API | 1 | S | `service/rag/triggerEmbeddings.ts` |
| 16 | Excel SheetJS extraction | 3 | S | `service/rag/triggerEmbeddings.ts` |
| 17 | Streaming error recovery | 3 | S | `hooks/chat/useAssistantStream.ts` |
| 18 | Conversation window mgmt | 3 | L | `components/chat/hooks/useThreadWorkspace.ts` |
| 19 | Multi-step retrieval | 3 | M | `api/openai/respond/route.ts` |
| 20 | Developer Reset Tool | 1 | S | `service/devTools/resetUserData.ts`, `app/dev-tools/page.tsx` |
| 21 | Dual-Path Search Pipeline | 2 | M | `tools/rag.ts`, migration, `route.ts` — see `dual_path_search_pipeline.en.md` |

**Execution plan**: Tier 1 (items 1–7) first as a sprint. Then Tier 2 (items 8–14, 21) as a quality pass. Tier 3 only if needed post-demo. Item 21 (Dual-Path) builds on Item 8 and extends Item 6.

**Total effort**: 9 Small + 7 Medium + 1 Large across all tiers. Tier 1 alone is 7S + 2M — achievable in a focused sprint.
