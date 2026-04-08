# Feature: AI Chat → Draft Creation (Propose Button)

## Overview

Enable users to create ringi (approval request) drafts through natural conversation with the AI assistant. When a user uploads documents and asks the AI to "create a ringi from this," the AI reads the documents, extracts structured data, and presents a **proposal with a clickable "Create Draft" button** in the chat. Clicking the button opens the `SubmissionDialog` **pre-filled** with extracted data. The user reviews, edits, and saves directly from the form.

This removes the need for back-and-forth chat confirmation. **The form IS the confirmation.**

This feature continues from the **Out of Scope** item in `draft-status.md`: "AI-assisted draft creation (chat → draft)."

---

## User Stories

- **As a requester**, I want to upload a document and ask the AI to create a ringi from it, so I don't have to manually fill in every field.
- **As a requester**, I want the AI to show me what it extracted and give me a button to open the form, so I can verify and adjust in the actual submission form.
- **As a requester**, I want to upload multiple related documents (e.g., quotation + contract) and have the AI cross-reference them into a single pre-filled form.
- **As a requester**, I want the "Create Draft" button to stay in the chat history so I can re-open the pre-filled form later if I didn't save the first time.

---

## Core Design Decision: Propose → Button → Form

```
OLD: AI proposes → user types "yes" → AI creates draft → card appears
NEW: AI proposes → button appears → user clicks → form opens pre-filled → user saves
```

The AI does **not** create the approval request directly. Instead:

1. AI checks conversation context — does it already have file content from a previous interaction?
2. If not, AI reads documents via `get_content` (only when needed)
3. AI calls `manage_approval_requests(action: "propose")` — validates data shape, returns structured proposal as metadata, **no DB insert**
4. Server sends a brief template message (no final AI call — instant response)
5. Frontend detects `metadata.ringi_proposal` → renders a **"Create Draft" button** below the AI message
6. User clicks → `SubmissionDialog` opens pre-filled with extracted fields (or empty form if no file data)
7. User reviews, edits, saves as draft or submits

**Why this is better than "type yes":**
- One click instead of typing a confirmation message
- User reviews data in the actual form (not just a chat summary)
- User can edit fields before saving (no need for "yes, but change the title...")
- The button persists in chat history — user can come back later

**Context-aware = fewer tool rounds = less latency:**
- If the user already discussed the file earlier, the AI skips `get_content` entirely
- If no files are involved, the button still appears with an empty form
- The `propose` tool only fires when the user explicitly asks to create a ringi — NOT on file upload

---

## Wireframes

### 1. Chat — AI Proposal with Create Draft Button

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌ User ────────────────────────────────────────────┐   │
│  │ 📎 invoice.pdf                                   │   │
│  │ Create a ringi from this document                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌ AI ──────────────────────────────────────────────┐   │
│  │                                                  │   │
│  │  Here's what I extracted from **invoice.pdf**:   │   │
│  │                                                  │   │
│  │  **Title**: Server Infrastructure Upgrade        │   │
│  │  **Vendor**: Acme Corporation                    │   │
│  │  **Amount**: ¥500,000 (tax included)             │   │
│  │  **Category**: Purchasing                        │   │
│  │  **Department**: Engineering                     │   │
│  │  **Payment**: Bank transfer, due 2026-04-30      │   │
│  │                                                  │   │
│  │  ### Items                                       │   │
│  │  | # | Item          | Qty | Amount     |       │   │
│  │  |---|---------------|-----|------------|       │   │
│  │  | 1 | Server rack   |   2 | ¥200,000  |       │   │
│  │  | 2 | UPS unit      |   1 | ¥100,000  |       │   │
│  │                                                  │   │
│  │  **Referenced files**: invoice.pdf               │   │
│  │                                                  │   │
│  │  Click the button below to open the submission   │   │
│  │  form with these details pre-filled.             │   │
│  │                                          12:34   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  📝 Create Draft                                 │   │
│  │  Opens submission form pre-filled with           │   │
│  │  extracted data from invoice.pdf                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2. SubmissionDialog — Pre-filled from AI Extraction

