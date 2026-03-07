create unique index if not exists idx_profile_identifiers_unique
  on public.profile_identifiers (platform, identifier_hash);
