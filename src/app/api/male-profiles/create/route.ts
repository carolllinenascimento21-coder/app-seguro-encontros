import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

function normalize(value: string) {
  return value.trim().toLowerCase()
}

// Supabase Admin (service role) – criado de forma explícita e segura
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Supabase service role não configurado')
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
    },
  })
}

export async function POST(req: Request) {
  try {
    /**
     * 1) Autenticação da usuária (cookie/session)
     */
    const supabaseAuth = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuária não autenticada' },
        { status: 401 }
      )
    }

    /**
     * 2) Validação do body
     */
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

    /**
     * 3) Supabase Admin (service_role)
     */
    const supabaseAdmin = getSupabaseAdmin()

    /**
     * 4) Verifica duplicidade (nome + cidade normalizados)
     */
    const { data: existing, error: selectError } = await supabaseAdmin
      .from('male_profiles')
      .select('id')
      .eq('normalized_name', normalized_name)
      .eq('normalized_city', normalized_city)
      .limit(1)

    if (selectError) {
      console.error('Erro ao verificar duplicidade male_profiles', selectError)
      return NextResponse.json(
        { success: false, message: 'Erro interno' },
        { status: 500 }
      )
    }

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: true, id: existing[0].id, reused: true },
        { status: 200 }
      )
    }

    /**
     * 5) Criação do perfil masculino
     */
    const { data: created, error: insertError } = await supabaseAdmin
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

    if (insertError || !created) {
      console.error('Erro ao criar male_profile', insertError)
      return NextResponse.json(
        { success: false, message: 'Erro interno' },
        { status: 500 }
      )
    }

    /**
     * 6) Sucesso
     */
    return NextResponse.json(
      { success: true, id: created.id, reused: false },
      { status: 201 }
    )
  } catch (err) {
    console.error('Erro inesperado em male-profiles/create', err)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}
