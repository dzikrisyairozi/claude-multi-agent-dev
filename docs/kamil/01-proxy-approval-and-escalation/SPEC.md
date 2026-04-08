# Phase 01: Proxy Approval and Escalation

## Objective
Admins can **proxy approve** (approve on behalf of the assigned approver) or **re-assign** any pending submission to a different approver at any time — no need to wait for escalation. Separately, a cron system auto-detects submissions past their target date, marks them as escalated, and notifies admins. The Escalations tab is a filtered dashboard view of overdue submissions. Activity logs must label proxy approval actions.

## Deliverables

### Backend
- **Database migration**: Add `is_escalated` boolean + `escalated_at` timestamp to `approval_requests`; add `proxy_approved_by` and `reassigned_from_user_id` columns to `approval_request_step_approvals`
- **Vercel Cron API route** (`/api/cron/check-escalations`): Runs periodically, finds pending submissions where `date < now()` and `is_escalated = false`, marks them as escalated, creates `escalation_timeout` notifications for all admin/platform_admin users
- **Proxy approve server action**: Approves the current step on behalf of the original assignee, records `proxy_approved_by` in the step, advances workflow normally
- **Re-assign approver server action**: Replaces the current step's assignee with a new user, sends notification to the new assignee
- **Reject escalated submission server action**: Rejects the submission (reuses existing reject flow)

### Frontend — Dashboard
- **"Escalations" tab** in the dashboard status bar: Filters submissions where `is_escalated = true` and `status = 'pending'`, shows count badge in red
- **Escalation card design**: Red top border, warning icon, "Escalation" badge, "Escalation Approval Timeout" message box, Reject + Take Action buttons
- **"Take Action" dialog**: Modal with submission context, original assignee info, two action buttons: "Proxy Approve" (green) and "Re-assign Approver" (blue), plus "View Submission Detail" link
- **"Proxy Approve" confirmation dialog**: Shows proxy warning ("You are acting as proxy"), original assignee with "No action for Xh" label, Cancel/Continue buttons
- **"Re-assign Approver" dialog**: Shows original assignee, list of available approvers with role badges and pending submission counts, radio selection, Cancel/Continue buttons

### Frontend — Submission Detail Page
- **Escalation status banner**: Red background bar showing "Escalation / Waiting for manager approval" with Reject and Take Action buttons (replaces the normal approval actions when escalated)

### Frontend — Notifications
- **Escalation notifications in bell**: "Submission Escalation" type with "Purchasing request REQ-XXXX has expired due to no action within the due time" message, links to submission detail

## Out of Scope
- Email/Slack notification delivery (handled by separate notifications phase)
- Configurable escalation timeout per route or per step (uses global target date)
- 24h/72h reminder notifications (UI settings exist but engine is separate)
- Notification settings persistence to database

## In Scope (clarified)
- **Activity logging**: Proxy approvals and re-assignments MUST be logged with "proxy approver" label
- **Proxy approve on ANY submission**: Admin can proxy approve any pending submission, not just escalated ones

## Dependencies
- **Requires**: Existing approval route system, step-based approval flow, notification bell component (all exist)
- **Enables**: Future notification delivery (email/Slack), SLA tracking and reporting, escalation analytics

## Technical Approach

### Escalation Detection (Vercel Cron)
- Create `/api/cron/check-escalations` API route
- Configure in `vercel.json` with cron schedule (every hour or configurable)
- Query: `approval_requests WHERE status = 'pending' AND date < NOW() AND is_escalated = false`
- For each match: set `is_escalated = true`, `escalated_at = NOW()`
- Create `escalation_timeout` notifications for all admin/platform_admin users with `requires_action = true`
- Use `supabaseAdmin` since this is a system-level operation (no user context)

### Status Model
- `approval_requests.status` stays `'pending'` — escalation is orthogonal to approval status
- New boolean `is_escalated` + timestamp `escalated_at` on `approval_requests`
- Dashboard filters on `is_escalated = true AND status = 'pending'` for the Escalations tab

