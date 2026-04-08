-- Update permission matrix to match new spreadsheet (excluding multi-tenant)
-- Changes affect: approver, requester, accounting, admin, platform_admin roles

-- ============================================================
-- 1. APPROVER: grant submission actions (was denied)
-- ============================================================
UPDATE role_permissions SET permission = 'granted'
WHERE role = 'approver' AND permission_id IN (
  SELECT id FROM permissions WHERE code IN ('create_submit_ringi', 'save_draft', 'edit_own_draft')
);

-- ============================================================
-- 2. REQUESTER: grant assigned approval actions (was denied)
-- ============================================================
UPDATE role_permissions SET permission = 'assigned_only'
WHERE role = 'requester' AND permission_id IN (
  SELECT id FROM permissions WHERE code IN ('approve_ringi', 'send_revision', 'reject_ringi')
);

-- ============================================================
-- 3. ACCOUNTING: approve_ringi to assigned_only (was granted)
-- ============================================================
UPDATE role_permissions SET permission = 'assigned_only'
WHERE role = 'accounting' AND permission_id IN (
  SELECT id FROM permissions WHERE code = 'approve_ringi'
);

-- ============================================================
-- 4. ADMIN: grant submission actions (was denied)
-- ============================================================
UPDATE role_permissions SET permission = 'granted'
WHERE role = 'admin' AND permission_id IN (
  SELECT id FROM permissions WHERE code IN ('create_submit_ringi', 'save_draft', 'edit_own_draft')
);

-- ============================================================
-- 5. PLATFORM ADMIN: deny everything except user/role management
-- (was granted on all 26 actions)
-- ============================================================
UPDATE role_permissions SET permission = 'denied'
WHERE role = 'platform_admin';

UPDATE role_permissions SET permission = 'granted'
WHERE role = 'platform_admin' AND permission_id IN (
  SELECT id FROM permissions WHERE code IN ('manage_members', 'manage_roles_permissions')
);

-- ============================================================
-- 6. Fix RLS policy still referencing old 'superadmin' role name
-- ============================================================
DROP POLICY IF EXISTS "Admins can update role_permissions" ON role_permissions;

CREATE POLICY "Admins can update role_permissions"
  ON role_permissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'platform_admin')
    )
  );
