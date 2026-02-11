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
     * 4) Upsert idempotente
     * ❌ NÃO envia normalized_name / normalized_city (colunas GENERATED)
     */
    const { data: upsertedProfile, error: upsertError } = await supabaseAdmin
      .from('male_profiles')
      .upsert({
        display_name: nome,
        city: cidade,
        is_active: true,
      }, {
        onConflict: 'normalized_name,normalized_city',
        ignoreDuplicates: false,
      })
      .select('id')
      .single()

    if (upsertError || !upsertedProfile) {
      console.error(`${logPrefix} upsert_error`, upsertError)
      return NextResponse.json(
        {
          success: false,
          message: upsertError?.message ?? 'Erro ao criar/reutilizar perfil avaliado',
        },
        { status: 500 }
      )
    }

    /**
     * 6) Sucesso
     */
    return NextResponse.json(
      { success: true, id: upsertedProfile.id },
      { status: 200 }
    )
  } catch (err) {
    console.error(`${logPrefix} unexpected_error`, err)
    return NextResponse.json(
      { success: false, message: 'Erro inesperado' },
      { status: 500 }
    )
  }
}
