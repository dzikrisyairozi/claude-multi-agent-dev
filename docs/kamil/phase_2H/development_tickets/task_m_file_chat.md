# TASK M — チャットでのファイル管理機能復活 / Restore File Management in Chat

**Priority**: Medium
**Assignee**: Syahiid
**Effort**: M (Medium) — Tool definition + prompt optimization + testing
**Status**: Re-integration — chat infra exists, file tools need to be added back

---

## Current State

### Chat System:
- Thread-based conversations at `/c/[threadId]`
- OpenAI Responses API (gpt-5.4-nano) with streaming
- Tool-calling capability: currently has `semantic-search` tool
- `src/app/api/openai/respond/route.ts` — main chat endpoint
- File upload in chat works (drag & drop → S3 → Gemini embedding)

### File Management:
- API routes exist: `/api/files/[id]` (CRUD), `/api/folders` (CRUD), `/api/move-items`
- Services: `src/service/document/document.ts`, folder services
- Hybrid search: BM25 + vector via `src/service/rag/`

### What's Missing:
- File management tools are NOT in the chat system prompt
- User cannot ask AI about their files through chat

## Scope

1. Add file management tool definitions to chat API
2. **Prompt must be very concise** — minimal tokens for tool definitions
3. Tools: file search, file listing, file metadata
4. Test with real queries

## Implementation Steps

### Step 1: Define File Tools
Add to `src/app/api/openai/respond/route.ts`:
```typescript
const tools = [
  // ...existing semantic-search tool...
  {
    type: "function",
    name: "search_files",
    description: "Search user's files by name, type, date, or content",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        file_type: { type: "string", description: "Filter by MIME type" },
      },
      required: ["query"]
    }
  },
  {
    type: "function",
    name: "list_files",
    description: "List files in a folder or all files",
    parameters: {
      type: "object",
      properties: {
        folder_id: { type: "string", description: "Folder ID (omit for root)" },
        limit: { type: "number", description: "Max results" }
      }
    }
  }
];
```

### Step 2: Tool Handlers
Implement tool call handlers that query the file system:
- `search_files` → call existing hybrid search via RAG service
- `list_files` → call folder contents query

### Step 3: System Prompt Update
Keep additions minimal (< 100 tokens):
```
You can search and browse the user's files. Use search_files for queries and list_files to browse.
```

### Step 4: Test
- "Find my invoices from last month"
- "What files do I have?"
- "Search for the Q4 report"

## Acceptance Criteria

- [ ] User can ask AI about their files and get accurate results
- [ ] AI can search files by name, type, date
- [ ] AI can list files in a folder
- [ ] System prompt is concise (< 100 additional tokens)
- [ ] Response latency acceptable (< 3s for tool-call + response)
- [ ] Tool responses include file names, types, dates
- [ ] Works in both Japanese and English queries

## Test Scenarios

| # | Scenario | Expected Result |
|---|----------|----------------|
| 1 | "Find my invoices" | Returns matching files |
| 2 | "What files do I have?" | Lists recent files |
| 3 | "Search for contract documents" | Returns relevant docs |
| 4 | "請求書を探して" (Japanese) | Returns matching files |
| 5 | No matching files | Polite "no results found" response |

## Code References

| File | Purpose |
|------|---------|
| `src/app/api/openai/respond/route.ts` | Chat endpoint to modify |
| `src/service/rag/embedding.ts` | Existing search functions |
| `src/service/document/document.ts` | Document queries |
| `src/service/folder/folder.ts` | Folder queries |

## Dependencies

- Independent — can work in parallel
- Related to Task N (file search performance)
