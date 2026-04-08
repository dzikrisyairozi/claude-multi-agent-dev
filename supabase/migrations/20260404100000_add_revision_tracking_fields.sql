-- Track which step triggered a revision and which mode was used
-- These fields are set when an approver requests revision, cleared on resubmit

ALTER TABLE approval_requests
  ADD COLUMN revision_source_step_order integer,
  ADD COLUMN revision_restart_from_first boolean;