```
┌─────────────────────────────────────────────────────────┐
│  New Submission                                    [X]  │
│  ───────────────────────────────────────────────────     │
│                                                         │
│  Title *                                                │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Server Infrastructure Upgrade                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Vendor Name *              Category *                  │
│  ┌──────────────────┐       ┌──────────────────┐        │
│  │ Acme Corporation │       │ Purchasing    ▼  │        │
│  └──────────────────┘       └──────────────────┘        │
│                                                         │
│  Department *               Priority *                  │
│  ┌──────────────────┐       ┌──────────────────┐        │
│  │ Engineering      │       │ medium       ▼   │        │
│  └──────────────────┘       └──────────────────┘        │
│                                                         │
│  Amount                     Payment Method              │
│  ┌──────────────────┐       ┌──────────────────┐        │
│  │ 500,000          │       │ Bank transfer    │        │
│  └──────────────────┘       └──────────────────┘        │
│                                                         │
│  Payment Schedule Date      Purpose                     │
│  ┌──────────────────┐       ┌──────────────────┐        │
│  │ 2026-04-30       │       │ Infrastructure   │        │
│  └──────────────────┘       └──────────────────┘        │
│                                                         │
│  Items                                                  │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Server rack        │  2  │  ¥200,000   [🗑]   │    │
│  │  UPS unit           │  1  │  ¥100,000   [🗑]   │    │
│  │                          [+ Add Item]           │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Attachments                                            │
│  ┌─────────────────────────────────────────────────┐    │
│  │  📎 invoice.pdf  (auto-linked)                  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌──────────┐  ┌────────────────┐  ┌──────────────┐    │
│  │  Cancel   │  │ Save as Draft  │  │   Submit     │    │
│  └──────────┘  └────────────────┘  └──────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3. Multi-Document — AI Cross-References Files

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌ User ────────────────────────────────────────────┐   │
│  │ 📎 quotation.pdf  📎 contract.pdf               │   │
│  │ Create a ringi from these documents              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌ AI ──────────────────────────────────────────────┐   │
│  │                                                  │   │
│  │  I've read both files and cross-referenced       │   │
│  │  the details.                                    │   │
│  │                                                  │   │
│  │  **Title**: Annual Office Lease Renewal          │   │
│  │  **Vendor**: ABC Realty Inc.                     │   │
│  │  **Amount**: ¥1,200,000/year (from quotation)    │   │
│  │  **Category**: Contract                          │   │
│  │  **Period**: 2026-04-01 to 2027-03-31            │   │
│  │            (from contract.pdf)                    │   │
│  │  **Payment**: Monthly ¥100,000                   │   │
│  │            (from quotation.pdf)                   │   │
│  │                                                  │   │
│  │  **Referenced files**:                           │   │
│  │  - quotation.pdf                                 │   │
│  │  - contract.pdf                                  │   │
│  │                                          14:22   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  📝 Create Draft                                 │   │
│  │  Opens form pre-filled with data from            │   │
│  │  quotation.pdf + contract.pdf                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4. Content Already in Context — Fast Path (No get_content needed)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌ User ────────────────────────────────────────────┐   │
│  │ 📎 invoice.pdf                                   │   │
│  │ What's in this file?                             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌ AI ──────────────────────────────────────────────┐   │
│  │  Here's what **invoice.pdf** contains:           │   │
│  │                                                  │   │
│  │  **Vendor**: Acme Corporation                    │   │
│  │  **Total**: ¥500,000 (tax included)              │   │
│  │  **Items**: Server rack x2, UPS unit x1          │   │
│  │  ...                                             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌ User ────────────────────────────────────────────┐   │
│  │ Create a ringi from this                         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌ AI ──────────────────────────────────────────────┐   │
│  │                                                  │   │
│  │  Based on the invoice we just discussed:         │   │
│  │  (AI skips get_content — already has data)       │   │
│  │                                                  │   │
│  │  **Title**: Server Infrastructure Upgrade        │   │
│  │  **Vendor**: Acme Corporation                    │   │
│  │  **Amount**: ¥500,000                            │   │
│  │  ...                                             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  📝 Create Draft                                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5. No Files — Empty Form with Button

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌ User ────────────────────────────────────────────┐   │
│  │ I want to create a new ringi                     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌ AI ──────────────────────────────────────────────┐   │
│  │                                                  │   │
│  │  I'll prepare a blank submission form for you.   │   │
│  │  Click the button below to open it.              │   │
│  │                                                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  📝 Create Draft                                 │   │
│  │  Opens an empty submission form                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6. After Saving — Draft Appears in Listing

```
┌─────────────────────────────────────────────────────────┐
│  Approval Requests                                      │
│  ─────────────────────────────────────────────────────  │
│  [ All ] [ Draft(1) ] [ Pending ] [ Approved ] ...      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  ▊ DRAFT                                        │    │
│  │  Server Infrastructure Upgrade                  │    │
│  │  Acme Corporation  •  ¥500,000  •  Purchasing   │    │
│  │  📎 1 attachment                                │    │
│  │                                                 │    │
│  │  [ Edit Draft ]  [ Delete ]                     │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## High-Level Flow (Context-Aware)

