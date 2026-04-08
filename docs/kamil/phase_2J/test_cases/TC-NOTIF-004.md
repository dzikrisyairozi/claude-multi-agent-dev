# TC-NOTIF-004: Revision Flow Notifications

**Priority:** High
**Module:** Notification System
**Related:** T5, T6 from notification_refactor_plan.md

---

## Preconditions

- Approval route: **single step** (Requester → Step 1: Approver)
- A submission exists in "Pending" status at step 1
- Users:
  - `requester@gmail.com` (role: requester) — submission owner
  - `approver@gmail.com` (role: approver) — step 1

---

## Test Case 4.1: Revision request notifies requester in "Needs Action"

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `approver@gmail.com` | "Needs Action" badge = 1 |
| 2 | Open submission and click "Need Revision" | Revision dialog opens |
| 3 | Enter comment: "Please fix the invoice amount" | Comment typed |
| 4 | Click "Need Revision" button to confirm | Submission status → "Need Revision" |
| 5 | Check notification bell | "Needs Action" is now **empty**. Badge = 0 |
| 6 | Login as `requester@gmail.com` | Dashboard loads |
| 7 | Check notification bell → "All" tab | "Revision Required" notification visible with blue dot |
| 8 | Verify message | Message: "{title} — Please fix the invoice amount" |
| 9 | Check "Needs Action" tab | Same "Revision Required" notification visible, badge = 1 |

**Pass criteria:** Approver's notifications cleared. Requester gets "Revision Required" with approver's comment in "Needs Action" tab.

---

## Test Case 4.2: Resubmit clears requester's revision notification

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | (After 4.1) Login as `requester@gmail.com` | "Needs Action" badge = 1 ("Revision Required") |
| 2 | Open the submission detail page | Status: "Need Revision", "Resubmit" button visible |
| 3 | Make changes and click "Resubmit" | Submission status → "Pending" |
| 4 | Check notification bell → "Needs Action" tab | **Empty** — revision notification cleared. Badge = 0 |
| 5 | Check "All" tab | "Revision Required" notification still visible but `action_completed_at` is set |

**Pass criteria:** Requester's "Revision Required" notification is marked as action-completed on resubmit.

---

## Test Case 4.3: Resubmit re-notifies step approvers with revision context

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | (After 4.2) Login as `approver@gmail.com` | Dashboard loads |
| 2 | Check notification bell → "All" tab | "Resubmitted for Approval" notification visible |
| 3 | Check "Needs Action" tab | Same notification visible, badge = 1 |
| 4 | Verify message content | Message includes: "{title} has been revised and resubmitted. Previous feedback: \"Please fix the invoice amount\"" |

**Pass criteria:** Approver gets new "Resubmitted for Approval" notification with the previous revision comment as context.

---

## Test Case 4.4: Multi-step revision with "Restart from step 1"

**Additional precondition:** Route has 2 steps. Step-2 accounting requests revision with "Restart approval from step 1" checked.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Step-1 approver approves → Step-2 accounting clicks "Need Revision" with restart checked | Submission → "Need Revision" |
| 2 | Login as `requester@gmail.com` | "Revision Required" in "Needs Action", badge = 1 |
| 3 | Requester resubmits | Revision notification cleared |
| 4 | Login as `approver@gmail.com` (step 1) | "Resubmitted for Approval" in "Needs Action" with step_order = 1 |
| 5 | Login as `accounting@gmail.com` (step 2) | **No notifications** — step 2 hasn't been reached yet |

**Pass criteria:** On restart-from-step-1, only step-1 approvers are re-notified (not step-2).

---

## Test Case 4.5: Multi-step revision WITHOUT restart (re-entry at current step)

**Additional precondition:** Route has 2 steps. Step-2 accounting requests revision WITHOUT "Restart from step 1".

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Step-2 accounting clicks "Need Revision" (restart NOT checked) | Submission → "Need Revision" |
| 2 | Requester resubmits | Revision notification cleared |
| 3 | Login as `accounting@gmail.com` (step 2) | "Resubmitted for Approval" in "Needs Action" with step_order = 2 |
| 4 | Login as `approver@gmail.com` (step 1) | **No new notifications** — step 1 already completed, not re-notified |

**Pass criteria:** On re-entry at current step, only the re-entry step's approvers are notified.
