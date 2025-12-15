-- Add selfie verification flags to profiles
alter table public.profiles
  add column if not exists selfie_verified boolean not null default false;

alter table public.profiles
  add column if not exists selfie_verified_at timestamptz;
