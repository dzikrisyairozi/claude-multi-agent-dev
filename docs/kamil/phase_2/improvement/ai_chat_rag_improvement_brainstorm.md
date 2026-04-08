# AI Chat & RAG Improvement Brainstorm

> Comprehensive improvement strategy for demo reliability.
>
> Generated: 2026-02-17
>
> Source context: `demo_actionable_items.md` focus areas + Boss direction from PROMPT_04

---

## Table of Contents

- [A. File Processing Router](#a-file-processing-router)
- [B. Dual-Layer Content Model](#b-dual-layer-content-model)
- [C. Enhanced Embedding Metadata](#c-enhanced-embedding-metadata)
- [D. Multi-File Upload Scenarios](#d-multi-file-upload-scenarios)
- [E. RAG Reliability](#e-rag-reliability)
- [F. AI Chat Reliability](#f-ai-chat-reliability)
- [G. Framework Assessment](#g-framework-assessment)
- [H. Implementation Priority](#h-implementation-priority)
- [I. System Prompt Engineering](#i-system-prompt-engineering)
- [J. Modularity Assessment](#j-modularity-assessment)
- [K. Parallelism & Concurrency Opportunities](#k-parallelism--concurrency-opportunities)
- [L. Context Engineering Principles](#l-context-engineering-principles)
- [M. Multi-Step Retrieval Assessment](#m-multi-step-retrieval-assessment)

---

## A. File Processing Router

### Problem

`extractTextFromBuffer` in `src/service/rag/triggerEmbeddings.ts` currently handles PDF (pdf-parse), DOCX (mammoth), Google Docs (JSON parse), and text-like formats. **Images return empty string** — no text extraction at all. Excel files also return empty. For a demo where users upload invoices, receipts, or scanned documents as images, this is a critical gap.

### Proposed Solution: Mime-Type Router

Route file processing based on mime type / extension, with each format getting the right extraction strategy:

```
extractTextFromBuffer(buffer, mimeType, fileName)
  │
  ├─ image/* (jpg, png, heic, webp)
  │   └─ OpenAI Vision API (gpt-4.1-mini) → text description
  │
  ├─ application/pdf
  │   └─ OpenAI PDF File Input + Structured Output
  │       → { extracted_text, ai_judgment } (single call)
  │       (fallback: pdf-parse for large docs / cost optimization)
  │
  ├─ application/vnd.openxmlformats...spreadsheet (xlsx)
  │   └─ xlsx (SheetJS) → cell data as text
  │
  ├─ application/vnd.openxmlformats...wordprocessing (docx)
  │   └─ mammoth → text (already implemented)
  │
  ├─ text/* | md | csv | json | txt
  │   └─ UTF-8 decode (already implemented)
  │
  └─ unsupported
      └─ return descriptive message:
         "This file type ({mimeType}) is not supported for text extraction.
          File name: {fileName}, Size: {fileSize} bytes"
```

### Image Processing via Vision API

The key new capability. When an image is uploaded:

1. Convert buffer to base64
2. Call OpenAI Vision API with a structured extraction prompt
3. Return the extracted text for embedding

```typescript
// Pseudocode for image extraction
const extractTextFromImage = async (buffer: Buffer, fileName: string) => {
  const base64 = buffer.toString("base64");
  const mimeType = getMimeFromExtension(fileName); // image/jpeg, image/png, etc.

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `Extract ALL text content from this image. Include:
- Any visible text, numbers, dates, amounts
- Table/grid data (format as structured text)
- Labels, headers, footers
- Handwritten text if readable
Return the extracted text only, no commentary.`
        },
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${base64}` }
        }
      ]
    }],
    max_tokens: 2000,
    temperature: 0.1, // Low temp for factual extraction
  });

  return response.choices[0]?.message?.content || "";
};
```

**Cost estimate**: gpt-4.1-mini vision — ~$0.003–0.01 per image depending on resolution. Acceptable for demo volume.

**Where to change**: Only `src/service/rag/triggerEmbeddings.ts` — add the new route branches inside `extractTextFromBuffer`.

### Excel Processing via SheetJS

```typescript
import * as XLSX from "xlsx";

const extractTextFromExcel = (buffer: Buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheets: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    sheets.push(`[Sheet: ${sheetName}]\n${csv}`);
  }

  return sheets.join("\n\n");
};
```

**Dependency**: `xlsx` (SheetJS) — needs `npm install xlsx`.

### PDF Processing via File Input API + Structured Output

OpenAI's vision-capable models (gpt-4o, gpt-4o-mini, o1) accept PDFs directly via base64 or file_id. The model receives both extracted text AND page images, meaning scanned PDFs work automatically — no `pdf-to-img` or `pdfjs-dist` dependency needed.

Combined with **Structured Output** (`response_format: { type: "json_schema" }`), we send a PDF + a JSON schema and get back `{ extracted_text, ai_judgment }` in a **single API call**. This replaces both `pdf-parse` (text extraction) and the separate `ai_judgment` generation call for PDFs.

**How it works:**

1. Read PDF buffer from S3
2. Encode as base64
3. Send to OpenAI with structured output schema
4. Receive `{ extracted_text, ai_judgment }` — guaranteed valid JSON

```typescript
// Pseudocode for unified PDF extraction + judgment
const extractPDFWithStructuredOutput = async (buffer: Buffer, fileName: string) => {
  const base64 = buffer.toString("base64");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `Analyze this PDF document "${fileName}". Extract ALL text content and provide structured analysis.`
        },
        {
          type: "file",
          file: { data: base64, filename: fileName }
        }
      ]
    }],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "pdf_extraction",
        schema: {
          type: "object",
          properties: {
            extracted_text: { type: "string", description: "Full text content for RAG chunking" },
            ai_judgment: {
              type: "object",
              properties: {
                document_type: { type: "string" },
                summary: { type: "string" },
                purpose: { type: "string" },
                key_entities: {
                  type: "object",
                  properties: {
                    people: { type: "array", items: { type: "string" } },
                    organizations: { type: "array", items: { type: "string" } },
                    amounts: { type: "array", items: { type: "string" } },
                    dates: { type: "array", items: { type: "string" } },
                  },
                  required: ["people", "organizations", "amounts", "dates"]
                },
                tags: { type: "array", items: { type: "string" } },
                language: { type: "string" },
                confidence: { type: "number" },
              },
              required: ["document_type", "summary", "purpose", "key_entities", "tags", "language", "confidence"]
            }
          },
          required: ["extracted_text", "ai_judgment"]
        }
      }
    },
    temperature: 0.1,
  });

  return JSON.parse(response.choices[0]?.message?.content || "{}");
};
```

**API approach options:**
- **Chat Completions API** (current codebase): base64 or file_id + `response_format` for structured output
- **Responses API** (future option): Also supports URL-based PDF input (useful with presigned S3 URLs, no upload needed)

**Constraints**: 50MB limit per file. Supported models: gpt-4o, gpt-4o-mini, o1.

**Token cost**: Each PDF page = extracted text tokens (input) + page image tokens (input) + structured output tokens (output). A 5-page invoice ≈ moderate cost. For demo volume this is acceptable. For scale, consider page limits or hybrid approach (pdf-parse for text, PDF input for judgment only).

**`pdf-parse` retained as fallback**: Keep for edge cases (very large PDFs exceeding token limits, cost optimization for bulk re-processing). Not the primary path.

**Batch parallelism**: Each `extractPDFWithStructuredOutput` call is fully independent (different buffers, different files, no shared state). When multiple PDFs are uploaded as a batch, these calls can run in parallel via `Promise.allSettled` — leveraged by Item 11's batch ingestion parallelism (Section D/K). This amplifies the batch ingestion gains: each parallel pipeline now includes the OpenAI extraction + judgment call, not just embedding generation. For a batch of 3 PDFs, this means 3 concurrent OpenAI calls instead of 3 sequential ones. Rate limit safe — gpt-4o-mini allows ~30K RPM; 3-5 concurrent calls is well within limits.

---

## B. Dual-Layer Content Model

### Problem

Currently, `text_content` on the `documents` table stores raw extracted text. There's no structured AI understanding of what the document *is* — its type, purpose, key entities, etc. When the AI needs to answer questions like "what invoices do I have?" or "find the contract with Company X," it relies entirely on vector similarity, which can miss or misrank.

### Proposed Solution: `ai_judgment` Column

Add a JSONB column `ai_judgment` to the `documents` table that stores structured AI analysis:

```sql
ALTER TABLE documents ADD COLUMN ai_judgment JSONB DEFAULT NULL;
```

**Generated at ingestion time**, after text extraction and before chunking:

```typescript
type AIJudgment = {
  document_type: string;     // "invoice" | "contract" | "meeting_notes" | "receipt" | etc.
  summary: string;           // 2-3 sentence summary
  purpose: string;           // Why this document exists
  key_entities: {
    people: string[];        // Names mentioned
    organizations: string[]; // Companies, departments
    amounts: string[];       // "¥5,000,000", "$1,200"
    dates: string[];         // Key dates found
  };
  tags: string[];            // Auto-generated search tags
  language: string;          // "ja" | "en" | "mixed"
  confidence: number;        // 0-1 how confident the AI is
};
```

### Generation Process

**For PDFs**: The `ai_judgment` is generated TOGETHER with text extraction in a single call via PDF File Input + Structured Output (see Section A). No separate generation step needed.

**For non-PDFs** (images, DOCX, text, CSV): After `extractTextFromBuffer` succeeds and before `chunkText`, generate `ai_judgment` as a separate call:

```typescript
// For PDFs: unified extraction (single call)
const { extracted_text, ai_judgment } = await extractPDFWithStructuredOutput(buffer, fileName);
// extracted_text goes to chunking/embedding
// ai_judgment goes to documents.ai_judgment column

