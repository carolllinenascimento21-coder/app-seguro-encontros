-- Ensure profiles schema, defaults, and RLS policies are aligned with onboarding flow.

alter table public.profiles
  add column if not exists nome text,
  add column if not exists telefone text,
  add column if not exists selfie_url text,
  add column if not exists onboarding_completed boolean default false,
  add column if not exists selfie_verified boolean default false,
  add column if not exists is_active boolean default true,
  add column if not exists deleted_at timestamptz;

update public.profiles
  set onboarding_completed = coalesce(onboarding_completed, false),
      selfie_verified = coalesce(selfie_verified, false),
      is_active = coalesce(is_active, true);

alter table public.profiles
  alter column onboarding_completed set default false,
  alter column selfie_verified set default false,
  alter column is_active set default true,
  alter column onboarding_completed set not null,
  alter column selfie_verified set not null,
  alter column is_active set not null;

alter table public.profiles enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select polname
      from pg_policies
     where schemaname = 'public'
       and tablename = 'profiles'
       and polname <> 'Service role manages profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', policy_record.polname);
  end loop;
end $$;

create policy "Profiles can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id and deleted_at is null);

create policy "Profiles can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Profiles can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Align selfie storage policies with auth.uid() and per-user file paths.
alter table storage.objects enable row level security;

drop policy if exists "Selfie owners can insert" on storage.objects;
drop policy if exists "Selfie owners can select" on storage.objects;

create policy "Selfie owners can insert"
  on storage.objects
  for insert
  with check (
    bucket_id = 'selfie-verifications'
    and auth.uid() is not null
    and owner = auth.uid()
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Selfie owners can select"
  on storage.objects
  for select
  using (
    bucket_id = 'selfie-verifications'
    and auth.uid() is not null
    and owner = auth.uid()
    and split_part(name, '/', 1) = auth.uid()::text
  );
