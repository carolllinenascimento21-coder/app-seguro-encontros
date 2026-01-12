-- Simplify RLS policies for avaliacoes inserts (service role only) and split selects.

alter table public.avaliacoes enable row level security;

-- Drop legacy policies that might conflict.
drop policy if exists "Avaliacoes insert own" on public.avaliacoes;
drop policy if exists "Avaliacoes insert service role" on public.avaliacoes;
drop policy if exists "Avaliacoes select own or public" on public.avaliacoes;
drop policy if exists "Avaliacoes select own" on public.avaliacoes;
drop policy if exists "Avaliacoes select public" on public.avaliacoes;

create policy "Avaliacoes insert service role"
  on public.avaliacoes
  for insert
  with check (auth.role() = 'service_role');

create policy "Avaliacoes select own"
  on public.avaliacoes
  for select
  using (auth.uid() = user_id);

create policy "Avaliacoes select public"
  on public.avaliacoes
  for select
  using (
    auth.role() = 'authenticated'
    and is_anonymous = false
    and publica = true
    and public.can_view_public_avaliacoes(auth.uid())
  );