// For non-PDFs: existing flow + separate ai_judgment call
const text = await extractTextFromBuffer(buffer, mimeType, fileName);
const ai_judgment = await generateAIJudgment(text, fileName);
```

The separate `generateAIJudgment` function (for non-PDFs):

```typescript
const generateAIJudgment = async (textContent: string, fileName: string) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini", // Cheap and fast
    messages: [{
      role: "system",
      content: "Analyze this document and return structured metadata as JSON."
    }, {
      role: "user",
      content: `File: ${fileName}\n\nContent:\n${textContent.slice(0, 3000)}`
    }],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 500,
  });

  return JSON.parse(response.choices[0]?.message?.content || "{}");
};
```

**Cost note**: For PDFs, the unified call is actually cheaper than two separate calls (pdf-parse + ai_judgment), despite higher per-page token cost, because of reduced API overhead. For non-PDFs, cost remains ~$0.0004 per file.

### How It Improves the System

1. **Better search**: The `manage_documents` tool can filter by `ai_judgment->>'document_type'` for precise queries
2. **Richer context for LLM**: When the AI reads a document, it gets structured understanding alongside raw text
3. **UI enrichment**: File cards can show document type, summary, key entities
4. **Approval request auto-fill**: `ai_judgment.key_entities.amounts` and `ai_judgment.key_entities.organizations` directly feed into approval request creation

### Separation from `text_content`

This is the "separate text content from AI judgment" that Boss requested:
- `text_content` = ground truth (what the document literally says)
- `ai_judgment` = AI interpretation (what the document means/contains)

Both stored, both queryable, but clearly separated.

---

## C. Enhanced Embedding Metadata

### Current State

Embedding metadata in `document_embeddings.metadata` currently stores:
```json
{ "chunk_index": 0, "file_name": "invoice.pdf", "file_path": "...", "length": 800 }
```

### Proposed Enrichment

Add `mime_type` and `category` at ingestion time:

```typescript
// In triggerEmbeddings.ts, embedding insert
metadata: {
  chunk_index: index,
  file_name: document.file_name,
  file_path: document.file_path,
  mime_type: document.mime_type,  // NEW
  category: document.category,    // NEW
  length: chunk.length,
}
```

This is a small change — just add two fields to the metadata object during insert. No schema migration needed since `metadata` is already JSONB.

### Approval Request IDs in RAG Search

Boss asked: "in the RAG as well we should put the ringi ID, so after semantic search, the AI can fetch by ringi ID."

**Three options considered:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A. Embed at ingestion | Store `approval_request_id` in embedding metadata when document is linked to a request | Fast query time | Stale if link changes; requires re-ingestion on link |
| B. Separate index | Maintain a mapping table `approval_request_documents` (already exists) | Clean separation | Extra query step |
| **C. Join at query time** | After RAG returns document IDs, query `approval_request_documents` to find linked requests | **Simplest, always fresh** | One extra DB query |

**Recommendation: Option C (join at query time)**

Rationale:
- `approval_request_documents` junction table already exists in schema
- No re-ingestion needed when documents get linked/unlinked from requests
- One extra Supabase query is cheap
- Follows KISS — no metadata staleness to manage

**Implementation sketch** — in the RAG tool handler (`src/app/api/openai/respond/tools/rag.ts`):

```typescript
// After vector search returns documentIds...
const { data: linkedRequests } = await supabase
  .from("approval_request_documents")
  .select("approval_request_id, document_id")
  .in("document_id", documentIds);

