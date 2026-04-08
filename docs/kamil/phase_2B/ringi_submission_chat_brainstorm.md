# Ringi Submission Chat Brainstorm -- Phase 3

> **Goal**: Enable users to chat with the AI about submissions (ringi), not just file content.
> **Date**: 2026-03-06
> **Status**: Brainstorm / Ideation
> **Scope**: Primary focus on Requester (Employee). Approver role scoped to Superadmin only.

---

## 1. The Problem (Why This Matters)

Today the AI chat is a powerful tool for **files** -- users can upload documents, search content, and get answers about what's inside their files. But when it comes to **submissions (ringi)**, the AI is almost blind:

- It can only list the current user's own submissions with exact filters (status, category)
- It cannot search submission content semantically ("find the one about the Osaka office renovation")
- Superadmins cannot ask the AI about submissions waiting for their approval
- Nobody can ask cross-referencing questions ("which submissions this month exceeded 500,000 yen?")
- The AI cannot summarize, compare, or analyze submissions

**The vision**: The AI should be as smart about submissions as it is about files. Requesters can get instant answers about their own submissions. Superadmins can review and act on pending submissions -- all through natural language conversation.

---

## 2. User Personas and What They'd Ask

### Persona A: Employee (Requester/Submitter) -- Primary

The person who creates and submits ringi for approval. **This is the primary persona for this feature.**

**Questions they'd naturally ask:**

| Category | Example Questions |
|----------|-------------------|
| **Status Check** | "What's the status of my server purchase request?" |
| | "Did my submission for the marketing campaign get approved?" |
| | "Which of my submissions are still pending?" |
| **History / Lookup** | "Show me the ringi I submitted last month" |
| | "Find my submission about the Osaka conference" |
| | "How many submissions have I made this quarter?" |
| **Content Recall** | "What amount did I request for the AWS renewal?" |
| | "What vendor did I use in my office supplies request?" |
| | "What items were in my equipment purchase ringi?" |
| **Action Guidance** | "I got a need_revision on my ringi -- what did the approver say?" |
| | "My submission was sent back, what do I need to fix?" |
| | "Can you help me resubmit the revised version?" |
| **Drafts** | "Do I have any drafts I haven't submitted yet?" |
| | "Show me my draft for the Q2 budget request" |
| **Preparation / Guidance** | "What category should I use for a software subscription purchase?" |
| | "What fields are required to submit a ringi?" |
| | "Help me prepare a submission for a new laptop" |
| **Comparison** | "How does my current request compare to the one I submitted in January?" |
| | "Did I submit a similar request before?" |
| **Personal Summary** | "What happened to my submissions this month?" |
| | "How many of my requests were approved vs rejected this year?" |

### Persona B: Superadmin (Approver) -- Secondary

The person who reviews, approves, or rejects all submissions. In the current scoped system, only Superadmins act as approvers.

**Questions they'd naturally ask:**

| Category | Example Questions |
|----------|-------------------|
| **Pending Approvals** | "Are there any submissions waiting for my approval?" |
| | "How many pending ringi do I have?" |
| | "Show me all pending submissions from the Engineering department" |
| **Filtering / Prioritization** | "Which pending submission has the highest amount?" |
| | "Are there any urgent submissions I should look at first?" |
| | "Show me submissions over 1,000,000 yen that need my approval" |
| **Content Understanding** | "Summarize Tanaka-san's equipment purchase request" |
| | "What is the submission from Sales about?" |
| | "What documents are attached to the Osaka office ringi?" |
| **Cross-Reference** | "Has this vendor been used in previous submissions?" |
| | "Is there a similar request that was already approved?" |
| **Overview / Reporting** | "How many submissions are pending across all departments?" |
| | "Give me a summary of this week's submission activity" |
| | "Show me all rejected submissions from the last quarter" |
| | "What's the total approved amount this month by department?" |

---

## 3. User Flow Scenarios (Detailed)

### Scenario 1: Employee Checks Submission Status (Primary)

```
User: "What's happening with my server purchase request?"

AI thinking:
  - Searches user's own submissions semantically for "server purchase"
  - Finds match: "Server Room Upgrade -- Dell PowerEdge Rack Servers"

AI: "Your submission 'Server Room Upgrade -- Dell PowerEdge Rack Servers' is currently
     pending approval. It was submitted on March 3rd for 2,450,000 yen."
```

**Key UX point**: The AI finds the submission even though the user said "server purchase" and the title is "Server Room Upgrade -- Dell PowerEdge Rack Servers". Semantic matching matters.

---

### Scenario 2: Employee Asks About Rejected Submission (Primary)

