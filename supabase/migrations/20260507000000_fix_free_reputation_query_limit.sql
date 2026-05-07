-- Fix reputation query consumption to use the current subscription fields.
-- Free users can consume exactly 3 reputation searches before PAYWALL.

create or replace function public.consume_query(user_uuid uuid)
returns table(plan text, free_queries_used integer, credits integer) as $$
declare
  profile_plan text;
  profile_current_plan_id text;
  profile_subscription_status text;
  profile_has_active_plan boolean;
  used integer;
  current_credits integer;
  has_paid_access boolean;
begin
  select
    p.plan,
    p.current_plan_id,
    p.subscription_status,
    p.has_active_plan,
    coalesce(p.free_queries_used, 0),
    coalesce(p.credits, 0)
  into
    profile_plan,
    profile_current_plan_id,
    profile_subscription_status,
    profile_has_active_plan,
    used,
    current_credits
  from public.profiles p
  where p.id = user_uuid
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  has_paid_access :=
    coalesce(profile_has_active_plan, false)
    or lower(coalesce(profile_subscription_status, '')) in ('active', 'trialing')
    or (
      profile_current_plan_id is not null
      and lower(profile_current_plan_id) <> 'free'
    )
    or (
      profile_current_plan_id is null
      and profile_plan is not null
      and lower(profile_plan) <> 'free'
    );

  if not has_paid_access then
    if used >= 3 then
      raise exception 'PAYWALL';
    end if;

    update public.profiles
      set free_queries_used = coalesce(free_queries_used, 0) + 1
      where id = user_uuid
      returning
        coalesce(plan, 'free'),
        coalesce(free_queries_used, 0),
        coalesce(credits, 0)
      into profile_plan, used, current_credits;
  end if;

  insert into public.consultas (user_id) values (user_uuid);

  return query select coalesce(profile_current_plan_id, profile_plan, 'free'), used, current_credits;
end;
$$ language plpgsql security definer set search_path = public;
