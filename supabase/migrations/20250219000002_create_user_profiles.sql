-- Create enum for user roles (only if it doesn't exist)
do $$ begin
  create type public.user_role as enum ('superadmin', 'manager', 'employee', 'accountant');
exception
  when duplicate_object then null;
end $$;

-- Create profiles table
create table if not exists public.profiles (
  id uuid not null references auth.users(id) on delete cascade primary key,
  email text,
  first_name text,
  last_name text,
  role public.user_role not null default 'employee'::public.user_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

-- Create policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can update their own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Superadmin policies (using a function to check role would be better, but for now simple check)
-- Ideally we should trust the backend to do admin operations, or have a restrictive policy.
-- For now, we'll allow service_role to do everything (implicit) and maybe specific policies for superadmin if we implement RLS-based admin client later.
-- Since we are using service_role in the server actions for admin tasks, we might not strictly need RLS policies for admin *actions* if we bypass RLS, but it's good practice.

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'employee'::public.user_role)
  );
  return new;
end;
$$;

-- Trigger to update profile on auth.users update (optional, but good for email sync)
-- For now just the insert trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
