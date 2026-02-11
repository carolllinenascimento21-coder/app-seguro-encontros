import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const nome = searchParams.get('nome')?.toLowerCase() || ''
    const cidade = searchParams.get('cidade')?.toLowerCase() || ''

    if (!nome && !cidade) {
      return NextResponse.json(
        { error: 'Nome ou cidade obrigatório' },
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
          confiabilidade_percentual
        )
      `)
      .eq('is_active', true)

    if (nome) {
      query = query.ilike('normalized_name', `%${nome}%`)
    }

    if (cidade) {
      query = query.ilike('normalized_city', `%${cidade}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro Supabase:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar dados' },
        { status: 500 }
      )
    }

    const formatted = (data || []).map((p: any) => ({
      id: p.id,
      display_name: p.display_name,
      city: p.city,
      total_avaliacoes:
        p.reputacao_agregada?.[0]?.total_avaliacoes ?? 0,
      media_geral:
        p.reputacao_agregada?.[0]?.media_geral ?? 0,
      confiabilidade_percentual:
        p.reputacao_agregada?.[0]?.confiabilidade_percentual ?? 0,
      flags_positive: null,
      flags_negative: null,
    }))

    return NextResponse.json({ results: formatted })

  } catch (err) {
    console.error('Erro interno:', err)
    return NextResponse.json(
      { error: 'Erro interno na busca' },
      { status: 500 }
    )
  }
}