The AI is smart about what's already in the conversation. It doesn't re-read files unnecessarily.

```
User says "create a ringi" (with or without files)
                    │
                    ▼
    ┌───────────────────────────────────────┐
    │ Is file CONTENT already in            │
    │ conversation history?                 │
    │ (user asked about the file before,    │
    │  or AI already called get_content)    │
    └───────┬──────────────────┬────────────┘
        YES │                  │ NO
            │                  ▼
            │  ┌────────────────────────────┐
            │  │ Is file METADATA in        │
            │  │ [Attached Documents]?      │
            │  │ (user uploaded files in    │
            │  │  this message or earlier)  │
            │  └───────┬───────────┬────────┘
            │      YES │           │ NO
            │          ▼           │
            │  ┌────────────────┐  │
            │  │ get_content()  │  │
            │  │ for each file  │  │
            │  │ (1 tool round) │  │
            │  └───────┬────────┘  │
            │          │           │
            ▼          ▼           ▼
    ┌───────────────────────────────────────┐
    │ AI extracts structured fields from    │
    │ whatever data it has (full content,   │
    │ or minimal/empty if no files)         │
    └───────────────────┬───────────────────┘
                        │
                        ▼
    ┌───────────────────────────────────────┐
    │ AI calls:                             │
    │ manage_approval_requests(             │
    │   action: "propose",                  │
    │   data: { ...fields,                  │
    │     document_ids: [...] }             │
    │ )                                     │
    │                                       │
    │ → validates shape, NO DB insert       │
    │ → returns { type:"proposal", data }   │
    │ → metadata pipeline captures as       │
    │   ringi_proposal                      │
    │                        (1 tool round) │
    └───────────────────┬───────────────────┘
                        │
                        ▼
    ┌───────────────────────────────────────┐
    │ Server sends template text            │
    │ (instant, no AI call)                 │
    │                          (< 100ms)    │
    └───────────────────┬───────────────────┘
                        │
                        ▼
    ┌───────────────────────────────────────┐
    │ Frontend: ChatMessage detects         │
    │ metadata.ringi_proposal               │
    │ → renders [Create Draft] button       │
    └───────────────────┬───────────────────┘
                        │
                        ▼  (user clicks)
    ┌───────────────────────────────────────┐
    │ SubmissionDialog opens with           │
    │ prefillData = ringi_proposal          │
    │ (pre-filled if data exists,           │
    │  empty form if not)                   │
    └───────────────────┬───────────────────┘
                        │
                        ▼  (user saves)
    ┌───────────────────────────────────────┐
    │ createApprovalRequest() with          │
    │ status: "draft" or "pending"          │
    │ (user's choice via form buttons)      │
    └───────────────────────────────────────┘
```

