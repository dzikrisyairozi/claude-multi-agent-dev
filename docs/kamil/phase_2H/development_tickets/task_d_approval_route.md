# TASK D — 承認ルート機能拡張 / Approval Route Enhancements (CRUD Only)

**Priority**: Critical
**Assignee**: Syahiid (core), Miftah (updates + integration)
**Effort**: L (Large) — DB changes, service rewrite, complex UI
**Status**: Implemented — multi-assignee + AND/OR conditions done, FK fix applied

---

## Current State

### What Exists:
- **Service**: `src/service/approvalRoute/approvalRoute.ts` — full CRUD (get/create/update/delete)
- **Page**: `src/app/admin/approval-routes/page.tsx` — two-panel split (list left, detail right)
- **Step Editor**: `approval-route-steps-editor.tsx` — add/remove steps with single assignee
- **Conditions Editor**: `approval-route-conditions-editor.tsx` — categories, departments, amount range
- **Types**: `src/types/approvalRoute.ts` — `ApprovalRoute`, `ApprovalRouteStep`, `ApprovalRouteCondition`
- **CSV Import**: `import-csv-dialog.tsx` — bulk import routes

### Current Step Structure:
```typescript
ApprovalRouteStep {
  step_order, name,
  approver_role: ApprovalRouteApproverRole | null,   // single role
  approver_user_id: string | null,                     // single user
  approver_position_id: string | null,                 // single position
  approver_department_id: string | null,               // single department
  is_required: boolean
}
```
- Each step can assign to ONE of: role, user, position, or department
- **No multi-assignee support** — cannot assign step to multiple individual users

### Current Condition Structure:
```typescript
ApprovalRouteCondition {
  min_amount?: number | null,
  max_amount?: number | null,
  departments?: string[],
  categories?: ApprovalRouteCategory[]
}
```
- Conditions are stored as JSONB on the `approval_routes` table
- **Implicitly AND** — all conditions must match, no OR logic

## Scope

### 1. Individual Approver Assignment (up to 10 per step)
- A step can now be assigned to **multiple individual users** (max 10)
- Semantics: ANY one of the assigned users can approve (OR logic within a step)
- Existing single-assignee still works (backward compatible)
- UI: Multi-user picker with chip/tag display, limit indicator

### 2. AND/OR Conditional Triggers
- Support explicit AND/OR between condition groups
- Example: `(department = "IT" AND amount > 100,000) OR (category = "purchasing")`
- Structure: Array of condition groups with `logic` field between them

### 3. CRUD Only — No Integration
- This task builds the admin UI for configuring routes
- Route matching at submission time is Task E's scope

## Implementation Steps

### Step 1: DB Migration — Multi-Assignee (DONE)
```sql
-- Migration: 20260327100000_approval_route_multi_assignee.sql
CREATE TABLE approval_route_step_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL REFERENCES approval_route_steps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),  -- FK to profiles (fixed from auth.users)
  created_at timestamptz DEFAULT now(),
  UNIQUE(step_id, user_id)
);
ALTER TABLE approval_routes ADD COLUMN condition_logic text DEFAULT 'and';
```

### Step 1b: FK Fix (DONE)
```sql
-- Migration: 20260327500000_fix_step_assignees_fk.sql
-- Changed FK from auth.users to profiles for PostgREST join compatibility
```

### Step 3: Update Types (DONE)
- `ApprovalRouteStep.assignees?: StepAssignee[]`
- `ApprovalRoute.condition_logic: "and" | "or"`
- `CreateApprovalRouteStepParams.assignee_user_ids?: string[]`

### Step 4: Update Service (DONE)
- `getApprovalRoute/s()` — joins `approval_route_step_assignees` → `profiles`
- `createApprovalRoute()` — inserts step assignees after steps
- `updateApprovalRoute()` — deletes old steps (cascades assignees), inserts new

### Step 5: Update Step Editor UI (DONE)
- "By Member" option in Assigned Type selector
- Multi-user picker: chips, search, Select All/Deselect All, max 10
- `getActiveProfiles()` fetches users for picker

### Step 6: Update Conditions Editor UI (DONE)
- AND/OR toggle button group (shown when 2+ conditions)
- Dynamic "And"/"Or" labels between condition rows

### Step 7: i18n (DONE)
- Translation keys added for multi-assignee and condition logic

## Acceptance Criteria

- [ ] Route step can be assigned to multiple individual users (1-10)
- [ ] Multi-user picker shows searchable user list
- [ ] Selected users displayed as chips/tags with remove button
- [ ] "10/10" limit indicator shown, Add button disabled at limit
- [ ] Conditions can use AND or OR logic (toggle)
- [ ] Existing routes with single assignee still display and work correctly
- [ ] Route list page shows assignee info (e.g., "3 users" or "Accounting role")
- [ ] Saving route with multi-assignee persists correctly
- [ ] Editing route with multi-assignee loads correctly
- [ ] CSV import still works (backward compatible)

## Test Scenarios

| # | Scenario | Expected Result |
|---|----------|----------------|
| 1 | Create step with 3 individual users | All 3 saved and displayed as chips |
| 2 | Try to add 11th user to a step | "Maximum 10" warning, Add disabled |
| 3 | Remove a user chip from step | User removed, count decremented |
| 4 | Save route with multi-assignee steps | Persists in DB, reload shows same |
| 5 | Edit existing single-user step | Works as before (backward compatible) |
| 6 | Set condition logic to OR | Visual changes to "Any condition" |
| 7 | Load route with old AND conditions | Defaults to AND, no breaking change |
| 8 | Create route with OR conditions | condition_logic = 'or' saved |
| 9 | View route as Accounting | Can view but not edit (view_only) |
| 10 | Search users in multi-picker | Filtered by typed text |

## Edge Cases & Gotchas

- **No backward compat needed**: Project is pre-production. Built fresh with multi-assignee from start.
- **Mix of assignment types**: Step 1 = role-based, Step 2 = multi-individual. Both coexist.
- **FK fix**: `approval_route_step_assignees.user_id` must reference `profiles(id)` not `auth.users(id)` for PostgREST joins.
- **CSV import**: Does not support multi-assignee yet (only role-based steps).

## Code References

| File | Purpose |
|------|---------|
| `src/types/approvalRoute.ts` | Types to extend |
| `src/service/approvalRoute/approvalRoute.ts` | Service to modify |
| `src/app/admin/approval-routes/page.tsx` | Main page (two-panel) |
| `src/app/admin/approval-routes/_components/approval-route-steps-editor.tsx` | Step editor to modify |
| `src/app/admin/approval-routes/_components/approval-route-conditions-editor.tsx` | Conditions editor |
| `src/app/admin/approval-routes/_components/approval-route-detail-form.tsx` | Main form |

## Permission Matrix Reference

- ARC-001: Create & edit approval routes — Admin only
- ARC-002: View approval route configuration — Accounting (view_only), Admin (granted)
- ARC-003: Configure conditional routing — Accounting (view_only), Admin (granted)

## Dependencies

- K, L (Dept/Position) — soft dependency, assignment by position/dept already works
- **Blocks**: Task E (route matching needs multi-assignee + AND/OR), Task H (escalation timeout config)
