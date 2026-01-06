-- Harden selfie storage access and keep profile data complete

-- Ensure bucket exists and RLS is on
insert into storage.buckets (id, name, public)
values ('selfie-verifications', 'selfie-verifications', false)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

-- Reset policies for the selfie bucket to be explicit per action
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and polname = 'Selfie owners manage their files'
  ) then
    drop policy "Selfie owners manage their files" on storage.objects;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and polname = 'Selfie owners can insert'
  ) then
    create policy "Selfie owners can insert" on storage.objects
      for insert
      with check (
        bucket_id = 'selfie-verifications'
        and auth.role() = 'authenticated'
        and split_part(name, '/', 1) = auth.uid()::text
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and polname = 'Selfie owners can select'
  ) then
    create policy "Selfie owners can select" on storage.objects
      for select using (
        bucket_id = 'selfie-verifications'
        and auth.role() = 'authenticated'
        and split_part(name, '/', 1) = auth.uid()::text
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and polname = 'Selfie owners can update'
  ) then
    create policy "Selfie owners can update" on storage.objects
      for update using (
        bucket_id = 'selfie-verifications'
        and auth.role() = 'authenticated'
        and split_part(name, '/', 1) = auth.uid()::text
      )
      with check (
        bucket_id = 'selfie-verifications'
        and split_part(name, '/', 1) = auth.uid()::text
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and polname = 'Selfie owners can delete'
  ) then
    create policy "Selfie owners can delete" on storage.objects
      for delete using (
        bucket_id = 'selfie-verifications'
        and auth.role() = 'authenticated'
        and split_part(name, '/', 1) = auth.uid()::text
      );
  end if;
end $$;

-- Keep profiles complete and aligned with auth.users
alter table public.profiles
  add column if not exists nome text default '' not null,
  add column if not exists telefone text default '' not null,
  add column if not exists selfie_url text;

update public.profiles
  set nome = coalesce(nullif(nome, ''), email),
      telefone = coalesce(telefone, '');

-- Refresh trigger to populate new fields from auth metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_gender text;
  incoming_nome text;
  incoming_telefone text;
  incoming_selfie boolean;
  incoming_onboarding boolean;
begin
  normalized_gender := coalesce(nullif(lower(new.raw_user_meta_data->>'gender'), ''), 'female');
  incoming_nome := coalesce(
    nullif(new.raw_user_meta_data->>'nome', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.email, '')
  );
  incoming_telefone := coalesce(
    nullif(new.raw_user_meta_data->>'telefone', ''),
    nullif(new.phone, ''),
    ''
  );
  incoming_selfie := coalesce((new.raw_user_meta_data->>'selfie_verified')::boolean, false);
  incoming_onboarding := coalesce((new.raw_user_meta_data->>'onboarding_completed')::boolean, false);

  insert into public.profiles (
    id,
    email,
    nome,
    telefone,
    gender,
    selfie_verified,
    onboarding_completed,
    selfie_url
  )
  values (
    new.id,
    new.email,
    coalesce(incoming_nome, new.email, ''),
    incoming_telefone,
    normalized_gender,
    incoming_selfie,
    incoming_onboarding,
    null
  )
  on conflict (id) do update
    set email = excluded.email,
        nome = coalesce(public.profiles.nome, excluded.nome),
        telefone = coalesce(public.profiles.telefone, excluded.telefone, ''),
        gender = coalesce(public.profiles.gender, excluded.gender, 'female'),
        selfie_verified = coalesce(public.profiles.selfie_verified, excluded.selfie_verified, false),
        onboarding_completed = coalesce(public.profiles.onboarding_completed, excluded.onboarding_completed, false),
        selfie_url = coalesce(public.profiles.selfie_url, excluded.selfie_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
