-- Rename 'own_only' to 'limited' in the permission_value enum
ALTER TYPE permission_value RENAME VALUE 'own_only' TO 'limited';

-- Approver: proxy_approve from denied → limited (spreadsheet: "Limited (if Given the Right)")
UPDATE role_permissions SET permission = 'limited'
WHERE role = 'approver' AND permission_id IN (
  SELECT id FROM permissions WHERE code = 'proxy_approve'
);
