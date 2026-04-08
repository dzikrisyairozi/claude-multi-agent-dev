# 02 — Approval Tests

Test the manager approval workflow: approving, rejecting, requesting revision, and edge cases around permissions.

**Dashboard URL:** `https://eb-filemg-development.vercel.app/`
**Approval Detail URL:** `https://eb-filemg-development.vercel.app/approval-requests/[id]`

### Approval Detail Page Layout

- **Tabs:** Details | Files | Timeline
- **Approve button** (green) → optional notes field → confirm
- **Reject button** (red) → **required** notes field ("reject reason is required") → confirm

---

### KT-APR-001 — Manager approves ringi `[Main]` `[P1]`

**Spec Ref:** Spec 6.3 (Approval Operations)

> **Precondition:** A pending submission exists (submitted by staff). If not, first login as `staff@gmail.com` and submit one.

**Steps:**
1. Login with `manager@gmail.com`
2. Go to dashboard at `https://eb-filemg-development.vercel.app/`
3. Find a pending ringi card on the dashboard
4. Click the card to open detail view at `/approval-requests/[id]`
5. Review the **Details** tab (title, amount, vendor, items)
6. Click the **Files** tab to verify attached documents
7. Click the green **Approve** button
8. (Optional) Add notes: `Approved - budget is within Q1 allocation`
9. Click **Confirm** to finalize approval

**Expected:**
- [ ] Status changes from "Pending" to "Approved"
- [ ] Approval is recorded with timestamp in the **Timeline** tab
- [ ] Green CheckCircle icon displayed next to "Approved" status
- [ ] Login as `staff@gmail.com` and verify: status shows "Approved" on dashboard card

**Result:** Pass / Fail
**Notes:** ___

---

### KT-APR-002 — Manager rejects with reason `[Main]` `[P1]`

**Spec Ref:** Spec 6.3 (Approval Operations)

> **Precondition:** A pending submission exists

**Steps:**
1. Login with `manager@gmail.com`
2. Go to dashboard, find a pending ringi card
3. Click to open detail view at `/approval-requests/[id]`
4. Click the red **Reject** button
5. Enter rejection reason: `Budget exceeded for Q1. Please reduce the amount or defer to Q2.`
   - Note: Reject reason is **required** — try submitting without text first to verify validation
6. Click **Confirm** to reject

**Expected:**
- [ ] Submitting without a reason shows validation error ("reject reason is required")
- [ ] Status changes to "Rejected" after entering reason and confirming
- [ ] Red XCircle icon displayed next to "Rejected" status
- [ ] Rejection reason is saved and visible in **Timeline** tab
- [ ] Login as `staff@gmail.com`: rejection reason visible on submission detail

**Result:** Pass / Fail
**Notes:** ___

---

### KT-APR-003 — Manager requests revision `[Basic]` `[P2]`

**Spec Ref:** Spec 6.3 (Approval Operations)

> **Precondition:** A pending submission exists

**Steps:**
1. Login with `manager@gmail.com`
2. Go to dashboard, open a pending ringi at `/approval-requests/[id]`
3. Click **Request Revision** (or "Send Back") button
4. Enter feedback: `Please add a detailed cost breakdown and attach the vendor quotation.`
5. Click **Confirm**

**Expected:**
- [ ] Status changes to "Need Revision"
- [ ] Feedback/comment is saved and visible in **Timeline** tab
- [ ] Login as `staff@gmail.com`: feedback visible in detail view, edit option available

**Result:** Pass / Fail
**Notes:** ___

---

### KT-APR-004 — Staff re-edits after revision `[Basic]` `[P2]`

**Spec Ref:** Spec 6.3 (Approval Operations)

> **Precondition:** A submission with "Need Revision" status exists (run KT-APR-003 first)
>
> **Depends on:** KT-APR-003

