# TASK E — 稟議提出+サブカテゴリ+承認ルート連携 / Submission + Sub-Category + Route Integration

**Priority**: Critical
**Assignee**: Syahiid
**Effort**: XL (Extra Large) — Touches submission, route matching, dashboard, forms
**Status**: Extend existing — core submission works, needs sub-cat + enhanced matching

---

## Current State

### Submission System:
- `src/service/approvalRequest/approvalRequest.ts` (980 lines) — full CRUD with role-based filtering
- `src/components/approval-request/SubmissionDialog.tsx` — 15+ field form with draft/submit modes
- Category is a flat string: `category: string | null` on `ApprovalRequest`
- No `category_type_id` field

### Route Matching:
- `src/service/approvalRequest/approvalRouteMatching.ts`:
  - `matchApprovalRoute(category, department, amount)` — finds best match by scoring
  - `snapshotRouteSteps()` — copies route steps into `approval_request_step_approvals`
  - `canUserApproveCurrentStep()` — checks if user can act on current step
  - `processStepApproval()` — handles approve/reject/revision for multi-step
- Matching is AND-only, no sub-category, no multi-assignee

### Dashboard:
- `src/app/page.tsx` — 7 status tabs, search, advanced filters
- Filters by: category, priority, department, date range
- Role-based data: admin/accounting see all, others see own + assigned

### Permission Enforcement (2026-03-25):
- `getApprovalRequests()`: platform_admin sees nothing, requester/approver see own + assigned, admin/accounting see all
- `createApprovalRequest()`: `checkPermission("create_submit_ringi")` guard

## Scope

### 1. Add Sub-Category to Submissions
- New `category_type_id` field on `approval_requests` table
- Submission dialog: select parent category → then sub-category dropdown (filtered)
- Default: "Unspecified" when no sub-category selected
- Display sub-category in request cards and detail page

### 2. Enhanced Route Matching
- Update `matchApprovalRoute()` to support:
  - Sub-category matching (category_type_id)
  - AND/OR condition logic (from Task D's `condition_logic` field)
  - Multi-assignee step snapshots (from Task D's junction table)
- When snapshotting: copy multi-assignee data into step_approvals

### 3. Multi-Assignee Step Approval
- `canUserApproveCurrentStep()` must check ALL assigned users for current step
- Any one of the assigned users can approve/reject/revise
- Once one acts, step is resolved — others cannot act
- `processStepApproval()` must handle multi-assignee resolution

### 4. Approver Dashboard View
- Approver sees submissions where they are assigned (individually or by role/position/dept)
- Multi-assignee: if user is one of the 10 assigned, they see it
- Current step highlighted, action buttons only for current step's assignees

## Implementation Steps

### Step 1: DB Migration
```sql
ALTER TABLE approval_requests
  ADD COLUMN category_type_id uuid REFERENCES category_types(id);

-- Also add multi-assignee tracking to step approvals
CREATE TABLE approval_request_step_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_approval_id uuid NOT NULL REFERENCES approval_request_step_approvals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### Step 2: Update Types
```typescript
// src/types/approvalRequest.ts
export interface ApprovalRequest {
  // ...existing...
  category_type_id: string | null;  // NEW
  category_type?: { id: string; name: string; category: string } | null;  // joined
}

export interface CreateApprovalRequestParams {
  // ...existing...
  category_type_id?: string;  // NEW
}
```

### Step 3: Update Submission Dialog
- After category dropdown, show sub-category dropdown
- Filter sub-categories by selected parent category
- Fetch category types via new `getCategoryTypesByCategory(category)` query
- Default selection: "Unspecified"

### Step 4: Update Route Matching
```typescript
// Enhanced matchApprovalRoute
function matchApprovalRoute(
  category: string,
  categoryTypeId: string | null,  // NEW
  department: string,
  amount: number | null
): ApprovalRoute | null {
  // Support AND/OR via route.condition_logic
  // Score: sub-category match adds to specificity
}
```

### Step 5: Update Step Snapshot
```typescript
// Enhanced snapshotRouteSteps — include multi-assignees
function snapshotRouteSteps(supabase, requestId, route) {
  // For each step:
  //   1. Insert step_approval record
  //   2. If step has assignees (junction table), copy to step_assignees
}
```

### Step 6: Update processStepApproval
- Check if user is in step's assignee list OR matches role/position/dept
- When user acts, mark step as resolved
- Other assignees can no longer act on that step

### Step 7: Update Dashboard Display
- Show sub-category on `ApprovalRequestCard`
- Add sub-category to filter options

## Acceptance Criteria

- [ ] Submission form has sub-category dropdown (filtered by parent category)
- [ ] Default sub-category is "Unspecified"
- [ ] Submitting auto-matches to correct approval route (with sub-category scoring)
- [ ] AND/OR conditions respected during matching
- [ ] Multi-assignee steps: all assigned users see the submission
- [ ] Any one assigned user can approve → step resolved for all
- [ ] Step-by-step progression: current step highlighted
- [ ] Action buttons visible only for current step's assignees
- [ ] Dashboard shows sub-category info on cards
- [ ] Dashboard filters include sub-category
- [ ] Existing submissions (no sub-category) still work correctly

## Test Scenarios

| # | Scenario | Expected Result |
|---|----------|----------------|
| 1 | Select category "Purchasing" | Sub-category dropdown shows Purchasing sub-types |
| 2 | Submit without selecting sub-category | Defaults to "Unspecified" |
| 3 | Submit with amount matching Route A | Route A matched, steps snapshotted |
| 4 | Submit with OR condition route | Matches if ANY condition group matches |
| 5 | Multi-assignee step: User A approves | Step resolved, User B can no longer act |
| 6 | Multi-assignee step: User B loads dashboard | Sees submission with approve button |
| 7 | Old submission without sub-category | Still displays correctly |
| 8 | No matching route found | Submission proceeds without route (legacy flow) |
| 9 | Admin views all submissions | Sees all including sub-category column |
| 10 | Requester views dashboard | Sees own + assigned only |

## Edge Cases & Gotchas

- **Legacy submissions**: Existing `approval_requests` have `category_type_id = null`. Handle gracefully in display and filtering.
- **Route matching priority**: When multiple routes match with AND/OR, use scoring (most specific wins). Sub-category match should add to score.
- **Multi-assignee race condition**: Two assignees approve simultaneously. Use DB-level constraint: check `status = 'pending'` before update.
- **Draft with sub-category**: Save sub-category even in draft mode. When converting draft → pending, re-match route.
- **Route not found**: If no route matches, submission can still proceed (legacy single-step flow). Don't block submission.

## Code References

| File | Purpose |
|------|---------|
| `src/service/approvalRequest/approvalRequest.ts` | Main service (980 lines) |
| `src/service/approvalRequest/approvalRouteMatching.ts` | Route matching logic |
| `src/components/approval-request/SubmissionDialog.tsx` | Submission form |
| `src/components/approval-request/ApprovalRequestCard.tsx` | Dashboard card |
| `src/app/page.tsx` | Dashboard with filters |
| `src/types/approvalRequest.ts` | Types to extend |

## Permission Matrix Reference

- SUB-001 to SUB-006 (full submission permission set)

## Dependencies

- **Requires**: Task C (category_types table), Task D (multi-assignee + AND/OR)
- **Blocks**: Tasks F, G, H, I, J, O
