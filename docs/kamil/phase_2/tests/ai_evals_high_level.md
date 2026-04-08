# AI Chat & RAG System — AI Evals Test List (High-Level)

> Programmatic evaluation categories for measuring AI system quality, reliability, and correctness.
>
> Source context: Phase 2 improvement docs, existing manual test plans, codebase architecture analysis.

---

## A. Tool Selection Accuracy

Evaluate whether the AI selects the correct tool for the user's intent.

| # | Eval | Input (User Intent) | Expected Tool Call |
|---|------|--------------------|--------------------|
| A1 | File name lookup | "Find the document called invoice.pdf" | `manage_documents(search)` |
| A2 | Content question | "What does my invoice say about payment terms?" | `search_user_documents` (RAG) |
| A3 | File listing | "What files do I have?" | `manage_documents(list)` |
| A4 | Ringi creation from text | "Create a ringi for 10 laptops at $1,500 each" | `manage_approval_requests(create)` |
| A5 | Ringi creation from doc | [Attached doc] + "Create a submission from this" | `manage_documents(get_content)` THEN `manage_approval_requests(create)` |
| A6 | Ringi status check | "What's the status of my laptop purchase request?" | `manage_approval_requests(list)` with filters |
| A7 | Folder creation | "Create a folder called Invoices" | `manage_folders(create)` |
| A8 | No tool needed | "What can you help me with?" | No tool call (direct response) |
| A9 | Ambiguous — should search first | "Tell me about the Salesforce document" | `manage_documents(search)` or `search_user_documents` — NOT ask user |
| A10 | Multi-tool scenario | "Read my invoice and create a ringi from it" | `manage_documents(get_content)` + `manage_approval_requests(create)` (2 tools) |

**Metric**: Tool selection accuracy (%) — correct tool chosen / total test cases.

---

## B. RAG Retrieval Quality

Evaluate the relevance and accuracy of semantic search results.

| # | Eval | Description |
|---|------|-------------|
| B1 | Exact content match | Query about specific amount ("What costs $12,500?") → returns the license renewal doc |
| B2 | Semantic match | Query using synonyms ("software subscription renewal") → finds "Adobe Creative Cloud license" doc |
| B3 | Japanese query → Japanese doc | "Salesforceの金額は？" → returns `ringi_jp_standard_salesforce.docx` chunks |
| B4 | English query → English doc | "How much are the monitors?" → returns `ringi_en_purchase_monitors.docx` chunks |
| B5 | Cross-language retrieval | English query for Japanese content (or vice versa) — measure if it works |
| B6 | Top-K relevance | For a known query, are the top-3 results actually relevant? (Precision@3) |
| B7 | No relevant docs | Query about something not in any document → returns low similarity scores or empty |
| B8 | Multi-chunk coherence | Long document split into chunks — query should return the most relevant chunk, not random ones |
| B9 | Duplicate doc handling | Same document uploaded twice — search should not return duplicate results |
| B10 | Similarity threshold | Results below threshold (0.5) are filtered out — verify no junk results |

**Metrics**:
- Precision@K (how many of top K results are relevant)
- Recall (does the correct document appear in results at all?)
- Mean Reciprocal Rank (how high is the correct result ranked?)
- Similarity score distribution (are relevant docs scoring > 0.7?)

---

## C. Document Content Extraction & Understanding

Evaluate whether the AI correctly reads and interprets document content.

