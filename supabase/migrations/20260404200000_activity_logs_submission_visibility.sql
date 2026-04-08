-- Allow users to see submission-related activity logs for submissions they are involved in
-- (as the requester/owner OR as an assigned approver)
-- This ensures the requester can see "SENT BACK" entries from approvers

CREATE POLICY "Users can view submission activity logs for involved submissions"
  ON public.activity_logs
  FOR SELECT
  USING (
    entity_type = 'submission'
    AND entity_id IS NOT NULL
    AND (
      -- User is the submission owner
      EXISTS (
        SELECT 1 FROM public.approval_requests
        WHERE id = activity_logs.entity_id
        AND user_id = auth.uid()
      )
      OR
      -- User is an assigned approver for this submission
      EXISTS (
        SELECT 1 FROM public.approval_request_step_assignees asa
        JOIN public.approval_request_step_approvals sa ON sa.id = asa.step_approval_id
        WHERE sa.approval_request_id = activity_logs.entity_id
        AND asa.user_id = auth.uid()
      )
    )
  );
