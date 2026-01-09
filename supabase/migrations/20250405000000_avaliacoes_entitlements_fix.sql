-- Align avaliacao entitlements, consumption, and submission flow

create or replace function public.is_plan_active(plan text, plan_expires_at timestamp with time zone)
returns boolean as $$
  select coalesce(plan, 'free') <> 'free'
    and (plan_expires_at is null or plan_expires_at > now());
$$ language sql stable security definer set search_path = public;

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

create or replace function public.consume_credit_for_avaliacao(user_uuid uuid)
returns boolean as $$
declare
  current_plan text;
  current_credits integer;
  current_expires timestamp with time zone;
begin
  select plan, credits, plan_expires_at
    into current_plan, current_credits, current_expires
    from public.profiles
   where id = user_uuid
   for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if public.is_plan_active(current_plan, current_expires) then
    return true;
  end if;

  update public.profiles
     set credits = credits - 1
   where id = user_uuid
     and credits > 0
  returning credits
    into current_credits;

  if not found then
    return false;
  end if;

  insert into public.credit_transactions (user_id, type, amount)
  values (user_uuid, 'avaliacao', -1);

  return true;
end;
$$ language plpgsql security definer set search_path = public, row_security = off;

create or replace function public.consume_credit_or_check_plan(user_uuid uuid)
returns boolean as $$
begin
  return public.consume_credit_for_avaliacao(user_uuid);
end;
$$ language plpgsql security definer set search_path = public, row_security = off;

create or replace function public.get_avaliacao_entitlements()
returns table(
  plan text,
  credits integer,
  plan_expires_at timestamp with time zone,
  has_active_plan boolean,
  can_submit boolean
) as $$
declare
  current_plan text;
  current_credits integer;
  current_expires timestamp with time zone;
  active boolean;
begin
  select plan, credits, plan_expires_at
    into current_plan, current_credits, current_expires
    from public.profiles
   where id = auth.uid();

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  active := public.is_plan_active(current_plan, current_expires);

  return query
  select
    current_plan,
    current_credits,
    current_expires,
    active,
    (active or coalesce(current_credits, 0) > 0);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.submit_avaliacao(
  nome text,
  cidade text,
  contato text,
  relato text,
  flags text[],
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

  allowed := public.consume_credit_for_avaliacao(current_user);
  if not allowed then
    raise exception 'PAYWALL';
  end if;

  insert into public.avaliacoes (
    user_id,
    nome,
    cidade,
    contato,
    relato,
    flags,
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
    coalesce(flags, '{}'::text[]),
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
$$ language plpgsql security definer set search_path = public, row_security = off;

drop policy if exists "Avaliacoes insert own" on public.avaliacoes;

create policy "Avaliacoes insert own"
  on public.avaliacoes
  for insert
  with check (
    auth.uid() = user_id
    and public.consume_credit_for_avaliacao(auth.uid())
  );