### Latency by Scenario

Each OpenAI tool round = ~1-2s API call + tool execution time. Final stream = ~2-5s.

| Scenario | Example | Rounds | Est. Latency |
|----------|---------|--------|-------------|
| **Content already in context** | User asked "what's in this file?" earlier, then says "create a ringi from it" | 1 (propose → template) | ~1-2s |
| **File attached, not yet read** | User uploads file + says "create a ringi from this" in one message | 2 (get_content → propose → template) | ~2-4s |
| **No files at all** | User says "create a blank ringi" | 1 (propose w/ empty → template) | ~1-2s |

**Key insight**: The `propose` tool itself is ~100ms (just validation, no DB). The cost is the OpenAI API round-trip to decide to call it. After `propose`, the server sends a template response instead of making a final OpenAI streaming call — saving ~2-5s and ~500 tokens per proposal.

---

## Technical Implementation

### 1. New Tool Action: `propose`

**File:** `src/app/api/openai/respond/tools/approval-requests.ts`

Add `"propose"` to the `action` enum and add a handler that validates the data shape but does **not** insert into the database:

```typescript
// In the action enum:
enum: ["create", "read", "update", "delete", "list", "propose"],

// In the handler:
if (action === "propose") {
  // Validate basic structure (title required)
  if (!data?.title) throw new Error("Title is required for propose action");

  // Return structured proposal without DB insert
  return {
    type: "proposal",
    data: {
      title: data.title,
      vendor_name: data.vendor_name || null,
      category: data.category || null,
      amount: data.amount || null,
      priority: data.priority || null,
      items: data.items || [],
      department: data.department || null,
      payment_schedule_date: data.payment_schedule_date || null,
      payment_method: data.payment_method || null,
      reason_for_purchase: data.reason_for_purchase || null,
      purpose: data.purpose || null,
      description: data.description || null,
      remarks: data.remarks || null,
      document_ids: data.document_ids || [],
      is_use_tax: data.is_use_tax ?? false,
      is_tax_included: data.is_tax_included ?? true,
      tax_rate: data.tax_rate || 10,
    },
  };
}
```

### 2. Metadata Pipeline — Capture Proposal

**File:** `src/app/api/openai/respond/utils/stream.ts`

In `extractToolMetadata()`, detect the proposal response:

```typescript
// After existing approval_request_id detection:
if (parsed?.type === "proposal" && parsed?.data) {
  result.ringi_proposal = parsed.data;
}
```

**File:** `src/types/file.ts`

Add to `ExtractedToolMetadata`:

```typescript
export type ExtractedToolMetadata = {
  approval_request_id?: string;
  approval_request_ids?: string[];
  files?: IFileMetadata[];
  rag_sources?: IFileMetadata[];
  ringi_proposal?: Record<string, any>;  // NEW
};
```

**File:** `src/app/api/openai/respond/types/index.ts`

Add to `ToolMetadataEvent`:

```typescript
export interface ToolMetadataEvent {
  type: "tool_metadata";
  approval_request_id?: string;
  approval_request_ids?: string[];
  files?: any[];
  rag_sources?: any[];
  ringi_proposal?: Record<string, any>;  // NEW
}
```

### 3. Frontend Stream — Capture Proposal Metadata

**File:** `src/hooks/chat/useAssistantStream.ts`

In the `tool_metadata` event handler, add:

```typescript
if (parsed.ringi_proposal) {
  toolMetadata.ringi_proposal = parsed.ringi_proposal;
}
```

### 4. Conversation Type

**File:** `src/types/conversation.ts`

While `ConversationMessageMetadata` already has `[key: string]: any`, make it explicit:

