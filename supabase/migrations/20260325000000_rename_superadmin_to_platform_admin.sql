-- Rename 'superadmin' enum value to 'platform_admin'
-- ALTER TYPE ... RENAME VALUE automatically updates all rows using this value
ALTER TYPE user_role RENAME VALUE 'superadmin' TO 'platform_admin';

-- Update RLS helper functions to use new enum value
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'platform_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('platform_admin', 'admin')
  );
$$;
