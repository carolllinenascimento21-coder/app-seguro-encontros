import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'


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

  const isAnonymous = body.anonimo ?? true

  const { error } = await supabase.from('avaliacoes').insert({
    user_id: user.id,
    nome,
    cidade: body.cidade?.trim() || null,
    contato: body.contato?.trim() || null,
    relato: body.relato?.trim() || null,
    flags: body.flags ?? [],
    anonimo: isAnonymous,
    is_anonymous: isAnonymous,
    publica: !isAnonymous,
    comportamento,
    seguranca_emocional: body.seguranca_emocional ?? 0,
    respeito: body.respeito ?? 0,
    carater: body.carater ?? 0,
    confianca: body.confianca ?? 0,
  })

  if (error) {
    const message = error.message ?? ''
    if (error.code === '42501' || message.includes('row-level security')) {
      return NextResponse.json(
        { error: 'Sem créditos ou plano ativo para enviar avaliação.' },
        { status: 403 }
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

  return NextResponse.json({ success: true })
}
