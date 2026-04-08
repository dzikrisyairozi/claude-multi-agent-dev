# AI Chat & File Management — Improvement Proposal (Business)

> What we're improving, why it matters, and what the demo gains.
>
> Date: 2026-02-17
>
> Audience: PM, CEO, Stakeholders
>
> Technical details: See `improvement_technical_proposal.en.md`

---

## Current Situation

The system lets users upload files through a chat interface, automatically understands the content, makes files searchable, and allows users to create approval requests (ringi) through conversation. The core flow works, but several gaps reduce reliability and demo readiness.

---

## Key Problems We're Solving

| Problem | User Impact |
|---------|------------|
| Image files (photos of receipts, invoices) are ignored | Users upload a photo and the AI says "I can't read this" |
| Uploading the same file twice creates duplicate search results | Search returns the same document 2-3 times, looks broken |
| If file processing fails midway, previously stored data is lost | Files silently disappear from search after a re-upload attempt |
| AI sometimes uses wrong identifiers when looking up files | AI responds "no document found" even though the file was just uploaded |
| AI instructions are split across two places, partially contradicting | AI occasionally gives inconsistent responses |
| No guidance for the AI when multiple files are uploaded together | AI treats batch uploads as unrelated individual files |
| Large documents overwhelm the AI's reading capacity | AI responses become slow or incomplete for long documents |
| When AI tools run one after another instead of simultaneously | Unnecessary 1-2 second delays per additional action |

---

## Proposed Improvements

### Priority 1 — Demo-Critical (Must Have)

These directly prevent demo failures and embarrassing moments.

#### 1. Image Understanding

**Problem**: When a user uploads a photo (receipt, invoice, business card), the system cannot read it. No text is extracted, no search is possible.

**Solution**: Use AI vision to "read" images — extract all visible text, numbers, dates, and amounts from photos.

**Business value**: Users can upload photos from their phone and the system handles them just like PDFs or Word documents. Essential for the Japanese business context where paper receipts are photographed.

---

#### 2. Duplicate File Prevention

**Problem**: Uploading the same file twice creates duplicate entries. Search returns the same document multiple times.

**Solution**: Fingerprint each file's content. If an identical file already exists, skip the duplicate and notify the user.

**Business value**: Clean search results. No confusion during demo when the same document appears twice.

---

#### 3. Safe File Processing

**Problem**: If something goes wrong during file processing (network issue, temporary error), previously stored data can be lost.

**Solution**: Only replace old data after new data is fully prepared. If anything fails, the original data stays intact.

**Business value**: Zero data loss. Files that were working before a re-upload attempt continue to work.

---

#### 4. Faster AI Responses

**Problem**: When the AI needs to do multiple things (search files AND read a document), it does them one at a time.

**Solution**: Run independent actions simultaneously.

**Business value**: Noticeably faster responses — especially for complex requests like "create a ringi from this invoice" where the AI needs to read the document and check existing data.

---

#### 5. Smarter Error Recovery

**Problem**: The AI sometimes looks up files using the wrong identifier (file name instead of system ID), gets no results, and tells the user "file not found."

**Solution**: Detect this mistake before it reaches the database. Tell the AI to search by name first, then use the correct identifier.

**Business value**: Eliminates the frustrating "file not found" responses when the file clearly exists. AI self-corrects automatically.

---

#### 6. Improved AI Instructions

**Problem**: The AI's behavior instructions are split between two places and partially overlap. There's no explicit guidance on which tool to use for which situation, or how to format responses.

**Solution**: Consolidate into one clear set of instructions organized by situation: how to handle file searches, how to create ringi, how to respond to different types of questions. Include response style guidance (concise, structured).

**Business value**: More consistent, predictable AI behavior. Fewer "the AI did something weird" moments during demo.

---

#### 7. Multi-File Awareness

**Problem**: When a user uploads 3 files at once and says "create a ringi for these," the AI may not understand they're related.

**Solution**: Add explicit guidance: treat batch uploads as related, cross-reference information across files, summarize findings before taking action.

**Business value**: Natural multi-file workflows work as expected. Users don't need to upload files one at a time.

---

#### 8. PDF Understanding (including Scanned Documents)

