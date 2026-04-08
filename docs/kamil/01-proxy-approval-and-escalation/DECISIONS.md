# Phase 01: Technical Decisions

## Locked (non-negotiable)
- **Proxy approve is a GENERAL admin capability**: Available on ALL pending submissions, not just escalated ones. No need to wait for escalation.
- **Escalation trigger**: Uses the `date` field on `approval_requests` as the target date. If `date < NOW()` and submission is still pending, it's escalated.
- **Status model**: Keep `status = 'pending'` + add `is_escalated` boolean flag. Do not add a new status enum value.
- **Deployment target**: Vercel — cron must use Vercel's cron infrastructure (`vercel.json` + API route)
- **Two admin actions**: Proxy Approve (admin approves on behalf) and Re-assign Approver (delegate to another user)
- **Activity logging**: Proxy approvals MUST be labeled as "proxy approver" in activity logs. Re-assignments must also be logged.
- **Notifications**: In-app only (notification bell). No email/Slack delivery in this phase.
- **Multi-step dialogs**: Proxy Approve requires comment + summary review. Re-assign requires user selection + reason + summary review.

## Flexible (ATLAS discretion)
- Cron frequency (1h recommended, adjustable)
- Whether to batch-process escalations or process one at a time in the cron
- Dialog component choice (shadcn Dialog vs Sheet) for the Take Action flow
- How to fetch and display "pending submission count" for re-assign approver candidates
- Whether proxy approval reuses `processStepApproval()` directly or wraps it
- File organization for escalation components (in `dashboard/_components/` vs shared)

## Open Questions
- Should the cron also check for submissions without a `date` field? (Default: skip them, only escalate when date is set and passed)
- When a submission is proxy approved at an intermediate step, does `is_escalated` reset to `false` for the next step, or stay `true` permanently? (Leaning: reset to false, each step is independent)
- Should re-assign be limited to users with approver-compatible roles, or allow any active user? (Leaning: show all active users, let admin decide)
