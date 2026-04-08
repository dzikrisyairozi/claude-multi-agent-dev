# Frontend Integration Technical Plan — Phase 2 Improvements

> Actionable implementation spec for Items 6 (FE part), 7, 9, 17, 18, plus FE integration touchpoints for backend Items 8 and 21.
>
> Date: 2026-02-20
>
> Based on: `improvement_technical_proposal.en.md` + `dual_path_search_pipeline.en.md`
>
> Grounded in: Actual codebase file paths, component structures, and hook patterns.

---

## Execution Order

```
Tier 1 (Demo-Critical):  6-FE → 7 (no FE work)
Tier 2 (Quality):        9 → 8-FE → 21-FE
Tier 3 (Future):         17 → 18
```

**Dependency chain**: Item 6-FE (language passthrough) is required before backend Item 6 works end-to-end. Item 9 (richer context) is independent. Items 8-FE and 21-FE only matter after their backend counterparts land.

---

## Item 6-FE: Consolidate Language Prompt to Backend

**Files**:
- `src/providers/LanguageProvider.tsx`
- `src/components/chat/hooks/useThreadWorkspace.ts`
- `src/hooks/chat/useAssistantStream.ts`
- `src/service/openai/chat.ts` (API call to `/api/openai/respond`)

### Current State

**`LanguageProvider.tsx`** (line 108-111): Defines `chat.systemPrompt` translation key that produces a full system-level instruction:

```typescript
"chat.systemPrompt": {
  en: "You are an AI File Management Assistant. Respond in {languageLabel} ({languageCode}) unless the user explicitly requests another language.",
  ja: "あなたはAIファイル管理アシスタントです。ユーザーが別言語を指定しない限り、{languageLabel}（{languageCode}）で返答してください。",
}
```

**`useThreadWorkspace.ts`** (lines 56-66): Builds a `systemPrompt` as an `OpenAIChatMessage` using the translation, then prepends it to messages:

```typescript
const systemPrompt = useMemo<OpenAIChatMessage>(
  () => ({
    role: "system",
    content: t("chat.systemPrompt", {
      languageLabel: language === "ja" ? t("language.japanese") : t("language.english"),
      languageCode: language === "ja" ? "ja-JP" : "en-US",
    }),
  }),
  [language, t],
);
```

This system prompt is prepended in `formatMessagesForAI` (line 173):
```typescript
return [systemPrompt, ...enriched];
```

The backend at `src/app/api/openai/respond/route.ts` (lines 104-108) ALSO prepends its own `SYSTEM_PROMPT`. Result: **two system messages** — one from FE (language-only) and one from BE (rules+tools).

### Change Spec

**Goal**: Remove the FE system prompt. Pass `language` as a field in the API request body. Backend builds the unified prompt with language interpolation (see backend plan Item 6).

**1. Simplify `useThreadWorkspace.ts` — Remove FE system prompt**

Remove lines 56-66 (the `systemPrompt` useMemo).

Update `formatMessagesForAI` (lines 147-176):

```typescript
const formatMessagesForAI = useCallback(
  (conversation: ConversationMessage[], adHocContext?: string) => {
    const history = conversation.map((message): OpenAIChatMessage => {
      let content = message.content;

      if (message.files && message.files.length > 0) {
        const fileContext = message.files
          .map((f) => `- ${f.name} (ID: ${f.id})`)
          .join("\n");
        content = `${content}\n\n[Attached Documents]:\n${fileContext}`;
      }

      return { role: message.role, content };
    });

    const enriched = adHocContext
      ? [...history, { role: "user", content: adHocContext } as OpenAIChatMessage]
      : history;

    // No more systemPrompt prepend — backend handles it
    return enriched;
  },
  [], // No more systemPrompt dependency
);
```

**2. Pass `language` to the API call**

In `useAssistantStream.ts` (lines 23-26), add `language` to `StreamOptions`:

```typescript
type StreamOptions = {
  formatMessages: (
    conversation: ConversationMessage[],
    adHocContext?: string,
  ) => OpenAIChatMessage[];
  accessToken?: string;
  language?: "en" | "ja"; // NEW
};
```

In the `streamAssistantReply` callback (line 32), pass language through to the API:

```typescript
const responseStream = await streamAssistantResponse(
  {
    threadId,
    messages: openAiMessages,
    language, // NEW — passed to request body
  },
  { accessToken },
);
```