| # | Eval | Description |
|---|------|-------------|
| C1 | PDF text extraction | Upload PDF → verify `text_content` is non-empty and accurate |
| C2 | DOCX text extraction | Upload DOCX → verify `text_content` captures all paragraphs/tables |
| C3 | Image text extraction (post-improvement) | Upload image of receipt → Vision API extracts text, numbers, amounts |
| C4 | Excel extraction (post-improvement) | Upload XLSX → SheetJS extracts cell data as searchable text |
| C5 | Empty PDF handling | Upload blank PDF → system returns descriptive message, no crash |
| C6 | Large document handling | Upload 10+ page PDF → text extracted completely, chunks cover full content |
| C7 | Japanese document extraction | Upload JP DOCX → text_content preserves Japanese characters correctly |
| C8 | Special characters in filename | Upload `名前.docx` → file processes without error |
| C9 | Unsupported file type | Upload `.exe` or unsupported type → descriptive error message returned |
| C10 | AI summary accuracy | Ask AI to summarize uploaded doc → summary matches actual content (human-judged or LLM-as-judge) |

**Metrics**:
- Extraction completeness (% of text captured vs ground truth)
- Character accuracy (especially for Japanese/special chars)
- Error rate on edge case files

---

## D. Ringi (Approval Request) Creation Accuracy

Evaluate whether the AI creates correct, complete approval requests.

| # | Eval | Description |
|---|------|-------------|
| D1 | Basic creation | "Create ringi for 10 laptops, $15,000" → title, amount, items correct |
| D2 | Amount clarification | "$15,000 for 10 items" → AI asks: total or per-item? (not assume) |
| D3 | "Don't divide" exception | "Don't divide — $15,000 total for 10 laptops" → single item, amount $15,000 |
| D4 | Item defaults | "Create ringi for office chairs" (no qty) → quantity defaults to 1 |
| D5 | From document extraction | Upload invoice doc → AI extracts title, vendor, amount, items from content |
| D6 | Japanese ringi | "ノートPC10台購入の稟議書、150万円" → correct JP title, ¥1,500,000 |
| D7 | Multi-item ringi | "5 monitors at $750 each and 5 keyboards at $100 each" → 2 line items, correct amounts |
| D8 | Document attachment | Create ringi with attached doc → `document_ids` includes the uploaded doc UUID |
| D9 | Missing required fields | AI should ask for missing required info (title, amount) rather than creating incomplete ringi |
| D10 | Update existing ringi | "Change the amount to $20,000" (in context of active ringi) → updates correct record |

**Metrics**:
- Field accuracy (% of fields correctly populated)
- Completeness (all required fields present)
- Amount accuracy (exact match)
- Clarification rate (does AI ask when it should?)

---

## E. Multi-Language Support

Evaluate Japanese/English handling across the system.

| # | Eval | Description |
|---|------|-------------|
| E1 | English input → English response | User writes in English → AI responds in English |
| E2 | Japanese input → Japanese response | User writes in Japanese → AI responds in Japanese |
| E3 | Mixed language input | User mixes EN/JP → AI responds in the dominant language |
| E4 | Language persistence | Multi-turn: if user starts in JP, AI stays in JP for subsequent turns |
| E5 | JP document + EN query | Upload JP doc, ask in English → AI can answer in English using JP content |
| E6 | EN document + JP query | Upload EN doc, ask in Japanese → AI can answer in JP using EN content |
| E7 | Japanese amounts | ¥4,100,000 or 410万円 — both parsed and used correctly |
| E8 | Japanese entity extraction | Names (鈴木花子), departments (営業部) extracted accurately from JP docs |

**Metric**: Language match rate (%), entity extraction accuracy per language.

---

## F. Conversation Context & Multi-Turn

Evaluate whether the AI maintains context across conversation turns.

| # | Eval | Description |
|---|------|-------------|
| F1 | Progressive ringi building | Turn 1: "furniture purchase" → Turn 2: "$8,000 for desks" → Turn 3: "finalize" → final ringi has all details |
| F2 | Document reference across turns | Turn 1: upload doc → Turn 2: "create ringi from that doc" → AI remembers the doc |
| F3 | Pronoun resolution | "What's in it?" after uploading a doc → AI knows "it" = the uploaded doc |
| F4 | Correction handling | Turn 1: "10 laptops" → Turn 2: "actually, make it 15" → AI updates correctly |
| F5 | Context after tool use | After AI searches and returns results → user asks follow-up about a specific result → AI uses prior context |
| F6 | Active ringi tracking | After creating a ringi → user says "update the title" → AI updates the correct ringi (uses active ID from metadata) |
| F7 | Long conversation (10+ turns) | After 10+ exchanges, does AI still remember earlier details? |
| F8 | File context preservation | File uploaded 5 messages ago → AI still knows the file ID when asked about it |

