import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

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
    return NextResponse.json(
      { error: 'Sessão expirada. Faça login novamente.' },
      { status: 401 }
    )
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

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('male_profiles')
    .select('id')
    .eq('normalized_name', normalizedName)
    .eq('normalized_city', normalizedCity)
    .maybeSingle()

  if (existingProfileError) {
    console.error('[api/avaliacoes/create] Erro ao buscar perfil existente:', existingProfileError)
    return NextResponse.json(
      { error: 'Erro ao criar ou localizar perfil avaliado.' },
      { status: 400 }
    )
  }

  let maleProfileId = existingProfile?.id ?? null

  if (!maleProfileId) {
    const { data: insertedProfile, error: insertedProfileError } = await supabase
      .from('male_profiles')
      .insert({
        nome,
        cidade,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (insertedProfileError || !insertedProfile) {
      console.error('[api/avaliacoes/create] Erro ao inserir perfil:', insertedProfileError)
      return NextResponse.json(
        { error: insertedProfileError?.message ?? 'Erro ao criar perfil avaliado.' },
        { status: 400 }
      )
    }

    maleProfileId = insertedProfile.id
  }

  const avaliacaoPayload = {
    male_profile_id: maleProfileId,
    contato: contato || null,
    relato: relato || null,
    anonimo,
    comportamento: notas.comportamento,
    seguranca_emocional: notas.seguranca_emocional,
    respeito: notas.respeito,
    carater: notas.carater,
    confianca: notas.confianca,
    flags_positive: is_positive,
    flags_negative: is_negative,
  }

  let avaliacao: { id: string } | null = null

  const { data: avaliacaoByAuthorId, error: avaliacaoByAuthorIdError } = await supabase
    .from('avaliacoes')
    .insert({
      ...avaliacaoPayload,
      author_id: user.id,
    })
    .select('id')
    .single()

  if (avaliacaoByAuthorIdError) {
    const shouldRetryWithAutorId = /author_id/i.test(avaliacaoByAuthorIdError.message)

    if (!shouldRetryWithAutorId) {
      console.error('[api/avaliacoes/create] Erro ao inserir avaliação (author_id):', avaliacaoByAuthorIdError)
      return NextResponse.json(
        { error: avaliacaoByAuthorIdError.message ?? 'Erro ao publicar avaliação.' },
        { status: 400 }
      )
    }

    const { data: avaliacaoByAutorId, error: avaliacaoByAutorIdError } = await supabase
      .from('avaliacoes')
      .insert({
        ...avaliacaoPayload,
        autor_id: user.id,
      })
      .select('id')
      .single()

    if (avaliacaoByAutorIdError || !avaliacaoByAutorId) {
      console.error('[api/avaliacoes/create] Erro ao inserir avaliação (autor_id):', avaliacaoByAutorIdError)
      return NextResponse.json(
        { error: avaliacaoByAutorIdError?.message ?? 'Erro ao publicar avaliação.' },
        { status: 400 }
      )
    }

    avaliacao = avaliacaoByAutorId
  } else {
    avaliacao = avaliacaoByAuthorId
  }

  if (!avaliacao) {
    return NextResponse.json(
      { error: 'Erro ao publicar avaliação.' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    ok: true,
    male_profile_id: maleProfileId,
    avaliacao_id: avaliacao.id,
  })
}