**Problem**: The system uses a basic text extraction library for PDFs, which fails completely on scanned documents (photographed paper, stamped receipts, signed contracts). These are extremely common in Japanese business workflows.

**Solution**: Use AI vision to read PDFs directly — the AI sees both the text and the visual layout of every page. Scanned documents, tables, stamps, diagrams, and signatures are all understood automatically. Text extraction and document analysis happen in a single step.

**Business value**: Handle the full range of Japanese business documents: scanned paper documents, stamped receipts, signed contracts, formatted invoices with tables. Previously impossible without complex image conversion libraries. Now works out of the box with better accuracy than text-only extraction.

---

### Priority 2 — Quality Improvements (Should Have)

These make the system more reliable and the user experience smoother.

#### 8. AI Document Understanding

**Problem**: The system stores raw text from files but has no structured understanding of what the document *is* — its type (invoice, contract, receipt), key information (amounts, dates, companies), or purpose.

**Solution**: When a file is uploaded, the AI automatically analyzes it and stores structured metadata: document type, summary, key entities (people, companies, amounts, dates), and tags.

**Business value**:
- File cards in the UI can show document type and summary
- Search becomes more precise ("show me all invoices" actually works)
- Ringi auto-fill becomes smarter (amounts and company names extracted automatically)
- Foundation for future analytics ("how many invoices processed this month?")

---

#### 9. Richer File Information in Chat

**Problem**: When files are attached to a message, the AI only sees the file name and ID. It doesn't know the file type, size, or category without making an extra lookup.

**Solution**: Include file type, size, and category (and later, the AI summary from improvement #8) directly in the chat context.

**Business value**: Faster AI responses — the AI can make decisions without extra lookups. Better first-response accuracy.

---

#### 10. Large Document Handling

**Problem**: When the AI reads a very long document (10+ pages), the entire text is processed at once, which can slow down responses and increase costs.

**Solution**: Show the AI the first portion of the document with a note that it can search for specific sections if needed.

**Business value**: Consistent response speed regardless of document length. Lower operational costs.

---

#### 11. Faster Multi-File Upload

**Problem**: When uploading multiple files at once, each file is processed one after another.

**Solution**: Process all files simultaneously.

**Business value**: 3 files upload in the time it used to take for 1. Smoother batch upload experience.

---

#### 12-14. Error Handling Improvements

**Problem**: Various failure scenarios (AI service unavailable, slow database, tool errors) result in silent failures — the user sees nothing or gets a generic error.

**Solution**: Three targeted fixes:
- Validate AI service responses before proceeding (show "please try again" if the service is unavailable)
- Set a 30-second maximum wait time for any operation (prevent infinite loading)
- Give the AI specific error information so it can explain what went wrong and suggest alternatives

**Business value**: No more infinite loading spinners. No more silent failures. When something goes wrong, the user knows what happened and what to do.

---

### Priority 3 — Future Enhancements (Post-Demo)

These are planned but not needed for the demo.

| # | Improvement | Value |
|---|-----------|-------|
| 16 | Excel file support | Read and search spreadsheet data |
| 17 | Interrupted response recovery | Show user-friendly message if connection drops mid-response |
| 18 | Long conversation optimization | Keep AI performant in 50+ message conversations |
| 19 | Multi-step document reasoning | Enable "compare document A with document B" type questions |

---

## Summary

| Priority | Items | What It Achieves |
|----------|-------|-----------------|
| **1 — Demo-Critical** | 8 improvements | Image uploads work, PDF understanding (including scanned), no duplicates, no data loss, faster responses, reliable AI behavior |
| **2 — Quality** | 7 improvements | Structured document understanding, better error handling, optimized performance |
| **3 — Future** | 4 improvements | Excel, long conversations, interrupted response recovery, cross-document analysis |

**Execution approach**: Priority 1 first (focused sprint), then Priority 2 (quality pass), Priority 3 only as needed after demo.

**What the demo gains after Priority 1**:
- Users can upload photos, PDFs (including scanned documents), and Word documents — all handled correctly
- No duplicate files, no lost data, no "file not found" errors
- AI responds faster and more consistently
- Multi-file workflows (upload 3 invoices → create 1 ringi) work naturally
