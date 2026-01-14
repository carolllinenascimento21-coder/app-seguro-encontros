import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { normalizeNegativeFlags, normalizePositiveFlags } from '@/lib/flags'
import { getMissingSupabaseEnvDetails } from '@/lib/env'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { validateAvaliacaoPayload } from '@/lib/avaliacoes'

const createErrorResponse = (
  status: number,
  message: string,
  details?: Record<string, unknown>
) =>
  NextResponse.json(
    {
      success: false,
      error: message,
      ...details,
    },
    { status }
  )

export async function POST(req: Request) {
  let supabaseAdmin
  try {
    supabaseAdmin = getSupabaseAdminClient()
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      console.error(envError.message)
      return createErrorResponse(envError.status, envError.message)
    }
    throw error
  }

  if (!supabaseAdmin) {
    return createErrorResponse(503, 'Supabase admin não configurado')
  }

  const supabase = createRouteHandlerClient({ cookies })
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    console.error('Erro ao carregar usuário para avaliação', userError)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch (error) {
    console.error('Erro ao ler payload de avaliação', error)
    return createErrorResponse(400, 'Payload inválido')
  }

  const validation = validateAvaliacaoPayload(body)
  if (!validation.success) {
    return createErrorResponse(validation.status, validation.message, {
      errors: validation.errors,
    })
  }

  const {
    nome,
    descricao,
    cidade,
    contato,
    anonimo,
    ratings,
    greenFlags,
    redFlags,
  } = validation.data

  const isAnonymous = anonimo
  const userId = userData?.user?.id ?? null

  if (!isAnonymous && !userId) {
    return createErrorResponse(401, 'Usuário não autenticado.')
  }

  const userIdToInsert = isAnonymous ? null : userId
  const normalizedPositiveFlags = normalizePositiveFlags(greenFlags)
  const normalizedNegativeFlags = normalizeNegativeFlags(redFlags)

  try {
    // Usa service role para evitar dependência de cookies/sessão e garantir inserts com RLS.
    const { data, error } = await supabaseAdmin
      .from('avaliacoes')
      .insert({
        user_id: userIdToInsert,
        avaliado_id: validation.data.avaliadoId,
        nome,
        cidade,
        contato,
        comportamento: ratings.comportamento,
        seguranca_emocional: ratings.seguranca_emocional,
        respeito: ratings.respeito,
        carater: ratings.carater,
        confianca: ratings.confianca,
        flags_positive: normalizedPositiveFlags,
        flags_negative: normalizedNegativeFlags,
        relato: descricao,
        anonimo: isAnonymous,
        is_anonymous: isAnonymous,
        publica: !isAnonymous,
      })
      .select('id')
      .single()

    if (error) {
      const message = error.message ?? ''
      if (message.includes('PAYWALL')) {
        return createErrorResponse(
          403,
          'Sem créditos ou plano ativo para enviar avaliação.'
        )
      }
      if (
        message.toLowerCase().includes('row-level security')
        || error.code === '42501'
      ) {
        return createErrorResponse(403, 'Sem permissão para enviar avaliação.')
      }
      if (['22P02', '23502', '23503', '42703'].includes(error.code ?? '')) {
        return createErrorResponse(400, 'Payload inválido.', {
          code: error.code,
        })
      }
      console.error('Erro ao inserir avaliação', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return createErrorResponse(
        500,
        'Erro ao enviar avaliação',
        process.env.NODE_ENV !== 'production'
          ? { code: error.code, details: error.details, hint: error.hint }
          : undefined
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Avaliação criada com sucesso',
        avaliacao_id: data?.id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro inesperado ao criar avaliação', error)
    return createErrorResponse(
      500,
      'Erro ao enviar avaliação',
      process.env.NODE_ENV !== 'production' && error instanceof Error
        ? { stack: error.stack }
        : undefined
    )
  }
}
