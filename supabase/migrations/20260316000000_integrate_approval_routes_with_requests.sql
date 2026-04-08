-- Integrate approval routes with approval requests
-- Adds route linking, step tracking, and RLS policies for multi-step approval workflow

-- 1. New columns on approval_requests
ALTER TABLE public.approval_requests
  ADD COLUMN IF NOT EXISTS route_id uuid REFERENCES public.approval_routes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_step_order integer DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_approval_requests_route_id
  ON public.approval_requests(route_id);

CREATE INDEX IF NOT EXISTS idx_approval_requests_current_step
  ON public.approval_requests(current_step_order);

-- 2. New table: approval_request_step_approvals
-- Snapshots route steps at submission time (immune to later route edits)
CREATE TABLE IF NOT EXISTS public.approval_request_step_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id uuid NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  step_name text NOT NULL,
  approver_role text,
  approver_user_id uuid,
  is_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  acted_by uuid REFERENCES auth.users(id),
  acted_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arsa_request_id
  ON public.approval_request_step_approvals(approval_request_id);

CREATE INDEX IF NOT EXISTS idx_arsa_request_step
  ON public.approval_request_step_approvals(approval_request_id, step_order);

CREATE UNIQUE INDEX IF NOT EXISTS idx_arsa_unique_step
  ON public.approval_request_step_approvals(approval_request_id, step_order);

-- 3. RLS for approval_request_step_approvals
ALTER TABLE public.approval_request_step_approvals ENABLE ROW LEVEL SECURITY;

-- Owners can view step approvals for their own requests
CREATE POLICY arsa_select_owner
  ON public.approval_request_step_approvals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.approval_requests ar
      WHERE ar.id = approval_request_id
        AND ar.user_id = auth.uid()
    )
  );

-- Superadmins can do everything on step approvals
CREATE POLICY arsa_select_superadmin
  ON public.approval_request_step_approvals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY arsa_insert_superadmin
  ON public.approval_request_step_approvals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY arsa_update_superadmin
  ON public.approval_request_step_approvals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY arsa_delete_superadmin
  ON public.approval_request_step_approvals
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Managers can view and update step approvals
CREATE POLICY arsa_select_manager
  ON public.approval_request_step_approvals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY arsa_update_manager
  ON public.approval_request_step_approvals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- Accountants can view and update step approvals
CREATE POLICY arsa_select_accountant
  ON public.approval_request_step_approvals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'accountant'
    )
  );

CREATE POLICY arsa_update_accountant
  ON public.approval_request_step_approvals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'accountant'
    )
  );

-- Owners can insert step approvals (needed for snapshotting during submission)
CREATE POLICY arsa_insert_owner
  ON public.approval_request_step_approvals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.approval_requests ar
      WHERE ar.id = approval_request_id
        AND ar.user_id = auth.uid()
    )
  );

-- Owners can delete step approvals (needed for re-snapshotting on resubmission)
CREATE POLICY arsa_delete_owner
  ON public.approval_request_step_approvals
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.approval_requests ar
      WHERE ar.id = approval_request_id
        AND ar.user_id = auth.uid()
    )
  );

-- 4. Manager RLS on approval_requests (currently missing — managers can't see others' requests)
DROP POLICY IF EXISTS approval_requests_select_manager ON public.approval_requests;
DROP POLICY IF EXISTS approval_requests_update_manager ON public.approval_requests;

CREATE POLICY approval_requests_select_manager
  ON public.approval_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY approval_requests_update_manager
  ON public.approval_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- 5. Accountant RLS on approval_requests (currently missing)
DROP POLICY IF EXISTS approval_requests_select_accountant ON public.approval_requests;
DROP POLICY IF EXISTS approval_requests_update_accountant ON public.approval_requests;

CREATE POLICY approval_requests_select_accountant
  ON public.approval_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'accountant'
    )
  );

CREATE POLICY approval_requests_update_accountant
  ON public.approval_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'accountant'
    )
  );

-- 6. Allow all authenticated users to read active approval_routes (for route matching)
-- Keep existing superadmin-only INSERT/UPDATE/DELETE policies
CREATE POLICY "Authenticated users can select active approval_routes"
  ON public.approval_routes
  FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can select steps of active routes"
  ON public.approval_route_steps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.approval_routes
      WHERE id = route_id AND is_active = true
    )
    AND auth.uid() IS NOT NULL
  );
