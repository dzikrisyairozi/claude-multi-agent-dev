# Feature: Draft Status for Ringi Submission

## Overview

Add a "draft" status to the Ringi (approval request) submission workflow. Users can save incomplete forms as drafts without field validation, then later continue editing and submit when ready. This enables a two-step creation flow: **Save as Draft** (no validation) and **Submit** (full validation).

## User Stories

- **As a requester**, I want to save an incomplete submission as a draft so I can finish it later.
- **As a requester**, I want to open a draft and continue editing it so I can complete the form at my own pace.
- **As a requester**, I want to submit a draft when it's complete so it enters the approval workflow.
- **As a requester**, I want to delete a draft I no longer need.

---

## Status Transition

```
                   ┌──────────┐
       Create      │          │   Edit/Save
      ──────────>  │  DRAFT   │ <──────────┐
                   │          │ ───────────┘
                   └────┬─────┘
                        │ Submit (full validation)
                        v
                   ┌──────────┐
                   │ PENDING  │ ──> (existing approval flow)
                   └──────────┘
```

- **Draft → Draft**: User edits and saves again (still draft)
- **Draft → Pending**: User clicks "Submit" and all required fields pass validation
- **Draft → Deleted**: User deletes the draft
- Drafts **cannot** be approved, rejected, or sent back (they are invisible to approvers)

---

## Scope

### In Scope
- Draft status for **manual form submission only**
- Two action buttons in SubmissionDialog: "Save as Draft" and "Submit"
- Draft bypasses all required field validation (only `title` required as minimum identifier)
- Full required field validation on "Submit" (current behavior)
- Editing existing drafts
- Deleting drafts
- Draft tab on the listing page (visible only to the owner)
- Draft card styling (distinct from other statuses)
- Draft count in the tab badge

### Out of Scope
- AI-assisted draft creation (chat → draft)
- Multi-step approval workflow changes
- Notifications for drafts
- Expired status
- Submitted vs Pending distinction (keep current `pending` for submitted items)

---

## Database Changes

### No migration needed

The `status` column on `approval_requests` is **TEXT** (not an enum), with a default of `'pending'`. Adding `"draft"` as a status value requires **no schema migration** — just passing `"draft"` when inserting.

### Consideration

The `getApprovalRequests` service currently returns all user requests. We need to ensure:
- **Managers** don't see other users' drafts in their approval queue (RLS already enforces user-level access, but manager-level queries should explicitly exclude `status = 'draft'`)
- The "All" tab count should **exclude** drafts by default (drafts are personal, not part of the approval pipeline)

---

## Service Layer Changes

### File: `src/service/approvalRequest/approvalRequest.ts`

#### 1. Modify `createApprovalRequest`

Add an optional `status` parameter to `CreateApprovalRequestParams`:

```typescript
// In CreateApprovalRequestParams (src/types/approvalRequest.ts):
export interface CreateApprovalRequestParams {
  // ... existing fields
  status?: "draft" | "pending"; // NEW - defaults to "pending"
}
```

In the service function, change the hardcoded `status: "pending"` to:

```typescript
status: params.status === "draft" ? "draft" : "pending",
```

#### 2. Modify validation in `createApprovalRequest`

When `status === "draft"`, relax server-side validation:
- **Draft**: Only `title` is required (as a minimum identifier to distinguish drafts in the list)
- **Pending/Submit**: Current full validation (title required, items validation, etc.)

#### 3. Update `EMPLOYEE_ALLOWED_STATUSES`

```typescript
const EMPLOYEE_ALLOWED_STATUSES = ["pending", "cancelled", "draft"];
```

This allows employees to set status back to `draft` if needed (e.g., "Unpublish" from pending back to draft — **optional, discuss with team**).

#### 4. Modify `getApprovalRequests`

Add a `status` filter parameter and optionally exclude drafts by default:

