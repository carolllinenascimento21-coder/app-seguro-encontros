import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const nome = searchParams.get('nome')?.trim().toLowerCase() || null
    const cidade = searchParams.get('cidade')?.trim().toLowerCase() || null

    if (!nome && !cidade) {
      return NextResponse.json(
        { error: 'Nome ou cidade obrigatórios' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('male_profiles')
      .select(`
        id,
        display_name,
        city,
        reputacao_agregada (
          total_avaliacoes,
          media_geral,
          confiabilidade_percentual,
          flags_positive,
          flags_negative
        )
      `)
      .eq('is_active', true)

    // 🔎 Filtro inteligente
    if (nome && cidade) {
      query = query
        .ilike('normalized_name', `%${nome}%`)
        .ilike('normalized_city', `%${cidade}%`)
    } else if (nome) {
      query = query.ilike('normalized_name', `%${nome}%`)
    } else if (cidade) {
      query = query.ilike('normalized_city', `%${cidade}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro Supabase:', error)
      return NextResponse.json(
        { error: 'Erro interno na busca' },
        { status: 500 }
      )
    }

    const results = (data || []).map((p: any) => ({
      id: p.id,
      display_name: p.display_name,
      city: p.city,
      total_avaliacoes: p.reputacao_agregada?.total_avaliacoes ?? 0,
      media_geral: p.reputacao_agregada?.media_geral ?? 0,
      confiabilidade_percentual:
        p.reputacao_agregada?.confiabilidade_percentual ?? 0,
      flags_positive: p.reputacao_agregada?.flags_positive ?? [],
      flags_negative: p.reputacao_agregada?.flags_negative ?? [],
    }))

    return NextResponse.json({ results })

  } catch (err) {
    console.error('Erro inesperado:', err)
    return NextResponse.json(
      { error: 'Erro interno na busca' },
      { status: 500 }
    )
  }
}
