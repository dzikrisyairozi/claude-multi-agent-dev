# 04 — AI Retrieval Tests

Test the AI's ability to retrieve and report on existing submissions and documents.

**Login as:** `staff@gmail.com`
**New Chat URL:** `https://eb-filemg-development.vercel.app/` (home page)
**Chat Thread URL:** `https://eb-filemg-development.vercel.app/c/[threadId]`

### Search Results Display

- Search results display via `SearchResultsCard` component in chat
- File cards show file name, type, and action buttons (Open / Share)
- Clicking Open opens the file; clicking Share copies share link

> **Important:** These tests require existing submissions in the system. Run Submission tests (01) first to create test data.

---

### KT-AIR-001 — Ask submission status (English) `[Main]` `[P1]`

**Spec Ref:** Spec 6.5 (Search & Reference)

> **Precondition:** Staff has at least one existing submission with a known title (e.g., "Annual Software License Renewal" from KT-SUB-001)

**Steps:**
1. Login with `staff@gmail.com`
2. Note the exact title of one of your existing submissions (e.g., "Annual Software License Renewal")
3. Go to `https://eb-filemg-development.vercel.app/` (new chat)
4. Type:
   ```
   What is the status of "Annual Software License Renewal"?
   ```
   (use the actual title of your submission)
5. Send and review the AI response

**Expected:**
- [ ] AI retrieves the correct submission
- [ ] AI reports the current status (Pending/Approved/Rejected/etc.)
- [ ] Information matches what's shown on the dashboard
- [ ] Search results may display via `SearchResultsCard` with file card

**Result:** Pass / Fail
**Notes:** ___

---

### KT-AIR-002 — Find document by name `[Main]` `[P1]`

**Spec Ref:** Spec 6.5 (Search & Reference)

> **Precondition:** Documents/submissions exist in the system

**Steps:**
1. Login with `staff@gmail.com`
2. Go to `https://eb-filemg-development.vercel.app/` (new chat)
3. Type:
   ```
   Find the document called "Dell 4K Monitor Purchase for Development Team"
   ```
   (use the title of a submission you created in KT-SUB-003)
4. Send and review the AI response

**Expected:**
- [ ] AI locates the document/submission
- [ ] AI provides relevant information (status, date, amount, etc.)
- [ ] `SearchResultsCard` displayed with file card(s) showing Open/Share buttons
- [ ] Response is accurate to the actual submission data

**Result:** Pass / Fail
**Notes:** ___

---

### KT-AIR-003 — Review submission status `[Basic]` `[P2]`

**Spec Ref:** Spec 6.5 (Search & Reference)

> **Precondition:** Staff has multiple submissions

**Steps:**
1. Login with `staff@gmail.com`
2. Go to `https://eb-filemg-development.vercel.app/` (new chat)
3. Type:
   ```
   Review and check my submission status
   ```
4. Send and review the AI response

**Expected:**
- [ ] AI lists the staff's submissions
- [ ] Each submission shows its current status
- [ ] List matches what's visible on the dashboard at `/`

**Result:** Pass / Fail
**Notes:** ___

---

### KT-AIR-004 — Search in Japanese `[Basic]` `[P2]`

**Spec Ref:** Spec 6.5 (Search & Reference)

> **Precondition:** Japanese submissions exist (e.g., from KT-SUB-002)

**Steps:**
1. Login with `staff@gmail.com`
2. Go to `https://eb-filemg-development.vercel.app/` (new chat)
3. Type:
   ```
   稟議書の状態を確認してください
   ```
4. Send and review the AI response

**Expected:**
- [ ] AI responds in Japanese
- [ ] AI lists submissions with their statuses
- [ ] Japanese submission titles are displayed correctly

**Result:** Pass / Fail
**Notes:** ___

---

### KT-AIR-005 — Non-existent document `[Edge Case]` `[P2]`

**Spec Ref:** Spec 6.5 (Search & Reference)

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Go to `https://eb-filemg-development.vercel.app/` (new chat)
3. Type:
   ```
   What is the status of ringi XYZ-NONEXISTENT-999?
   ```
4. Send and review the AI response

**Expected:**
- [ ] AI does NOT return fabricated/hallucinated data
- [ ] AI indicates no matching submission was found
- [ ] Response is helpful (e.g., suggests checking the title or listing existing submissions)

**Result:** Pass / Fail
**Notes:** ___

---

### KT-AIR-006 — Another user's submission `[Edge Case]` `[P2]`

**Spec Ref:** Spec 6.5, Spec 6.7 (Permissions)

> **Precondition:** Multiple users have submissions (manager and staff have both submitted)

**Steps:**
1. Login with `staff@gmail.com`
2. Go to `https://eb-filemg-development.vercel.app/` (new chat)
3. Ask about a submission created by the manager:
   ```
   What is the status of "Manager Self-Approval Test"?
   ```
   (use a title you know was created by manager@gmail.com)
4. Send and review the AI response

**Expected:**
- [ ] AI respects data boundaries
- [ ] AI either denies access, OR shows limited info, OR indicates it's another user's submission
- [ ] Staff should NOT see full details of other users' submissions

**Result:** Pass / Fail
**Notes:** Document the actual behavior — can staff see other users' data? ___
