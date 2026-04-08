-- Fix: role_permissions.role is a TEXT column (not enum), so it still has 'superadmin'
-- The enum rename only affected profiles.role (which uses the user_role enum type)
-- This migration renames the text value and re-applies the platform_admin permission update

-- 1. Rename 'superadmin' → 'platform_admin' in role_permissions text column
UPDATE role_permissions SET role = 'platform_admin' WHERE role = 'superadmin';

-- 2. Also fix admin which might have old name too (shouldn't, but safety check)
-- admin was always 'admin' so no change needed

-- 3. Now apply the platform_admin permission changes (was all 'granted' from original seed)
UPDATE role_permissions SET permission = 'denied'
WHERE role = 'platform_admin';

UPDATE role_permissions SET permission = 'granted'
WHERE role = 'platform_admin' AND permission_id IN (
  SELECT id FROM permissions WHERE code IN ('manage_members', 'manage_roles_permissions')
);
