begin;

-- Recommended indexes for current read/write paths used by review flow.
create index if not exists avaliacoes_user_id_created_at_idx
  on public.avaliacoes (user_id, created_at desc);

create index if not exists avaliacoes_user_id_id_idx
  on public.avaliacoes (user_id, id);

create index if not exists profile_identifiers_identifier_hash_idx
  on public.profile_identifiers (identifier_hash);

-- Non-breaking RLS hardening for related profile resolution tables.
alter table public.profile_identifiers enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profile_identifiers'
      AND policyname = 'profile_identifiers service role read'
  ) THEN
    CREATE POLICY "profile_identifiers service role read"
      ON public.profile_identifiers
      FOR SELECT
      TO service_role
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profile_identifiers'
      AND policyname = 'profile_identifiers service role insert'
  ) THEN
    CREATE POLICY "profile_identifiers service role insert"
      ON public.profile_identifiers
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profile_identifiers'
      AND policyname = 'profile_identifiers service role update'
  ) THEN
    CREATE POLICY "profile_identifiers service role update"
      ON public.profile_identifiers
      FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profile_identifiers'
      AND policyname = 'profile_identifiers service role delete'
  ) THEN
    CREATE POLICY "profile_identifiers service role delete"
      ON public.profile_identifiers
      FOR DELETE
      TO service_role
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'male_profiles'
      AND policyname = 'male_profiles service role select'
  ) THEN
    CREATE POLICY "male_profiles service role select"
      ON public.male_profiles
      FOR SELECT
      TO service_role
      USING (true);
  END IF;
END $$;

commit;
