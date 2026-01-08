-- Add plan expiry and entitlements consumption for avaliações

alter table public.profiles
  add column if not exists plan_expires_at timestamp with time zone;

create or replace function public.is_plan_active(plan text, plan_expires_at timestamp with time zone)
returns boolean as $$
  select plan is distinct from 'free'
    and (plan_expires_at is null or plan_expires_at > now());
$$ language sql stable security definer set search_path = public;

create or replace function public.consume_credit_or_check_plan(user_uuid uuid)
returns boolean as $$
declare
  current_plan text;
  current_credits integer;
  current_expires timestamp with time zone;
begin
  select plan, credits, plan_expires_at
    into current_plan, current_credits, current_expires
    from public.profiles
   where id = user_uuid;

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
exception
  when undefined_table then
    return true;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.can_view_public_avaliacoes(user_uuid uuid)
returns boolean as $$
  select exists (
    select 1
      from public.profiles
     where id = user_uuid
       and (
         public.is_plan_active(plan, plan_expires_at)
         or coalesce(free_queries_used, 0) < 3
         or coalesce(credits, 0) > 0
       )
  );
$$ language sql stable security definer set search_path = public;

drop policy if exists "Avaliacoes insert own" on public.avaliacoes;

create policy "Avaliacoes insert own"
  on public.avaliacoes
  for insert
  with check (
    auth.uid() = user_id
    and public.consume_credit_or_check_plan(auth.uid())
  );
