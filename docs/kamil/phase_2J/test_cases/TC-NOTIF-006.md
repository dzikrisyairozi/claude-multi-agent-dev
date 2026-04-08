# TC-NOTIF-006: Comment Notifications

**Priority:** Medium
**Module:** Notification System
**Related:** T8 from notification_refactor_plan.md

---

## Preconditions

- A submission exists (any status with revision comments enabled, e.g., "Need Revision")
- Users:
  - `requester@gmail.com` (role: requester) — submission owner
  - `approver@gmail.com` (role: approver) — will comment

---

## Test Case 6.1: Comment on submission notifies owner (informational)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `approver@gmail.com` | Dashboard loads |
| 2 | Open a submission owned by `requester@gmail.com` | Submission detail page |
| 3 | Add a comment: "Can you provide more details on line item 3?" | Comment saved |
| 4 | Login as `requester@gmail.com` | Dashboard loads |
| 5 | Check notification bell → "All" tab | "New Comment" notification visible |
| 6 | Verify message content | Message includes commenter name and comment preview (up to 200 chars) |
| 7 | Check "Needs Action" tab | **Empty** — comment notifications are informational only |
| 8 | Verify bell badge | **No badge** — informational notifications don't affect badge count |

**Pass criteria:** Comment notification shows in "All" with preview, NOT in "Needs Action".

---

## Test Case 6.2: Owner commenting on own submission does NOT self-notify

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `requester@gmail.com` | Dashboard loads |
| 2 | Open own submission and reply to a comment | Comment saved |
| 3 | Check notification bell | **No new notification** for own comment |

**Pass criteria:** Users don't receive notifications for their own comments.

---

## Test Case 6.3: Long comment message truncation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Approver adds a very long comment (> 200 characters) | Comment saved |
| 2 | Login as requester | "New Comment" notification visible |
| 3 | Verify message preview | Comment preview is truncated at ~200 characters |

**Pass criteria:** Long comments are truncated in notification message without breaking UI.