**Metrics**:
- Context retention accuracy (% of prior details correctly recalled)
- Anaphora resolution accuracy (pronouns, "that doc", "the ringi")

---

## G. Hallucination Prevention & Grounding

Evaluate whether the AI fabricates information or stays grounded in actual data.

| # | Eval | Description |
|---|------|-------------|
| G1 | Non-existent document | "What's the status of ringi XYZ-999?" → AI says not found (not fabricate details) |
| G2 | Non-existent amount | Ask about an amount not in any doc → AI doesn't invent a number |
| G3 | Grounded in doc content | After reading a doc, AI only cites info actually in the doc |
| G4 | No download links | AI never includes file URLs/download links in text (UI handles this) |
| G5 | No file detail listing | AI says "I found X documents" — doesn't list names/sizes/dates in text |
| G6 | Empty search results | RAG returns nothing → AI admits it found nothing (not make up content) |
| G7 | Partial information | Doc has some fields but not others → AI reports what exists, flags what's missing |
| G8 | Fabricated entity check | Ask about a person/company not in any doc → AI doesn't invent details |

**Metric**: Hallucination rate (% of responses containing fabricated information, measured by LLM-as-judge or human review).

---

## H. Error Handling & Robustness

Evaluate system behavior under failure conditions and edge cases.

| # | Eval | Description |
|---|------|-------------|
| H1 | Gibberish input | "asdfghjkl" → AI responds gracefully, redirects to purpose |
| H2 | Off-topic question | "What's the weather?" → AI politely scopes to file management/ringi |
| H3 | UUID vs filename confusion | AI passes filename instead of UUID → system detects and returns actionable error |
| H4 | Invalid tool arguments | Malformed arguments → tool returns error, AI recovers gracefully |
| H5 | Empty document content | Document with no extractable text → AI explains limitation |
| H6 | Very long user message | 5000+ character input → AI handles without truncation/crash |
| H7 | Concurrent tool calls | Multiple tools requested → system executes all, returns combined results |
| H8 | Non-ringi doc for submission | Upload beach photo + "create ringi" → AI explains it can't extract ringi data |
| H9 | Ingestion failure recovery | If embedding generation fails → old embeddings preserved (safe ingestion order) |
| H10 | Stream interruption | SSE stream breaks mid-response → frontend shows recovery message |

**Metric**: Graceful failure rate (% of error cases handled without crash/silent failure).

---

## I. Data Isolation & Security

Evaluate whether the AI respects user boundaries.

| # | Eval | Description |
|---|------|-------------|
| I1 | User A can't see User B's docs | Staff user asks about manager's documents → AI doesn't return them |
| I2 | User A can't see User B's ringi | Staff asks about another user's submission → access denied or limited info |
| I3 | RLS enforcement in RAG | Vector search scoped to `user_id` → only user's own embeddings returned |
| I4 | Tool calls scoped to user | `manage_documents(list)` only returns current user's documents |
| I5 | No cross-tenant data leak | AI response never contains data from another user's documents |

**Metric**: Data isolation violation rate (should be 0%).

---

## J. Multi-File Handling

Evaluate AI behavior with batch uploads and cross-document scenarios.

