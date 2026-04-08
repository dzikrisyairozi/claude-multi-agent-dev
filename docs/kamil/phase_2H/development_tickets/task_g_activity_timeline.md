# TASK G — 稟議アクティビティログ（タイムライン） / Submission Activity Log (Timeline Tab)

**Priority**: High
**Assignee**: Syahiid
**Effort**: M (Medium) — New UI components, data already exists in activity_logs
**Status**: Partial — Timeline tab exists with step status, needs full activity feed

---

## Current State

### What Exists:
- **Timeline tab**: Detail page already has 3 tabs (Details/Files/Timeline)
- **`ApprovalRouteTimeline.tsx`**: Shows step progression (Requester → Approver → Accountant) with status icons
  - Status types: completed (blue), rejected (red), skipped (amber), pending (gray)
  - Uses `step_approvals` data for dynamic rendering
  - Fallback to fixed 3-step layout if no step data
- **Activity log service**: `src/service/activityLog/activityLog.ts` — `logActivity()` with `old_values`/`new_values` JSONB
- **Activity types for submissions**: `submission_approve`, `submission_reject`, `submission_need_revision`, `submission_step_approve`, `submission_step_reject`

### What's Missing:
- **Activity feed** in Timeline tab — currently only shows step progression, not chronological events
- No comments/notes displayed inline with timeline events
- No revision diff display (old → new values)
- No "Estimated Approval Route" progress bar at top

## Figma Design Description

**Page**: Submission Detail > Timeline tab (node 2199:46500)

**Top section — Estimated Approval Route:**
- Horizontal progress bar with connected nodes
- Nodes: Requester (green, COMPLETED) → Approver (blue, COMPLETED) → Accountant (orange, PENDING)
- Each node shows: role name, employee name, status label
- Connected by horizontal lines with color transitions

**Bottom section — Activity Log feed:**
- Vertical timeline with colored icons on left
- Each entry shows:
  - **Icon** (colored circle matching role)
  - **Role label + status badge** (e.g., "Requester COMPLETED", "Approver SENT BACK")
  - **Actor name** + timestamp (e.g., "Employee A, January 12, 2026 09:14 AM")
  - **Comment bubble** (yellow/green background): Shows comment text with actor name and timestamp
  - **Revision diff**: Shows "Changes in this revision:" with field-level diffs
    - Example: "Total Amount: ¥275,000,000 (tax incl) → ¥250,000,000 (tax excl)"
    - Example: "Payment Terms: Net 60 → Net 45"

**Events shown in Figma:**
1. Requester COMPLETED — Employee A
2. Approver SENT BACK — Employee B (yellow bubble: "Please correct the amount and payment terms before resubmitting")
3. Requester COMPLETED — Employee A (green bubble: resubmission comment + change diffs)
4. Approver COMPLETED — Employee B (green bubble: "Approved.")
5. Accountant PENDING — Employee C

## Implementation Steps

### Step 1: Fetch Activity Logs for Submission
Create query in service to fetch activity logs filtered by this submission:
```typescript
async function getSubmissionActivityLogs(requestId: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("activity_logs")
    .select("*, actor:profiles!user_id(first_name, last_name, email, role)")
    .eq("entity_type", "approval_request")  // or "submission"
    .eq("entity_id", requestId)
    .order("created_at", { ascending: true });
  return data;
}
```

### Step 2: Create ApprovalRouteProgress Component
New `src/components/approval-request/ApprovalRouteProgress.tsx`:
- Horizontal connected nodes
- Data source: `step_approvals` array from request
- Each node: role name, assignee name, status color

### Step 3: Create ApprovalActivityFeed Component
New `src/components/approval-request/ApprovalActivityFeed.tsx`:
- Vertical timeline layout
- Each event entry:
  - Left: colored circle icon (by role/action)
  - Right: role label, status badge, actor name, timestamp
  - Conditional: comment bubble (from `approval_notes` or `notes`)
  - Conditional: revision diff (from `old_values`/`new_values` in activity log)

### Step 4: Update Timeline Tab
Modify `ApprovalRequestPageClient.tsx`:
- Timeline tab now shows:
  1. `<ApprovalRouteProgress />` at top
  2. `<ApprovalActivityFeed />` below
- Replace or extend current `ApprovalRouteTimeline.tsx`

### Step 5: Diff Display Component
Create a small `RevisionDiff.tsx` component:
- Renders `old_values` / `new_values` as "field: old → new" pairs
- Format amounts with currency, dates with locale

### Step 6: i18n
Translation keys for:
- `timeline.estimatedRoute`, `timeline.activityLog`
- `timeline.completed`, `timeline.sentBack`, `timeline.pending`
- `timeline.changesInRevision`

## Acceptance Criteria

- [ ] Timeline tab shows Estimated Approval Route progress bar at top
- [ ] Progress bar nodes show: role, assignee name, status (color-coded)
- [ ] Activity feed shows chronological events below progress bar
- [ ] Each event shows: actor, role, timestamp, status badge
- [ ] Comments displayed as speech bubbles (yellow/green background)
- [ ] Revision diffs show field-level changes (old → new) within comment bubbles
- [ ] Timeline is ordered oldest-first (chronological)
- [ ] All submission-related activity types render correctly

## Test Scenarios

| # | Scenario | Expected Result |
|---|----------|----------------|
| 1 | View timeline of newly submitted request | Shows "Requester COMPLETED" + pending steps |
| 2 | After approval at step 1 | New event "Approver COMPLETED" appears |
| 3 | After send-back with comment | "SENT BACK" event with comment bubble |
| 4 | After resubmission with changes | Comment bubble shows diff (old → new) |
| 5 | Multi-step route with 5 steps | Progress bar shows all 5 nodes |
| 6 | Legacy request without route | Falls back to current timeline |

## Edge Cases & Gotchas

- **No activity logs yet**: Old submissions may not have activity log entries. Show timeline from `step_approvals` data as fallback.
- **Activity log vs step_approvals**: Two data sources. Progress bar uses `step_approvals`, feed uses `activity_logs`. Keep them in sync.
- **Empty old_values/new_values**: Not all activity entries have diffs. Only show diff section when data exists.
- **Long comments**: Comments can be lengthy. Use text truncation with "Show more" toggle.

## Code References

| File | Purpose |
|------|---------|
| `src/components/approval-request/ApprovalRouteTimeline.tsx` | Existing timeline (replace/extend) |
| `src/components/approval-request/ApprovalRequestPageClient.tsx` | Detail page with tabs |
| `src/service/activityLog/activityLog.ts` | Activity log queries |
| `src/types/activityLog.ts` | `ActivityLogRecord` with old_values/new_values |

## Dependencies

- **Requires**: Task F (revision data for diff display)
- Can start before F — basic timeline without diffs, add diff support when F is done
