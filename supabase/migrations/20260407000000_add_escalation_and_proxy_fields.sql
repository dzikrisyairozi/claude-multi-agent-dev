-- Add escalation tracking to approval_requests
ALTER TABLE approval_requests
  ADD COLUMN IF NOT EXISTS is_escalated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz;

-- Add proxy approval tracking to step approvals
ALTER TABLE approval_request_step_approvals
  ADD COLUMN IF NOT EXISTS proxy_approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reassigned_from_user_id uuid REFERENCES auth.users(id);

-- Index for cron query: find pending escalatable submissions efficiently
CREATE INDEX IF NOT EXISTS idx_approval_requests_escalation
  ON approval_requests (status, is_escalated, date)
  WHERE status = 'pending' AND is_escalated = false AND date IS NOT NULL;

-- Add new activity action enum values
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'submission_proxy_approve';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'submission_reassign_approver';
