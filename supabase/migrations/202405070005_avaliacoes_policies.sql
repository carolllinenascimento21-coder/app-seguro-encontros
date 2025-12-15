-- Enforce RLS for avaliacoes and historico_avaliacoes

-- Enable RLS
alter table if exists public.avaliacoes enable row level security;
alter table if exists public.historico_avaliacoes enable row level security;

-- Policies for avaliacoes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'avaliacoes' AND polname = 'avaliacoes_select_own'
  ) THEN
    CREATE POLICY avaliacoes_select_own ON public.avaliacoes
      FOR SELECT USING (auth.uid() = autor_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'avaliacoes' AND polname = 'avaliacoes_insert_own'
  ) THEN
    CREATE POLICY avaliacoes_insert_own ON public.avaliacoes
      FOR INSERT WITH CHECK (auth.uid() = autor_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'avaliacoes' AND polname = 'avaliacoes_update_own'
  ) THEN
    CREATE POLICY avaliacoes_update_own ON public.avaliacoes
      FOR UPDATE USING (auth.uid() = autor_id) WITH CHECK (auth.uid() = autor_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'avaliacoes' AND polname = 'avaliacoes_delete_own'
  ) THEN
    CREATE POLICY avaliacoes_delete_own ON public.avaliacoes
      FOR DELETE USING (auth.uid() = autor_id);
  END IF;
END $$;

-- Policies for historico_avaliacoes (read only for owners)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'historico_avaliacoes' AND polname = 'historico_select_own'
  ) THEN
    CREATE POLICY historico_select_own ON public.historico_avaliacoes
      FOR SELECT USING (auth.uid() = autor_id);
  END IF;
END $$;
