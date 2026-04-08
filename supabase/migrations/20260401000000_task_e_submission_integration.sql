-- Task E: Submission + Sub-Category + Approval Route Integration
-- 1. Add category_type_id to approval_requests
-- 2. Create approval_request_step_assignees snapshot table
-- 3. Normalize category data

-- 1. category_type_id on approval_requests
ALTER TABLE public.approval_requests
  ADD COLUMN IF NOT EXISTS category_type_id uuid REFERENCES public.category_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ar_category_type_id
  ON public.approval_requests(category_type_id);

-- 2. Snapshot table for multi-assignee step approvals
CREATE TABLE IF NOT EXISTS public.approval_request_step_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_approval_id uuid NOT NULL REFERENCES public.approval_request_step_approvals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(step_approval_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_arsa2_user ON public.approval_request_step_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_arsa2_step ON public.approval_request_step_assignees(step_approval_id);

-- RLS
ALTER TABLE public.approval_request_step_assignees ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view
CREATE POLICY "Authenticated users can view step assignees"
  ON public.approval_request_step_assignees FOR SELECT
  TO authenticated
  USING (true);

-- Admin/platform_admin can manage
CREATE POLICY "Admin can manage request step assignees"
  ON public.approval_request_step_assignees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'platform_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'platform_admin')
    )
  );

-- Request owners can insert (for snapshotting during submission)
CREATE POLICY "Request owner can insert step assignees"
  ON public.approval_request_step_assignees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.approval_request_step_approvals arsa
      JOIN public.approval_requests ar ON ar.id = arsa.approval_request_id
      WHERE arsa.id = step_approval_id
      AND ar.user_id = auth.uid()
    )
  );

-- Request owners can delete (for re-snapshotting on resubmission)
CREATE POLICY "Request owner can delete step assignees"
  ON public.approval_request_step_assignees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.approval_request_step_approvals arsa
      JOIN public.approval_requests ar ON ar.id = arsa.approval_request_id
      WHERE arsa.id = step_approval_id
      AND ar.user_id = auth.uid()
    )
  );

-- 3. Normalize existing category data to match category_types table
UPDATE public.approval_requests SET category = 'contracts' WHERE category IN ('contract', 'Contract');
UPDATE public.approval_requests SET category = 'expenses' WHERE category IN ('expense', 'Expense');
UPDATE public.approval_requests SET category = 'purchasing' WHERE category = 'Purchasing';
UPDATE public.approval_requests SET category = 'other' WHERE category IN ('Other', 'misc');
