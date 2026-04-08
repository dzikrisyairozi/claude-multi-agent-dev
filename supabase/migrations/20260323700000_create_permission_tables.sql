-- Migration C: Create permission tables and seed default permission matrix
-- Permissions (action definitions) are read-only constants
-- Role_permissions (the matrix values) are configurable by admin

-- ============================================================
-- 1. Create permission_value enum
-- ============================================================
CREATE TYPE public.permission_value AS ENUM (
  'granted',
  'denied',
  'assigned_only',
  'own_only',
  'view_only'
);

-- ============================================================
-- 2. Create permissions table (read-only action definitions)
-- ============================================================
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  category text NOT NULL,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_permissions_category ON public.permissions(category);
CREATE INDEX idx_permissions_code ON public.permissions(code);

-- ============================================================
-- 3. Create role_permissions table (admin-configurable matrix)
-- ============================================================
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  permission public.permission_value NOT NULL DEFAULT 'denied',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id)
);

CREATE INDEX idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions(permission_id);

-- Updated_at trigger
CREATE TRIGGER trigger_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_approval_routes_updated_at();

-- ============================================================
-- 4. RLS for permissions (read-only for all authenticated users)
-- ============================================================
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read permissions"
  ON public.permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 5. RLS for role_permissions
-- ============================================================
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read role_permissions"
  ON public.role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update role_permissions"
  ON public.role_permissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- ============================================================
