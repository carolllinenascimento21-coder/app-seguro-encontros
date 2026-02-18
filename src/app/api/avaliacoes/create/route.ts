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

  const { data: profile, error: profileError } = await supabase
    .from('male_profiles')
    .upsert(
      {
        normalized_name: normalizedName,
        normalized_city: normalizedCity,
        created_by: user.id,
      },
      {
        onConflict: 'normalized_name,normalized_city',
      }
    )
    .select('id')
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { error: profileError?.message ?? 'Erro ao criar ou localizar perfil avaliado.' },
      { status: 400 }
    )
  }

  const { data: avaliacao, error: avaliacaoError } = await supabase
    .from('avaliacoes')
    .insert({
      male_profile_id: profile.id,
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
    male_profile_id: profile.id,
    avaliacao_id: avaliacao.id,
  })
}
