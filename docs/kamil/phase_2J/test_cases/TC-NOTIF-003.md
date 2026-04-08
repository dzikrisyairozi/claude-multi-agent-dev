# TC-NOTIF-003: Step Advancement Notifications

**Priority:** High
**Module:** Notification System
**Related:** T3, T4 from notification_refactor_plan.md

---

## Preconditions

- Approval route: **two steps** (Requester → Step 1: Approver → Step 2: Accounting)
- A submission exists in "Pending" status at step 1
- Step-1 approver (`approver@gmail.com`) has an active "Needs Action" notification
- Users:
  - `requester@gmail.com` (role: requester)
  - `approver@gmail.com` (role: approver) — step 1
  - `accounting@gmail.com` (role: accounting) — step 2

---

## Test Case 3.1: Step-1 approval clears step-1 notifications and notifies step-2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `approver@gmail.com` | "Needs Action" badge = 1 |
| 2 | Open the submission detail page | Status: "Pending Approval", Step 1/2: Approver |
| 3 | Click "Approve" and confirm | Submission advances to step 2 |
| 4 | Check notification bell | "Needs Action" tab is now **empty**. Badge = 0 |
| 5 | Login as `accounting@gmail.com` | Dashboard loads |
| 6 | Check notification bell → "All" tab | "Pending Approval" notification visible |
| 7 | Check "Needs Action" tab | Same notification visible, badge = 1 |
| 8 | Verify message content | Message: "{title} is awaiting your approval (Step 2)." |

**Pass criteria:** Step-1 notifications cleared. Step-2 approver receives new "Pending Approval" notification with `step_order: 2`.

---

## Test Case 3.2: Requester NOT notified on intermediate step approval

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | (After step-1 approval from 3.1) Login as `requester@gmail.com` | Dashboard loads |
| 2 | Check notification bell | **No new notifications** — requester is not notified for intermediate steps |

**Pass criteria:** Requester only gets notified on terminal actions (final approval, rejection, revision), not intermediate step approvals.

---

## Test Case 3.3: Final step approval notifies requester with "Request Approved"

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `accounting@gmail.com` | "Needs Action" badge = 1 |
| 2 | Open the submission and click "Approve" | Submission status changes to "Approved" |
| 3 | Check notification bell | "Needs Action" is now **empty**. Badge = 0 |
| 4 | Login as `requester@gmail.com` | Dashboard loads |
| 5 | Check notification bell → "All" tab | "Request Approved" notification visible |
| 6 | Check "Needs Action" tab | **Empty** — approval notification is informational only |
| 7 | Verify message content | Message: "{title}" (no action required) |
| 8 | Verify bell badge | No badge (informational notification doesn't count) |

**Pass criteria:** Requester gets "Request Approved" in "All" tab only (not in "Needs Action"). Step-2 notifications are cleared.

---

## Test Case 3.4: Step-scoped clearing — step-2 notifications survive step-1 action

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Query `notifications` table after step-1 approval | Step-1 notifications have `action_completed_at` set |
| 2 | Check step-2 notification | `action_completed_at = null`, `requires_action = true`, `step_order = 2` |
| 3 | After step-2 approval | Step-2 notifications now have `action_completed_at` set |

**Pass criteria:** `completeNotificationAction` only clears the acted step's notifications, not other steps.
