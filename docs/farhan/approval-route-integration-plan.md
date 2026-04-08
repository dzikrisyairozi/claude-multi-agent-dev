# Plan: Integrate Approval Route Configuration with Approval Requests

## Context

The codebase has two disconnected features:
1. **Approval Routes** — superadmins can configure multi-step approval workflows with conditions (amount ranges, departments, categories) and steps (role-based or user-specific approvers)
2. **Approval Requests** — users submit requests that go through a **hardcoded** Requester → Manager → Accountant flow with single approve/reject action

**Problem**: Routes exist as configuration-only — they are never evaluated or applied to actual requests. The approval flow ignores route definitions entirely.

**Goal**: When a request is submitted, automatically match it to an approval route based on its attributes, then enforce that route's multi-step approval workflow with per-step tracking.

---

## Phase 1: Database Migration

**New migration**: `supabase/migrations/20260316000000_integrate_approval_routes_with_requests.sql`

### 1a. New columns on `approval_requests`
```sql
ALTER TABLE approval_requests
  ADD COLUMN route_id uuid REFERENCES approval_routes(id) ON DELETE SET NULL,
  ADD COLUMN current_step_order integer DEFAULT NULL;
```

### 1b. New table: `approval_request_step_approvals`
Snapshots route steps at submission time (immune to later route edits).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| approval_request_id | uuid FK → approval_requests | CASCADE delete |
| step_order | integer | |
| step_name | text | |
| approver_role | text | nullable |
| approver_user_id | uuid | nullable |
| is_required | boolean | default true |
| status | text | pending / approved / rejected / skipped |
| acted_by | uuid FK → auth.users | nullable |
| acted_at | timestamptz | nullable |
| notes | text | nullable |
| created_at | timestamptz | |

Unique constraint on `(approval_request_id, step_order)`.

### 1c. RLS policies
- Managers/accountants need SELECT + UPDATE on `approval_requests` (currently only owners + superadmins have access)
- All authenticated users need SELECT on `approval_routes` (active only) and `approval_route_steps` for route matching
- Owner + approvers need SELECT on `approval_request_step_approvals`; approvers need UPDATE

### 1d. Regenerate Supabase types

---

## Phase 2: Types & Service Layer

### 2a. Types — `src/types/approvalRequest.ts`

Add:
```typescript
export interface ApprovalRequestStepApproval {
  id: string;
  approval_request_id: string;
  step_order: number;
  step_name: string;
  approver_role: string | null;
  approver_user_id: string | null;
  is_required: boolean;
  status: "pending" | "approved" | "rejected" | "skipped";
  acted_by: string | null;
  acted_at: string | null;
  notes: string | null;
  created_at: string;
  actor?: { first_name: string; last_name: string; email: string } | null;
}
```

Extend `ApprovalRequest` with: `route_id`, `current_step_order`, `step_approvals[]`.

### 2b. New service — `src/service/approvalRequest/approvalRouteMatching.ts`

4 key functions:

| Function | Purpose |
|----------|---------|
| `matchApprovalRoute(category, department, amount)` | Find best matching active route by evaluating conditions (AND logic). Most specific match wins. |
| `snapshotRouteSteps(supabase, requestId, route)` | Copy route steps into `approval_request_step_approvals`, set `route_id` and `current_step_order = 1` on request |
| `processStepApproval(requestId, userId, action, notes)` | Approve/reject/need_revision the current step. Updates **both** `approval_request_step_approvals` AND `approval_requests.status` in one operation. |
| `canUserApproveCurrentStep(requestId, userId)` | Check if user matches current step's `approver_role` or `approver_user_id`. Superadmins always can. |

### Status Synchronization (step → request)

The `approval_requests.status` is a **rollup** of step-level statuses. Both tables are updated together by `processStepApproval`:

| Step Action | `approval_request_step_approvals` | `approval_requests.status` |
|---|---|---|
| Approve step (not last) | Current step → `approved` | Stays `pending` |
| Approve **last** step | Last step → `approved` | → `approved` |
| Reject at **any** step | Current step → `rejected` | → `rejected` |
| Request revision at **any** step | Current step → `rejected` | → `need_revision` |
| Submitter resubmits | All steps reset → `pending` | → `pending` |

Existing status filter tabs (All, Draft, Pending, Approved, Rejected, Need Revision, Cancelled) continue to work unchanged.

### 2c. Modify existing service — `src/service/approvalRequest/approvalRequest.ts`

| Function | Change |
|----------|--------|
| `createApprovalRequest` | When status = "pending": call `matchApprovalRoute` → `snapshotRouteSteps` |
| `updateApprovalRequestStatus` | If request has `route_id` → delegate to `processStepApproval`. If no route → keep existing hardcoded fallback. Remove blanket accountant block. |
| `getApprovalRequest` | Join `approval_request_step_approvals` with actor profiles. Return `step_approvals[]`. |
| `updateApprovalRequest` | When status changes from draft/need_revision → pending: re-run route matching and re-snapshot steps |