```typescript
// When fetching for approval queue (manager view):
// Exclude drafts — they are private to the owner
if (params?.excludeDrafts) {
  query = query.neq("status", "draft");
}
```

#### 5. Add `submitDraft` convenience function (optional)

```typescript
export async function submitDraft(id: string): Promise<{
  data: ApprovalRequest | null;
  error: string | null;
}> {
  // 1. Fetch the draft
  // 2. Validate all required fields are filled
  // 3. Update status from "draft" to "pending"
  // Return validation errors if fields are missing
}
```

---

## Type Changes

### File: `src/types/approvalRequest.ts`

```typescript
export interface CreateApprovalRequestParams {
  title: string;
  // ... all existing optional fields stay the same
  status?: "draft" | "pending"; // NEW
}
```

No change to `ApprovalRequest` interface — `status` is already `string`.

---

## UI Changes

### 1. SubmissionDialog — Two Buttons

**File:** `src/components/approval-request/SubmissionDialog.tsx`

#### Current (single button):
```
[ Cancel ]  [ Create Submission ]
```

#### New (two buttons):
```
[ Cancel ]  [ Save as Draft ]  [ Submit ]
```

#### Behavior:

| Button | Validation | Status Set | Button State |
|--------|-----------|------------|-------------|
| Save as Draft | None (only title non-empty recommended) | `"draft"` | Always enabled |
| Submit | Full Yup validation (all required fields) | `"pending"` | Enabled only when form is valid (optional) or validates on click |

#### Implementation approach:

- Use **two separate Yup schemas**:
  - `draftValidationSchema`: Only `title` required (minimal)
  - `submitValidationSchema`: Current full schema (all required fields)
- The `formik.handleSubmit` uses the submit schema (current behavior for the "Submit" button)
- "Save as Draft" calls a separate handler that:
  1. Validates against the draft schema (just title)
  2. Calls `createApprovalRequest({ ...values, status: "draft" })` or `updateApprovalRequest({ ...values, status: "draft" })`
  3. Shows success toast: "Draft saved"
  4. Closes dialog

#### When editing an existing draft:
```
[ Cancel ]  [ Save Draft ]  [ Submit ]
```
- "Save Draft" updates the draft (keeps `status: "draft"`)
- "Submit" updates and changes `status` to `"pending"` (with full validation)

#### When editing an already-submitted request (status !== "draft"):
```
[ Cancel ]  [ Update Submission ]
```
- Keep current behavior (no draft option for already-submitted items)

### 2. Listing Page — Draft Tab

**File:** `src/app/page.tsx`

Add a "Draft" tab to the existing tab bar:

```
[ All ] [ Draft ] [ Pending ] [ Approved ] [ Rejected ] [ Need Revision ] [ Cancelled ]
```

- **Icon:** `FileEdit` (from lucide-react, already imported in SubmissionDialog)
- **Color scheme:** Blue/slate (`bg-slate-50`, `text-slate-600`, `border-slate-100`)
- **Count badge:** Shows number of drafts
- **"All" tab**: Should **exclude** drafts from count (drafts are private, not part of approval pipeline). Alternatively, include drafts in "All" but this is a UX decision.

### 3. ApprovalRequestCard — Draft Styling

**File:** `src/components/approval-request/ApprovalRequestCard.tsx`

Add draft status to the existing style mappings:

```typescript
// getStatusColor
case "draft":
  return "bg-slate-100 text-slate-600 hover:bg-slate-100/80";

// getStatusLabel
case "draft":
  return t("status.draft");

// Card border-top color
request.status === "draft" ? "border-t-slate-400" : ...

// Card icon background
request.status === "draft" ? "bg-slate-50 text-slate-600" : ...
```

Add actions for draft cards:
- **Edit button**: Opens SubmissionDialog with draft data (continue editing)
- **Delete button**: Deletes the draft
- **No approval actions**: Drafts don't show approve/reject buttons

### 4. Detail Page (if applicable)

**File:** `src/app/approval-requests/[id]/page.tsx`

