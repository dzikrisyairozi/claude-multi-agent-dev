# TC-NOTIF-005: Rejection Notifications

**Priority:** High
**Module:** Notification System
**Related:** T7 from notification_refactor_plan.md

---

## Preconditions

- Approval route: **single step** (Requester → Step 1: Approver)
- A submission exists in "Pending" status at step 1
- Users:
  - `requester@gmail.com` (role: requester)
  - `approver@gmail.com` (role: approver)

---

## Test Case 5.1: Rejection notifies requester as informational

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `approver@gmail.com` | "Needs Action" badge = 1 |
| 2 | Open submission and click "Reject" | Rejection dialog opens |
| 3 | Enter notes: "Budget not available" and confirm | Submission status → "Rejected" |
| 4 | Check notification bell | "Needs Action" is **empty**. Badge = 0 |
| 5 | Login as `requester@gmail.com` | Dashboard loads |
| 6 | Check notification bell → "All" tab | "Request Rejected" notification visible with blue dot |
| 7 | Verify message | Message: "{title} — Budget not available" |
| 8 | Check "Needs Action" tab | **Empty** — rejection is informational only |
| 9 | Verify bell badge | **No badge** — informational notifications don't count |

**Pass criteria:** Requester gets "Request Rejected" in "All" tab only. Not in "Needs Action". Approver's notifications cleared.

---

## Test Case 5.2: Multi-step rejection at step 2

**Additional precondition:** Route has 2 steps. Step-1 approved, now at step 2.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `accounting@gmail.com` (step 2) | "Needs Action" badge = 1 |
| 2 | Reject the submission with notes | Submission → "Rejected" |
| 3 | Check `accounting` notification bell | "Needs Action" empty, badge = 0 |
| 4 | Login as `requester@gmail.com` | "Request Rejected" in "All" tab |
| 5 | Check "Needs Action" | Empty — informational |
| 6 | Login as `approver@gmail.com` (step 1) | No new notifications (step-1 was already completed) |

**Pass criteria:** Only the requester gets the rejection notification. No stale step-1 notifications reappear.

---

## Test Case 5.3: Rejection without notes

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Approver rejects submission **without** entering notes | Submission → "Rejected" |
| 2 | Login as `requester@gmail.com` | "Request Rejected" notification visible |
| 3 | Verify message | Message: "{title}" (no " — " suffix since no notes) |

**Pass criteria:** Notification works correctly even without notes.
