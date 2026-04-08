-- Migration B: Swap user_role enum from old values to new values
-- Old: superadmin, manager, employee, accountant
-- New: approver, requester, accounting, admin, superadmin

-- ============================================================
-- 1. Create the new enum type
-- ============================================================
CREATE TYPE public.user_role_v2 AS ENUM (
  'approver',
  'requester',
  'accounting',
  'admin',
  'superadmin'
);

-- ============================================================
-- 2. Add temporary column with new enum
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN role_new public.user_role_v2;

-- ============================================================
-- 3. Map old role values to new role values
-- ============================================================
UPDATE public.profiles SET role_new = CASE
  WHEN role::text = 'superadmin' THEN 'superadmin'::public.user_role_v2
  WHEN role::text = 'manager' THEN 'admin'::public.user_role_v2
  WHEN role::text = 'employee' THEN 'requester'::public.user_role_v2
  WHEN role::text = 'accountant' THEN 'accounting'::public.user_role_v2
  ELSE 'requester'::public.user_role_v2
END;

-- ============================================================
-- 4. Set NOT NULL and default on new column
-- ============================================================
ALTER TABLE public.profiles ALTER COLUMN role_new SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN role_new SET DEFAULT 'requester'::public.user_role_v2;

-- ============================================================
-- 5. Drop ALL dependent RLS policies and functions BEFORE dropping the column
-- ============================================================

-- Drop activity_logs policy that depends on is_admin_user()
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;

-- Drop is_admin_user() function (depends on role column)
DROP FUNCTION IF EXISTS public.is_admin_user();

-- Drop profiles policies
DROP POLICY IF EXISTS "Superadmins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can insert profiles" ON public.profiles;

-- Drop approval_routes policies
DROP POLICY IF EXISTS "Superadmins can select approval_routes" ON public.approval_routes;
DROP POLICY IF EXISTS "Superadmins can insert approval_routes" ON public.approval_routes;
DROP POLICY IF EXISTS "Superadmins can update approval_routes" ON public.approval_routes;
DROP POLICY IF EXISTS "Superadmins can delete approval_routes" ON public.approval_routes;

-- Drop approval_route_steps policies
DROP POLICY IF EXISTS "Superadmins can select approval_route_steps" ON public.approval_route_steps;
DROP POLICY IF EXISTS "Superadmins can insert approval_route_steps" ON public.approval_route_steps;
DROP POLICY IF EXISTS "Superadmins can update approval_route_steps" ON public.approval_route_steps;
DROP POLICY IF EXISTS "Superadmins can delete approval_route_steps" ON public.approval_route_steps;

-- Drop approval_requests policies
DROP POLICY IF EXISTS approval_requests_select_superadmin ON public.approval_requests;
DROP POLICY IF EXISTS approval_requests_update_superadmin ON public.approval_requests;
DROP POLICY IF EXISTS approval_requests_select_manager ON public.approval_requests;
DROP POLICY IF EXISTS approval_requests_update_manager ON public.approval_requests;
DROP POLICY IF EXISTS approval_requests_select_accountant ON public.approval_requests;
DROP POLICY IF EXISTS approval_requests_update_accountant ON public.approval_requests;

-- Drop approval_request_step_approvals policies
DROP POLICY IF EXISTS arsa_select_superadmin ON public.approval_request_step_approvals;
DROP POLICY IF EXISTS arsa_insert_superadmin ON public.approval_request_step_approvals;
DROP POLICY IF EXISTS arsa_update_superadmin ON public.approval_request_step_approvals;
DROP POLICY IF EXISTS arsa_delete_superadmin ON public.approval_request_step_approvals;
DROP POLICY IF EXISTS arsa_select_manager ON public.approval_request_step_approvals;
DROP POLICY IF EXISTS arsa_update_manager ON public.approval_request_step_approvals;
DROP POLICY IF EXISTS arsa_select_accountant ON public.approval_request_step_approvals;
DROP POLICY IF EXISTS arsa_update_accountant ON public.approval_request_step_approvals;

-- Drop departments policies (from migration A)
DROP POLICY IF EXISTS "Superadmins can insert departments" ON public.departments;
DROP POLICY IF EXISTS "Superadmins can update departments" ON public.departments;
DROP POLICY IF EXISTS "Superadmins can delete departments" ON public.departments;

-- Drop positions policies (from migration A)
DROP POLICY IF EXISTS "Superadmins can insert positions" ON public.positions;
DROP POLICY IF EXISTS "Superadmins can update positions" ON public.positions;
DROP POLICY IF EXISTS "Superadmins can delete positions" ON public.positions;

-- Now safe to drop the old role column
ALTER TABLE public.profiles DROP COLUMN role;
ALTER TABLE public.profiles RENAME COLUMN role_new TO role;

-- ============================================================
-- 6. Drop old enum and rename new enum
-- ============================================================
DROP TYPE public.user_role;
ALTER TYPE public.user_role_v2 RENAME TO user_role;

-- ============================================================
-- 7. Update the handle_new_user() trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    COALESCE(
      CASE
        WHEN new.raw_user_meta_data ->> 'role' IN ('approver','requester','accounting','admin','superadmin')
        THEN (new.raw_user_meta_data ->> 'role')::public.user_role
        -- Map legacy role values during transition
        WHEN new.raw_user_meta_data ->> 'role' = 'manager' THEN 'admin'::public.user_role
        WHEN new.raw_user_meta_data ->> 'role' = 'employee' THEN 'requester'::public.user_role
        WHEN new.raw_user_meta_data ->> 'role' = 'accountant' THEN 'accounting'::public.user_role
        ELSE NULL
      END,
      'requester'::public.user_role
    )
  );
  RETURN new;
END;
$$;

-- ============================================================
-- 8. Migrate approval_route_steps.approver_role text values
-- ============================================================
UPDATE public.approval_route_steps SET approver_role = CASE
  WHEN approver_role = 'manager' THEN 'approver'
  WHEN approver_role = 'accountant' THEN 'accounting'
  WHEN approver_role = 'superadmin' THEN 'superadmin'
  ELSE approver_role
END
WHERE approver_role IN ('manager', 'accountant');

-- ============================================================
-- 9. Migrate approval_request_step_approvals.approver_role text values
-- ============================================================
UPDATE public.approval_request_step_approvals SET approver_role = CASE
  WHEN approver_role = 'manager' THEN 'approver'
  WHEN approver_role = 'accountant' THEN 'accounting'
  WHEN approver_role = 'superadmin' THEN 'superadmin'
  ELSE approver_role
END
WHERE approver_role IN ('manager', 'accountant');
