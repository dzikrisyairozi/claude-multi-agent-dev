-- Add is_active column to profiles table for signup approval
-- When is_active is NULL, the user is pending approval
-- When is_active is TRUE, the user is approved and can login
-- When is_active is FALSE, the user is rejected/deactivated

-- Add is_active column with default NULL
alter table public.profiles
add column if not exists is_active boolean default null;

-- Update the handle_new_user function to explicitly set is_active to NULL on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role, is_active)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'employee'::public.user_role),
    null -- User is pending approval by default
  );
  return new;
end;
$$;

-- Add comment to the column for documentation
comment on column public.profiles.is_active is 'Signup approval status: NULL = pending, TRUE = approved, FALSE = rejected/deactivated';
