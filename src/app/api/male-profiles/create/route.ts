import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

function normalize(value: string) {
  return value.trim().toLowerCase()
}

export async function POST(req: Request) {
  const logPrefix = '[api/male-profiles/create]'

  try {
    /**
     * 1) Autenticação da usuária
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
    const supabaseAdmin = getSupabaseAdminClient()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Supabase admin não configurado' },
        { status: 503 }
      )
    }

    /**
     * 4) Verifica se já existe perfil (usando colunas GENERATED no WHERE)
     */
    const { data: existing, error: selectError } = await supabaseAdmin
      .from('male_profiles')
      .select('id')
      .eq('normalized_name', normalized_name)
      .eq('normalized_city', normalized_city)
      .limit(1)
      .maybeSingle()

    if (selectError) {
      console.error(logPrefix, 'erro ao verificar duplicidade', selectError)
      return NextResponse.json(
        { success: false, message: 'Erro ao verificar perfil existente' },
        { status: 500 }
      )
    }

    if (existing) {
      return NextResponse.json(
        { success: true, id: existing.id, reused: true },
        { status: 200 }
      )
    }

    /**
     * 5) Cria novo perfil
     * ⚠️ NÃO inserir normalized_* (são GENERATED ALWAYS)
     */
    const { data: created, error: insertError } = await supabaseAdmin
      .from('male_profiles')
      .insert({
        display_name: nome,
        city: cidade,
        is_active: true,
      })
      .select('id')
      .single()

    if (insertError || !created) {
      console.error(logPrefix, 'erro ao criar male_profile', insertError)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar perfil' },
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
    console.error(logPrefix, 'erro inesperado', err)
    const message = err instanceof Error ? err.message : 'Erro inesperado'
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
}
