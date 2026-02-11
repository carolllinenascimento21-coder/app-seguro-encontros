begin;

create unique index if not exists male_profiles_normalized_unique
  on public.male_profiles (normalized_name, normalized_city);

commit;
