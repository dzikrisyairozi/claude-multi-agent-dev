-- Category Sub-Types table for organizing submission categories
CREATE TABLE IF NOT EXISTS category_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('purchasing', 'contracts', 'expenses')),
  name text NOT NULL,
  description text,
  max_amount numeric,
  attachment_requirement text DEFAULT 'optional' CHECK (attachment_requirement IN ('required', 'optional')),
  notes text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Default "Unspecified" per parent category
INSERT INTO category_types (category, name, description, sort_order) VALUES
  ('contracts', 'Unspecified', 'Default contract sub-type', 0),
  ('purchasing', 'Unspecified', 'Default purchasing sub-type', 0),
  ('expenses', 'Unspecified', 'Default expense sub-type', 0);

-- RLS
ALTER TABLE category_types ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view
CREATE POLICY "Authenticated users can view category_types"
  ON category_types FOR SELECT
  TO authenticated
  USING (true);

-- Admin and platform_admin can insert/update/delete
CREATE POLICY "Admin can manage category_types"
  ON category_types FOR ALL
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
