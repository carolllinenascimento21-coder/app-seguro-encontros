import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { searchParams } = new URL(req.url)

    const nome = searchParams.get('nome')?.trim() || ''
    const cidade = searchParams.get('cidade')?.trim() || ''

    if (!nome && !cidade) {
      return NextResponse.json({ success: false, message: 'Informe nome ou cidade' }, { status: 400 })
    }

    let query = supabase
      .from('male_profiles')
      .select(`
        id,
        display_name,
        city,
        reputacao:reputation_view(*)
      `)
      .eq('is_active', true)

    // 🔎 Busca por nome (ignora acento e caixa)
    if (nome) {
      query = query.ilike('display_name', `%${nome}%`)
    }

    // 🔎 Busca por cidade
    if (cidade) {
      query = query.ilike('city', `%${cidade}%`)
    }

    const { data, error } = await query.limit(20)

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro inesperado'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
