import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const nome = searchParams.get('nome')
    const cidade = searchParams.get('cidade')

    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    let query = supabase
      .from('profiles') // ⚠️ CONFIRME o nome da sua tabela
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

    /* 🔎 FILTROS DINÂMICOS SEGUROS */
    if (nome && cidade) {
      query = query.or(
        `display_name.ilike.%${nome}%,city.ilike.%${cidade}%`
      )
    } else if (nome) {
      query = query.ilike('display_name', `%${nome}%`)
    } else if (cidade) {
      query = query.ilike('city', `%${cidade}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Erro na busca' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      results: data ?? [],
    })
  } catch (err) {
    console.error('Internal error:', err)
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    )
  }
}
