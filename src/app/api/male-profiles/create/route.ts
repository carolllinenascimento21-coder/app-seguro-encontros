import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  const logPrefix = '[api/male-profiles/create]'

  try {
    /**
     * 1) Autenticação
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
     * 2) Body
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

    /**
     * 3) Supabase Admin
     */
    const supabaseAdmin = getSupabaseAdminClient()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Supabase admin não configurado' },
        { status: 503 }
      )
    }

    /**
     * 4) Verificar duplicidade
     * ⚠️ Usa as colunas GERADAS apenas para consulta
     */
    const { data: existing, error: selectError } = await supabaseAdmin
      .from('male_profiles')
      .select('id')
      .ilike('normalized_name', nome.trim().toLowerCase())
      .ilike('normalized_city', cidade.trim().toLowerCase())
      .limit(1)
      .maybeSingle()

    if (selectError) {
      console.error(logPrefix, selectError)
      return NextResponse.json(
        { success: false, message: selectError.message },
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
     * 5) Inserção
     * ❌ NÃO envia normalized_name / normalized_city
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
      console.error(logPrefix, insertError)
      return NextResponse.json(
        { success: false, message: insertError?.message ?? 'Erro ao criar perfil' },
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
    console.error(logPrefix, err)
    return NextResponse.json(
      { success: false, message: 'Erro inesperado' },
      { status: 500 }
    )
  }
}
