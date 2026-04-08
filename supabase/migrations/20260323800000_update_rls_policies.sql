-- Migration D: Update all RLS policies from old role values to new role values
-- This migration drops and recreates all role-referencing policies

-- ============================================================
-- 1. Create reusable helper function
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
  );
$$;

-- Update existing is_admin_user function to use new roles
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin')
  )
$$;

-- ============================================================
-- 2. Update profiles RLS policies
-- ============================================================
DROP POLICY IF EXISTS "Superadmins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can insert profiles" ON public.profiles;

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin_or_super());

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin_or_super());

-- ============================================================
-- 3. Update approval_routes RLS policies
-- ============================================================
DROP POLICY IF EXISTS "Superadmins can select approval_routes" ON public.approval_routes;
DROP POLICY IF EXISTS "Superadmins can insert approval_routes" ON public.approval_routes;
DROP POLICY IF EXISTS "Superadmins can update approval_routes" ON public.approval_routes;
DROP POLICY IF EXISTS "Superadmins can delete approval_routes" ON public.approval_routes;

CREATE POLICY "Admins can select approval_routes"
  ON public.approval_routes FOR SELECT
  USING (public.is_admin_or_super());

CREATE POLICY "Admins can insert approval_routes"
  ON public.approval_routes FOR INSERT
  WITH CHECK (public.is_admin_or_super());

CREATE POLICY "Admins can update approval_routes"
  ON public.approval_routes FOR UPDATE
  USING (public.is_admin_or_super());

CREATE POLICY "Admins can delete approval_routes"
  ON public.approval_routes FOR DELETE
  USING (public.is_admin_or_super());

-- ============================================================
-- 4. Update approval_route_steps RLS policies
-- ============================================================
DROP POLICY IF EXISTS "Superadmins can select approval_route_steps" ON public.approval_route_steps;
DROP POLICY IF EXISTS "Superadmins can insert approval_route_steps" ON public.approval_route_steps;
DROP POLICY IF EXISTS "Superadmins can update approval_route_steps" ON public.approval_route_steps;
DROP POLICY IF EXISTS "Superadmins can delete approval_route_steps" ON public.approval_route_steps;

CREATE POLICY "Admins can select approval_route_steps"
  ON public.approval_route_steps FOR SELECT
  USING (public.is_admin_or_super());

CREATE POLICY "Admins can insert approval_route_steps"
  ON public.approval_route_steps FOR INSERT
  WITH CHECK (public.is_admin_or_super());

CREATE POLICY "Admins can update approval_route_steps"
  ON public.approval_route_steps FOR UPDATE
  USING (public.is_admin_or_super());

CREATE POLICY "Admins can delete approval_route_steps"
  ON public.approval_route_steps FOR DELETE
  USING (public.is_admin_or_super());

-- ============================================================
-- 5. Update approval_request_step_approvals RLS policies
-- ============================================================
-- Drop old role-specific policies
DROP POLICY IF EXISTS arsa_select_superadmin ON public.approval_request_step_approvals;
DROP POLICY IF EXISTS arsa_insert_superadmin ON public.approval_request_step_approvals;
DROP POLICY IF EXISTS arsa_update_superadmin ON public.approval_request_step_approvals;
DROP POLICY IF EXISTS arsa_delete_superadmin ON public.approval_request_step_approvals;
DROP POLICY IF EXISTS arsa_select_manager ON public.approval_request_step_approvals;
DROP POLICY IF EXISTS arsa_update_manager ON public.approval_request_step_approvals;
DROP POLICY IF EXISTS arsa_select_accountant ON public.approval_request_step_approvals;
DROP POLICY IF EXISTS arsa_update_accountant ON public.approval_request_step_approvals;

-- Admins (admin + superadmin) can do everything
CREATE POLICY arsa_select_admin
  ON public.approval_request_step_approvals FOR SELECT
  USING (public.is_admin_or_super());