-- 6. Create check_user_permission helper function (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_user_permission(
  p_user_id uuid,
  p_action text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_permission text;
BEGIN
  SELECT role::text INTO v_role FROM profiles WHERE id = p_user_id;
  IF v_role IS NULL THEN RETURN 'denied'; END IF;

  SELECT rp.permission::text INTO v_permission
  FROM role_permissions rp
  JOIN permissions p ON p.id = rp.permission_id
  WHERE rp.role = v_role AND p.code = p_action;

  RETURN COALESCE(v_permission, 'denied');
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_permission TO authenticated;

-- ============================================================
-- 7. Seed permission definitions (26 actions in 5 categories)
-- ============================================================
INSERT INTO public.permissions (code, category, name, description, sort_order) VALUES
  -- Submission (6 actions)
  ('create_submit_ringi', 'submission', 'Create & Submit Ringi', 'Create and submit ringi (Purchasing, Expenses, Contract, Other)', 10),
  ('save_draft', 'submission', 'Save as Draft', 'Save ringi as draft', 20),
  ('edit_own_draft', 'submission', 'Edit Own Draft', 'Edit own draft (before submission only)', 30),
  ('view_all_submissions', 'submission', 'View All Submissions', 'View all submissions including all users', 40),
  ('view_assigned_submissions', 'submission', 'View Assigned Submissions', 'View submissions routed to them', 50),
  ('track_submission_status', 'submission', 'Track Submission Status', 'Track status of submissions', 60),

  -- Approval Actions (7 actions)
  ('approve_ringi', 'approval', 'Approve Ringi', 'Approve assigned ringi', 70),
  ('send_revision', 'approval', 'Send for Revision', 'Return to requester with notes', 80),
  ('reject_ringi', 'approval', 'Reject Ringi', 'Reject assigned ringi', 90),
  ('bulk_approve', 'approval', 'Bulk Approve', 'Mass approval action', 100),
  ('proxy_approve', 'approval', 'Proxy Approve', 'Approve on behalf of another approver', 110),
  ('cancel_approval', 'approval', 'Cancel Approval', 'Revoke a completed approval', 120),
  ('convert_rejection_to_remand', 'approval', 'Convert Rejection to Remand', 'Change rejected status back to revision', 130),
  ('add_comments', 'approval', 'Add Comments on Ringi', 'Add comments to ringi submissions', 140),

  -- Approval Route Configuration (5 actions)
  ('create_edit_routes', 'route_config', 'Create & Edit Approval Routes', 'Create and edit routes with AND/OR/Parallel/Threshold logic', 150),
  ('view_route_config', 'route_config', 'View Approval Route Configuration', 'View approval route configurations', 160),
  ('configure_conditional_routing', 'route_config', 'Configure Conditional Routing', 'Configure by role, department, amount, category_type', 170),
  ('set_escalation_timeout', 'route_config', 'Set Escalation Timeout Rules', 'Auto-escalate after X days', 180),
  ('set_proxy_approver', 'route_config', 'Set Proxy Approver', 'Assign substitute for absent approver', 190),

  -- Reports & Audit (3 actions)
  ('view_lead_time_report', 'reports', 'View Lead Time Report', 'Approval processing time analytics', 200),
  ('view_sendback_rate_report', 'reports', 'View Send-back Rate Report', 'Revision frequency analytics', 210),
  ('export_audit_log', 'reports', 'Export Audit Log', 'Export audit log data', 220),

  -- System Configuration (5 actions)
  ('manage_members', 'system', 'Manage Members & Invite Users', 'Manage user accounts and send invitations', 230),
  ('manage_roles_permissions', 'system', 'Manage Roles & Permissions', 'Configure roles and permission assignments', 240),
  ('configure_expense_categories', 'system', 'Configure Expense Categories', 'Manage purchasing_type / expenses_type / contract_type', 250),
  ('configure_submission_restrictions', 'system', 'Configure Submission Restrictions', 'Budget limits & application constraints', 260),
  ('manage_notification_settings', 'system', 'Manage Notification Settings', 'Configure notification channels and rules', 270);

-- ============================================================
-- 8. Seed default role-permission matrix (130 rows: 5 roles x 26 actions)
-- ============================================================

-- Helper: Insert role permissions using a CTE for readability
-- APPROVER role (閲覧のみ / View Only)
INSERT INTO public.role_permissions (role, permission_id, permission)
SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'create_submit_ringi'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'save_draft'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'edit_own_draft'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'view_all_submissions'
UNION ALL SELECT 'approver', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'view_assigned_submissions'
UNION ALL SELECT 'approver', id, 'assigned_only'::public.permission_value FROM public.permissions WHERE code = 'track_submission_status'
UNION ALL SELECT 'approver', id, 'assigned_only'::public.permission_value FROM public.permissions WHERE code = 'approve_ringi'
UNION ALL SELECT 'approver', id, 'assigned_only'::public.permission_value FROM public.permissions WHERE code = 'send_revision'
UNION ALL SELECT 'approver', id, 'assigned_only'::public.permission_value FROM public.permissions WHERE code = 'reject_ringi'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'bulk_approve'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'proxy_approve'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'cancel_approval'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'convert_rejection_to_remand'
UNION ALL SELECT 'approver', id, 'assigned_only'::public.permission_value FROM public.permissions WHERE code = 'add_comments'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'create_edit_routes'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'view_route_config'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'configure_conditional_routing'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'set_escalation_timeout'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'set_proxy_approver'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'view_lead_time_report'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'view_sendback_rate_report'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'export_audit_log'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'manage_members'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'manage_roles_permissions'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'configure_expense_categories'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'configure_submission_restrictions'
UNION ALL SELECT 'approver', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'manage_notification_settings';

-- REQUESTER role (申請者)
INSERT INTO public.role_permissions (role, permission_id, permission)
SELECT 'requester', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'create_submit_ringi'
UNION ALL SELECT 'requester', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'save_draft'
UNION ALL SELECT 'requester', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'edit_own_draft'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'view_all_submissions'
UNION ALL SELECT 'requester', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'view_assigned_submissions'
UNION ALL SELECT 'requester', id, 'own_only'::public.permission_value FROM public.permissions WHERE code = 'track_submission_status'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'approve_ringi'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'send_revision'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'reject_ringi'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'bulk_approve'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'proxy_approve'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'cancel_approval'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'convert_rejection_to_remand'
UNION ALL SELECT 'requester', id, 'assigned_only'::public.permission_value FROM public.permissions WHERE code = 'add_comments'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'create_edit_routes'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'view_route_config'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'configure_conditional_routing'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'set_escalation_timeout'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'set_proxy_approver'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'view_lead_time_report'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'view_sendback_rate_report'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'export_audit_log'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'manage_members'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'manage_roles_permissions'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'configure_expense_categories'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'configure_submission_restrictions'
UNION ALL SELECT 'requester', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'manage_notification_settings';

-- ACCOUNTING role (経理・内部統制)
INSERT INTO public.role_permissions (role, permission_id, permission)
SELECT 'accounting', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'create_submit_ringi'
UNION ALL SELECT 'accounting', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'save_draft'
UNION ALL SELECT 'accounting', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'edit_own_draft'
UNION ALL SELECT 'accounting', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'view_all_submissions'
UNION ALL SELECT 'accounting', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'view_assigned_submissions'
UNION ALL SELECT 'accounting', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'track_submission_status'
UNION ALL SELECT 'accounting', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'approve_ringi'
UNION ALL SELECT 'accounting', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'send_revision'
UNION ALL SELECT 'accounting', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'reject_ringi'
UNION ALL SELECT 'accounting', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'bulk_approve'
UNION ALL SELECT 'accounting', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'proxy_approve'
UNION ALL SELECT 'accounting', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'cancel_approval'
UNION ALL SELECT 'accounting', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'convert_rejection_to_remand'
UNION ALL SELECT 'accounting', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'add_comments'
UNION ALL SELECT 'accounting', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'create_edit_routes'
UNION ALL SELECT 'accounting', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'view_route_config'
UNION ALL SELECT 'accounting', id, 'view_only'::public.permission_value FROM public.permissions WHERE code = 'configure_conditional_routing'
UNION ALL SELECT 'accounting', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'set_escalation_timeout'
UNION ALL SELECT 'accounting', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'set_proxy_approver'
UNION ALL SELECT 'accounting', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'view_lead_time_report'
UNION ALL SELECT 'accounting', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'view_sendback_rate_report'
UNION ALL SELECT 'accounting', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'export_audit_log'
UNION ALL SELECT 'accounting', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'manage_members'
UNION ALL SELECT 'accounting', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'manage_roles_permissions'
UNION ALL SELECT 'accounting', id, 'view_only'::public.permission_value FROM public.permissions WHERE code = 'configure_expense_categories'
UNION ALL SELECT 'accounting', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'configure_submission_restrictions'
UNION ALL SELECT 'accounting', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'manage_notification_settings';

-- ADMIN role (管理者 / Administrator)
INSERT INTO public.role_permissions (role, permission_id, permission)
SELECT 'admin', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'create_submit_ringi'
UNION ALL SELECT 'admin', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'save_draft'
UNION ALL SELECT 'admin', id, 'denied'::public.permission_value FROM public.permissions WHERE code = 'edit_own_draft'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'view_all_submissions'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'view_assigned_submissions'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'track_submission_status'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'approve_ringi'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'send_revision'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'reject_ringi'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'bulk_approve'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'proxy_approve'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'cancel_approval'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'convert_rejection_to_remand'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'add_comments'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'create_edit_routes'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'view_route_config'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'configure_conditional_routing'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'set_escalation_timeout'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'set_proxy_approver'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'view_lead_time_report'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'view_sendback_rate_report'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'export_audit_log'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'manage_members'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'manage_roles_permissions'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'configure_expense_categories'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'configure_submission_restrictions'
UNION ALL SELECT 'admin', id, 'granted'::public.permission_value FROM public.permissions WHERE code = 'manage_notification_settings';

-- SUPERADMIN role (スーパー管理者) - everything granted
INSERT INTO public.role_permissions (role, permission_id, permission)
SELECT 'superadmin', id, 'granted'::public.permission_value FROM public.permissions;