**3. Update `useThreadWorkspace.ts` — Pass language to stream hook**

```typescript
const { streamAssistantReply } = useAssistantStream({
  formatMessages: formatMessagesForAI,
  accessToken: session?.access_token,
  language, // from useLanguage()
});
```

**4. Update API client `src/service/openai/chat.ts`**

The `streamAssistantResponse` function needs to include `language` in the request body sent to `/api/openai/respond`:

```typescript
// In the fetch body:
body: JSON.stringify({
  threadId: params.threadId,
  messages: params.messages,
  language: params.language, // NEW
}),
```

**5. Update `OpenAIChatRequest` type in `src/types/openai.ts`**

```typescript
export type OpenAIChatRequest = {
  threadId?: string;
  messages: OpenAIChatMessage[];
  temperature?: number;
  language?: "en" | "ja"; // NEW
};
```

**6. Simplify LanguageProvider translation**

The `chat.systemPrompt` key can be removed or simplified since it's no longer used for LLM prompting. It could be kept as documentation, or removed to reduce dead code.

### UI/UX Considerations

- No visible UI change — this is a plumbing refactor.
- Language toggle continues to work via `LanguageProvider` state.
- Backend now has full control over prompt content and structure.

---

## Item 7: Multi-File Handling Prompt Rule

**Frontend impact**: None. This is purely a backend prompt change (see backend plan). The FE already batches files and includes `[Attached Documents]` context. No FE changes needed.

---

## Item 9: Richer File Context in [Attached Documents]

**File**: `src/components/chat/hooks/useThreadWorkspace.ts`

### Current State

`formatMessagesForAI` (lines 147-176) builds the `[Attached Documents]` block with minimal info:

```typescript
const fileContext = message.files
  .map((f) => `- ${f.name} (ID: ${f.id})`)
  .join("\n");
content = `${content}\n\n[Attached Documents]:\n${fileContext}`;
```

The `IFileMetadata` type (from `src/types/file.ts`) already has `mimeType`, `size`, `category` fields — they're just not used in the context string.

### Change Spec

Expand the file context string to include all available metadata:

```typescript
const formatFileSize = (bytes: number | undefined): string => {
  if (!bytes) return "unknown size";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

// In formatMessagesForAI:
if (message.files && message.files.length > 0) {
  const fileContext = message.files
    .map((f) => {
      const parts = [`- ${f.name} (ID: ${f.id})`];
      if (f.mimeType) parts.push(`type: ${f.mimeType}`);
      if (f.size) parts.push(`size: ${formatFileSize(f.size)}`);
      if (f.category) parts.push(`category: ${f.category}`);
      return parts.join(", ");
    })
    .join("\n");
  content = `${content}\n\n[Attached Documents]:\n${fileContext}`;
}
```

**Example output**:
```
[Attached Documents]:
- Invoice_2026.pdf (ID: abc-123), type: application/pdf, size: 1.2MB, category: invoice
- Receipt_Tokyo.jpg (ID: def-456), type: image/jpeg, size: 340KB
```

**Future enhancement** (after Item 8 lands): Add `ai_judgment.summary` to the context:

```typescript
// When ai_judgment is available on the file metadata:
if (f.aiJudgmentSummary) parts.push(`summary: ${f.aiJudgmentSummary}`);
```

This requires the `IFileMetadata` type to be extended with an optional `aiJudgmentSummary` field, which happens when Item 8-FE integration is done.

### UI/UX Considerations

- No visible change to the user — this enriches the AI's context, not the UI.
- Richer context means fewer tool calls by the LLM (it can decide to use `get_content` vs `search_user_documents` based on file type/size).

---

## Item 8-FE: Frontend Integration for `ai_judgment`

**Files**:
- `src/types/file.ts` (or `src/types/document.ts`)
- `src/components/ChatMessage.tsx`
- `src/components/chat/hooks/useThreadWorkspace.ts`

### Current State

`DocumentMetadata` (in `src/types/document.ts`, lines 15-24) has no ai_judgment fields. `ChatMessage.tsx` renders file cards but doesn't show document type or summary. `IFileMetadata` (in `src/types/file.ts`) has basic fields only.

### Change Spec (After Backend Item 8 Lands)

**1. Extend types**

In `src/types/document.ts`:

```typescript
export type DocumentMetadata = {
  id: string;
  name: string;
  mimeType: string | null;
  size: number | null;
  fileUrl: string;
  modifiedTime: string;
  category: string | null;
  folderId: string | null;
  aiJudgment?: {
    documentType?: string;
    summary?: string;
  } | null;
};
```

In `src/types/file.ts`, extend `IFileMetadata` similarly if needed:

```typescript
export type IFileMetadata = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  fileUrl: string;
  modifiedTime: string;
  category?: string | null;
  aiJudgmentSummary?: string | null;  // Flattened for easy access
  documentType?: string | null;       // Flattened for easy access
};
```

**2. Show document type badge on file cards**

In `ChatMessage.tsx` and related card components (`SearchResultsCard.tsx`, `UploadedFilesContainer.tsx`), add a small badge showing document type when available:

```tsx
{file.documentType && (
  <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
    {file.documentType}
  </span>
)}
```

**3. Enrich [Attached Documents] with ai_judgment summary** (builds on Item 9):

```typescript
if (f.aiJudgmentSummary) parts.push(`summary: ${f.aiJudgmentSummary}`);
```

### UI/UX Considerations

- Document type badges provide instant visual categorization without opening the file.
- Summaries in the AI context reduce unnecessary tool calls.
- Graceful degradation: files without ai_judgment look exactly the same as today.

---

## Item 21-FE: Frontend Integration for Dual-Path Search

**Files**:
- `src/components/ChatMessage.tsx`
- Card components that render search results

### Current State

Search results from `search_user_documents` render as `SearchResultsCard` components in `ChatMessage.tsx` (line 116-118). The card shows file name, type, size. No document type or summary from ai_judgment.

### Change Spec (After Backend Item 21 Lands)

The Dual-Path search response now includes `aiJudgment` data (document type + summary) in each result. The existing `SearchResultsCard` component should display this.

**1. Update `SearchResultsCard` to show ai_judgment data**

When a search result includes `documentType` and `summary`, render them:

```tsx
// Inside each search result card:
{result.documentType && (
  <span className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
    {result.documentType}
  </span>
)}
{result.summary && (
  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
    {result.summary}
  </p>
)}
```

**2. Handle metadata-only results**

When Path B (metadata-only search) returns results, there's no `similarity` score. The card should handle missing similarity gracefully:

```tsx
{result.similarity !== null && result.similarity < 1.0 && (
  <span className="text-xs text-muted-foreground">
    {(result.similarity * 100).toFixed(0)}% match
  </span>
)}
```

### UI/UX Considerations

- Users see document type labels ("invoice", "contract") inline with search results.
- Metadata-only search results (Path B) look the same as semantic results but without a similarity percentage.
- No new UI patterns — extends existing card components.

---

## Item 17: Streaming Error Recovery in Frontend

**File**: `src/hooks/chat/useAssistantStream.ts`

### Current State

The stream parsing loop (lines 51-131) processes SSE events. The `sawDoneToken` flag is checked at line 52. If the stream is interrupted (network error, server crash), the `while` loop exits via `done: true` from `reader.read()` at line 53, **without** `sawDoneToken` being set. The final content (line 133) falls through to whatever was accumulated:

```typescript
const finalContent =
  accumulated.trim() ||
  "I'm sorry, I wasn't able to produce a response. Please try again.";
```

If there's partial content, the user sees a truncated response with no indication it was interrupted.

### Change Spec

After the `finally` block (line 131), check if we got a proper `[DONE]` signal:

```typescript
} finally {
  reader.releaseLock();
}

// Detect interrupted stream
if (!sawDoneToken && accumulated.trim()) {
  accumulated += "\n\n_(Response was interrupted. The above may be incomplete. Please try again if needed.)_";
}

const finalContent =
  accumulated.trim() ||
  "I'm sorry, I wasn't able to produce a response. Please try again.";
```

### UI/UX Considerations

- The interruption notice is appended as italic markdown — visually distinct from the AI's response.
- Only shown when there IS partial content. If no content was received, the existing fallback message applies.
- Localization: Could be translated via `useLanguage`, but since the hook doesn't have access to the language context directly, the message is in English. This is acceptable since it's a rare error state. Alternative: pass a `t` function or use a constant.

---

## Item 18: Conversation Window Management

**File**: `src/components/chat/hooks/useThreadWorkspace.ts`

### Current State

`formatMessagesForAI` (lines 147-176) sends ALL messages to OpenAI every time:

