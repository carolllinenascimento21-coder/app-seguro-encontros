import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

const DEFAULT_LIMIT = 20
const FREE_LIMIT = 1

export async function GET(req: Request) {
  /* ────────────────────────────────────────────────
   * 1️⃣ Ambiente público
   * ──────────────────────────────────────────────────── */
  tentar {
    getSupabasePublicEnv('api/busca')
  } catch (erro) {
    const envError = getMissingSupabaseEnvDetails(error)
    se (envError) {
      retornar NextResponse.json(
        { erro: envError.message },
        { status: envError.status }
      )
    }
    lançar erro
  }

  /* ────────────────────────────────────────────────
   * 2️⃣ Supabase
   * ──────────────────────────────────────────────────── */
  const supabaseAdmin = getSupabaseAdminClient()
  se (!supabaseAdmin) {
    retornar NextResponse.json(
      { erro: 'Supabase admin não configurado' },
      { status: 503 }
    )
  }

  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  se (!usuário) {
    retornar NextResponse.json(
      { erro: 'Usuário não autenticado' },
      { status: 401 }
    )
  }

  /* ────────────────────────────────────────────────
   * 3️⃣ Parâmetros
   * ──────────────────────────────────────────────────── */
  const { searchParams } = new URL(req.url)
  const nome = searchParams.get('nome')?.trim() ?? ''
  const cidade = searchParams.get('cidade')?.trim() ?? ''

  se (!nome && !cidade) {
    retornar NextResponse.json(
      { erro: 'Informe nome ou cidade' },
      { status: 400 }
    )
  }

  /* ────────────────────────────────────────────────
   * 4️⃣ Carregar perfil
   * ──────────────────────────────────────────────────── */
  const { data: profile, error: profileError } = await supabaseAdmin
    .de('perfis')
    .select('has_active_plan, current_plan_id, free_queries_used')
    .eq('id', user.id)
    .solteiro()

  se (profileError || !profile) {
    console.error('Erro ao carregar perfil', profileError)
    retornar NextResponse.json(
      { error: 'Erro ao validar perfil' },
      { status: 500 }
    )
  }

  const isFree =
    !profile.has_active_plan ||
    profile.current_plan_id === 'free'

  /* ────────────────────────────────────────────────
   * 5️⃣ Rastreamento: tentativa de busca
   * ──────────────────────────────────────────────────── */
  aguarde supabaseAdmin
    .from('analytics_events')
    .inserir({
      user_id: user.id,
      nome_do_evento: 'consulta_básica',
      metadados: {
        nome: !!nome,
        cidade: !!cidade,
        plano: profile.current_plan_id ?? 'gratuito',
      },
    })

  /* ────────────────────────────────────────────────
   * 6️⃣ GRÁTIS
   * ──────────────────────────────────────────────────── */
  se (isFree && (profile.free_queries_used ?? 0) >= FREE_LIMIT) {
    aguarde supabaseAdmin
      .from('analytics_events')
      .inserir({
        user_id: user.id,
        nome_do_evento: 'limite_livre_atingido',
        metadados: {
          localização: 'api/busca',
        },
      })

    retornar NextResponse.json(
      {
        permitido: falso,
        código: 'FREE_LIMIT_REACHED',
        mensagem: 'Consulta gratuita já utilizada',
      },
      { status: 403 }
    )
  }

  /* ────────────────────────────────────────────────
   * 7️⃣ Busca
   * ──────────────────────────────────────────────────── */
  let query = supabaseAdmin
    .from('reputação_agregada')
    .selecione('*')

  if (nome) consulta = query.ilike('nome', `%${nome}%`)
  if (cidade) query = query.ilike('cidade', `%${cidade}%`)

  const { data, error } = await query.limit(DEFAULT_LIMIT)

  se (erro) {
    console.error('Erro ao buscar comissão', erro)
    retornar NextResponse.json(
      { error: 'Erro ao buscar confiança' },
      { status: 500 }
    )
  }

  /* ────────────────────────────────────────────────
   * 8️⃣ Incremento de uso GRÁTIS
   * ──────────────────────────────────────────────────── */
  se (éLivre) {
    aguarde supabaseAdmin
      .de('perfis')
      .atualizar({
        free_queries_used: (profile.free_queries_used ?? 0) + 1,
      })
      .eq('id', user.id)
  }

  /* ────────────────────────────────────────────────
   * 9️⃣ Rastreamento: resultado sorteado
   * ──────────────────────────────────────────────────── */
  aguarde supabaseAdmin
    .from('analytics_events')
    .inserir({
      user_id: user.id,
      nome_do_evento: 'view_result_summary',
      metadados: {
        results_count: data?.length ?? 0,
      },
    })

  /* ────────────────────────────────────────────────
   * 10️⃣ Retorno
   * ──────────────────────────────────────────────────── */
  retornar NextResponse.json({
    permitido: verdadeiro,
    resultados: dados ?? [],
  })
}