```
User: "My marketing submission was rejected -- what happened?"

AI thinking:
  - Searches user's own submissions semantically for "marketing"
  - Finds match with status "rejected"
  - Reads approval_notes

AI: "Your submission 'Q1 Social Media Campaign' was rejected on February 28th.

     Approval notes: 'The proposed budget exceeds the quarterly allocation
     for digital marketing. Please revise the scope to fit within 800,000 yen
     or provide additional justification for the overage.'

     Would you like me to help you create a revised submission?"
```

---

### Scenario 3: Employee Handles Need-Revision Workflow (Primary)

```
User: "I was told to revise my submission. What do I need to change?"

AI thinking:
  - Finds user's submission with status "need_revision"
  - Reads the approval_notes from the reviewer

AI: "Your submission 'Annual Team Building Event' was sent back for revision on March 4th.

     Feedback: 'Please break down the catering costs separately from the
     venue rental. Also, the number of attendees (45) doesn't match the
     headcount in the attached roster (38). Please reconcile.'

     Changes needed:
     1. Separate catering line item from venue rental
     2. Verify attendee count (currently 45, roster shows 38)

     Would you like me to help you edit and resubmit this?"

User: "Yes, the attendee count should be 38. Can you update it?"

AI: "Here's what I'll update:
     - Attendee count: 45 -> 38
     - I'll also need the separate catering breakdown from you

     [Create Revised Draft] button appears"
```

---

### Scenario 4: Employee Cross-References Uploaded File with Existing Submission (Primary)

```
User: [uploads a new quotation PDF]
User: "I received an updated quote -- does this match any of my existing submissions?"

AI thinking:
  - Reads the uploaded document content
  - Extracts vendor name, amounts, items
  - Searches user's submissions for matching vendor/items

AI: "This quote from Yamato Office Supplies (dated March 5) appears to match
     your draft submission 'Q2 Office Supplies Restock'.

     Comparison:
     | | Current Submission | New Quote |
     |-|-------------------|-----------|
     | Total | 380,000 yen | 355,000 yen |
     | Printer Paper (50 boxes) | 3,000/ea | 2,800/ea |
     | Toner Cartridges (20) | 8,000/ea | 7,500/ea |

     The new quote is 25,000 yen cheaper. Would you like me to update your
     draft with the new amounts?"
```

---

### Scenario 5: Employee Gets Personal Summary (Primary)

```
User: "What happened to my submissions this month?"

AI thinking:
  - Queries user's own submissions from March 2026

AI: "Here's your March 2026 submission summary:

     Total: 4 submissions
     - Approved: 2 (Server Room Upgrade, Office Supplies Q1)
     - Pending: 1 (Annual Software Licenses Renewal)
     - Need Revision: 1 (Team Building Event)

     Total approved amount: 3,450,000 yen

     Your Team Building Event submission was sent back on March 4th --
     would you like to see the feedback?"
```

---

### Scenario 6: Employee Asks for Guidance Before Submitting (Primary)

```
User: "I want to submit a ringi for a new MacBook. Where do I start?"

AI: "For a laptop purchase, here's what you'll need:

     Category: Purchasing (物品購入)
     Required fields:
     - Title (e.g., 'MacBook Pro 14-inch for Development Team')
     - Vendor name (Apple Japan, authorized reseller, etc.)
     - Amount (unit price x quantity)
     - Items: list each model/spec as a line item
     - Purpose: why this is needed
     - Desired approval date

     Tip: Attach the vendor's quote PDF to support the request.

     Want me to start drafting a submission for you?"

User: "Yes, it's a MacBook Pro M4, 240,000 yen from Apple Japan"

AI thinking:
  - Calls manage_approval_requests(propose) with extracted data

AI: "Here's a draft based on what you told me:
     [Create Draft] button with pre-filled: title, vendor, amount, category
```

---

### Scenario 7: Superadmin Reviews Pending Queue (Secondary)

```
User (Superadmin): "Are there any submissions that need my approval?"

AI thinking:
  - Queries all submissions where status = "pending" (superadmin sees all)
  - Returns list sorted by date / priority

AI: "You have 3 submissions pending approval:

     1. Office Renovation Phase 2 -- Engineering -- 3,200,000 yen (submitted Mar 1)
     2. Q2 Marketing Campaign Budget -- Marketing -- 1,800,000 yen (submitted Mar 3)
     3. Annual Software Licenses Renewal -- IT -- 950,000 yen (submitted Mar 5)

     Would you like me to summarize any of these?"

User: "Tell me more about the office renovation one"

AI thinking:
  - Reads the full submission details
  - Reads attached documents

AI: "Office Renovation Phase 2:
     Submitted by: Yamada Takeshi (Engineering)
     Amount: 3,200,000 yen (tax included)
     Vendor: ABC Construction Co., Ltd.
     Purpose: Renovate 3rd floor to add 20 workstations for April new hires.

     Line Items:
     | Item | Qty | Amount |
     |------|-----|--------|
     | Workstation desks | 20 | 1,200,000 |
     | Ergonomic chairs | 20 | 800,000 |
     | Electrical work | 1 | 600,000 |
     | Network cabling | 1 | 400,000 |
     | Painting & finishing | 1 | 200,000 |

     Attached: ABC_Construction_Quote_2026.pdf, Floor_Plan_3F_Revised.pdf
     The attached quote matches the requested amount.

     Would you like to approve, reject, or send back for revision?"
```

