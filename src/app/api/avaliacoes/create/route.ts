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
  if (!value) return []
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string')
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return value.split(',').map(v => v.trim()).filter(Boolean)
    }
  }
  return []
}

/* ──────────────────────────────────────────────── */
/* Route */
/* ──────────────────────────────────────────────── */
export async function POST(req: Request) {
  const logPrefix = '[api/avaliacoes/create]'

  try {
    /* 1️⃣ Admin client */
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
    const payload = await req.json()

    const nome = payload.nome?.trim()
    const cidade = payload.cidade?.trim()

    if (!nome || !cidade) {
      return NextResponse.json(
        { success: false, message: 'Nome e cidade são obrigatórios' },
        { status: 400 }
      )
    }

    const normalizedName = normalizeText(nome)
    const normalizedCity = normalizeText(cidade)

    const ratings = payload.ratings
    if (!ratings) {
      return NextResponse.json(
        { success: false, message: 'Avaliações são obrigatórias' },
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

    if (Object.values(ratingMap).some(v => v < 1 || v > 5 || isNaN(v))) {
      return NextResponse.json(
        { success: false, message: 'Notas devem ser entre 1 e 5' },
        { status: 400 }
      )
    }

    const flagsPositive = parseFlags(payload.greenFlags)
    const flagsNegative = parseFlags(payload.redFlags)

    const contato = safeString(payload.contato)
    const notas = safeString(payload.descricao)
    const isAnonymous = Boolean(payload.anonimo)

    /* 4️⃣ Buscar ou criar male_profile SEM upsert */
    const { data: existingProfile } = await supabaseAdmin
      .from('male_profiles')
      .select('id')
      .eq('normalized_name', normalizedName)
      .eq('normalized_city', normalizedCity)
      .maybeSingle()

    let maleProfileId = existingProfile?.id

    if (!maleProfileId) {
      const { data: createdProfile, error: createError } =
        await supabaseAdmin
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

      if (createError || !createdProfile) {
        console.error(logPrefix, createError)
        return NextResponse.json(
          { success: false, message: createError?.message },
          { status: 500 }
        )
      }

      maleProfileId = createdProfile.id
    }

    /* 5️⃣ Criar avaliação */
    const { data: avaliacao, error: insertError } =
      await supabaseAdmin
        .from('avaliacoes')
        .insert({
          autora_id: user.id, // ✅ CORRETO
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

    if (insertError) {
      console.error(logPrefix, insertError)
      return NextResponse.json(
        { success: false, message: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        id: avaliacao.id,
        male_profile_id: maleProfileId,
      },
      { status: 201 }
    )

  } catch (err) {
    console.error('[api/avaliacoes/create] fatal', err)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}