```typescript
const history = conversation.map((message): OpenAIChatMessage => {
  // ... maps every message
});
return [systemPrompt, ...enriched];
```

For long conversations (50+ messages), this sends all messages to OpenAI, inflating token usage.

### Change Spec

Add a windowing function that keeps system prompt + last N messages + summarizes older ones:

```typescript
const MAX_MESSAGES_WINDOW = 20;

const formatMessagesForAI = useCallback(
  (conversation: ConversationMessage[], adHocContext?: string) => {
    let messagesToSend = conversation;

    // Apply window if conversation is long
    if (conversation.length > MAX_MESSAGES_WINDOW) {
      const recentMessages = conversation.slice(-MAX_MESSAGES_WINDOW);

      // Create a summary of older messages
      const olderMessages = conversation.slice(0, -MAX_MESSAGES_WINDOW);
      const olderFileIds = olderMessages
        .flatMap((m) => m.files?.map((f) => `${f.name} (ID: ${f.id})`) ?? []);

      const summaryContent = [
        `[Conversation Summary - ${olderMessages.length} earlier messages]`,
        olderFileIds.length > 0
          ? `Documents referenced: ${olderFileIds.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      messagesToSend = [
        {
          id: "summary",
          role: "assistant" as const,
          content: summaryContent,
          timestamp: olderMessages[olderMessages.length - 1]?.timestamp ?? "",
        },
        ...recentMessages,
      ];
    }

    const history = messagesToSend.map((message): OpenAIChatMessage => {
      let content = message.content;

      if (message.files && message.files.length > 0) {
        const fileContext = message.files
          .map((f) => {
            const parts = [`- ${f.name} (ID: ${f.id})`];
            if (f.mimeType) parts.push(`type: ${f.mimeType}`);
            if (f.size) parts.push(`size: ${formatFileSize(f.size)}`);
            if (f.category) parts.push(`category: ${f.category}`);
            return parts.join(", ");
          })
          .join("\n");
        content = `${content}\n\n[Attached Documents]:\n${fileContext}`;
      }

      return { role: message.role, content };
    });

    const enriched = adHocContext
      ? [...history, { role: "user", content: adHocContext } as OpenAIChatMessage]
      : history;

    return enriched;
  },
  [],
);
```

### UI/UX Considerations

- No visible change to the user — windowing is transparent.
- The summary preserves file IDs so the AI can still reference older documents.
- **Tier 3 priority**: Demo conversations are short (< 20 messages). Only needed for production use.
- **Future improvement**: Use the LLM to generate a proper conversation summary instead of a simple file list. This adds cost/latency but produces better context.

---

## Summary: Files Changed Per Item

| Item | File | Action |
|------|------|--------|
| 6-FE | `src/components/chat/hooks/useThreadWorkspace.ts` | MODIFY (remove FE system prompt) |
| 6-FE | `src/hooks/chat/useAssistantStream.ts` | MODIFY (add language param) |
| 6-FE | `src/providers/LanguageProvider.tsx` | MODIFY (optionally remove `chat.systemPrompt` key) |
| 6-FE | `src/service/openai/chat.ts` | MODIFY (pass language in body) |
| 6-FE | `src/types/openai.ts` | MODIFY (add language field) |
| 9 | `src/components/chat/hooks/useThreadWorkspace.ts` | MODIFY (enrich file context) |
| 8-FE | `src/types/document.ts` | MODIFY (add ai_judgment to types) |
| 8-FE | `src/types/file.ts` | MODIFY (add documentType, summary) |
| 8-FE | `src/components/ChatMessage.tsx` | MODIFY (doc type badge) |
| 21-FE | `src/components/chat/SearchResultsCard.tsx` | MODIFY (show ai_judgment data) |
| 17 | `src/hooks/chat/useAssistantStream.ts` | MODIFY (interruption detection) |
| 18 | `src/components/chat/hooks/useThreadWorkspace.ts` | MODIFY (message windowing) |

---

## Recommended Execution Batches

**Batch 1** (Tier 1, alongside backend Items 6-7):
Item 6-FE — Language consolidation + remove FE system prompt

**Batch 2** (Tier 2, can be done independently):
Item 9 — Richer [Attached Documents] context

**Batch 3** (Tier 2, after backend Items 8 and 21 land):
Items 8-FE → 21-FE — Type badges, search result enrichment

**Batch 4** (Tier 3, only if needed):
Items 17 → 18 — Stream error recovery, conversation windowing
