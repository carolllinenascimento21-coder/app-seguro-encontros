-- Freemium paywall: planos, créditos e registro de consultas

-- Extensões necessárias para UUID
create extension if not exists "pgcrypto";

-- Novas colunas no perfil
alter table public.profiles
  add column if not exists plan text not null default 'free',
  add column if not exists free_queries_used integer not null default 0,
  add column if not exists credits integer not null default 0,
  add column if not exists created_at timestamptz not null default now();

-- Normaliza valores existentes
update public.profiles
  set plan = coalesce(nullif(plan, ''), 'free'),
      free_queries_used = coalesce(free_queries_used, 0),
      credits = coalesce(credits, 0),
      created_at = coalesce(created_at, now());

-- Recria handle_new_user para preencher novos campos
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_gender text;
  incoming_nome text;
  incoming_selfie boolean;
  incoming_onboarding boolean;
begin
  normalized_gender := coalesce(nullif(lower(new.raw_user_meta_data->>'gender'), ''), 'female');
  incoming_nome := coalesce(nullif(new.raw_user_meta_data->>'nome', ''), new.email);
  incoming_selfie := coalesce((new.raw_user_meta_data->>'selfie_verified')::boolean, false);
  incoming_onboarding := coalesce((new.raw_user_meta_data->>'onboarding_completed')::boolean, false);

  insert into public.profiles (
    id,
    email,
    nome,
    gender,
    selfie_verified,
    onboarding_completed,
    plan,
    free_queries_used,
    credits,
    created_at
  )
  values (
    new.id,
    new.email,
    incoming_nome,
    normalized_gender,
    incoming_selfie,
    incoming_onboarding,
    'free',
    0,
    0,
    coalesce(new.created_at, now())
  )
  on conflict (id) do update
    set email = excluded.email,
        nome = coalesce(public.profiles.nome, excluded.nome),
        gender = coalesce(public.profiles.gender, excluded.gender, 'female'),
        selfie_verified = coalesce(public.profiles.selfie_verified, excluded.selfie_verified, false),
        onboarding_completed = coalesce(public.profiles.onboarding_completed, excluded.onboarding_completed, false),
        plan = coalesce(public.profiles.plan, excluded.plan, 'free'),
        free_queries_used = coalesce(public.profiles.free_queries_used, excluded.free_queries_used, 0),
        credits = coalesce(public.profiles.credits, excluded.credits, 0),
        created_at = coalesce(public.profiles.created_at, excluded.created_at, now());

  return new;
end;
$$;

-- Registra gatilho em auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Tabela de consultas realizadas
create table if not exists public.consultas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.consultas enable row level security;

-- Políticas: usuária vê apenas suas consultas
do $$
begin
  if not exists (
    select 1 from pg_policies where polname = 'consultas_select_own'
  ) then
    create policy consultas_select_own on public.consultas
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- Função para checar acesso a consultas
create or replace function public.check_query_access(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_record record;
  allowed boolean;
  denial_reason text;
begin
  select id, plan, free_queries_used, credits
    into profile_record
    from public.profiles
   where id = p_user_id;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'PROFILE_NOT_FOUND');
  end if;

  if coalesce(profile_record.plan, 'free') <> 'free' then
    allowed := true;
  elsif coalesce(profile_record.free_queries_used, 0) < 3 then
    allowed := true;
  elsif coalesce(profile_record.credits, 0) > 0 then
    allowed := true;
  else
    allowed := false;
    denial_reason := 'PAYWALL';
  end if;

  return jsonb_build_object(
    'allowed', allowed,
    'reason', denial_reason,
    'plan', coalesce(profile_record.plan, 'free'),
    'free_queries_used', coalesce(profile_record.free_queries_used, 0),
    'credits', coalesce(profile_record.credits, 0)
  );
end;
$$;

-- Função para consumir consulta (incrementa contadores e registra histórico)
create or replace function public.consume_query(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_record record;
  new_free integer;
  new_credits integer;
  mode text;
begin
  select * into profile_record
    from public.profiles
   where id = p_user_id
   for update;

  if not found then
    return jsonb_build_object('consumed', false, 'reason', 'PROFILE_NOT_FOUND');
  end if;

  if coalesce(profile_record.plan, 'free') <> 'free' then
    mode := 'plan';
  elsif coalesce(profile_record.free_queries_used, 0) < 3 then
    new_free := coalesce(profile_record.free_queries_used, 0) + 1;
    update public.profiles set free_queries_used = new_free where id = p_user_id;
    mode := 'free';
  elsif coalesce(profile_record.credits, 0) > 0 then
    new_credits := coalesce(profile_record.credits, 0) - 1;
    update public.profiles set credits = new_credits where id = p_user_id;
    mode := 'credit';
  else
    return jsonb_build_object(
      'consumed', false,
      'reason', 'PAYWALL',
      'plan', coalesce(profile_record.plan, 'free'),
      'free_queries_used', coalesce(profile_record.free_queries_used, 0),
      'credits', coalesce(profile_record.credits, 0)
    );
  end if;

  insert into public.consultas(user_id) values (p_user_id);

  return jsonb_build_object(
    'consumed', true,
    'mode', mode,
    'plan', coalesce(profile_record.plan, 'free'),
    'free_queries_used', coalesce(new_free, profile_record.free_queries_used, 0),
    'credits', coalesce(new_credits, profile_record.credits, 0)
  );
end;
$$;

-- Função para adicionar créditos a um perfil
create or replace function public.add_profile_credits(p_user_id uuid, p_amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_credits integer;
begin
  if p_amount <= 0 then
    return;
  end if;

  select credits into current_credits from public.profiles where id = p_user_id for update;

  if not found then
    return;
  end if;

  update public.profiles
     set credits = coalesce(current_credits, 0) + p_amount
   where id = p_user_id;
end;
$$;
