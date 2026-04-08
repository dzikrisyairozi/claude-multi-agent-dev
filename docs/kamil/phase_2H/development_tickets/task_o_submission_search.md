# TASK O — チャットでの稟議検索機能復活 / Restore Submission Search in Chat

**Priority**: Medium
**Assignee**: Syahiid
**Effort**: M (Medium) — Tool definition + permission integration + testing
**Status**: Re-integration — embeddings exist, tool needs to be added to chat

---

## Current State

### What Exists:
- **Submission embeddings**: `src/service/rag/submissionEmbeddings.ts` — bilingual embeddings for approval requests (implemented 2026-03-21)
- **Chat infra**: OpenAI Responses API with tool-calling
- **Permission enforcement**: `getApprovalRequests()` has role-based filtering

### What's Missing:
- Submission search tool NOT defined in chat system prompt
- No tool handler for searching submissions via chat

## Scope

1. Add submission search tool to chat API
2. Permission-aware: results filtered by user's role
3. Concise system prompt addition (< 200 tokens)
4. Return actionable links to submission detail pages

## Implementation Steps

### Step 1: Define Submission Search Tool
Add to `src/app/api/openai/respond/route.ts`:
```typescript
{
  type: "function",
  name: "search_submissions",
  description: "Search approval requests/submissions by title, vendor, category, status, or amount",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      status: { type: "string", enum: ["pending", "approved", "rejected", "need_revision", "draft", "cancelled"] },
      category: { type: "string" }
    },
    required: ["query"]
  }
}
```

### Step 2: Tool Handler
```typescript
// When search_submissions is called:
// 1. Use submissionEmbeddings for semantic search
// 2. Apply user's permission filter (RLS via supabaseServer)
// 3. Return: title, status, amount, vendor, date, link
```

### Step 3: Permission Integration
- Use `supabaseServer()` for RLS-enforced queries
- Requester/Approver: see own + assigned only
- Admin/Accounting: see all
- Platform Admin: see nothing

### Step 4: Response Format
Tool returns structured data that AI can present:
```json
[
  {
    "id": "uuid",
    "title": "PurchaseRequest_OfficeEquipment_Q4",
    "status": "pending",
    "amount": 275000,
    "vendor": "ABC Corp",
    "link": "/approval-requests/uuid"
  }
]
```

### Step 5: System Prompt
Minimal addition:
```
You can search approval submissions. Use search_submissions to find requests by title, vendor, status, or category.
```

## Acceptance Criteria

- [ ] User can search submissions via natural language in chat
- [ ] Results respect permission matrix (role-based filtering)
- [ ] Search works for: title, vendor, category, status, amount
- [ ] System prompt addition < 200 tokens
- [ ] Response includes clickable links to detail pages
- [ ] Japanese and English queries both work
- [ ] Non-existent results handled gracefully

## Test Scenarios

| # | Scenario | Expected Result |
|---|----------|----------------|
| 1 | "Show me pending approvals" | Lists pending submissions |
| 2 | "Find the IT equipment purchase" | Returns matching submission |
| 3 | "承認待ちの稟議を見せて" | Lists pending (Japanese) |
| 4 | Requester asks "all submissions" | Only sees own + assigned |
| 5 | Admin asks "all submissions" | Sees all submissions |
| 6 | "Submissions over ¥1,000,000" | Filters by amount |

## Edge Cases & Gotchas

- **Permission enforcement**: The search tool MUST use `supabaseServer()` (RLS) not `supabaseAdmin`. Never bypass permission checks.
- **Embedding freshness**: Submissions created after embedding may not appear. Ensure `triggerEmbeddings()` runs on create/update.
- **Link format**: Return relative paths `/approval-requests/{id}` — the chat UI should render them as clickable.

## Code References

| File | Purpose |
|------|---------|
| `src/app/api/openai/respond/route.ts` | Chat endpoint to modify |
| `src/service/rag/submissionEmbeddings.ts` | Submission search |
| `src/service/approvalRequest/approvalRequest.ts` | Permission-filtered queries |

## Permission Matrix Reference

- SUB-004: View all submissions — Accounting, Admin only
- SUB-005: View assigned submissions — Approver, Requester, Accounting
- SUB-006: Track submission status — Approver, Requester (limited)

## Dependencies

- **Requires**: Task E (submissions must exist and be searchable)
- Related to Task N (shares search infrastructure)