// Attach to results
return vectorMatches.map(row => ({
  ...existingFields,
  linked_approval_request_ids: linkedRequests
    ?.filter(lr => lr.document_id === row.document_id)
    .map(lr => lr.approval_request_id) ?? [],
}));
```

**Optional enhancement**: Add an `approval_request_id` filter parameter to `search_user_documents` tool so the LLM can search documents scoped to a specific request:

```json
{
  "approval_request_id": {
    "type": "string",
    "description": "Optional: filter results to documents linked to this approval request."
  }
}
```

---

## D. Multi-File Upload Scenarios

### Scenario Analysis

Boss identified three key scenarios:

#### Scenario 1: Single File Upload
```
User: [drops invoice.pdf]
User: "Create a ringi for this"
```
- Current flow works: upload → ingest → AI reads content → creates request
- **Gap**: If ingestion fails silently, AI has no text to work with

#### Scenario 2: Batch Upload (Multiple Files at Once)
```
User: [drops invoice.pdf, quote.pdf, receipt.jpg]
User: "Create a ringi for these vendor expenses"
```
- Current: Files are uploaded and ingested sequentially
- **Gap**: All files share one chat message context; AI needs to understand they're related
- **Gap**: If one ingestion fails, others still proceed but user isn't clearly notified

#### Scenario 3: Continuing Conversation (Sequential Singles)
```
User: [drops invoice.pdf] "Here's the invoice"
AI: "I see an invoice from Company X for ¥500,000..."
User: [drops contract.pdf] "And here's the related contract"
AI: "Got it, this contract with Company X covers..."
User: "Now create a ringi for this"
```
- Current: Each file gets its own message context
- **Gap**: AI needs to connect files across messages; currently relies on conversation history which works but could be more explicit

### System Prompt Addition for Multi-File Handling

Add to SYSTEM_PROMPT:

```
9. **MULTI-FILE HANDLING**:
   - When multiple files are uploaded in a single message, treat them as a related batch.
   - Summarize what you found across ALL files before taking action.
   - If creating an approval request from multiple documents, cross-reference amounts
     and details across files for consistency.
   - When files are uploaded across multiple messages, maintain context about previously
     uploaded files in the conversation.
```

### Parallel Batch Ingestion

Currently in `POST /api/rag/ingest`, documents are ingested sequentially:

```typescript
// Current: sequential
for (const doc of documents) {
  const result = await ingestDocumentEmbeddings({ document: doc, supabase });
  results.push(result);
}
```

**Proposed: parallel with `Promise.allSettled`**:

```typescript
// Proposed: parallel
const promises = documents.map(doc =>
  ingestDocumentEmbeddings({ document: doc, supabase })
);
const settled = await Promise.allSettled(promises);

const results: IngestionResult[] = settled.map((outcome, i) => {
  if (outcome.status === "fulfilled") return outcome.value;
  return {
    documentId: documents[i].id,
    status: "failed" as const,
    reason: outcome.reason?.message || "Unknown error",
  };
});
```

**Why**: For batch uploads of 3-5 files, parallel ingestion cuts total time significantly. Each ingestion is independent (different S3 keys, different embedding calls).

**Risk**: OpenAI rate limits if too many embedding calls fire simultaneously. Mitigation: `Promise.allSettled` already handles individual failures gracefully; we batch embeddings within each ingestion call (max 80 per batch).

---

## E. RAG Reliability

### E1. Content Deduplication via SHA-256 Hash

**Problem from `demo_actionable_items.md`**: "Uploading the same file twice creates duplicate embeddings and duplicate search results."

**Solution**: Add a `content_hash` column to `documents`:

```sql
ALTER TABLE documents ADD COLUMN content_hash TEXT;
CREATE INDEX idx_documents_content_hash ON documents (user_id, content_hash);
```

At ingestion time, hash the extracted text:

```typescript
import { createHash } from "crypto";

const contentHash = createHash("sha256")
  .update(textContent)
  .digest("hex");

// Check for existing document with same hash for this user
const { data: existing } = await supabase
  .from("documents")
  .select("id")
  .eq("user_id", document.user_id)
  .eq("content_hash", contentHash)
  .neq("id", document.id)
  .limit(1);

if (existing?.length) {
  return {
    documentId: document.id,
    status: "skipped",
    reason: `Duplicate content detected (matches document ${existing[0].id})`,
  };
}

// Update document with hash
await supabase
  .from("documents")
  .update({ content_hash: contentHash, text_content: textContent })
  .eq("id", document.id);