**Steps:**
1. Login with `staff@gmail.com`
2. Go to dashboard at `https://eb-filemg-development.vercel.app/`
3. Find the submission with "Need Revision" status
4. Click to open detail at `/approval-requests/[id]`
5. Click **Edit** button
6. Make changes:
   - Update Reason to include the requested cost breakdown
   - Adjust amount or add line items if needed
7. Click **Re-submit** (or Save + Submit)

**Expected:**
- [ ] Edit form loads with existing data pre-filled
- [ ] Changes are saved
- [ ] Status returns to "Pending" for manager re-review
- [ ] Manager can see the updated submission

**Result:** Pass / Fail
**Notes:** ___

---

### KT-APR-005 — Staff blocked from approving `[Edge Case]` `[P1]`

**Spec Ref:** Spec 6.7 (Permissions & Security)

> **Precondition:** A pending submission exists

**Steps:**
1. Login with `staff@gmail.com`
2. Go to dashboard at `https://eb-filemg-development.vercel.app/`
3. Click on a pending submission to open detail at `/approval-requests/[id]`
4. Carefully inspect ALL action buttons visible on the page

**Expected:**
- [ ] **No** Approve button visible
- [ ] **No** Reject button visible
- [ ] **No** Request Revision button visible
- [ ] Staff can only view the submission details, files, and timeline

**Result:** Pass / Fail
**Notes:** ___

---

### KT-APR-006 — Double-approve attempt `[Edge Case]` `[P3]`

**Spec Ref:** Spec 6.3 (Approval Operations)

> **Precondition:** An already-approved submission exists (run KT-APR-001 first)

**Steps:**
1. Login with `manager@gmail.com`
2. Go to the already-approved submission at `/approval-requests/[id]`
3. Check if Approve/Reject buttons are still available

**Expected:**
- [ ] Approve/Reject buttons are NOT available for already-approved submissions
- [ ] Status clearly shows "Approved" with green CheckCircle icon
- [ ] No further actions possible on this submission

**Result:** Pass / Fail
**Notes:** ___

---

### KT-APR-007 — Manager self-approval `[Edge Case]` `[P2]`

**Spec Ref:** Spec 6.3 (Approval Operations)

> **Precondition:** None

**Steps:**
1. Login with `manager@gmail.com`
2. Click **"New Submission"** on dashboard
3. Create a new submission:
   - **Submission Category:** `Other`
   - **Submission Title:** `Manager Self-Approval Test`
   - **Priority:** `Low`
   - **Department:** `Management`
   - **Vendor Name:** `Internal`
   - **Payment Schedule Date:** `2026-05-01`
   - **Payment Method:** `Cash`
   - **Required by Date:** `2026-04-30`, Time: `17:00`
   - **Reason for Purchase:** `Testing self-approval behavior`
   - **Purpose:** `QA Test`
4. After submission, find this submission on dashboard
5. Click to open detail at `/approval-requests/[id]`
6. Try to approve your own submission

**Expected:**
- [ ] Document actual behavior: Is self-approval allowed or blocked?
- [ ] If blocked: clear error message
- [ ] If allowed: approval processes normally

**Result:** Pass / Fail
**Notes:** Document the actual behavior — is self-approval permitted? ___

---

### KT-APR-008 — Quick-approve from dashboard `[Basic]` `[P2]`

**Spec Ref:** Spec 6.4 (Chat Integration), Spec 9 (UI/UX)

> **Precondition:** Pending submissions visible on manager's dashboard

**Steps:**
1. Login with `manager@gmail.com`
2. Go to the dashboard at `https://eb-filemg-development.vercel.app/`
3. Find a pending ringi card on the dashboard
4. Look for a quick-approve action (button/icon on the card itself)
5. If available, use the quick-approve without opening the detail view

**Expected:**
- [ ] Quick-approve action is available on dashboard cards (if feature exists)
- [ ] Approval processes successfully without entering detail view
- [ ] Status updates immediately on the dashboard

**Result:** Pass / Fail
**Notes:** If quick-approve is not implemented on cards, note that here. ___
