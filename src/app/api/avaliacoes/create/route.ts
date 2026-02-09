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

    const payload = body as Record<string, unknown>
    const nomeRaw = payload.nome
    const cidadeRaw = payload.cidade
    const contatoRaw = payload.contato
    const descricaoRaw = payload.descricao ?? payload.relato
    const anonimoRaw = payload.anonimo
    const ratingsRaw = payload.ratings
    const greenFlagsRaw = payload.greenFlags ?? payload.flags_positive
    const redFlagsRaw = payload.redFlags ?? payload.flags_negative

    const nomeNormalizado =
      typeof nomeRaw === 'string' ? nomeRaw.trim() : ''
    const cidadeNormalizada =
      typeof cidadeRaw === 'string' ? cidadeRaw.trim() : ''
    const contatoNormalizado =
      typeof contatoRaw === 'string' ? contatoRaw.trim() : null
    const descricaoNormalizada =
      typeof descricaoRaw === 'string' ? descricaoRaw.trim() : null
    const anonimoBool =
      typeof anonimoRaw === 'boolean' ? anonimoRaw : false

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

    if (!ratingsRaw || typeof ratingsRaw !== 'object' || Array.isArray(ratingsRaw)) {
      console.warn(`${logPrefix} validação falhou: ratings`, {
        ratingsType: typeof ratingsRaw,
      })
      return NextResponse.json(
        { success: false, message: 'Avaliações por critério são obrigatórias' },
        { status: 400 }
      )
    }

    const ratingsPayload = ratingsRaw as Record<string, unknown>
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

    const parseFlags = (value: unknown) => {
      if (value == null) return []
      if (Array.isArray(value)) return value
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed)) return parsed
        } catch {
          return value
            .split(',')
            .map(item => item.trim())
            .filter(Boolean)
        }
      }
      return []
    }

    const normalizedGreenFlags = parseFlags(greenFlagsRaw)
      .filter((flag): flag is string => typeof flag === 'string')
      .map(flag => flag.trim())
      .filter(Boolean)
    const normalizedRedFlags = parseFlags(redFlagsRaw)
      .filter((flag): flag is string => typeof flag === 'string')
      .map(flag => flag.trim())
      .filter(Boolean)

    const ratingMap = {
      comportamento: Number(ratingsPayload.comportamento ?? 0),
      seguranca_emocional: Number(ratingsPayload.seguranca_emocional ?? 0),
      respeito: Number(ratingsPayload.respeito ?? 0),
      carater: Number(ratingsPayload.carater ?? 0),
      confianca: Number(ratingsPayload.confianca ?? 0),
    }

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

    let avaliadosQuery = supabaseAdmin
      .from('avaliados')
      .select('id')
      .ilike('nome', nomeNormalizado)
      .ilike('cidade', cidadeNormalizada)

    if (contatoNormalizado) {
      avaliadosQuery = avaliadosQuery.eq('telefone', contatoNormalizado)
    }

    const { data: avaliadosExistentes, error: avaliadoBuscaError } =
      await avaliadosQuery.limit(1)

    if (avaliadoBuscaError) {
      console.error(`${logPrefix} erro ao buscar avaliado`, avaliadoBuscaError)
      return NextResponse.json(
        { success: false, message: 'Erro ao validar avaliado' },
        { status: 500 }
      )
    }

    let avaliadoId = avaliadosExistentes?.[0]?.id

    if (!avaliadoId) {
      const { data: avaliadoCriado, error: avaliadoError } =
        await supabaseAdmin
          .from('avaliados')
          .insert({
            nome: nomeNormalizado,
            cidade: cidadeNormalizada,
            telefone: contatoNormalizado,
          })
          .select('id')
          .single()

      if (avaliadoError || !avaliadoCriado) {
        console.error(`${logPrefix} erro ao criar avaliado`, avaliadoError)
        return NextResponse.json(
          { success: false, message: 'Erro ao criar avaliado' },
          { status: 500 }
        )
      }

      avaliadoId = avaliadoCriado.id
    }

    /** 📝 Criar avaliação */
    const { data: avaliacaoCriada, error: avaliacaoError } = await supabaseAdmin
      .from('avaliacoes')
      .insert({
        autor_id: user.id,
        avaliado_id: avaliadoId,
        relato: descricaoNormalizada,
        anonimo: anonimoBool,
        publica: true,
        flags_positive: normalizedGreenFlags,
        flags_negative: normalizedRedFlags,
        ...ratingMap,
      })
      .select('id')
      .single()

    if (avaliacaoError || !avaliacaoCriada) {
      console.error(`${logPrefix} erro ao inserir avaliação`, avaliacaoError)
      return NextResponse.json(
        { success: false, message: avaliacaoError.message },
        { status: 500 }
      )
    }

    const { error: autoraError } = await supabaseAdmin
      .from('avaliacoes_autoras')
      .insert({
        avaliacao_id: avaliacaoCriada.id,
        autora_id: user.id,
      })

    if (autoraError) {
      console.error(`${logPrefix} erro ao inserir autora`, autoraError)
      await supabaseAdmin.from('avaliacoes').delete().eq('id', avaliacaoCriada.id)
      return NextResponse.json(
        { success: false, message: 'Erro ao vincular autora' },
        { status: 500 }
      )
    }

    console.info(`${logPrefix} avaliação publicada`, {
      elapsedMs: Date.now() - startedAt,
    })
    return NextResponse.json(
      { success: true, message: 'Avaliação publicada com sucesso', id: avaliacaoCriada.id },
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
