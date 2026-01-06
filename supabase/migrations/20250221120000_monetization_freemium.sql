-- Monetization freemium system: plan/credits and consultas tracking

create extension if not exists "pgcrypto";

-- Profiles base columns
alter table public.profiles
  add column if not exists plan text default 'free';
alter table public.profiles
  add column if not exists free_queries_used integer default 0;
alter table public.profiles
  add column if not exists credits integer default 0;
alter table public.profiles
  add column if not exists created_at timestamp with time zone default timezone('utc', now());

-- Ensure not-null constraints where appropriate
alter table public.profiles alter column plan set not null;
alter table public.profiles alter column free_queries_used set default 0;
update public.profiles set free_queries_used = coalesce(free_queries_used, 0);
alter table public.profiles alter column free_queries_used set not null;
alter table public.profiles alter column credits set default 0;
update public.profiles set credits = coalesce(credits, 0);
alter table public.profiles alter column credits set not null;

-- Consultas table for tracking queries
create table if not exists public.consultas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists consultas_user_id_idx on public.consultas (user_id);

-- RLS policies
alter table public.consultas enable row level security;

drop policy if exists "Users read own consultas" on public.consultas;
drop policy if exists "Users insert own consultas" on public.consultas;
drop policy if exists "Service role manages consultas" on public.consultas;

create policy "Users read own consultas"
  on public.consultas
  for select using (auth.uid() = user_id);

create policy "Users insert own consultas"
  on public.consultas
  for insert with check (auth.uid() = user_id);

create policy "Service role manages consultas"
  on public.consultas
  for all using (auth.role() = 'service_role')
  with check (true);

-- Service role override for profiles
alter table public.profiles enable row level security;

create policy if not exists "Users read own profile"
  on public.profiles
  for select using (auth.uid() = id);

create policy if not exists "Service role manages profiles"
  on public.profiles
  for all using (auth.role() = 'service_role')
  with check (true);

-- Helper function to add credits atomically
create or replace function public.add_profile_credits(user_uuid uuid, credit_delta integer)
returns void as $$
begin
  update public.profiles
    set credits = coalesce(credits, 0) + coalesce(credit_delta, 0)
    where id = user_uuid;
end;
$$ language plpgsql security definer set search_path = public;

do $$
begin
  if not exists (
    select 1 from pg_proc
    where proname = 'consume_query'
      and pronamespace = 'public'::regnamespace
  ) then
    -- placeholder to allow create or replace even when missing
    perform 1;
  end if;
end;
$$;

-- Function to consume a query atomically and register audit row
create or replace function public.consume_query(user_uuid uuid)
returns table(plan text, free_queries_used integer, credits integer) as $$
declare
  current_plan text;
  used integer;
  current_credits integer;
begin
  select plan, free_queries_used, credits
    into current_plan, used, current_credits
    from public.profiles
   where id = user_uuid;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if current_plan = 'free' then
    if used < 3 then
      update public.profiles
        set free_queries_used = free_queries_used + 1
        where id = user_uuid
      returning plan, free_queries_used, credits
        into current_plan, used, current_credits;
    elsif current_credits > 0 then
      update public.profiles
        set credits = credits - 1
        where id = user_uuid
      returning plan, free_queries_used, credits
        into current_plan, used, current_credits;
    else
      raise exception 'PAYWALL';
    end if;
  else
    select plan, free_queries_used, credits
      into current_plan, used, current_credits
      from public.profiles
     where id = user_uuid;
  end if;

  insert into public.consultas (user_id) values (user_uuid);

  return query select current_plan, used, current_credits;
end;
$$ language plpgsql security definer set search_path = public;
