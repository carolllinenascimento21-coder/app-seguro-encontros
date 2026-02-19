-- RLS and anonymity rules for avaliacoes

alter table public.avaliacoes
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.avaliacoes
  add column if not exists is_anonymous boolean default false;

alter table public.avaliacoes
  add column if not exists publica boolean default true;

do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'avaliacoes'
       and column_name = 'anonimo'
  ) then
    execute 'update public.avaliacoes set is_anonymous = anonimo where is_anonymous is null';
  end if;
end $$;

update public.avaliacoes
   set publica = not coalesce(is_anonymous, false)
 where publica is null;

create index if not exists avaliacoes_user_id_idx
  on public.avaliacoes (user_id);

create index if not exists avaliacoes_publica_idx
  on public.avaliacoes (publica);

create index if not exists avaliacoes_anonymous_idx
  on public.avaliacoes (is_anonymous);

create or replace function public.can_view_public_avaliacoes(user_uuid uuid)
returns boolean as $$
  select exists (
    select 1
      from public.profiles
     where id = user_uuid
       and (
         plan is distinct from 'free'
         or coalesce(free_queries_used, 0) < 3
         or coalesce(credits, 0) > 0
       )
  );
$$ language sql stable security definer set search_path = public;

alter table public.avaliacoes enable row level security;

drop policy if exists "Avaliacoes select own or public" on public.avaliacoes;
drop policy if exists "Avaliacoes insert own" on public.avaliacoes;
drop policy if exists "Avaliacoes update own" on public.avaliacoes;
drop policy if exists "Avaliacoes delete own" on public.avaliacoes;

create policy "Avaliacoes select own or public"
  on public.avaliacoes
  for select
  using (
    auth.uid() = user_id
    or (
      is_anonymous = false
      and publica = true
      and public.can_view_public_avaliacoes(auth.uid())
    )
  );

create policy "Avaliacoes insert own"
  on public.avaliacoes
  for insert
  with check (auth.uid() = user_id);

create policy "Avaliacoes update own"
  on public.avaliacoes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Avaliacoes delete own"
  on public.avaliacoes
  for delete
  using (auth.uid() = user_id);
