-- Auditoria completa do fluxo Stripe (créditos + assinaturas)
-- Substitua <USER_UUID> pelo usuário de teste.

-- 1) Saldo atual
select *
from public.user_credits
where user_id = '<USER_UUID>';

-- 2) Ledger de créditos
select *
from public.credit_transactions
where user_id = '<USER_UUID>'
order by created_at desc;

-- 3) Últimos eventos Stripe processados
select *
from public.stripe_events
order by created_at desc
limit 20;

-- 4) Duplicidade por external_reference (não deve retornar linhas)
select external_reference, count(*)
from public.credit_transactions
group by external_reference
having count(*) > 1;

-- 5) Teste manual da RPC de crédito
select public.add_profile_credits_with_transaction(
  '<USER_UUID>',
  3,
  'manual_test_ref',
  'purchase'
);

-- 6) Validar saldo após RPC manual
select *
from public.user_credits
where user_id = '<USER_UUID>';

-- 7) Validar estado de assinatura no perfil
select id, current_plan_id, subscription_status, has_active_plan, stripe_subscription_id
from public.profiles
where id = '<USER_UUID>';
