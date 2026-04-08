-- Create approval_routes table
CREATE TABLE public.approval_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create approval_route_steps table
CREATE TABLE public.approval_route_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.approval_routes(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  name text NOT NULL,
  approver_role text,
  approver_user_id uuid,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_approval_routes_is_active ON public.approval_routes(is_active);
CREATE INDEX idx_approval_routes_created_at ON public.approval_routes(created_at DESC);
CREATE INDEX idx_approval_route_steps_route_id ON public.approval_route_steps(route_id);
CREATE INDEX idx_approval_route_steps_route_order ON public.approval_route_steps(route_id, step_order);

-- Trigger to auto-update updated_at on approval_routes
CREATE OR REPLACE FUNCTION update_approval_routes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_approval_routes_updated_at
  BEFORE UPDATE ON public.approval_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_approval_routes_updated_at();

-- Enable RLS
ALTER TABLE public.approval_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_route_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies: superadmin only
CREATE POLICY "Superadmins can select approval_routes"
  ON public.approval_routes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can insert approval_routes"
  ON public.approval_routes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can update approval_routes"
  ON public.approval_routes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can delete approval_routes"
  ON public.approval_routes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can select approval_route_steps"
  ON public.approval_route_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can insert approval_route_steps"
  ON public.approval_route_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can update approval_route_steps"
  ON public.approval_route_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can delete approval_route_steps"
  ON public.approval_route_steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );
