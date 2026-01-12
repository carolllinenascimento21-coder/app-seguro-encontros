import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { normalizeNegativeFlags, normalizePositiveFlags } from '@/lib/flags'
import { getMissingSupabaseEnvDetails } from '@/lib/env'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

type AvaliacaoRequest = {
  nome?: string
  nome_avaliado?: string
  cidade?: string
  contato?: string
  relato?: string
  comentario?: string
  anonimo?: boolean
  is_anonymous?: boolean
  flags?: string[]
  flags_positive?: string[]
  flags_negative?: string[]
  comportamento?: number
  seguranca_emocional?: number
  respeito?: number
  carater?: number
  confianca?: number
}

export async function POST(req: Request) {
  let supabaseAdmin
  try {
    supabaseAdmin = getSupabaseAdminClient()
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      console.error(envError.message)
      return NextResponse.json({ error: envError.message }, { status: envError.status })
    }
    throw error
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase admin não configurado' },
      { status: 503 }
    )
  }

  const supabase = createRouteHandlerClient({ cookies })
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    console.error('Erro ao carregar usuário para avaliação', userError)
  }

  let body: AvaliacaoRequest
  try {
    body = await req.json()
  } catch (error) {
    console.error('Erro ao ler payload de avaliação', error)
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const nome = (body.nome_avaliado ?? body.nome)?.trim() ?? ''
  const comportamento = body.comportamento ?? 0

  if (!nome || comportamento === 0) {
    return NextResponse.json(
      { error: 'Preencha o nome e ao menos a avaliação de comportamento.' },
      { status: 400 }
    )
  }

  const isAnonymous = body.is_anonymous ?? body.anonimo ?? true
  const userId = userData?.user?.id ?? null

  if (!isAnonymous && !userId) {
    return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 })
  }

  const userIdToInsert = isAnonymous ? null : userId
  const normalizedPositiveFlags = normalizePositiveFlags(body.flags_positive ?? [])
  const negativeInput = [
    ...(body.flags_negative ?? []),
    ...(body.flags ?? []),
  ]
  const normalizedNegativeFlags = normalizeNegativeFlags(negativeInput)

  const comentario = (body.comentario ?? body.relato)?.trim() || null

  // Usa service role para evitar dependência de cookies/sessão e garantir inserts com RLS.
  const { data, error } = await supabaseAdmin
    .from('avaliacoes')
    .insert({
      user_id: userIdToInsert,
      nome,
      cidade: body.cidade?.trim() || null,
      contato: body.contato?.trim() || null,
      comportamento,
      seguranca_emocional: body.seguranca_emocional ?? 0,
      respeito: body.respeito ?? 0,
      carater: body.carater ?? 0,
      confianca: body.confianca ?? 0,
      flags_positive: normalizedPositiveFlags,
      flags_negative: normalizedNegativeFlags,
      relato: comentario,
      anonimo: isAnonymous,
      is_anonymous: isAnonymous,
      publica: !isAnonymous,
    })
    .select('id')
    .single()

  if (error) {
    const message = error.message ?? ''
    if (message.includes('PAYWALL')) {
      return NextResponse.json(
        { error: 'Sem créditos ou plano ativo para enviar avaliação.' },
        { status: 403 }
      )
    }
    if (
      message.toLowerCase().includes('row-level security')
      || error.code === '42501'
    ) {
      return NextResponse.json(
        { error: 'Sem permissão para enviar avaliação.' },
        { status: 403 }
      )
    }
    if (['22P02', '23502', '23503', '42703'].includes(error.code ?? '')) {
      return NextResponse.json(
        { error: 'Payload inválido.' },
        { status: 400 }
      )
    }
    console.error('Erro ao inserir avaliação', {
      message: error.message,
      code: error.code,
      details: error.details,
    })
    return NextResponse.json(
      { error: 'Erro ao enviar avaliação' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, avaliacao_id: data?.id }, { status: 201 })
}
