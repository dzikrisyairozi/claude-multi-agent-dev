-- Add RLS policy for superadmins to update any profile
-- This allows superadmins to approve/reject users and update other users' profiles

-- Drop existing policies if they exist
drop policy if exists "Superadmins can update any profile" on public.profiles;
drop policy if exists "Superadmins can insert profiles" on public.profiles;

-- Policy for superadmins to update any profile
create policy "Superadmins can update any profile"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'superadmin'
    )
  );

-- Policy for superadmins to read all profiles (if not already covered)
-- The existing "Public profiles are viewable by everyone" already allows this

-- Policy for superadmins to insert profiles (for manual user creation if needed)
create policy "Superadmins can insert profiles"
  on public.profiles for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'superadmin'
    )
  );

