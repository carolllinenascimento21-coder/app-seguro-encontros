import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

/* ──────────────────────────────────────────────── */
/* Helpers */
/* ──────────────────────────────────────────────── */
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
      return raw.split(',').map((s) => s.trim()).filter(Boolean)
    }
  }
  return []
}

/* ──────────────────────────────────────────────── */
/* Route */
/* ──────────────────────────────────────────────── */
export async function POST(req: Request) {
  const logPrefix = '[api/avaliacoes/create]'
  const startedAt = Date.now()

  try {
    /* 1️⃣ Supabase admin */
    const supabaseAdmin = getSupabaseAdminClient()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Supabase admin não configurado' },
        { status: 503 }
      )
    }

    /* 2️⃣ Usuária autenticada */
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Usuária não autenticada' },
        { status: 401 }
      )
    }

    /* 3️⃣ Payload */
    let payload: Record<string, unknown>
    try {
      payload = (await req.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json(
        { success: false, message: 'Payload inválido' },
        { status: 400 }
      )
    }

    const nome = typeof payload.nome === 'string' ? payload.nome.trim() : ''
    const cidade = typeof payload.cidade === 'string' ? payload.cidade.trim() : ''

    if (!nome || !cidade) {
      return NextResponse.json(
        { success: false, message: 'Nome e cidade são obrigatórios' },
        { status: 400 }
      )
    }

    const normalizedName = normalizeText(nome)
    const normalizedCity = normalizeText(cidade)

    const ratings = payload.ratings as Record<string, unknown>
    if (!ratings || typeof ratings !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Avaliações por critério são obrigatórias' },
        { status: 400 }
      )
    }

    const ratingMap = {
      comportamento: Number(ratings.comportamento),
      seguranca_emocional: Number(ratings.seguranca_emocional),
      respeito: Number(ratings.respeito),
      carater: Number(ratings.carater),
      confianca: Number(ratings.confianca),
    }

    if (
      Object.values(ratingMap).some(
        (v) => Number.isNaN(v) || v < 1 || v > 5
      )
    ) {
      return NextResponse.json(
        { success: false, message: 'Avaliações devem ser de 1 a 5' },
        { status: 400 }
      )
    }

    const flagsPositive = parseFlags(payload.greenFlags ?? payload.flags_positive)
    const flagsNegative = parseFlags(payload.redFlags ?? payload.flags_negative)

    const contato = safeString(payload.contato)
    const notas = safeString(payload.descricao ?? payload.relato)
    const isAnonymous = Boolean(payload.anonimo ?? payload.is_anonymous)

    /* 4️⃣ Buscar ou criar male_profile (SEM JOIN) */
    const { data: existingProfile, error: findError } = await supabaseAdmin
      .from('male_profiles')
      .select('id')
      .eq('normalized_name', normalizedName)
      .eq('normalized_city', normalizedCity)
      .limit(1)
      .maybeSingle()

    if (findError) {
      console.error(logPrefix, findError)
      return NextResponse.json(
        { success: false, message: `Erro ao validar perfil avaliado: ${findError.message}` },
        { status: 500 }
      )
    }

    let maleProfileId = existingProfile?.id as string | undefined

    if (!maleProfileId) {
      const { data: createdProfile, error: createError } = await supabaseAdmin
        .from('male_profiles')
        .upsert({
          display_name: nome,
          city: cidade,
          normalized_name: normalizedName,
          normalized_city: normalizedCity,
          is_active: true,
        }, { onConflict: 'normalized_name,normalized_city', ignoreDuplicates: false })
        .select('id')
        .single()

      if (createError || !createdProfile) {
        console.error(logPrefix, createError)
        return NextResponse.json(
          {
            success: false,
            message: `Erro ao criar perfil avaliado: ${createError?.message ?? 'unknown error'}`,
          },
          { status: 500 }
        )
      }

      maleProfileId = createdProfile.id
    }

    /* 5️⃣ Criar avaliação (FK VALIDADA) */
    const { data: avaliacao, error: insertError } = await supabaseAdmin
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

    if (insertError || !avaliacao) {
      console.error(logPrefix, insertError)
      return NextResponse.json(
        { success: false, message: insertError?.message ?? 'Erro ao publicar avaliação' },
        { status: 500 }
      )
    }

    console.info(logPrefix, 'OK', {
      elapsedMs: Date.now() - startedAt,
      maleProfileId,
      avaliacaoId: avaliacao.id,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Avaliação publicada com sucesso',
        id: avaliacao.id,
        male_profile_id: maleProfileId,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[api/avaliacoes/create] erro inesperado', err)
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Erro inesperado no servidor',
      },
      { status: 500 }
    )
  }
}
