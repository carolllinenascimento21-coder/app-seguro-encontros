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
        { error: 'Informe nome ou cidade' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('male_profiles')
      .select(`
        id,
        display_name,
        city,
        total_avaliacoes,
        media_geral,
        confiabilidade_percentual,
        flags_positive,
        flags_negative
      `)

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
        { error: 'Erro interno na busca' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      results: data ?? [],
    })
  } catch (err) {
    console.error('Erro inesperado:', err)
    return NextResponse.json(
      { error: 'Erro inesperado' },
      { status: 500 }
    )
  }
}
