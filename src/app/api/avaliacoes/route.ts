import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

async function getSessionUser() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw new Error('Falha ao validar sessão')
  }

  const user = data.session?.user
  if (!user) {
    return null
  }

  return user
}

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('avaliacoes')
      .select('*')
      .eq('autor_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    const {
      nome,
      telefone,
      cidade,
      comportamento,
      segurancaEmocional,
      respeito,
      carater,
      confianca,
      relato,
      redFlags,
      anonimo,
    } = body

    const notas = [comportamento, segurancaEmocional, respeito, carater, confianca]
    if (notas.some((n) => typeof n !== 'number' || n <= 0)) {
      return NextResponse.json({ error: 'Todas as notas devem ser informadas' }, { status: 400 })
    }

    if (!nome || typeof nome !== 'string') {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const notaGeral = notas.reduce((acc, n) => acc + n, 0) / notas.length

    const { error } = await supabaseAdmin.from('avaliacoes').insert({
      autor_id: user.id,
      nome_homem: nome,
      telefone: telefone || null,
      cidade: cidade || null,
      nota_comportamento: comportamento,
      nota_seguranca_emocional: segurancaEmocional,
      nota_respeito: respeito,
      nota_carater: carater,
      nota_confianca: confianca,
      nota_geral: notaGeral,
      comentario: relato || null,
      red_flags: Array.isArray(redFlags) ? redFlags : [],
      anonimo: Boolean(anonimo),
    })

    if (error) {
      throw error
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