```

**Why SHA-256 on text_content (not raw file buffer)**:
- Same content in `.docx` vs `.pdf` would have different file hashes but same text content hash
- We care about content deduplication, not file-level deduplication
- Cheaper to hash text than full binary

### E2. Ingestion Error Recovery

**Problem**: Current flow in `ingestDocumentEmbeddings`:
1. DELETE existing embeddings ← **dangerous: if later steps fail, we've lost data**
2. Get file from S3
3. Extract text
4. Chunk
5. Update `text_content`
6. Generate embeddings
7. INSERT new embeddings

If step 6 or 7 fails, we've already deleted the old embeddings (step 1) — data loss.

**Proposed: Reorder operations**:

```typescript
// 1. Get file from S3
// 2. Extract text
// 3. Chunk
// 4. Generate embeddings
// 5. DELETE old embeddings   ← moved here, right before insert
// 6. INSERT new embeddings   ← immediately after delete
// 7. Update text_content
```

This way, old embeddings are only deleted when new ones are ready to be inserted. If embedding generation fails, old data remains intact.

### E3. Adaptive Chunking (YAGNI for Demo)

Current: fixed 800 char chunks with 200 overlap. This works well for typical documents. Adaptive chunking (splitting on paragraphs, headers, etc.) would improve quality but adds complexity.

**Decision**: Keep fixed chunking for demo. Revisit if retrieval quality is noticeably poor during testing.

### E4. Similarity Threshold as Environment Variable

Current: hardcoded in the `match_document_embeddings` function (default 0.5).

**Proposed**: Make it configurable:

```typescript
const SIMILARITY_THRESHOLD = parseFloat(
  process.env.RAG_SIMILARITY_THRESHOLD || "0.5"
);
```

Pass to the RPC call. Allows tuning without code changes during demo prep.

---

## F. AI Chat Reliability

### F1. First Call Response Validation

**Problem**: If the first OpenAI call returns malformed JSON or an unexpected structure, the current code may silently fail.

**Current** (in `route.ts`):
```typescript
const initialResponse = await runOpenAI(basePayload);
const initialPayload = await initialResponse.json();
const initialChoice = initialPayload?.choices?.[0];
```

**Proposed**: Add validation:

```typescript
const initialPayload = await initialResponse.json();

if (!initialPayload?.choices?.length) {
  console.error("OpenAI returned no choices", initialPayload);
  return NextResponse.json(
    { error: "AI did not produce a response. Please try again." },
    { status: 502 }
  );
}
```

### F2. Tool Execution Timeout

**Problem**: If a tool handler hangs (e.g., Supabase query timeout), the entire request blocks indefinitely.

**Proposed**: Wrap tool execution with a timeout in `tool-execution.ts`:

```typescript
const TOOL_TIMEOUT_MS = 30_000; // 30 seconds

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Tool execution timed out")), ms)
    ),
  ]);

// In executeToolCalls:
const result = await withTimeout(
  handler(parsedArgs, { supabase, user }),
  TOOL_TIMEOUT_MS
);
```

### F3. Retry Logic for Second OpenAI Call

The second (streaming) call is the user-facing response. If it fails, the user sees nothing after waiting for tool execution.

**Proposed**: Single retry with backoff:

```typescript
let toolResolutionResponse: Response;
try {
  toolResolutionResponse = await runOpenAI(followUpPayload, true);
} catch (error) {
  // Single retry after 1 second
  await new Promise(r => setTimeout(r, 1000));
  toolResolutionResponse = await runOpenAI(followUpPayload, true);
}
```

**Why only 1 retry**: The first call already succeeded (tool selection), so the issue is likely transient (rate limit, network blip). If it fails twice, there's a real problem — fail fast.

### F4. Tool Argument UUID Validation

**Problem**: LLM sometimes passes a file name instead of a UUID as `documentId`. Current code sends this to Supabase which silently returns no results.

**Proposed**: Validate UUID format before executing tools:

```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// In tool-execution.ts, after parsing args:
if (parsedArgs.documentId && !UUID_REGEX.test(parsedArgs.documentId)) {
  toolResponses.push({
    role: "tool",
    tool_call_id: call.id,
    content: JSON.stringify({
      error: `Invalid documentId "${parsedArgs.documentId}". This looks like a file name, not a UUID. Use manage_documents (search action) to find the document ID first.`,
    }),
  });
  continue;
}

if (parsedArgs.id && !UUID_REGEX.test(parsedArgs.id)) {
  toolResponses.push({
    role: "tool",
    tool_call_id: call.id,
    content: JSON.stringify({
      error: `Invalid id "${parsedArgs.id}". Expected a UUID format (e.g., "a1b2c3d4-e5f6-..."). Use the appropriate list/search action first.`,
    }),
  });
  continue;
}
```

**Why this helps**: Instead of a silent empty result, the LLM gets an explicit error message telling it to search first. This self-corrects the tool flow in the next turn.

### F5. Streaming Error Recovery in Frontend

**Problem**: If the SSE stream breaks mid-response (network hiccup, server crash), `useAssistantStream.ts` silently stops accumulating text. The user sees a partial message with no indication of failure.

**Current**: The `catch` in the parsing loop is empty — malformed chunks are silently ignored.

**Proposed**: Add error handling in `useAssistantStream.ts`:

```typescript
// After the while loop:
if (!sawDoneToken && !accumulated.trim()) {
  throw new Error("Stream ended unexpectedly without content");
}

// For partial content without [DONE]:
if (!sawDoneToken && accumulated.trim()) {
  // We got some content but stream was interrupted
  // Return what we have with a note
  return {
    finalContent: accumulated.trim() + "\n\n_(Response was interrupted. Please try again if incomplete.)_",
    sanitizedConversation,
    toolMetadata,
  };
}
```

### F6. Better Error Messages for LLM

When tool execution fails, the error message sent back to the LLM should be actionable:

```typescript
// Instead of:
content: JSON.stringify({ error: "Tool execution failed" })

