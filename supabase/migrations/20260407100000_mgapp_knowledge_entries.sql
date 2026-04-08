-- Create knowledge entries table for mgapp
CREATE TABLE mgapp_knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(20) NOT NULL CHECK (category IN ('hr', 'product', 'it', 'legal', 'facilities', 'admin_finance')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  routing_contact TEXT,
  routing_channel TEXT,
  routing_department TEXT,
  ai_solvability VARCHAR(20) NOT NULL DEFAULT 'ai_answerable' CHECK (ai_solvability IN ('ai_answerable', 'ai_supported', 'human_only')),
  source TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_mgapp_knowledge_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mgapp_knowledge_entries_updated_at
  BEFORE UPDATE ON mgapp_knowledge_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_mgapp_knowledge_entries_updated_at();

-- RLS
ALTER TABLE mgapp_knowledge_entries ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active entries
CREATE POLICY "Authenticated users can read active knowledge entries"
  ON mgapp_knowledge_entries
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage knowledge entries"
  ON mgapp_knowledge_entries
  FOR ALL
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

-- Indexes
CREATE INDEX idx_mgapp_knowledge_entries_category ON mgapp_knowledge_entries(category);
CREATE INDEX idx_mgapp_knowledge_entries_active ON mgapp_knowledge_entries(is_active);
