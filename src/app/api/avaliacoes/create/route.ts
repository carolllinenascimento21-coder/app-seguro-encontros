import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

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

    if (!user || userError) {
      console.warn(`${logPrefix} usuária não autenticada`)
      return NextResponse.json(
        { success: false, message: 'Usuária não autenticada' },
        { status: 401 }
      )
    }

    const body = await req.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Payload inválido' },
        { status: 400 }
      )
    }

    const payload = body as Record<string, unknown>

    const nome = typeof payload.nome === 'string' ? payload.nome.trim() : ''
    const cidade = typeof payload.cidade === 'string' ? payload.cidade.trim() : ''
    const telefone =
      typeof payload.contato === 'string' ? payload.contato.trim() : null
    const relato =
      typeof payload.relato === 'string' ? payload.relato.trim() : null
    const isAnonymous =
      typeof payload.anonimo === 'boolean' ? payload.anonimo : false

    const ratings = payload.ratings as Record<string, number>

    if (!nome || !cidade || !ratings) {
      return NextResponse.json(
        { success: false, message: 'Dados obrigatórios ausentes' },
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

    if (Object.values(ratingMap).some(v => !v || v < 1)) {
      return NextResponse.json(
        { success: false, message: 'Avaliações inválidas' },
        { status: 400 }
      )
    }

    const parseFlags = (v: unknown): string[] => {
      if (!v) return []
      if (Array.isArray(v)) return v.filter(Boolean).map(String)
      if (typeof v === 'string')
        return v.split(',').map(s => s.trim()).filter(Boolean)
      return []
    }

    const flagsPositive = parseFlags(payload.greenFlags)
    const flagsNegative = parseFlags(payload.redFlags)

    /** 🔍 Buscar ou criar male_profile */
    let { data: maleProfile } = await supabaseAdmin
      .from('male_profiles')
      .select('id')
      .ilike('nome', nome)
      .ilike('cidade', cidade)
      .limit(1)
      .maybeSingle()

    if (!maleProfile) {
      const { data, error } = await supabaseAdmin
        .from('male_profiles')
        .insert({
          nome,
          cidade,
          telefone,
        })
        .select('id')
        .single()

      if (error || !data) {
        console.error(`${logPrefix} erro ao criar male_profile`, error)
        return NextResponse.json(
          { success: false, message: 'Erro ao criar perfil avaliado' },
          { status: 500 }
        )
      }

      maleProfile = data
    }

    /** 📝 Criar avaliação */
    const { data: avaliacao, error: avaliacaoError } = await supabaseAdmin
      .from('avaliacoes')
      .insert({
        autor_id: user.id,
        male_profile_id: maleProfile.id,
        relato,
        is_anonymous: isAnonymous,
        publica: true,
        flags_positive: flagsPositive,
        flags_negative: flagsNegative,
        ...ratingMap,
      })
      .select('id')
      .single()

    if (avaliacaoError || !avaliacao) {
      console.error(`${logPrefix} erro ao criar avaliação`, avaliacaoError)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar avaliação' },
        { status: 500 }
      )
    }

    console.info(`${logPrefix} avaliação criada`, {
      id: avaliacao.id,
      elapsedMs: Date.now() - startedAt,
    })

    return NextResponse.json(
      { success: true, id: avaliacao.id },
      { status: 201 }
    )
  } catch (err) {
    console.error('[api/avaliacoes/create] erro inesperado', err)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