// Send:
content: JSON.stringify({
  error: `${call.function.name} failed: ${error.message}`,
  suggestion: "Try a different approach or ask the user for more information.",
})
```

This gives the LLM enough context to recover gracefully in its response.

---

## G. Framework Assessment

### LangChain

**Assessment: Skip — over-engineering for our use case.**

Reasons:
1. Our RAG pipeline is straightforward: extract → chunk → embed → store → search. LangChain's abstraction layers (Document, Loader, Splitter, VectorStore, Retriever, Chain) add indirection without adding capability we need.
2. We use direct OpenAI API calls which are already clean and well-understood. LangChain would wrap them in another layer.
3. LangChain's Node.js ecosystem (`langchain` npm) is less mature than Python's, and adds significant dependency weight.
4. Our tool execution framework is already built and working. LangChain's agent framework would require rewriting the two-pass orchestration.
5. Debugging direct API calls is straightforward. Debugging through LangChain's chain of abstractions is harder.

**When LangChain *would* make sense**: If we had 10+ data sources, needed complex chains (map-reduce over large documents, multi-step retrieval), or wanted to quickly prototype different RAG strategies. We don't.

### Pydantic AI

**Assessment: Not applicable — Python only.**

Pydantic AI is a Python framework. Our codebase is TypeScript/Next.js. The equivalent in our ecosystem is **Zod**, which we already have as a dependency.

**If Boss wants structured validation of LLM outputs** (which is the core value prop of Pydantic AI), we can use Zod:

```typescript
import { z } from "zod";

const AIJudgmentSchema = z.object({
  document_type: z.string(),
  summary: z.string(),
  key_entities: z.object({
    people: z.array(z.string()),
    organizations: z.array(z.string()),
    amounts: z.array(z.string()),
    dates: z.array(z.string()),
  }),
  tags: z.array(z.string()),
  language: z.string(),
  confidence: z.number().min(0).max(1),
});

// Validate LLM response
const parsed = AIJudgmentSchema.safeParse(JSON.parse(llmResponse));
if (!parsed.success) {
  console.error("AI judgment validation failed", parsed.error);
  // Fallback or retry
}
```

### Recommendation

**Keep the direct-API approach.** Our architecture is already clean:
- Direct OpenAI calls via `runOpenAI` wrapper
- Custom tool registry with typed handlers
- SSE streaming with metadata events
- Supabase pgvector for embeddings

Adding a framework on top would increase complexity without solving any problem we currently have. If anything, it would make the system harder for the team to understand and debug.

---

## H. Implementation Priority

### Tier 1: Demo-Critical (Must Have)

These directly prevent demo failures:

| # | Item | Section | Effort | Impact |
|---|------|---------|--------|--------|
| 1 | Image → Vision API text extraction | A | Medium | Unlocks image file uploads for demo |
| 2 | Content deduplication (SHA-256 hash) | E1 | Small | Prevents duplicate search results |
| 3 | Ingestion error recovery (reorder delete/insert) | E2 | Small | Prevents data loss on failed ingestion |
| 4 | Multi-file system prompt addition | D | Small | AI handles batch uploads correctly |
| 5 | UUID validation in tool execution | F4 | Small | Prevents silent failures when LLM passes filenames |
| 6 | Unsupported file type message | A | Small | User gets feedback instead of silent skip |
| 15 | Native PDF Understanding via File Input API | A | Small | Scanned + text PDFs handled natively, single-call extraction + judgment |

### Tier 2: Quality Improvements (Should Have)

Improve reliability and user experience:

| # | Item | Section | Effort | Impact |
|---|------|---------|--------|--------|
| 7 | `ai_judgment` column + generation | B | Medium | Structured document understanding |
| 8 | Enhanced embedding metadata (mime_type, category) | C | Small | Better metadata for search filtering |
| 9 | Parallel batch ingestion | D | Small | Faster multi-file uploads |
| 10 | First call response validation | F1 | Small | Graceful handling of OpenAI errors |
| 11 | Streaming error recovery in frontend | F5 | Small | Better UX on interrupted responses |
| 12 | Tool execution timeout (30s) | F2 | Small | Prevents hung requests |
| 13 | Better error messages for LLM | F6 | Small | AI self-corrects more often |
| 14 | Approval request IDs in RAG results (join at query) | C | Small | AI can connect files to ringi |

### Tier 3: Future Enhancements (Nice to Have)

Post-demo or only if needed:

| # | Item | Section | Effort | Impact |
|---|------|---------|--------|--------|
| 16 | Excel (xlsx) text extraction | A | Small | Handles spreadsheet uploads |
| 17 | Retry logic for 2nd OpenAI call | F3 | Small | Resilience to transient failures |
| 18 | Similarity threshold as env var | E4 | Tiny | Tunable search sensitivity |
| 19 | Approval request filter on search_user_documents | C | Small | Scoped search per ringi |
| 20 | Adaptive chunking | E3 | Large | Better retrieval quality |
| 21 | Re-ranking pipeline | — | Large | Better result ordering |
| 22 | Context window management | — | Large | Handle very long conversations |

### Suggested Execution Order

**Sprint 1 (Demo prep)**:
1. Items 1-6 (Tier 1) — all demo-critical
2. Items 8, 9 (quick wins from Tier 2)

**Sprint 2 (Quality pass)**:
3. Items 7, 10-14 (remaining Tier 2)

**Sprint 3+ (Post-demo)**:
4. Tier 3 as needed

---

## I. System Prompt Engineering

### Current State Analysis

The system has **two separate system prompts** — a fragmented setup:

1. **Backend prompt** (`src/app/api/openai/respond/route.ts:17`): ~2000 chars, 8 numbered rules covering approval requests, document handling, file search results, and content questions.
2. **Frontend prompt** (`src/providers/LanguageProvider.tsx`): "You are an AI File Management Assistant. Respond in {language} ({languageCode})..." — injected as the first message in `formatMessagesForAI` (`src/components/chat/hooks/useThreadWorkspace.ts:147`).

What the LLM actually sees in order:
```
1. [system] Backend SYSTEM_PROMPT (detailed rules)
2. [system] Frontend language prompt (weak, partially redundant)
3. [user/assistant] Conversation messages...
```

### Problems Identified

| Problem | Impact |
|---------|--------|
| Two system prompts — fragmented identity | LLM gets conflicting/redundant role definitions |
| No structured sections — flat numbered list | Rules 1 and 7 are equally weighted visually, but 7 is more critical for UX |
| No tool selection guidance | LLM relies on tool descriptions alone to decide which tool to use |
| No output format instructions | Response style (concise vs. verbose, markdown usage, tone) is undefined |
| Redundancy between prompt rules 6-8 and tool descriptions | Wastes tokens; risks contradiction if one is updated without the other |
| No persona grounding | "You are a helpful assistant" is maximally generic |

### Proposed: Restructured Prompt with Clear Sections

Instead of a flat numbered list, organize the prompt into labeled sections. OpenAI models respond well to XML-like tags or clear markdown headers as section delimiters:

```
<role>
You are the EB-FILEMG AI File Management Assistant. You help users organize,
search, and manage documents, folders, and approval requests (ringi).
Respond in {languageLabel} ({languageCode}) unless the user requests otherwise.
Be concise — short paragraphs, no filler.
</role>

