import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

type AvaliacaoRequest = {
  nome?: string
  cidade?: string
  contato?: string
  relato?: string
  anonimo?: boolean
  flags?: string[]
  comportamento?: number
  seguranca_emocional?: number
  respeito?: number
  carater?: number
  confianca?: number
}

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError && sessionError.code !== 'AuthSessionMissingError') {
    return NextResponse.json({ error: 'Erro ao carregar sessão' }, { status: 401 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Usuária não autenticada' }, { status: 401 })
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError?.code === 'AuthSessionMissingError' || authError || !user) {
    return NextResponse.json({ error: 'Usuária não autenticada' }, { status: 401 })
  }

  let body: AvaliacaoRequest
  try {
    body = await req.json()
  } catch (error) {
    console.error('Erro ao ler payload de avaliação', error)
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const nome = body.nome?.trim() ?? ''
  const comportamento = body.comportamento ?? 0

  if (!nome || comportamento === 0) {
    return NextResponse.json(
      { error: 'Preencha o nome e ao menos a avaliação de comportamento.' },
      { status: 400 }
    )
  }

  const { error: consumeError } = await supabaseAdmin.rpc('consume_credit_for_action', {
    user_uuid: user.id,
    action: 'criar_avaliacao',
  })

  if (consumeError) {
    const message = consumeError.message ?? ''
    if (message.includes('PAYWALL')) {
      return NextResponse.json({ success: false, reason: 'PAYWALL' }, { status: 200 })
    }
    console.error('Erro ao consumir crédito para avaliação', consumeError)
    return NextResponse.json({ error: 'Erro ao validar créditos' }, { status: 500 })
  }

  const { error } = await supabase.from('avaliacoes').insert({
    nome,
    cidade: body.cidade?.trim() || null,
    contato: body.contato?.trim() || null,
    relato: body.relato?.trim() || null,
    flags: body.flags ?? [],
    anonimo: body.anonimo ?? true,
    comportamento,
    seguranca_emocional: body.seguranca_emocional ?? 0,
    respeito: body.respeito ?? 0,
    carater: body.carater ?? 0,
    confianca: body.confianca ?? 0,
  })

  if (error) {
    console.error('Erro ao inserir avaliação', error)
    return NextResponse.json({ error: 'Erro ao enviar avaliação' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