```typescript
export type ConversationMessageMetadata = {
  approval_request_id?: string;
  approval_request_ids?: string[];
  files?: any[];
  rag_sources?: IFileMetadata[];
  source?: FileSource;
  ringi_proposal?: Record<string, any>;  // NEW
  [key: string]: any;
};
```

### 5. Chat Rendering — Create Draft Button

**File:** `src/components/ChatMessage.tsx`

Add a new conditional render block (same pattern as `ApprovalRequestCard`):

```tsx
{/* For assistant messages, show Create Draft button if proposal exists */}
{!isUser && metadata?.ringi_proposal && (
  <RingiProposalButton proposal={metadata.ringi_proposal} />
)}
```

**File:** `src/components/chat/RingiProposalButton.tsx` (NEW)

A new component that:
1. Displays a styled button: "Create Draft"
2. Shows file names from `proposal.document_ids` (optional subtitle)
3. On click, opens `SubmissionDialog` with `prefillData` prop
4. Uses local state for dialog open/close

```tsx
"use client";
import { useState } from "react";
import { FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmissionDialog } from "@/components/approval-request/SubmissionDialog";

interface RingiProposalButtonProps {
  proposal: Record<string, any>;
}

export function RingiProposalButton({ proposal }: RingiProposalButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="...">
        <FileEdit className="w-4 h-4 mr-2" />
        Create Draft
      </Button>
      <SubmissionDialog
        open={open}
        onOpenChange={setOpen}
        prefillData={proposal}
        onSuccess={() => setOpen(false)}
      />
    </>
  );
}
```

### 6. SubmissionDialog — New `prefillData` Prop

**File:** `src/components/approval-request/SubmissionDialog.tsx`

Add a new prop `prefillData` that pre-fills the form for a **new** creation (unlike `initialData` which triggers edit/update mode):

```typescript
interface SubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ApprovalRequest | null;    // existing — triggers UPDATE mode
  prefillData?: Record<string, any> | null; // NEW — pre-fills but creates NEW
  onSuccess: () => void;
}
```

In the Formik `initialValues`, use `prefillData` as fallback when `initialData` is absent:

```typescript
const source = initialData || prefillData;

initialValues: {
  title: source?.title || "",
  vendor_name: source?.vendor_name || "",
  category: source?.category || "Purchasing",
  amount: source?.amount || 0,
  // ... all other fields
  items: source?.items || [],
}
```

The submit handler checks `initialData` (not `prefillData`) to decide create vs update:

```typescript
if (initialData) {
  updateMutation.mutate({ id: initialData.id, ...submissionData });
} else {
  // This handles both fresh creation AND prefill creation
  createMutation.mutate(submissionData);
}
```

For document linking, when `prefillData.document_ids` exists:

```typescript
// In the useEffect that loads attachments:
useEffect(() => {
  if (initialData?.documents) {
    // existing logic
  } else if (prefillData?.document_ids?.length) {
    // Load document metadata for display
    // Set attachments from document_ids
  }
}, [initialData, prefillData]);
```

### 7. System Prompt Update

**File:** `src/app/api/openai/respond/prompts/v2.ts`

Replace the old "ask for confirmation" rules with context-aware instructions:

```
AI-ASSISTED DRAFT CREATION:
14. When the user asks to "create a ringi" / "稟議を作って" / similar, follow this context-aware flow:

    STEP 1 — Check what you already know (minimize tool calls):
    a. If document content is ALREADY in the conversation history (from a previous
       get_content call or earlier discussion), use that content directly. Do NOT
       call get_content again.
    b. If document content is NOT in history but [Attached Documents] has file UUIDs,
       call manage_documents(get_content) for each document_id to read the files.
    c. If there are NO files at all, skip to step 2 with empty/minimal data.

    STEP 2 — Extract and propose:
    a. Extract structured fields from whatever content you have: title, vendor_name,
       amount, items, category, department, payment details, dates, purpose,
       reason_for_purchase, etc.
    b. Call manage_approval_requests(action: "propose", data: { ...extracted fields,
       document_ids: [all referenced document UUIDs] }).
       - If you have rich content: fill in as many fields as possible.
       - If you have no content: propose with just a title or empty fields.
    c. After calling propose, STOP. Do NOT write a summary or tell the user to click
       a button — the server handles the response text automatically via a template.
    d. Do NOT call create — the user will save from the form themselves.

15. IMPORTANT — do NOT propose automatically on file upload:
    - When user uploads files WITHOUT asking to create a ringi, just acknowledge
      the upload or summarize the file. Do NOT call propose.
    - Only call propose when the user EXPLICITLY asks to create a ringi/draft.
```