<tool_selection>
Choose tools based on what the user needs:
- User mentions a file by NAME → manage_documents(search) to resolve UUID first
- User asks about file CONTENT → search_user_documents (semantic search)
- User says "create a ringi" with attached docs → manage_documents(get_content) to read doc, THEN manage_approval_requests(create)
- User asks "what files do I have?" → manage_documents(list)
- Ambiguous? Check documents with tools BEFORE asking the user.
</tool_selection>

<rules>
APPROVAL REQUESTS:
- Never assume amounts. If one amount + multiple items → ask: total or per-item?
- Exception: user says "don't divide" → single item with total amount.
- Items must have: name (string), quantity (number, default 1), amount (number).
- For updates, use the Active Approval Request ID from [Context] if available.

DOCUMENTS:
- Always resolve file names to UUIDs before passing to tools.
- Check [Attached Documents] in conversation first; if found, use that UUID.
- When user says "create request with this doc" → read the document first, extract details, propose. Only ask for genuinely missing info.

SEARCH RESULTS:
- NEVER list file details (name, size, date, URL) in your text.
- Say "I found X documents" — the UI renders file cards automatically.
- NEVER include download links.
</rules>

<output_format>
- Keep responses concise: 2-4 sentences for simple answers
- Use markdown tables for structured data (comparison, lists)
- For approval request confirmations, summarize key fields before asking "Should I create this?"
- When citing document content, quote relevant sections briefly
</output_format>
```

### Key Improvements Over Current Prompt

1. **Consolidated identity** — merges backend + frontend prompts; language instruction included in `<role>`
2. **Tool selection decision tree** — explicit routing logic the LLM can follow deterministically
3. **Grouped rules by domain** — approval rules together, document rules together, search rules together
4. **Output format section** — defines response style expectations
5. **Reduced redundancy** — removed rules that duplicate tool descriptions (e.g., "use 'manage_documents' (search action)" is now in the tool selection tree, not repeated in rules)

### Implementation

**Where to change**: `src/app/api/openai/respond/route.ts` — replace the `SYSTEM_PROMPT` constant.

**Frontend prompt**: Simplify `chat.systemPrompt` in `LanguageProvider.tsx` to just the language code, and inject it into the backend prompt via a template variable. The backend constructs the final prompt with language awareness:

```typescript
// route.ts
const buildSystemPrompt = (language: string) => {
  const langLabel = language === "ja" ? "Japanese" : "English";
  const langCode = language === "ja" ? "ja-JP" : "en-US";
  return SYSTEM_PROMPT_TEMPLATE
    .replace("{languageLabel}", langLabel)
    .replace("{languageCode}", langCode);
};
```

This requires passing the language preference from the frontend payload — add an optional `language` field to `OpenAIChatRequest`.

### Token Analysis

| Metric | Current | Proposed |
|--------|---------|----------|
| System prompt tokens | ~600 | ~550 |
| Effective information density | Medium (flat list) | High (structured sections) |
| Tool selection clarity | Implicit (LLM infers) | Explicit (decision tree) |

Net token change is minimal — the win is signal quality, not size.

---

## J. Modularity Assessment

### Question: Should the System Prompt Be Modular?

"Modular" means building the prompt from composable pieces at runtime — e.g., a base persona module + document rules module + approval rules module + output format module, selected/combined based on context.

### Verdict: Stay Monolithic, Restructure Internally

**Why modularity is overkill here:**

| Factor | Current State | Threshold for Modularity |
|--------|--------------|-------------------------|
| Prompt size | ~600 tokens | >2000 tokens |
| Number of tools | 4 | >8-10 |
| Behavioral modes | 1 (always same rules) | Multiple personas or contexts |
| Rule volatility | Stable (updated ~weekly) | Rapidly changing, A/B tested |

**The math**: Our prompt is ~600 tokens. A modular builder system (template loader, conditional assembly, composition logic) would add 50-100 lines of infrastructure code to manage something that fits in a single constant. That's negative ROI.

**What modularity solves**: It shines when you have conditional behavior ("if user is admin, add admin rules"), multiple personas ("support agent vs. sales agent"), or prompts exceeding 2K tokens where you need to selectively include sections.

**What we actually need**: The restructuring in Section I (clear sections within a single prompt) gives 80% of the modularity benefit with 0% of the infrastructure cost. The prompt reads as sections internally, but is still a single string.

### The Real Modularity Win

Consolidate the **two-prompt fragmentation** (frontend + backend) into one server-side prompt. This isn't about making the prompt "modular" — it's about making it **singular**. One place to edit, one place to debug.

### When to Reconsider

- If we add 5+ more tools (e.g., calendar management, email integration)
- If we need different behavior per user role (admin vs. employee)
- If prompt exceeds 1500 tokens and sections become conditionally relevant
- If we start A/B testing different prompt strategies

---

## K. Parallelism & Concurrency Opportunities

### K1. Tool Execution Parallelism (HIGH IMPACT)

**The Problem**: `executeToolCalls` in `src/app/api/openai/respond/utils/tool-execution.ts:10` runs tool calls in a **serial `for...of` loop**:

```typescript
// Current: SEQUENTIAL
for (const call of toolCalls) {
  // ... parse args
  const result = await handler(parsedArgs, { supabase, user });
  toolResponses.push({ ... });
}
```

When OpenAI returns 2+ tool calls simultaneously (e.g., `search_user_documents` + `manage_documents(get_content)` in the same response), they execute one after another. These operations are independent — they hit different tables/APIs and don't depend on each other's results.

**Proposed: `Promise.allSettled`**:

```typescript
// Proposed: PARALLEL
const promises = toolCalls.map(async (call) => {
  const handler = getToolHandler(call.function.name);
  if (!handler) {
    return {
      role: "tool" as const,
      tool_call_id: call.id,
      content: JSON.stringify({ error: `Unknown tool: ${call.function.name}` }),
    };
  }

  let parsedArgs: any = {};
  try {
    parsedArgs = JSON.parse(call.function.arguments || "{}");
  } catch {
    return {
      role: "tool" as const,
      tool_call_id: call.id,
      content: JSON.stringify({ error: "Failed to parse tool arguments" }),
    };
  }

  try {
    const result = await handler(parsedArgs, { supabase, user });
    return {
      role: "tool" as const,
      tool_call_id: call.id,
      content: JSON.stringify(result),
    };
  } catch (error: any) {
    return {
      role: "tool" as const,
      tool_call_id: call.id,
      content: JSON.stringify({
        error: error.message || "Tool execution failed",
      }),
    };
  }
});

