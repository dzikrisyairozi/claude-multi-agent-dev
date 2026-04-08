# Revision Flow Enhancement — Visual Timeline + Localization

## Problem

When an approver sends back a submission for revision (`need_revision`), the current UI has gaps:

1. **Status not localized** — Shows raw `NEED_REVISION` instead of a friendly label
2. **Timeline doesn't show revision state** — All reset steps appear as plain "PENDING" with no indication that a revision occurred or where it came from
3. **No visual distinction** between the two revision modes (restart from first vs. restart from current step)

## Two Revision Modes

The system supports two revision modes via the `restartFromFirst` checkbox in the approval dialog:

### Mode A: Restart from Current Step (`restartFromFirst = false`, default)
- Resets only the current step (and subsequent steps) to pending
- Prior approvals are preserved
- After requester resubmits, flow re-enters at the SAME step that sent back
- **Use case**: "Fix the typo, I'll re-check it" — only the sending approver needs to re-review

### Mode B: Restart from Step 1 (`restartFromFirst = true`)
- Resets ALL steps to pending
- After requester resubmits, flow starts from step 1
- **Use case**: "The fundamentals changed, everyone needs to re-review"

For single-step approval routes, both modes are identical.

## Design: Red Line Timeline Visual

### When status = `need_revision`

The timeline stepper shows which step triggered the revision and the scope of the reset.

#### Mode A (restart from current step only):

```
┌─────────┐       ┌─────────────────┐        ┌──────────────────┐
│    ✓    │ ───── │       ✓         │ ─RED── │       ⚠          │
│Requester│       │ Approver Review │        │ Accounting Check │
│COMPLETED│       │   COMPLETED     │        │REVISION REQUIRED │
└─────────┘       └─────────────────┘        └──────────────────┘
  (blue)              (blue)                      (RED)
```

- Source step (Accounting): RED node, RED subtitle "REVISION REQUIRED"
- Line from previous step TO source step: RED
- Prior approved steps: remain blue/green (their approvals are preserved)

#### Mode B (restart from step 1):

```
┌─────────┐       ┌─────────────────┐        ┌──────────────────┐
│    ✓    │ ─RED─ │       ⏳        │ ─RED── │       ⚠          │
│Requester│       │ Approver Review │        │ Accounting Check │
│COMPLETED│       │     PENDING     │        │REVISION REQUIRED │
└─────────┘       └─────────────────┘        └──────────────────┘
  (blue)     RED      (amber)          RED       (RED)
                 "Revision Required"
```

- Source step (Accounting): RED node, RED subtitle "REVISION REQUIRED"
- ALL connecting lines from source step backward to step 1: RED
- All reset steps: shown as PENDING (amber)
- Red text "Revision Required" label above the backward red lines

### After Resubmit

When requester resubmits, revision fields are cleared. Timeline returns to normal pending state.

## Data Model Change

Add to `approval_requests` table:

```sql
ALTER TABLE approval_requests
  ADD COLUMN revision_source_step_order integer,
  ADD COLUMN revision_restart_from_first boolean;
```

- **Set** when `processStepApproval()` handles `need_revision`
- **Cleared** (set to NULL) when requester resubmits (`updateApprovalRequest()` with status change from `need_revision` → `pending`)

## Status Localization Fix

Current `approval.statusLabel`: `"Status: {status}"` — passes raw DB value.

Fix: Map status values to localized display strings:

| DB Value | EN Display | JA Display |
|----------|-----------|-----------|
| draft | Draft | 下書き |
| pending | Pending Approval | 承認待ち |
| approved | Approved | 承認済み |
| rejected | Rejected | 却下 |
| need_revision | Need Revision | 要修正 |
| cancelled | Cancelled | キャンセル済み |

## Activity Log (Already Working)

The activity log already tracks revisions:
- `submission_need_revision` action with step metadata
- `submission_resubmit` action with field-level diffs (old vs new values)
- Comments from approver shown in "SENT BACK" entries

No changes needed to the activity log.

## Resubmit Flow (Already Working)

The resubmit button already appears for the submission owner when status is `need_revision`. The SubmissionDialog handles edit mode and:
- Updates form fields + documents
- Sets status to `pending`
- Re-matches approval route
- Logs `submission_resubmit` activity with field changes
- Notifies admins

## Timeline Component Color Mapping

| Step Status | Node Color | Icon | Line Color |
|-------------|-----------|------|-----------|
| completed | bg-sky-50, text-sky-500 | CheckCircle2 | bg-sky-300 |
| pending (current) | bg-amber-50, text-amber-500 | Clock | bg-slate-200 |
| pending (not current) | bg-slate-50, text-slate-300 | Clock | bg-slate-200 |
| rejected | bg-red-50, text-red-500 | XCircle | bg-slate-200 |
| skipped | bg-amber-50, text-amber-500 | SkipForward | bg-slate-200 |
| **need_revision (NEW)** | **bg-red-50, text-red-500** | **AlertTriangle** | **bg-red-300** |

## Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/20260404*` | NEW migration for revision tracking fields |
| `src/types/approvalRequest.ts` | Add `revision_source_step_order`, `revision_restart_from_first` |
| `src/service/approvalRequest/approvalRouteMatching.ts` | Set revision fields on need_revision |
| `src/service/approvalRequest/approvalRequest.ts` | Clear revision fields on resubmit |
| `src/components/approval-request/ApprovalRouteTimeline.tsx` | Red line visual + revision step status |
| `src/components/approval-request/ApprovalRequestPageClient.tsx` | Pass revision props to timeline |
| `src/providers/LanguageProvider.tsx` | Fix status label mapping + add revision i18n |

## Acceptance Criteria

- [ ] Status banner shows "Status: Need Revision" (not "Status: need_revision")
- [ ] All status values are properly localized in both EN and JA
- [ ] Timeline shows RED node for the step that triggered revision
- [ ] RED "REVISION REQUIRED" subtitle on the source step
- [ ] Mode A: Red line only from previous step to source step; prior approvals stay blue
- [ ] Mode B: Red lines from source step all the way back to step 1
- [ ] After resubmit, timeline returns to normal pending state
- [ ] Existing activity log + resubmit flow unaffected
