# 03 — AI Chat Tests

Test the AI chat functionality: creating ringi from natural language, uploading documents for AI processing, file card interactions, and edge cases.

**Login as:** `staff@gmail.com`
**New Chat URL:** `https://eb-filemg-development.vercel.app/` (home page is new chat)
**Chat Thread URL:** `https://eb-filemg-development.vercel.app/c/[threadId]`

### Chat Interface Details

- **Empty chat state** shows 3 quick action cards:
  1. "Create submission from docs"
  2. "Find approval evidence"
  3. "Review submission status"
- **File upload:** Click paperclip icon in chat input bar
- **Accepted file types:** `.pdf, .doc, .docx, .xlsx, .pptx, .csv, .txt, .md, .jpg, .jpeg, .png, .heic, .zip`
- **Max file size:** 20MB per file
- **Search results** display via `SearchResultsCard` with file cards (Open / Share buttons)

---

### KT-AIC-001 — Create ringi via AI (English) `[Main]` `[P1]`

**Spec Ref:** Spec 5 (Business Flow), Spec 6.1, Spec 6.4

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Go to `https://eb-filemg-development.vercel.app/` (new chat)
3. In the chat input box, type the following message:
   ```
   Create a ringi for purchasing 10 office laptops, total cost $15,000
   ```
4. Click Send (or press Enter)
5. Wait for AI response to fully render

**Expected:**
- [ ] AI generates a ringi draft
- [ ] Draft includes a title (e.g., "Office Laptop Purchase")
- [ ] Draft includes description with laptop details
- [ ] Draft includes amount ($15,000)
- [ ] Response is in English
- [ ] Chat thread is created (URL changes to `/c/[threadId]`)

**Result:** Pass / Fail
**Notes:** ___

---

### KT-AIC-002 — Create ringi via AI (Japanese) `[Main]` `[P1]`

**Spec Ref:** Spec 5 (Business Flow), Spec 6.1, Spec 6.4

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Go to `https://eb-filemg-development.vercel.app/` (new chat)
3. Type the following message:
   ```
   ノートPC10台購入の稟議書を作成してください。合計金額150万円
   ```
4. Send the message
5. Wait for AI response

**Expected:**
- [ ] AI generates a ringi draft in Japanese
- [ ] Draft includes appropriate title in Japanese
- [ ] Draft includes amount (¥1,500,000 or 150万円)
- [ ] Response is in Japanese

**Result:** Pass / Fail
**Notes:** ___

---

### KT-AIC-003 — Upload doc + AI summarize `[Basic]` `[P1]`

**File:** `ringi_en_detailed_license_renewal.docx`
**Spec Ref:** Spec 6.1, Spec 6.4 (Chat Integration)

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Go to `https://eb-filemg-development.vercel.app/` (new chat)
3. Click the **paperclip icon** in the chat input bar
4. Select `ringi_en_detailed_license_renewal.docx` from file picker
5. Verify file appears as an attachment preview in the chat input
6. Type:
   ```
   Please summarize this ringi document
   ```
7. Send and wait for the response

**Expected:**
- [ ] File upload indicator shows while uploading
- [ ] AI reads/processes the uploaded document
- [ ] Summary mentions Adobe Creative Cloud / software license renewal
- [ ] Summary mentions the amount ($12,500)
- [ ] Summary mentions Sales department or Hanako Suzuki
- [ ] Summary is accurate to the document's actual content

**Result:** Pass / Fail
**Notes:** ___

---

### KT-AIC-004 — Ask about doc in Japanese `[Basic]` `[P2]`

**File:** `ringi_jp_standard_salesforce.docx`
**Spec Ref:** Spec 6.1, Spec 6.4 (Chat Integration)

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Go to `https://eb-filemg-development.vercel.app/` (new chat)
3. Click the **paperclip icon** and select `ringi_jp_standard_salesforce.docx`
4. Type:
   ```
   この稟議書の内容を教えてください
   ```
5. Send and review the response

**Expected:**
- [ ] AI responds in Japanese
- [ ] Summary mentions Salesforce / 営業支援ツール
- [ ] Summary mentions the amount (¥4,100,000)
- [ ] Summary mentions 営業部 or 鈴木花子