---

### Scenario 8: Superadmin Reads Attached Document Content (Secondary)

```
User (Superadmin): "What does the quotation attached to Tanaka's equipment request say?"

AI thinking:
  - Finds Tanaka's submission (superadmin can access all)
  - Identifies attached documents via approval_request_documents junction
  - Reads document content via existing document system

AI: "The quotation from Office Depot Japan attached to Tanaka's equipment request:

     - 15x Standing desks (Model XD-200): 45,000 yen each
     - 15x Monitor arms (dual): 12,000 yen each
     - Delivery and setup fee: 50,000 yen (flat)
     - Total quoted: 905,000 yen (tax excluded)

     Note: The quoted total (905,000 yen) is slightly lower than the requested
     amount (950,000 yen). The difference may account for tax."
```

**Key UX point**: Files + submissions intersect here. The AI connects submission metadata with attached document content -- a uniquely powerful capability.

---

### Scenario 9: Superadmin Semantic Search Across All Submissions (Secondary)

```
User (Superadmin): "Have we ever approved anything from Sakura Technologies?"

AI thinking:
  - Searches all submissions (superadmin scope) semantically for "Sakura Technologies"

AI: "I found 2 approved submissions mentioning Sakura Technologies:

     1. Cloud Infrastructure Setup (approved Jan 2026) -- 4,500,000 yen
        Cloud hosting and migration services.

     2. Security Audit Tools (approved Nov 2025) -- 1,200,000 yen
        Vulnerability scanning software licenses.

     Total spend with this vendor: 5,700,000 yen."
```

---

## 4. User Flow Options -- How Should Users Access This?

### Option A: Unified Chat (Recommended for MVP)

The existing AI chat gains submission awareness. Users ask about submissions in the same chat where they ask about files.

**Pros:**
- No new UI needed
- Natural: users already go to chat for questions
- Files + submissions context can be combined seamlessly
- Leverages existing infrastructure (tools, streaming, system prompt)

**Cons:**
- Chat context window may get crowded
- Role-based access must be carefully handled within the same tool

**User flow:**
```
[AI Chat] --> User asks about submissions --> AI uses enhanced tools --> answers
```

**Recommendation**: **Option A** for MVP. It leverages everything already in place and enables the richest cross-referencing between files and submissions.

---

## 5. What Data Should Be Searchable via AI?

### Structured Data (Database Fields -- SQL Queries)

- Title, description, vendor name, category
- Amount (with range queries: "over 1M yen")
- Status (pending, approved, rejected, need_revision, cancelled, draft)
- Department, priority
- Date ranges (submitted, payment scheduled)
- Submitter name (superadmin only)
- Line items (name, quantity, amount)
- Approval notes / revision feedback

### Unstructured Data (Semantic/Vector Search Candidates)

These benefit from embedding for fuzzy/semantic matching:

- **Submission title + description** -- "office renovation" matches "workplace remodeling"
- **Purpose and reason for purchase** -- free-text, rich with context
- **Remarks** -- additional context
- **Line item names** -- "Dell PowerEdge R750" should match "server equipment"
- **Approval notes** -- reviewer feedback, rejection reasons
- **Vendor name** -- fuzzy: "Sakura Tech" matches "Sakura Technologies Co., Ltd."

### Cross-Referenced Data (Files + Submissions)

The most powerful queries combine both:

- "What does the contract attached to my submission say about payment terms?"
- "Does the quotation match the amounts in the submission?"

---

## 6. Role-Based Access -- What Each Role Can Ask About

| Role | Own Submissions | All Submissions | Approval Actions | Analytics |
|------|----------------|-----------------|------------------|-----------|
| **Employee (Requester)** | Full access (all statuses) | No | No | Own stats only |
| **Superadmin (Approver)** | Full access | Yes (all) | Approve / Reject / Send Back | Full |

---

## 7. Edge Cases and Considerations

### Ambiguous Queries
**Problem**: "Show me the marketing submission" -- user has 3 marketing submissions.
**Solution**: AI lists all matches and asks for clarification, similar to how file search works today.

