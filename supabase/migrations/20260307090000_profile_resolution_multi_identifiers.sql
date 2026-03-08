begin;

alter table public.male_profiles
  add column if not exists created_by uuid;

create index if not exists male_profiles_created_by_created_at_idx
  on public.male_profiles (created_by, created_at desc);

create unique index if not exists idx_profile_identifiers_unique
  on public.profile_identifiers (platform, identifier_hash);

commit;
