import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

function normalizeText(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

function safeString(value: unknown) {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t ? t : null
}

function parseFlags(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    const raw = value.trim()
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed
          .filter((v): v is string => typeof v === 'string')
          .map((v) => v.trim())
          .filter(Boolean)
      }
    } catch {
      // fallback CSV
      return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }
  return []
}

export async function POST(req: Request) {
  const startedAt = Date.now()
  const logPrefix = '[api/avaliacoes/create]'

  try {
    const supabaseAdmin = getSupabaseAdminClient()
    if (!supabaseAdmin) {
      console.error(`${logPrefix} supabase admin não configurado`)
      return NextResponse.json(
        { success: false, message: 'Supabase admin não configurado' },
        { status: 503 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.warn(`${logPrefix} usuária não autenticada`, {
        hasUser: !!user,
        error: userError?.message,
      })
      return NextResponse.json(
        { success: false, message: 'Usuária não autenticada' },
        { status: 401 }
      )
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { success: false, message: 'Payload inválido' },
        { status: 400 }
      )
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Payload inválido' },
        { status: 400 }
      )
    }

    const payload = body as Record<string, unknown>

    // Front costuma mandar: nome, cidade, contato, descricao/relato, anonimo, ratings, greenFlags, redFlags
    const nomeRaw = payload.nome
    const cidadeRaw = payload.cidade
    const contatoRaw = payload.contato
    const descricaoRaw = payload.descricao ?? payload.relato ?? payload.notas
    const anonimoRaw = payload.anonimo ?? payload.is_anonymous
    const ratingsRaw = payload.ratings

    const greenFlagsRaw = payload.greenFlags ?? payload.flags_positive
    const redFlagsRaw = payload.redFlags ?? payload.flags_negative

    const nome = typeof nomeRaw === 'string' ? nomeRaw.trim() : ''
    const cidade = typeof cidadeRaw === 'string' ? cidadeRaw.trim() : ''

    const normalizedName = normalizeText(nomeRaw)
    const normalizedCity = normalizeText(cidadeRaw)

    const contato = safeString(contatoRaw)
    const notas = safeString(descricaoRaw)

    const isAnonymous =
      typeof anonimoRaw === 'boolean' ? anonimoRaw : Boolean(anonimoRaw)

    if (!nome || !cidade) {
      return NextResponse.json(
        { success: false, message: 'Nome e cidade são obrigatórios' },
        { status: 400 }
      )
    }

    if (!ratingsRaw || typeof ratingsRaw !== 'object' || Array.isArray(ratingsRaw)) {
      return NextResponse.json(
        { success: false, message: 'Avaliações por critério são obrigatórias' },
        { status: 400 }
      )
    }

    const ratings = ratingsRaw as Record<string, unknown>

    const ratingMap = {
      comportamento: Number(ratings.comportamento ?? 0),
      seguranca_emocional: Number(ratings.seguranca_emocional ?? 0),
      respeito: Number(ratings.respeito ?? 0),
      carater: Number(ratings.carater ?? 0),
      confianca: Number(ratings.confianca ?? 0),
    }

    if (
      Object.values(ratingMap).some(
        (v) => typeof v !== 'number' || Number.isNaN(v) || v < 1 || v > 5
      )
    ) {
      return NextResponse.json(
        { success: false, message: 'Avaliações por critério são obrigatórias (1 a 5)' },
        { status: 400 }
      )
    }

    const flagsPositive = parseFlags(greenFlagsRaw)
    const flagsNegative = parseFlags(redFlagsRaw)

    // 1) Achar ou criar o male_profile
    const { data: existingProfiles, error: findProfileError } = await supabaseAdmin
      .from('male_profiles')
      .select('id')
      .eq('normalized_name', normalizedName)
      .eq('normalized_city', normalizedCity)
      .limit(1)

    if (findProfileError) {
      console.error(`${logPrefix} erro ao buscar male_profile`, findProfileError)
      return NextResponse.json(
        { success: false, message: 'Erro ao validar perfil avaliado' },
        { status: 500 }
      )
    }

    let maleProfileId = existingProfiles?.[0]?.id as string | undefined

    if (!maleProfileId) {
      const { data: createdProfile, error: createProfileError } = await supabaseAdmin
        .from('male_profiles')
        .insert({
          display_name: nome,
          city: cidade,
          normalized_name: normalizedName,
          normalized_city: normalizedCity,
          is_active: true,
        })
        .select('id')
        .single()

      if (createProfileError || !createdProfile) {
        console.error(`${logPrefix} erro ao criar male_profile`, createProfileError)
        return NextResponse.json(
          { success: false, message: 'Erro ao criar perfil avaliado' },
          { status: 500 }
        )
      }

      maleProfileId = createdProfile.id
    }

    // 2) Criar avaliação apontando para male_profile_id
    const { data: avaliacaoCriada, error: avaliacaoError } = await supabaseAdmin
      .from('avaliacoes')
      .insert({
        autor_id: user.id,
        male_profile_id: maleProfileId,
        is_anonymous: isAnonymous,
        publica: true,

        contato,
        notas,

        flags_positive: flagsPositive,
        flags_negative: flagsNegative,

        ...ratingMap,
      })
      .select('id')
      .single()

    if (avaliacaoError || !avaliacaoCriada) {
      console.error(`${logPrefix} erro ao inserir avaliação`, avaliacaoError)
      return NextResponse.json(
        { success: false, message: avaliacaoError?.message ?? 'Erro ao publicar avaliação' },
        { status: 500 }
      )
    }

    console.info(`${logPrefix} ok`, {
      elapsedMs: Date.now() - startedAt,
      maleProfileId,
      avaliacaoId: avaliacaoCriada.id,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Avaliação publicada com sucesso',
        id: avaliacaoCriada.id,
        male_profile_id: maleProfileId,
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('[api/avaliacoes/create] erro inesperado', err)
    return NextResponse.json(
      { success: false, message: 'Erro inesperado no servidor' },
      { status: 500 }
    )
  }
}