### Proxy Approval Flow (available on ANY pending submission, not just escalated)
1. Admin clicks "Take Action" on any card (escalated or not) → sees action modal
2. Chooses "Proxy Approve" → enters required "Proxy Approval Comment"
3. Reviews Summary (Submission Title, Action: "Proxy Approver", Stage, Performed by, Comment)
4. Confirms → server action calls existing `processStepApproval()` with the admin's user ID
5. Records `proxy_approved_by = admin_id` on the step approval
6. Step advances normally (next step or final approval)
7. Activity log records with "proxy approver" label
8. Success toast: "Submission approved successfully as proxy approver."

### Re-assign Approver Flow
1. Admin clicks "Take Action" → chooses "Re-assign Approver"
2. Sees list of available users with role badges and pending submission counts → selects new assignee
3. Enters required "Reason for Re-assignment"
4. Reviews Summary (Submission Title, Action: Removing → Assigning visual, Stage, Performed by, Comment)
5. Confirms → server action updates `approval_request_step_approvals` current step
6. Records `reassigned_from_user_id`, updates `approver_user_id` to new user
7. Creates `proxy_delegated` notification to the new assignee with `requires_action = true`
8. Activity log records re-assignment with full context
9. Success toast: "Submission approver has been reassigned successfully."

### Key Files to Modify
- `src/app/dashboard/page.tsx` — Add Escalations tab, escalation card rendering
- `src/components/approval-request/ApprovalRequestCard.tsx` — Escalation card variant
- `src/components/approval-request/approval-actions.tsx` — Escalation action buttons
- `src/components/approval-request/ApprovalRequestPageClient.tsx` — Escalation banner on detail page
- `src/components/layout/notification-bell.tsx` — Already supports `escalation_timeout` type (just needs to be triggered)
- `src/service/approvalRequest/approvalRequest.ts` — Proxy approve + re-assign server actions
- `src/service/approvalRequest/approvalRouteMatching.ts` — May need escalation-aware step processing
- `src/types/approvalRequest.ts` — Add `is_escalated`, `escalated_at` to types
- `src/providers/LanguageProvider.tsx` — Add escalation-related translations

### New Files to Create
- `supabase/migrations/YYYYMMDD_add_escalation_fields.sql` — Schema migration
- `src/app/api/cron/check-escalations/route.ts` — Vercel cron endpoint
- `vercel.json` — Cron schedule configuration
- `src/app/dashboard/_components/escalation-take-action-dialog.tsx` — Take Action modal
- `src/app/dashboard/_components/proxy-approve-dialog.tsx` — Proxy approve confirmation
- `src/app/dashboard/_components/reassign-approver-dialog.tsx` — Re-assign approver dialog
- `src/service/approvalRequest/escalation.ts` — Escalation-specific server actions
- `src/types/escalation.ts` — Escalation-related types

## Acceptance Criteria
1. Submissions past their target date are automatically detected and marked as escalated
2. The Escalations tab on the dashboard shows only escalated pending submissions with correct count
3. Escalated cards display red border, warning icon, "Escalation" badge, and timeout message
4. "Take Action" opens a modal with Proxy Approve and Re-assign Approver options
5. Proxy Approve advances the submission through the approval flow on behalf of the absent approver
6. Re-assign Approver changes the current step's assignee and notifies the new assignee
7. Reject on an escalated submission works the same as normal rejection
8. The submission detail page shows an escalation banner with appropriate actions when the submission is escalated
9. Escalation notifications appear in the notification bell for admin users
10. The cron job is compatible with Vercel's cron infrastructure
11. All UI text supports English and Japanese translations

## Implementation Notes

### Existing Patterns to Follow
- Server actions use `{ data, error }` return shape with auth checks
- Types defined in `src/types/`, services in `src/service/`
- Fire-and-forget for notifications and activity logs
- `canUserApproveCurrentStep()` checks 4 assignment types + admin override
- Admins/platform_admins can already approve any step — proxy approval extends this with tracking
- Notification types `escalation_timeout` and `proxy_delegated` already exist in the TypeScript type but are unused

### Cron Considerations (Vercel)
- Vercel cron jobs are configured in `vercel.json` under the `crons` key
- Minimum interval: 1 minute (hobby), recommended: every 1 hour for this use case
- The API route must be a GET handler and should be protected with `CRON_SECRET`
- Response should return 200 on success
