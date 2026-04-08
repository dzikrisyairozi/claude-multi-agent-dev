# TASK F — 稟議差戻し（修正依頼） / Submission Remand (Revision Request)

**Priority**: Critical
**Assignee**: Syahiid
**Effort**: L (Large) — Revision flow, change tracking, resubmission logic
**Status**: Partially exists — status enum + button ready, needs full flow

---

## Current State

### What Exists:
- `need_revision` status in approval_status enum (DB + TypeScript)
- `ApprovalActions` component (`src/components/approval-request/approval-actions.tsx`) already has "Send for Revision" button
- `updateApprovalRequestStatus()` handles setting `need_revision` status
- Notes/comment field in approval action dialog
- `processStepApproval()` in route matching handles `need_revision` at step level

### What's Missing:
- No revision tracking (snapshot before edit, diff after resubmit)
- No dedicated "resubmit after revision" flow
- Requester cannot edit a submission in `need_revision` state (dialog only opens for draft/edit)
- No activity log entries for revision comments or diffs

## Figma Design Description

**Page**: Submission Detail > "Send for Revision" action (node 2116:38225)
- Submission detail page with status "Pending" and step indicator "Waiting for manager approval"
- Three action buttons in header: Reject (red), Send for Revision (orange), Approve (green)
- **Send Revision Request dialog**:
  - Title: "Send Revision Request" (red/orange text)
  - Body: "Are you sure you want to send revision to the following request?"
  - **Comment field** (required): "Enter Comment for revision" placeholder, textarea
  - Warning: "This action cannot be undone."
  - Footer: Cancel (outlined) | Confirm (orange button)
- Background shows submission detail: title, priority, department, vendor, category, payment dates, reason, purpose, items & services table with subtotal/tax/total

## Implementation Steps

### Step 1: DB Migration — Revision Tracking
```sql
CREATE TABLE approval_request_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id uuid NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  revision_number integer NOT NULL DEFAULT 1,
  sent_back_by uuid REFERENCES auth.users(id),
  sent_back_at timestamptz DEFAULT now(),
  sent_back_comment text NOT NULL,
  sent_back_step_order integer,
  resubmitted_by uuid REFERENCES auth.users(id),
  resubmitted_at timestamptz,
  changes_snapshot jsonb,  -- { field: { old: value, new: value } }
  created_at timestamptz DEFAULT now()
);

-- RLS: same as approval_requests
```

### Step 2: Send for Revision Flow
Update `processStepApproval()` when status = `need_revision`:
1. Set step status to "sent_back" (or keep as custom state)
2. Set submission status to `need_revision`
3. Record revision: insert into `approval_request_revisions` with comment + step_order
4. Take snapshot of current field values (amount, items, vendor, etc.)
5. Fire-and-forget: notify requester
6. Fire-and-forget: log activity with `submission_need_revision` action

### Step 3: Requester Sees Revision Comment
- On detail page, when status is `need_revision`:
  - Show banner: "Revision requested by [Approver Name]"
  - Show revision comment in a highlighted card
  - Show "Edit & Resubmit" button

### Step 4: Resubmit After Revision
Create `resubmitRevision()` server action:
1. Verify user is the requester (owner)
2. Verify status is `need_revision`
3. Compute diff: compare current values with snapshot (old_values vs new form values)
4. Update submission fields
5. Set status back to `pending`
6. Reset step approvals from the sent-back step onward (not from scratch)
7. Update revision record with `resubmitted_at`, `resubmitted_by`, `changes_snapshot`
8. Fire-and-forget: notify approver
9. Fire-and-forget: log activity with `old_values`/`new_values` for Timeline diff

### Step 5: Allow Editing in need_revision State
- `SubmissionDialog.tsx`: open in edit mode when status is `need_revision`
- Pre-populate all fields from current submission data
- On submit: call `resubmitRevision()` instead of `updateApprovalRequest()`

### Step 6: i18n
Translation keys:
- `revision.sendRequest`, `revision.comment`, `revision.commentPlaceholder`
- `revision.requestedBy`, `revision.editResubmit`, `revision.resubmitted`
- `revision.cannotUndo`

## Acceptance Criteria

- [ ] Approver can "Send for Revision" with required comment
- [ ] Submission status changes to `need_revision`
- [ ] Requester sees revision comment on detail page
- [ ] Requester can click "Edit & Resubmit" to open edit dialog
- [ ] Resubmitted request re-enters approval at the step that sent it back (not from step 1)
- [ ] Steps after the sent-back step are reset to "pending"
- [ ] Change diff is stored (old values vs new values in JSONB)
- [ ] Notification sent to requester on revision request
- [ ] Notification sent to approver on resubmission
- [ ] Activity log records both send-back and resubmission with actor info

## Test Scenarios

| # | Scenario | Expected Result |
|---|----------|----------------|
| 1 | Approver sends revision without comment | Validation error: comment required |
| 2 | Approver sends revision with comment | Status → need_revision, notification sent |
| 3 | Requester views need_revision submission | Sees revision comment + Edit button |
| 4 | Requester edits amount and resubmits | Status → pending, re-enters at correct step |
| 5 | After resubmit, step 1 is still approved | Only sent-back step+ are reset |
| 6 | Multiple revision cycles | Each tracked with revision_number |
| 7 | Admin converts rejection to remand | Status changes from rejected to need_revision |
| 8 | Non-owner tries to resubmit | Permission denied |

## Edge Cases & Gotchas

- **Step re-entry**: When resubmitting, the approval chain resumes at the step that sent it back. E.g., if Step 2 sent back, Step 1 stays approved, Step 2+ reset to pending, `current_step_order` set to Step 2.
- **Multiple revisions**: Support revision_number incrementing. Each cycle gets its own revision record.
- **Concurrent approval**: While in `need_revision`, other approvers should not see action buttons.
- **Draft vs revision edit**: Distinguish between editing a draft (first submission) and editing after revision (resubmission). The latter triggers `resubmitRevision()`.
- **APR-007 (Convert rejection to remand)**: Admin-only action to change `rejected` → `need_revision`. Separate from normal revision flow.

## Code References

| File | Purpose |
|------|---------|
| `src/components/approval-request/approval-actions.tsx` | Already has need_revision action type |
| `src/service/approvalRequest/approvalRequest.ts` | `updateApprovalRequestStatus()`, `processStepApproval()` |
| `src/service/approvalRequest/approvalRouteMatching.ts` | `processStepApproval()` handles step status |
| `src/components/approval-request/SubmissionDialog.tsx` | Form to open in edit mode |
| `src/components/approval-request/ApprovalRequestPageClient.tsx` | Detail page tabs |
| `src/service/activityLog/activityLog.ts` | `logActivity()` with old_values/new_values |

## Permission Matrix Reference

- APR-002: Send for revision — Approver/Requester/Accounting (assigned_only), Admin (granted)
- APR-007: Convert rejection to remand — Admin only

## Dependencies

- **Requires**: Task E (submission must be correctly routed with multi-step)
- **Blocks**: Task G (timeline needs revision diff data)