### 8. No RAG/Embedding Changes

**Decision**: Approval requests are **not** embedded into the RAG pipeline.

**Rationale**:
- Ringi data is structured (title, amount, vendor, status) — perfect for SQL filtering
- The existing `manage_approval_requests(list)` tool with `filters` already supports querying by status, category, priority, and limit
- Adding ringi to embeddings would create noise in document search results

**File not modified:** `src/service/rag/triggerEmbeddings.ts`

---

## How the AI Reads Documents

The AI already has the capability to read document content through the existing tool chain:

1. **[Attached Documents] context**: When a user uploads files, the chat frontend injects `[Attached Documents]` metadata into the message content (file name, UUID, size) — see `useThreadWorkspace.ts:201`
2. **`manage_documents(get_content, documentId)`**: Reads `text_content` from the `documents` table (up to 20k chars, extracted during upload via the ingestion pipeline)
3. **`search_user_documents(query_en, query_ja)`**: Semantic search via RAG for content-based queries

For draft creation, the AI uses `manage_documents(get_content)` to read each attached document's full text, then extracts structured fields from the content.

---

## Multi-File Handling

When multiple files are uploaded:

1. AI reads ALL documents via `manage_documents(get_content)` for each document ID from `[Attached Documents]`
2. AI cross-references data across documents (amounts, vendor names, dates, items)
3. AI resolves conflicts or ambiguities by:
   - Noting which file each piece of data came from in the summary
   - Asking the user when data conflicts (e.g., two different amounts)
4. AI lists ALL file names in the proposal summary under "**Referenced files**:"
5. AI passes ALL document UUIDs in the `propose` tool call's `document_ids` array
6. When the user saves from the form, all documents are linked via the junction table

The system prompt's existing `<multi_file>` section already instructs the AI to treat batch uploads as related and cross-reference them.

---

## Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| User says "create ringi" without uploading files | AI asks user to upload documents, or proposes with minimal data (just title) so user fills in rest via form |
| Document has no extractable text (image-only PDF) | AI reports it couldn't extract text; still calls propose with whatever it found, user fills in gaps in form |
| AI can't determine a required field | AI leaves it empty in proposal — user fills it in the form (drafts don't require full validation) |
| Very large document (truncated at 20k chars) | AI works with truncated content, notes in summary that data may be incomplete |
| User uploads non-document files (images) | AI uses Vision API extracted text (handled by ingestion pipeline) |
| Document contains multiple possible ringi | AI asks user which one before calling propose |
| User clicks button but doesn't save | No draft is created — button remains clickable in chat history |
| User clicks button multiple times | Each click opens a fresh form pre-filled with proposal data — no duplicate drafts unless user saves multiple times |
| Network error during propose tool call | AI falls back to presenting summary text without the button; user can create manually from the listing page |

---

## Files to Modify During Implementation