const toolResponses = await Promise.all(promises);
```

**Impact**: For a typical "create ringi from document" flow where the LLM calls both `manage_documents(get_content)` and `search_user_documents`, this cuts tool execution time roughly in half (two ~500ms calls run in parallel instead of sequentially).

**Risk**: Low. Each tool handler is stateless — they share the Supabase client but execute independent queries. Supabase connections handle concurrency natively.

### K1.5. PDF File Input API Calls — Parallelism via Batch Ingestion

With the unified PDF extraction via File Input API (Section A), batch ingestion parallelism (Section D, Item 11) becomes even more impactful. Each parallel document pipeline now includes the OpenAI `extractPDFWithStructuredOutput` call — extraction + judgment in a single API call — not just embedding generation. For a batch of 3 PDFs, this means 3 concurrent OpenAI PDF extraction calls running in parallel via `Promise.allSettled`, each returning `{ extracted_text, ai_judgment }` simultaneously. Rate limits are not a concern at demo volume (gpt-4o-mini: ~30K RPM).

### K2. Other Areas Analyzed (No Change Needed)

| Area | Current | Assessment |
|------|---------|------------|
| `ensureUserAndThread` | Sequential: auth → thread check | Correctly sequential — thread check needs user_id |
| `generateEmbeddings` | Batched in groups of 80 | Already optimal for OpenAI rate limits |
| RAG `searchUserDocuments` | Sequential: embed query → vector search → enrich | Each step depends on previous; correctly sequential |
| Frontend `handleSendMessage` | Upload → ingest → AI response | Ingestion must complete before AI can access content |
| `ingestDocumentEmbeddings` (single doc) | Sequential: S3 → extract → chunk → embed → insert | Each step depends on previous |
| Batch ingestion in `/api/rag/ingest` | Sequential `for` loop | Already addressed in Section D (parallel with `Promise.allSettled`) |

### K3. Frontend Stream Processing (NO CHANGE)

The SSE stream parser in `useAssistantStream.ts` processes chunks sequentially as they arrive. This is inherently sequential (stream data arrives in order) and cannot be parallelized.

---

## L. Context Engineering Principles

### L1. Richer File Context in Messages

**Current** (`useThreadWorkspace.ts:153`):
```typescript
const fileContext = message.files
  .map((f) => `- ${f.name} (ID: ${f.id})`)
  .join("\n");
content = `${content}\n\n[Attached Documents]:\n${fileContext}`;
```

The LLM sees: `- Invoice.pdf (ID: abc-123)` — just a name and UUID.

**Proposed**: Include structured metadata so the LLM can make better decisions without a tool call:

```typescript
const fileContext = message.files
  .map((f) => {
    const parts = [`- ${f.name} (ID: ${f.id})`];
    if (f.mimeType) parts.push(`  Type: ${f.mimeType}`);
    if (f.size) parts.push(`  Size: ${(f.size / 1024).toFixed(0)}KB`);
    if (f.category) parts.push(`  Category: ${f.category}`);
    return parts.join("\n");
  })
  .join("\n");
```

The LLM would see:
```
[Attached Documents]:
- Invoice.pdf (ID: abc-123)
  Type: application/pdf
  Size: 245KB
  Category: invoice
```

**Why this matters**: With richer context, the LLM can skip a `manage_documents(search)` call because it already knows the ID, type, and category. It can go straight to `get_content` or decide it needs to call the RAG search. Fewer tool calls = faster response.

### L2. Tool Result Truncation

**Problem**: When `manage_documents(get_content)` returns a large document, the entire `text_content` is serialized as JSON and sent to the 2nd LLM call. A 10-page document could be 15K+ tokens in the tool result alone.

**Proposed**: Truncate tool responses in the tool handler:

```typescript
// In documents.ts, get_content action:
const MAX_CONTENT_CHARS = 8000; // ~2000 tokens
const textContent = data.text_content || "";
const truncated = textContent.length > MAX_CONTENT_CHARS;
return {
  document: {
    id: data.id,
    name: data.file_name,
    textContent: truncated
      ? textContent.slice(0, MAX_CONTENT_CHARS) + "\n\n[... truncated, use search_user_documents for specific sections]"
      : textContent,
  },
};
```

**Why**: Prevents token overflow in the 2nd LLM call. The truncation note tells the LLM it can use RAG search to find specific content if the answer isn't in the first 8000 chars.

### L3. Structured Context Injection (with `ai_judgment`)

When the `ai_judgment` column (Section B) is implemented, include it in the `[Attached Documents]` block:

```
[Attached Documents]:
- Invoice.pdf (ID: abc-123)
  Type: application/pdf
  AI Analysis: Invoice from Company X, ¥500,000, dated 2026-02-15
  Tags: invoice, company-x, procurement
