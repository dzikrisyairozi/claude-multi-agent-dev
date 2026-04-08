-- Migration A: Create departments and positions tables + add FK columns to profiles
-- Part of User Role System refactoring

-- ============================================================
-- 1. Create departments table
-- ============================================================
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_departments_is_active ON public.departments(is_active);
CREATE INDEX idx_departments_name ON public.departments(name);

-- ============================================================
-- 2. Create positions table
-- ============================================================
CREATE TABLE public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  level integer NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_positions_is_active ON public.positions(is_active);
CREATE INDEX idx_positions_level ON public.positions(level);

-- ============================================================
-- 3. Updated_at triggers (reuse existing function pattern)
-- ============================================================
CREATE TRIGGER trigger_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION update_approval_routes_updated_at();

CREATE TRIGGER trigger_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW
  EXECUTE FUNCTION update_approval_routes_updated_at();

-- ============================================================
-- 4. Add department_id and position_id to profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_department_id ON public.profiles(department_id);
CREATE INDEX idx_profiles_position_id ON public.profiles(position_id);

-- ============================================================
-- 5. RLS for departments
-- ============================================================
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active departments
CREATE POLICY "Authenticated users can read active departments"
  ON public.departments FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admins can manage departments (using old role for now, will be updated in RLS migration)
CREATE POLICY "Superadmins can insert departments"
  ON public.departments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can update departments"
  ON public.departments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can delete departments"
  ON public.departments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- ============================================================
-- 6. RLS for positions
-- ============================================================
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active positions
CREATE POLICY "Authenticated users can read active positions"
  ON public.positions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admins can manage positions
CREATE POLICY "Superadmins can insert positions"
  ON public.positions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can update positions"
  ON public.positions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can delete positions"
  ON public.positions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );
