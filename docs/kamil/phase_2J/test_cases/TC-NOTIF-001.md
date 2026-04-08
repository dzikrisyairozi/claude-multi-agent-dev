# TC-NOTIF-001: Single-Step Submission Notifications

**Priority:** High
**Module:** Notification System
**Related:** T1, T10 from notification_refactor_plan.md

---

## Preconditions

- Approval route configured: **single step** (Requester → Approver)
- Route condition matches the submission (e.g., category = purchasing)
- Users available:
  - `requester@gmail.com` (role: requester)
  - `approver@gmail.com` (role: approver)
  - `admin@gmail.com` (role: admin) — **NOT** assigned as approver in route
- All notification bells cleared (no prior unread notifications)

---

## Test Case 1.1: Step-1 approvers receive notification on submission

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `requester@gmail.com` | Dashboard loads |
| 2 | Create a new submission with category matching the route | Submission created with status "Pending" |
| 3 | Login as `approver@gmail.com` | Dashboard loads |
| 4 | Click notification bell | Notification popover opens |
| 5 | Check "All" tab | "New Submission for Approval" notification visible with blue dot |
| 6 | Check "Needs Action" tab | Same notification visible. Badge count = 1 |
| 7 | Verify notification content | Title: "New Submission for Approval", Message: "{title} is awaiting your approval." |
| 8 | Click "View Details" on notification | Navigates to the submission detail page |

**Pass criteria:** Approver sees notification in both "All" and "Needs Action" tabs with correct title/message.

---

## Test Case 1.2: Admin does NOT receive notification (not assigned)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | (Continuation from 1.1) Login as `admin@gmail.com` | Dashboard loads |
| 2 | Click notification bell | Notification popover opens |
| 3 | Check "All" tab | **No notifications** — empty |
| 4 | Check "Needs Action" tab | **No notifications** — empty |
| 5 | Verify bell has no badge count | No red badge on bell icon |
| 6 | Navigate to submission list | Admin can still see all submissions in dashboard |

**Pass criteria:** Admin gets zero notifications but can still view submissions.

---

## Test Case 1.3: Submitter does NOT receive own notification

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | (Continuation from 1.1) Login as `requester@gmail.com` | Dashboard loads |
| 2 | Click notification bell | Notification popover opens |
| 3 | Check "All" tab | **No notification** about own submission |

**Pass criteria:** Requester is excluded from receiving their own submission notification.

---

## Test Case 1.4: Multiple approvers with same role all receive notifications

**Additional precondition:** Two users with role `approver` exist (e.g., `approver@gmail.com` and `approver2@gmail.com`)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `requester@gmail.com` and create submission | Submission created |
| 2 | Login as `approver@gmail.com` | "New Submission for Approval" in notifications |
| 3 | Login as `approver2@gmail.com` | Same "New Submission for Approval" in notifications |

**Pass criteria:** All users matching the step's approver role receive the notification.

---

## Test Case 1.5: Bell badge count reflects needs-action count

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `approver@gmail.com` with 1 pending notification | Bell shows badge "1" |
| 2 | Have requester create another submission matching same route | Bell badge updates to "2" (realtime) |
| 3 | Approve one submission | Bell badge decreases to "1" |
| 4 | Approve the other | Bell badge disappears (0) |

**Pass criteria:** Badge count accurately reflects the number of actionable notifications.