**Result:** Pass / Fail
**Notes:** ___

---

### KT-AIC-005 — Upload image for ringi `[Edge Case]` `[P2]`

**File:** `edge_beach_image.jpg`
**Spec Ref:** Spec 6.1, Spec 6.4 (Chat Integration)

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Go to `https://eb-filemg-development.vercel.app/` (new chat)
3. Click the **paperclip icon** and select `edge_beach_image.jpg` (a beach photo, not a document)
4. Type:
   ```
   Create a ringi from this document
   ```
5. Send and review the response

**Expected:**
- [ ] AI does NOT crash or hang
- [ ] AI indicates the file is not a valid ringi document, OR
- [ ] AI explains it cannot extract ringi information from an image
- [ ] Response is helpful and graceful

**Result:** Pass / Fail
**Notes:** ___

---

### KT-AIC-006 — Gibberish / unrelated question `[Edge Case]` `[P3]`

**Spec Ref:** Spec 6.4 (Chat Integration)

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Go to `https://eb-filemg-development.vercel.app/` (new chat)
3. Type:
   ```
   asdfghjkl what is the weather today?
   ```
4. Send and review the response

**Expected:**
- [ ] AI responds without crashing
- [ ] AI either redirects to ringi-related help, OR
- [ ] AI provides a polite response about its purpose/scope

**Result:** Pass / Fail
**Notes:** ___

---

### KT-AIC-007 — Non-ringi doc for submission `[Edge Case]` `[P2]`

**File:** `edge_large_file.pdf`
**Spec Ref:** Spec 6.1, Spec 6.4 (Chat Integration)

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Go to `https://eb-filemg-development.vercel.app/` (new chat)
3. Click the **paperclip icon** and select `edge_large_file.pdf` (a generic multi-page PDF, not ringi content)
4. Type:
   ```
   Create a ringi submission from this
   ```
5. Send and review the response

**Expected:**
- [ ] AI attempts to process the document
- [ ] AI either extracts whatever info it can, OR
- [ ] AI indicates the document doesn't contain standard ringi data
- [ ] Response is graceful with no errors

**Result:** Pass / Fail
**Notes:** ___

---

### KT-AIC-008 — Multi-turn conversation `[Basic]` `[P2]`

**Spec Ref:** Spec 5 (Business Flow), Spec 6.4

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Go to `https://eb-filemg-development.vercel.app/` (new chat)
3. **Message 1:** Type:
   ```
   I need to create a ringi for purchasing new office furniture
   ```
4. Wait for AI response
5. **Message 2:** Type:
   ```
   The budget is $8,000 for 10 standing desks from IKEA
   ```
6. Wait for AI response
7. **Message 3:** Type:
   ```
   Please finalize the ringi with department as "Operations" and requestor "John Smith"
   ```
8. Review the final output

**Expected:**
- [ ] AI maintains context across all 3 messages
- [ ] Final ringi includes: furniture purchase, $8,000, 10 standing desks, IKEA, Operations, John Smith
- [ ] AI builds the ringi progressively, not starting fresh each turn
- [ ] Chat thread URL stays the same throughout (`/c/[threadId]`)

**Result:** Pass / Fail
**Notes:** ___

---

### KT-AIC-009 — Upload ringi doc in chat, AI creates submission `[Main]` `[P1]`

**File:** `ringi_en_form_laptop_purchase.docx`
**Spec Ref:** Spec 5 (Business Flow), Spec 6.1, Spec 6.4

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Go to `https://eb-filemg-development.vercel.app/` (new chat)
3. Click the **paperclip icon** in the chat input bar
4. Select `ringi_en_form_laptop_purchase.docx` from file picker
5. Verify file appears as attachment preview in chat input
6. Type:
   ```
   Create a submission from this document
   ```
7. Send the message
8. Wait for AI response to fully render
9. Review the AI's response for extracted data