```

This gives the LLM a "pre-read" of the document without needing a tool call. For ringi creation, the LLM can often extract what it needs from this summary alone.

### L4. Conversation Window Management (Future)

**Current**: All messages are sent to OpenAI every time. For a 50-message thread, that's 50 messages × average 200 tokens = 10K tokens of conversation history before the system prompt and tool results.

**For demo**: Not a problem — demo conversations are short (5-15 messages).

**For production**: Implement a sliding window:
- Keep the system prompt + last N messages (e.g., 20)
- Summarize older messages into a `[Conversation Summary]` block
- Include any `[Attached Documents]` from summarized messages

This is a **Tier 3 / post-demo** improvement.

### L5. "Lost in the Middle" Awareness

Research shows LLMs have weaker recall for information in the middle of long contexts. Our architecture naturally handles this well:

- **System prompt** → beginning (high recall)
- **Tool results** → end, right before final generation (high recall)
- **Risk zone** → early conversation messages in a long thread (medium recall)

**Mitigation**: The `[Attached Documents]` annotation repeats file info at each message where files were shared, so even if a file was uploaded 20 messages ago, its ID appears in the relevant message. This is already correct.

---

## M. Multi-Step Retrieval Assessment

### Current Architecture: Two-Pass, Single Retrieval

```
User message
  → 1st LLM call (decides tool usage)
  → Tool execution (0 or 1 retrieval round)
  → 2nd LLM call (synthesizes answer with tool_choice: "none")
```

The `tool_choice: "none"` on the 2nd call means the LLM **cannot** request additional tools after seeing retrieval results. It must answer with what it has.

### Do We Need Multi-Step?

**Multi-step retrieval** means the LLM can retrieve, evaluate the results, and decide to retrieve again with a refined query. Example:

1. User: "What's the difference between the Q1 and Q2 budget proposals?"
2. LLM searches "Q1 budget proposal" → gets results
3. LLM evaluates: "I have Q1 but need Q2" → searches "Q2 budget proposal"
4. LLM synthesizes answer from both retrievals

### Assessment for Demo

| Scenario | Current Handling | Multi-Step Needed? |
|----------|-----------------|-------------------|
| "What's in this invoice?" | `get_content` reads full doc | No |
| "Find my contracts" | `search_user_documents` returns top 5 | No |
| "Create a ringi from this doc" | `get_content` → extract → create | No |
| "Compare two documents" | Only retrieves one query | **Maybe** |
| "Summarize all my invoices" | Returns top 5 chunks, may miss some | **Maybe** |

For the demo's core use cases (file upload → classify → ringi creation → search), single-step retrieval is sufficient.

### If We Wanted Multi-Step (Future)

**Option A: Allow tools in 2nd call** — change `tool_choice: "none"` to `"auto"` with a max-iterations cap:

```typescript
// Pseudocode
let currentMessages = followUpMessages;
for (let i = 0; i < MAX_TOOL_ROUNDS; i++) {
  const response = await runOpenAI({ ...payload, messages: currentMessages, tool_choice: "auto" });
  const parsed = await response.json();
  if (!parsed.choices[0]?.message?.tool_calls?.length) break; // No more tools needed
  const toolResults = await executeToolCalls(parsed.choices[0].message.tool_calls, ctx);
  currentMessages = [...currentMessages, parsed.choices[0].message, ...toolResults];
}
// Final streaming call
const finalResponse = await runOpenAI({ ...payload, messages: currentMessages, tool_choice: "none" }, true);
```

**Risks**:
- Infinite loop if LLM keeps requesting tools
- Latency: each additional round adds ~1-2 seconds
- Cost: each round is a full API call

**Recommendation**: **Not for demo.** The current two-pass is fast and predictable. If cross-document reasoning becomes important post-demo, implement Option A with `MAX_TOOL_ROUNDS = 3` (1 initial + 2 additional retrieval rounds).

---

## Summary

The core strategy is:

1. **Route files intelligently** — each format gets the right extraction (Vision for images, PDF File Input + Structured Output for PDFs, mammoth for DOCX)
2. **Separate raw text from AI understanding** — `text_content` is ground truth, `ai_judgment` is structured interpretation
3. **Make RAG robust** — deduplication, error recovery, enriched metadata
4. **Make chat reliable** — validation, timeouts, better error feedback to the LLM
5. **Keep it simple** — no frameworks (LangChain, Pydantic AI), use direct APIs + Zod
6. **Prioritize for demo** — image support and error prevention first, quality improvements second
7. **Restructure the system prompt** — clear sections (role, tool selection, rules, output format), consolidate frontend+backend prompts
8. **Parallelize tool execution** — `Promise.all` in `executeToolCalls` for concurrent tool calls
9. **Enrich context** — richer file metadata in messages, truncate large tool results, include `ai_judgment` summaries
10. **Single-step retrieval is enough** — multi-step is a future consideration, not a demo blocker

---

## N. Developer Tooling

### The Problem

Testing Phase 2 improvements (image extraction, PDF processing, RAG pipeline, chat reliability) requires fresh state. Orphan embeddings from failed ingestion runs, stale threads from previous test sessions, and leftover S3 files from deleted documents all pollute test results. Manual cleanup requires querying 9 tables individually plus S3 — error-prone and slow.

### Solution: Dev-Only Reset Page

An environment-gated page at `/dev-tools` with a "Reset All Data" button:

- **Gating**: Only available when `NEXT_PUBLIC_DEV_TOOLS=true`. Not for production.
- **Scope**: Global wipe — deletes ALL users' data using `supabaseAdmin` (bypasses RLS). User profiles are preserved.
- **What gets reset**: `approval_requests` (cascades → `approval_request_documents`), `documents` (cascades → `document_embeddings`), `ai_threads` (cascades → `ai_messages`), `folders`, `activity_logs`, and all S3 files.
- **S3 cleanup**: Collects all `documents.file_path` values before deletion, then bulk-deletes from S3 via `Promise.allSettled`.
- **UI**: Stats dashboard showing current counts, confirmation dialog, progress indicator, and result summary.

### Why This Matters for Phase 2

Every improvement in Sections A–M needs clean-state testing:
- Image extraction (A): Need empty document store to verify new uploads classify correctly
- RAG pipeline (C/D): Orphan embeddings from old runs corrupt search results
- Chat reliability (F): Stale threads with broken message history confuse test scenarios
- Ingestion ordering (C): Failed ingestions leave partial data that masks new bugs
