-- ==========================================================
-- Stripe Webhook Idempotency Table
-- ==========================================================
-- Esta tabela armazena os event.id do Stripe para evitar
-- reprocessamento em caso de retry automático.
-- Não altera nenhuma tabela existente.
-- ==========================================================

create table if not exists public.stripe_events (
  event_id text primary key,
  event_type text not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz null,
  status text not null default 'received',
  error text null
);

-- Índices auxiliares (monitoramento e debug)
create index if not exists stripe_events_type_idx
  on public.stripe_events(event_type);

create index if not exists stripe_events_created_at_idx
  on public.stripe_events(created_at desc);

-- ==========================================================
-- IMPORTANTE:
-- Não habilitar RLS nesta tabela.
-- Webhook usa supabaseAdmin (service role).
-- ==========================================================
