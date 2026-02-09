import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  const startedAt = Date.now()
  const logPrefix = '[api/avaliacoes/create]'
  let body: unknown
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

    if (userError?.code === 'AuthSessionMissingError' || !user) {
      console.warn(`${logPrefix} usuária não autenticada`, {
        hasUser: !!user,
        error: userError?.message,
      })
      return NextResponse.json(
        { success: false, message: 'Usuária não autenticada' },
        { status: 401 }
      )
    }

    try {
      body = await req.json()
    } catch {
      console.warn(`${logPrefix} payload inválido (json parse)`)
      return NextResponse.json(
        { success: false, message: 'Payload inválido' },
        { status: 400 }
      )
    }

    if (!body || typeof body !== 'object') {
      console.warn(`${logPrefix} payload inválido (body não objeto)`)
      return NextResponse.json(
        { success: false, message: 'Payload inválido' },
        { status: 400 }
      )
    }

    const {
      nome,
      cidade,
      contato,
      descricao,
      anonimo,
      ratings,
      greenFlags,
      redFlags,
      green_flags: greenFlagsSnake,
      red_flags: redFlagsSnake,
    } = body as Record<string, unknown>

    const nomeNormalizado =
      typeof nome === 'string' ? nome.trim().toLowerCase() : ''
    const cidadeNormalizada =
      typeof cidade === 'string' ? cidade.trim().toLowerCase() : ''
    const contatoNormalizado =
      typeof contato === 'string' ? contato.trim() : null
    const descricaoNormalizada =
      typeof descricao === 'string' ? descricao.trim() : null

    if (!nomeNormalizado || !cidadeNormalizada) {
      console.warn(`${logPrefix} validação falhou: nome/cidade`, {
        nome: nomeNormalizado,
        cidade: cidadeNormalizada,
      })
      return NextResponse.json(
        { success: false, message: 'Nome e cidade são obrigatórios' },
        { status: 400 }
      )
    }

    if (!ratings || typeof ratings !== 'object' || Array.isArray(ratings)) {
      console.warn(`${logPrefix} validação falhou: ratings`, {
        ratingsType: typeof ratings,
      })
      return NextResponse.json(
        { success: false, message: 'Avaliações por critério são obrigatórias' },
        { status: 400 }
      )
    }

    const ratingsPayload = ratings as Record<string, unknown>
    const ratingValues = Object.values(ratingsPayload)

    if (
      ratingValues.length === 0 ||
      ratingValues.some(
        (value) => typeof value !== 'number' || Number.isNaN(value) || value < 1
      )
    ) {
      console.warn(`${logPrefix} validação falhou: ratings inválidos`, {
        ratingValues,
      })
      return NextResponse.json(
        { success: false, message: 'Avaliações por critério são obrigatórias' },
        { status: 400 }
      )
    }

    const normalizedGreenFlags = Array.isArray(greenFlags)
      ? greenFlags
      : Array.isArray(greenFlagsSnake)
        ? greenFlagsSnake
        : null
    const normalizedRedFlags = Array.isArray(redFlags)
      ? redFlags
      : Array.isArray(redFlagsSnake)
        ? redFlagsSnake
        : null

    if (!normalizedGreenFlags || !normalizedRedFlags) {
      console.warn(`${logPrefix} validação falhou: flags inválidas`, {
        greenFlagsType: typeof greenFlags,
        redFlagsType: typeof redFlags,
      })
      return NextResponse.json(
        { success: false, message: 'Flags inválidas' },
        { status: 400 }
      )
    }

    if (
      normalizedGreenFlags.some(flag => typeof flag !== 'string') ||
      normalizedRedFlags.some(flag => typeof flag !== 'string')
    ) {
      console.warn(`${logPrefix} validação falhou: flags não textuais`)
      return NextResponse.json(
        { success: false, message: 'Flags inválidas' },
        { status: 400 }
      )
    }

    const ratingMap = {
      comportamento: Number(ratingsPayload.comportamento ?? 0),
      seguranca_emocional: Number(ratingsPayload.seguranca_emocional ?? 0),
      respeito: Number(ratingsPayload.respeito ?? 0),
      carater: Number(ratingsPayload.carater ?? 0),
      confianca: Number(ratingsPayload.confianca ?? 0),
    }
    const anonimoBool = !!anonimo

    const ratingKeys = Object.keys(ratingMap)
    if (
      ratingKeys.some(key => Number.isNaN(ratingMap[key as keyof typeof ratingMap])) ||
      Object.values(ratingMap).some(value => value < 1)
    ) {
      console.warn(`${logPrefix} validação falhou: ratings não numéricos`, ratingMap)
      return NextResponse.json(
        { success: false, message: 'Avaliações por critério são obrigatórias' },
        { status: 400 }
      )
    }

    console.info(`${logPrefix} criando avaliação`, {
      userId: user.id,
      nome: nomeNormalizado,
      cidade: cidadeNormalizada,
      anonimo: anonimoBool,
      ratings: ratingMap,
      greenFlagsCount: normalizedGreenFlags.length,
      redFlagsCount: normalizedRedFlags.length,
    })

    /** 📝 Criar avaliação */
    const { error: avaliacaoError } = await supabaseAdmin
      .from('avaliacoes')
      .insert({
        autor_id: user.id,
        user_id: anonimoBool ? null : user.id,
        nome: nomeNormalizado,
        cidade: cidadeNormalizada,
        contato: contatoNormalizado,
        relato: descricaoNormalizada,
        anonimo: anonimoBool,
        is_anonymous: anonimoBool,
        publica: !anonimoBool,
        flags_positive: normalizedGreenFlags,
        flags_negative: normalizedRedFlags,
        ...ratingMap,
      })

    if (avaliacaoError) {
      console.error(`${logPrefix} erro ao inserir avaliação`, avaliacaoError)
      return NextResponse.json(
        { success: false, message: avaliacaoError.message },
        { status: 500 }
      )
    }

    console.info(`${logPrefix} avaliação publicada`, {
      elapsedMs: Date.now() - startedAt,
    })
    return NextResponse.json(
      { success: true, message: 'Avaliação publicada com sucesso' },
      { status: 201 }
    )
  } catch (err: any) {
    console.error(`${logPrefix} erro inesperado`, err)
    return NextResponse.json(
      { success: false, message: 'Erro inesperado no servidor' },
      { status: 500 }
    )
  }
}
