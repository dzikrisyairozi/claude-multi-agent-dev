-- Multi-assignee junction table for approval route steps
CREATE TABLE IF NOT EXISTS approval_route_step_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL REFERENCES approval_route_steps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(step_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_step_assignees_user ON approval_route_step_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_step_assignees_step ON approval_route_step_assignees(step_id);

-- RLS: same as approval_route_steps
ALTER TABLE approval_route_step_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view step assignees"
  ON approval_route_step_assignees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage step assignees"
  ON approval_route_step_assignees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'platform_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'platform_admin')
    )
  );

-- AND/OR condition logic on approval routes
ALTER TABLE approval_routes ADD COLUMN IF NOT EXISTS condition_logic text DEFAULT 'and';
