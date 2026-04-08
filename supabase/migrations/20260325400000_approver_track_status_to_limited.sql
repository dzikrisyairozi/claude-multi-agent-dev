-- Approver: track_submission_status from assigned_only → limited
UPDATE role_permissions SET permission = 'limited'
WHERE role = 'approver' AND permission_id IN (
  SELECT id FROM permissions WHERE code = 'track_submission_status'
);
