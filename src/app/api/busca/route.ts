import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

function sanitize(input: string) {
  return input
    .trim()
    .replace(/\s+/g, ' ')
}

export async function GET(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { searchParams } = new URL(req.url)

    const nome = sanitize(searchParams.get('nome') || '')
    const cidade = sanitize(searchParams.get('cidade') || '')

    if (!nome && !cidade) {
      return NextResponse.json(
        { success: false, message: 'Informe nome ou cidade' },
        { status: 400 }
      )
    }

    // 🔎 Construção dinâmica do filtro
    let query = supabase
      .from('male_profiles')
      .select(`
        id,
        display_name,
        city,
        reputation:reputation_view(*)
      `)
      .eq('is_active', true)

    /*
      Enterprise Search:
      - unaccent
      - ilike
      - busca parcial
      - combina nome e cidade
    */

    if (nome && cidade) {
      query = query.or(
        `
        and(
          unaccent(display_name).ilike.unaccent.%${nome}%,
          unaccent(city).ilike.unaccent.%${cidade}%
        )
        `
      )
    } else if (nome) {
      query = query.or(
        `
        unaccent(display_name).ilike.unaccent.%${nome}%,
        unaccent(city).ilike.unaccent.%${nome}%
        `
      )
    } else if (cidade) {
      query = query.or(
        `
        unaccent(city).ilike.unaccent.%${cidade}%,
        unaccent(display_name).ilike.unaccent.%${cidade}%
        `
      )
    }

    const { data, error } = await query.limit(30)

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      data,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro inesperado'
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
}