When viewing a draft detail page:
- Show an "Edit Draft" button
- Show a "Submit" button
- Show a "Delete Draft" button
- Don't show approval timeline (not yet in workflow)

---

## Required Fields Comparison

| Field | Draft | Submit |
|-------|-------|--------|
| Title | Required (minimal identifier) | Required |
| Category | - | Required |
| Priority | - | Required |
| Department | - | Required |
| Vendor Name | - | Required |
| Payment Schedule Date | - | Required |
| Payment Method | - | Required |
| Required By Date | - | Required |
| Reason for Purchase | - | Required |
| Purpose | - | Required |
| Amount | - | Required (calculated) |
| Items | - | Optional (but validated if present) |
| Description | - | Optional |
| Remarks | - | Optional |
| Attachments | - | Optional |

---

## Edge Cases & Rules

1. **Empty draft**: A draft with only a title should be saveable.
2. **Draft with partial data**: All fields save as-is, null/empty values are fine.
3. **Draft visibility**: Only the owner can see and edit their own drafts. Managers and approvers should never see other users' drafts.
4. **Draft in "All" tab**: Decision needed — either exclude drafts from "All" (recommended) or include them. If excluded, the "Draft" tab is the only way to see drafts.
5. **Duplicate drafts**: No restriction on number of drafts per user.
6. **Draft auto-save**: Out of scope for this iteration. Manual "Save as Draft" only.
7. **Submitting a draft with missing fields**: The "Submit" button validates against the full schema. If fields are missing, show validation errors (scroll-to-first-error behavior, same as current).
8. **Attachments on drafts**: Attachments can be added to drafts. Documents are linked via the junction table same as submitted requests.
9. **Cancelling a draft**: Not applicable — drafts are either edited, submitted, or deleted. "Cancel" status is only for submitted requests.

---

## i18n Keys to Add

```
status.draft = "Draft" / "下書き"
submission.submit.saveDraft = "Save as Draft" / "下書き保存"
submission.submit.saveDraftUpdate = "Save Draft" / "下書き保存"
submission.toast.draftSaveSuccess = "Draft saved successfully" / "下書きを保存しました"
submission.toast.draftSaveError = "Failed to save draft" / "下書きの保存に失敗しました"
submission.toast.draftDeleteSuccess = "Draft deleted" / "下書きを削除しました"
submission.toast.draftSubmitSuccess = "Draft submitted for approval" / "下書きを申請しました"
```

---

## Files to Modify

| # | File Path | Change |
|---|-----------|--------|
| 1 | `src/types/approvalRequest.ts` | Add `status?: "draft" \| "pending"` to `CreateApprovalRequestParams` |
| 2 | `src/service/approvalRequest/approvalRequest.ts` | Support `status: "draft"` in create, relax validation for drafts, update allowed statuses |
| 3 | `src/components/approval-request/SubmissionDialog.tsx` | Add "Save as Draft" button, dual validation schemas, draft-aware edit mode |
| 4 | `src/components/approval-request/ApprovalRequestCard.tsx` | Add draft status styling, edit/delete actions for drafts |
| 5 | `src/app/page.tsx` | Add "Draft" tab, exclude drafts from "All" count |
| 6 | `src/app/approval-requests/[id]/page.tsx` | Draft-specific actions on detail page |
| 7 | Language files (if externalized) | Add i18n keys for draft-related strings |

### New Files (if needed)
- None required. All changes fit within existing files.
- No new migration needed (status is TEXT).

---

## Implementation Order (Suggested)

1. **Types** — Add `status` to `CreateApprovalRequestParams`
2. **Service** — Modify `createApprovalRequest` to accept draft status, relax validation
3. **SubmissionDialog** — Add dual buttons and dual validation
4. **Listing page** — Add Draft tab
5. **Card component** — Add draft styling and actions
6. **Detail page** — Draft-specific view
7. **Testing** — Manual QA through all flows
