# TC-NOTIF-007: Admin Notification Isolation

**Priority:** High
**Module:** Notification System
**Related:** T9, T10 from notification_refactor_plan.md

---

## Preconditions

- Users:
  - `requester@gmail.com` (role: requester)
  - `approver@gmail.com` (role: approver)
  - `admin@gmail.com` (role: admin)
- Two approval routes configured:
  - **Route A:** Step 1 = role: approver (admin NOT assigned)
  - **Route B:** Step 1 = role: admin (admin IS assigned as approver)

---

## Test Case 7.1: Admin NOT in route receives zero notifications

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `requester@gmail.com` | Dashboard loads |
| 2 | Create submission matching **Route A** (step 1 = approver role) | Submission created |
| 3 | Login as `admin@gmail.com` | Dashboard loads |
| 4 | Check notification bell → "All" tab | **No notifications** |
| 5 | Check "Needs Action" tab | **No notifications** |
| 6 | Check bell badge | **No badge** |
| 7 | Navigate to submission list | Admin CAN see the submission in dashboard |
| 8 | Open the submission | Admin CAN view details and take action (approve/reject) |

**Pass criteria:** Admin gets zero notifications for submissions they're not assigned to. Admin retains full dashboard visibility and action capability.

---

## Test Case 7.2: Admin assigned as step approver receives notification

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `requester@gmail.com` | Dashboard loads |
| 2 | Create submission matching **Route B** (step 1 = admin role) | Submission created |
| 3 | Login as `admin@gmail.com` | Dashboard loads |
| 4 | Check notification bell → "All" tab | "New Submission for Approval" visible |
| 5 | Check "Needs Action" tab | Same notification visible, badge = 1 |
| 6 | Verify notification has `step_order: 1` | (DB check) `step_order = 1`, `requires_action = true` |

**Pass criteria:** Admin assigned as approver in a step gets the same notification as any other approver.

---

## Test Case 7.3: Admin approves via dashboard (not via notification)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | (Route A scenario — admin NOT in route, no notification) | — |
| 2 | Login as `admin@gmail.com` | No notifications |
| 3 | Navigate to submission list and open the pending submission | Submission detail loads |
| 4 | Click "Approve" | Submission approved |
| 5 | Check that step-1 approver's notifications are cleared | `action_completed_at` set for step-1 notifications |
| 6 | Login as `requester@gmail.com` | "Request Approved" in "All" tab |

**Pass criteria:** Admin can still approve submissions without having received a notification. Notification clearing and requester notification still work correctly.

---

## Test Case 7.4: No blanket admin notifications on resubmit

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Route A scenario: Approver requests revision on a submission | Requester gets "Revision Required" |
| 2 | Requester resubmits | Step-1 approvers re-notified |
| 3 | Login as `admin@gmail.com` | **No notifications** — admin not in route |
| 4 | Check notification bell | Empty in both tabs |

**Pass criteria:** Admin does NOT receive blanket notifications on resubmit either. Only step approvers are notified.

---

## Test Case 7.5: Multiple submissions — admin isolation holds

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create 3 submissions: 2 on Route A (approver), 1 on Route B (admin) | 3 submissions created |
| 2 | Login as `admin@gmail.com` | Dashboard loads |
| 3 | Check notification bell | Only 1 notification (from Route B). Badge = 1 |
| 4 | Check "All" tab | 1 notification only |
| 5 | Navigate to submission list | All 3 submissions visible |

**Pass criteria:** Admin only gets notified for submissions on routes where they're assigned. Dashboard visibility is unaffected.