### Stale Context in Long Conversations
**Problem**: User discusses a submission, then later says "approve it" -- AI must remember which one.
**Solution**: Track `approval_request_id` in conversation context (already partially supported via metadata).

### Real-Time Status
**Problem**: Status may change between when AI fetched it and when user acts on it.
**Solution**: Always re-fetch before performing actions (approve/reject).

### Large Result Sets
**Problem**: "Show me all submissions" could return hundreds (for superadmin).
**Solution**: Default pagination (top 10, sorted by relevance or recency), with option to narrow down.

### Sensitive Information
**Problem**: Some submissions may contain confidential vendor terms.
**Solution**: Respect RLS strictly. AI never exposes data the user can't access via the normal UI.

### Multi-Language
**Problem**: Submissions may be in Japanese or English. Queries could be in either language.
**Solution**: Bilingual embedding -- same approach as current document RAG (EN + JA query averaging).

### Attached Document Deep-Dive
**Problem**: "What does the contract say about penalties?" requires reading the actual file.
**Solution**: AI uses existing `manage_documents(get_content)` linked via `approval_request_documents` junction table.

---

## 8. Feasibility Assessment

### What's Already in Place
- AI tool calling infrastructure (multi-round, 4 tools, extensible)
- RAG pipeline for document embedding + vector search
- `manage_approval_requests` tool with list/read/create/update/propose actions
- Role-based auth in server actions
- Bilingual embedding approach (EN + JA averaging)

### What Needs to Be Built

#### Low Effort (Enhance Existing)

| Change | Description | Feasibility |
|--------|-------------|-------------|
| Expand `list` action for superadmin | Relax `user_id` filter when user is superadmin. Add amount range, date range, department, submitter filters. | High -- SQL query changes + simple RLS check |
| Improve system prompt | Teach AI when to use submission tools, how to present submission data, role-aware rules | High -- prompt engineering only |
| Add `read` with attached doc IDs | When reading a submission, return linked document IDs/names so AI can follow up | High -- small JOIN query addition |

#### Medium Effort (New Capability)

| Change | Description | Feasibility |
|--------|-------------|-------------|
| Submission embedding pipeline | `submission_embeddings` table. Embed text fields on create/update. New `search_submissions` tool. | High -- follows existing document embedding pattern exactly |
| Chat-based approve/reject for superadmin | Superadmin says "approve it", AI calls `updateApprovalRequestStatus` with confirmation flow | Medium -- service exists, need confirmation UX |
| Submission + Document cross-reference | Join submission -> approval_request_documents -> document_embeddings for combined search | Medium -- complex JOINs but all tables exist |

#### Higher Effort (Advanced)

| Change | Description | Feasibility |
|--------|-------------|-------------|
| Aggregation / analytics queries | COUNT, SUM, AVG by department/date/category | Medium -- predefined functions needed |
| Duplicate detection | "Did I submit this before?" via embedding similarity | Medium -- reuse embedding infrastructure |

### Embedding Strategy

Most submissions are short (total text content < 800 chars). **Recommended**: One embedding per submission -- concatenate `title + description + purpose + reason_for_purchase + remarks + item names + vendor_name` into one text block and embed it. Simple and sufficient for MVP.

---

## 9. Proposed MVP Scope

### Must Have (Phase 3 MVP)
- **Employee**: Semantic search on own submissions (find by natural language)
- **Employee**: Status check + content recall on own submissions
- **Employee**: Read approval notes / revision feedback from chat
- **Superadmin**: Query all pending submissions with filters (amount, department, date)
- **Superadmin**: Read full submission details + attached documents via chat

### Nice to Have
- Employee: personal submission summary ("what happened to my submissions this month?")
- Employee: cross-reference uploaded file against existing submissions
- Superadmin: approve/reject from chat with confirmation
- Superadmin: basic aggregation queries (count by status, total amounts)

### Future
- Duplicate submission detection
- Budget tracking and overage alerts
- Submission comparison and trend analysis

---

## 10. Open Questions

1. **Embedding granularity**: One embedding per submission (recommended) or chunk fields separately?

2. **Real-time vs. async embedding**: Generate embeddings synchronously on create/update, or via queue?
   - Submissions are created less frequently than file uploads, so sync is likely fine for MVP

3. **Chat action confirmation for approve/reject**: Text confirmation message, UI button (like the existing RingiProposalButton pattern), or redirect to detail page?

4. **Historical data backfill**: Embed existing submissions on feature launch via a one-time script?

---

*This brainstorm focuses on user perspective and feasibility. Technical implementation details (database schema, API design, embedding pipeline specifics) will be defined in a separate technical spec once the direction is confirmed.*
