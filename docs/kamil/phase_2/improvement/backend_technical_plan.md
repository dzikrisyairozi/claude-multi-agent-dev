# Backend Technical Plan — Phase 2 Improvements

> Actionable implementation spec for Items 1-5, 8, 10-16, 20-21.
>
> Date: 2026-02-20
>
> Based on: `improvement_technical_proposal.en.md` + `dual_path_search_pipeline.en.md`
>
> Grounded in: Actual codebase file paths, function signatures, and current patterns.

---

## Execution Order

Items are grouped by **file** (minimize context switching) within each tier.

```
Tier 1 (Demo-Critical):  1 → 15 → 3 → 2 → 4 → 5 → 6 → 7 → 20
Tier 2 (Quality):        8 → 21 → 10 → 11 → 12 → 13 → 14
Tier 3 (Future):         16
```

**Dependency chain**: Item 15 (PDF) feeds into Item 8 (ai_judgment). Item 8 feeds into Item 21 (Dual-Path). Item 6 (system prompt) must exist before Item 21's prompt additions.

---

## Tier 1 — Demo-Critical

---

### Item 1: Image Text Extraction via Vision API

**File**: `src/service/rag/triggerEmbeddings.ts`

**Current state** (lines 71-197): `extractTextFromBuffer` handles PDF (via `pdf-parse`), DOCX (via `mammoth`), Google Docs, and text-like formats. Images (`image/jpeg`, `image/png`, `image/heic`, `image/webp`) hit the "Unsupported file type" branch at line 192 and return `""`.

**Change spec**:

Add an image branch before the "Unsupported types" fallback:

```typescript
// After the text-like formats block (line 190), before the unsupported warning (line 192)

const isImage =
  normalizedMime.startsWith("image/") ||
  ["jpg", "jpeg", "png", "heic", "webp"].includes(extension);

if (isImage) {
  try {
    const base64Image = buffer.toString("base64");
    const mimeForAPI = normalizedMime || `image/${extension === "jpg" ? "jpeg" : extension}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.1,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract ALL text visible in this image. Include numbers, dates, names, addresses, and any other readable content. If the image contains a receipt, invoice, or form, preserve the structure. Return only the extracted text, no commentary.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeForAPI};base64,${base64Image}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const extractedText = response.choices[0]?.message?.content ?? "";
    if (!extractedText.trim()) {
      console.warn(`[Text Extraction] Vision API returned no text for "${fileName}"`);
    }
    return extractedText;
  } catch (error) {
    console.error(
      `[Text Extraction] Vision API failed for "${fileName}":`,
      error instanceof Error ? error.message : error
    );
    return "";
  }
}
```

**Dependencies**: None. Can be implemented first.

**Notes**:
- The `openai` client already exists at line 21 with retry/timeout config.
- Cost: ~$0.003-0.01 per image at demo volume.
- `detail: "high"` for receipts/invoices where small text matters.

---

### Item 15: Native PDF Understanding via File Input API + Structured Output

**File**: `src/service/rag/triggerEmbeddings.ts`

**Current state** (lines 84-101): PDF extraction uses `pdf-parse` library. Returns raw text only. No structured metadata. Scanned PDFs return empty string (line 88 warns about image-based PDFs).

**Change spec**:

Replace the PDF branch with a two-path approach — try OpenAI File Input API first, fall back to `pdf-parse`:

```typescript
// New function above extractTextFromBuffer
type PDFExtractionResult = {
  extractedText: string;
  aiJudgment: AIJudgment | null; // Type from src/types/document.ts (see Item 8)
};

