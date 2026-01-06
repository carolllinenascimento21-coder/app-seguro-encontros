-- Hardened, owner-only RLS for selfie uploads

-- Ensure RLS stays enabled on storage.objects
alter table storage.objects enable row level security;

-- Reset previous catch-all policy to split per-action clarity
drop policy if exists "Selfie owners manage their files" on storage.objects;
drop policy if exists "Selfie owners can read their selfies" on storage.objects;
drop policy if exists "Selfie owners can upload their selfies" on storage.objects;
drop policy if exists "Selfie owners can update their selfies" on storage.objects;
drop policy if exists "Selfie owners can delete their selfies" on storage.objects;

-- Only the authenticated owner can read their own selfie assets
create policy "Selfie owners can read their selfies"
  on storage.objects
  for select
  using (
    bucket_id = 'selfie-verifications'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Only the authenticated owner can insert/upload into their own folder
create policy "Selfie owners can upload their selfies"
  on storage.objects
  for insert
  with check (
    bucket_id = 'selfie-verifications'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Allow upserts/overwrites strictly for the owner path
create policy "Selfie owners can update their selfies"
  on storage.objects
  for update
  using (
    bucket_id = 'selfie-verifications'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'selfie-verifications'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Keep deletes scoped to the owner folder
create policy "Selfie owners can delete their selfies"
  on storage.objects
  for delete
  using (
    bucket_id = 'selfie-verifications'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  );
