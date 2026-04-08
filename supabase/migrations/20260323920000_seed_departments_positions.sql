-- Seed default departments and positions
-- These are common organizational structures; admin can add/edit/remove later via UI

-- ============================================================
-- 1. Seed Departments
-- ============================================================
INSERT INTO public.departments (name, description, is_active) VALUES
  ('経営企画部', 'Corporate Planning / Management Planning Department', true),
  ('総務部', 'General Affairs Department', true),
  ('人事部', 'Human Resources Department', true),
  ('経理部', 'Accounting / Finance Department', true),
  ('営業部', 'Sales Department', true),
  ('マーケティング部', 'Marketing Department', true),
  ('開発部', 'Development / Engineering Department', true),
  ('情報システム部', 'Information Systems / IT Department', true),
  ('法務部', 'Legal Department', true),
  ('品質管理部', 'Quality Assurance Department', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 2. Seed Positions (with hierarchy levels)
-- Level: higher number = higher rank
-- ============================================================
INSERT INTO public.positions (name, level, description, is_active) VALUES
  ('スタッフ', 1, 'Staff / General Employee (一般社員)', true),
  ('主任', 2, 'Senior Staff / Chief (主任)', true),
  ('係長', 3, 'Section Chief / Team Lead (係長)', true),
  ('課長', 4, 'Manager / Section Manager (課長)', true),
  ('次長', 5, 'Deputy General Manager (次長)', true),
  ('部長', 6, 'General Manager / Department Head (部長)', true),
  ('本部長', 7, 'Division Head / Executive General Manager (本部長)', true),
  ('取締役', 8, 'Director / Board Member (取締役)', true),
  ('代表取締役', 9, 'Representative Director / CEO (代表取締役)', true)
ON CONFLICT (name) DO NOTHING;
