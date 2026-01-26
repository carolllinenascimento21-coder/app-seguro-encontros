import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

const DEFAULT_LIMIT = 20
const FREE_LIMIT = 1

export async function GET(req: Request) {
  /* ────────────────────────────────────────────────
   * 1️⃣ Verificação de ambiente público
   * ──────────────────────────────────────────────── */
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

  /* ────────────────────────────────────────────────
   * 2️⃣ Supabase Admin
   * ──────────────────────────────────────────────── */
  const supabaseAdmin = getSupabaseAdminClient()
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase admin não configurado' },
      { status: 503 }
    )
  }

  /* ────────────────────────────────────────────────
   * 3️⃣ Autenticação
   * ──────────────────────────────────────────────── */
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Usuária não autenticada' },
      { status: 401 }
    )
  }

  /* ────────────────────────────────────────────────
   * 4️⃣ Parâmetros de busca
   * ──────────────────────────────────────────────── */
  const { searchParams } = new URL(req.url)
  const nome = searchParams.get('nome')?.trim() ?? ''
  const cidade = searchParams.get('cidade')?.trim() ?? ''

  if (!nome && !cidade) {
    return NextResponse.json(
      { error: 'Informe nome ou cidade' },
      { status: 400 }
    )
  }

  /* ────────────────────────────────────────────────
   * 5️⃣ Carregar perfil (CRÍTICO)
   * ──────────────────────────────────────────────── */
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('has_active_plan, current_plan_id, free_queries_used')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('Erro ao carregar perfil', profileError)
    return NextResponse.json(
      { error: 'Erro ao validar perfil' },
      { status: 500 }
    )
  }

  const isFree =
    !profile.has_active_plan ||
    profile.current_plan_id === 'free'

  /* ────────────────────────────────────────────────
   * 6️⃣ BLOQUEIO FREE (PAYWALL)
   * ──────────────────────────────────────────────── */
  if (isFree && (profile.free_queries_used ?? 0) >= FREE_LIMIT) {
    return NextResponse.json(
      {
        code: 'FREE_LIMIT_REACHED',
        message: 'Consulta gratuita já utilizada',
        allowed: false,
      },
      { status: 403 }
    )
  }

  /* ────────────────────────────────────────────────
   * 7️⃣ BUSCA NA VIEW AGREGADA
   * ──────────────────────────────────────────────── */
  let query = supabaseAdmin
    .from('reputacao_agregada')
    .select('*')

  if (nome) query = query.ilike('nome', `%${nome}%`)
  if (cidade) query = query.ilike('cidade', `%${cidade}%`)

  const { data, error } = await query.limit(DEFAULT_LIMIT)

  if (error) {
    console.error('Erro ao buscar reputação', error)
    return NextResponse.json(
      { error: 'Erro ao buscar reputação' },
      { status: 500 }
    )
  }

  /* ────────────────────────────────────────────────
   * 8️⃣ Incrementa uso FREE (APÓS sucesso)
   * ──────────────────────────────────────────────── */
  if (isFree) {
    const { error: incError } = await supabaseAdmin
      .from('profiles')
      .update({
        free_queries_used: (profile.free_queries_used ?? 0) + 1,
      })
      .eq('id', user.id)

    if (incError) {
      console.error('Erro ao incrementar free_queries_used', incError)
      // ⚠️ não bloqueia o retorno — evita fricção
    }
  }

  /* ────────────────────────────────────────────────
   * 9️⃣ Retorno OK
   * ──────────────────────────────────────────────── */
  return NextResponse.json({
    allowed: true,
    results: data ?? [],
  })
}
