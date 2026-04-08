-- Fix FK: point to profiles instead of auth.users so PostgREST joins work
ALTER TABLE approval_route_step_assignees
  DROP CONSTRAINT IF EXISTS approval_route_step_assignees_user_id_fkey;

ALTER TABLE approval_route_step_assignees
  ADD CONSTRAINT approval_route_step_assignees_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id);
