import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdminClient()
    const supabase = createRouteHandlerClient({ cookies })

    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuária não autenticada' },
        { status: 401 }
      )
    }

    const body = await req.json()

    const {
      nome,
      cidade,
      ratings,
      flags_positive,
      flags_negative,
      relato,
      anonimo
    } = body

    if (!nome || !cidade || !ratings) {
      return NextResponse.json(
        { success: false, message: 'Dados incompletos' },
        { status: 400 }
      )
    }

    // 🔎 Buscar ou criar perfil masculino
    let { data: maleProfile } = await supabaseAdmin
      .from('male_profiles')
      .select('id')
      .eq('display_name', nome)
      .eq('city', cidade)
      .maybeSingle()

    if (!maleProfile) {
      const { data: createdProfile, error } = await supabaseAdmin
        .from('male_profiles')
        .insert({
          display_name: nome,
          city: cidade,
          is_active: true
        })
        .select('id')
        .single()

      if (error) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 500 }
        )
      }

      maleProfile = createdProfile
    }

    // 📝 Inserir avaliação
    const { error: avaliacaoError } = await supabaseAdmin
      .from('avaliacoes')
      .insert({
        male_profile_id: maleProfile.id,
        autora_id: user.id, // 🔥 AGORA EXISTE NO BANCO
        comportamento: ratings.comportamento,
        seguranca_emocional: ratings.seguranca_emocional,
        respeito: ratings.respeito,
        carater: ratings.carater,
        confianca: ratings.confianca,
        flags_positive: flags_positive ?? [],
        flags_negative: flags_negative ?? [],
        relato: relato ?? null,
        is_anonymous: anonimo ?? false
      })

    if (avaliacaoError) {
      return NextResponse.json(
        { success: false, message: avaliacaoError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Avaliação publicada com sucesso'
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}
