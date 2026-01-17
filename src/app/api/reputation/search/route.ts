import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails } from '@/lib/env'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const nome = searchParams.get('q')?.trim()
    const cidade = searchParams.get('cidade')?.trim()

    if (!nome && !cidade) {
      return NextResponse.json(
        { error: 'Informe nome ou cidade para buscar' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase admin não configurado' },
        { status: 503 }
      )
    }

    let query = supabase
      .from('avaliacoes')
      .select(`
        id,
        nome,
        cidade,
        comportamento,
        seguranca_emocional,
        respeito,
        carater,
        confianca,
        flags_positive,
        flags_negative
      `)
      .eq('publica', true)

    if (nome) {
      query = query.ilike('nome', `%${nome}%`)
    }

    if (cidade) {
      query = query.ilike('cidade', `%${cidade}%`)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Erro ao buscar reputação:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar reputação' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      results: data ?? [],
    })
  } catch (err) {
    console.error('Erro inesperado em /api/reputation/search', err)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
