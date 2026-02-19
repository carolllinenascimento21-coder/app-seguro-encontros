import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

function toRating(n: unknown) {
  const v = Number(n)
  if (!Number.isFinite(v) || v < 1 || v > 5) return null
  return v
}

function parseFlags(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.trim())
      .filter(Boolean)
  }
  return []
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdminClient()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Supabase admin não configurado' },
        { status: 503 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuária não autenticada' },
        { status: 401 }
      )
    }

    const body = await req.json()

    const {
      male_profile_id,
      comportamento,
      seguranca_emocional,
      respeito,
      carater,
      confianca,
      flags_positive,
      flags_negative,
      relato,
      anonimo,
    } = body

    if (!male_profile_id) {
      return NextResponse.json(
        { success: false, message: 'Perfil inválido' },
        { status: 400 }
      )
    }

    const ratingMap = {
      comportamento: toRating(comportamento),
      seguranca_emocional: toRating(seguranca_emocional),
      respeito: toRating(respeito),
      carater: toRating(carater),
      confianca: toRating(confianca),
    }

    if (Object.values(ratingMap).some((v) => v == null)) {
      return NextResponse.json(
        { success: false, message: 'Notas devem ser entre 1 e 5' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('avaliacoes')
      .insert({
        male_profile_id,
        user_id: user.id,
        is_anonymous: Boolean(anonimo),
        publica: true,
        relato: typeof relato === 'string' ? relato : null,
        flags_positive: parseFlags(flags_positive),
        flags_negative: parseFlags(flags_negative),
        ...ratingMap,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, id: data.id },
      { status: 201 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
