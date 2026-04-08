# TASK J — 承認取消（承認済みステージの取消） / Cancel Approved Stage

**Priority**: High
**Assignee**: Syahiid
**Effort**: M (Medium) — New dialog, service extension, DB for reason tracking
**Status**: New feature — current cancel only works on whole submissions

---

## Current State

### What Exists:
- `CancelRequestDialog.tsx` — cancels entire submission (status → "cancelled"), optional notes
- `cancel_approval` permission: Admin only (APR-006)
- `cancelled` status in approval_status enum
- Step approval tracking with status per step

### What's Missing:
- Cannot cancel a **specific approved stage** (roll back one step)
- No reason category system for cancellation
- No "Cancel Approval" action button on detail page (only "Cancel Request" exists)

## Figma Design Description

**Dialog**: Cancel Approval (node 2199:46776)
- Title: "Cancel Approval"
- Subtitle: "Roll back an approved stage · REQ-00002"
- **Info box** (orange/yellow background):
  - "**What Cancel Approval does**"
  - "Cancelling an approval rolls back that stage's decision. The submission re-enters the approval chain from the cancelled stage for re-review. This is not a rejection, the submission will stays active."
- **Select approval to cancel**: Radio list of completed stages
  - "Stage 1" — Employee B (Approver badge) — January 15, 2026 02:22 PM
- **Reason Category** (required, radio list):
  - "Wrong Amount Approved" — "The approved amount was incorrect"
  - "Wrong Approver Acted" — "The person who approved was not authorized to act at this stage"
  - "Policy Violation" — "The approval was made in violation of company procurement policy"
  - "New Information Available" — "Critical information emerged after approval that changes the decision"
  - "Other" — "Provide a custom reason below"
- Footer: Cancel (outlined) | Continue (blue button)

## Implementation Steps

### Step 1: DB Migration
```sql
-- Cancellation reason categories (reference table)
CREATE TABLE cancellation_reason_categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0
);

INSERT INTO cancellation_reason_categories (id, name, description, sort_order) VALUES
  ('wrong_amount', 'Wrong Amount Approved', 'The approved amount was incorrect', 1),
  ('wrong_approver', 'Wrong Approver Acted', 'The person who approved was not authorized to act at this stage', 2),
  ('policy_violation', 'Policy Violation', 'The approval was made in violation of company procurement policy', 3),
  ('new_information', 'New Information Available', 'Critical information emerged after approval that changes the decision', 4),
  ('other', 'Other', 'Provide a custom reason below', 5);

-- Track cancellation on step approvals
ALTER TABLE approval_request_step_approvals
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN cancelled_by uuid REFERENCES auth.users(id),
  ADD COLUMN cancellation_reason text,
  ADD COLUMN cancellation_notes text;
```

### Step 2: Service
Add to `src/service/approvalRequest/approvalRequest.ts`:
```typescript
async function cancelApprovalStage(
  requestId: string,
  stepApprovalId: string,
  reasonCategory: string,
  notes?: string
) {
  // 1. Verify permission: checkPermission("cancel_approval")
  // 2. Verify step is actually "approved"
  // 3. Mark step as cancelled: set cancelled_at, cancelled_by, cancellation_reason
  // 4. Reset step status back to "pending"
  // 5. Reset ALL subsequent steps (step_order > this step) back to "pending"
  // 6. Update request: current_step_order = this step's order, status = "pending"
  // 7. Log activity: "approval_cancelled" with reason
  // 8. Notify: original approver + requester
}
```

### Step 3: New Dialog Component
Create `src/components/approval-request/CancelApprovalDialog.tsx`:
- Props: `requestId`, `stepApprovals` (completed ones only)
- Step 1: Select which approved stage to cancel (radio list)
- Step 2: Select reason category (radio list)
- Step 3: If "Other", show text input for custom reason
- Confirm → calls `cancelApprovalStage()`

### Step 4: Add Action Button to Detail Page
On `ApprovalRequestPageClient.tsx`:
- Show "Cancel Approval" option (in "..." menu or as button) for:
  - Users with `cancel_approval` permission (Admin only)
  - Submissions that have at least one approved step

### Step 5: i18n
Translation keys:
- `cancelApproval.title`, `cancelApproval.subtitle`, `cancelApproval.whatItDoes`
- `cancelApproval.selectStage`, `cancelApproval.reasonCategory`
- All 5 reason categories + descriptions

## Acceptance Criteria

- [ ] Admin can access "Cancel Approval" from submission detail (... menu)
- [ ] Dialog shows only completed (approved) stages for selection
- [ ] Each stage shows: stage name, approver name, approval date
- [ ] Reason category is required (5 predefined + Other)
- [ ] "Other" shows custom text input
- [ ] Cancelling rolls back selected stage to "pending"
- [ ] All subsequent stages after cancelled one are reset to "pending"
- [ ] Submission status reverts to "pending", current_step_order updated
- [ ] Activity log records cancellation with reason + category
- [ ] Notifications sent to original approver + requester
- [ ] Only Admin can perform this action (APR-006)

## Test Scenarios

| # | Scenario | Expected Result |
|---|----------|----------------|
| 1 | Cancel Stage 1 of 3-step route | Stage 1, 2, 3 all reset to pending |
| 2 | Cancel Stage 2 of 3-step route | Stage 1 stays approved, Stage 2, 3 reset |
| 3 | Select "Wrong Amount" reason | Saved with reason category |
| 4 | Select "Other" with custom text | Custom text saved as notes |
| 5 | Non-admin tries cancel | Permission denied |
| 6 | Try to cancel a pending step | Not shown in selection list |
| 7 | After cancellation, approver re-approves | Normal approval flow continues |

## Edge Cases & Gotchas

- **Cascade reset**: Cancelling Stage 2 of 5 must reset stages 2, 3, 4, 5 — all go back to "pending".
- **Current step order**: After cancel, `current_step_order` must be set to the cancelled step, not step 1.
- **Already fully approved**: If all steps approved + submission status is "approved", cancelling a stage should revert submission status to "pending".
- **Concurrent cancel**: Two admins cancel different stages simultaneously. Use DB-level locking.
- **Notification wording**: Clear that this is a stage cancel, not full submission rejection.

## Code References

| File | Purpose |
|------|---------|
| `src/components/approval-request/CancelRequestDialog.tsx` | Existing cancel (for reference, NOT reuse — different purpose) |
| `src/service/approvalRequest/approvalRequest.ts` | Service to extend |
| `src/components/approval-request/ApprovalRequestPageClient.tsx` | Detail page to add action |
| `src/components/approval-request/ApprovalRequestOptions.tsx` | Options menu (... button) |

## Permission Matrix Reference

- APR-006: Cancel approval — Admin only

## Dependencies

- **Requires**: Task E (submissions with completed multi-step approval)
