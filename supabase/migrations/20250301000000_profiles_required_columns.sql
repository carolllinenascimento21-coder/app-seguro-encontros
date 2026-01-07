-- Ensure required profile columns exist without breaking existing data.
alter table public.profiles
  add column if not exists nome text,
  add column if not exists email text,
  add column if not exists telefone text,
  add column if not exists selfie_url text,
  add column if not exists onboarding_completed boolean default false,
  add column if not exists selfie_verified boolean default false;

-- Ensure defaults are enforced even when columns already existed.
alter table public.profiles
  alter column onboarding_completed set default false,
  alter column selfie_verified set default false;
