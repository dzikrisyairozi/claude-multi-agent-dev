# TASK I — アプリ内通知リニューアル / In-App Notification Revamp

**Priority**: High
**Assignee**: Syahiid
**Effort**: M (Medium) — Extend existing notification system
**Status**: Extend existing — basic system works, needs Needs Action tab + new types

---

## Current State

### What Exists:
- **Service**: `src/service/notification/notification.ts` (146 lines)
  - `createNotification()` — fire-and-forget insertion
  - `getNotifications(limit?)` — fetch current user's notifications
  - `markNotificationRead()` / `markAllNotificationsRead()`
- **Types**: 4 notification types: `approval_submitted`, `approval_approved`, `approval_rejected`, `approval_need_revision`
- **UI**: `src/components/layout/notification-bell.tsx`
  - Bell icon with unread badge count
  - Popover with **All / Unread** tabs
  - Notification items: icon + title + message + time ago
  - "Mark all as read" button
  - "View Details" link → `/approval-requests/[id]`
- **Hook**: `src/hooks/useNotifications.ts`
  - TanStack Query for fetching
  - Supabase Realtime: listens for INSERT on notifications table
  - Fallback polling every 60s
- **DB**: `notifications` table with RLS (users see own), Realtime enabled

### What's Missing:
- "Needs Action" tab (replace "Unread" concept with "requires user response")
- Comment notification type
- Escalation notification type
- Proxy delegation notification type
- Comment preview text in notifications
- No approve/reject buttons should appear in notifications (in-app only shows info + link)

## Figma Design Description

**Component**: Notification dropdown (node 2327:46946)
- Bell icon with badge (blue dot with number)
- Dropdown popover with two tabs: **All** | **Needs Action** (count badge)
- Notification entries:
  1. **New Comment** (orange icon, blue unread dot):
     - "Gilbert Tale replied to your comment on Purchasing Request **REQ-00002**"
     - Comment preview: "I have revised the typo. Please review it again!"
     - "View Details" link (blue with external icon)
     - "2 mins ago"
  2. **Submission Approved** (green icon):
     - "Purchasing Request **REQ-00010** has been approved by the Department Head Erika"
     - "View Details" link
     - "1 hour ago"
  3. **Submission Rejected** (red icon):
     - "Expense request **REQ-00211** has been rejected by the Department Head Erika"
     - "View Details" link
     - "4 hours ago"
- **No action buttons** in notifications — only info + "View Details" link

## Implementation Steps

### Step 1: DB Migration — New Types + requires_action
```sql
-- Add new notification types
ALTER TYPE notification_type ADD VALUE 'comment_added';
ALTER TYPE notification_type ADD VALUE 'escalation_timeout';
ALTER TYPE notification_type ADD VALUE 'proxy_delegated';

-- Track if notification requires user action
ALTER TABLE notifications
  ADD COLUMN requires_action boolean DEFAULT false,
  ADD COLUMN action_completed_at timestamptz;
```

### Step 2: Update Types
```typescript
// src/types/notification.ts
export type NotificationType =
  | "approval_submitted"
  | "approval_approved"
  | "approval_rejected"
  | "approval_need_revision"
  | "comment_added"         // NEW
  | "escalation_timeout"    // NEW
  | "proxy_delegated";      // NEW

export interface Notification {
  // ...existing...
  requires_action: boolean;           // NEW
  action_completed_at: string | null; // NEW
}
```

### Step 3: Update Service
Add to `src/service/notification/notification.ts`:
```typescript
async function getNeedsActionNotifications(limit = 20) {
  // Fetch notifications where requires_action = true AND action_completed_at IS NULL
  // For current user only
}

async function completeNotificationAction(notificationId: string) {
  // Set action_completed_at = now()
  // Called when user acts on the related item
}
```

### Step 4: Update Notification Bell UI
Modify `src/components/layout/notification-bell.tsx`:
- Change tabs: "All" | "Needs Action" (was "Unread")
- Badge count = Needs Action count (not total unread)
- Each notification card:
  - Icon color by type (orange=comment, green=approved, red=rejected, blue=submitted)
  - Title with bold request references (e.g., "**REQ-00002**")
  - Comment preview text for `comment_added` type
  - "View Details" link (always)
  - **Remove any approve/reject action buttons** (in-app is info-only)

### Step 5: Auto-Complete Actions
When user acts on a submission (approve/reject/revise):
- Find related notifications with `requires_action = true`
- Call `completeNotificationAction()` to remove from Needs Action tab

### Step 6: Create Comment Notifications
When `comment_added` events occur (Task APR-008):
- Create notification for all involved parties
- Include comment preview in `message` field
- Set `requires_action = false` (comments are informational)

### Step 7: i18n
Translation keys:
- `notification.needsAction`, `notification.all`
- `notification.commentAdded`, `notification.escalationTimeout`, `notification.proxyDelegated`

## Acceptance Criteria

- [ ] Tabs changed from All/Unread to **All / Needs Action**
- [ ] "Needs Action" shows only notifications requiring user response
- [ ] Badge count reflects "Needs Action" count
- [ ] Comment notifications show: commenter, request ref, comment preview
- [ ] Escalation notifications explain the timeout
- [ ] Proxy delegation notifications explain the authority given
- [ ] "View Details" link works for all notification types
- [ ] **No action buttons** (approve/reject) in notification dropdown
- [ ] After user acts on submission, notification moves out of "Needs Action"
- [ ] Real-time updates still work (new notifications appear instantly)
- [ ] Fallback polling (60s) still works

## Test Scenarios

| # | Scenario | Expected Result |
|---|----------|----------------|
| 1 | New submission assigned to approver | "Needs Action" count increases, notification appears |
| 2 | Approver approves the submission | Notification moves out of "Needs Action" |
| 3 | Comment added to submission | Comment notification with preview in "All" tab |
| 4 | Escalation timeout | Escalation notification in "Needs Action" |
| 5 | Proxy authority delegated | Delegation notification in "Needs Action" |
| 6 | Mark all as read | Only affects "read" state, not "Needs Action" |
| 7 | Switch to Japanese | All notification labels translated |

## Edge Cases & Gotchas

- **"Unread" vs "Needs Action"**: These are different concepts. A notification can be read but still need action. `is_read` tracks visibility, `requires_action` tracks actionability.
- **Stale Needs Action**: If original approver acts while proxy has a "Needs Action" notification, clear the proxy's notification too.
- **Notification flooding**: Limit notification creation frequency. Don't create duplicate notifications for the same event.
- **Real-time insert listener**: Current hook listens for INSERT. Needs to also handle UPDATE (when `requires_action` changes or `action_completed_at` is set).

## Code References

| File | Purpose |
|------|---------|
| `src/service/notification/notification.ts` | Service to extend (146 lines) |
| `src/components/layout/notification-bell.tsx` | Bell UI to modify |
| `src/hooks/useNotifications.ts` | Hook to extend for Needs Action |
| `src/types/notification.ts` | Types to extend |

## Permission Matrix Reference

- SYS-005: Manage notification settings — Admin only

## Dependencies

- **Requires**: Task E (submission events trigger notifications)
- Can start UI refactor (tab rename, badge logic) independently
