-- Add soft delete fields to profiles for LGPD compliance
alter table public.profiles
  add column if not exists is_active boolean default true,
  add column if not exists deleted_at timestamptz;

alter table public.profiles
  alter column is_active set default true;
