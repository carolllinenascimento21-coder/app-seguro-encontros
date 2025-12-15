-- Add email column to profiles to align with application usage
alter table public.profiles
  add column if not exists email text;
