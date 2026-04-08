# 05 — Submission Status Tests

Verify that each submission status (Pending, Approved, Rejected, Need Revision, Cancelled) displays correctly on both dashboard cards and detail views.

**Dashboard URL:** `https://eb-filemg-development.vercel.app/`
**Approval Detail URL:** `https://eb-filemg-development.vercel.app/approval-requests/[id]`

### Status Badge Styling

| Status | Color | Icon |
|--------|-------|------|
| Pending | Orange | (clock/default) |
| Approved | Green | CheckCircle |
| Rejected | Red | XCircle |
| Need Revision | Orange/Yellow | (warning) |
| Cancelled | Grey | (dash) |

> **Important:** These tests require creating submissions and changing their status through the approval workflow. Execute in order.

---

### KT-STS-001 — Pending status display `[Main]` `[P1]`

**Spec Ref:** Spec 6.3, Spec 9 (UI/UX)

> **Precondition:** None (we'll create a fresh submission)

**Steps:**
1. Login with `staff@gmail.com`
2. Click **"New Submission"** on the dashboard at `https://eb-filemg-development.vercel.app/`
3. Submit a new ringi:
   - **Submission Category:** `Other`
   - **Submission Title:** `Status Test - Pending`
   - **Priority:** `Low`
   - **Department:** `QA`
   - **Vendor Name:** `Test`
   - **Payment Schedule Date:** `2026-05-01`
   - **Payment Method:** `Cash`
   - **Required by Date:** `2026-04-30`, Time: `17:00`
   - **Reason for Purchase:** `Testing pending status display`
   - **Purpose:** `QA Status Test`
4. After submission, stay on the dashboard
5. Find the newly created submission card
6. Click the card to open detail view at `/approval-requests/[id]`

**Expected:**
- [ ] Dashboard card shows "Pending" status badge
- [ ] "Pending" badge has orange color styling
- [ ] Detail view also shows "Pending" status
- [ ] Submission appears in the active list on dashboard

**Result:** Pass / Fail
**Notes:** ___

---

### KT-STS-002 — Approved status display `[Main]` `[P1]`

**Spec Ref:** Spec 6.3, Spec 9 (UI/UX)

> **Precondition:** A pending submission exists
>
> **Depends on:** KT-STS-001 (or any pending submission)

**Steps:**
1. Login with `manager@gmail.com`
2. Go to dashboard at `https://eb-filemg-development.vercel.app/`
3. Find the "Status Test - Pending" submission card
4. Click to open detail at `/approval-requests/[id]`
5. Click green **Approve** button → Confirm
6. **Switch to** `staff@gmail.com`
7. Go to dashboard at `https://eb-filemg-development.vercel.app/`
8. Find the now-approved submission card
9. Click to open the detail view

**Expected:**
- [ ] Dashboard card shows "Approved" status badge
- [ ] "Approved" badge has green color with CheckCircle icon
- [ ] Detail view shows "Approved" status
- [ ] Approval timestamp/info visible in **Timeline** tab

**Result:** Pass / Fail
**Notes:** ___

---

### KT-STS-003 — Rejected status display `[Basic]` `[P2]`

**Spec Ref:** Spec 6.3, Spec 9 (UI/UX)

> **Precondition:** A pending submission exists

**Steps:**
1. Login with `staff@gmail.com`
2. Click **"New Submission"** at `https://eb-filemg-development.vercel.app/`
3. Submit a new ringi:
   - **Submission Title:** `Status Test - To Be Rejected`
   - **Priority:** `Low`
   - **Department:** `QA`
   - (fill remaining required fields with test data)
4. **Switch to** `manager@gmail.com`
5. Find this submission on dashboard, click to open detail
6. Click red **Reject** button
7. Enter reason: `Test rejection` (required field)
8. Click **Confirm**
9. **Switch to** `staff@gmail.com`
10. View the submission on dashboard and detail view

**Expected:**
- [ ] Dashboard card shows "Rejected" status badge
- [ ] "Rejected" badge has red color with XCircle icon
- [ ] Rejection reason ("Test rejection") is visible in detail view **Timeline** tab
- [ ] Manager's name/info shown as the one who rejected

**Result:** Pass / Fail
**Notes:** ___

---

### KT-STS-004 — Need Revision status display `[Basic]` `[P2]`

**Spec Ref:** Spec 6.3, Spec 9 (UI/UX)

> **Precondition:** A pending submission exists

**Steps:**
1. Login with `staff@gmail.com`
2. Click **"New Submission"** at `https://eb-filemg-development.vercel.app/`
3. Submit a new ringi:
   - **Submission Title:** `Status Test - Needs Revision`
   - **Priority:** `Low`
   - **Department:** `QA`
   - (fill remaining required fields with test data)
4. **Switch to** `manager@gmail.com`
5. Find this submission, open detail at `/approval-requests/[id]`
6. Click **Request Revision** button
7. Enter feedback: `Please add more details about the budget`
8. Confirm
9. **Switch to** `staff@gmail.com`
10. View the submission on dashboard and detail view

**Expected:**
- [ ] Dashboard card shows "Need Revision" status badge
- [ ] "Need Revision" badge has orange/yellow styling
- [ ] Manager's feedback is visible in detail view **Timeline** tab
- [ ] Edit button is available for the staff to revise

**Result:** Pass / Fail
**Notes:** ___

---

### KT-STS-005 — Cancelled status display `[Basic]` `[P2]`

**Spec Ref:** Spec 6.3, Spec 9 (UI/UX)

> **Precondition:** A pending submission by staff exists

**Steps:**
1. Login with `staff@gmail.com`
2. Click **"New Submission"** at `https://eb-filemg-development.vercel.app/`
3. Submit a new ringi:
   - **Submission Title:** `Status Test - To Be Cancelled`
   - **Priority:** `Low`
   - **Department:** `QA`
   - (fill remaining required fields with test data)
4. Go to dashboard, find this pending submission
5. Click to open detail at `/approval-requests/[id]`
6. Click **Cancel** (or equivalent action to withdraw the submission)
7. Verify the status change on dashboard and detail view

**Expected:**
- [ ] Status changes to "Cancelled"
- [ ] "Cancelled" badge has grey color styling
- [ ] Submission no longer appears in active/pending lists (or appears with cancelled state)
- [ ] Detail view shows cancelled state with no further actions available

**Result:** Pass / Fail
**Notes:** If cancel feature is not available, note here. ___
