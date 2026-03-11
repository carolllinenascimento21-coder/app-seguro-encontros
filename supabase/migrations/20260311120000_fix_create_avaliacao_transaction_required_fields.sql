create or replace function public.create_avaliacao_transaction(
  p_male_profile_id uuid,
  p_user_id uuid,
  p_relato text,
  p_anomimo boolean,
  p_comportamento integer,
  p_seguranca_emocional integer,
  p_respeito integer,
  p_carater integer,
  p_confianca integer,
  p_flags_positive text[],
  p_flags_negative text[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_avaliacao_id uuid;
begin
  insert into public.avaliacoes (
    male_profile_id,
    user_id,
    relato,
    anonimo,
    is_anonymous,
    publica,
    comportamento,
    seguranca_emocional,
    respeito,
    carater,
    confianca,
    flags_positive,
    flags_negative
  )
  values (
    p_male_profile_id,
    p_user_id,
    p_relato,
    coalesce(p_anomimo, true),
    coalesce(p_anomimo, true),
    not coalesce(p_anomimo, true),
    coalesce(p_comportamento, 0),
    coalesce(p_seguranca_emocional, 0),
    coalesce(p_respeito, 0),
    coalesce(p_carater, 0),
    coalesce(p_confianca, 0),
    coalesce(p_flags_positive, '{}'::text[]),
    coalesce(p_flags_negative, '{}'::text[])
  )
  returning id into v_avaliacao_id;

  return v_avaliacao_id;
end;
$$;
