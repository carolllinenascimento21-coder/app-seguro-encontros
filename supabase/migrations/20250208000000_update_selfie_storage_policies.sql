-- Align selfie storage policies with auth.uid() path enforcement

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and polname = 'Selfie owners can insert'
  ) then
    drop policy "Selfie owners can insert" on storage.objects;
  end if;
end $$;

create policy "Selfie owners can insert" on storage.objects
  for insert
  with check (
    bucket_id = 'selfie-verifications'
    and auth.uid() is not null
    and split_part(name, '/', 1) = auth.uid()::text
  );

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and polname = 'Selfie owners can select'
  ) then
    drop policy "Selfie owners can select" on storage.objects;
  end if;
end $$;

create policy "Selfie owners can select" on storage.objects
  for select using (
    bucket_id = 'selfie-verifications'
    and auth.uid() is not null
    and split_part(name, '/', 1) = auth.uid()::text
  );
