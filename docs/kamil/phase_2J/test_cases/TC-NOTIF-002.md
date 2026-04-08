# TC-NOTIF-002: Multi-Step Submission Notifications

**Priority:** High
**Module:** Notification System
**Related:** T2 from notification_refactor_plan.md

---

## Preconditions

- Approval route configured: **two steps** (Requester → Step 1: Approver → Step 2: Accounting)
- Route condition matches the submission
- Users available:
  - `requester@gmail.com` (role: requester)
  - `approver@gmail.com` (role: approver) — assigned to step 1
  - `accounting@gmail.com` (role: accounting) — assigned to step 2
- All notification bells cleared

---

## Test Case 2.1: Only step-1 approvers notified on initial submission

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `requester@gmail.com` | Dashboard loads |
| 2 | Create submission matching the multi-step route | Submission created, status "Pending" |
| 3 | Login as `approver@gmail.com` | Dashboard loads |
| 4 | Click notification bell → "Needs Action" tab | "New Submission for Approval" visible, badge = 1 |
| 5 | Login as `accounting@gmail.com` | Dashboard loads |
| 6 | Click notification bell | **No notifications** — empty in both tabs |

**Pass criteria:** Only step-1 approvers are notified. Step-2 (accounting) receives nothing until step-1 completes.

---

## Test Case 2.2: Requester NOT notified on initial submission (multi-step)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | (After submission from 2.1) Login as `requester@gmail.com` | Dashboard loads |
| 2 | Click notification bell | **No notifications** |

**Pass criteria:** Requester does not get notified about their own submission.

---

## Test Case 2.3: Notification step_order field is correctly set

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Query `notifications` table for the approval_request_id | Notification exists |
| 2 | Check `step_order` column value | `step_order = 1` |
| 3 | Check `requires_action` column | `requires_action = true` |
| 4 | Check `action_completed_at` column | `action_completed_at = null` |

**Pass criteria:** Notification is tagged with correct step_order for scoped completion.
