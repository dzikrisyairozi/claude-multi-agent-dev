-- Fix: also allow approvers assigned directly (via approver_user_id) to see submission logs
-- The previous policy only checked the step_assignees junction table

DROP POLICY IF EXISTS "Users can view submission activity logs for involved submission" ON public.activity_logs;

CREATE POLICY "Submission participants can view submission activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (
    entity_type = 'submission'
    AND entity_id IS NOT NULL
    AND (
      -- User is the submission owner (requester)
      EXISTS (
        SELECT 1 FROM public.approval_requests
        WHERE id = activity_logs.entity_id
        AND user_id = auth.uid()
      )
      OR
      -- User is directly assigned as approver on a step
      EXISTS (
        SELECT 1 FROM public.approval_request_step_approvals
        WHERE approval_request_id = activity_logs.entity_id
        AND approver_user_id = auth.uid()
      )
      OR
      -- User is assigned via multi-assignee junction table
      EXISTS (
        SELECT 1 FROM public.approval_request_step_assignees asa
        JOIN public.approval_request_step_approvals sa ON sa.id = asa.step_approval_id
        WHERE sa.approval_request_id = activity_logs.entity_id
        AND asa.user_id = auth.uid()
      )
    )
  );
