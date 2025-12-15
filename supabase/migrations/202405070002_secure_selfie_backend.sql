-- Secure backend-backed selfie verification assets and policies

-- Private bucket for selfie captures (idempotent)
insert into storage.buckets (id, name, public)
values ('selfie-verifications', 'selfie-verifications', false)
on conflict (id) do nothing;

-- Ensure row level security is active on storage objects
alter table storage.objects enable row level security;

-- Only the authenticated user can read or write files inside their own folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Selfie owners manage their files' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Selfie owners manage their files" ON storage.objects
      FOR ALL
      USING (
        bucket_id = 'selfie-verifications'
        AND auth.role() = 'authenticated'
        AND split_part(name, '/', 1) = auth.uid()::text
      )
      WITH CHECK (
        bucket_id = 'selfie-verifications'
        AND split_part(name, '/', 1) = auth.uid()::text
      );
  END IF;
END $$;

-- Harden profile policies so selfie verification flags are controlled server-side
alter table public.profiles enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Profile owners can read' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Profile owners can read" ON public.profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Profile owners can insert their row' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Profile owners can insert their row" ON public.profiles
      FOR INSERT
      WITH CHECK (
        auth.uid() = id
        AND coalesce(selfie_verified, false) = false
        AND selfie_verified_at IS NULL
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Profile owners update without selfie flags' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Profile owners update without selfie flags" ON public.profiles
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (
        auth.uid() = id
        AND coalesce(selfie_verified, false) = coalesce((SELECT selfie_verified FROM public.profiles p WHERE p.id = auth.uid()), false)
        AND selfie_verified_at IS NOT DISTINCT FROM (SELECT selfie_verified_at FROM public.profiles p WHERE p.id = auth.uid())
      );
  END IF;
END $$;
