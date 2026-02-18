import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const getString = (value: unknown) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const getStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as string[]
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession()

  const user = session?.user ?? null

  if (authError || !user) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login para publicar avaliações.' }, { status: 403 })
  }

  const body = await request.json()

  const nome = getString(body.nome)
  const cidade = getString(body.cidade)
  const contato = getString(body.contato)
  const relato = getString(body.relato)
  const anonimo = Boolean(body.anonimo)

  const notas = {
    comportamento: Number(body?.notas?.comportamento ?? body.comportamento ?? 0),
    seguranca_emocional: Number(
      body?.notas?.seguranca_emocional ?? body.seguranca_emocional ?? 0
    ),
    respeito: Number(body?.notas?.respeito ?? body.respeito ?? 0),
    carater: Number(body?.notas?.carater ?? body.carater ?? 0),
    confianca: Number(body?.notas?.confianca ?? body.confianca ?? 0),
  }

  const is_positive = getStringArray(body.is_positive ?? body.greenFlags)
  const is_negative = getStringArray(body.is_negative ?? body.redFlags)

  if (!nome || !cidade) {
    return NextResponse.json(
      { error: 'Nome e cidade são obrigatórios.' },
      { status: 400 }
    )
  }

  const normalizedName = normalizeText(nome)
  const normalizedCity = normalizeText(cidade)

  const { data: existingProfiles, error: existingProfilesError } = await supabase
    .from('male_profiles')
    .select('id, city, normalized_city')
    .eq('normalized_name', normalizedName)

  if (existingProfilesError) {
    return NextResponse.json(
      { error: existingProfilesError.message ?? 'Erro ao buscar perfil avaliado.' },
      { status: 400 }
    )
  }

  const matchedProfile =
    existingProfiles?.find((profile) => {
      const profileNormalizedCity =
        typeof profile.normalized_city === 'string' && profile.normalized_city
          ? profile.normalized_city
          : normalizeText(String(profile.city ?? ''))
      return profileNormalizedCity === normalizedCity
    }) ?? null

  let maleProfileId = matchedProfile?.id ?? null

  if (!maleProfileId) {
    const { data: createdProfile, error: createdProfileError } = await supabase
      .from('male_profiles')
      .insert({
        name: nome,
        city: cidade,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (createdProfileError || !createdProfile) {
      return NextResponse.json(
        { error: createdProfileError?.message ?? 'Erro ao criar perfil avaliado.' },
        { status: 400 }
      )
    }

    maleProfileId = createdProfile.id
  }

  const { data: avaliacao, error: avaliacaoError } = await supabase
    .from('avaliacoes')
    .insert({
      male_profile_id: maleProfileId,
      autor_id: user.id,
      contato: contato || null,
      relato: relato || null,
      anonimo,
      comportamento: notas.comportamento,
      seguranca_emocional: notas.seguranca_emocional,
      respeito: notas.respeito,
      carater: notas.carater,
      confianca: notas.confianca,
      is_positive,
      is_negative,
    })
    .select('id')
    .single()

  if (avaliacaoError || !avaliacao) {
    return NextResponse.json(
      { error: avaliacaoError?.message ?? 'Erro ao publicar avaliação.' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    ok: true,
    male_profile_id: maleProfileId,
    avaliacao_id: avaliacao.id,
  })
}