### 2d. Activity logging — `src/types/activityLog.ts`

Add actions: `submission_step_approve`, `submission_step_reject` with step metadata.

---

## Phase 3: UI Changes

### 3a. `src/components/approval-request/ApprovalRouteTimeline.tsx`
- Accept `stepApprovals: ApprovalRequestStepApproval[]` prop
- If provided: render dynamic steps (step name, status icon, actor name, date, notes)
- If empty: fall back to existing hardcoded 3-step display (backward compat for legacy requests)
- Always prepend "Requester" as step 0

### 3b. `src/app/approval-requests/[id]/page.tsx` (server component)
- Compute `canApproveCurrentStep` via service function instead of simple role check
- Pass `step_approvals`, current step info to client component

### 3c. `src/components/approval-request/ApprovalRequestPageClient.tsx`
- Pass `step_approvals` to `ApprovalRouteTimeline`
- Show approve/reject only when user can approve the **current step** (not any manager on any pending request)
- Display current step indicator (e.g., "Step 2 of 3: Accountant Review")

### 3d. `src/components/approval-request/approval-actions.tsx`
- Add "Need Revision" button (action exists in backend but not exposed in UI)
- Show current step name for context in the dialog

---

## Phase 4: Edge Cases

| Scenario | Handling |
|----------|----------|
| No matching route | `route_id` stays null, fallback to hardcoded flow, timeline shows default 3 steps |
| Route deleted while request in-flight | `ON DELETE SET NULL` on FK; snapshotted steps in `approval_request_step_approvals` are unaffected |
| Request resubmission after need_revision | Re-run route matching, delete + re-snapshot steps, reset `current_step_order = 1` |
| Optional (non-required) steps | Auto-skip and advance; show "skipped" indicator in timeline |
| Draft → pending transition | Trigger route matching in both `createApprovalRequest` and `updateApprovalRequest` paths |

---

## Critical Files

| File | Action |
|------|--------|
| `supabase/migrations/` (new file) | New migration for schema changes + RLS |
| `src/types/approvalRequest.ts` | Add `ApprovalRequestStepApproval`, extend `ApprovalRequest` |
| `src/types/activityLog.ts` | Add step-level activity actions |
| `src/service/approvalRequest/approvalRouteMatching.ts` | **New** — route matching + multi-step logic |
| `src/service/approvalRequest/approvalRequest.ts` | Integrate route matching into create/status-update/get |
| `src/service/approvalRoute/approvalRoute.ts` | Reuse existing `getApprovalRoutes` for matching |
| `src/components/approval-request/ApprovalRouteTimeline.tsx` | Dynamic step rendering |
| `src/components/approval-request/ApprovalRequestPageClient.tsx` | Step-aware approve/reject visibility |
| `src/components/approval-request/approval-actions.tsx` | Add need_revision, step context |
| `src/app/approval-requests/[id]/page.tsx` | Compute step-level authorization |

## Implementation Status

All phases implemented. TypeScript compilation passes with zero errors.

### Files Created
- `supabase/migrations/20260316000000_integrate_approval_routes_with_requests.sql` — DB migration
- `src/service/approvalRequest/approvalRouteMatching.ts` — Route matching + multi-step logic

### Files Modified
- `src/types/approvalRequest.ts` — Added `ApprovalRequestStepApproval`, extended `ApprovalRequest`
- `src/types/activityLog.ts` — Added `submission_step_approve`, `submission_step_reject`
- `src/service/approvalRequest/approvalRequest.ts` — Integrated route matching into create/get/status-update/update
- `src/components/approval-request/ApprovalRouteTimeline.tsx` — Dynamic step rendering with skipped state
- `src/components/approval-request/ApprovalRequestPageClient.tsx` — Step-aware approve/reject, passes stepApprovals to timeline
- `src/components/approval-request/approval-actions.tsx` — Added Need Revision button, step context label
- `src/app/approval-requests/[id]/page.tsx` — Step-level authorization via `canUserApproveCurrentStep`
- `src/providers/LanguageProvider.tsx` — Added i18n keys for need revision and step labels

### Remaining: Run migration on Supabase
```bash
npx supabase db push
# or apply the migration manually in Supabase dashboard
```

## Verification

1. **Route matching**: Create routes with different conditions → submit requests with various category/department/amount → verify correct route is matched
2. **Multi-step flow**: Submit request → approve step 1 as manager → verify it advances to step 2 → approve as accountant → verify request is fully approved
3. **Rejection**: Reject at any step → verify request is rejected, timeline shows which step rejected
4. **Need revision**: Request revision → verify all steps reset → resubmit → verify fresh route matching
5. **No route fallback**: Submit request that matches no route → verify hardcoded flow still works
6. **RLS**: Test as manager, accountant, employee → verify each can only see/act on what they should
7. **Timeline UI**: Verify dynamic steps render correctly with actor names, dates, and status icons