| # | Eval | Description |
|---|------|-------------|
| J1 | Batch upload acknowledgment | Upload 3 files at once → AI acknowledges all 3 files |
| J2 | Batch summarization | Upload 3 files + "summarize these" → AI summarizes each separately |
| J3 | Cross-file ringi creation | Upload invoice + quote + receipt → "create ringi" → AI cross-references amounts |
| J4 | Sequential file conversation | Upload file A in turn 1, file B in turn 3 → "create ringi from both" → AI connects both |
| J5 | Conflicting amounts across files | Two files with different amounts for same item → AI flags the discrepancy |
| J6 | Mixed language batch | Upload 1 EN doc + 1 JP doc → AI handles both correctly |

**Metric**: Multi-file comprehension accuracy (% of cross-file references correctly resolved).

---

## K. Response Quality & Format Compliance

Evaluate the quality, formatting, and style of AI responses.

| # | Eval | Description |
|---|------|-------------|
| K1 | Conciseness | Simple question → response is 2-4 sentences, not verbose |
| K2 | Markdown usage | Structured data → AI uses markdown tables appropriately |
| K3 | Ringi confirmation format | Before creating ringi → AI summarizes key fields and asks "Should I create this?" |
| K4 | No file details in text | After search → AI says "I found X documents" (cards render separately) |
| K5 | Helpful error messages | When something goes wrong → AI explains what happened and suggests alternatives |
| K6 | Action before asking | When user references a doc → AI reads it first, then responds (not ask "which doc?") |
| K7 | Tone consistency | Professional, helpful tone across all responses |
| K8 | Language-appropriate formatting | JP response uses appropriate honorifics/business Japanese |

**Metric**: LLM-as-judge score (1-5) on conciseness, helpfulness, format compliance.

---

## L. Performance & Latency (Non-Functional)

| # | Eval | Description |
|---|------|-------------|
| L1 | Time to first token | User sends message → first SSE chunk arrives < 2s |
| L2 | Total response time (no tools) | Simple question → full response < 3s |
| L3 | Total response time (with tools) | Tool-calling flow → full response < 8s |
| L4 | RAG query latency | Embedding generation + vector search < 1s |
| L5 | Ingestion time per file | File upload → embeddings stored < 10s for typical doc |
| L6 | Token efficiency | Responses use reasonable token counts (not bloated) |

**Metric**: P50/P95 latency per operation category.

---

## Summary

| Category | # Evals | What It Measures |
|----------|---------|------------------|
| A. Tool Selection | 10 | Does AI pick the right tool? |
| B. RAG Retrieval | 10 | Does search return relevant documents? |
| C. Content Extraction | 10 | Can the system read all file types correctly? |
| D. Ringi Creation | 10 | Are approval requests accurate and complete? |
| E. Multi-Language | 8 | Japanese/English handling |
| F. Context & Multi-Turn | 8 | Does AI maintain conversation context? |
| G. Hallucination Prevention | 8 | Does AI stay grounded in real data? |
| H. Error Handling | 10 | Graceful degradation under failures |
| I. Data Isolation | 5 | User boundary enforcement |
| J. Multi-File | 6 | Batch upload and cross-document reasoning |
| K. Response Quality | 8 | Format, tone, conciseness |
| L. Performance | 6 | Latency and efficiency |
| **Total** | **99** | |

## Suggested Eval Implementation Approach

1. **Automated (programmatic)**: Categories A, B, D, I, L — these have deterministic expected outputs that can be checked programmatically
2. **LLM-as-Judge**: Categories C10, F, G, K — use a separate LLM to score response quality
3. **Human Review**: Categories E (nuanced language), J (complex cross-doc reasoning) — human spot-check a sample
4. **Hybrid**: H — automated for crash/error detection, human for "graceful" quality judgment

## Priority for Demo

**Must-have evals (run before every demo)**:
- A1-A5 (tool selection for core flows)
- B1, B3, B4 (basic retrieval works)
- D1, D5 (ringi creation from text and doc)
- G1, G4, G5 (no hallucinations, no file details in text)
- I1-I3 (data isolation)

**Should-have evals (run weekly)**:
- Full categories B, D, F, K

**Nice-to-have evals (run on-demand)**:
- Full categories C, E, H, J, L
