-- Harden avaliacao submission flow: RLS permissions only, trigger consumes credit once.

alter table public.avaliacoes
  alter column flags_positive set default '{}'::text[],
  alter column flags_negative set default '{}'::text[],
  alter column is_anonymous set default true,
  alter column publica set default false;

do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'avaliacoes'
       and column_name = 'anonimo'
  ) then
    execute 'alter table public.avaliacoes alter column anonimo set default true';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'avaliacoes'
       and column_name = 'notas'
  ) then
    execute 'alter table public.avaliacoes alter column notas set default 0';
  else
    execute 'alter table public.avaliacoes add column if not exists notas integer default 0';
  end if;
end $$;

create extension if not exists pg_trgm;

create index if not exists avaliacoes_nome_trgm
  on public.avaliacoes using gin (nome gin_trgm_ops);

create index if not exists avaliacoes_cidade_trgm
  on public.avaliacoes using gin (cidade gin_trgm_ops);

create or replace function public.can_submit_avaliacao(user_uuid uuid)
returns boolean as $$
  select exists (
    select 1
      from public.profiles
     where id = user_uuid
       and (
         public.is_plan_active(plan, plan_expires_at)
         or coalesce(credits, 0) > 0
       )
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.submit_avaliacao(
  nome text,
  cidade text,
  contato text,
  relato text,
  flags_positive text[],
  flags_negative text[],
  anonimo boolean,
  comportamento integer,
  seguranca_emocional integer,
  respeito integer,
  carater integer,
  confianca integer
)
returns uuid as $$
declare
  current_user uuid := auth.uid();
  avaliacao_id uuid;
  allowed boolean;
begin
  if current_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  allowed := public.can_submit_avaliacao(current_user);
  if not allowed then
    raise exception 'PAYWALL';
  end if;

  insert into public.avaliacoes (
    user_id,
    nome,
    cidade,
    contato,
    relato,
    flags_positive,
    flags_negative,
    anonimo,
    is_anonymous,
    publica,
    comportamento,
    seguranca_emocional,
    respeito,
    carater,
    confianca
  )
  values (
    current_user,
    nome,
    cidade,
    contato,
    relato,
    coalesce(flags_positive, '{}'::text[]),
    coalesce(flags_negative, '{}'::text[]),
    coalesce(anonimo, true),
    coalesce(anonimo, true),
    not coalesce(anonimo, true),
    coalesce(comportamento, 0),
    coalesce(seguranca_emocional, 0),
    coalesce(respeito, 0),
    coalesce(carater, 0),
    coalesce(confianca, 0)
  )
  returning id into avaliacao_id;

  return avaliacao_id;
end;
$$ language plpgsql security invoker set search_path = public;

create or replace function public.handle_avaliacao_credit_consumption()
returns trigger as $$
declare
  allowed boolean;
begin
  allowed := public.consume_credit_for_avaliacao(new.user_id);
  if not allowed then
    raise exception 'PAYWALL';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, row_security = off;

drop trigger if exists consume_avaliacao_credit on public.avaliacoes;
create trigger consume_avaliacao_credit
  before insert on public.avaliacoes
  for each row execute procedure public.handle_avaliacao_credit_consumption();

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
      auth.role() = 'authenticated'
      and is_anonymous = false
      and publica = true
      and public.can_view_public_avaliacoes(auth.uid())
    )
  );

create policy "Avaliacoes insert own"
  on public.avaliacoes
  for insert
  with check (
    auth.role() = 'authenticated'
    and auth.uid() = user_id
    and public.can_submit_avaliacao(auth.uid())
  );

create policy "Avaliacoes update own"
  on public.avaliacoes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Avaliacoes delete own"
  on public.avaliacoes
  for delete
  using (auth.uid() = user_id);
