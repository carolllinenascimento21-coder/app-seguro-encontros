import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

const DEFAULT_LIMIT = 20

export async function GET(req: Request) {
  // 1️⃣ Ambiente Supabase público
  try {
    getSupabasePublicEnv('api/busca')
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      return NextResponse.json(
        { error: envError.message },
        { status: envError.status }
      )
    }
    throw error
  }

  // 2️⃣ Supabase Admin
  const supabaseAdmin = getSupabaseAdminClient()
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase admin não configurado' },
      { status: 503 }
    )
  }

  // 3️⃣ Autenticação
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Usuária não autenticada' },
      { status: 401 }
    )
  }

  // 4️⃣ Parâmetros
  const { searchParams } = new URL(req.url)
  const nome = searchParams.get('nome')?.trim() ?? ''
  const cidade = searchParams.get('cidade')?.trim() ?? ''

  if (!nome && !cidade) {
    return NextResponse.json(
      { error: 'Informe nome ou cidade' },
      { status: 400 }
    )
  }

  // 5️⃣ Consome crédito
  const { error: creditError } = await supabaseAdmin.rpc(
    'consume_query',
    { user_uuid: user.id }
  )

  if (creditError) {
    if (creditError.message?.includes('PAYWALL')) {
      return NextResponse.json({ allowed: false }, { status: 200 })
    }
    return NextResponse.json(
      { error: 'Erro ao validar créditos' },
      { status: 500 }
    )
  }

  // 6️⃣ BUSCA NA VIEW (CORRETA)
  let query = supabaseAdmin
    .from('reputacao_agregada')
    .select('*')

  if (nome) query = query.ilike('nome', `%${nome}%`)
  if (cidade) query = query.ilike('cidade', `%${cidade}%`)

  const { data, error } = await query.limit(DEFAULT_LIMIT)

  if (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Erro ao buscar reputação' },
      { status: 500 }
    )
  }

  // 7️⃣ Retorno
  return NextResponse.json({
    allowed: true,
    results: data ?? [],
  })
}