| # | File | Change |
|---|------|--------|
| 1 | `src/app/api/openai/respond/tools/approval-requests.ts` | Add `"propose"` action — validates shape, returns data, no DB insert |
| 2 | `src/app/api/openai/respond/utils/stream.ts` | `extractToolMetadata()` — detect `type: "proposal"` → set `ringi_proposal` |
| 3 | `src/types/file.ts` | Add `ringi_proposal` to `ExtractedToolMetadata` |
| 4 | `src/app/api/openai/respond/types/index.ts` | Add `ringi_proposal` to `ToolMetadataEvent` |
| 5 | `src/hooks/chat/useAssistantStream.ts` | Capture `ringi_proposal` from `tool_metadata` SSE event |
| 6 | `src/types/conversation.ts` | Add explicit `ringi_proposal` field to `ConversationMessageMetadata` |
| 7 | `src/components/ChatMessage.tsx` | Render `RingiProposalButton` when `metadata.ringi_proposal` exists |
| 8 | `src/components/chat/RingiProposalButton.tsx` | **NEW** — Button component that opens `SubmissionDialog` with prefill data |
| 9 | `src/components/approval-request/SubmissionDialog.tsx` | Add `prefillData` prop for pre-filling without triggering edit mode |
| 10 | `src/app/api/openai/respond/prompts/v2.ts` | Update rules — AI calls `propose` action; server handles response text |
| 11 | `src/app/api/openai/respond/route.ts` | Conditional: send template when `ringi_proposal` exists, else normal AI stream |
| 12 | `src/app/api/openai/respond/services/stream-manager.ts` | Add `sendText()` method for template responses via existing controller |

### Files NOT Modified

| File | Why No Change Needed |
|------|---------------------|
| `src/service/approvalRequest/approvalRequest.ts` | `createApprovalRequest` already handles `status: "draft"` + `document_ids` — user saves from form, not AI |
| `src/app/api/openai/respond/tools/documents.ts` | Already has `get_content` for reading document text |
| `src/app/api/openai/respond/tools/rag.ts` | No changes — ringi not embedded |
| `src/service/rag/triggerEmbeddings.ts` | No changes — no new embedding tables |

---

## Implementation Order

1. **Types** — Add `ringi_proposal` to `ExtractedToolMetadata`, `ToolMetadataEvent`, `ConversationMessageMetadata`
2. **Backend tool** — Add `"propose"` action to `approval-requests.ts`
3. **Metadata pipeline** — Update `extractToolMetadata()` + `useAssistantStream` to capture proposal
4. **Frontend button** — Create `RingiProposalButton.tsx` component
5. **SubmissionDialog** — Add `prefillData` prop with pre-fill logic
6. **ChatMessage** — Add conditional render for proposal button
7. **System prompt** — Update rules to instruct AI to use `propose` action
8. **Template optimization** — `stream-manager.ts` `sendText()` + `route.ts` conditional skip of final AI call
9. **Manual QA** — Test full flow:
   - **Fresh upload**: Upload a document + "create a ringi" → verify get_content is called → button appears → form pre-filled → save draft
   - **Content already in context**: Ask "what's in this file?" first → then "create a ringi from it" → verify AI skips get_content (check server logs) → button appears → form pre-filled
   - **No files**: Say "create a blank ringi" → button appears → form is empty → user fills in manually
   - **Multi-doc**: Upload multiple documents → verify cross-referencing → all doc names listed → save
   - **Upload without asking for ringi**: Upload a file without mentioning ringi → verify NO propose is called, no button appears
   - Click button without saving → close → click again → verify form still pre-fills
   - Verify button persists in chat history after page reload
   - Verify "Save as Draft" creates with status "draft"
   - Verify "Submit" creates with status "pending" (full validation)

---

## Relationship to Other Specs

- **`draft-status.md`**: This feature depends on the draft status infrastructure (dual validation schemas, draft tab, card styling, Save as Draft / Submit buttons) implemented in that spec
- **`spec.eng.md` Section 6**: "Context-aware input assistance: Summarize chat messages and pre-populate form defaults" — this feature fulfills that requirement
- **System prompt rule 7**: "When user uploads attachments: Do NOT automatically create approval requests or auto-fill forms. Only create/propose approval requests when the user EXPLICITLY asks." — the propose pattern respects this existing rule