const extractPDFWithStructuredOutput = async (
  buffer: Buffer,
  fileName: string
): Promise<PDFExtractionResult> => {
  const base64PDF = buffer.toString("base64");

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.1,
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this PDF document. Extract ALL text content and provide structured metadata.`,
          },
          {
            type: "file",  // OpenAI PDF File Input
            file: {
              filename: fileName,
              file_data: `data:application/pdf;base64,${base64PDF}`,
            },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "pdf_extraction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            extracted_text: { type: "string", description: "Full text content" },
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
                  required: ["people", "organizations", "amounts", "dates"],
                },
                tags: { type: "array", items: { type: "string" } },
                language: { type: "string" },
                confidence: { type: "number" },
              },
              required: ["document_type", "summary", "purpose", "key_entities", "tags", "language", "confidence"],
            },
          },
          required: ["extracted_text", "ai_judgment"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return { extractedText: "", aiJudgment: null };

  const parsed = JSON.parse(content);
  return {
    extractedText: parsed.extracted_text ?? "",
    aiJudgment: parsed.ai_judgment ?? null,
  };
};
```

**Updated PDF branch in `extractTextFromBuffer`**:

The function signature changes — it now returns `{ text: string; aiJudgment?: AIJudgment | null }` instead of just `string`. This requires updating callers in `ingestDocumentEmbeddings`.

Alternatively, to minimize blast radius, store the `aiJudgment` on a module-level map keyed by fileName, then retrieve it in the ingestion function. **Recommended approach**: change `extractTextFromBuffer` to return an object:

```typescript
type ExtractionResult = {
  text: string;
  aiJudgment?: AIJudgment | null;
};

// extractTextFromBuffer now returns ExtractionResult
```

For PDFs:
```typescript
if (normalizedMime === "application/pdf" || extension === "pdf") {
  // Try OpenAI File Input API first (handles scanned + text PDFs)
  try {
    const result = await extractPDFWithStructuredOutput(buffer, fileName);
    if (result.extractedText.trim()) {
      return { text: result.extractedText, aiJudgment: result.aiJudgment };
    }
  } catch (error) {
    console.warn(`[Text Extraction] OpenAI PDF extraction failed for "${fileName}", falling back to pdf-parse:`, error instanceof Error ? error.message : error);
  }

  // Fallback to pdf-parse (for very large PDFs or API failure)
  try {
    const result = await pdf(buffer);
    return { text: result.text || "" };
  } catch (error) {
    console.error(`[Text Extraction] pdf-parse also failed for "${fileName}":`, error instanceof Error ? error.message : error);
    return { text: "" };
  }
}
```

**Update `ingestDocumentEmbeddings`** (line 371): Change text extraction call to handle new return type:

```typescript
// Line 405-409 becomes:
const extraction = await extractTextFromBuffer({
  buffer,
  mimeType: document.mime_type ?? contentType,
  fileName: document.file_name,
});
const textContent = typeof extraction === "string" ? extraction : extraction.text;
const aiJudgment = typeof extraction === "string" ? null : extraction.aiJudgment ?? null;
```

**Dependencies**: None for basic implementation. Item 8 (ai_judgment column) needed to persist the aiJudgment result.

**Notes**:
- `pdf-parse` stays as fallback — no dependency removal.
- For PDFs, ai_judgment comes "for free" from the same API call.
- The `file` content type is OpenAI's PDF File Input format (Chat Completions API, base64).

---

### Item 3: Safe Ingestion Order — Defer Delete Until New Embeddings Ready

**File**: `src/service/rag/triggerEmbeddings.ts`

**Current state** (lines 382-395): DELETE happens immediately at line 383, **before** text extraction, chunking, or embedding generation. If any subsequent step fails, old embeddings are already gone.

```
Current order:  DELETE embeddings → S3 download → extract → chunk → update text → embed → INSERT
```

**Change spec**:

Move the DELETE to immediately before INSERT, after embeddings are generated:

```
New order:  S3 download → extract → chunk → embed → DELETE old embeddings → INSERT new → update text + ai_judgment
```

Concrete change in `ingestDocumentEmbeddings`:

1. **Remove** lines 383-395 (the early delete block).
2. **Add** delete + insert as a sequence after `generateEmbeddings` returns:

```typescript
// After line 457 (embeddings generated), before insert:

// Delete old embeddings (safe — new ones are ready)
const { error: deleteExistingError } = await supabase
  .from("document_embeddings")
  .delete()
  .eq("document_id", document.id);

if (deleteExistingError) {
  console.error(`${logPrefix}: Failed to delete existing embeddings:`, deleteExistingError.message);
  throw new Error(deleteExistingError.message);
}

// Insert new embeddings (existing insert block at line 461)
```

3. **Move** the `text_content` update (lines 440-453) to **after** the insert, combining with `ai_judgment` update (once Item 8 is done):

```typescript
const { error: updateError } = await supabase
  .from("documents")
  .update({
    text_content: textContent,
    // ai_judgment: aiJudgment, // Added in Item 8
  })
  .eq("id", document.id);
```

**Dependencies**: None.

**Pipeline after this change**:
```
S3 download → extract text → chunk → generate embeddings →
DELETE old embeddings → INSERT new embeddings → UPDATE documents (text_content)
```

---

### Item 2: Content Deduplication via SHA-256

**Files**:
- `supabase/migrations/YYYYMMDD_add_content_hash_to_documents.sql` (new)
- `src/service/rag/triggerEmbeddings.ts`

**Current state**: No deduplication. Uploading the same PDF twice creates duplicate embeddings and search results.

**Migration SQL**:

```sql
-- Add content_hash column for deduplication
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS content_hash TEXT DEFAULT NULL;

-- Unique index on (user_id, content_hash) — same content for same user = duplicate
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_user_content_hash
  ON public.documents (user_id, content_hash)
  WHERE content_hash IS NOT NULL;
```

Run via `supabase db push`.

**Change spec in `triggerEmbeddings.ts`**:

Add hash check after text extraction, before chunking:

```typescript
import { createHash } from "crypto";

// After textContent is extracted (around line 420):
const contentHash = createHash("sha256").update(textContent).digest("hex");

// Check for existing identical content
const { data: existingDoc } = await supabase
  .from("documents")
  .select("id")
  .eq("user_id", document.user_id)
  .eq("content_hash", contentHash)
  .neq("id", document.id)  // Exclude self (re-ingestion case)
  .maybeSingle();

if (existingDoc) {
  console.log(`${logPrefix}: Duplicate content detected (matches doc ${existingDoc.id}), skipping embedding generation`);
  // Still update this document's text_content and hash for reference
  await supabase
    .from("documents")
    .update({ text_content: textContent, content_hash: contentHash })
    .eq("id", document.id);

  return {
    documentId: document.id,
    status: "skipped" as const,
    reason: `Duplicate content — identical to document ${existingDoc.id}`,
  };
}
```

Also update the final `documents.update` to include `content_hash`:

```typescript
.update({
  text_content: textContent,
  content_hash: contentHash,
  // ai_judgment: aiJudgment, // Item 8
})
```

**Dependencies**: Migration must run first.

---

### Item 4: Parallel Tool Execution via Promise.all

**File**: `src/app/api/openai/respond/utils/tool-execution.ts`

**Current state** (lines 10-11): Serial `for...of` loop processes tool calls one at a time:

```typescript
for (const call of toolCalls) {
  // ... sequential execution
```

Each tool handler is stateless — takes `(args, { supabase, user })` and returns a result. Supabase handles concurrent queries natively.

**Change spec**:

Replace the serial loop with `Promise.all`:

```typescript
export const executeToolCalls = async (
  toolCalls: any[],
  { supabase, user }: { supabase: SupabaseClient; user: any }
) => {
  const toolResponses = await Promise.all(
    toolCalls.map(async (call) => {
      const handler = getToolHandler(call.function.name);

      if (!handler) {
        console.warn(`No handler found for tool: ${call.function.name}`);
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
    })
  );

  return toolResponses;
};
```

**Dependencies**: None. Pure refactor.

**Notes**: The `ToolOrchestrator` at `src/app/api/openai/respond/services/tool-orchestrator.ts` (line 160) calls `executeToolCalls` — no changes needed there since the interface is unchanged.

---

### Item 5: UUID Validation Before Tool Dispatch

**File**: `src/app/api/openai/respond/utils/tool-execution.ts`

**Current state**: No argument validation. LLM sometimes passes file names instead of UUIDs. Supabase silently returns empty results.

**Change spec**:

Add UUID validation after argument parsing (inside the `Promise.all` map from Item 4):

```typescript
// After parsedArgs is parsed:
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validate UUID fields
const uuidFields = ["documentId", "id", "folderId", "approvalRequestId"];
for (const field of uuidFields) {
  if (parsedArgs[field] && typeof parsedArgs[field] === "string" && !UUID_REGEX.test(parsedArgs[field])) {
    return {
      role: "tool" as const,
      tool_call_id: call.id,
      content: JSON.stringify({
        error: `Invalid ${field}: "${parsedArgs[field]}" is not a valid UUID. Use manage_documents(search) or manage_documents(list) to find the correct UUID first.`,
      }),
    };
  }
}
```

**Dependencies**: Best done after Item 4 (so both changes are in the same refactored function).

---

### Item 6: Restructured System Prompt with Sections (Backend Part)

**File**: `src/app/api/openai/respond/route.ts`

**Current state** (lines 19-58): `SYSTEM_PROMPT` is a flat string with 8 numbered rules. No sections, no tool selection guidance, no output format. Language prompt is separate — handled by frontend in `LanguageProvider.tsx` (line 108-111, key `chat.systemPrompt`).

**Change spec**:

1. Replace `SYSTEM_PROMPT` constant with a function that accepts language:

```typescript
const buildSystemPrompt = (language: "en" | "ja" = "en"): string => {
  const languageLabel = language === "ja" ? "Japanese (ja-JP)" : "English (en-US)";

  return `<role>
You are an AI File Management Assistant that helps users manage documents, folders, and approval requests (稟議/ringi). You respond in ${languageLabel} unless the user explicitly requests another language.
</role>

<tool_selection>
DECIDE WHICH TOOL TO USE:
- User refers to a document by NAME → manage_documents(search) to find UUID
- User asks about document CONTENT → search_user_documents (semantic search)
- User asks to list/view documents → manage_documents(list)
- User asks to create/update approval request → check attached docs first, then manage_approval_requests
- User asks about folder operations → manage_folders

SEARCH APPROACH (for search_user_documents):
- Content question ("what does the contract say about payment?") → use query parameter
- Type-based ("show all invoices") → use documentType filter
- Company-based ("docs from Company X") → use organization filter
- Date-based ("documents from last month") → use dateFrom/dateTo
- Combined ("invoices about the Tokyo project") → use both query + filters
</tool_selection>

<rules>
APPROVAL REQUESTS:
1. NEVER assume values the user did not provide, UNLESS explicitly asked to generate them.
2. When a single amount is given for multiple items during CREATE/UPDATE, ask for clarification:
   - Is this the total to split? How to split?
   - Or the amount for EACH item?
   - EXCEPTION: If user says "don't divide" / "use total amount", create one item.
   - Do NOT apply this rule when user is asking about document content.
3. Do not split amounts without confirmation.
4. Items must be objects with: name (string), quantity (number, default 1), amount (number).
5. For updates, use the Active Approval Request ID from [Context] if available.

DOCUMENT HANDLING:
6. To find a UUID: check [Attached Documents] in message history FIRST, then use tools.
7. When user references an attachment for request creation: read the document content, extract details, propose the request. Only ask for missing info.
8. NEVER use a file name as document_id — must be a UUID.

SEARCH RESULTS:
9. Do NOT list file details in text. Say "I found X documents" — file cards render automatically.
10. NEVER include download links — cards have built-in buttons.

CONTENT QUESTIONS:
11. When user asks about document content, read the document FIRST before asking.
12. Check [Attached Documents] across the full conversation history.
</rules>

<multi_file>
When multiple files are uploaded in a batch or across messages:
- Treat them as potentially related documents.
- Summarize all files before acting.
- Cross-reference amounts, entities, and dates across documents for ringi creation.
</multi_file>

<output_format>
- Be concise and precise.
- Use markdown tables for structured data (item lists, comparisons).
- When proposing an approval request, format as a summary with key fields.
- When in doubt, check documents first.
</output_format>`;
};
```

2. Update the POST handler to accept and use `language`:

```typescript
// In POST handler (line 91):
const body = (await req.json()) as OpenAIChatRequest & { language?: "en" | "ja" };

// Line 105-108: Build prompt with language
const systemPrompt = buildSystemPrompt(body.language ?? "en");
const messagesWithSystem = [
  { role: "system" as const, content: systemPrompt },
  ...body.messages,
];
```

3. Update `OpenAIChatRequest` type in `src/types/openai.ts` to include optional `language` field.

**Dependencies**: None. Item 7 (multi-file rule) is included inline. Item 21 (Dual-Path) extends the `<tool_selection>` section later.

---

### Item 7: Multi-File Handling Prompt Rule

**File**: `src/app/api/openai/respond/route.ts`

**Current state**: No multi-file guidance in the prompt.

**Change spec**: Already included in Item 6's restructured prompt as the `<multi_file>` section. No separate implementation needed.

**Dependencies**: Item 6.

---

### Item 20: Developer Reset Tool

**Status**: Already implemented. The plan notes it exists at `src/app/dev-tools/page.tsx` with `service/devTools/resetUserData.ts`. No further backend work needed.

---

## Tier 2 — Quality Improvements

---

### Item 8: `ai_judgment` JSONB Column for Structured AI Analysis

**Files**:
- `supabase/migrations/YYYYMMDD_add_ai_judgment_to_documents.sql` (new)
- `src/types/document.ts`
- `src/service/rag/triggerEmbeddings.ts`

**Current state**: `documents` table has no structured AI analysis. `text_content` stores raw text. The `DocumentRecord` type (lines 1-12 of `src/types/document.ts`) has no `ai_judgment` field.

**Migration SQL**:

```sql
-- Add ai_judgment JSONB column
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS ai_judgment JSONB DEFAULT NULL;

-- GIN index for JSONB containment queries (@>, ?)
CREATE INDEX IF NOT EXISTS idx_documents_ai_judgment_gin
  ON public.documents USING GIN (ai_judgment);

-- B-tree index on extracted document_type for fast type filtering
CREATE INDEX IF NOT EXISTS idx_documents_ai_judgment_type
  ON public.documents ((ai_judgment->>'document_type'));
```

Run via `supabase db push`.

**Type changes in `src/types/document.ts`**:

```typescript
// Add after existing types:
export type AIJudgment = {
  document_type: string;     // "invoice" | "contract" | "receipt" | "report" | etc.
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

// Update DocumentRecord:
export type DocumentRecord = {
  id: string;
  user_id: string;
  folder_id: string | null;
  file_name: string;
  file_path: string;
  text_content: string | null;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  category?: string | null;
  content_hash?: string | null;  // Item 2
  ai_judgment?: AIJudgment | null;  // Item 8
};
```

**Change spec in `triggerEmbeddings.ts`**:

Add `generateAIJudgment` for non-PDF files (PDFs already get ai_judgment from Item 15):

```typescript
import { AIJudgment } from "@/types/document";

const generateAIJudgment = async (
  textContent: string,
  fileName: string
): Promise<AIJudgment | null> => {
  try {
    const inputText = textContent.slice(0, AI_CONFIG.DUAL_PATH?.AI_JUDGMENT_MAX_INPUT_CHARS ?? 3000);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analyze this document and provide structured metadata.\n\nFile name: ${fileName}\n\nContent:\n${inputText}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ai_judgment",
          strict: true,
          schema: {
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
                required: ["people", "organizations", "amounts", "dates"],
              },
              tags: { type: "array", items: { type: "string" } },
              language: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["document_type", "summary", "purpose", "key_entities", "tags", "language", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content) as AIJudgment;
  } catch (error) {
    console.warn(`[AI Judgment] Failed for "${fileName}":`, error instanceof Error ? error.message : error);
    return null;
  }
};
```

**Integration in `ingestDocumentEmbeddings`**:

After text extraction, before chunking:

```typescript
// Get aiJudgment — from PDF extraction (Item 15) or generate separately
let aiJudgment: AIJudgment | null = null;
if (extraction.aiJudgment) {
  // PDF path — already extracted via structured output
  aiJudgment = extraction.aiJudgment;
} else if (textContent.trim()) {
  // Non-PDF path — separate generation call
  aiJudgment = await generateAIJudgment(textContent, document.file_name);
}
```

Update final document write:

```typescript
.update({
  text_content: textContent,
  content_hash: contentHash,
  ai_judgment: aiJudgment,
})
```

**Dependencies**: Migration. Item 15 for PDF ai_judgment. Item 2 for content_hash field.

**Cost**: ~$0.0004 per non-PDF file (first 3000 chars with gpt-4o-mini).

---

### Item 21: Dual-Path Search Pipeline

**Files**:
- `supabase/migrations/YYYYMMDD_create_match_document_embeddings_v2.sql` (new)
- `src/app/api/openai/respond/tools/rag.ts`
- `src/app/api/openai/respond/config/ai.config.ts`
- `src/app/api/openai/respond/route.ts` (prompt addition)

**Current state**:
- `match_document_embeddings` RPC (migration file `20250218133000`): vector-only search, no metadata filtering, no JOIN with `documents` table.
- `rag.ts` tool (lines 56-128): requires `query` (mandatory), generates embedding, calls RPC, then runs a **separate** query to enrich results with document metadata. Two DB round-trips.
- `ai.config.ts` (lines 6-54): no dual-path configuration.

**Step 1: Migration — `match_document_embeddings_v2` RPC**

```sql
-- Dual-path search: supports semantic, metadata, and combined search
-- Preserves v1 for backward compatibility
CREATE OR REPLACE FUNCTION public.match_document_embeddings_v2(
  query_embedding vector(1536) DEFAULT NULL,
  match_count int DEFAULT 20,
  similarity_threshold float DEFAULT 0.7,
  filter_document_type text DEFAULT NULL,
  filter_organization text DEFAULT NULL,
  filter_date_from timestamptz DEFAULT NULL,
  filter_date_to timestamptz DEFAULT NULL,
  filter_tags text[] DEFAULT NULL,
  filter_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  document_id uuid,
  content text,
  similarity float,
  -- Joined from documents table:
  file_name text,
  file_path text,
  mime_type text,
  file_size bigint,
  created_at timestamptz,
  folder_id uuid,
  category text,
  ai_judgment jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Path A: Semantic search (query_embedding provided, no filters)
  -- Path B: Metadata search (no query_embedding, filters provided)
  -- Path C: Combined (both provided)

  IF query_embedding IS NULL AND filter_document_type IS NULL AND filter_organization IS NULL
     AND filter_date_from IS NULL AND filter_date_to IS NULL AND filter_tags IS NULL
     AND filter_category IS NULL THEN
    RAISE EXCEPTION 'At least query_embedding or one filter parameter must be provided';
  END IF;

  RETURN QUERY
  SELECT
    de.id,
    de.user_id,
    de.document_id,
    de.content,
    CASE
      WHEN query_embedding IS NOT NULL THEN 1 - (de.embedding <=> query_embedding)
      ELSE 1.0  -- No similarity score for metadata-only search
    END AS similarity,
    d.file_name,
    d.file_path,
    d.mime_type,
    d.file_size,
    d.created_at,
    d.folder_id,
    d.category,
    d.ai_judgment
  FROM public.document_embeddings de
  JOIN public.documents d ON d.id = de.document_id
  WHERE de.user_id = auth.uid()
    -- Vector similarity filter (only when embedding provided)
    AND (query_embedding IS NULL OR 1 - (de.embedding <=> query_embedding) > similarity_threshold)
    -- Metadata filters (applied when provided)
    AND (filter_document_type IS NULL OR d.ai_judgment->>'document_type' = filter_document_type)
    AND (filter_organization IS NULL OR d.ai_judgment->'key_entities'->'organizations' ? filter_organization)
    AND (filter_date_from IS NULL OR d.created_at >= filter_date_from)
    AND (filter_date_to IS NULL OR d.created_at <= filter_date_to)
    AND (filter_tags IS NULL OR d.ai_judgment->'tags' ?| filter_tags)
    AND (filter_category IS NULL OR d.category = filter_category)
  ORDER BY
    CASE WHEN query_embedding IS NOT NULL THEN de.embedding <=> query_embedding ELSE 0 END ASC,
    d.created_at DESC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_document_embeddings_v2 TO authenticated;
```

Run via `supabase db push`.

**Step 2: Update `ai.config.ts`**

```typescript
// Add to AI_CONFIG:
DUAL_PATH: {
  DEFAULT_SIMILARITY_THRESHOLD: 0.7,
  MAX_RESULTS: 20,
  AI_JUDGMENT_MODEL: "gpt-4o-mini",
  AI_JUDGMENT_MAX_INPUT_CHARS: 3000,
},
```

**Step 3: Update `rag.ts` tool definition and handler**

Current tool definition (lines 130-163): `query` is required, no metadata filters.

New definition:

```typescript
export const ragTool = {
  definition: {
    type: "function",
    function: {
      name: "search_user_documents",
      description:
        "Search the user's uploaded documents using semantic search, metadata filters, or both. Supports three modes: (A) content search with a query, (B) metadata-only filtering by document type/organization/date, (C) combined search with both query and filters.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Natural language search query. Required for content-based search. Optional when using metadata filters only.",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 20,
            default: 5,
            description: "Maximum number of results to retrieve.",
          },
          similarityThreshold: {
            type: "number",
            minimum: 0,
            maximum: 1,
            default: AI_CONFIG.EMBEDDING.SIMILARITY_THRESHOLD,
            description: "Minimum similarity score for semantic results.",
          },
          documentType: {
            type: "string",
            description: 'Filter by document type from ai_judgment (e.g., "invoice", "contract", "receipt", "report").',
          },
          organization: {
            type: "string",
            description: 'Filter by organization name from ai_judgment key_entities.',
          },
          dateFrom: {
            type: "string",
            description: "Filter documents created after this ISO date.",
          },
          dateTo: {
            type: "string",
            description: "Filter documents created before this ISO date.",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Filter by tags from ai_judgment.",
          },
          category: {
            type: "string",
            description: "Filter by document category.",
          },
        },
        // query is no longer required — at least query OR one filter must be provided
        required: [],
      },
    },
  },
  handler: async (
    args: {
      query?: string;
      limit?: number;
      similarityThreshold?: number;
      documentType?: string;
      organization?: string;
      dateFrom?: string;
      dateTo?: string;
      tags?: string[];
      category?: string;
    },
    { supabase, user }: { supabase: SupabaseClient; user: any }
  ) => {
    const hasQuery = args.query && args.query.trim();
    const hasFilters = args.documentType || args.organization || args.dateFrom || args.dateTo || args.tags || args.category;

    if (!hasQuery && !hasFilters) {
      return { error: "At least a search query or one metadata filter must be provided." };
    }

    const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 20);
    const similarityThreshold = Number(args.similarityThreshold) || AI_CONFIG.EMBEDDING.SIMILARITY_THRESHOLD;

    // Generate embedding only when query is present
    let embedding: number[] | null = null;
    if (hasQuery) {
      embedding = await requestEmbedding(args.query!);
    }

    // Call v2 RPC — single query with JOIN
    const { data: results, error } = await supabase.rpc(
      "match_document_embeddings_v2",
      {
        query_embedding: embedding,
        match_count: limit,
        similarity_threshold: similarityThreshold,
        filter_document_type: args.documentType ?? null,
        filter_organization: args.organization ?? null,
        filter_date_from: args.dateFrom ?? null,
        filter_date_to: args.dateTo ?? null,
        filter_tags: args.tags ?? null,
        filter_category: args.category ?? null,
      }
    );

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    if (!Array.isArray(results) || results.length === 0) {
      return [];
    }

    // Results already include document data from JOIN — no second query needed
    return results.map((row: any) => ({
      documentId: row.document_id,
      similarity: row.similarity,
      content: row.content,
      file: {
        id: row.document_id,
        name: row.file_name,
        mimeType: row.mime_type,
        size: row.file_size,
        fileUrl: row.file_path,
        modifiedTime: row.created_at,
        category: row.category,
        folderId: row.folder_id,
      },
      aiJudgment: row.ai_judgment ? {
        documentType: row.ai_judgment.document_type,
        summary: row.ai_judgment.summary,
      } : null,
    }));
  },
} as const;
```

**Step 4: Add Dual-Path decision tree to system prompt**

In `route.ts` `buildSystemPrompt()`, the `<tool_selection>` SEARCH APPROACH section (already included in Item 6 spec) covers this. No additional change needed — Item 6 already includes the dual-path guidance.

**Dependencies**: Item 8 (ai_judgment column must exist). Item 6 (system prompt restructured).

**Key simplification**: The v2 function JOINs documents at query time, reducing the handler from 2 DB round-trips to 1. The separate `documents` enrichment query (current lines 96-108 of rag.ts) is eliminated.

---

### Item 10: Tool Result Truncation for Large Documents

**File**: `src/app/api/openai/respond/tools/documents.ts`

**Current state** (lines 94-112): The `get_content` action returns `data.text_content` in full. No size limit. A 10-page document can return 15K+ tokens.

**Change spec**:

Add truncation after fetching content:

```typescript
if (action === "get_content") {
  if (!documentId) {
    throw new Error("documentId is required for get_content action");
  }

  const { data, error } = await supabase
    .from(tableName)
    .select("id, file_name, text_content")
    .eq("user_id", user.id)
    .eq("id", documentId)
    .single();

  if (error) throw new Error(error.message);

  const MAX_CONTENT_CHARS = 8000;
  let textContent = data?.text_content ?? "";
  let truncated = false;

  if (textContent.length > MAX_CONTENT_CHARS) {
    textContent = textContent.slice(0, MAX_CONTENT_CHARS);
    truncated = true;
  }

  return {
    document: data
      ? {
          id: data.id,
          name: data.file_name,
          textContent,
          ...(truncated && {
            note: `Content truncated at ${MAX_CONTENT_CHARS} characters. Use search_user_documents with a specific query to find relevant sections.`,
          }),
        }
      : null,
  };
}
```

**Dependencies**: None.

---

### Item 11: Parallel Batch Ingestion

**File**: `src/app/api/rag/ingest/route.ts`

**Current state** (lines 73-79): Sequential `for` loop:

```typescript
for (const doc of documents) {
  const result = await ingestDocumentEmbeddings({ document: doc, supabase });
  results.push(result);
}
```

Each ingestion is independent (different S3 keys, different embedding API calls).

**Change spec**:

Replace with `Promise.allSettled`:

```typescript
const settledResults = await Promise.allSettled(
  documents.map((doc) =>
    ingestDocumentEmbeddings({ document: doc, supabase })
  )
);

const results: IngestionResult[] = settledResults.map((settled, index) => {
  if (settled.status === "fulfilled") {
    return settled.value;
  }
  return {
    documentId: documents[index].id,
    status: "failed" as const,
    reason: settled.reason?.message || "Unexpected ingestion failure",
  };
});
```

**Dependencies**: None.

**Notes**: `Promise.allSettled` ensures one file's failure doesn't block others. Rate limits safe at demo volume (gpt-4o-mini: ~30K RPM).

---

### Item 12: First-Call Response Validation

**File**: `src/app/api/openai/respond/services/tool-orchestrator.ts`

**Current state** (lines 120-132): `parseToolResponse` reads `payload?.choices?.[0]` with optional chaining but doesn't validate presence. If `choices` is missing or empty, `hasToolCalls` is false and orchestration proceeds as "no tools needed" — the final streaming call may also fail silently.

**Change spec**:

Add validation in `parseToolResponse`:

```typescript
private async parseToolResponse(
  response: Response
): Promise<ToolExecutionResult> {
  if (!response.ok) {
    throw new Error(`OpenAI returned ${response.status}: ${response.statusText}`);
  }

  const payload = await response.json();
  const choice = payload?.choices?.[0];

  if (!choice) {
    throw new Error(
      "OpenAI returned an empty response (no choices). This may indicate a temporary API issue."
    );
  }

  const toolCalls = choice.message?.tool_calls;

  return {
    hasToolCalls: Array.isArray(toolCalls) && toolCalls.length > 0,
    choice,
    toolCalls,
  };
}
```

The error thrown here is caught by the stream controller's catch block in `route.ts` (line 152), which calls `controller.error(error)`. The frontend sees the error and shows a retry message.

**Dependencies**: None.

---

### Item 13: Tool Execution Timeout (30s)

**File**: `src/app/api/openai/respond/utils/tool-execution.ts`

**Current state**: No timeout. A hanging Supabase query or S3 operation blocks indefinitely.

**Change spec**:

Add a `withTimeout` utility and wrap handler calls:

```typescript
const TOOL_TIMEOUT_MS = 30_000;

const withTimeout = <T>(promise: Promise<T>, ms: number, toolName: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${toolName} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
};

// Inside the Promise.all map (from Item 4):
try {
  const result = await withTimeout(
    handler(parsedArgs, { supabase, user }),
    TOOL_TIMEOUT_MS,
    call.function.name
  );
  return { /* ... success response ... */ };
} catch (error: any) {
  return { /* ... error response ... */ };
}
```

**Dependencies**: Best done after Item 4 (same file, same function).

---

### Item 14: Actionable Error Messages Back to LLM

**File**: `src/app/api/openai/respond/utils/tool-execution.ts`

**Current state** (lines 43-50): Catch block returns generic `error.message || "Tool execution failed"`.

**Change spec**:

Update the catch block:

```typescript
} catch (error: any) {
  const toolName = call.function.name;
  const errorMessage = error.message || "Unknown error";

  return {
    role: "tool" as const,
    tool_call_id: call.id,
    content: JSON.stringify({
      error: `${toolName} failed: ${errorMessage}`,
      suggestion: "Try a different approach, use a different tool, or ask the user for more information.",
    }),
  };
}
```

**Dependencies**: Best done with Items 4 + 13 (same file).

---

## Tier 3 — Future Enhancements

---

### Item 16: Excel Extraction via SheetJS

**File**: `src/service/rag/triggerEmbeddings.ts`

**Current state**: Excel files (.xlsx, .xls) hit the "Unsupported types" branch and return `""`.

**Change spec**:

1. Install dependency:
```bash
npm install xlsx
```

2. Add Excel branch in `extractTextFromBuffer` (after DOCX, before Google Docs):

```typescript
import * as XLSX from "xlsx";

// Handle Excel files
if (
  normalizedMime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
  normalizedMime === "application/vnd.ms-excel" ||
  ["xlsx", "xls"].includes(extension)
) {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheets = workbook.SheetNames.map((name) => {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
      return `[Sheet: ${name}]\n${csv}`;
    });
    const extractedText = sheets.join("\n\n");
    if (!extractedText.trim()) {
      console.warn(`[Text Extraction] Excel file "${fileName}" has no data`);
    }
    return { text: extractedText };
  } catch (error) {
    console.error(`[Text Extraction] Failed to extract from Excel "${fileName}":`, error instanceof Error ? error.message : error);
    return { text: "" };
  }
}
```

**Dependencies**: npm package install.

---

## Summary: Files Changed Per Item

| Item | File | Action |
|------|------|--------|
| 1, 3, 15, 2, 8, 16 | `src/service/rag/triggerEmbeddings.ts` | MODIFY |
| 4, 5, 13, 14 | `src/app/api/openai/respond/utils/tool-execution.ts` | MODIFY |
| 6, 7 | `src/app/api/openai/respond/route.ts` | MODIFY |
| 8 | `src/types/document.ts` | MODIFY |
| 10 | `src/app/api/openai/respond/tools/documents.ts` | MODIFY |
| 11 | `src/app/api/rag/ingest/route.ts` | MODIFY |
| 12 | `src/app/api/openai/respond/services/tool-orchestrator.ts` | MODIFY |
| 21 | `src/app/api/openai/respond/tools/rag.ts` | MODIFY |
| 21 | `src/app/api/openai/respond/config/ai.config.ts` | MODIFY |
| 2 | `supabase/migrations/YYYYMMDD_add_content_hash_to_documents.sql` | CREATE |
| 8 | `supabase/migrations/YYYYMMDD_add_ai_judgment_to_documents.sql` | CREATE |
| 21 | `supabase/migrations/YYYYMMDD_create_match_document_embeddings_v2.sql` | CREATE |

---

## Recommended Execution Batches

**Batch 1** (single-file focus: `triggerEmbeddings.ts`):
Items 3 → 1 → 15 → 2 — Safe order, image extraction, PDF overhaul, dedup

**Batch 2** (single-file focus: `tool-execution.ts`):
Items 4 → 5 → 13 → 14 — Parallel execution, validation, timeout, errors

**Batch 3** (prompt + validation):
Items 6 → 7 → 12 — System prompt, multi-file rule, response validation

**Batch 4** (Tier 2 quality):
Items 8 → 21 → 10 → 11 — ai_judgment, dual-path, truncation, parallel ingestion

**Batch 5** (Tier 3 if needed):
Item 16 — Excel extraction