CREATE POLICY arsa_insert_admin
  ON public.approval_request_step_approvals FOR INSERT
  WITH CHECK (public.is_admin_or_super());

CREATE POLICY arsa_update_admin
  ON public.approval_request_step_approvals FOR UPDATE
  USING (public.is_admin_or_super());

CREATE POLICY arsa_delete_admin
  ON public.approval_request_step_approvals FOR DELETE
  USING (public.is_admin_or_super());

-- Approvers can view and update step approvals (for their assigned approvals)
CREATE POLICY arsa_select_approver
  ON public.approval_request_step_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'approver'
    )
  );

CREATE POLICY arsa_update_approver
  ON public.approval_request_step_approvals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'approver'
    )
  );

-- Accounting can view and update step approvals
CREATE POLICY arsa_select_accounting
  ON public.approval_request_step_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'accounting'
    )
  );

CREATE POLICY arsa_update_accounting
  ON public.approval_request_step_approvals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'accounting'
    )
  );

-- ============================================================
-- 6. Update approval_requests RLS policies
-- ============================================================
DROP POLICY IF EXISTS approval_requests_select_superadmin ON public.approval_requests;
DROP POLICY IF EXISTS approval_requests_update_superadmin ON public.approval_requests;
DROP POLICY IF EXISTS approval_requests_select_manager ON public.approval_requests;
DROP POLICY IF EXISTS approval_requests_update_manager ON public.approval_requests;
DROP POLICY IF EXISTS approval_requests_select_accountant ON public.approval_requests;
DROP POLICY IF EXISTS approval_requests_update_accountant ON public.approval_requests;

-- Admins can view and update all requests
CREATE POLICY approval_requests_select_admin
  ON public.approval_requests FOR SELECT
  USING (public.is_admin_or_super());

CREATE POLICY approval_requests_update_admin
  ON public.approval_requests FOR UPDATE
  USING (public.is_admin_or_super());

-- Approvers can view and update assigned requests
CREATE POLICY approval_requests_select_approver
  ON public.approval_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'approver'
    )
  );

CREATE POLICY approval_requests_update_approver
  ON public.approval_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'approver'
    )
  );

-- Accounting can view and update all requests
CREATE POLICY approval_requests_select_accounting
  ON public.approval_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'accounting'
    )
  );

CREATE POLICY approval_requests_update_accounting
  ON public.approval_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'accounting'
    )
  );

-- ============================================================
-- 7. Update departments RLS policies (from migration A, update to use helper)
-- ============================================================
DROP POLICY IF EXISTS "Superadmins can insert departments" ON public.departments;
DROP POLICY IF EXISTS "Superadmins can update departments" ON public.departments;
DROP POLICY IF EXISTS "Superadmins can delete departments" ON public.departments;

CREATE POLICY "Admins can insert departments"
  ON public.departments FOR INSERT
  WITH CHECK (public.is_admin_or_super());

CREATE POLICY "Admins can update departments"
  ON public.departments FOR UPDATE
  USING (public.is_admin_or_super());

CREATE POLICY "Admins can delete departments"
  ON public.departments FOR DELETE
  USING (public.is_admin_or_super());

-- ============================================================
-- 8. Update positions RLS policies
-- ============================================================
DROP POLICY IF EXISTS "Superadmins can insert positions" ON public.positions;
DROP POLICY IF EXISTS "Superadmins can update positions" ON public.positions;
DROP POLICY IF EXISTS "Superadmins can delete positions" ON public.positions;

CREATE POLICY "Admins can insert positions"
  ON public.positions FOR INSERT
  WITH CHECK (public.is_admin_or_super());

CREATE POLICY "Admins can update positions"
  ON public.positions FOR UPDATE
  USING (public.is_admin_or_super());

CREATE POLICY "Admins can delete positions"
  ON public.positions FOR DELETE
  USING (public.is_admin_or_super());
