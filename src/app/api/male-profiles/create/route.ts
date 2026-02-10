import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

function normalize(value: string) {
  return value.trim().toLowerCase()
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuária não autenticada' },
        { status: 401 }
      )
    }

    const supabaseAdmin = getSupabaseAdminClient()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Supabase admin não configurado' },
        { status: 503 }
      )
    }

    const body = await req.json()
    const nome = body?.nome?.trim()
    const cidade = body?.cidade?.trim()

    if (!nome || !cidade) {
      return NextResponse.json(
        { success: false, message: 'Nome e cidade são obrigatórios' },
        { status: 400 }
      )
    }

    const normalized_name = normalize(nome)
    const normalized_city = normalize(cidade)

    // 🔍 evita duplicado
    const { data: existing } = await supabaseAdmin
      .from('male_profiles')
      .select('id')
      .eq('normalized_name', normalized_name)
      .eq('normalized_city', normalized_city)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: true,
        id: existing[0].id,
        reused: true,
      })
    }

    // ➕ cria novo perfil
    const { data: created, error } = await supabaseAdmin
      .from('male_profiles')
      .insert({
        display_name: nome,
        city: cidade,
        normalized_name,
        normalized_city,
        is_active: true,
      })
      .select('id')
      .single()

    if (error || !created) {
      console.error('Erro ao criar male_profile', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar perfil' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, id: created.id, reused: false },
      { status: 201 }
    )
  } catch (err) {
    console.error('Erro inesperado male-profiles/create', err)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}
