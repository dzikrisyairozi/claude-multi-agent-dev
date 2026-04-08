# Task E — QA Test Results

## Test Run 1 — 2026-04-01

### Environment
- Next.js 16.1.6 (Turbopack) on localhost:3000
- Supabase: uqbuurxicvateyryeqld (nano, ap-southeast-1 Singapore)
- Accounts: admin, requester, approver, accounting (seeded dev users)

### Results

| # | Test | Status | Details |
|---|------|--------|---------|
| 1 | Login + Reset Data | **PASS** | Dev-tools reset completed, all counts 0 |
| 2 | Create Approval Route (Admin) | **PASS** | "Purchasing Approval Route" created: Step 1 (Approver role) → Step 2 (Accounting role) |
| 3 | Category Types (Admin) | **PASS** | All 4 categories visible: Contract (0), Purchasing (1), Expenses (1), Other (1) sub-types |
| 4 | Submit a Ringi (Requester) | **FAIL** | `category_type_id` column not found in PostgREST schema cache |
| 5 | Category Switching | **PASS** | Sub-category dropdown shows/hides correctly per parent category |
| 6 | Approver Visibility | **BLOCKED** | Blocked by Test 4 |
| 7 | Accounting Visibility | **BLOCKED** | Blocked by Test 4 |

### Test Run 2 & 3 — After Schema Cache Reload + Supabase Restart

Same results. `NOTIFY pgrst, 'reload schema'` and full Supabase project restart did not resolve the schema cache issue. The `category_type_id` column added by migration `20260401000000_task_e_submission_integration.sql` is not recognized by PostgREST.

---

## Bugs Found

### Bug 1 — CRITICAL: PostgREST schema cache does not recognize `category_type_id`

- **Error**: `"Could not find the 'category_type_id' column of 'approval_requests' in the schema cache"`
- **Impact**: 100% of submission creation blocked. No ringi can be created or saved as draft.
- **Root Cause**: Migration `20260401000000` added `category_type_id uuid REFERENCES category_types(id)` to `approval_requests`. `supabase db push` confirmed applied. Both `NOTIFY pgrst, 'reload schema'` and full project restart failed to refresh the cache.
- **Workaround**: Only include `category_type_id` in the INSERT payload when it has a non-null value. Skip the field entirely when empty to avoid the schema cache lookup.
- **File**: `src/service/approvalRequest/approvalRequest.ts` line 431

### Bug 2 — MEDIUM: Error toast hidden behind submission dialog

- **Description**: When submission fails, the sonner toast appears at bottom-right but the dialog auto-scrolls to bottom (Formik scroll-to-first-error behavior), making the toast invisible to the user.
- **Impact**: Silent failure — user sees form scroll but gets no visible error feedback.
- **File**: `src/components/approval-request/SubmissionDialog.tsx`

### Bug 3 — MEDIUM: Payment Method default not registered as form value

- **Description**: Payment Method visually shows "Bank Transfer" as default but the form value is empty. Submitting without re-selecting triggers "Payment Method is required" validation error.
- **Impact**: Confusing UX — user sees a value but gets a required error.
- **Workaround**: User must open dropdown and explicitly click "Bank Transfer".
- **File**: `src/components/approval-request/SubmissionDialog.tsx`

### Bug 3b — LOW: Route conditions "No conditions" on card

- **Description**: Newly created route shows "No conditions" on the card view, even though conditions were configured during creation. May be a condition save issue or display logic bug.
- **File**: `src/app/admin/approval-routes/_components/approval-route-cards.tsx`

---

## Performance Issues Found & Fixed

### Fix 1: Dev-tools `queryClient.clear()` causing thundering herd
- **Root Cause**: `dev-tools/page.tsx` called `queryClient.clear()` after reset, nuking all TanStack Query cache and forcing all mounted components to re-fetch simultaneously.
- **Fix**: Removed `queryClient.clear()` — dev-tools only needs `fetchStats()` for its own data.

### Fix 2: Sidebar Link prefetch storm
- **Root Cause**: `MainSidebar.tsx` `<Link href={href}>` without `prefetch={false}`. Next.js prefetched ALL 7+ admin pages simultaneously on every page load.
- **Fix**: Added `prefetch={false}` to sidebar `<Link>`.

### Fix 3: Turbopack chunk compilation stuck
- **Root Cause**: Corrupted `.next` cache caused `node_modules_21bbcdbc._.js` chunk to hang indefinitely on dev-tools page.
- **Fix**: One-time `rm -rf .next` cleared the corrupted cache.

---

## What Passed (Verified Working)

1. Login/logout for all 4 roles (admin, requester, approver, accounting)
2. Admin settings navigation (Approval Routes, Category Types)
3. Approval route CRUD — create route with conditions + multi-step workflow
4. Category types display with parent categories
5. Sub-category dropdown — dynamically shows/hides based on parent category selection
6. Submission dialog form — all fields render correctly, items table calculates totals (5 x 200,000 = 1,000,000)
7. Approval route preview timeline renders in submission dialog (Requester → Approver → Accounting)
8. Role-based dashboard navigation (different nav items per role)

---

## Next Steps

1. **Fix Bug 1**: Conditionally include `category_type_id` in insert payload (skip when null)
2. **Fix Bug 2**: Show inline error in dialog or ensure toast is visible above dialog
3. **Fix Bug 3**: Set Payment Method default value in formik initialValues
4. **Re-run Tests 4-7**: Submission, approver/accounting visibility, approval flow