**Expected:**
- [ ] AI processes the uploaded document
- [ ] AI extracts key data from the document (title, amount, vendor, department)
- [ ] AI offers to create a pre-populated submission with the extracted data
- [ ] Extracted data matches the document content (laptop purchase, Engineering dept, ~$6,000)
- [ ] If a "Create Submission" button/link appears, clicking it opens a pre-filled submission form

**Result:** Pass / Fail
**Notes:** ___

---

### KT-AIC-010 — Upload multiple files in chat `[Basic]` `[P2]`

**Files:** `ringi_en_detailed_license_renewal.docx`, `ringi_en_purchase_monitors.docx`
**Spec Ref:** Spec 6.1, Spec 6.4

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Go to `https://eb-filemg-development.vercel.app/` (new chat)
3. Click the **paperclip icon** and select both files:
   - `ringi_en_detailed_license_renewal.docx`
   - `ringi_en_purchase_monitors.docx`
4. Verify both files appear as attachment previews in the chat input
5. Type:
   ```
   Please summarize both documents
   ```
6. Send and review the response

**Expected:**
- [ ] Both files upload successfully
- [ ] AI acknowledges both files
- [ ] AI provides a summary of each document separately
- [ ] First summary mentions Adobe license / $12,500
- [ ] Second summary mentions Dell monitors / $3,750

**Result:** Pass / Fail
**Notes:** ___

---

### KT-AIC-011 — File card actions in chat (Open/Share/Delete) `[Basic]` `[P2]`

**File:** `ringi_en_form_laptop_purchase.docx`
**Spec Ref:** Spec 6.4, Spec 9 (UI/UX)

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Go to `https://eb-filemg-development.vercel.app/` (new chat)
3. Click the **paperclip icon** and select `ringi_en_form_laptop_purchase.docx`
4. Type: `What is this file about?`
5. Send and wait for AI response
6. Look at the file card displayed in the chat message
7. Check for action buttons on the file card (Open, Share, Delete)
8. Click **Open** button on the file card
9. Click **Share** button on the file card

**Expected:**
- [ ] File card is displayed in the chat with file name and type
- [ ] Open button is visible on file card — clicking it opens the file
- [ ] Share button is visible on file card — clicking it copies share link
- [ ] File card UI is clear and consistent

**Result:** Pass / Fail
**Notes:** ___

---

### KT-AIC-012 — Search for uploaded files via AI `[Basic]` `[P2]`

**Spec Ref:** Spec 6.5, Spec 6.4

> **Precondition:** Login as staff@gmail.com, at least 1 file previously uploaded via chat

**Steps:**
1. Login with `staff@gmail.com`
2. Go to `https://eb-filemg-development.vercel.app/` (new chat)
3. Type:
   ```
   Find my uploaded documents
   ```
4. Send and review the AI response
5. Check if `SearchResultsCard` is displayed with file cards

**Expected:**
- [ ] AI uses search/retrieval to find previously uploaded files
- [ ] Results displayed via `SearchResultsCard` component
- [ ] File cards show file name, type, and action buttons (Open / Share)
- [ ] Clicking Open on a file card opens the file

**Result:** Pass / Fail
**Notes:** ___

---

### KT-AIC-013 — Use quick action card "Create submission from docs" `[Basic]` `[P2]`

**Spec Ref:** Spec 5 (Business Flow), Spec 6.4, Spec 9 (UI/UX)

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Go to `https://eb-filemg-development.vercel.app/` (new chat — empty state)
3. Observe the 3 quick action cards displayed:
   - "Create submission from docs"
   - "Find approval evidence"
   - "Review submission status"
4. Click the **"Create submission from docs"** action card
5. Follow the AI prompt (it should ask you to upload a document)
6. Upload `ringi_en_form_laptop_purchase.docx` when prompted
7. Review the AI workflow

**Expected:**
- [ ] All 3 action cards are visible in the empty chat state
- [ ] Clicking "Create submission from docs" triggers an AI message/workflow
- [ ] AI prompts user to upload a document
- [ ] After uploading, AI processes the document for submission creation
- [ ] Workflow is intuitive and guides the user step by step

**Result:** Pass / Fail
**Notes:** ___
